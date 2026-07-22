import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Hero from './components/home/Hero';
import FeatureSection from './components/home/FeatureSection';
import MobileAppShowcase from './components/home/MobileAppShowcase';
import Pricing from './components/home/Pricing';
import Footer from './components/layout/Footer';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import Vehicles from './pages/Vehicles';
import Students from './pages/Students';
import RoutesPage from './pages/RoutesPage';
import Drivers from './pages/Drivers';
import Settings from './pages/Settings';
import Expenses from './pages/Expenses';
import Payments from './pages/Payments';
import Timesheets from './pages/Timesheets';
import UniversalTimesheets from './pages/UniversalTimesheets';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ApplicationForm from './pages/public/ApplicationForm';

// Super Admin
import SuperAdminLayout from './layouts/SuperAdminLayout';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import CompaniesList from './pages/superadmin/CompaniesList';
import AdminUsers from './pages/superadmin/AdminUsers';
import PlatformSettings from './pages/superadmin/PlatformSettings';

import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
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
      <FeatureSection />
      <MobileAppShowcase />
      <Pricing />
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

function App() {
  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/apply/:token" element={<ApplicationForm />} />

            {/* Dashboard Routes (Protected) */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<ProtectedRoute allowedRoles={['owner', 'admin', 'dispatcher']}><DashboardHome /></ProtectedRoute>} />
              <Route path="vehicles" element={<ProtectedRoute allowedRoles={['owner', 'admin', 'dispatcher']}><Vehicles /></ProtectedRoute>} />
              <Route path="drivers" element={<ProtectedRoute allowedRoles={['owner', 'admin', 'dispatcher']}><Drivers /></ProtectedRoute>} />
              <Route path="students" element={<ProtectedRoute allowedRoles={['owner', 'admin', 'dispatcher']}><Students /></ProtectedRoute>} />
              <Route path="routes" element={<ProtectedRoute allowedRoles={['owner', 'admin', 'dispatcher']}><RoutesPage /></ProtectedRoute>} />
              <Route path="expenses" element={<ProtectedRoute allowedRoles={['owner', 'admin', 'accountant']}><Expenses /></ProtectedRoute>} />
              <Route path="payments" element={<ProtectedRoute allowedRoles={['owner', 'admin', 'accountant']}><Payments /></ProtectedRoute>} />
              <Route path="timesheets" element={<ProtectedRoute allowedRoles={['owner', 'admin', 'accountant']}><Timesheets /></ProtectedRoute>} />
              <Route path="universal-timesheets" element={<ProtectedRoute allowedRoles={['owner', 'admin', 'accountant']}><UniversalTimesheets /></ProtectedRoute>} />
              <Route path="settings" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><Settings /></ProtectedRoute>} />
            </Route>

            {/* Super Admin Routes */}
            <Route path="/superadmin" element={<ProtectedRoute><SuperAdminLayout /></ProtectedRoute>}>
              <Route index element={<SuperAdminDashboard />} />
              <Route path="companies" element={<CompaniesList />} />
              <Route path="admins" element={<AdminUsers />} />
              <Route path="settings" element={<PlatformSettings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </APIProvider>
  );
}

export default App;
