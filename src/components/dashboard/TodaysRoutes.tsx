import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Map as MapIcon, Users, AlertCircle, Filter, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Student {
    id: string;
    full_name: string;
    absent_dates?: string[];
    grade?: string;
    blood_group?: string;
    allergies?: string;
    parent_name?: string;
    parent_phone?: string;
    address?: string;
    home_latitude?: number;
    home_longitude?: number;
    tags?: string[];
    schools?: { name: string };
    vehicles?: { plate_number: string };
}





interface ProcessedRoute {
    id: string;
    name: string;
    status: string;
    plate: string;
    schoolName: string;
    tags: string[];
    totalStudents: number;
    presentStudents: number;
    absentStudentsList: Student[];
    time: string;
}

const TodaysRoutes: React.FC = () => {
    const { profile } = useAuth();
    const companyId = profile?.company_id;
    const [routes, setRoutes] = useState<ProcessedRoute[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAbsentStudent, setSelectedAbsentStudent] = useState<Student | null>(null);

    // Filters
    const [plateFilter, setPlateFilter] = useState('');
    const [schoolFilter, setSchoolFilter] = useState('');
    const [tagFilter, setTagFilter] = useState('');
    const [timeFilter, setTimeFilter] = useState('');

    useEffect(() => {
        if (companyId) {
            fetchTodaysRoutes();

            // Realtime Subscriptions for Students and Routes
            const todaysRoutesChannel = supabase
                .channel(`public:todays_routes_channel`)
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'students', filter: `company_id=eq.${companyId}` },
                    (payload) => {
                        console.log('Öğrenci bilgisi değişti, Rota listesi güncelleniyor...', payload.new);
                        fetchTodaysRoutes(); // Refresh the list
                    }
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'routes', filter: `company_id=eq.${companyId}` },
                    (payload) => {
                        console.log('Rota bilgisi değişti, Rota listesi güncelleniyor...', payload);
                        fetchTodaysRoutes(); // Refresh on route edit/add/delete
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(todaysRoutesChannel);
            };
        }
    }, [companyId]);

    const fetchTodaysRoutes = async () => {
        setLoading(true);

        // Using local timezone string format YYYY-MM-DD
        const getLocalDateString = (date: Date) => {
            const offset = date.getTimezoneOffset();
            const adjusted = new Date(date.getTime() - (offset * 60 * 1000));
            return adjusted.toISOString().split('T')[0];
        };
        const todayDate = getLocalDateString(new Date());

        const { data, error } = await supabase
            .from('routes')
            .select(`
                id,
                name,
                status,
                tags,
                time,
                schools ( name ),
                vehicles ( plate_number ),
                student_route_assignments (
                    students ( 
                        id, full_name, absent_dates, grade, blood_group, allergies, 
                        parent_name, parent_phone, address, home_latitude, home_longitude, tags,
                        schools ( name ), vehicles ( plate_number )
                    )
                )
            `)
            .eq('company_id', companyId);

        if (error) {
            console.error('Error fetching routes:', error);
            setLoading(false);
            return;
        }

        const processed: ProcessedRoute[] = (data || []).map((route: any) => {
            // Unify pickup and dropoff if same student is assigned twice, so we use a Set or map by ID
            const uniqueStudentsMap = new Map<string, Student>();

            if (route.student_route_assignments) {
                route.student_route_assignments.forEach((assignment: any) => {
                    const student = assignment.students;
                    if (student && !uniqueStudentsMap.has(student.id)) {
                        uniqueStudentsMap.set(student.id, student);
                    }
                });
            }

            const allStudents = Array.from(uniqueStudentsMap.values());

            const absentStudentsList: Student[] = allStudents.filter(s => {
                if (!s.absent_dates || !Array.isArray(s.absent_dates)) return false;
                // PostgreSQL date string is usually YYYY-MM-DD, matching exactly against our local todayDate
                return s.absent_dates.includes(todayDate);
            }) as Student[];

            return {
                id: route.id,
                name: route.name,
                status: route.status,
                plate: route.vehicles?.plate_number || 'Araç Yok',
                schoolName: route.schools?.name || 'Okul Yok',
                tags: route.tags || [],
                time: route.time,
                totalStudents: allStudents.length,
                presentStudents: allStudents.length - absentStudentsList.length,
                absentStudentsList
            };
        });

        // Optional: Filter to only show active or pending routes? Let's show all for "Today"
        setRoutes(processed);
        setLoading(false);
    };

    // Filter Logic
    const filteredRoutes = routes.filter((route: ProcessedRoute) => {
        const matchPlate = plateFilter === '' || route.plate === plateFilter;
        const matchSchool = schoolFilter === '' || route.schoolName === schoolFilter;
        const matchTag = tagFilter === '' || route.tags.includes(tagFilter);

        // Zaman filtresi için artık veritabanındaki "time" sütununu kullanıyoruz
        const matchTime = timeFilter === '' || (route.time && route.time === timeFilter);

        return matchPlate && matchSchool && matchTag && matchTime;
    });

    // Unique values for dropdowns
    const uniquePlates: string[] = Array.from(new Set(routes.map((r: ProcessedRoute) => r.plate))).filter(p => p !== 'Araç Yok') as string[];
    const uniqueSchools: string[] = Array.from(new Set(routes.map((r: ProcessedRoute) => r.schoolName))).filter(s => s !== 'Okul Yok') as string[];
    const uniqueTags: string[] = Array.from(new Set(routes.flatMap((r: ProcessedRoute) => r.tags))) as string[];
    const uniqueTimes: string[] = Array.from(new Set(routes.map((r: ProcessedRoute) => r.time))).filter(t => t).sort() as string[];

    if (loading) {
        return (
            <div className="premium-card p-6 shadow-sm animate-pulse">
                <div className="h-6 w-48 bg-slate-200 rounded mb-4"></div>
                <div className="flex gap-4 overflow-hidden">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="min-w-[280px] h-32 bg-slate-100 rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (routes.length === 0) {
        return null;
    }

    return (
        <div className="premium-card overflow-hidden mb-8 h-[700px] flex flex-col animate-fade-up">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <MapIcon size={24} className="text-primary" />
                            Bugünkü Rotalar
                            <span className="bg-blue-100 text-blue-700 text-xs py-1 px-3 rounded-full ml-2 font-bold">Harita Yerine Tam Ekran Görünümü</span>
                        </h2>
                        <p className="text-slate-500 mt-2 text-sm">Bugün gerçekleşecek tüm rotalarınızı filtreleyin ve öğrencilerin durumunu inceleyin.</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                        <Filter size={16} className="text-slate-400" />
                        <span className="text-sm font-bold text-slate-600 border-r border-slate-200 pr-3 mr-1">{filteredRoutes.length} Rota Bulundu</span>
                        {(plateFilter || schoolFilter || tagFilter || timeFilter) && (
                            <button
                                onClick={() => { setPlateFilter(''); setSchoolFilter(''); setTagFilter(''); setTimeFilter(''); }}
                                className="text-xs text-red-500 hover:text-red-700 font-bold ml-1 flex items-center gap-1"
                            >
                                <X size={12} /> Temizle
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Okul Filtresi */}
                    <select
                        value={schoolFilter}
                        onChange={(e) => setSchoolFilter(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none font-medium"
                    >
                        <option value="">🏫 Tüm Okullar</option>
                        {uniqueSchools.map((school: string) => (
                            <option key={school} value={school}>{school}</option>
                        ))}
                    </select>

                    {/* Plaka Filtresi */}
                    <select
                        value={plateFilter}
                        onChange={(e) => setPlateFilter(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none font-medium"
                    >
                        <option value="">🚐 Tüm Araçlar (Plaka)</option>
                        {uniquePlates.map((plate: string) => (
                            <option key={plate} value={plate}>{plate}</option>
                        ))}
                    </select>

                    {/* Etiket Filtresi */}
                    <select
                        value={tagFilter}
                        onChange={(e) => setTagFilter(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none font-medium"
                    >
                        <option value="">🏷️ Tüm Etiketler</option>
                        {uniqueTags.map((tag: string) => (
                            <option key={tag} value={tag}>{tag}</option>
                        ))}
                    </select>

                    {/* Saat/Vakit Filtresi */}
                    <select
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none font-medium"
                    >
                        <option value="">⌚ Tüm Vakitler</option>
                        {uniqueTimes.map((time: string) => (
                            <option key={time} value={time}>⌚ {time}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredRoutes.map((route: ProcessedRoute) => {
                        const hasAbsents = route.absentStudentsList && route.absentStudentsList.length > 0;
                        const isRouteActive = route.status === 'active';

                        return (
                            <div
                                key={route.id}
                                className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col shadow-sm hover:shadow-md hover:border-blue-300 transition-all group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                                        <span className="font-bold text-slate-700 text-sm tracking-wide">{route.plate}</span>
                                    </div>
                                    <div className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${isRouteActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {isRouteActive ? 'Yolda' : 'Bekliyor'}
                                    </div>
                                </div>

                                <div className="flex items-start gap-2 mb-4">
                                    <h3 className="font-bold text-slate-800 text-lg line-clamp-2 flex-1" title={route.name}>{route.name}</h3>
                                    {route.time && (
                                        <div className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded border border-blue-100 shrink-0">
                                            {route.time}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-auto">
                                    <div className="flex items-center justify-between mb-2 mt-2">
                                        <div className="flex items-center gap-1.5 text-sm text-slate-600 font-bold">
                                            <Users size={16} className="text-slate-400" />
                                            <span>{route.presentStudents} / {route.totalStudents} Katılım</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium bg-slate-100 border border-slate-200 px-2 py-1 rounded truncate max-w-[120px]" title={route.schoolName}>
                                            🏫 {route.schoolName}
                                        </div>
                                    </div>

                                    {/* Progress indicator */}
                                    <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden border border-slate-200/50">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${hasAbsents ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                            style={{ width: route.totalStudents > 0 ? `${(route.presentStudents / route.totalStudents) * 100}%` : '0%' }}
                                        ></div>
                                    </div>

                                    {/* Absent Display System Directly On Card */}
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 h-[100px] overflow-y-auto custom-scrollbar">
                                        {hasAbsents ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-1.5 text-red-600 text-xs font-bold mb-2 pb-2 border-b border-red-100">
                                                    <AlertCircle size={14} />
                                                    <span>{route.absentStudentsList.length} GELMEYECEK</span>
                                                </div>
                                                {route.absentStudentsList.map((student: Student) => (
                                                    <div
                                                        key={student.id}
                                                        className="flex items-center gap-2 cursor-pointer hover:bg-red-50 p-1 rounded transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedAbsentStudent(student);
                                                        }}
                                                    >
                                                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></div>
                                                        <span className="text-sm font-medium text-slate-700 line-clamp-1 group-hover/absent:text-red-700">{student.full_name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                                                <Users size={24} className="mb-2" />
                                                <span className="text-xs font-bold uppercase tracking-wider">Tüm Öğrenciler Tam</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {filteredRoutes.length === 0 && (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400">
                            <MapIcon size={48} className="mb-4 text-slate-300" />
                            <h3 className="text-lg font-bold text-slate-600">Aramanıza Uygun Rota Bulunamadı</h3>
                            <p className="text-sm mt-1">Farklı filtreler kullanarak tekrar deneyin.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Absent Student Detail Modal */}
            {selectedAbsentStudent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start p-5 border-b border-slate-100/60 bg-red-50/50 relative">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-red-100/50 rounded-bl-full -mr-6 -mt-6"></div>
                            <div className="relative z-10 w-full">
                                <h3 className="font-bold text-slate-800 text-lg leading-tight w-11/12">{selectedAbsentStudent.full_name}</h3>
                                <p className="text-xs font-bold text-red-600 mt-1 flex items-center gap-1"><AlertCircle size={14} /> Bugün Gelmeyecek</p>
                            </div>
                            <button
                                onClick={() => setSelectedAbsentStudent(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-colors relative z-10"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* İletişim */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Veli İletişimi</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 font-medium">Veli Adı</span>
                                        <span className="font-bold text-slate-800">{selectedAbsentStudent.parent_name || 'Bilinmiyor'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 font-medium">Telefon</span>
                                        {selectedAbsentStudent.parent_phone ? (
                                            <a href={`tel:${selectedAbsentStudent.parent_phone}`} className="font-bold text-blue-600 hover:underline">
                                                {selectedAbsentStudent.parent_phone}
                                            </a>
                                        ) : (
                                            <span className="text-slate-400 font-medium">-</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Detaylar */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Öğrenci Bilgileri</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 font-medium">Okul</span>
                                        <span className="font-bold text-slate-700">{selectedAbsentStudent.schools?.name || 'Okul Yok'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 font-medium">Sınıf</span>
                                        <span className="font-bold text-slate-700">{selectedAbsentStudent.grade || '-'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 font-medium">Kan Grubu</span>
                                        <span className="font-bold text-red-600">{selectedAbsentStudent.blood_group || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedAbsentStudent(null)}
                                className="w-full py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors mt-2"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TodaysRoutes;
