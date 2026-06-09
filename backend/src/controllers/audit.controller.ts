import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../models/AuditLog.js';

/**
 * Fetch all chronological audit logs (Admin only).
 */
export async function getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const logs = await AuditLog.find()
      .populate({
        path: 'actor',
        select: 'firstName lastName email role',
        match: { _id: { $exists: true } }, // skip if actor is a string 'SYSTEM'
      })
      .sort({ createdAt: -1 });

    res.status(200).json(logs);
  } catch (error) {
    next(error);
  }
}
