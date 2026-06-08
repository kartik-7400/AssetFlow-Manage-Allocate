import { Schema, model, Document, Types } from 'mongoose';

export interface IMaintenance extends Document {
  asset: Types.ObjectId;
  reportedBy: Types.ObjectId;
  booking?: Types.ObjectId;
  quantity: number;
  condition: 'DAMAGED' | 'UNDER_REPAIR' | 'RESOLVED';
  damageReport: string;
  resolutionDetails?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: Date;
  updatedAt: Date;
}

const MaintenanceSchema = new Schema<IMaintenance>(
  {
    asset: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
      index: true,
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: false,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    condition: {
      type: String,
      enum: ['DAMAGED', 'UNDER_REPAIR', 'RESOLVED'],
      default: 'DAMAGED',
      required: true,
    },
    damageReport: {
      type: String,
      required: true,
      trim: true,
    },
    resolutionDetails: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED'],
      default: 'OPEN',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Maintenance = model<IMaintenance>('Maintenance', MaintenanceSchema);
