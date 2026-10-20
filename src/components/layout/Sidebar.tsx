import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Bus,
    Users,
    Map,
    Settings,
    LogOut,
    UserCheck,
    Wallet,
    CreditCard,
    Layers,
    ShieldAlert,
    FileText
} from 'lucide-react';
import logo from '../../assets/servisbot_bus_logo.webp';
import { useAuth } from '../../contexts/AuthContext';
import { preloadRoute } from '../../utils/routePreloader';

const Sidebar: React.FC = () => {
    const { signOut, profile } = useAuth();
    const navigate = useNavigate();
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const navItems = [
        { 
            icon: LayoutDashboard, 
            label: 'Panel', 
            path: '/dashboard', 
            allowedRoles: ['owner', 'admin', 'dispatcher'],
            iconColor: 'text-blue-400',
            badgeBg: 'bg-blue-500/15 group-hover:bg-blue-500/25',
        },
        { 
            icon: Bus, 
            label: 'Araçlar', 
            path: '/dashboard/vehicles', 
            allowedRoles: ['owner', 'admin', 'dispatcher'],
            iconColor: 'text-amber-400',
            badgeBg: 'bg-amber-500/15 group-hover:bg-amber-500/25',
        },
        { 
            icon: UserCheck, 
            label: 'Şoförler', 
            path: '/dashboard/drivers', 
            allowedRoles: ['owner', 'admin', 'dispatcher'],
            iconColor: 'text-emerald-400',
            badgeBg: 'bg-emerald-500/15 group-hover:bg-emerald-500/25',
        },
        { 
            icon: Users, 
            label: 'Öğrenciler', 
            path: '/dashboard/students', 
            allowedRoles: ['owner', 'admin', 'dispatcher'],
            iconColor: 'text-cyan-400',
            badgeBg: 'bg-cyan-500/15 group-hover:bg-cyan-500/25',
        },
        { 
            icon: FileText, 
            label: 'Sözleşmeler', 
            path: '/dashboard/contracts', 
            allowedRoles: ['owner', 'admin', 'dispatcher', 'accountant'],
            iconColor: 'text-purple-400',
            badgeBg: 'bg-purple-500/15 group-hover:bg-purple-500/25',
        },
        { 
            icon: Map, 
            label: 'Rotalar', 
            path: '/dashboard/routes', 
            allowedRoles: ['owner', 'admin', 'dispatcher'],
            iconColor: 'text-rose-400',
            badgeBg: 'bg-rose-500/15 group-hover:bg-rose-500/25',
        },
        { 
            icon: CreditCard, 
            label: 'Ödemeler', 
            path: '/dashboard/payments', 
            allowedRoles: ['owner', 'admin', 'accountant'],
            iconColor: 'text-indigo-400',
            badgeBg: 'bg-indigo-500/15 group-hover:bg-indigo-500/25',
        },
        { 
            icon: Wallet, 
            label: 'Gelir / Giderler', 
            path: '/dashboard/expenses', 
            allowedRoles: ['owner', 'admin', 'accountant'],
            iconColor: 'text-teal-400',
            badgeBg: 'bg-teal-500/15 group-hover:bg-teal-500/25',
        },
        { 
            icon: Layers, 
            label: 'Puantaj', 
            path: '/dashboard/timesheets', 
            allowedRoles: ['owner', 'admin', 'accountant'],
            iconColor: 'text-violet-400',
            badgeBg: 'bg-violet-500/15 group-hover:bg-violet-500/25',
        },
        { 
            icon: Settings, 
            label: 'Ayarlar', 
            path: '/dashboard/settings', 
            allowedRoles: ['owner', 'admin'],
            iconColor: 'text-slate-300',
            badgeBg: 'bg-slate-700/40 group-hover:bg-slate-600/40',
        },
    ];

    const filteredNavItems = navItems.filter(item => {
        const userRole = profile?.role || 'admin'; // fallback to admin if not specified
        return item.allowedRoles.includes(userRole);
    });

    const handleLogoutConfirm = async () => {
        await signOut();
        setShowLogoutModal(false);
        navigate('/');
    };

    return (
        <div className="h-screen w-64 glass-panel-dark text-white flex flex-col fixed left-0 top-0 z-50 transition-all duration-300 select-none">
            {/* Logo Area */}
            <div className="flex flex-col items-center justify-center py-4 px-2 border-b border-slate-800">
                <img src={logo} alt="ServisBot Admin Logo" className="w-[140px] h-auto object-contain opacity-90" />
            </div>

            {/* Company Info */}
            <div className="px-6 py-5 border-b border-slate-700/30 bg-slate-800/20 backdrop-blur-sm mx-2 mt-2 rounded-xl">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-blue-500/40 ring-1 ring-white/20 relative group overflow-hidden">
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        {profile?.companies?.logo_url ? (
                            <img src={profile.companies.logo_url} alt="Firma Logo" className="w-full h-full object-cover relative z-10" />
                        ) : (
                            <span className="relative z-10">{profile?.companies?.company_name?.charAt(0) || 'C'}</span>
                        )}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[15px] font-bold truncate text-white tracking-wide">
                            {profile?.companies?.company_name || 'Yükleniyor...'}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                            <span className="text-[11px] font-medium text-slate-400 truncate uppercase tracking-wider">
                                {profile?.role === 'owner' ? 'Firma Sahibi' : profile?.role || 'Yetkili'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1.5 custom-scrollbar">
                {filteredNavItems.map((item, index) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/dashboard'}
                        onMouseEnter={() => preloadRoute(item.path)}
                        onFocus={() => preloadRoute(item.path)}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative outline-none select-none ${
                                isActive
                                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 text-white shadow-lg shadow-blue-600/35 ring-1 ring-white/20'
                                    : 'text-slate-200 hover:text-white hover:bg-slate-800/80 border border-transparent hover:border-slate-700/50 hover:translate-x-1 font-medium'
                            }`
                        }
                        style={{ animationDelay: `${index * 30}ms` }}
                    >
                        {({ isActive }) => (
                            <>
                                <div
                                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 shrink-0 ${
                                        isActive
                                            ? 'bg-white/20 text-white shadow-inner ring-1 ring-white/30'
                                            : `${item.badgeBg} ${item.iconColor} ring-1 ring-white/10 group-hover:scale-110 group-hover:ring-white/20`
                                    }`}
                                >
                                    <item.icon size={19} className="transition-transform duration-200" />
                                </div>
                                <span className={`text-[13.5px] tracking-wide transition-colors ${
                                    isActive ? 'text-white font-bold' : 'text-slate-200 group-hover:text-white font-semibold'
                                }`}>
                                    {item.label}
                                </span>
                                {isActive && (
                                    <div className="ml-auto w-1.5 h-4 bg-white/80 rounded-full shadow-sm animate-pulse"></div>
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* User Profile / Logout */}
            <div className="p-3.5 border-t border-slate-800/60 bg-slate-900/40 space-y-1.5">
                {profile?.is_superadmin && (
                    <button
                        onClick={() => navigate('/superadmin')}
                        className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-amber-300 hover:text-amber-200 hover:bg-amber-500/15 border border-amber-500/20 hover:border-amber-500/40 hover:translate-x-1 transition-all duration-200 group font-bold outline-none"
                    >
                        <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-all duration-200 ring-1 ring-amber-500/30">
                            <ShieldAlert size={19} className="group-hover:scale-110 transition-transform duration-200" />
                        </div>
                        <span className="text-[13.5px] font-semibold">Süper Admin</span>
                    </button>
                )}
                
                <button
                    onClick={() => setShowLogoutModal(true)}
                    className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-slate-300 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 hover:translate-x-1 transition-all duration-200 group font-medium outline-none"
                >
                    <div className="w-9 h-9 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center shrink-0 group-hover:bg-red-500/20 group-hover:scale-110 transition-all duration-200 ring-1 ring-red-500/20">
                        <LogOut size={19} className="group-hover:rotate-12 transition-transform duration-200" />
                    </div>
                    <span className="text-[13.5px] font-semibold">Çıkış Yap</span>
                </button>
            </div>

            {/* Logout Confirmation Modal */}
            {showLogoutModal && createPortal(
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl shadow-slate-200/50 border border-slate-100 text-slate-900 relative">
                        <h3 className="text-lg font-bold mb-2">Çıkış Yap</h3>
                        <p className="text-slate-600 text-sm mb-6">
                            Hesabınızdan çıkış yapmak istediğinize emin misiniz?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowLogoutModal(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleLogoutConfirm}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                            >
                                Çıkış Yap
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Sidebar;

