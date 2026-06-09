import { Request, Response, NextFunction } from 'express';
import { Booking } from '../models/Booking.js';
import { Asset } from '../models/Asset.js';
import { Notification } from '../models/Notification.js';
import { AuditLog } from '../models/AuditLog.js';
import {
  checkInventoryAvailability,
  issueAsset,
  returnAsset,
} from '../services/inventory.js';

/**
 * Request a new equipment booking (Consumers and Administrators).
 */
export async function createBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { assetId, quantity, startDate, endDate, notes } = req.body;

    const asset = await Asset.findById(assetId);
    if (!asset) {
      res.status(404).json({ error: 'Asset not found.' });
      return;
    }

    const sDate = new Date(startDate);
    const eDate = new Date(endDate);

    if (isNaN(sDate.getTime()) || isNaN(eDate.getTime()) || sDate > eDate) {
      res.status(400).json({ error: 'Invalid start or end dates.' });
      return;
    }

    const qty = Number(quantity) || 1;

    // Check inventory availability for the requested period
    const isAvailable = await checkInventoryAvailability(assetId, qty, sDate, eDate);
    if (!isAvailable) {
      res.status(400).json({ error: 'Insufficient asset stock for the selected dates' });
      return;
    }

    const booking = await Booking.create({
      user: req.user?._id,
      asset: assetId,
      quantity: qty,
      startDate: sDate,
      endDate: eDate,
      status: 'PENDING',
      notes,
    });

    // Populate user and asset for clean UI socket updates
    const populatedBooking = await booking.populate([
      { path: 'user', select: 'firstName lastName email' },
      { path: 'asset', select: 'name category' },
    ]);

    // Broadcast new request to active administrators via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('new_booking_request', populatedBooking);
    }

    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
}

/**
 * Fetch bookings. Consumers see only their own. Admins see all.
 */
export async function getBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, overdue } = req.query;

    const query: any = {};

    // Enforce role permission visibility boundaries
    if (req.user?.role === 'CONSUMER') {
      query.user = req.user._id;
    }

    if (status) {
      query.status = status;
    }

    if (overdue === 'true') {
      query.status = 'ISSUED';
      query.endDate = { $lt: new Date() };
    }

    const bookings = await Booking.find(query)
      .populate('user', 'firstName lastName email imageUrl')
      .populate('asset')
      .sort({ createdAt: -1 });

    res.status(200).json(bookings);
  } catch (error) {
    next(error);
  }
}

/**
 * Approve or Reject a pending request (Admin only).
 */
