import rateLimit from 'express-rate-limit';

export const aiRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.user?.clerkUserId,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Daily limit reached. You can generate again after 24 hours.',
    });
  },
  standardHeaders: false,
  legacyHeaders: false,
});
