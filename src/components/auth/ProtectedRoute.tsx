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

    // Check for suspended accounts
    if (profile?.companies?.subscription_status === 'suspended' && !profile.is_superadmin) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
                <div className="bg-slate-800 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl border border-slate-700">
                    <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-3">Hesabınız Askıya Alındı</h1>
                    <p className="text-slate-400 mb-8 leading-relaxed">
                        Hesabınızın kullanımı geçici olarak durdurulmuştur. Lütfen sistem yöneticisi ile iletişime geçin.
                    </p>
                    <button 
                        onClick={() => window.location.href = '/'}
                        className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
                    >
                        Ana Sayfaya Dön
                    </button>
                </div>
            </div>
        );
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
