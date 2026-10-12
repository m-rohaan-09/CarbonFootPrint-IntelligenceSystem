import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, GuestRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import CompaniesPage from './pages/CompaniesPage';
import AuditLogsPage from './pages/AuditLogsPage';
import ProfilePage from './pages/ProfilePage';
import CompanyOnboardingPage from './pages/CompanyOnboardingPage';
import CompanyProfilePage from './pages/CompanyProfilePage';
import DepartmentsPage from './pages/DepartmentsPage';
import DataCollectionPage from './pages/DataCollectionPage';
import BillUploadPage from './pages/BillUploadPage';
import BaselineResultsPage from './pages/BaselineResultsPage';
import ForecastingPage from './pages/ForecastingPage';
import AnomalyAlertsPage from './pages/AnomalyAlertsPage';
import AIInsightsPage from './pages/AIInsightsPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Guest routes */}
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/signup" element={<GuestRoute><SignupPage /></GuestRoute>} />
          <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
          <Route path="/verify-email" element={<GuestRoute><VerifyEmailPage /></GuestRoute>} />

          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>
          } />

          {/* Company Onboarding & Data Collection (Module 2) */}
          <Route path="/onboarding" element={
            <ProtectedRoute roles={['company_rep', 'admin']}><Layout><CompanyOnboardingPage /></Layout></ProtectedRoute>
          } />
          <Route path="/company/profile" element={
            <ProtectedRoute roles={['company_rep', 'admin']}><Layout><CompanyProfilePage /></Layout></ProtectedRoute>
          } />
          <Route path="/departments" element={
            <ProtectedRoute roles={['company_rep', 'admin']}><Layout><DepartmentsPage /></Layout></ProtectedRoute>
          } />
          <Route path="/data-collection" element={
            <ProtectedRoute roles={['company_rep', 'admin', 'auditor']}><Layout><DataCollectionPage /></Layout></ProtectedRoute>
          } />
          <Route path="/bill-upload" element={
            <ProtectedRoute roles={['company_rep', 'admin']}><Layout><BillUploadPage /></Layout></ProtectedRoute>
          } />
          <Route path="/baseline" element={
            <ProtectedRoute roles={['company_rep', 'admin', 'employee', 'auditor']}><Layout><BaselineResultsPage /></Layout></ProtectedRoute>
          } />
          <Route path="/ai/forecasting" element={
            <ProtectedRoute roles={['company_rep', 'admin', 'employee', 'auditor']}><Layout><ForecastingPage /></Layout></ProtectedRoute>
          } />
          <Route path="/ai/anomalies" element={
            <ProtectedRoute roles={['company_rep', 'admin', 'employee', 'auditor']}><Layout><AnomalyAlertsPage /></Layout></ProtectedRoute>
          } />
          <Route path="/ai/insights" element={
            <ProtectedRoute roles={['company_rep', 'admin', 'employee', 'auditor']}><Layout><AIInsightsPage /></Layout></ProtectedRoute>
          } />

          {/* Admin routes */}
          <Route path="/admin/users" element={
            <ProtectedRoute roles={['admin']}><Layout><UsersPage /></Layout></ProtectedRoute>
          } />
          <Route path="/admin/companies" element={
            <ProtectedRoute roles={['admin']}><Layout><CompaniesPage /></Layout></ProtectedRoute>
          } />
          <Route path="/admin/audit-logs" element={
            <ProtectedRoute roles={['admin']}><Layout><AuditLogsPage /></Layout></ProtectedRoute>
          } />

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
