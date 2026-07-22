import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, LogOut, ArrowLeft, Users, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';

const SuperAdminLayout = () => {
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!user) {
        setIsSuperAdmin(false);
        return;
      }
      const { data, error } = await supabase
        .from('users')
        .select('is_superadmin')
        .eq('id', user.id)
        .single();
        
      if (error || !data?.is_superadmin) {
        setIsSuperAdmin(false);
      } else {
        setIsSuperAdmin(true);
      }
    };
    checkSuperAdmin();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (isSuperAdmin === null) {
    return <div className="flex h-screen items-center justify-center">Yükleniyor...</div>;
  }

  if (isSuperAdmin === false) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4 text-center">
        <h2 className="mb-4 text-2xl font-bold text-slate-800">Yetkisiz Erişim</h2>
        <p className="mb-6 text-slate-600">Bu sayfayı görüntüleme yetkiniz yok.</p>
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white hover:bg-blue-600">
          <ArrowLeft className="h-5 w-5" />
          Panele Dön
        </button>
      </div>
    );
  }

  const navigation = [
    { name: 'Genel Bakış', href: '/superadmin', icon: LayoutDashboard },
    { name: 'Şirketler', href: '/superadmin/companies', icon: Building2 },
    { name: 'Yöneticiler', href: '/superadmin/admins', icon: Users },
    { name: 'Sistem Ayarları', href: '/superadmin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-10">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <span className="text-xl font-bold text-white tracking-tight">
            ServisBot <span className="text-blue-500">Admin</span>
          </span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || (location.pathname.startsWith(item.href) && item.href !== '/superadmin');
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-slate-200">
                {profile?.full_name?.charAt(0) || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">
                {profile?.full_name || 'Admin'}
              </p>
              <p className="text-xs text-slate-400 truncate">Süper Admin</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Çıkış Yap
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
