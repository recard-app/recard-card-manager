import { Request, Response, NextFunction } from 'express';
import admin from '../firebase-admin';
import { hasFeatureAccess, hasAnyAccess } from '../services/permission.service';
import type { FeatureKey } from '../constants/features';

/**
 * Middleware to verify Firebase ID token and attach decoded user to request.
 * Does NOT check any feature permissions.
 */
export async function verifyToken(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    (req as any).user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Middleware factory that checks if the authenticated user has access to a specific feature.
 * Must be used after verifyToken.
 */
export function requireFeature(feature: FeatureKey) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'No authenticated user' });
    }

    const authorized = await hasFeatureAccess(user.email, feature);
    if (!authorized) {
      console.warn(`Unauthorized ${feature} access attempt by: ${user.email}`);
      return res.status(403).json({
        error: `Your email is not authorized to access ${feature}`
      });
    }

    next();
  };
}

/**
 * Middleware that checks if the authenticated user has access to any feature.
 * Must be used after verifyToken.
 */
export async function requireAnyFeature(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'No authenticated user' });
  }

  const authorized = await hasAnyAccess(user.email);
  if (!authorized) {
    console.warn(`Unauthorized access attempt by: ${user.email}`);
    return res.status(403).json({
      error: 'Your email is not authorized to access this admin panel'
    });
  }

  next();
}

/**
 * Combined middleware: verifies token + checks card-manager permission.
 * Drop-in replacement for the old verifyAuth — existing route files need zero changes.
 */
export const verifyAuth = [verifyToken, requireFeature('card-manager')];
