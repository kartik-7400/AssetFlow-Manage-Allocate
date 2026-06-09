import { Request, Response, NextFunction } from 'express';
import { Maintenance } from '../models/Maintenance.js';
import { resolveMaintenance } from '../services/inventory.js';

/**
 * Fetch maintenance tickets (Admin only).
 */
export async function getMaintenanceTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = req.query;

    const query: any = {};
    if (status) {
      query.status = status;
    }

    const tickets = await Maintenance.find(query)
      .populate('asset')
      .populate('reportedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.status(200).json(tickets);
  } catch (error) {
    next(error);
  }
}

/**
 * Resolve an open maintenance ticket (Admin only).
 */
export async function resolveMaintenanceTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { resolutionDetails, conditionAfterRepair } = req.body;

    if (!resolutionDetails || resolutionDetails.trim() === '') {
      res.status(400).json({ error: 'Resolution comments/details are required to resolve a ticket.' });
      return;
    }

    const updatedTicket = await resolveMaintenance(
      id,
      req.user?._id || 'SYSTEM',
      resolutionDetails,
      conditionAfterRepair
    );

    res.status(200).json(updatedTicket);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}
