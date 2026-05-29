import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export const ProtectedRoute = ({ children }) => {
    const { token, user } = useAuthStore();
    const location = useLocation();

    if (!token) {
        return <Navigate to="/" replace />;
    }

    const hasConnectedPlatform = user?.connectedSources?.some(src => 
        ['ga4', 'gsc', 'google-ads', 'facebook-ads'].includes(src)
    );

    if (!hasConnectedPlatform && location.pathname !== '/connect-accounts') {
        return <Navigate to="/connect-accounts" replace />;
    }

    return children;
};

export const AuthRoute = ({ children }) => {
    const { token, user } = useAuthStore();
    if (token) {
        const hasConnectedPlatform = user?.connectedSources?.some(src => 
            ['ga4', 'gsc', 'google-ads', 'facebook-ads'].includes(src)
        );
        return <Navigate to={hasConnectedPlatform ? "/dashboard" : "/connect-accounts"} replace />;
    }
    return children;
};

export const AdminRoute = ({ children }) => {
    const { user } = useAuthStore();
    if (!user || user.email !== import.meta.env.VITE_SUPER_ADMIN_EMAIL) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-neutral-100 dark:bg-dark-bg text-neutral-900 dark:text-white flex-col gap-4">
                <h1 className="text-3xl font-bold font-sans">Access Denied</h1>
                <p>You do not have permission to view this page.</p>
                <a href="/dashboard" className="text-brand-600 hover:underline">Return to Dashboard</a>
            </div>
        );
    }
    return children;
};
