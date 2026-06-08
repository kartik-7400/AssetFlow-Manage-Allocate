import { Schema, model, Document, Types } from 'mongoose';

export interface IBooking extends Document {
  user: Types.ObjectId;
  asset: Types.ObjectId;
  quantity: number;
  startDate: Date;
  endDate: Date;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ISSUED' | 'RETURNED' | 'CANCELLED' | 'OVERDUE';
  notes?: string;
  issueNotes?: string;
  returnNotes?: string;
  issuedAt?: Date;
  returnedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    asset: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'ISSUED', 'RETURNED', 'CANCELLED', 'OVERDUE'],
      default: 'PENDING',
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    issueNotes: {
      type: String,
      trim: true,
    },
    returnNotes: {
      type: String,
      trim: true,
    },
    issuedAt: {
      type: Date,
    },
    returnedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save validation: verify startDate <= endDate
BookingSchema.pre<IBooking>('save', function (next) {
  if (this.startDate > this.endDate) {
    return next(new Error('Start date must be before or equal to end date.'));
  }
  next();
});

export const Booking = model<IBooking>('Booking', BookingSchema);
