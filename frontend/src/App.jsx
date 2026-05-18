import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import PlacesPage from './pages/PlacesPage';
import PlaceDetailPage from './pages/PlaceDetailPage';
import MyReviewsPage from './pages/MyReviewsPage';
import CreateReviewPage from './pages/CreateReviewPage';
import AdminPage from './pages/AdminPage';
import SettingsPage from './pages/SettingsPage';
import MapPage from './pages/MapPage';
import { getEnabledContentModules, isContentModuleEnabled } from './config/contentModules';

const enabledContentModules = getEnabledContentModules();
const isPlacesEnabled = isContentModuleEnabled('place');
const isMapEnabled = isPlacesEnabled && window.ENV?.ENABLE_MAP === 'true';
const extraContentModules = enabledContentModules.filter((module) => module.contentType !== 'place');

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
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
      {user && <Navbar />}
      <main className={user ? 'flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8' : 'flex-1'}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          {isPlacesEnabled && <Route path="/places" element={<ProtectedRoute><PlacesPage contentType="place" /></ProtectedRoute>} />}
          {isPlacesEnabled && <Route path="/places/:id" element={<ProtectedRoute><PlaceDetailPage contentType="place" /></ProtectedRoute>} />}
          {extraContentModules.map((module) => (
            <Route
              key={module.contentType}
              path={`/${module.routeSegment}`}
              element={<ProtectedRoute><PlacesPage contentType={module.contentType} /></ProtectedRoute>}
            />
          ))}
          {extraContentModules.map((module) => (
            <Route
              key={`${module.contentType}-detail`}
              path={`/${module.routeSegment}/:id`}
              element={<ProtectedRoute><PlaceDetailPage contentType={module.contentType} /></ProtectedRoute>}
            />
          ))}
          <Route path="/my-reviews" element={<ProtectedRoute><MyReviewsPage /></ProtectedRoute>} />
          <Route path="/reviews/new" element={<ProtectedRoute><CreateReviewPage /></ProtectedRoute>} />
          <Route path="/reviews/:id/edit" element={<ProtectedRoute><CreateReviewPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          {isMapEnabled && <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />}
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
