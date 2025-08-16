import React, { Suspense } from 'react';
import {Routes, Route, Navigate} from 'react-router-dom';
import {LoadingSpinner} from '../ui/LoadingSpinner';
import {ProtectedRoute} from '../auth/ProtectedRoute';

// Lazy load pages
const Dashboard = React.lazy(() => import('../../pages/core/dashboard/Dashboard'));
const Login = React.lazy(() => import('../../pages/core/auth/Login'));
const Register = React.lazy(() => import('../../pages/core/auth/Register'));
const APITest = React.lazy(() => import('../../pages/core/testing/APITest'));
const SecurityTest = React.lazy(() => import('../../pages/core/testing/SecurityTest'));
const StressTest = React.lazy(() => import('../../pages/core/testing/StressTest'));
const Settings = React.lazy(() => import('../../pages/management/settings/Settings'));
const UserProfile = React.lazy(() => import('../../pages/user/profile/UserProfile'));

const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        
        {/* Testing routes */}
        <Route path="/test/api" element={<ProtectedRoute><APITest /></ProtectedRoute>} />
        <Route path="/test/security" element={<ProtectedRoute><SecurityTest /></ProtectedRoute>} />
        <Route path="/test/stress" element={<ProtectedRoute><StressTest /></ProtectedRoute>} />
        
        {/* Management routes */}
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        
        {/* User routes */}
        <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
