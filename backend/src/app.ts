import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';

// Import Route Files
import webhookRoutes from './routes/webhook.routes.js';
import assetRoutes from './routes/asset.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import maintenanceRoutes from './routes/maintenance.routes.js';
import auditRoutes from './routes/audit.routes.js';

const app = express();

// 1. Configure CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 2. Mount Clerk webhook route BEFORE global json parser to support custom raw body parsing verification
app.use('/api/webhooks/clerk', webhookRoutes);

// 3. Mount global JSON and URLencoded body parsers for general API routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// 4. Mount Clerk Session extraction middleware globally to populate req.auth
if (process.env.NODE_ENV !== 'production') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const mockClerkId = req.headers['x-mock-clerk-id'];
    if (mockClerkId) {
      req.auth = { userId: mockClerkId };
    }
    next();
  });
}

if (process.env.CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY) {
  app.use(clerkMiddleware());
} else if (process.env.NODE_ENV === 'test') {
  console.log('[Clerk] Test environment detected: Bypassing clerkMiddleware.');
} else if (process.env.NODE_ENV === 'production') {
  app.use(clerkMiddleware());
} else {
  console.warn('WARNING: CLERK_PUBLISHABLE_KEY or CLERK_SECRET_KEY is missing. Bypassing clerkMiddleware in development.');
}
// 5. Mount API Route controllers
app.use('/api/assets', assetRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/audit', auditRoutes);

// Base health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

// 6. Global Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Global Error Handler]:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'An unexpected internal server error occurred.';
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

export default app;
