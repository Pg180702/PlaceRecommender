import express from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import { connectDB } from './db/index.js';
import webhookRoutes from './routes/webhook.routes.js';
import userRoutes from './routes/user.routes.js';
import { refreshPlaceDetails } from './cron/cron.placeFetcher.js';
import cron from 'node-cron';

const app = express();

app.use(
  cors({
    credentials: true,
    origin: process.env.FRONTEND_URL,
  }),
);

app.use(express.urlencoded({ extended: true }));

app.use('/webhooks', webhookRoutes);

app.use(express.json());
app.use(clerkMiddleware());

app.use('/api/user', userRoutes);

connectDB().then(() => {
  app.listen(process.env.PORT, async () => {
    console.log(`Server started on port ${process.env.PORT}`);
  });

  cron.schedule('0 0 1 * *', async () => {
    console.log('Running monthly place refresh...');
    await refreshPlaceDetails();
  });
});
