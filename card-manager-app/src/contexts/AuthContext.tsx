import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, googleProvider, getUserPermissions } from '@/lib/firebase';
import { DEFAULT_PERMISSIONS, hasAnyPermission } from '@/types/permissions';
import type { FeaturePermissions } from '@/types/permissions';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthorized: boolean;
  permissions: FeaturePermissions;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [permissions, setPermissions] = useState<FeaturePermissions>({ ...DEFAULT_PERMISSIONS });
  const [error, setError] = useState<string | null>(null);

  // Check authorization when user changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);

      if (authUser) {
        const perms = await getUserPermissions(authUser.email);
        setPermissions(perms);
        setIsAuthorized(hasAnyPermission(perms));
      } else {
        setPermissions({ ...DEFAULT_PERMISSIONS });
        setIsAuthorized(false);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);

      const perms = await getUserPermissions(result.user.email);
      if (!hasAnyPermission(perms)) {
        await firebaseSignOut(auth);
        setPermissions({ ...DEFAULT_PERMISSIONS });
        setIsAuthorized(false);
        throw new Error('Your email is not authorized to access this admin panel. Please contact the administrator.');
      }

      setPermissions(perms);
      setIsAuthorized(true);
    } catch (err: any) {
      console.error('Sign in error:', err);
      setError(err.message || 'Failed to sign in');
      throw err;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setPermissions({ ...DEFAULT_PERMISSIONS });
      setIsAuthorized(false);
      setError(null);
    } catch (err: any) {
      console.error('Sign out error:', err);
      setError(err.message || 'Failed to sign out');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthorized, permissions, signInWithGoogle, signOut, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
