import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

// Retrieve currently authenticated user's DB profile
router.get('/me', requireAuth, (req, res) => {
  res.status(200).json(req.user);
});

export default router;
