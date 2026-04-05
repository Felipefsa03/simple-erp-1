import React, { useState, useEffect, Suspense } from 'react';
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

export default function App() {
  const { user } = useAuth();
  const [authView, setAuthView] = useState<'landing' | 'login' | 'signup' | 'forgot-password'>('landing');
  const [publicRoute, setPublicRoute] = useState<'landing' | 'book-online' | 'anamnese-form'>(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash.startsWith('#book-online')) return 'book-online';
    if (hash.startsWith('#anamnese-form')) return 'anamnese-form';
    return 'landing';
  });
  const [publicClinicId, setPublicClinicId] = useState<string>(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash.startsWith('#book-online')) {
      const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
      return params.get('clinic') || 'clinic-1';
    }
    return 'clinic-1';
  });
  const [publicAnamneseToken, setPublicAnamneseToken] = useState<string>(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash.startsWith('#anamnese-form')) {
      const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
      return params.get('token') || '';
    }
    return '';
  });

  // Hash-based public route detection
  useEffect(() => {
    const syncPublicRoute = () => {
      const hash = window.location.hash || '';
      if (hash.startsWith('#book-online')) {
        setPublicRoute('book-online');
        const parsed = hash.includes('?') ? hash.split('?')[1] : '';
        const params = new URLSearchParams(parsed);
        setPublicClinicId(params.get('clinic') || 'clinic-1');
        setPublicAnamneseToken('');
        setAuthView('landing');
      } else if (hash.startsWith('#anamnese-form')) {
        setPublicRoute('anamnese-form');
        const parsed = hash.includes('?') ? hash.split('?')[1] : '';
        const params = new URLSearchParams(parsed);
        setPublicAnamneseToken(params.get('token') || '');
        setAuthView('landing');
      } else {
        setPublicRoute('landing');
        setPublicAnamneseToken('');
      }
    };
    syncPublicRoute();
    window.addEventListener('hashchange', syncPublicRoute);
    return () => window.removeEventListener('hashchange', syncPublicRoute);
  }, []);

  // Hydrate anamnese store for public form
  useEffect(() => {
    if (publicRoute === 'anamnese-form' && publicAnamneseToken) {
      useClinicStore.persist.hasHydrated();
    }
  }, [publicRoute, publicAnamneseToken]);

  // --- Public Routes (no auth required) ---
  if (publicRoute === 'book-online') {
    return (
      <ToastProvider>
        <ErrorBoundary key="guest-online-booking">
          <Suspense fallback={<FullPageLoader />}>
            <OnlineBookingPage clinicId={publicClinicId} onBack={() => { window.location.hash = ''; setPublicRoute('landing'); }} />
          </Suspense>
        </ErrorBoundary>
      </ToastProvider>
    );
  }

  if (publicRoute === 'anamnese-form') {
    return (
      <ToastProvider>
        <ErrorBoundary key="guest-anamnese-form">
          <Suspense fallback={<FullPageLoader />}>
            <PublicAnamneseForm token={publicAnamneseToken} onBack={() => { window.location.hash = ''; setPublicRoute('landing'); }} />
          </Suspense>
        </ErrorBoundary>
      </ToastProvider>
    );
  }

  // --- Authenticated App ---
  if (user) {
    return (
      <Suspense fallback={<FullPageLoader />}>
        <AuthenticatedApp />
      </Suspense>
    );
  }

  // --- Unauthenticated Views ---
  return (
    <Suspense fallback={<FullPageLoader />}>
      {authView === 'signup' && (
        <SignupPage onLoginClick={() => setAuthView('login')} />
      )}
      {authView === 'forgot-password' && (
        <ToastProvider>
          <PasswordResetFlow
            onBack={() => setAuthView('login')}
            onSuccess={() => setAuthView('login')}
          />
        </ToastProvider>
      )}
      {authView === 'login' && (
        <LoginPage
          onForgotPassword={() => setAuthView('forgot-password')}
          onSignup={() => setAuthView('signup')}
          onBackToLanding={() => setAuthView('landing')}
        />
      )}
      {authView === 'landing' && (
        <ToastProvider>
          <ErrorBoundary key="guest-landing">
            <LandingPage onLoginClick={() => setAuthView('login')} onSignupClick={() => setAuthView('signup')} />
          </ErrorBoundary>
        </ToastProvider>
      )}
    </Suspense>
  );
}
