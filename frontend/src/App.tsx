import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useClinicStore } from './stores/clinicStore';
import { ToastProvider, ErrorBoundary } from './components/shared';

// Lazy-loaded page shells for code splitting
const AuthenticatedApp = React.lazy(() => import('./pages/AuthenticatedApp').then(m => ({ default: m.AuthenticatedApp })));
const LoginPage = React.lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = React.lazy(() => import('./pages/SignupPage').then(m => ({ default: m.SignupPage })));
const LandingPage = React.lazy(() => import('./domains/marketing/LandingPage').then(m => ({ default: m.LandingPage })));
const OnlineBookingPage = React.lazy(() => import('./domains/agenda/OnlineBookingPage').then(m => ({ default: m.OnlineBookingPage })));
const PublicAnamneseForm = React.lazy(() => import('./domains/prontuarios/PublicAnamneseForm').then(m => ({ default: m.PublicAnamneseForm })));
const PasswordResetFlow = React.lazy(() => import('./components/auth/PasswordResetFlow').then(m => ({ default: m.PasswordResetFlow })));

function FullPageLoader() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );
}

// Wrapper components for legacy props
function LoginPageWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  
  return (
    <LoginPage 
      onForgotPassword={() => navigate('/forgot-password')}
      onSignup={() => navigate('/signup')}
      onBackToLanding={() => navigate('/')}
    />
  );
}

function SignupPageWrapper() {
  const navigate = useNavigate();
  
  return (
    <SignupPage 
      onLoginClick={() => navigate('/login')}
    />
  );
}

function PasswordResetFlowWrapper() {
  const navigate = useNavigate();
  
  return (
    <PasswordResetFlow 
      onBack={() => navigate('/login')}
      onSuccess={() => navigate('/login')}
    />
  );
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={
          <ToastProvider>
            <ErrorBoundary key="landing">
              <LandingPage onLoginClick={() => window.location.href = '/login'} onSignupClick={() => window.location.href = '/signup'} />
            </ErrorBoundary>
          </ToastProvider>
        } />
        <Route path="/login" element={<LoginPageWrapper />} />
        <Route path="/signup" element={<SignupPageWrapper />} />
        <Route path="/forgot-password" element={<PasswordResetFlowWrapper />} />
        
        {/* Public booking and anamnese (via hash) */}
        <Route path="/book" element={
          <ToastProvider>
            <OnlineBookingPage clinicId="clinic-1" onBack={() => window.location.href = '/'} />
          </ToastProvider>
        } />
        
        {/* Authenticated routes - handled by AuthenticatedApp */}
        <Route path="/*" element={
          loading ? <FullPageLoader /> : user ? <AuthenticatedApp /> : <React.Fragment><ToastProvider><LandingPage onLoginClick={() => window.location.href = '/login'} onSignupClick={() => window.location.href = '/signup'} /></ToastProvider></React.Fragment>
        } />
      </Routes>
    </Suspense>
  );
}
