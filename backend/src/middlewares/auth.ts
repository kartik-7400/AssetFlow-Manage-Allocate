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
    let user = await User.findOne({ clerkId });

    if (!user) {
      // Create/sync user on first authenticated request
      // Ignore mock users from seed data to determine if this is the first real user
      const realUserCount = await User.countDocuments({ clerkId: { $not: /^mock_/ } });
      const role = realUserCount === 0 ? 'ADMINISTRATOR' : 'CONSUMER';

      try {
        const { clerkClient } = await import('@clerk/express');
        const clerkUser = await clerkClient.users.getUser(clerkId);
        user = await User.create({
          clerkId,
          email: clerkUser.emailAddresses?.[0]?.emailAddress || `clerk_${clerkId}@example.com`,
          firstName: clerkUser.firstName || 'Clerk',
          lastName: clerkUser.lastName || 'User',
          imageUrl: clerkUser.imageUrl || '',
          role,
        });
        console.log(`[Auth Provisioning] Auto-provisioned profile for Clerk User: ${user.email} (Role: ${role})`);
      } catch (clerkErr: any) {
        console.warn('[Auth Provisioning] Clerk API fetch failed, falling back to placeholder profile:', clerkErr.message);
        user = await User.create({
          clerkId,
          email: `clerk_${clerkId}@example.com`,
          firstName: 'Clerk',
          lastName: 'User',
          imageUrl: '',
          role,
        });
      }
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
