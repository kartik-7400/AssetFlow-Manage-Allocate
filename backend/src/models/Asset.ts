import { Schema, model, Document } from 'mongoose';

export interface IAsset extends Document {
  name: string;
  category: string;
  description: string;
  quantityTotal: number;
  quantityAvailable: number;
  quantityInMaintenance: number;
  status: 'AVAILABLE' | 'MAINTENANCE' | 'RETIRED';
  condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'DAMAGED';
  qrCodeData: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AssetSchema = new Schema<IAsset>(
  {
    name: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      default: '',
    },
    quantityTotal: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },
    quantityAvailable: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },
    quantityInMaintenance: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'MAINTENANCE', 'RETIRED'],
      default: 'AVAILABLE',
      required: true,
    },
    condition: {
      type: String,
      enum: ['EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED'],
      default: 'EXCELLENT',
      required: true,
    },
    qrCodeData: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    imageUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save validation to ensure available + maintenance <= total
AssetSchema.pre<IAsset>('save', function (next) {
  if (this.quantityAvailable + this.quantityInMaintenance > this.quantityTotal) {
    return next(new Error('Sum of available and in-maintenance quantities cannot exceed total quantity.'));
  }
  next();
});

export const Asset = model<IAsset>('Asset', AssetSchema);
