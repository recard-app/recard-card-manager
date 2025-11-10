import { Request, Response, NextFunction } from 'express';
import { admin } from '../firebase-admin';

// Admin email whitelist
const adminEmailsString = process.env.ADMIN_EMAILS || '';
const ADMIN_EMAILS = adminEmailsString
  .split(',')
  .map(email => email.trim())
  .filter(email => email.length > 0);

// Check if email is in whitelist
function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Middleware to verify Firebase ID token and check email whitelist
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

    // Check if email is in whitelist
    if (!isAdminEmail(decodedToken.email)) {
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
