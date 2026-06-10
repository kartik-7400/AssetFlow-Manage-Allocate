import { Router, json } from 'express';
import { handleClerkWebhook } from '../controllers/webhook.controller.js';

const router = Router();

// Clerk sends JSON payload. Using Express raw body parser config if needed,
// but default json body parser is fine.
router.post('/', json({ verify: (req: any, res, buf) => { req.rawBody = buf; } }), handleClerkWebhook);

export default router;
