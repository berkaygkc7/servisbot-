import React, { useState, useEffect, useCallback } from 'react';
import { Users, Bus, Map as MapIcon, AlertCircle, X, MapPin, Maximize, Minimize } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import StatsCard from '../components/dashboard/StatsCard';
import MapScene from '../components/map/MapScene';
import TodaysRoutes from '../components/dashboard/TodaysRoutes';
import FinancialReports from '../components/dashboard/FinancialReports';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const DashboardHome: React.FC = () => {
    const [activeView, setActiveView] = useState<'map' | 'routes'>('map');
    const [markers, setMarkers] = useState<{ id: string; position: [number, number]; title: string; type?: 'vehicle' | 'stop' | 'student_home' }[]>([]);
    const [students, setStudents] = useState<any[]>([]); // Store raw student data
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
    const [availableTags, setAvailableTags] = useState<{ id: string; name: string }[]>([]);
    const [activeTagFilter, setActiveTagFilter] = useState<string[]>([]);
    const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
    const [activeSchoolFilter, setActiveSchoolFilter] = useState<'all' | string>('all');
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [routes, setRoutes] = useState<any[]>([]);
    const [routesGeoJson, setRoutesGeoJson] = useState<any>(null);
    const [fitBoundsTrigger, setFitBoundsTrigger] = useState<number>(0);

    const [stats, setStats] = useState({
        students: 0,
        vehicles: 0,
        routes: 0,
        activeRoutes: 0
    });
    const [isMapFullscreen, setIsMapFullscreen] = useState(false);

    useEffect(() => {
        fetchStats();
        fetchVehicles();
        fetchStudents();
        fetchTags();
        fetchSchools();
        fetchRoutesData();

        const channel = supabase
            .channel('public:vehicles')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'vehicles' },
                (payload) => {
                    updateMarker(payload.new);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchStats = async () => {
        const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
        const { count: vehicleCount } = await supabase.from('vehicles').select('*', { count: 'exact', head: true });
        const { count: routeCount } = await supabase.from('routes').select('*', { count: 'exact', head: true });
        const { count: activeRouteCount } = await supabase.from('routes').select('*', { count: 'exact', head: true }).eq('status', 'active');

        setStats({
            students: studentCount || 0,
            vehicles: vehicleCount || 0,
            routes: routeCount || 0,
            activeRoutes: activeRouteCount || 0
        });
    };

    const fetchTags = async () => {
        const { data } = await supabase.from('tags').select('id, name').order('name');
        if (data) setAvailableTags(data);
    };

    const fetchSchools = async () => {
        const { data } = await supabase.from('schools').select('id, name').order('name');
        if (data) setSchools(data);
    };

    const fetchVehicles = async () => {
        const { data } = await supabase.from('vehicles').select('*');
        if (data) setVehicles(data);
    };

    const fetchStudents = async () => {
        const { data } = await supabase.from('students').select('*, schools(name), vehicles(plate_number)');
        if (data) setStudents(data);
    };

    const fetchRoutesData = async () => {
        const { data } = await supabase
            .from('routes')
            .select(`
                id,
                name,
                geometry,
                tags,
                schools (name),
                student_route_assignments ( student_id )
            `);

        if (data) setRoutes(data);
    };

    // Derived Markers
    useEffect(() => {
        const studentMarkers = students
            .filter((s: any) => {
                const hasPosition = s.home_latitude && s.home_longitude;
                const matchesTags = activeTagFilter.length === 0 ||
                    (s.tags && activeTagFilter.some(tag => s.tags?.includes(tag)));
                const matchesSchool = activeSchoolFilter === 'all' || s.schools?.name === schools.find(sch => sch.id === activeSchoolFilter)?.name;
                return hasPosition && matchesTags && matchesSchool;
            })
            .map((s: any) => ({
                id: s.id,
                position: [s.home_longitude, s.home_latitude] as [number, number],
                title: s.full_name,
                type: 'student_home' as const
            }));

        const vehicleMarkers = vehicles
            .filter((v: any) => v.current_latitude && v.current_longitude)
            .map((v: any) => ({
                id: v.plate_number,
                position: [v.current_longitude, v.current_latitude] as [number, number],
                title: v.plate_number,
                type: 'vehicle' as const
            }));

        setMarkers([...studentMarkers, ...vehicleMarkers]);
    }, [students, vehicles, activeTagFilter, activeSchoolFilter, schools]);

    // Trigger bounds fit on school filter change or initial load
    useEffect(() => {
        // Only trigger if we have some data
        if (students.length > 0 || vehicles.length > 0 || routes.length > 0) {
            // A slight delay ensures markers are computed and Map is ready
            const timeoutId = setTimeout(() => {
                setFitBoundsTrigger(prev => prev + 1);
            }, 300);
            return () => clearTimeout(timeoutId);
        }
    }, [activeSchoolFilter, students.length, routes.length]);

    // Derived Route GeoJSON for Tag Highlighting
    useEffect(() => {
        if (routes.length === 0) {
            setRoutesGeoJson(null);
            return;
        }

        const ROUTE_COLORS = [
            '#3b82f6', // Blue
            '#10b981', // Emerald
            '#8b5cf6', // Purple
            '#f59e0b', // Amber
            '#ec4899', // Pink
            '#06b6d4', // Cyan
            '#f43f5e', // Rose
            '#14b8a6'  // Teal
        ];

        const features = routes.flatMap((route, index) => {
            if (!route.geometry) return [];

            let isHighlighted = true;
            let matchesFilters = true;

            if (activeTagFilter.length > 0 || activeSchoolFilter !== 'all') {
                let routeMatchesTags = true;
                let routeMatchesSchool = true;

                if (activeSchoolFilter !== 'all') {
                    const selectedSchoolName = schools.find(sch => sch.id === activeSchoolFilter)?.name;
                    routeMatchesSchool = route.schools?.name === selectedSchoolName;
                }

                if (activeTagFilter.length > 0) {
                    routeMatchesTags = route.tags && activeTagFilter.some((tag: string) => route.tags?.includes(tag));
                }

                matchesFilters = !!(routeMatchesTags && routeMatchesSchool);
            }

            if (!matchesFilters) return [];

            const color = ROUTE_COLORS[index % ROUTE_COLORS.length];

            return {
                type: 'Feature',
                geometry: route.geometry,
                properties: {
                    id: route.id,
                    name: route.name,
                    isHighlighted,
                    color
                }
            };
        });

        // Only show routes if there is an active tag filter to avoid map clutter by default,
        // unless you want all routes visible constantly. Let's show all, but highlighted ones stand out.
        // Map Scene uses '路线geoJson'
        if (features.length > 0) {
            setRoutesGeoJson({
                type: 'FeatureCollection',
                features
            });
        } else {
            setRoutesGeoJson(null);
        }
    }, [routes, students, activeTagFilter, activeSchoolFilter, schools]);

    const [hoveredRouteId, setHoveredRouteId] = useState<string | null>(null);
    const [hoverPosition, setHoverPosition] = useState<[number, number] | null>(null);

    const handleRouteHover = useCallback((routeId: string | null, position: [number, number] | null) => {
        setHoveredRouteId(routeId);
        setHoverPosition(position);
    }, []);

    const navigate = useNavigate();

    const handleRouteClickFromMap = useCallback((routeId: string) => {
        // Navigate to the routes page with this route selected
        navigate(`/dashboard/routes?id=${routeId}`);
    }, [navigate]);

    const updateMarker = (vehicle: any) => {
        if (!vehicle.current_latitude || !vehicle.current_longitude) return;

        setMarkers(prev => {
            const exists = prev.find(m => m.id === vehicle.plate_number);
            if (exists) {
                return prev.map(m => m.id === vehicle.plate_number ? {
                    ...m,
                    position: [vehicle.current_longitude, vehicle.current_latitude] as [number, number]
                } : m);
            } else {
                return [...prev, {
                    id: vehicle.plate_number,
                    position: [vehicle.current_longitude, vehicle.current_latitude] as [number, number],
                    title: vehicle.plate_number,
                    type: 'vehicle'
                }];
            }
        });
    };

    const { profileError, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-slate-600 font-medium tracking-wide">Yükleniyor...</p>
                </div>
            </div>
        );
    }

    if (profileError) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
                <div className="max-w-md w-full premium-card p-8 border border-red-100 text-center animate-fade-up">
                    <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Sistem Hatası</h2>
                    <p className="text-slate-600 mb-6">{profileError}</p>
                    <div className="space-y-3">
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 transition-all"
                        >
                            Tekrar Dene
                        </button>
                        <Link to="/register" className="block text-sm text-primary font-medium">
                            Başka Bir Hesapla Kayıt Ol
                        </Link>
                    </div>
                    <p className="mt-6 text-xs text-slate-400">
                        Profiliniz veritabanında bulunamadı veya yetki sorunu var. Supabase'deki SQL politikalarını güncellediğinizden emin olun.
                    </p>
                </div>
            </div>
        );
    }
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Genel Bakış</h1>
                    <p className="text-slate-500">Hoşgeldin, Yönetici</p>
                </div>
                <div className="flex gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                            onClick={() => setActiveView('map')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeView === 'map' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <MapIcon size={16} /> <span>Harita</span>
                        </button>
                        <button
                            onClick={() => setActiveView('routes')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeView === 'routes' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Bus size={16} /> <span>Bugünkü Rotalar</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Horizontal Slider */}
            <div className="flex overflow-x-auto gap-6 pb-2 snap-x snap-mandatory custom-scrollbar min-w-full hide-scrollbar">
                <div className="min-w-[85%] sm:min-w-[45%] lg:min-w-[24%] snap-center shrink-0">
                    <StatsCard
                        title="Toplam Öğrenci"
                        value={stats.students.toString()}
                        icon={Users}
                        trend="0%"
                        color="bg-blue-50"
                        iconColor="text-blue-500"
                    />
                </div>
                <div className="min-w-[85%] sm:min-w-[45%] lg:min-w-[24%] snap-center shrink-0">
                    <StatsCard
                        title="Aktif Araç"
                        value={stats.vehicles.toString()}
                        icon={Bus}
                        trend="0"
                        color="bg-emerald-50"
                        iconColor="text-emerald-500"
                    />
                </div>
                <div className="min-w-[85%] sm:min-w-[45%] lg:min-w-[24%] snap-center shrink-0">
                    <StatsCard
                        title="Günlük Rota"
                        value={stats.routes.toString()}
                        icon={MapIcon}
                        trend="0%"
                        color="bg-indigo-50"
                        iconColor="text-indigo-500"
                    />
                </div>
                <div className="min-w-[85%] sm:min-w-[45%] lg:min-w-[24%] snap-center shrink-0 pr-6">
                    <StatsCard
                        title="Aktif Rota"
                        value={stats.activeRoutes.toString()}
                        icon={AlertCircle}
                        trendUp={true}
                        trend="0"
                        color="bg-purple-50"
                        iconColor="text-purple-500"
                    />
                </div>
            </div>

            {/* Content Area - Toggled View */}
            {activeView === 'map' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
                    <div className={`lg:col-span-2 premium-card overflow-hidden relative transition-all duration-300 animate-fade-up ${isMapFullscreen ? 'fixed inset-0 z-[100] h-screen w-screen rounded-none m-0' : 'h-[700px]'
                        }`}>
                        <div className="absolute top-4 left-4 z-40 flex items-center gap-2 pointer-events-none">
                            <div className="pointer-events-auto bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-sm border border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-2 h-10">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                Canlı Harita
                            </div>

                            <button
                                onClick={() => setIsMapFullscreen(!isMapFullscreen)}
                                className="pointer-events-auto px-3 rounded-lg shadow-sm border backdrop-blur-md transition-all duration-300 flex items-center justify-center h-10 gap-2 bg-white/90 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                                title={isMapFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran Yap"}
                            >
                                {isMapFullscreen ? <Minimize size={16} className="text-blue-600" /> : <Maximize size={16} className="text-blue-600" />}
                            </button>
                        </div>

                        {/* Removed Tag Filter UI from Map Overlay */}
                        <MapScene
                            className="w-full h-full"
                            markers={markers}
                            routesGeoJson={routesGeoJson}
                            center={undefined}
                            fitBoundsTrigger={fitBoundsTrigger}
                            onRouteHover={handleRouteHover}
                            onRouteClick={handleRouteClickFromMap}
                            onMarkerClick={(id, type) => {
                                if (type === 'student_home') {
                                    const student = students.find(s => s.id === id);
                                    if (student) setSelectedStudent(student);
                                }
                            }}
                        />

                        {/* Route Hover Info Popup */}
                        {hoveredRouteId && hoverPosition && routes.find(r => r.id === hoveredRouteId) && (
                            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-blue-100 flex items-center gap-3 z-50 pointer-events-none animate-in fade-in zoom-in duration-200">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                    <MapIcon size={16} className="animate-pulse" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">
                                        {routes.find(r => r.id === hoveredRouteId)?.name}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Student Detail Popup / Card */}
                        {selectedStudent && (
                            <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-72 bg-white rounded-xl shadow-2xl border border-slate-100 p-3 animate-in slide-in-from-bottom-5 duration-200 z-50 flex flex-col max-h-[60vh]">
                                <div className="flex justify-between items-start mb-2 shrink-0">
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-sm leading-tight">{selectedStudent.full_name}</h3>
                                        <p className="text-[10px] text-slate-500 mt-0.5 font-medium">{selectedStudent.school_name || selectedStudent.schools?.name || 'Okul Yok'}</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedStudent(null)}
                                        className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>

                                <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1 flex-1 text-xs">
                                    {/* Bilgiler (Kompakt) */}
                                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center"><span className="text-slate-500">Sınıf:</span><span className="font-bold text-slate-700">{selectedStudent.grade || '-'}</span></div>
                                            <div className="flex justify-between items-center"><span className="text-slate-500">Kan:</span><span className="font-bold text-red-600">{selectedStudent.blood_group || '-'}</span></div>
                                            <div className="flex justify-between items-center"><span className="text-slate-500">Alerji:</span><span className="font-bold text-amber-600">{selectedStudent.allergies || 'Yok'}</span></div>
                                            <div className="flex justify-between items-center"><span className="text-slate-500">Veli:</span><span className="font-bold text-slate-700">{selectedStudent.parent_name || '-'}</span></div>
                                            <div className="flex justify-between items-center"><span className="text-slate-500">Tel:</span><a href={`tel:${selectedStudent.parent_phone}`} className="font-bold text-blue-600 hover:underline">{selectedStudent.parent_phone || '-'}</a></div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <div className="flex items-start gap-1.5 mb-1.5">
                                            <MapPin size={12} className="shrink-0 text-red-500 mt-0.5" />
                                            <span className="text-[10px] leading-tight text-slate-600 italic">
                                                {selectedStudent.address || `Konum: ${selectedStudent.home_latitude?.toFixed(4)}, ${selectedStudent.home_longitude?.toFixed(4)}`}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1 mb-1.5">
                                            {selectedStudent.tags && selectedStudent.tags.length > 0 ? selectedStudent.tags.map((tag: string, idx: number) => (
                                                <span key={idx} className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                                                    {tag}
                                                </span>
                                            )) : <span className="text-[9px] text-slate-400 italic">Etiket Yok</span>}
                                        </div>
                                        <div className="flex items-center justify-between border-t border-slate-200/50 pt-1.5 mt-1.5">
                                            <span className="text-slate-500 text-[10px]">Araç:</span>
                                            <span className="font-bold text-blue-700 text-xs">{selectedStudent.vehicles?.plate_number || 'Atanmadı'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar Filters */}
                    <div className="premium-card p-6 h-[700px] overflow-y-auto custom-scrollbar flex flex-col gap-6 animate-fade-up stagger-1">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                                <MapIcon size={18} className="text-secondary" />
                                Harita Filtreleri
                            </h3>
                            <p className="text-xs text-slate-500 mb-6">Haritadaki rotaları ve öğrencileri filtreleyin. Eşleşen rotalar renkli olarak vurgulanacaktır.</p>

                            {/* School Filter */}
                            <div className="space-y-3 mb-6">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Okul Filtresi</label>
                                <select
                                    value={activeSchoolFilter}
                                    onChange={(e) => setActiveSchoolFilter(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all"
                                >
                                    <option value="all">Tüm Okullar</option>
                                    {schools.map(school => (
                                        <option key={school.id} value={school.id}>{school.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Tag Filter (New Home) */}
                            {availableTags.length > 0 && (
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Etiket Filtresi</label>
                                    <div className="flex flex-wrap gap-2">
                                        {availableTags.map(tag => {
                                            const isSelected = activeTagFilter.includes(tag.name);
                                            return (
                                                <button
                                                    key={tag.id}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setActiveTagFilter(prev => prev.filter(t => t !== tag.name));
                                                        } else {
                                                            setActiveTagFilter(prev => [...prev, tag.name]);
                                                        }
                                                    }}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${isSelected
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100'
                                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                                        }`}
                                                >
                                                    {tag.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {activeTagFilter.length > 0 && (
                                        <button
                                            onClick={() => setActiveTagFilter([])}
                                            className="text-[10px] text-blue-600 font-bold hover:underline mt-2"
                                        >
                                            Filtreleri Temizle
                                        </button>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            ) : (
                /* Today's Routes Overview Full View */
                <TodaysRoutes />
            )
            }

            {/* Financial and Statistics Reports */}
            <FinancialReports />

        </div >
    );
};

export default DashboardHome;
