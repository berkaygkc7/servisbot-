import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LogOut,
    ShieldAlert
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
            label: 'Panel', 
            path: '/dashboard', 
            allowedRoles: ['owner', 'admin', 'dispatcher'],
        },
        { 
            label: 'Araçlar', 
            path: '/dashboard/vehicles', 
            allowedRoles: ['owner', 'admin', 'dispatcher'],
        },
        { 
            label: 'Şoförler', 
            path: '/dashboard/drivers', 
            allowedRoles: ['owner', 'admin', 'dispatcher'],
        },
        { 
            label: 'Öğrenciler', 
            path: '/dashboard/students', 
            allowedRoles: ['owner', 'admin', 'dispatcher'],
        },
        { 
            label: 'Sözleşmeler', 
            path: '/dashboard/contracts', 
            allowedRoles: ['owner', 'admin', 'dispatcher', 'accountant'],
        },
        { 
            label: 'Rotalar', 
            path: '/dashboard/routes', 
            allowedRoles: ['owner', 'admin', 'dispatcher'],
        },
        { 
            label: 'Ödemeler', 
            path: '/dashboard/payments', 
            allowedRoles: ['owner', 'admin', 'accountant'],
        },
        { 
            label: 'Gelir / Giderler', 
            path: '/dashboard/expenses', 
            allowedRoles: ['owner', 'admin', 'accountant'],
        },
        { 
            label: 'Puantaj', 
            path: '/dashboard/timesheets', 
            allowedRoles: ['owner', 'admin', 'accountant'],
        },
        { 
            label: 'Ayarlar', 
            path: '/dashboard/settings', 
            allowedRoles: ['owner', 'admin'],
        },
    ];

    const filteredNavItems = navItems.filter(item => {
        const userRole = profile?.role || 'admin';
        return item.allowedRoles.includes(userRole);
    });

    const handleLogoutConfirm = async () => {
        await signOut();
        setShowLogoutModal(false);
        navigate('/');
    };

    return (
        <div className="h-screen w-64 bg-gradient-to-b from-[#0a101f] via-[#0b1329] to-[#080d1a] border-r border-slate-800/80 text-white flex flex-col fixed left-0 top-0 z-50 transition-all duration-300 select-none overflow-hidden shadow-2xl">
            {/* Ambient subtle glow at top */}
            <div className="absolute top-0 left-0 right-0 h-28 bg-blue-600/5 blur-2xl pointer-events-none" />

            {/* Logo Area */}
            <div className="flex items-center justify-center h-14 px-4 border-b border-slate-800/70 shrink-0 relative z-10">
                <img src={logo} alt="ServisBot Admin Logo" className="h-7 w-auto object-contain brightness-105 opacity-95" />
            </div>

            {/* Company Info */}
            <div className="mx-3 my-2 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800/70 shrink-0 flex items-center gap-2.5 relative z-10">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-bold text-white text-xs shadow-sm ring-1 ring-white/10 shrink-0 overflow-hidden">
                    {profile?.companies?.logo_url ? (
                        <img src={profile.companies.logo_url} alt="Firma Logo" className="w-full h-full object-cover" />
                    ) : (
                        <span>{profile?.companies?.company_name?.charAt(0) || 'C'}</span>
                    )}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[13px] font-semibold truncate text-slate-200 leading-tight">
                        {profile?.companies?.company_name || 'Yükleniyor...'}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                            {profile?.role === 'owner' ? 'Firma Sahibi' : profile?.role || 'Yetkili'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-2.5 py-1.5 space-y-0.5 relative z-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {filteredNavItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/dashboard'}
                        onMouseEnter={() => preloadRoute(item.path)}
                        onFocus={() => preloadRoute(item.path)}
                        className={({ isActive }) =>
                            `flex items-center justify-between px-3.5 py-2 rounded-lg transition-all duration-150 select-none group relative outline-none ${
                                isActive
                                    ? 'bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/25 shadow-sm shadow-blue-950/40'
                                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40 border border-transparent font-medium'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <span className="text-[13.5px] tracking-wide truncate">
                                    {item.label}
                                </span>
                                {isActive && (
                                    <div className="w-1.5 h-3.5 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(96,165,250,0.6)] shrink-0"></div>
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* User Profile / Logout */}
            <div className="p-2.5 border-t border-slate-800/70 bg-[#080d1a]/70 shrink-0 space-y-1 relative z-10">
                {profile?.is_superadmin && (
                    <button
                        onClick={() => navigate('/superadmin')}
                        className="flex items-center justify-between px-3 py-2 w-full rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/30 text-[13px] font-semibold transition-all duration-150 group outline-none"
                    >
                        <span className="truncate">Süper Admin Paneli</span>
                        <ShieldAlert size={15} className="shrink-0 text-amber-400 group-hover:scale-110 transition-transform" />
                    </button>
                )}
                
                <button
                    onClick={() => setShowLogoutModal(true)}
                    className="flex items-center justify-between px-3 py-2 w-full rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 text-[13px] font-medium transition-all duration-150 group outline-none"
                >
                    <span>Çıkış Yap</span>
                    <LogOut size={15} className="text-slate-500 group-hover:text-rose-400 group-hover:translate-x-0.5 transition-all duration-150 shrink-0" />
                </button>
            </div>

            {/* Logout Confirmation Modal */}
            {showLogoutModal && createPortal(
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-white relative animate-fade-up">
                        <h3 className="text-lg font-bold mb-2 text-white">Çıkış Yap</h3>
                        <p className="text-slate-400 text-sm mb-6 font-normal">
                            Hesabınızdan çıkış yapmak istediğinize emin misiniz?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowLogoutModal(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleLogoutConfirm}
                                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors shadow-lg shadow-rose-600/30"
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

