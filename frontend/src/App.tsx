import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useClinicStore } from './stores/clinicStore';
import { ToastProvider, ErrorBoundary } from './components/shared';
import { PWAInstallButton } from './components/PWAInstallButton';

// Lazy-loaded page shells for code splitting
const AuthenticatedApp = React.lazy(() => import('./pages/AuthenticatedApp').then(m => ({ default: m.AuthenticatedApp })));
const LoginPage = React.lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = React.lazy(() => import('./pages/SignupPage').then(m => ({ default: m.SignupPage })));
const LandingPage = React.lazy(() => import('./domains/marketing/LandingPage').then(m => ({ default: m.LandingPage })));
const OnlineBookingPage = React.lazy(() => import('./domains/agenda/OnlineBookingPage').then(m => ({ default: m.OnlineBookingPage })));
const PublicAnamneseForm = React.lazy(() => import('./domains/prontuarios/PublicAnamneseForm').then(m => ({ default: m.PublicAnamneseForm })));
const PasswordResetFlow = React.lazy(() => import('./components/auth/PasswordResetFlow').then(m => ({ default: m.PasswordResetFlow })));

// Public pages
const AboutPage = React.lazy(() => import('./domains/pages/AboutPage').then(m => ({ default: m.AboutPage })));
const ContactPage = React.lazy(() => import('./domains/pages/ContactPage').then(m => ({ default: m.ContactPage })));
const APIPage = React.lazy(() => import('./domains/pages/APIPage').then(m => ({ default: m.APIPage })));
const BlogPage = React.lazy(() => import('./domains/pages/BlogPage').then(m => ({ default: m.BlogPage })));
const CareersPage = React.lazy(() => import('./domains/pages/CareersPage').then(m => ({ default: m.CareersPage })));
const TermsPage = React.lazy(() => import('./domains/pages/TermsPage').then(m => ({ default: m.TermsPage })));
const PrivacyPage = React.lazy(() => import('./domains/pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const LGPDPage = React.lazy(() => import('./domains/pages/LGPDPage').then(m => ({ default: m.LGPDPage })));
const CookiesPage = React.lazy(() => import('./domains/pages/CookiesPage').then(m => ({ default: m.CookiesPage })));

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
  const { user, loading, checkSession } = useAuth();

  // Verificar sessão ao carregar app (apenas uma vez)
  useEffect(() => {
    let mounted = true;
    if (mounted) checkSession();
    return () => { mounted = false; };
  }, [checkSession]);

  return (
    <Suspense fallback={<FullPageLoader />}>
      <PWAInstallButton />
      <Routes>
        {/* Public routes - redirect to login if authenticated */}
        <Route path="/login" element={<LoginPageWrapper />} />
        <Route path="/signup" element={<SignupPageWrapper />} />
        <Route path="/forgot-password" element={<PasswordResetFlowWrapper />} />
        
        {/* Public pages - always accessible */}
        <Route path="/sobre" element={<AboutPage />} />
        <Route path="/contato" element={<ContactPage />} />
        <Route path="/api" element={<APIPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/carreiras" element={<CareersPage />} />
        <Route path="/termos" element={<TermsPage />} />
        <Route path="/privacidade" element={<PrivacyPage />} />
        <Route path="/lgpd" element={<LGPDPage />} />
        <Route path="/cookies" element={<CookiesPage />} />
        
        {/* Public booking and anamnese (via hash) */}
        <Route path="/book" element={
          <ToastProvider>
            <OnlineBookingPage clinicId="clinic-1" onBack={() => window.location.href = '/'} />
          </ToastProvider>
        } />
        
        {/* Root route - shows landing for visitors, app for authenticated users */}
        <Route path="/" element={
          user ? <AuthenticatedApp /> : (
            <ToastProvider>
              <ErrorBoundary key="landing">
                <LandingPage onLoginClick={() => window.location.href = '/login'} onSignupClick={() => window.location.href = '/signup'} />
              </ErrorBoundary>
            </ToastProvider>
          )
        } />
        
        {/* All other routes - authenticated or redirect to landing */}
        <Route path="/*" element={
          loading ? <FullPageLoader /> : user ? <AuthenticatedApp /> : <React.Fragment><ToastProvider><LandingPage onLoginClick={() => window.location.href = '/login'} onSignupClick={() => window.location.href = '/signup'} /></ToastProvider></React.Fragment>
        } />
      </Routes>
    </Suspense>
  );
}
