import { Router } from 'express';
import { getAssets, createAsset, updateAsset, deleteAsset } from '../controllers/asset.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = Router();

// Get assets catalog (Authenticated consumers and administrators)
router.get('/', requireAuth, getAssets);

// Create new asset item (Admin only)
router.post('/', requireAuth, requireRole(['ADMINISTRATOR']), createAsset);

// Update asset item details (Admin only)
router.put('/:id', requireAuth, requireRole(['ADMINISTRATOR']), updateAsset);

// Retire/Delete asset item (Admin only)
router.delete('/:id', requireAuth, requireRole(['ADMINISTRATOR']), deleteAsset);

export default router;
