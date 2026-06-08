import { Schema, model, Document, Types } from 'mongoose';

export interface INotification extends Document {
  recipient: Types.ObjectId;
  title: string;
  message: string;
  type: 'BOOKING_REQUEST' | 'BOOKING_APPROVED' | 'BOOKING_REJECTED' | 'RETURN_REMINDER' | 'OVERDUE';
  isRead: boolean;
  relatedBooking?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['BOOKING_REQUEST', 'BOOKING_APPROVED', 'BOOKING_REJECTED', 'RETURN_REMINDER', 'OVERDUE'],
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      required: true,
    },
    relatedBooking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Notification = model<INotification>('Notification', NotificationSchema);
