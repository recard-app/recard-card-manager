import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { HomePage } from '@/pages/HomePage';
import { CardsListPage } from '@/pages/CardsListPage';
import { CardDetailPage } from '@/pages/CardDetailPage';
import { AIAssistantPage } from '@/pages/AIAssistantPage';
import { CardComparisonPage } from '@/pages/CardComparisonPage';
import { UserManagerPage } from '@/pages/UserManagerPage';
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
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cards"
            element={
              <ProtectedRoute requiredFeature="card-manager">
                <CardsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cards/:referenceCardId"
            element={
              <ProtectedRoute requiredFeature="card-manager">
                <CardDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cards/:referenceCardId/:versionId"
            element={
              <ProtectedRoute requiredFeature="card-manager">
                <CardDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-assistant"
            element={
              <ProtectedRoute requiredFeature="card-manager">
                <AIAssistantPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/card-comparison"
            element={
              <ProtectedRoute requiredFeature="card-manager">
                <CardComparisonPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute requiredFeature="user-manager">
                <UserManagerPage />
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
