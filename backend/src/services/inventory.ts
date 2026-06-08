import { Types } from 'mongoose';
import { Asset } from '../models/Asset.js';
import { Booking } from '../models/Booking.js';
import { Maintenance } from '../models/Maintenance.js';
import { AuditLog } from '../models/AuditLog.js';

// Helper to get start of a day
const startOf = (d: Date): Date => {
  const res = new Date(d);
  res.setHours(0, 0, 0, 0);
  return res;
};

// Helper to get start of next day (freeing time)
const nextDayOf = (d: Date): Date => {
  const res = new Date(d);
  res.setDate(res.getDate() + 1);
  res.setHours(0, 0, 0, 0);
  return res;
};

/**
 * Calculates the peak concurrent allocated quantity for a given asset during the range [startDate, endDate].
 * Considers bookings with status: 'APPROVED', 'ISSUED', 'OVERDUE'.
 * Can optionally exclude a specific booking (e.g. when updating/re-evaluating its own timeline).
 */
export async function calculatePeakOverlappingBookings(
  assetId: string | Types.ObjectId,
  startDate: Date,
  endDate: Date,
  excludeBookingId?: string | Types.ObjectId
): Promise<number> {
  const windowStart = startOf(startDate);
  const windowEnd = new Date(endDate);
  windowEnd.setHours(23, 59, 59, 999);

  // Overlapping bookings are those that start before or during the window, and end during or after the window
  const query: any = {
    asset: assetId,
    status: { $in: ['APPROVED', 'ISSUED', 'OVERDUE'] },
    startDate: { $lte: windowEnd },
    endDate: { $gte: windowStart },
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const bookings = await Booking.find(query);

  interface TimelineEvent {
    time: number;
    change: number;
  }

  const events: TimelineEvent[] = [];

  // Add a dummy event for the window start to evaluate the initial allocation level
  events.push({
    time: windowStart.getTime(),
    change: 0,
  });

  for (const b of bookings) {
    events.push({
      time: startOf(b.startDate).getTime(),
      change: b.quantity,
    });
    events.push({
      time: nextDayOf(b.endDate).getTime(),
      change: -b.quantity,
    });
  }

  // Sort events chronologically.
  // If timestamps are equal, process decreases (negative change) before increases (positive change)
  events.sort((a, b) => {
    if (a.time !== b.time) {
      return a.time - b.time;
    }
    return a.change - b.change;
  });

  let runningSum = 0;
  let peak = 0;

  for (const event of events) {
    runningSum += event.change;

    // We only evaluate peak values within the requested date range window
    if (event.time >= windowStart.getTime() && event.time <= windowEnd.getTime()) {
      if (runningSum > peak) {
        peak = runningSum;
      }
    }
  }

  return peak;
}

/**
 * Checks if a requested quantity of an asset is available for booking during a date range.
 */
export async function checkInventoryAvailability(
  assetId: string | Types.ObjectId,
  quantityRequested: number,
  startDate: Date,
  endDate: Date,
  excludeBookingId?: string | Types.ObjectId
): Promise<boolean> {
  const asset = await Asset.findById(assetId);
  if (!asset) {
    throw new Error('Asset not found');
  }

  if (asset.status === 'RETIRED') {
    return false;
  }

  const peakBooked = await calculatePeakOverlappingBookings(
    assetId,
    startDate,
    endDate,
    excludeBookingId
  );
  const totalBookable = asset.quantityTotal - asset.quantityInMaintenance;

  return peakBooked + quantityRequested <= totalBookable;
}

/**
 * Atomically checks available stock and issues an approved booking.
 * Returns the updated booking.
 */
export async function issueAsset(
  bookingId: string | Types.ObjectId,
  adminUserId: string | Types.ObjectId,
  notes?: string
): Promise<any> {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  if (booking.status !== 'APPROVED') {
    throw new Error(`Cannot issue booking. Current status is ${booking.status} (expected APPROVED).`);
  }

  // Atomically check that there is enough physical stock in the store and decrease it.
  // This prevents race conditions where admins issue more items than are physically present.
  const asset = await Asset.findOneAndUpdate(
    {
      _id: booking.asset,
      quantityAvailable: { $gte: booking.quantity },
    },
    {
      $inc: { quantityAvailable: -booking.quantity },
    },
    { new: true }
  );

  if (!asset) {
    throw new Error('Insufficient physical asset inventory currently in storehouse.');
  }

  // Update booking status
  booking.status = 'ISSUED';
  booking.issuedAt = new Date();
  if (notes) {
    booking.issueNotes = notes;
  }
  await booking.save();

  // Create immutable AuditLog entry
  await AuditLog.create({
    actor: adminUserId,
    action: 'ASSET_ISSUE',
    targetType: 'Booking',
    targetId: booking._id,
    details: {
      assetId: booking.asset,
      quantity: booking.quantity,
      notes,
    },
  });

  return booking;
}

/**
 * Processes return of an issued asset.
 * If returned condition is marked as 'DAMAGED', sends the items to maintenance.
 * Returns the updated booking.
 */
export async function returnAsset(
  bookingId: string | Types.ObjectId,
  adminUserId: string | Types.ObjectId,
  condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'DAMAGED',
  notes?: string
): Promise<any> {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  if (booking.status !== 'ISSUED' && booking.status !== 'OVERDUE') {
    throw new Error(`Cannot return booking. Current status is ${booking.status} (expected ISSUED or OVERDUE).`);
  }

  // Update booking status
  booking.status = 'RETURNED';
  booking.returnedAt = new Date();
  if (notes) {
    booking.returnNotes = notes;
  }
  await booking.save();

  if (condition === 'DAMAGED') {
    // Increment quantityInMaintenance, update status & condition
    await Asset.findByIdAndUpdate(booking.asset, {
      $inc: { quantityInMaintenance: booking.quantity },
      $set: { status: 'MAINTENANCE', condition: 'DAMAGED' },
    });

    // Create open Maintenance ticket
    await Maintenance.create({
      asset: booking.asset,
      reportedBy: adminUserId,
      booking: booking._id,
      quantity: booking.quantity,
      condition: 'DAMAGED',
      damageReport: notes || `Damaged upon return from booking ${booking._id}`,
      status: 'OPEN',
    });

    // Log the maintenance action
    await AuditLog.create({
      actor: adminUserId,
      action: 'MAINTENANCE_LOG',
      targetType: 'Booking',
      targetId: booking._id,
      details: {
        assetId: booking.asset,
        quantity: booking.quantity,
        condition,
        notes,
      },
    });
  } else {
    // Good/Excellent/Fair returns increment available count back
    await Asset.findByIdAndUpdate(booking.asset, {
      $inc: { quantityAvailable: booking.quantity },
      $set: { condition },
    });
  }

  // Create audit record
  await AuditLog.create({
    actor: adminUserId,
    action: 'ASSET_RETURN',
    targetType: 'Booking',
    targetId: booking._id,
    details: {
      assetId: booking.asset,
      quantity: booking.quantity,
      condition,
      notes,
    },
  });

  return booking;
}

/**
 * Resolves an open maintenance ticket, restoring inventory to available stock.
 */
export async function resolveMaintenance(
  maintenanceId: string | Types.ObjectId,
  adminUserId: string | Types.ObjectId,
  resolutionDetails: string,
  conditionAfterRepair: 'EXCELLENT' | 'GOOD' | 'FAIR' = 'GOOD'
): Promise<any> {
  const ticket = await Maintenance.findById(maintenanceId);
  if (!ticket) {
    throw new Error('Maintenance ticket not found');
  }

  if (ticket.status === 'RESOLVED') {
    throw new Error('Maintenance ticket is already resolved.');
  }

  ticket.status = 'RESOLVED';
  ticket.condition = 'RESOLVED';
  ticket.resolutionDetails = resolutionDetails;
  await ticket.save();

  // Deduct quantityInMaintenance and restore quantityAvailable
  const asset = await Asset.findById(ticket.asset);
  if (asset) {
    asset.quantityInMaintenance = Math.max(0, asset.quantityInMaintenance - ticket.quantity);
    asset.quantityAvailable = asset.quantityAvailable + ticket.quantity;
    
    // Set asset status to AVAILABLE if maintenance count drops to 0
    if (asset.quantityInMaintenance === 0) {
      asset.status = 'AVAILABLE';
    }
    asset.condition = conditionAfterRepair;
    await asset.save();
  }

  // Log audit trail
  await AuditLog.create({
    actor: adminUserId,
    action: 'MAINTENANCE_RESOLVE',
    targetType: 'Maintenance',
    targetId: ticket._id,
    details: {
      assetId: ticket.asset,
      quantity: ticket.quantity,
      resolutionDetails,
      conditionAfterRepair,
    },
  });

  return ticket;
}
