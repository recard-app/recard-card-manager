import { Request, Response, NextFunction } from 'express';
import { admin } from '../firebase-admin';
import { isAdminEmail } from '../services/permission.service';

/**
 * Middleware to verify Firebase ID token and check email whitelist from Firestore.
 * The email whitelist is fetched from the permissions/card-manager document.
 */
export async function verifyAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Check if email is in whitelist (now fetched from Firestore)
    const authorized = await isAdminEmail(decodedToken.email);
    if (!authorized) {
      console.warn(`Unauthorized access attempt by: ${decodedToken.email}`);
      return res.status(403).json({
        error: 'Your email is not authorized to access this admin panel'
      });
    }

    // Attach user info to request for use in routes
    (req as any).user = decodedToken;

    next();
  } catch (error) {
    console.error('Auth verification error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
