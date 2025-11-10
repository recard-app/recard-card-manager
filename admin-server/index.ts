import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cardsRoutes from './routes/cards';
import componentsRoutes from './routes/components';

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

// Routes
app.use('/admin/cards', cardsRoutes);
app.use('/admin', componentsRoutes);

// Health check
app.get('/', (req: Request, res: Response) => {
  res.send('ReCard Admin Server is running');
});

app.listen(PORT, () => {
  console.log(`Admin server started successfully on port ${PORT}`);
  console.log(`CORS enabled for: ${CORS_ORIGIN}`);
});
