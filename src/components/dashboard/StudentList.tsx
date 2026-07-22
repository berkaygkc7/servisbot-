import React from 'react';
import { Edit, Trash2, MapPin, Eye, Users } from 'lucide-react';

export interface Student {
    id: string;
    full_name: string;
    parent_phone: string;
    parent_name?: string;
    school_id?: string;
    school_name?: string;
    grade?: string;
    schoolLevel?: 'primary' | 'middle' | 'high';
    route_status?: 'assigned' | 'unassigned';
    vehicle_id?: string;
    vehicle_plate?: string;
    location?: string;
    coordinates?: [number, number];
    address?: string;
    blood_group?: string;
    allergies?: string;
    registration_date?: string;
    status?: 'active' | 'inactive' | 'pending';
    tags?: string[];
    custom_price?: number | null;
    driver_name?: string;
    login_token?: string;

    // UI helpers
    name: string;
    parent: string;
    phone: string;
    school: string;
}

interface StudentListProps {
    students: Student[];
    onEdit: (student: Student) => void;
    onDelete: (id: string) => void;
    onShowLocation: (student: Student) => void;
    onShowDetails: (student: Student) => void;
    onShowQr: (student: Student) => void;
    onAddSibling: (student: Student) => void;
    onApprove?: (student: Student) => void;
    onReject?: (student: Student) => void;
}

const StudentList: React.FC<StudentListProps> = ({ 
    students, onEdit, onDelete, onShowLocation, onShowDetails, onShowQr, onAddSibling, onApprove, onReject 
}) => {

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="p-4 font-semibold text-slate-600 text-sm">Öğrenci Adı</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm">Veli & İletişim</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm">Okul / Kurum</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm">Servis Aracı</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm text-right">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {students.map((student) => (
                            <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="p-4">
                                    <div className="font-medium text-slate-800">{student.name}</div>
                                    {student.tags && student.tags.length > 0 && (
                                        <div className="flex gap-1 mt-1.5 flex-wrap">
                                            {student.tags.map((tag, idx) => (
                                                <span key={idx} className="bg-blue-50 text-blue-600 text-[10px] px-1.5 py-0.5 rounded-full border border-blue-100 font-medium">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div 
                                        className="mt-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => onShowLocation(student)}
                                        title="Konumu Haritada Göster"
                                    >
                                        <MapPin size={14} className={
                                            student.location === 'Konum seçildi' ? 'text-emerald-500' :
                                                student.location === 'Veli uygulamadan seçecek' ? 'text-purple-500' :
                                                    'text-slate-400'
                                        } />
                                        <span className={
                                            student.location === 'Konum seçildi' ? 'text-emerald-600' :
                                                student.location === 'Veli uygulamadan seçecek' ? 'text-purple-600' :
                                                    'text-slate-500'
                                        }>
                                            {student.location}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="text-sm text-slate-800">{student.parent}</div>
                                    <div className="text-xs text-slate-500">{student.phone}</div>
                                </td>
                                <td className="p-4 text-slate-600">{student.school}</td>
                                <td className="p-4">
                                    {student.vehicle_plate ? (
                                        <div className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                            🚐 {student.vehicle_plate}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-slate-400 italic">Araç Yok</span>
                                    )}
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2 xl:opacity-50 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => onAddSibling(student)}
                                            className="p-2 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                                            title="Kardeş Ekle (Hızlı Kayıt)"
                                        >
                                            <Users size={16} />
                                        </button>
                                        <button
                                            onClick={() => onShowQr(student)}
                                            className="p-2 hover:bg-emerald-50 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors"
                                            title="Giriş Kodu (QR)"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1" /><rect width="5" height="5" x="16" y="3" rx="1" /><rect width="5" height="5" x="3" y="16" rx="1" /><path d="M21 16h-3a2 2 0 0 0-2 2v3" /><path d="M21 21v.01" /><path d="M12 7v3a2 2 0 0 1-2 2H7" /><path d="M3 12h.01" /><path d="M12 3h.01" /><path d="M12 16v.01" /><path d="M16 12h1" /><path d="M21 12v.01" /><path d="M12 21v-1" /></svg>
                                        </button>
                                        <button
                                            onClick={() => onShowLocation(student)}
                                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-500 transition-colors"
                                            title="Konumu Göster"
                                        >
                                            <MapPin size={16} />
                                        </button>
                                        <button
                                            onClick={() => onShowDetails(student)}
                                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                                            title="Detayları Görüntüle"
                                        >
                                            <Eye size={16} />
                                        </button>
                                        <button
                                            onClick={() => onEdit(student)}
                                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-secondary transition-colors"
                                            title="Düzenle"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (window.confirm(`${student.name} isimli öğrenciyi silmek istediğinize emin misiniz?`)) {
                                                    onDelete(student.id);
                                                }
                                            }}
                                            className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                                            title="Sil"
                                        >
                                            <Trash2 size={16} />
                                        </button>

                                        {student.status === 'pending' && onApprove && onReject && (
                                            <>
                                                <div className="w-px h-6 bg-slate-200 mx-1"></div>
                                                <button
                                                    onClick={() => onApprove(student)}
                                                    className="px-3 py-1 bg-emerald-100 text-emerald-700 font-medium text-xs rounded-lg hover:bg-emerald-200 transition-colors"
                                                    title="Başvuruyu Onayla"
                                                >
                                                    Onayla
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm('Bu başvuruyu reddetmek istediğinize emin misiniz?')) {
                                                            onReject(student);
                                                        }
                                                    }}
                                                    className="px-3 py-1 bg-red-100 text-red-700 font-medium text-xs rounded-lg hover:bg-red-200 transition-colors"
                                                    title="Başvuruyu Reddet"
                                                >
                                                    Reddet
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StudentList;
