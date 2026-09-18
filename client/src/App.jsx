import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';

// Auth & Public Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Farmer Pages
import FarmerDashboard from './pages/farmer/FarmerDashboard';
import FarmerRequestPage from './pages/farmer/FarmerRequestPage';
import FarmerRequestsPage from './pages/farmer/FarmerRequestsPage';
import FarmerSchedulePage from './pages/farmer/FarmerSchedulePage';
import FarmerTrackingPage from './pages/farmer/FarmerTrackingPage';

// Owner Pages
import OwnerDashboard from './pages/owner/OwnerDashboard';
import OwnerResourcesPage from './pages/owner/OwnerResourcesPage';
import AddResourcePage from './pages/owner/AddResourcePage';
import OwnerBookingsPage from './pages/owner/OwnerBookingsPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminSchedulePage from './pages/admin/AdminSchedulePage';
import AdminConflictsPage from './pages/admin/AdminConflictsPage';
import AdminDisruptionsPage from './pages/admin/AdminDisruptionsPage';
import AdminResourcesPage from './pages/admin/AdminResourcesPage';

/**
 * Route protection wrapper verifying authentication and role authorization
 */
function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-agri-200 border-t-agri-600 rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to default dashboard of the user's role
    if (user.role === 'FARMER') return <Navigate to="/farmer/dashboard" replace />;
    if (user.role === 'OWNER') return <Navigate to="/owner/dashboard" replace />;
    if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-agri-200 selection:text-agri-950">
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Farmer Suite */}
          <Route
            path="/farmer/dashboard"
            element={
              <ProtectedRoute allowedRoles={['FARMER', 'ADMIN']}>
                <FarmerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/request"
            element={
              <ProtectedRoute allowedRoles={['FARMER', 'ADMIN']}>
                <FarmerRequestPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/requests"
            element={
              <ProtectedRoute allowedRoles={['FARMER', 'ADMIN']}>
                <FarmerRequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/schedule"
            element={
              <ProtectedRoute allowedRoles={['FARMER', 'ADMIN']}>
                <FarmerSchedulePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/tracking"
            element={
              <ProtectedRoute allowedRoles={['FARMER', 'ADMIN']}>
                <FarmerTrackingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/tracking/:bookingId"
            element={
              <ProtectedRoute allowedRoles={['FARMER', 'ADMIN']}>
                <FarmerTrackingPage />
              </ProtectedRoute>
            }
          />

          {/* Equipment Owner Suite */}
          <Route
            path="/owner/dashboard"
            element={
              <ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}>
                <OwnerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/resources"
            element={
              <ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}>
                <OwnerResourcesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/resources/new"
            element={
              <ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}>
                <AddResourcePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/bookings"
            element={
              <ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}>
                <OwnerBookingsPage />
              </ProtectedRoute>
            }
          />

          {/* System Administrator Suite */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/schedule"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminSchedulePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/conflicts"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminConflictsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/disruptions"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDisruptionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/resources"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminResourcesPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
