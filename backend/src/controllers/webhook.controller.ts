import { Request, Response, NextFunction } from 'express';
import { Webhook } from 'svix';
import { User } from '../models/User.js';

/**
 * Controller to handle Clerk webhook events (user.created, user.updated, user.deleted).
 * Verifies webhook signatures using svix package.
 */
export async function handleClerkWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  let event: any;

  if (webhookSecret) {
    const svixId = req.headers['svix-id'] as string;
    const svixTimestamp = req.headers['svix-timestamp'] as string;
    const svixSignature = req.headers['svix-signature'] as string;

    if (!svixId || !svixTimestamp || !svixSignature) {
      res.status(400).json({ error: 'Missing svix headers for webhook verification.' });
      return;
    }

    try {
      // Need raw body for verification
      const rawBody = JSON.stringify(req.body);
      const wh = new Webhook(webhookSecret);
      event = wh.verify(rawBody, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });
    } catch (err: any) {
      console.error('Clerk Webhook verification failed:', err.message);
      res.status(400).json({ error: 'Webhook signature verification failed.' });
      return;
    }
  } else {
    // In development or test, we allow skipping webhook verification if secret is not set
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({ error: 'Missing CLERK_WEBHOOK_SECRET environment variable in production.' });
      return;
    }
    console.warn('WARNING: CLERK_WEBHOOK_SECRET is not configured. Webhook signature checking bypassed.');
    event = req.body;
  }

  const { type, data } = event;

  try {
    switch (type) {
      case 'user.created': {
        const clerkId = data.id;
        const email = data.email_addresses?.[0]?.email_address || '';
        const firstName = data.first_name || '';
        const lastName = data.last_name || '';
        const imageUrl = data.image_url || '';

        // Check if user already exists
        let existingUser = await User.findOne({ clerkId });
        if (existingUser) {
          res.status(200).json({ message: 'User already exists.' });
          return;
        }

        // Determine Role: metadata, email domain pattern, or first-user bootstrapping
        let role = data.public_metadata?.role;
        if (role !== 'ADMINISTRATOR' && role !== 'CONSUMER') {
          const userCount = await User.countDocuments({});
          role = userCount === 0 ? 'ADMINISTRATOR' : 'CONSUMER';
        }

        await User.create({
          clerkId,
          email,
          firstName,
          lastName,
          imageUrl,
          role,
        });

        console.log(`[Webhook Sync] Created user: ${email} with role ${role}`);
        res.status(201).json({ message: 'User synchronized successfully.' });
        break;
      }

      case 'user.updated': {
        const clerkId = data.id;
        const email = data.email_addresses?.[0]?.email_address || '';
        const firstName = data.first_name || '';
        const lastName = data.last_name || '';
        const imageUrl = data.image_url || '';
        const role = data.public_metadata?.role;

        const updateData: any = {
          email,
          firstName,
          lastName,
          imageUrl,
        };

        if (role === 'ADMINISTRATOR' || role === 'CONSUMER') {
          updateData.role = role;
        }

        const updatedUser = await User.findOneAndUpdate({ clerkId }, { $set: updateData }, { new: true });
        if (!updatedUser) {
          res.status(404).json({ error: 'User not found in local database.' });
          return;
        }

        console.log(`[Webhook Sync] Updated user profile for: ${email}`);
        res.status(200).json({ message: 'User profile updated successfully.' });
        break;
      }

      case 'user.deleted': {
        const clerkId = data.id;
        const deletedUser = await User.findOneAndDelete({ clerkId });
        if (!deletedUser) {
          res.status(404).json({ error: 'User not found in local database.' });
          return;
        }

        console.log(`[Webhook Sync] Deleted user profile for clerk ID: ${clerkId}`);
        res.status(200).json({ message: 'User deleted successfully.' });
        break;
      }

      default:
        console.log(`[Webhook Sync] Unhandled webhook event type: ${type}`);
        res.status(200).json({ message: 'Webhook received but unhandled.' });
    }
  } catch (error) {
    next(error);
  }
}
