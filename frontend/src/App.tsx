import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';

import { Navbar } from './components/layout/Navbar';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { KitchenDisplayPage } from './pages/kitchen/KitchenDisplayPage';
import { WaiterPage } from './pages/waiter/WaiterPage';
import { WaiterLoginPage } from './pages/auth/WaiterLoginPage';
import { CustomerQrMenuPage } from './pages/public/CustomerQrMenuPage';
import { OwnerDashboardPage } from './pages/dashboard/OwnerDashboardPage';
import { SuperAdminDashboard } from './pages/superadmin/SuperAdminDashboard';

const queryClient = new QueryClient();

// Role-aware ProtectedRoute
const ProtectedRoute: React.FC<{
  children: React.ReactElement;
  allowedRoles?: string[];
}> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-bold" style={{ backgroundColor: '#fdfbf7', color: '#78716c' }}>
        Loading session...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to staff's default landing page if not authorized for this specific route
    if (user.role === 'KITCHEN_STAFF') return <Navigate to="/kds" replace />;
    if (user.role === 'WAITER') return <Navigate to="/waiter" replace />;
    if (user.role === 'SUPER_ADMIN') return <Navigate to="/superadmin" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ backgroundColor: '#fdfbf7' }}>
      <Navbar />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/r/:restaurantSlug" element={<CustomerQrMenuPage />} />
          <Route path="/waiter-login" element={<WaiterLoginPage />} />

          {/* Owner & Manager Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['RESTAURANT_OWNER', 'RESTAURANT_MANAGER', 'SUPER_ADMIN']}>
                <OwnerDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Kitchen Display System (Isolated) */}
          <Route
            path="/kds"
            element={
              <ProtectedRoute allowedRoles={['KITCHEN_STAFF', 'RESTAURANT_OWNER', 'RESTAURANT_MANAGER', 'SUPER_ADMIN']}>
                <KitchenDisplayPage />
              </ProtectedRoute>
            }
          />

          {/* Waiter POS & Floorplan View (Isolated) */}
          <Route
            path="/waiter"
            element={
              <ProtectedRoute allowedRoles={['WAITER', 'RESTAURANT_OWNER', 'RESTAURANT_MANAGER', 'SUPER_ADMIN']}>
                <WaiterPage />
              </ProtectedRoute>
            }
          />

          {/* SuperAdmin View */}
          <Route
            path="/superadmin"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <Router>
            <Toaster position="top-right" toastOptions={{ style: { background: '#1c1917', color: '#fff', border: '1px solid #c9a84c' } }} />
            <AppContent />
          </Router>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
