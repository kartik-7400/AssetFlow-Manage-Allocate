import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = Router();

// Route middleware rules: Administrator role required for all audit paths
router.use(requireAuth, requireRole(['ADMINISTRATOR']));

// List audit log entries
router.get('/', getAuditLogs);

export default router;
