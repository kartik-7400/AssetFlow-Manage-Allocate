import { Request, Response, NextFunction } from 'express';
import { Asset } from '../models/Asset.js';
import { AuditLog } from '../models/AuditLog.js';
import { calculatePeakOverlappingBookings } from '../services/inventory.js';

/**
 * Get assets with dynamic filtering, text search, and optional date-range availability calculations.
 */
export async function getAssets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { category, condition, search, startDate, endDate } = req.query;

    const filterQuery: any = {};

    // Do not show RETIRED assets by default
    filterQuery.status = { $ne: 'RETIRED' };

    if (category) {
      filterQuery.category = category;
    }

    if (condition) {
      filterQuery.condition = condition;
    }

    if (search) {
      filterQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const assets = await Asset.find(filterQuery);
    const resultAssets = [];

    // Parse dates if provided
    let sDate: Date | null = null;
    let eDate: Date | null = null;
    if (startDate && endDate) {
      sDate = new Date(startDate as string);
      eDate = new Date(endDate as string);
    }

    for (const asset of assets) {
      const assetObj = asset.toObject();
      let badge: 'Green' | 'Yellow' | 'Red' = 'Green';
      let remainingCount = asset.quantityAvailable;

      if (sDate && eDate && !isNaN(sDate.getTime()) && !isNaN(eDate.getTime())) {
        // Compute remaining count for the requested window
        const peakBooked = await calculatePeakOverlappingBookings(asset._id, sDate, eDate);
        const totalBookable = asset.quantityTotal - asset.quantityInMaintenance;
        remainingCount = Math.max(0, totalBookable - peakBooked);

        if (asset.status === 'MAINTENANCE' && totalBookable <= 0) {
          badge = 'Red';
        } else if (remainingCount <= 0) {
          badge = 'Red';
        } else if (remainingCount <= 1 || remainingCount <= asset.quantityTotal * 0.3) {
          badge = 'Yellow';
        } else {
          badge = 'Green';
        }
      } else {
        // Fallback to current physical status badge
        if (asset.status === 'MAINTENANCE' && asset.quantityAvailable <= 0) {
          badge = 'Red';
        } else if (asset.quantityAvailable <= 0) {
          badge = 'Red';
        } else if (asset.quantityAvailable <= 1 || asset.quantityAvailable <= asset.quantityTotal * 0.3) {
          badge = 'Yellow';
        } else {
          badge = 'Green';
        }
      }

      resultAssets.push({
        ...assetObj,
        availabilityBadge: badge,
        calculatedRemaining: remainingCount,
      });
    }

    res.status(200).json(resultAssets);
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new asset catalog item (Admin only).
 */
export async function createAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, category, description, quantityTotal, condition, imageUrl, qrCodeData } = req.body;

    // Generate unique QR code data string if not provided
    const finalQrCode = qrCodeData || `QR-${name.toUpperCase().replace(/[^A-Z0-9]/g, '-')}-${Date.now()}`;

    // Validate QR uniqueness
    const existing = await Asset.findOne({ qrCodeData: finalQrCode });
    if (existing) {
      res.status(400).json({ error: 'Asset with this QR code already exists.' });
      return;
    }

    const newAsset = await Asset.create({
      name,
      category,
      description,
      quantityTotal: Number(quantityTotal),
      quantityAvailable: Number(quantityTotal), // initially all are in store
      quantityInMaintenance: 0,
      condition: condition || 'EXCELLENT',
      imageUrl,
      qrCodeData: finalQrCode,
    });

    // Write audit log
    await AuditLog.create({
      actor: req.user?._id || 'SYSTEM',
      action: 'ASSET_CREATE',
      targetType: 'Asset',
      targetId: newAsset._id,
      details: {
        name,
        category,
        quantityTotal,
        qrCodeData: finalQrCode,
      },
    });

    res.status(201).json(newAsset);
  } catch (error) {
    next(error);
  }
}

/**
 * Update an existing asset catalog item (Admin only).
 */
export async function updateAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { name, category, description, quantityTotal, condition, imageUrl, qrCodeData, status } = req.body;

    const asset = await Asset.findById(id);
    if (!asset) {
      res.status(404).json({ error: 'Asset not found.' });
      return;
    }

    if (qrCodeData && qrCodeData !== asset.qrCodeData) {
      const existing = await Asset.findOne({ qrCodeData });
      if (existing) {
        res.status(400).json({ error: 'Another asset with this QR code already exists.' });
        return;
      }
      asset.qrCodeData = qrCodeData;
    }

    if (name) asset.name = name;
    if (category) asset.category = category;
    if (description !== undefined) asset.description = description;
    if (condition) asset.condition = condition;
    if (imageUrl !== undefined) asset.imageUrl = imageUrl;
    if (status) asset.status = status;

    if (quantityTotal !== undefined) {
      const newTotal = Number(quantityTotal);
      const diff = newTotal - asset.quantityTotal;

      // Ensure that adjusting the total quantity doesn't drive available count negative
      if (asset.quantityAvailable + diff < 0) {
        res.status(400).json({
          error: `Cannot reduce total quantity to ${newTotal}. There are currently ${asset.quantityTotal - asset.quantityAvailable} units checked out or in repair.`,
        });
        return;
      }

      asset.quantityTotal = newTotal;
      asset.quantityAvailable += diff;
    }

    await asset.save();

    // Write audit log
    await AuditLog.create({
      actor: req.user?._id || 'SYSTEM',
      action: 'ASSET_UPDATE',
      targetType: 'Asset',
      targetId: asset._id,
      details: {
        updates: req.body,
      },
    });

    res.status(200).json(asset);
  } catch (error) {
    next(error);
  }
}

/**
 * Retire an asset (Admin only). Set its status to RETIRED and available quantity to 0.
 */
export async function deleteAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const asset = await Asset.findById(id);
    if (!asset) {
      res.status(404).json({ error: 'Asset not found.' });
      return;
    }

    asset.status = 'RETIRED';
    asset.quantityAvailable = 0; // zero out available count
    await asset.save();

    // Write audit log
    await AuditLog.create({
      actor: req.user?._id || 'SYSTEM',
      action: 'ASSET_UPDATE',
      targetType: 'Asset',
      targetId: asset._id,
      details: {
        retired: true,
      },
    });

    res.status(200).json({ message: 'Asset retired successfully.', asset });
  } catch (error) {
    next(error);
  }
}
