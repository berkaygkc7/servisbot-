import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { Bell, Search, User, Settings, LogOut, CheckCircle, Car, Map, UserSquare, X, Mail, Building, ShieldCheck, Settings2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const DashboardLayout: React.FC = () => {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();

    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    
    // Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{id: string, type: string, name: string}[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);

    const profileRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);

    const [showAccountModal, setShowAccountModal] = useState(false);

    // Mock Notifications with path
    const [notifications, setNotifications] = useState([
        { id: 1, title: 'Yeni Rota Oluşturuldu', desc: 'Ataşehir - Kadıköy rotası sisteme eklendi.', time: '5 dk önce', read: false, path: '/dashboard/routes' },
        { id: 2, title: 'Ödeme Alındı', desc: 'Ahmet Yılmaz velisinden 1.500 TL tahsil edildi.', time: '1 saat önce', read: false, path: '/dashboard/expenses' },
        { id: 3, title: 'Sistem Uyarısı', desc: 'Araç 34 ABC 123 sigorta süresi yaklaşıyor.', time: '3 saat önce', read: true, path: '/dashboard/vehicles' },
    ]);

    // Outside click handlers
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) setIsProfileOpen(false);
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) setIsNotifOpen(false);
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) setShowSearchResults(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle Search
    useEffect(() => {
        const fetchResults = async () => {
            if (!searchQuery || searchQuery.length < 1) {
                setSearchResults([]);
                return;
            }
            setIsSearching(true);
            try {
                // Mock search logic querying the tables (if available) or returning mock data
                let results: any[] = [];
                
                if (profile?.company_id && searchQuery.length > 1) {
                    // Students
                    const { data: students } = await supabase.from('students').select('id, full_name').eq('company_id', profile.company_id).ilike('full_name', `%${searchQuery}%`).limit(3);
                    if (students) students.forEach(s => results.push({ id: s.id, type: 'student', name: s.full_name }));

                    // Vehicles
                    const { data: vehicles } = await supabase.from('vehicles').select('id, plate_number').eq('company_id', profile.company_id).ilike('plate_number', `%${searchQuery}%`).limit(3);
                    if (vehicles) vehicles.forEach(v => results.push({ id: v.id, type: 'vehicle', name: v.plate_number }));

                    // Routes
                    const { data: routes } = await supabase.from('routes').select('id, name').eq('company_id', profile.company_id).ilike('name', `%${searchQuery}%`).limit(3);
                    if (routes) routes.forEach(r => results.push({ id: r.id, type: 'route', name: r.name }));
                }

                // Hardcoded menus for fast navigation
                const menus = [
                    { name: 'Panel', path: '/dashboard' },
                    { name: 'Öğrenciler', path: '/dashboard/students' },
                    { name: 'Araçlar', path: '/dashboard/vehicles' },
                    { name: 'Şoförler', path: '/dashboard/drivers' },
                    { name: 'Rotalar', path: '/dashboard/routes' },
                    { name: 'Giderler', path: '/dashboard/expenses' },
                    { name: 'Ödemeler', path: '/dashboard/payments' },
                    { name: 'Puantaj', path: '/dashboard/timesheets' },
                    { name: 'Ayarlar', path: '/dashboard/settings' },
                ];
                
                const queryLower = searchQuery.toLowerCase();
                menus.forEach((m, idx) => {
                    const nameLower = m.name.toLowerCase();
                    // Match if name includes the query OR if query matches initials
                    if (nameLower.includes(queryLower) || nameLower.startsWith(queryLower)) {
                        results.unshift({ id: `menu-${idx}`, type: 'menu', name: m.name, path: m.path });
                    }
                });

                // Deduplicate results
                results = results.filter((v,i,a)=>a.findIndex(v2=>(v2.id===v.id && v2.type===v.type))===i);

                setSearchResults(results);
                setShowSearchResults(true);
            } catch (err) {
                console.error(err);
            } finally {
                setIsSearching(false);
            }
        };

        const debounce = setTimeout(fetchResults, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery, profile?.company_id]);

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const handleSearchSelect = (res: any) => {
        setShowSearchResults(false);
        setSearchQuery('');
        
        if (res.type === 'menu' && res.path) {
            navigate(res.path);
            return;
        }

        // route based on type
        if (res.type === 'student') navigate('/dashboard/students');
        else if (res.type === 'vehicle') navigate('/dashboard/vehicles');
        else if (res.type === 'route') navigate('/dashboard/routes');
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="flex h-screen bg-background">
            <Sidebar />
            <main className="flex-1 ml-64 flex flex-col overflow-hidden relative">
                {/* Premium Glass Header */}
                <header className="h-20 glass-panel border-x-0 border-t-0 flex items-center justify-between px-8 z-40 sticky top-0 animate-fade-up">
                    
                    {/* SEARCH BAR */}
                    <div className="flex items-center gap-4 flex-1" ref={searchRef}>
                        <div className="relative w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    if (e.target.value.length > 0) setShowSearchResults(true);
                                }}
                                onClick={() => {
                                    if (searchQuery.length > 0) setShowSearchResults(true);
                                }}
                                placeholder="Öğrenci, araç veya rota arayın..." 
                                className="w-full pl-10 pr-10 py-2.5 bg-slate-100/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm text-slate-700"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <X size={16} />
                                </button>
                            )}

                            {/* SEARCH DROPDOWN */}
                            {showSearchResults && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-fade-up max-h-96 overflow-y-auto">
                                    {isSearching ? (
                                        <div className="p-4 text-center text-sm font-bold text-slate-500">Aranıyor...</div>
                                    ) : searchResults.length > 0 ? (
                                        <div className="space-y-1">
                                            {searchResults.map((res, i) => (
                                                <button 
                                                    key={`${res.type}-${res.id}-${i}`}
                                                    onClick={() => handleSearchSelect(res)}
                                                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-left"
                                                >
                                                    <div className={`p-2 rounded-lg ${res.type === 'menu' ? 'bg-purple-50 text-purple-600' : res.type === 'student' ? 'bg-blue-50 text-blue-600' : res.type === 'vehicle' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                        {res.type === 'menu' && <Settings size={16} />}
                                                        {res.type === 'student' && <UserSquare size={16} />}
                                                        {res.type === 'vehicle' && <Car size={16} />}
                                                        {res.type === 'route' && <Map size={16} />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-700">{res.name}</p>
                                                        <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                                                            {res.type === 'menu' ? 'Menü Sayfası' : res.type === 'student' ? 'Öğrenci' : res.type === 'vehicle' ? 'Araç' : 'Rota'}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-4 text-center text-sm font-bold text-slate-500">Sonuç bulunamadı</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-6 relative">
                        
                        {/* NOTIFICATIONS */}
                        <div ref={notifRef}>
                            <button 
                                onClick={() => setIsNotifOpen(!isNotifOpen)}
                                className={`relative p-2 transition-colors group rounded-xl ${isNotifOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50'}`}
                            >
                                <Bell size={22} className={!isNotifOpen ? "group-hover:animate-bounce" : ""} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                                )}
                            </button>

                            {/* NOTIF DROPDOWN */}
                            {isNotifOpen && (
                                <div className="absolute top-full right-0 md:right-16 mt-4 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-fade-up">
                                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                        <h3 className="font-bold text-slate-800">Bildirimler</h3>
                                        {unreadCount > 0 && (
                                            <button onClick={markAllRead} className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                                <CheckCircle size={14} /> Okundu İşaretle
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto">
                                        {notifications.map(n => (
                                            <div 
                                                key={n.id} 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsNotifOpen(false);
                                                    navigate(n.path);
                                                }}
                                                className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${!n.read ? 'bg-blue-50/30' : ''}`}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className={`text-sm font-semibold ${!n.read ? 'text-slate-800' : 'text-slate-600'}`}>{n.title}</p>
                                                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap ml-2">{n.time}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 line-clamp-2">{n.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* PROFILE */}
                        <div className="relative border-l border-slate-200 pl-6" ref={profileRef}>
                            <button 
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center gap-3 text-left group"
                            >
                                <div className="hidden md:block">
                                    <p className="text-sm font-bold text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">{profile?.full_name || 'Kullanıcı'}</p>
                                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{profile?.role || 'Admin'}</p>
                                </div>
                                <div className={`w-10 h-10 rounded-full border-2 shadow-sm flex items-center justify-center font-bold transition-all ${isProfileOpen ? 'bg-blue-600 text-white border-blue-200 ring-4 ring-blue-50' : 'bg-gradient-to-tr from-blue-100 to-indigo-100 text-blue-700 border-white group-hover:shadow-md'}`}>
                                    {profile?.full_name?.charAt(0) || 'U'}
                                </div>
                            </button>

                            {/* PROFILE DROPDOWN */}
                            {isProfileOpen && (
                                <div className="absolute top-full right-0 mt-4 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-fade-up">
                                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                                        <p className="text-sm font-bold text-slate-800 truncate">{profile?.full_name}</p>
                                        <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
                                    </div>
                                    <div className="p-2 space-y-1">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsProfileOpen(false);
                                                setShowAccountModal(true);
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                        >
                                            <User size={16} /> Hesabım
                                        </button>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsProfileOpen(false);
                                                navigate('/dashboard/settings');
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                        >
                                            <Settings size={16} /> Ayarlar
                                        </button>
                                    </div>
                                    <div className="p-2 border-t border-slate-100">
                                        <button 
                                            onClick={async () => {
                                                await signOut();
                                                navigate('/login');
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                        >
                                            <LogOut size={16} /> Çıkış Yap
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 animate-fade-up stagger-1">
                    <Outlet />
                </div>

                {/* ACCOUNT MODAL */}
                {showAccountModal && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 h-40 relative overflow-hidden">
                                {/* Decorative circles */}
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/20 rounded-full blur-xl"></div>
                                
                                <button 
                                    onClick={() => setShowAccountModal(false)}
                                    className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 p-2 rounded-full transition-colors z-10 backdrop-blur-sm"
                                >
                                    <X size={20} />
                                </button>
                                <div className="absolute -bottom-12 left-8">
                                    <div className="w-24 h-24 rounded-full border-4 border-white bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center shadow-xl relative">
                                        <span className="text-4xl font-black text-blue-700">{profile?.full_name?.charAt(0) || 'U'}</span>
                                        <div className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-500 border-2 border-white rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="pt-16 pb-8 px-8">
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{profile?.full_name}</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md">{profile?.role}</span>
                                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                Aktif
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3 hover:shadow-md transition-shadow">
                                        <div className="p-2 bg-white rounded-xl shadow-sm text-blue-500">
                                            <Mail size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">E-Posta Adresi</p>
                                            <p className="text-sm font-semibold text-slate-700 break-all">{profile?.email}</p>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3 hover:shadow-md transition-shadow">
                                        <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-500">
                                            <Building size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Bağlı Şirket</p>
                                            <p className="text-sm font-semibold text-slate-700">{profile?.companies?.company_name || 'Yok'}</p>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3 hover:shadow-md transition-shadow md:col-span-2">
                                        <div className="p-2 bg-white rounded-xl shadow-sm text-emerald-500">
                                            <ShieldCheck size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Hesap İzinleri</p>
                                            <p className="text-sm font-semibold text-slate-700">Tüm sistem modüllerine tam erişim yetkisi</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => {
                                        setShowAccountModal(false);
                                        navigate('/dashboard/settings');
                                    }}
                                    className="w-full bg-gradient-to-r from-slate-900 to-slate-800 hover:from-blue-600 hover:to-indigo-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 group"
                                >
                                    <Settings2 size={18} className="group-hover:rotate-45 transition-transform" />
                                    Hesap Ayarlarına Git
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};

export default DashboardLayout;
