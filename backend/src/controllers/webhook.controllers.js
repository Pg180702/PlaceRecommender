import { Webhook } from 'svix';
import { User } from '../models/user.models.js';

export const handleClerkWebhook = async (req, res) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(500).json({ message: 'Webhook secret not configured' });
  }

  const svixId = req.headers['svix-id'];
  const svixTimestamp = req.headers['svix-timestamp'];
  const svixSignature = req.headers['svix-signature'];

  if (!svixId || !svixTimestamp || !svixSignature) {
    return res.status(400).json({ message: 'Missing svix headers' });
  }

  const wh = new Webhook(webhookSecret);
  let event;

  try {
    event = wh.verify(req.body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });
  } catch {
    return res.status(400).json({ message: 'Invalid webhook signature' });
  }

  if (event.type === 'user.created') {
    const { id, email_addresses } = event.data;
    const email = email_addresses?.[0]?.email_address;

    try {
      await User.create({ clerkUserId: id, email });
      console.log(`User created in DB: ${id}`);
    } catch (err) {
      if (err.code === 11000) {
        // Already exists — ignore duplicate
      } else {
        console.error('Error creating user from webhook:', err);
        return res.status(500).json({ message: 'Failed to create user' });
      }
    }
  }

  return res.status(200).json({ message: 'Webhook received' });
};
