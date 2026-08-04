// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { MapPin, Phone, CheckCircle, XCircle, Clock, User, AlertCircle, ArrowLeft } from 'lucide-react';
import MapScene from '../../components/map/MapScene';

interface StudentAttendance {
    id: string; // assignment id
    student_id: string;
    student_name: string;
    parent_phone: string;
    address: string;
    status: 'pending' | 'boarded' | 'absent';
    stop_name: string;
    latitude?: number;
    longitude?: number;
}

const DriverRouteExecution: React.FC = () => {
    const { id: routeId } = useParams<{ id: string }>();
    const { user, profile } = useAuth();
    
    const [routeName, setRouteName] = useState('');
    const [students, setStudents] = useState<StudentAttendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        if (routeId) {
            fetchRouteDetails();
        }
    }, [routeId]);

    const fetchRouteDetails = async () => {
        setLoading(true);
        try {
            // 1. Fetch Route Name
            const { data: routeData } = await supabase
                .from('routes')
                .select('name')
                .eq('id', routeId)
                .single();
            
            if (routeData) setRouteName(routeData.name);

            // 2. Fetch Students on this route
            const { data: routeStudents, error: rsError } = await supabase
                .from('route_students')
                .select('student_id')
                .eq('route_id', routeId);
            
            if (rsError) throw rsError;

            if (!routeStudents || routeStudents.length === 0) {
                setStudents([]);
                setLoading(false);
                return;
            }

            const studentIds = routeStudents.map(rs => rs.student_id);

            const { data: studentsData, error: sError } = await supabase
                .from('students')
                .select('id, full_name, parent_phone, address')
                .in('id', studentIds);

            if (sError) throw sError;

            // 3. Fetch today's attendance records
            const today = new Date().toISOString().split('T')[0];
            const { data: attendanceData, error: aError } = await supabase
                .from('attendance_records')
                .select('*')
                .eq('route_id', routeId)
                .eq('date', today);
            
            if (aError) throw aError;

            // Merge data
            const mergedStudents: StudentAttendance[] = (studentsData || []).map(student => {
                const record = attendanceData?.find(a => a.student_id === student.id);
                return {
                    id: student.id,
                    full_name: student.full_name,
                    parent_phone: student.parent_phone,
                    address: student.address,
                    status: record?.status || 'pending',
                    record_id: record?.id
                };
            });

            // Sort: Pending first, then alphabetically
            mergedStudents.sort((a, b) => {
                if (a.status === 'pending' && b.status !== 'pending') return -1;
                if (a.status !== 'pending' && b.status === 'pending') return 1;
                return a.full_name.localeCompare(b.full_name);
            });

            setStudents(mergedStudents);

        } catch (error) {
            console.error('Error fetching route execution data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAttendance = async (studentId: string, status: 'present' | 'absent', recordId?: string) => {
        setUpdatingId(studentId);
        try {
            const today = new Date().toISOString().split('T')[0];
            
            if (recordId) {
                // Update existing record
                const { error } = await supabase
                    .from('attendance_records')
                    .update({ status, driver_id: user?.id })
                    .eq('id', recordId);
                
                if (error) throw error;
            } else {
                // Insert new record
                const { data, error } = await supabase
                    .from('attendance_records')
                    .insert([{
                        company_id: profile?.company_id,
                        route_id: routeId,
                        student_id: studentId,
                        driver_id: user?.id,
                        date: today,
                        status: status
                    }])
                    .select()
                    .single();
                
                if (error) throw error;
                recordId = data.id;
            }

            // Update local state and move marked items to bottom
            setStudents(prev => {
                const updated = prev.map(s => {
                    if (s.id === studentId) {
                        return { ...s, status, record_id: recordId };
                    }
                    return s;
                });
                
                return updated.sort((a, b) => {
                    if (a.status === 'pending' && b.status !== 'pending') return -1;
                    if (a.status !== 'pending' && b.status === 'pending') return 1;
                    return a.full_name.localeCompare(b.full_name);
                });
            });

        } catch (error) {
            console.error('Error marking attendance:', error);
            alert('Yoklama kaydedilirken bir hata oluştu.');
        } finally {
            setUpdatingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full pt-20">
                <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
                <p className="text-slate-500 font-medium">Öğrenci listesi yükleniyor...</p>
            </div>
        );
    }

    const pendingCount = students.filter(s => s.status === 'pending').length;
    const presentCount = students.filter(s => s.status === 'present').length;
    const absentCount = students.filter(s => s.status === 'absent').length;

    return (
        <div className="p-4 pb-24">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-6 mt-2 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                <h2 className="text-xl font-black text-slate-800 mb-1">{routeName}</h2>
                <p className="text-sm text-slate-500 font-medium">{new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                
                <div className="flex justify-around mt-4 pt-4 border-t border-slate-100">
                    <div className="text-center">
                        <p className="text-2xl font-black text-slate-800">{students.length}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Toplam</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-black text-green-500">{presentCount}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Binen</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-black text-red-500">{absentCount}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Gelmedi</p>
                    </div>
                </div>
            </div>
            
            {pendingCount === 0 && students.length > 0 && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 flex items-center justify-center gap-2 font-bold animate-in fade-in zoom-in">
                    <CheckCircle size={20} />
                    Yoklama Tamamlandı!
                </div>
            )}

            <div className="space-y-3">
                {students.map(student => (
                    <div 
                        key={student.id} 
                        className={`bg-white rounded-2xl p-4 border shadow-sm transition-all duration-300 ${
                            student.status === 'present' ? 'border-green-200 bg-green-50/30 opacity-80' : 
                            student.status === 'absent' ? 'border-red-200 bg-red-50/30 opacity-80' : 
                            'border-slate-200 shadow-md'
                        }`}
                    >
                        <div className="flex items-start gap-3 mb-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                student.status === 'present' ? 'bg-green-100 text-green-600' :
                                student.status === 'absent' ? 'bg-red-100 text-red-600' :
                                'bg-blue-50 text-blue-600'
                            }`}>
                                <User size={20} />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-base font-bold text-slate-800">{student.full_name}</h4>
                                <div className="text-xs text-slate-500 mt-1 flex flex-col gap-1">
                                    {student.address && (
                                        <span className="flex items-center gap-1"><MapPin size={12} /> <span className="truncate max-w-[200px]">{student.address}</span></span>
                                    )}
                                    {student.parent_phone && (
                                        <a href={`tel:${student.parent_phone}`} className="flex items-center gap-1 text-blue-500 font-medium">
                                            <Phone size={12} /> {student.parent_phone}
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                disabled={updatingId === student.id}
                                onClick={() => handleMarkAttendance(student.id, 'present', student.record_id)}
                                className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                                    student.status === 'present' 
                                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' 
                                        : 'bg-slate-50 text-slate-600 hover:bg-green-50 hover:text-green-600 border border-slate-200 hover:border-green-200'
                                }`}
                            >
                                {updatingId === student.id && student.status !== 'present' ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle size={18} /> Bindi
                                    </>
                                )}
                            </button>
                            
                            <button
                                disabled={updatingId === student.id}
                                onClick={() => handleMarkAttendance(student.id, 'absent', student.record_id)}
                                className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                                    student.status === 'absent' 
                                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' 
                                        : 'bg-slate-50 text-slate-600 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200'
                                }`}
                            >
                                {updatingId === student.id && student.status !== 'absent' ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <>
                                        <XCircle size={18} /> Gelmedi
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ))}
                
                {students.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                        <p>Bu rotaya kayıtlı öğrenci bulunamadı.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DriverRouteExecution;
