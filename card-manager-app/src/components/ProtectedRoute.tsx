import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { FeatureKey } from '@/types/permissions';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredFeature?: FeatureKey;
}

export function ProtectedRoute({ children, requiredFeature }: ProtectedRouteProps) {
  const { user, loading, isAuthorized, permissions } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return <Navigate to="/login" replace />;
  }

  if (requiredFeature && !permissions[requiredFeature]) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
