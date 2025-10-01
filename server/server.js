import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { clerkMiddleware, requireAuth } from '@clerk/express';
import aiRouter from './routes/aiRoutes.js';
import connectCloudinary from './config/cloudinary.js';
import userRouter from './routes/userRoutes.js';

const app = express();

await connectCloudinary();

// ✅ Allow only your Vercel frontend & local dev
const allowedOrigins = [
  "https://your-frontend.vercel.app",  // replace with your real Vercel frontend link
  "http://localhost:5173"              // for local React dev
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());
app.use(clerkMiddleware());

app.get('/', (req, res) => res.send('Server is Live!'));

// Protect all routes below
app.use(requireAuth());

app.use('/api/ai', aiRouter);
app.use('/api/user', userRouter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('✅ Server is running on port', PORT);
});
