import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Navbar from './components/common/Navbar';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import PlacesPage from './pages/PlacesPage';
import PlaceDetailPage from './pages/PlaceDetailPage';
import MyReviewsPage from './pages/MyReviewsPage';
import CreateReviewPage from './pages/CreateReviewPage';
import AdminPage from './pages/AdminPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {user && <Navbar />}
      <main className={user ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8' : ''}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/places" element={<ProtectedRoute><PlacesPage /></ProtectedRoute>} />
          <Route path="/places/:id" element={<ProtectedRoute><PlaceDetailPage /></ProtectedRoute>} />
          <Route path="/my-reviews" element={<ProtectedRoute><MyReviewsPage /></ProtectedRoute>} />
          <Route path="/reviews/new" element={<ProtectedRoute><CreateReviewPage /></ProtectedRoute>} />
          <Route path="/reviews/:id/edit" element={<ProtectedRoute><CreateReviewPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
