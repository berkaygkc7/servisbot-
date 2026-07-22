import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
    const { session, loading, profile } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-slate-600 font-medium">Oturum açılıyor...</p>
            </div>
        );
    }

    if (!session) {
        // Redirect to landing page
        return <Navigate to="/" replace />;
    }

    if (allowedRoles && profile) {
        const userRole = profile.role || 'admin';
        if (!allowedRoles.includes(userRole)) {
            // Redirect to dashboard home or payments depending on role
            if (userRole === 'accountant') {
                return <Navigate to="/dashboard/payments" replace />;
            }
            return <Navigate to="/dashboard" replace />;
        }
    }

    return <>{children}</>;
};

export default ProtectedRoute;
