import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ConnectAccountsPage from './pages/ConnectAccountsPage';
import DashboardPage from './pages/DashboardPage';
import NotFoundPage from './pages/NotFoundPage';
import AIChatPage from './pages/AIChatPage';
import AdminPage from './pages/AdminPage';
import SettingsPage from './pages/SettingsPage';
import LandingPage from './pages/LandingPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import GscPage from './pages/GscPage';
import Ga4Page from './pages/Ga4Page';
import GoogleAdsPage from './pages/GoogleAdsPage';
import FacebookAdsPage from './pages/FacebookAdsPage';
import SitesPage from './pages/SitesPage';
import AboutPage from './pages/AboutPage';
import SupportPage from './pages/SupportPage';
import FeaturesPage from './pages/FeaturesPage';


// Company Pages
import ContactPage from './pages/company/ContactPage';

// Legal Pages
import PrivacyPage from './pages/legal/PrivacyPage';
import TermsPage from './pages/legal/TermsPage';

import { ProtectedRoute, AuthRoute, AdminRoute } from './components/ui/RouteWrappers';
import { getMe } from './api/authApi';
import { useAuthStore } from './store/authStore';
import { useAccountsStore } from './store/accountsStore';
import { useThemeStore } from './store/themeStore';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};


const App = () => {
  const { theme } = useThemeStore();

  React.useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Toaster 
        position="top-right" 
        toastOptions={{ 
          duration: 4000,
          style: {
            background: theme === 'dark' ? '#171717' : '#FFFFFF',
            color: theme === 'dark' ? '#F5F5F5' : '#171717',
            borderRadius: '16px',
            border: theme === 'dark' ? '1px solid #262626' : '1px solid #E5E5E5',
            fontSize: '14px',
            fontWeight: '600',
            padding: '12px 16px',
            boxShadow: theme === 'dark' 
              ? '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
              : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#FFFFFF',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#FFFFFF',
            },
          },
        }} 
      />
      <Routes>
        <Route path="/" element={
          <AuthRoute>
            <LandingPage />
          </AuthRoute>
        } />

        <Route path="/login" element={
          <AuthRoute>
            <LoginPage />
          </AuthRoute>
        } />
        <Route path="/register" element={
          <AuthRoute>
            <RegisterPage />
          </AuthRoute>
        } />

        {/* Password Reset Routes - public, accessible even when logged in */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Email Verification - public, no auth wrapping needed */}
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        
        {/* Public Marketing/Legal Pages */}
        <Route path="/about" element={<AboutPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />


        {/* Protected Routes */}
        <Route path="/connect-accounts" element={
          <ProtectedRoute>
            <ConnectAccountsPage />
          </ProtectedRoute>
        } />

        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />

        <Route path="/dashboard/sites" element={
          <ProtectedRoute>
            <SitesPage />
          </ProtectedRoute>
        } />


        <Route path="/dashboard/ai-chat" element={
          <ProtectedRoute>
            <AIChatPage />
          </ProtectedRoute>
        } />

        <Route path="/dashboard/gsc" element={
          <ProtectedRoute>
            <GscPage />
          </ProtectedRoute>
        } />

        <Route path="/dashboard/ga4" element={
          <ProtectedRoute>
            <Ga4Page />
          </ProtectedRoute>
        } />

        <Route path="/dashboard/google-ads" element={
          <ProtectedRoute>
            <GoogleAdsPage />
          </ProtectedRoute>
        } />

        <Route path="/dashboard/facebook-ads" element={
          <ProtectedRoute>
            <FacebookAdsPage />
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        } />

        <Route path="/dashboard/support" element={
          <ProtectedRoute>
            <SupportPage />
          </ProtectedRoute>
        } />

        <Route path="/dashboard/admin" element={
          <ProtectedRoute>
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          </ProtectedRoute>
        } />

        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};



// Handle OAuth callback token in URL
const AuthCallback = () => {
  const navigate = useNavigate();
  const code = new URLSearchParams(window.location.search).get('token');
  const { setAuth, clearAuth } = useAuthStore();

  React.useEffect(() => {
    if (code) {
      // 1. Set the token only so axios interceptor can use it for the getMe call
      setAuth(code, null);

      getMe()
        .then(res => {
          // 2. Set full auth state after success
          setAuth(code, res.data.user);
          
          // 3. Client-side navigation (No page reload)
          const hasConnectedPlatform = res.data.user?.connectedSources?.some(src => 
            ['ga4', 'gsc', 'google-ads', 'facebook-ads'].includes(src)
          );
          const redirectOrigin = sessionStorage.getItem('oauth_redirect_origin');
          sessionStorage.removeItem('oauth_redirect_origin');
          
          if (redirectOrigin) {
            navigate(redirectOrigin, { replace: true });
          } else if (!hasConnectedPlatform) {
            navigate('/connect-accounts', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        })
        .catch(err => {
          console.error('OAuth getMe error:', err);
          clearAuth();
          navigate('/login', { replace: true });
        });
    } else {
      navigate('/login', { replace: true });
    }
  }, [code, setAuth, clearAuth, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 dark:bg-dark-bg text-brand-600 dark:text-brand-400 font-sans">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-brand-200 dark:border-brand-900 rounded-full animate-pulse"></div>
        <svg className="animate-spin absolute top-0 left-0 h-16 w-16 text-brand-600 dark:text-brand-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      <p className="font-black text-xl mt-8 tracking-tight">Authenticating Safely...</p>
      <p className="text-neutral-400 text-xs font-bold mt-2 uppercase tracking-widest">Finalizing your secure session</p>
    </div>
  );
};

export default App;
