import { Router } from 'express';
import { getMaintenanceTickets, resolveMaintenanceTicket } from '../controllers/maintenance.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = Router();

// Route middleware rules: Administrator role required for all maintenance paths
router.use(requireAuth, requireRole(['ADMINISTRATOR']));

// List maintenance log tickets
router.get('/', getMaintenanceTickets);

// Resolve a ticket
router.post('/:id/resolve', resolveMaintenanceTicket);

export default router;
