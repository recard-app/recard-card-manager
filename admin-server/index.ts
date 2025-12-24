import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cardsRoutes from './routes/cards';
import componentsRoutes from './routes/components';
import aiRoutes from './routes/ai';
import comparisonRoutes from './routes/comparison';
import { isAdminEmail } from './services/permission.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 9000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5174';

// Middleware
app.use(cors({
  origin: CORS_ORIGIN,
}));
app.use(express.json());

// Handle preflight requests
app.options('*', cors());

// Public endpoint to check if an email is authorized (no auth required)
app.get('/admin/check-permission/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    const allowed = await isAdminEmail(email);
    res.json({ allowed });
  } catch (error) {
    console.error('Error checking permission:', error);
    res.status(500).json({ error: 'Failed to check permission', allowed: false });
  }
});

// Routes (protected by auth middleware)
app.use('/admin/cards', cardsRoutes);
app.use('/admin', componentsRoutes);
app.use('/admin/ai', aiRoutes);
app.use('/admin/comparison', comparisonRoutes);

// Health check
app.get('/', (req: Request, res: Response) => {
  res.send('ReCard Admin Server is running');
});

app.listen(PORT, () => {
  console.log(`Admin server started successfully on port ${PORT}`);
  console.log(`CORS enabled for: ${CORS_ORIGIN}`);
});
