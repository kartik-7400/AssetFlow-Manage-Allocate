import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  actor: Types.ObjectId | 'SYSTEM';
  action:
    | 'ASSET_CREATE'
    | 'ASSET_UPDATE'
    | 'BOOKING_APPROVE'
    | 'BOOKING_REJECT'
    | 'ASSET_ISSUE'
    | 'ASSET_RETURN'
    | 'MAINTENANCE_LOG'
    | 'MAINTENANCE_RESOLVE';
  targetType: 'Asset' | 'Booking' | 'User' | 'Maintenance' | 'Notification';
  targetId: Types.ObjectId;
  details?: Record<string, any>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actor: {
      type: Schema.Types.Mixed, // Types.ObjectId ref User, or 'SYSTEM'
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        'ASSET_CREATE',
        'ASSET_UPDATE',
        'BOOKING_APPROVE',
        'BOOKING_REJECT',
        'ASSET_ISSUE',
        'ASSET_RETURN',
        'MAINTENANCE_LOG',
        'MAINTENANCE_RESOLVE',
      ],
      required: true,
    },
    targetType: {
      type: String,
      enum: ['Asset', 'Booking', 'User', 'Maintenance', 'Notification'],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    details: {
      type: Schema.Types.Mixed,
    },
  },
  {
    // We only need createdAt for audit logs, no updatedAt
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema);
