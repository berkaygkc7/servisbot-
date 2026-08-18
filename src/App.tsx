import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Hero from './components/home/Hero';
import LiveStatsSection from './components/home/LiveStatsSection';
import FeatureSection from './components/home/FeatureSection';
import MobileAppShowcase from './components/home/MobileAppShowcase';

import Footer from './components/layout/Footer';
import DashboardLayout from './layouts/DashboardLayout';
const DashboardHome = lazy(() => import('./pages/DashboardHome'));
const Vehicles = lazy(() => import('./pages/Vehicles'));
const Students = lazy(() => import('./pages/Students'));
const RoutesPage = lazy(() => import('./pages/RoutesPage'));
const Drivers = lazy(() => import('./pages/Drivers'));
const Settings = lazy(() => import('./pages/Settings'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Payments = lazy(() => import('./pages/Payments'));
const UniversalTimesheets = lazy(() => import('./pages/UniversalTimesheets'));
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ApplicationForm = lazy(() => import('./pages/public/ApplicationForm'));
import { KVKK, PrivacyPolicy, TermsOfService } from './pages/public/LegalPages';
const PrintPreview = lazy(() => import('./pages/PrintPreview'));

// Driver Pages
import DriverLayout from './layouts/DriverLayout';
const DriverHome = lazy(() => import('./pages/driver/DriverHome'));
const DriverRouteExecution = lazy(() => import('./pages/driver/DriverRouteExecution'));
const SharedRouteViewer = lazy(() => import('./pages/driver/SharedRouteViewer'));

// Super Admin
import SuperAdminLayout from './layouts/SuperAdminLayout';
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/SuperAdminDashboard'));
const CompaniesList = lazy(() => import('./pages/superadmin/CompaniesList'));
const AdminUsers = lazy(() => import('./pages/superadmin/AdminUsers'));
const PlatformSettings = lazy(() => import('./pages/superadmin/PlatformSettings'));
const AuditLogs = lazy(() => import('./pages/superadmin/AuditLogs'));
const SuperAdminAccount = lazy(() => import('./pages/superadmin/SuperAdminAccount'));

import { useEffect, useState, lazy, Suspense } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { APIProvider } from '@vis.gl/react-google-maps';

// Landing Page Layout
const LandingPage = () => {
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);
    
    // Check if the URL indicates a successful auth callback (email confirmation usually redirects here)
    if (hash.includes('type=signup') || hash.includes('type=recovery') || searchParams.has('code') || searchParams.has('access_token')) {
      setShowConfirmPopup(true);
      
      // Clean up the URL optionally to remove the hash/params after showing the popup
      // window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <Navbar />
      <Hero />
      <LiveStatsSection />
      <FeatureSection />
      <MobileAppShowcase />
      <Footer />

      {showConfirmPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
           <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl relative text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                 <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">E-postanız Onaylandı!</h3>
              <p className="text-slate-600 mb-8">
                 Hesabınız başarıyla doğrulandı. Artık ServisBot'a giriş yapabilir ve tüm özellikleri kullanmaya başlayabilirsiniz.
              </p>
              <button 
                 onClick={() => setShowConfirmPopup(false)}
                 className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-primary hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all"
              >
                 Harika, Anladım!
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

const LoadingFallback = () => (
  <div className="flex h-screen w-full items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <span className="text-sm font-medium text-slate-500">Yükleniyor...</span>
    </div>
  </div>
);

function App() {
  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/apply/:token" element={<ApplicationForm />} />
              <Route path="/kvkk" element={<KVKK />} />
              <Route path="/gizlilik-politikasi" element={<PrivacyPolicy />} />
              <Route path="/kullanim-sartlari" element={<TermsOfService />} />

              {/* Dashboard Routes (Protected) */}
              <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                <Route index element={<ProtectedRoute allowedRoles={['owner', 'admin', 'dispatcher']}><DashboardHome /></ProtectedRoute>} />
                <Route path="vehicles" element={<ProtectedRoute allowedRoles={['owner', 'admin', 'dispatcher']}><Vehicles /></ProtectedRoute>} />
                <Route path="drivers" element={<ProtectedRoute allowedRoles={['owner', 'admin', 'dispatcher']}><Drivers /></ProtectedRoute>} />
                <Route path="students" element={<ProtectedRoute allowedRoles={['owner', 'admin', 'dispatcher']}><Students /></ProtectedRoute>} />
                <Route path="routes" element={<ProtectedRoute allowedRoles={['owner', 'admin', 'dispatcher']}><RoutesPage /></ProtectedRoute>} />
                <Route path="expenses" element={<ProtectedRoute allowedRoles={['owner', 'admin', 'accountant']}><Expenses /></ProtectedRoute>} />
                <Route path="payments" element={<ProtectedRoute allowedRoles={['owner', 'admin', 'accountant']}><Payments /></ProtectedRoute>} />
                <Route path="timesheets" element={<ProtectedRoute allowedRoles={['owner', 'admin', 'accountant']}><UniversalTimesheets /></ProtectedRoute>} />
                <Route path="settings" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><Settings /></ProtectedRoute>} />
              </Route>

              {/* Driver Routes (Protected) */}
              <Route path="/driver" element={<ProtectedRoute allowedRoles={['driver', 'owner', 'admin']}><DriverLayout /></ProtectedRoute>}>
                <Route index element={<DriverHome />} />
                <Route path="route/:id" element={<DriverRouteExecution />} />
              </Route>

              {/* Shared Route Viewer (Protected) */}
              <Route path="/share/route/:id" element={<ProtectedRoute allowedRoles={['driver', 'owner', 'admin']}><SharedRouteViewer /></ProtectedRoute>} />

              {/* Super Admin Routes */}
              <Route path="/superadmin" element={<ProtectedRoute><SuperAdminLayout /></ProtectedRoute>}>
                <Route index element={<SuperAdminDashboard />} />
                <Route path="companies" element={<CompaniesList />} />
                <Route path="admins" element={<AdminUsers />} />
                <Route path="logs" element={<AuditLogs />} />
                <Route path="settings" element={<PlatformSettings />} />
                <Route path="account" element={<SuperAdminAccount />} />
              </Route>

              {/* Print Route (Standalone) */}
              <Route path="/print-preview" element={<ProtectedRoute><PrintPreview /></ProtectedRoute>} />

              {/* Fallback Catch-All Route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </APIProvider>
  );
}

export default App;
