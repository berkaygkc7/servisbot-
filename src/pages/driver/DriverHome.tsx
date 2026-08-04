import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Map, Users, ChevronRight, Loader2, AlertCircle } from 'lucide-react';

interface RouteItem {
    id: string;
    name: string;
    status: string;
    vehicle_plate: string;
    student_count: number;
}

const DriverHome: React.FC = () => {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const [routes, setRoutes] = useState<RouteItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchDriverRoutes();
        }
    }, [user]);

    const fetchDriverRoutes = async () => {
        setLoading(true);
        try {
            // Find if this user is linked to a 'drivers' table entry via name
            const { data: driverMatch } = await supabase
                .from('drivers')
                .select('id')
                .eq('full_name', profile?.full_name || '')
                .single();
            
            const targetDriverId = driverMatch ? driverMatch.id : user?.id;

            // 1. Find vehicles assigned to this driver
            const { data: vehicles, error: vError } = await supabase
                .from('vehicles')
                .select('id, plate_number')
                .or(`driver_id.eq.${targetDriverId},driver_id.eq.${user?.id}`);

            if (vError) throw vError;

            if (!vehicles || vehicles.length === 0) {
                setRoutes([]);
                setLoading(false);
                return;
            }

            const vehicleIds = vehicles.map(v => v.id);

            // 2. Find routes for these vehicles
            const { data: routesData, error: rError } = await supabase
                .from('routes')
                .select('id, name, status, vehicle_id')
                .in('vehicle_id', vehicleIds)
                .eq('status', 'active');

            if (rError) throw rError;

            // 3. Find student count for each route
            const enrichedRoutes = await Promise.all((routesData || []).map(async (route) => {
                const { count } = await supabase
                    .from('route_students')
                    .select('*', { count: 'exact', head: true })
                    .eq('route_id', route.id);
                
                const vehicle = vehicles.find(v => v.id === route.vehicle_id);

                return {
                    id: route.id,
                    name: route.name,
                    status: route.status,
                    vehicle_plate: vehicle?.plate_number || '',
                    student_count: count || 0
                };
            }));

            setRoutes(enrichedRoutes);
        } catch (error) {
            console.error('Error fetching driver routes:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full pt-20">
                <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
                <p className="text-slate-500 font-medium">Rotalarınız yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="p-4 pb-24">
            <h2 className="text-2xl font-black text-slate-800 mb-6 mt-4">Hoş Geldiniz, {profile?.full_name?.split(' ')[0]}</h2>
            
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Aktif Rotalarınız</h3>
            
            {routes.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="text-slate-400" size={32} />
                    </div>
                    <p className="text-lg font-bold text-slate-800 mb-2">Aktif Rota Yok</p>
                    <p className="text-sm text-slate-500">Şu anda size atanmış aktif bir rota bulunmuyor.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {routes.map(route => (
                        <button 
                            key={route.id}
                            onClick={() => navigate(`/driver/route/${route.id}`)}
                            className="w-full text-left bg-white rounded-2xl p-4 border border-slate-200 shadow-sm active:scale-[0.98] transition-transform flex items-center justify-between group"
                        >
                            <div>
                                <h4 className="text-lg font-bold text-slate-800 mb-1">{route.name}</h4>
                                <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                                    <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                                        <Map size={14} />
                                        {route.vehicle_plate}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Users size={14} />
                                        {route.student_count} Öğrenci
                                    </span>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                <ChevronRight size={24} />
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DriverHome;
