import { Router, Request, Response } from 'express';
import { verifyToken, requireFeature } from '../middleware/auth';

const router = Router();

router.use(verifyToken, requireFeature('user-manager'));

router.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'User manager routes available' });
});

export default router;
