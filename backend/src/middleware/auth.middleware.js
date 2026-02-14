import { requireAuth as clerkRequireAuth } from '@clerk/express';
import { User } from '../models/user.models.js';

export const requireAuth = (req, res, next) => {
  clerkRequireAuth()(req, res, async (err) => {
    if (err) return next(err);

    try {
      const clerkUserId = req.auth?.userId;
      if (!clerkUserId) {
        return res
          .status(401)
          .json({ success: false, message: 'Unauthorized' });
      }

      const user = await User.findOne({ clerkUserId });
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: 'User not found' });
      }

      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  });
};