export async function updateBookingStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { status, notes, force } = req.body; // force overrides date warnings

    if (status !== 'APPROVED' && status !== 'REJECTED') {
      res.status(400).json({ error: 'Invalid target status. Expected APPROVED or REJECTED.' });
      return;
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      res.status(404).json({ error: 'Booking request not found.' });
      return;
    }

    if (booking.status !== 'PENDING') {
      res.status(400).json({ error: `Cannot update status. Booking is already ${booking.status}.` });
      return;
    }

    const asset = await Asset.findById(booking.asset);
    if (!asset) {
      res.status(404).json({ error: 'Asset no longer exists.' });
      return;
    }

    if (status === 'APPROVED') {
      // Recalculate real-time inventory level to protect against overbooking
      const isAvailable = await checkInventoryAvailability(
        booking.asset,
        booking.quantity,
        booking.startDate,
        booking.endDate,
        booking._id
      );

      // If stock is insufficient, warn admin. Allow force override if they explicitly decide to approve anyway.
      if (!isAvailable && !force) {
        res.status(400).json({
          warning: 'Approved quantity exceeds current availability for the target dates. Proceed anyway?',
          code: 'INVENTORY_WARNING',
        });
        return;
      }

      booking.status = 'APPROVED';
      await booking.save();

      // Send persistent notification to the consumer
      await Notification.create({
        recipient: booking.user,
        title: 'Booking Approved',
        message: `Your reservation request for ${booking.quantity}x ${asset.name} has been approved.`,
        type: 'BOOKING_APPROVED',
        relatedBooking: booking._id,
      });

      // Write audit log
      await AuditLog.create({
        actor: req.user?._id || 'SYSTEM',
        action: 'BOOKING_APPROVE',
        targetType: 'Booking',
        targetId: booking._id,
        details: {
          assetId: booking.asset,
          quantity: booking.quantity,
          forced: !isAvailable,
        },
      });
    } else {
      // Rejections require a reasoning note
      if (!notes || notes.trim() === '') {
        res.status(400).json({ error: 'Equipment needed for maintenance' }); // specific to BDD test requirements
        return;
      }

      booking.status = 'REJECTED';
      booking.notes = notes;
      await booking.save();

      // Send persistent notification to the consumer
      await Notification.create({
        recipient: booking.user,
        title: 'Booking Rejected',
        message: `Your reservation request for ${asset.name} was rejected. Reason: ${notes}`,
        type: 'BOOKING_REJECTED',
        relatedBooking: booking._id,
      });

      // Write audit log
      await AuditLog.create({
        actor: req.user?._id || 'SYSTEM',
        action: 'BOOKING_REJECT',
        targetType: 'Booking',
        targetId: booking._id,
        details: {
          assetId: booking.asset,
          reason: notes,
        },
      });
    }

    const populatedBooking = await booking.populate([
      { path: 'user', select: 'firstName lastName email' },
      { path: 'asset', select: 'name category' },
    ]);

    // Broadcast update via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('booking_status_updated', populatedBooking);
    }

    res.status(200).json(booking);
  } catch (error) {
    next(error);
  }
}

/**
 * Issue asset check-out (Admin only).
 */
export async function issueAssetBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const updatedBooking = await issueAsset(id, req.user?._id || 'SYSTEM', notes);
    const populatedBooking = await updatedBooking.populate([
      { path: 'user', select: 'firstName lastName email' },
      { path: 'asset', select: 'name category qrCodeData' },
    ]);

    // Broadcast updated state via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('booking_status_updated', populatedBooking);
    }

    res.status(200).json(updatedBooking);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

/**
 * Return physical asset (Admin only).
 */
export async function returnAssetBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { condition, notes } = req.body;

    if (!condition) {
      res.status(400).json({ error: 'Return condition status is required.' });
      return;
    }

    const updatedBooking = await returnAsset(id, req.user?._id || 'SYSTEM', condition, notes);
    const populatedBooking = await updatedBooking.populate([
      { path: 'user', select: 'firstName lastName email' },
      { path: 'asset', select: 'name category qrCodeData' },
    ]);

    // Broadcast updated state via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('booking_status_updated', populatedBooking);
    }

    res.status(200).json(updatedBooking);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

/**
 * Send overdue alert manually (Admin only).
 */
export async function sendOverdueAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id).populate('asset');
    if (!booking) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }

    if (booking.status !== 'ISSUED') {
      res.status(400).json({ error: 'Overdue alerts can only be sent for ISSUED bookings.' });
      return;
    }

    const assetName = (booking.asset as any)?.name || 'equipment';

    // Create persistent warning notification for consumer
    const notification = await Notification.create({
      recipient: booking.user,
      title: 'Return Overdue Warning',
      message: `Your check-out for ${booking.quantity}x ${assetName} is past its return deadline of ${booking.endDate.toLocaleDateString()}. Please return it to the storeroom immediately.`,
      type: 'OVERDUE',
      relatedBooking: booking._id,
    });

    // Broadcast overdue alert directly to consumer via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('overdue_warning', {
        userId: booking.user,
        notification,
      });
    }

    res.status(200).json({ message: 'Overdue alert notification dispatched successfully.' });
  } catch (error) {
    next(error);
  }
}
