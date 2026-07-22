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
    ClipboardList,
    Layers
} from 'lucide-react';
import logo from '../../assets/servisbot_bus_logo.png';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar: React.FC = () => {
    const { signOut, profile } = useAuth();
    const navigate = useNavigate();
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const navItems = [
        { icon: LayoutDashboard, label: 'Panel', path: '/dashboard', allowedRoles: ['owner', 'admin', 'dispatcher'] },
        { icon: Bus, label: 'Araçlar', path: '/dashboard/vehicles', allowedRoles: ['owner', 'admin', 'dispatcher'] },
        { icon: UserCheck, label: 'Şoförler', path: '/dashboard/drivers', allowedRoles: ['owner', 'admin', 'dispatcher'] },
        { icon: Users, label: 'Öğrenciler', path: '/dashboard/students', allowedRoles: ['owner', 'admin', 'dispatcher'] },
        { icon: Map, label: 'Rotalar', path: '/dashboard/routes', allowedRoles: ['owner', 'admin', 'dispatcher'] },
        { icon: CreditCard, label: 'Ödemeler', path: '/dashboard/payments', allowedRoles: ['owner', 'admin', 'accountant'] },
        { icon: Wallet, label: 'Giderler', path: '/dashboard/expenses', allowedRoles: ['owner', 'admin', 'accountant'] },
        { icon: ClipboardList, label: 'Puantaj', path: '/dashboard/timesheets', allowedRoles: ['owner', 'admin', 'accountant'] },
        { icon: Layers, label: 'Evrensel Puantaj', path: '/dashboard/universal-timesheets', allowedRoles: ['owner', 'admin', 'accountant'] },
        { icon: Settings, label: 'Ayarlar', path: '/dashboard/settings', allowedRoles: ['owner', 'admin'] },
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
        <div className="h-screen w-64 glass-panel-dark text-white flex flex-col fixed left-0 top-0 z-50 transition-all duration-300">
            {/* Logo Area */}
            <div className="flex flex-col items-center justify-center py-4 px-2 border-b border-slate-800">
                <img src={logo} alt="ServisBot Admin Logo" className="w-[140px] h-auto object-contain opacity-90" />
            </div>

            {/* Company Info */}
            <div className="px-6 py-5 border-b border-slate-700/30 bg-slate-800/20 backdrop-blur-sm mx-2 mt-2 rounded-xl">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-blue-500/40 ring-1 ring-white/20 relative group overflow-hidden">
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        <span className="relative z-10">{profile?.companies?.company_name?.charAt(0) || 'C'}</span>
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
            <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 custom-scrollbar">
                {filteredNavItems.map((item, index) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/dashboard'}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group animate-fade-up ${
                                isActive
                                    ? 'bg-gradient-to-r from-blue-600/90 to-indigo-600/90 text-white shadow-lg shadow-blue-900/40 ring-1 ring-white/10'
                                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white hover:translate-x-1'
                            }`
                        }
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon size={20} className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110 group-hover:text-blue-400'}`} />
                                <span className="font-semibold text-sm tracking-wide">{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* User Profile / Logout */}
            <div className="p-4 border-t border-slate-800/50 bg-slate-900/30">
                <button
                    onClick={() => setShowLogoutModal(true)}
                    className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-400 hover:bg-red-500/20 hover:text-red-400 hover:translate-x-1 transition-all duration-300 group"
                >
                    <LogOut size={20} className="group-hover:rotate-12 transition-transform duration-300" />
                    <span className="font-semibold text-sm">Çıkış Yap</span>
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

