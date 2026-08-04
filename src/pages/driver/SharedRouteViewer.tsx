// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import MapScene from '../../components/map/MapScene';
import { Loader2, Navigation, ArrowLeft, User, Phone, MapPin } from 'lucide-react';

export const SharedRouteViewer: React.FC = () => {
    const { id: routeId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [routeData, setRouteData] = useState<any>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [stops, setStops] = useState<any[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    
    useEffect(() => {
        if (routeId) fetchRouteData();
    }, [routeId]);

    const fetchRouteData = async () => {
        setLoading(true);
        try {
            // Fetch Route & Stops
            const { data: route } = await supabase
                .from('routes')
                .select('*, route_stops(*)')
                .eq('id', routeId)
                .single();
                
            if (!route) throw new Error('Route not found');
            
            // Fetch students assigned to this route
            const { data: routeStudents } = await supabase
                .from('route_students')
                .select('student_id, stop_id')
                .eq('route_id', routeId);
                
            const studentIds = routeStudents?.map(rs => rs.student_id) || [];
            
            let studentsData: any[] = [];
            if (studentIds.length > 0) {
                const { data } = await supabase
                    .from('students')
                    .select('id, full_name, parent_phone, address, home_latitude, home_longitude')
                    .in('id', studentIds);
                studentsData = data || [];
            }

            setRouteData(route);
            setStops(route.route_stops || []);
            setStudents(studentsData);
        } catch (error) {
            console.error('Error fetching shared route:', error);
            alert('Rota bulunamadı veya erişim yetkiniz yok.');
        } finally {
            setLoading(false);
        }
    };

    const getMarkers = () => {
        const markers: any[] = [];
        
        // Add Students
        students.forEach(s => {
            if (s.home_latitude && s.home_longitude) {
                markers.push({
                    id: s.id,
                    position: [Number(s.home_longitude), Number(s.home_latitude)],
                    title: s.full_name,
                    type: 'student_home',
                    studentData: s // Pass data for popup
                });
            }
        });

        return markers;
    };

    const handleStartNavigation = () => {
        if (!stops || stops.length < 2) return;
        
        const sortedStops = [...stops].sort((a, b) => a.order_index - b.order_index);
        const origin = sortedStops[0];
        const dest = sortedStops[sortedStops.length - 1];
        const waypoints = sortedStops.slice(1, -1);
        
        let mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${dest.latitude},${dest.longitude}`;
        
        if (waypoints.length > 0) {
            const wpString = waypoints.map(wp => `${wp.latitude},${wp.longitude}`).join('|');
            mapsUrl += `&waypoints=${wpString}`;
        }
        mapsUrl += `&travelmode=driving`;
        
        window.open(mapsUrl, '_blank');
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
                <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
                <p className="text-slate-500 font-medium">Harita yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-slate-50 relative overflow-hidden">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 pt-safe flex items-center justify-between shadow-sm">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div className="text-center flex-1">
                    <h1 className="text-lg font-bold text-slate-800">{routeData?.name}</h1>
                    <p className="text-xs text-slate-500 font-medium">{students.length} Öğrenci</p>
                </div>
                <div className="w-10"></div> {/* Spacer for centering */}
            </div>

            {/* Map */}
            <div className="flex-1 w-full relative">
                <MapScene 
                    className="w-full h-full"
                    markers={getMarkers()}
                    onMarkerClick={(id) => setSelectedStudentId(String(id))}
                    onMapClick={() => setSelectedStudentId(null)}
                    routeGeoJson={routeData?.geometry ? {
                        type: 'Feature',
                        geometry: routeData.geometry,
                        properties: {}
                    } : null}
                />
            </div>

            {/* Student Popup Card */}
            {selectedStudentId && (
                <div className="absolute bottom-[100px] left-4 right-4 z-20 animate-in slide-in-from-bottom-4 fade-in">
                    <div className="bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] p-4 flex items-center justify-between border border-blue-100">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                <User size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">
                                    {students.find(s => s.id === selectedStudentId)?.full_name}
                                </h3>
                                <p className="text-sm text-slate-500 font-medium flex items-center gap-1">
                                    <MapPin size={14} className="text-slate-400" />
                                    {students.find(s => s.id === selectedStudentId)?.address || 'Adres bilgisi yok'}
                                </p>
                            </div>
                        </div>
                        {students.find(s => s.id === selectedStudentId)?.parent_phone && (
                            <a 
                                href={`tel:${students.find(s => s.id === selectedStudentId)?.parent_phone}`}
                                className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center hover:bg-green-200 transition-colors"
                            >
                                <Phone size={20} />
                            </a>
                        )}
                    </div>
                </div>
            )}

            {/* Bottom Action Bar */}
            <div className="absolute bottom-0 left-0 right-0 z-10 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.1)] p-4 pb-safe rounded-t-3xl border-t border-slate-100">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4"></div>
                <p className="text-sm text-slate-500 text-center mb-4">
                    Haritadaki pimlere tıklayarak öğrenci isimlerini görebilirsiniz.
                </p>
                <button
                    onClick={handleStartNavigation}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-600/30"
                >
                    <Navigation size={24} />
                    Google Haritalar'da Başlat
                </button>
            </div>
        </div>
    );
};

export default SharedRouteViewer;
