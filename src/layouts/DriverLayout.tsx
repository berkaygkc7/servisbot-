import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, MapPin, User, ChevronLeft } from 'lucide-react';

const DriverLayout: React.FC = () => {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const goBack = () => {
        navigate(-1);
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            {/* Top Navigation Bar */}
            <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
                <div className="px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {window.location.pathname !== '/driver' && (
                            <button onClick={goBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
                                <ChevronLeft size={24} />
                            </button>
                        )}
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">ServisBot</h1>
                            <p className="text-xs text-slate-500 font-medium truncate max-w-[150px]">
                                {profile?.companies?.company_name || 'Şoför Paneli'}
                            </p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleLogout}
                        className="p-2 rounded-full hover:bg-red-50 text-red-500 transition-colors"
                        title="Çıkış Yap"
                    >
                        <LogOut size={22} />
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-md mx-auto bg-slate-50/50 relative overflow-x-hidden">
                <Outlet />
            </main>
            
            {/* Optional Bottom Tab Navigation for Future */}
            <nav className="bg-white border-t border-slate-200 pb-safe pt-2 px-6 flex justify-around items-center sticky bottom-0 z-50">
                <button onClick={() => navigate('/driver')} className="flex flex-col items-center gap-1 p-2 text-blue-600">
                    <MapPin size={24} />
                    <span className="text-[10px] font-bold">Rotalarım</span>
                </button>
                <button className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-600">
                    <User size={24} />
                    <span className="text-[10px] font-bold">Profil</span>
                </button>
            </nav>
        </div>
    );
};

export default DriverLayout;
