import React from 'react';
import { Edit, Trash2, MapPin, Eye, CheckCircle, Circle } from 'lucide-react';

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
    neighborhood?: string;
    coordinates?: [number, number];
    address?: string;
    blood_group?: string;
    allergies?: string;
    registration_date?: string;
    registration_number?: number;
    status?: 'active' | 'inactive' | 'pending';
    tags?: string[];
    shift?: string;
    custom_price?: number | null;
    total_debt?: number | null;
    parent_tc?: string;
    driver_name?: string;
    login_token?: string;
    payment_status_this_month?: string;

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
    onAddSibling?: (student: Student) => void;
    onQuickPay?: (student: Student) => void;
    onApprove?: (student: Student) => void;
    onReject?: (student: Student) => void;
    whatsappTemplate?: string;
}

const StudentList: React.FC<StudentListProps> = ({ 
    students, onEdit, onDelete, onShowLocation, onShowDetails, onShowQr, onQuickPay, onApprove, onReject, whatsappTemplate 
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
                            <th className="p-4 font-semibold text-slate-600 text-sm">Ödeme Durumu</th>
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
                                    {student.shift && (
                                        <div className="mt-1.5 flex">
                                            <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded border border-amber-200 font-bold">
                                                {student.shift}
                                            </span>
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
                                    {student.status === 'pending' ? (
                                        <div className="flex flex-col gap-1">
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs">
                                                <span className="text-slate-500 font-medium">💰 Aylık Ücret:</span>
                                                <span className="font-black text-sm text-emerald-700">
                                                    {student.custom_price && Number(student.custom_price) > 0
                                                        ? `${Number(student.custom_price).toLocaleString('tr-TR')} ₺`
                                                        : 'Belirtilmedi'}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1 px-1">
                                                <span>⏳ Onay Bekliyor</span>
                                            </span>
                                        </div>
                                    ) : student.payment_status_this_month === 'Ödendi' ? (
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 text-emerald-600 cursor-default" title="Bu Ayın Taksiti Ödendi">
                                                <CheckCircle size={20} className="fill-emerald-100" />
                                                <span className="text-xs font-bold">Bu Ay Ödendi</span>
                                            </div>
                                            {(() => {
                                                const rawDebt = student.total_debt;
                                                if (rawDebt === null || rawDebt === undefined || Number(rawDebt) <= 0) return null;
                                                const debtVal = Number(rawDebt);
                                                return (
                                                    <div className="text-[11px] font-semibold text-slate-600 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200 w-fit">
                                                        Kalan Borç: <span className="font-bold text-slate-900">{debtVal.toLocaleString('tr-TR')} ₺</span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-1">
                                            <button
                                                onClick={() => onQuickPay && onQuickPay(student)}
                                                className="flex items-center gap-1.5 text-slate-500 hover:text-emerald-600 transition-colors group"
                                                title="Ödendi Olarak İşaretle"
                                            >
                                                <Circle size={20} className="group-hover:fill-emerald-50 text-slate-400" />
                                                <span className="text-xs font-medium">Taksit Bekliyor</span>
                                            </button>
                                            {(() => {
                                                const rawDebt = student.total_debt;
                                                if (rawDebt === null || rawDebt === undefined || Number(rawDebt) <= 0) return null;
                                                const debtVal = Number(rawDebt);
                                                return (
                                                    <div className="text-[11px] font-semibold text-slate-600 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200 w-fit">
                                                        Kalan Borç: <span className="font-bold text-slate-900">{debtVal.toLocaleString('tr-TR')} ₺</span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </td>
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
                                                    onClick={() => {
                                                        const regNum = student.registration_number ? student.registration_number.toString() : '___';
                                                        const studentName = student.full_name || student.name || 'Öğrenci';
                                                        
                                                        let message = '';
                                                        if (whatsappTemplate) {
                                                            message = whatsappTemplate
                                                                .replace(/{Ogrenci_Adi}/g, studentName)
                                                                .replace(/{Kayit_Numarasi}/g, regNum);
                                                        } else {
                                                            message = `Merhaba, ${studentName} isimli öğrencinin servis ön kaydı alınmıştır. Kayıt işlemlerinin tamamlanması için lütfen iletişime geçiniz. Kayıt Numaranız: ${regNum}`;
                                                        }

                                                        const phoneToUse = student.parent_phone || student.phone;
                                                        if (phoneToUse) {
                                                            const cleanPhone = phoneToUse.replace(/[^0-9]/g, '').slice(-10);
                                                            if (cleanPhone.length === 10) {
                                                                const whatsappUrl = `https://wa.me/90${cleanPhone}?text=${encodeURIComponent(message)}`;
                                                                window.open(whatsappUrl, '_blank');
                                                            } else {
                                                                alert('Geçerli bir telefon numarası bulunamadı.');
                                                            }
                                                        } else {
                                                            alert('Öğrenciye ait telefon numarası bulunamadı.');
                                                        }
                                                    }}
                                                    className="px-3 py-1 bg-blue-100 text-blue-700 font-medium text-xs rounded-lg hover:bg-blue-200 transition-colors"
                                                    title="Ödeme İçin Mesaj Gönder"
                                                >
                                                    Mesaj Gönder
                                                </button>
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
