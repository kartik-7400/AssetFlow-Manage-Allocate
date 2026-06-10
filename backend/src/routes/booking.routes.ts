import { Router } from 'express';
import {
  createBooking,
  getBookings,
  updateBookingStatus,
  issueAssetBooking,
  returnAssetBooking,
  sendOverdueAlert,
} from '../controllers/booking.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = Router();

// Submit a booking request (Authenticated users)
router.post('/', requireAuth, createBooking);

// Get bookings list (Consumers see their own, Administrators see all)
router.get('/', requireAuth, getBookings);

// Approve or reject booking request (Admin only)
router.patch('/:id/status', requireAuth, requireRole(['ADMINISTRATOR']), updateBookingStatus);

// Issue checked-out asset (Admin only, QR scanner endpoint)
router.post('/:id/issue', requireAuth, requireRole(['ADMINISTRATOR']), issueAssetBooking);

// Return checked-out asset (Admin only, QR scanner endpoint)
router.post('/:id/return', requireAuth, requireRole(['ADMINISTRATOR']), returnAssetBooking);

// Manually trigger warning reminder notification for late item (Admin only)
router.post('/:id/overdue-alert', requireAuth, requireRole(['ADMINISTRATOR']), sendOverdueAlert);

export default router;
