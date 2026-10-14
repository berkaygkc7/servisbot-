import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
    Search, 
    FileText, 
    CheckCircle2, 
    AlertCircle, 
    Printer, 
    Eye, 
    X, 
    User, 
    Phone, 
    PenTool, 
    ShieldCheck,
    MessageCircle,
    Copy,
    Check
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface StudentContract {
    id: string;
    login_token?: string;
    full_name: string;
    parent_name: string;
    parent_phone: string;
    parent_tc?: string;
    address: string;
    grade?: string;
    school_id?: string;
    schools?: { id: string; name: string };
    total_debt?: number;
    custom_price?: number;
    parent_signature?: string | null;
    contract_signed_at?: string | null;
    registration_date?: string;
    status: string;
    neighborhood?: string;
}

const Contracts: React.FC = () => {
    const { profile } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'signed' | 'unsigned'>('all');
    const [schoolFilter, setSchoolFilter] = useState<string>('all');
    const [selectedContract, setSelectedContract] = useState<StudentContract | null>(null);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [selectedSignaturePreview, setSelectedSignaturePreview] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Fetch Schools for filtering
    const { data: schools = [] } = useQuery({
        queryKey: ['schools', profile?.company_id],
        queryFn: async () => {
            const { data } = await supabase
                .from('schools')
                .select('id, name')
                .order('name');
            return data || [];
        }
    });

    // Fetch Students with signatures and school info
    const { data: students = [], isLoading } = useQuery<StudentContract[]>({
        queryKey: ['student_contracts', profile?.company_id],
        queryFn: async () => {
            if (!profile?.company_id) return [];
            const { data, error } = await supabase
                .from('students')
                .select(`
                    id,
                    login_token,
                    full_name,
                    parent_name,
                    parent_phone,
                    parent_tc,
                    address,
                    grade,
                    school_id,
                    schools (id, name),
                    total_debt,
                    custom_price,
                    parent_signature,
                    contract_signed_at,
                    registration_date,
                    status,
                    neighborhood
                `)
                .eq('company_id', profile.company_id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching student contracts:", error);
                throw error;
            }
            return (data as any) || [];
        },
        enabled: !!profile?.company_id
    });

    const getSignUrl = (student: StudentContract) => {
        const token = student.login_token || student.id;
        return `${window.location.origin}/imzala/${token}`;
    };

    const handleSendWhatsAppLink = (student: StudentContract, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const cleanPhone = (student.parent_phone || '').replace(/\D/g, '').slice(-10);
        if (cleanPhone.length !== 10) {
            alert('Velinin geçerli bir telefon numarası bulunamadı!');
            return;
        }

        const companyName = profile?.companies?.company_name || 'Servis Firması';
        const signUrl = getSignUrl(student);
        const msg = `Sayın ${student.parent_name || 'Velimiz'},\n\nÖğrencimiz *${student.full_name}* için hazırlanan *${companyName}* servis taşımacılığı sözleşmesini telefonunuzdan inceleyip dokunmatik olarak imzalamak için lütfen aşağıdaki bağlantıya tıklayınız:\n\n👉 ${signUrl}\n\nİyi günler dileriz.`;

        window.open(`https://wa.me/90${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleCopySignLink = (student: StudentContract, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const signUrl = getSignUrl(student);
        navigator.clipboard.writeText(signUrl).then(() => {
            setCopiedId(student.id);
            setTimeout(() => setCopiedId(null), 2500);
        }).catch(() => {
            alert(`İmza bağlantısı: ${signUrl}`);
        });
    };

    // Stats calculations
    const stats = useMemo(() => {
        const total = students.length;
        const signed = students.filter(s => Boolean(s.parent_signature)).length;
        const unsigned = total - signed;
        const signedRate = total > 0 ? Math.round((signed / total) * 100) : 0;
        return { total, signed, unsigned, signedRate };
    }, [students]);

    // Filtering logic
    const filteredStudents = useMemo(() => {
        return students.filter(student => {
            // Search filter
            const query = searchTerm.toLowerCase().trim();
            const matchesSearch = !query || 
                (student.full_name || '').toLowerCase().includes(query) ||
                (student.parent_name || '').toLowerCase().includes(query) ||
                (student.parent_phone || '').includes(query) ||
                (student.parent_tc || '').includes(query) ||
                (student.schools?.name || '').toLowerCase().includes(query);

            if (!matchesSearch) return false;

            // Status filter
            const hasSignature = Boolean(student.parent_signature);
            if (statusFilter === 'signed' && !hasSignature) return false;
            if (statusFilter === 'unsigned' && hasSignature) return false;

            // School filter
            if (schoolFilter !== 'all' && student.school_id !== schoolFilter) return false;

            return true;
        });
    }, [students, searchTerm, statusFilter, schoolFilter]);

    // Print Contract Trigger
    const handlePrintContract = (student: StudentContract) => {
        const companyName = profile?.companies?.company_name || '';
        const normComp = companyName.toLowerCase().replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ç/g, 'c').replace(/\s+/g, '');
        const normSchool = (student.schools?.name || '').toLowerCase().replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ç/g, 'c').replace(/\s+/g, '');
        
        const isHalegul = normComp.includes('halegul');
        const isGuroz = normComp.includes('guroz');
        const isHakanGuvencer = normSchool.includes('hakanguvencer') || normSchool.includes('guvencer');
        const installment_count = isHakanGuvencer ? 11 : (isHalegul || isGuroz) ? 9 : 10;

        localStorage.setItem('print_contract_data', JSON.stringify({
            student: {
                ...student,
                company_name: companyName,
                school_name: student.schools?.name
            },
            installment_count
        }));

        window.open('/print-contract', '_blank');
    };

    const openViewer = (student: StudentContract) => {
        setSelectedContract(student);
        setIsViewerOpen(true);
    };

    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
                        <FileText className="text-blue-600 w-7 h-7" />
                        Öğrenci Sözleşmeleri
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Online kayıt esnasında veliler tarafından dokunmatik olarak imzalanan tüm sözleşmeler ve senetler burada saklanır.
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Toplam Sözleşme</span>
                        <span className="text-3xl font-black text-slate-800 mt-1 block">{stats.total}</span>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <FileText size={24} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">İmzalananlar</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl font-black text-emerald-700">{stats.signed}</span>
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                %{stats.signedRate}
                            </span>
                        </div>
                    </div>
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                        <CheckCircle2 size={24} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider block">İmza Bekleyenler</span>
                        <span className="text-3xl font-black text-amber-700 mt-1 block">{stats.unsigned}</span>
                    </div>
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                        <AlertCircle size={24} />
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                {/* Search */}
                <div className="relative flex-1 min-w-[260px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Öğrenci, veli, telefon veya TC ile ara..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Filter buttons */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-xl bg-slate-100 p-1">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                statusFilter === 'all' 
                                    ? 'bg-white text-slate-800 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            Tümü ({stats.total})
                        </button>
                        <button
                            onClick={() => setStatusFilter('signed')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                statusFilter === 'signed' 
                                    ? 'bg-emerald-600 text-white shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <CheckCircle2 size={13} />
                            İmzalı ({stats.signed})
                        </button>
                        <button
                            onClick={() => setStatusFilter('unsigned')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                statusFilter === 'unsigned' 
                                    ? 'bg-amber-600 text-white shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <AlertCircle size={13} />
                            İmzasız ({stats.unsigned})
                        </button>
                    </div>

                    {/* School selector */}
                    <select
                        value={schoolFilter}
                        onChange={(e) => setSchoolFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">Tüm Okullar</option>
                        {schools.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table / List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center text-slate-400">
                        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-sm font-medium">Sözleşmeler yükleniyor...</p>
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                            <FileText size={28} />
                        </div>
                        <h3 className="text-base font-bold text-slate-700">Kayıtlı Sözleşme Bulunamadı</h3>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                            Arama kriterlerinize uyan veya online kaydı yapılmış bir öğrenci sözleşmesi bulunmamaktadır.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-3.5 px-5">Öğrenci</th>
                                    <th className="py-3.5 px-5">Veli Bilgisi</th>
                                    <th className="py-3.5 px-5">Okul / Sınıf</th>
                                    <th className="py-3.5 px-5">Sözleşme Tutarı</th>
                                    <th className="py-3.5 px-5">İmza Durumu</th>
                                    <th className="py-3.5 px-5 text-center">Veli İmzası</th>
                                    <th className="py-3.5 px-5 text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {filteredStudents.map((student) => {
                                    const hasSignature = Boolean(student.parent_signature);

                                    return (
                                        <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                                            {/* Öğrenci */}
                                            <td className="py-3.5 px-5 font-semibold text-slate-800">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                                                        {student.full_name?.charAt(0) || 'Ö'}
                                                    </div>
                                                    <div>
                                                        <span className="block font-bold text-slate-900 leading-tight">
                                                            {student.full_name}
                                                        </span>
                                                        <span className="text-[11px] text-slate-400 font-normal">
                                                            {student.registration_date 
                                                                ? new Date(student.registration_date).toLocaleDateString('tr-TR') 
                                                                : 'Kayıt tarihi yok'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Veli Bilgisi */}
                                            <td className="py-3.5 px-5">
                                                <div className="text-xs">
                                                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                                        <User size={13} className="text-slate-400" />
                                                        {student.parent_name || 'Belirtilmedi'}
                                                    </div>
                                                    <div className="text-slate-500 flex items-center gap-1.5 mt-0.5">
                                                        <Phone size={13} className="text-slate-400" />
                                                        {student.parent_phone || '-'}
                                                    </div>
                                                    {student.parent_tc && (
                                                        <div className="text-[10px] text-slate-400 mt-0.5">
                                                            TC: {student.parent_tc}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Okul / Sınıf */}
                                            <td className="py-3.5 px-5">
                                                <div className="text-xs">
                                                    <span className="font-semibold text-slate-800 block truncate max-w-[180px]">
                                                        {student.schools?.name || 'Okul atanmadı'}
                                                    </span>
                                                    <span className="text-slate-400 text-[11px] block mt-0.5">
                                                        {student.grade ? `${student.grade}. Sınıf` : 'Sınıf belirtilmedi'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Tutar */}
                                            <td className="py-3.5 px-5">
                                                <div className="text-xs">
                                                    <span className="font-bold text-slate-900 block">
                                                        {student.total_debt 
                                                            ? `${Number(student.total_debt).toLocaleString('tr-TR')} ₺` 
                                                            : '-'}
                                                    </span>
                                                    {student.custom_price ? (
                                                        <span className="text-[10px] text-slate-400 block mt-0.5">
                                                            Aylık {Number(student.custom_price).toLocaleString('tr-TR')} ₺
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </td>

                                            {/* İmza Durumu */}
                                            <td className="py-3.5 px-5">
                                                {hasSignature ? (
                                                    <div>
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            <CheckCircle2 size={13} />
                                                            İmzalandı
                                                        </span>
                                                        {student.contract_signed_at && (
                                                            <span className="text-[10px] text-slate-400 block mt-0.5">
                                                                {new Date(student.contract_signed_at).toLocaleString('tr-TR', {
                                                                    day: '2-digit',
                                                                    month: '2-digit',
                                                                    year: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                        <AlertCircle size={13} />
                                                        İmza Bekliyor
                                                    </span>
                                                )}
                                            </td>

                                            {/* İmza Önizleme */}
                                            <td className="py-3.5 px-5 text-center">
                                                {hasSignature ? (
                                                    <button
                                                        onClick={() => setSelectedSignaturePreview(student.parent_signature!)}
                                                        className="group relative inline-block p-1 bg-slate-50 border border-slate-200 rounded-lg hover:border-blue-400 transition-all cursor-pointer"
                                                        title="İmzayı büyütmek için tıklayın"
                                                    >
                                                        <img
                                                            src={student.parent_signature!}
                                                            alt="Veli İmzası"
                                                            className="h-8 max-w-[90px] object-contain group-hover:scale-105 transition-transform"
                                                        />
                                                    </button>
                                                ) : (
                                                    <span className="text-slate-300 text-xs italic">-</span>
                                                )}
                                            </td>

                                            {/* İşlemler */}
                                            <td className="py-3.5 px-5 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={(e) => handleSendWhatsAppLink(student, e)}
                                                        className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors"
                                                        title="WhatsApp ile Veliye İmza Linki Gönder"
                                                    >
                                                        <MessageCircle size={17} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleCopySignLink(student, e)}
                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                                        title="İmza Bağlantısını Kopyala (SMS veya Mesaj için)"
                                                    >
                                                        {copiedId === student.id ? <Check size={17} className="text-emerald-600" /> : <Copy size={17} />}
                                                    </button>
                                                    <button
                                                        onClick={() => openViewer(student)}
                                                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                                        title="Sözleşmeyi İncele"
                                                    >
                                                        <Eye size={17} />
                                                    </button>
                                                    <button
                                                        onClick={() => handlePrintContract(student)}
                                                        className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                                                        title="Resmi Sözleşmeyi Yazdır / PDF"
                                                    >
                                                        <Printer size={17} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Contract Viewer Modal */}
            {isViewerOpen && selectedContract && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden border border-slate-100">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <ShieldCheck className="text-emerald-600" size={22} />
                                    Öğrenci Taşıma ve Servis Sözleşmesi
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Öğrenci: <strong className="text-slate-800">{selectedContract.full_name}</strong> | Veli: <strong className="text-slate-800">{selectedContract.parent_name}</strong>
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleSendWhatsAppLink(selectedContract)}
                                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 transition-all"
                                    title="Veliye WhatsApp ile imza linki gönder"
                                >
                                    <MessageCircle size={15} />
                                    WhatsApp Linki
                                </button>
                                <button
                                    onClick={() => handleCopySignLink(selectedContract)}
                                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                                    title="İmza bağlantısını kopyala"
                                >
                                    {copiedId === selectedContract.id ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                                    {copiedId === selectedContract.id ? 'Kopyalandı' : 'Linki Kopyala'}
                                </button>
                                <button
                                    onClick={() => handlePrintContract(selectedContract)}
                                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all"
                                >
                                    <Printer size={15} />
                                    Yazdır / İndir
                                </button>
                                <button 
                                    onClick={() => setIsViewerOpen(false)}
                                    className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-200 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
                            {/* Summary Box */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/70 text-xs">
                                <div>
                                    <span className="text-slate-400 font-medium block">Okul</span>
                                    <span className="font-bold text-slate-800 mt-0.5 block truncate">{selectedContract.schools?.name || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 font-medium block">Sınıf</span>
                                    <span className="font-bold text-slate-800 mt-0.5 block">{selectedContract.grade ? `${selectedContract.grade}. Sınıf` : '-'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 font-medium block">Veli Telefon</span>
                                    <span className="font-bold text-slate-800 mt-0.5 block">{selectedContract.parent_phone || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 font-medium block">Yıllık Tutar</span>
                                    <span className="font-bold text-emerald-700 mt-0.5 block">
                                        {selectedContract.total_debt ? `${Number(selectedContract.total_debt).toLocaleString('tr-TR')} ₺` : '-'}
                                    </span>
                                </div>
                                <div className="col-span-2 sm:col-span-4 mt-1 border-t border-slate-200 pt-2">
                                    <span className="text-slate-400 font-medium block">Adres</span>
                                    <span className="font-semibold text-slate-800 mt-0.5 block">{selectedContract.address || '-'}</span>
                                </div>
                            </div>

                            {/* Contract Clauses Summary */}
                            <div className="border border-slate-200 rounded-2xl p-5 space-y-3 bg-white text-xs leading-relaxed text-slate-600">
                                <h4 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
                                    Sözleşme Şartları ve Taahhütler
                                </h4>
                                <p>1. Servis araçlarımız İçişleri Bakanlığı Okul Servis Araçları Yönetmeliği'ne uygundur.</p>
                                <p>2. Servis ücretleri yıllık hesaplanmakta olup, taksit ödemeleri düzenli olarak her ay yapılacaktır.</p>
                                <p>3. Servis araçları güzergah doğrultusunda öğrenciyi ikamet adresine en yakın noktada indirir ve alır.</p>
                                <p>4. Bu sözleşme taraflarca okunup kabul edilmiş olup, veli tarafından dokunmatik olarak imzalanarak senet ve sözleşme niteliği taşımaktadır.</p>
                            </div>

                            {/* Digital Signature Card */}
                            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-5 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <PenTool size={16} className="text-blue-600" />
                                        <h4 className="font-bold text-sm text-slate-800">Veli Dijital Islak İmzası</h4>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                                        Veli, online kayıt formunu doldururken veya WhatsApp ile iletilen imzalama bağlantısından cep telefonu/dokunmatik ekrandan bu imzayı bizzat çizmiş ve kabul etmiştir.
                                    </p>
                                    {selectedContract.contract_signed_at && (
                                        <div className="text-[11px] text-emerald-700 font-semibold mt-2 flex items-center gap-1">
                                            <CheckCircle2 size={13} />
                                            İmza Zaman Damgası: {new Date(selectedContract.contract_signed_at).toLocaleString('tr-TR')}
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm min-w-[200px] flex flex-col items-center">
                                    {selectedContract.parent_signature ? (
                                        <>
                                            <img 
                                                src={selectedContract.parent_signature} 
                                                alt="Veli İmzası" 
                                                className="max-h-20 max-w-[220px] object-contain my-1" 
                                            />
                                            <span className="text-[10px] text-slate-400 border-t border-slate-100 pt-1 w-full text-center">
                                                {selectedContract.parent_name}
                                            </span>
                                        </>
                                    ) : (
                                        <div className="py-3 px-2 text-center flex flex-col items-center gap-2">
                                            <span className="text-amber-600 font-bold text-xs flex items-center gap-1">
                                                <AlertCircle size={14} /> İmza Bekliyor
                                            </span>
                                            <button
                                                onClick={() => handleSendWhatsAppLink(selectedContract)}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                                            >
                                                <MessageCircle size={13} />
                                                WhatsApp ile İmzalat
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                            <button
                                onClick={() => setIsViewerOpen(false)}
                                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all"
                            >
                                Kapat
                            </button>
                            <button
                                onClick={() => handlePrintContract(selectedContract)}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
                            >
                                <Printer size={15} />
                                Resmi Nüshayı Yazdır
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Signature Zoom Modal */}
            {selectedSignaturePreview && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
                    onClick={() => setSelectedSignaturePreview(null)}
                >
                    <div 
                        className="bg-white p-6 rounded-3xl shadow-2xl max-w-md w-full text-center border border-slate-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-center gap-1.5">
                            <PenTool size={16} className="text-blue-600" />
                            Veli İmzası Detayı
                        </h4>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex items-center justify-center min-h-[160px]">
                            <img 
                                src={selectedSignaturePreview} 
                                alt="İmza Büyük Önizleme" 
                                className="max-h-36 max-w-full object-contain" 
                            />
                        </div>
                        <button
                            onClick={() => setSelectedSignaturePreview(null)}
                            className="mt-5 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                        >
                            Kapat
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Contracts;
