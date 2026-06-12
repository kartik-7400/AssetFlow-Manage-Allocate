import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// Schema imports using standard TS/JS import structure
import { User } from './models/User.js';
import { Asset } from './models/Asset.js';
import { Booking } from './models/Booking.js';
import { Maintenance } from './models/Maintenance.js';
import { Notification } from './models/Notification.js';
import { AuditLog } from './models/AuditLog.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/assetflow';

async function seed() {
  const isMockMode = !process.env.CLERK_PUBLISHABLE_KEY;
  const dbName = isMockMode 
    ? (process.env.DB_TEST_NAME || 'test') 
    : (process.env.DB_NAME || 'AssetFlow');

  console.log(`[Seed] Connecting to database (${isMockMode ? 'Mock/Sandbox' : 'Actual'} mode, DB: ${dbName})...`);
  await mongoose.connect(MONGO_URI, { dbName });
  console.log(`[Seed] Connected successfully to database: ${dbName}!`);

  // Clear existing collections
  console.log('[Seed] Cleaning existing data...');
  await User.deleteMany({});
  await Asset.deleteMany({});
  await Booking.deleteMany({});
  await Maintenance.deleteMany({});
  await Notification.deleteMany({});
  await AuditLog.deleteMany({});
  console.log('[Seed] Collections cleared.');

  // 1. Seed Users
  console.log('[Seed] Seeding Users...');
  const adminUser = await User.create({
    clerkId: 'mock_admin',
    email: 'admin@assetflow.com',
    firstName: 'Sarah',
    lastName: 'Connor',
    imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    role: 'ADMINISTRATOR',
  });

  const crewUser1 = await User.create({
    clerkId: 'mock_crew_1',
    email: 'john@assetflow.com',
    firstName: 'John',
    lastName: 'Doe',
    imageUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    role: 'CONSUMER',
  });

  const crewUser2 = await User.create({
    clerkId: 'mock_crew_2',
    email: 'jane@assetflow.com',
    firstName: 'Jane',
    lastName: 'Smith',
    imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    role: 'CONSUMER',
  });

  console.log('[Seed] Seeding Assets...');
  // 2. Seed Assets
  const asset1 = await Asset.create({
    name: 'Sony FX3 Cinema Camera',
    category: 'Camera',
    description: 'Full-frame cinema line camera with outstanding low-light sensitivity, dual base ISO, and S-Cinetone color science.',
    quantityTotal: 4,
    quantityAvailable: 3,
    quantityInMaintenance: 0,
    condition: 'EXCELLENT',
    qrCodeData: 'QR-SONY-FX3',
    imageUrl: 'https://images.unsplash.com/photo-1619597455322-4fbbd820250a?w=400&auto=format&fit=crop&q=80',
    status: 'AVAILABLE',
  });

  const asset2 = await Asset.create({
    name: 'RED Komodo 6K Cinema Rig',
    category: 'Camera',
    description: 'Super 35 6K compact cinema camera featuring a global shutter, RF lens mount, and REDCODE RAW video recording.',
    quantityTotal: 2,
    quantityAvailable: 1,
    quantityInMaintenance: 0,
    condition: 'EXCELLENT',
    qrCodeData: 'QR-RED-KOMODO',
    imageUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=400&auto=format&fit=crop&q=80',
    status: 'AVAILABLE',
  });

  const asset3 = await Asset.create({
    name: 'Aputure LS 600d Pro',
    category: 'Lighting',
    description: 'High-power COB LED light storm fixture with weatherproofing, Sidus Link control, and dual Bowens Mount design.',
    quantityTotal: 5,
    quantityAvailable: 3,
    quantityInMaintenance: 0,
    condition: 'GOOD',
    qrCodeData: 'QR-APUTURE-600D',
    imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&auto=format&fit=crop&q=80',
    status: 'AVAILABLE',
  });

  const asset4 = await Asset.create({
    name: 'Sennheiser MKH416 Shotgun Mic',
    category: 'Audio',
    description: 'Industry-standard moisture-resistant RF condenser shotgun microphone, perfect for outdoor film shoots.',
    quantityTotal: 6,
    quantityAvailable: 6,
    quantityInMaintenance: 0,
    condition: 'EXCELLENT',
    qrCodeData: 'QR-SENN-MKH416',
    imageUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400&auto=format&fit=crop&q=80',
    status: 'AVAILABLE',
  });

  const asset5 = await Asset.create({
    name: 'Sigma 24-70mm f/2.8 DG DN Art',
    category: 'Lenses',
    description: 'Premium performance Art Series standard zoom lens optimized for mirrorless cameras, offering superb resolution.',
    quantityTotal: 6,
    quantityAvailable: 6,
    quantityInMaintenance: 0,
    condition: 'GOOD',
    qrCodeData: 'QR-SIGMA-24-70',
    imageUrl: 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=400&auto=format&fit=crop&q=80',
    status: 'AVAILABLE',
  });

  const asset6 = await Asset.create({
    name: 'Vintage Renaissance Doublet',
    category: 'Costumes',
    description: 'Finely embroidered red velvet vest for period drama productions and costume designs.',
    quantityTotal: 3,
    quantityAvailable: 2,
    quantityInMaintenance: 1,
    condition: 'DAMAGED',
    qrCodeData: 'QR-COST-VINTAGE-DBL',
    imageUrl: 'https://images.unsplash.com/photo-1537884944318-390069bb8665?w=400&auto=format&fit=crop&q=80',
    status: 'MAINTENANCE',
  });

  console.log('[Seed] Seeding Bookings...');
  // 3. Seed Bookings
  const today = new Date();

  // Booking 1: Overdue checkout (John Doe has a RED Komodo 6K that was due back 2 days ago)
  const startDate1 = new Date();
  startDate1.setDate(today.getDate() - 5);
  const endDate1 = new Date();
  endDate1.setDate(today.getDate() - 2);

  const booking1 = await Booking.create({
    user: crewUser1._id,
    asset: asset2._id,
    quantity: 1,
    startDate: startDate1,
    endDate: endDate1,
    status: 'ISSUED',
    notes: 'Short indie film shoot over the weekend.',
    issuedAt: startDate1,
    issueNotes: 'Asset issued in excellent condition with 2 extra V-mount batteries.',
  });

  // Booking 2: Active Checkout (Jane Smith checked out 2x Aputure LS 600d lights)
  const startDate2 = new Date();
  startDate2.setDate(today.getDate() - 2);
  const endDate2 = new Date();
  endDate2.setDate(today.getDate() + 3);

  const booking2 = await Booking.create({
    user: crewUser2._id,
    asset: asset3._id,
    quantity: 2,
    startDate: startDate2,
    endDate: endDate2,
    status: 'ISSUED',
    notes: 'Studio lighting setup for commercial shoot.',
    issuedAt: startDate2,
    issueNotes: 'Both units issued inside heavy-duty roller cases.',
  });

  // Booking 3: Approved request (John Doe has an approved request for 1x Sony FX3, starting tomorrow)
  const startDate3 = new Date();
  startDate3.setDate(today.getDate() + 1);
  const endDate3 = new Date();
  endDate3.setDate(today.getDate() + 4);

  const booking3 = await Booking.create({
    user: crewUser1._id,
    asset: asset1._id,
    quantity: 1,
    startDate: startDate3,
    endDate: endDate3,
    status: 'APPROVED',
    notes: 'Music video production checkout request.',
  });

  // Booking 4: Pending request (Jane Smith requested 1x Sennheiser Shotgun Microphone, starting tomorrow)
  const startDate4 = new Date();
  startDate4.setDate(today.getDate() + 1);
  const endDate4 = new Date();
  endDate4.setDate(today.getDate() + 6);

  const booking4 = await Booking.create({
    user: crewUser2._id,
    asset: asset4._id,
    quantity: 1,
    startDate: startDate4,
    endDate: endDate4,
    status: 'PENDING',
    notes: 'Need this mic for capturing direct dialogue on-set next week.',
  });

  // Booking 5: Completed Return (John Doe returned 1x Sigma standard zoom lens)
  const startDate5 = new Date();
  startDate5.setDate(today.getDate() - 10);
  const endDate5 = new Date();
  endDate5.setDate(today.getDate() - 7);

  const booking5 = await Booking.create({
    user: crewUser1._id,
    asset: asset5._id,
    quantity: 1,
    startDate: startDate5,
    endDate: endDate5,
    status: 'RETURNED',
    notes: 'Landscape shoot in the forest.',
    issuedAt: startDate5,
    returnedAt: endDate5,
    issueNotes: 'Clean lens, front/rear caps attached.',
    returnNotes: 'Returned on time, clean and functional.',
  });

  // Booking 6: Rejected Request (Jane Smith request for RED Komodo rejected due to maintenance overlap)
  const startDate6 = new Date();
  startDate6.setDate(today.getDate() - 15);
  const endDate6 = new Date();
  endDate6.setDate(today.getDate() - 12);

  const booking6 = await Booking.create({
    user: crewUser2._id,
    asset: asset2._id,
    quantity: 1,
    startDate: startDate6,
    endDate: endDate6,
    status: 'REJECTED',
    notes: 'Need RED Komodo for dynamic crane shots.',
    notesRejected: 'Asset was flagged for sensor calibration check-up during this block.',
  });

  console.log('[Seed] Seeding Maintenance logs...');
  // 4. Seed Maintenance Log for Asset 6 (Vintage Renaissance Doublet)
  const maintenanceTicket = await Maintenance.create({
    asset: asset6._id,
    reportedBy: adminUser._id,
    quantity: 1,
    condition: 'DAMAGED',
    damageReport: 'Tear along the left shoulder seam during outdoor battle scene rehearsal.',
    status: 'OPEN',
  });

  console.log('[Seed] Seeding Notifications...');
  // 5. Seed Notifications
  await Notification.create({
    recipient: crewUser1._id,
    title: 'Booking Approved',
    message: `Your reservation request for 1x Sony FX3 Cinema Camera has been approved. You can pick it up tomorrow.`,
    type: 'BOOKING_APPROVED',
    relatedBooking: booking3._id,
  });

  await Notification.create({
    recipient: crewUser2._id,
    title: 'Booking Rejected',
    message: `Your reservation request for RED Komodo 6K Cinema Rig was rejected. Reason: Sensor calibration scheduled.`,
    type: 'BOOKING_REJECTED',
    relatedBooking: booking6._id,
  });

  await Notification.create({
    recipient: crewUser1._id,
    title: 'Return Overdue Warning',
    message: `Your check-out for 1x RED Komodo 6K Cinema Rig is past its return deadline of ${endDate1.toLocaleDateString()}. Please return it immediately.`,
    type: 'OVERDUE',
    relatedBooking: booking1._id,
  });

  console.log('[Seed] Seeding Audit Logs...');
  // 6. Seed Audit Logs
  const auditLogs = [
    { actor: 'SYSTEM', action: 'ASSET_CREATE', targetType: 'Asset', targetId: asset1._id, details: { name: asset1.name } },
    { actor: 'SYSTEM', action: 'ASSET_CREATE', targetType: 'Asset', targetId: asset2._id, details: { name: asset2.name } },
    { actor: 'SYSTEM', action: 'ASSET_CREATE', targetType: 'Asset', targetId: asset3._id, details: { name: asset3.name } },
    { actor: 'SYSTEM', action: 'ASSET_CREATE', targetType: 'Asset', targetId: asset4._id, details: { name: asset4.name } },
    { actor: 'SYSTEM', action: 'ASSET_CREATE', targetType: 'Asset', targetId: asset5._id, details: { name: asset5.name } },
    { actor: 'SYSTEM', action: 'ASSET_CREATE', targetType: 'Asset', targetId: asset6._id, details: { name: asset6.name } },
    { actor: adminUser._id, action: 'BOOKING_APPROVE', targetType: 'Booking', targetId: booking3._id, details: { assetId: asset1._id } },
    { actor: adminUser._id, action: 'BOOKING_REJECT', targetType: 'Booking', targetId: booking6._id, details: { assetId: asset2._id, reason: 'Sensor calibration' } },
    { actor: adminUser._id, action: 'ASSET_ISSUE', targetType: 'Booking', targetId: booking1._id, details: { assetId: asset2._id } },
    { actor: adminUser._id, action: 'ASSET_ISSUE', targetType: 'Booking', targetId: booking2._id, details: { assetId: asset3._id } },
    { actor: adminUser._id, action: 'MAINTENANCE_LOG', targetType: 'Maintenance', targetId: maintenanceTicket._id, details: { assetId: asset6._id, reason: 'Tear in doublet' } },
  ];

  for (const log of auditLogs) {
    await AuditLog.create(log);
  }

  console.log('[Seed] Seeding complete! Database is successfully initialized.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[Seed] Error seeding database:', err);
  process.exit(1);
});
