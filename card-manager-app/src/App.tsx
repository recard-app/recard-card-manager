import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { HomePage } from '@/pages/HomePage';
import { CardsListPage } from '@/pages/CardsListPage';
import { CardDetailPage } from '@/pages/CardDetailPage';
import { AIAssistantPage } from '@/pages/AIAssistantPage';
import { UrlManagementPage } from '@/pages/UrlManagementPage';
import { ReviewsPage } from '@/pages/ReviewsPage';
import { CardReviewDetailPage } from '@/pages/CardReviewDetailPage';
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
            path="/generator"
            element={
              <ProtectedRoute requiredFeature="card-manager">
                <AIAssistantPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sources"
            element={
              <ProtectedRoute requiredFeature="card-manager">
                <UrlManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviews"
            element={
              <ProtectedRoute requiredFeature="card-manager">
                <ReviewsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviews/:resultId"
            element={
              <ProtectedRoute requiredFeature="card-manager">
                <CardReviewDetailPage />
              </ProtectedRoute>
            }
          />
          {/* Redirect old card-comparison route to reviews manual compare tab */}
          <Route
            path="/card-comparison"
            element={<Navigate to="/reviews?tab=manual" replace />}
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute requiredFeature="user-manager">
                <UserManagerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/:userId"
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
