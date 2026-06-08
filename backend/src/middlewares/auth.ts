import { Request, Response, NextFunction } from 'express';
import { User, IUser } from '../models/User.js';

// Extend Express Request type definitions to include user and clerk auth info
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      auth?: any;
    }
  }
}

/**
 * Middleware that verifies the Clerk session JWT, extracts the clerkId,
 * retrieves the corresponding User profile from our local MongoDB database,
 * and attaches it to req.user.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  // If req.auth is not populated by Clerk's global middleware, we check headers manually
  // or count on Clerk middleware having run.
  if (!req.auth || !req.auth.userId) {
    res.status(401).json({ error: 'Unauthorized. Missing authentication session.' });
    return;
  }

  try {
    const clerkId = req.auth.userId;
    const user = await User.findOne({ clerkId });

    if (!user) {
      // User has a valid Clerk session but isn't sync'd to local DB yet.
      // We return 401 with a specific message to indicate webhook latency/sync failure.
      res.status(401).json({
        error: 'User profile not synchronized in local database yet. Please retry shortly.',
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to restrict route access based on user role.
 * Must be mounted AFTER requireAuth.
 */
export function requireRole(allowedRoles: ('ADMINISTRATOR' | 'CONSUMER')[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized. Profile missing.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden. You do not have the required permissions to access this resource.',
      });
      return;
    }

    next();
  };
}
