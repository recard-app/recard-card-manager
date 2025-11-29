import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { CardsListPage } from '@/pages/CardsListPage';
import { CardDetailPage } from '@/pages/CardDetailPage';
import { Toaster } from '@/components/shadcn/sonner';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Navigate to="/cards" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cards"
            element={
              <ProtectedRoute>
                <CardsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cards/:referenceCardId"
            element={
              <ProtectedRoute>
                <CardDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cards/:referenceCardId/:versionId"
            element={
              <ProtectedRoute>
                <CardDetailPage />
              </ProtectedRoute>
            }
          />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
