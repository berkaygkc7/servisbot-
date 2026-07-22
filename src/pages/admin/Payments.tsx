import { useState, useEffect } from 'react';
import { CreditCard, Search, Download, CheckCircle, Bell, UserPlus, X, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import MapScene from '../../components/map/MapScene';

// Helper component for status badges
const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case 'Ödendi':
            return (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200 shadow-sm flex items-center gap-1 w-fit">
                    <CheckCircle size={12} />
                    Ödendi
                </span>
            );
        case 'Bekliyor':
            return (
                <span className="px-3 py-1 bg-amber-100 text-amber-600 rounded-full text-xs font-bold border border-amber-200 shadow-sm flex items-center gap-1 w-fit">
                    <Bell size={12} />
                    Bekliyor
                </span>
            );
        case 'Gecikti':
            return (
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold border border-red-200 shadow-sm flex items-center gap-1 w-fit">
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                    Gecikti
                </span>
            );
        default:
            return <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">{status}</span>;
    }
};

const Payments = () => {
    const { profile } = useAuth();
    const [studentsData, setStudentsData] = useState<any[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentMonthStr, setCurrentMonthStr] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedStudentDetails, setSelectedStudentDetails] = useState<any | null>(null);
    const [quickPayStudentId, setQuickPayStudentId] = useState<string | null>(null);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [schoolLevelFilter, setSchoolLevelFilter] = useState<'all' | 'primary' | 'middle' | 'high'>('all');

    // New Schools Filter State
    const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
    const [schoolIdFilter, setSchoolIdFilter] = useState<string>('all');

    // Location Modal State
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

    // Add Payment Modal State
    const [newPayment, setNewPayment] = useState({
        invoice_no: `SRV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        student_id: '',
        month: '',
        amount: '',
        due_date: new Date().toISOString().split('T')[0],
        status: ' Bekliyor',
        payment_method: ''
    });

    useEffect(() => {
        // Set "Ocak 2026" type string for current month
        const formatter = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' });
        const monthStr = formatter.format(new Date());
        setCurrentMonthStr(monthStr.charAt(0).toUpperCase() + monthStr.slice(1));

        // Also pre-fill the modal
        setNewPayment(prev => ({
            ...prev,
            month: monthStr.charAt(0).toUpperCase() + monthStr.slice(1)
        }));

        fetchData();
        fetchSchools();

        const channel = supabase
            .channel('public:payments_students_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, fetchData)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchSchools = async () => {
        const { data } = await supabase.from('schools').select('id, name').order('name');
        if (data) {
            setSchools(data);
        }
    };

    const fetchData = async () => {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();

        // Fetch students with more details for the modal
        const { data: students, error: stdError } = await supabase
            .from('students')
            .select(`
                id, 
                full_name, 
                parent_name, 
                parent_phone, 
                address, 
                blood_group, 
                allergies, 
                grade, 
                tags, 
                home_latitude,
                home_longitude,
                registration_date, 
                school_level,
                school_id,
                custom_price,
                created_at,
                vehicles (plate_number, driver_name)
            `)
            .eq('status', 'active')
            .order('full_name');

        if (stdError || !students) return;

        // Fetch ALL payments so we can determine the latest status correctly instead of just filtering by month
        const { data: payments, error: payError } = await supabase
            .from('payments')
            .select('*');

        if (payError || !payments) return;

        // Fetch Pricing Rules
        const { data: pricingRulesData } = await supabase
            .from('pricing_rules')
            .select('*')
            .eq('company_id', profile?.company_id || '');

        const pricingRules = pricingRulesData || [];

        // We need to fetch ALL payments to know the latest payment status for each student
        // Map and compute stats
        // We'll calculate the due date based on registration day
        // For the *current open term*, we find the most recent month they *should* have paid.

        const formatter = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' });

        const compiledData = students.map(student => {
            const studentPayments = payments.filter(p => p.student_id === student.id);

            // Calculate Monthly Fee based on schooling level
            let monthlyFee = 0;
            if (student.custom_price) {
                monthlyFee = Number(student.custom_price);
            } else if (student.school_level) {
                // Map EN db values to TR UI values used in Settings
                const levelMap: Record<string, string> = {
                    'primary': 'İlkokul',
                    'middle': 'Ortaokul',
                    'high': 'Lise'
                };

                // If it's already TR (e.g. from future updates), it'll just use that, otherwise translate
                const translatedLevel = levelMap[student.school_level] || student.school_level;

                const specificRule = pricingRules.find(r => r.school_level === translatedLevel);
                if (specificRule) {
                    monthlyFee = specificRule.amount;
                }
            }

            // Baseline date
            const baseDate = new Date(student.registration_date || student.created_at || today);
            let registrationDay = baseDate.getDate();

            // Start checking from the student's registration month
            let checkYear = baseDate.getFullYear();
            let checkMonth = baseDate.getMonth();

            let targetDate = new Date(checkYear, checkMonth, registrationDay);
            let targetMonthStr = '';
            let hasPaidCurrent: any = null;
            let foundDeadline = false;

            let iterations = 0;

            while (targetDate <= today || (targetDate.getFullYear() === currentYear && targetDate.getMonth() === currentMonth)) {
                let mStr = formatter.format(targetDate);
                mStr = mStr.charAt(0).toUpperCase() + mStr.slice(1);

                let paymentForThisMonth = studentPayments.find(p => p.month === mStr);

                if (!paymentForThisMonth || paymentForThisMonth.status !== 'Ödendi') {
                    // Found earliest unpaid month!
                    targetDate = new Date(checkYear, checkMonth, registrationDay);
                    targetMonthStr = mStr;
                    hasPaidCurrent = paymentForThisMonth || null;
                    foundDeadline = true;
                    break;
                }

                // Iteration safe guard
                iterations++;
                if (iterations > 60) break;

                // Move to next month
                checkMonth++;
                if (checkMonth > 11) {
                    checkMonth = 0;
                    checkYear++;
                }
                targetDate = new Date(checkYear, checkMonth, registrationDay);
            }

            // If they paid for ALL past and current months (targetDate went into the future)
            if (!foundDeadline) {
                targetMonthStr = formatter.format(targetDate);
                targetMonthStr = targetMonthStr.charAt(0).toUpperCase() + targetMonthStr.slice(1);
                hasPaidCurrent = studentPayments.find(p => p.month === targetMonthStr) || null;
            }

            let status = 'Bekliyor';
            if (hasPaidCurrent && hasPaidCurrent.status === 'Ödendi') {
                status = 'Ödendi';
            } else {
                const targetDayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
                const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

                if (todayStart > targetDayStart) {
                    status = 'Gecikti';
                }
            }

            // Next Due Date is simply one month after targetDate
            const nextDueDate = new Date(targetDate);
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);

            const levelMap: Record<string, string> = {
                'primary': 'İlkokul',
                'middle': 'Ortaokul',
                'high': 'Lise'
            };
            const displayLevel = student.school_level ? (levelMap[student.school_level] || student.school_level) : '';

            return {
                ...student,
                dueDate: targetDate,
                nextDueDate: nextDueDate,
                status: status,
                currentMonthStr: targetMonthStr,
                schoolLevel: displayLevel,
                paymentRecord: hasPaidCurrent,
                monthlyFee: monthlyFee
            };
        });

        setStudentsData(compiledData);
    };

    const handleMarkAsPaid = async (studentId: string, method: string) => {
        try {
            const invoiceNo = `SRV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
            const student = studentsData.find(s => s.id === studentId);
            const studentTargetMonth = student?.currentMonthStr || currentMonthStr;
            const amount = student?.monthlyFee || 0;

            const { error } = await supabase
                .from('payments')
                .insert([{
                    company_id: profile?.company_id,
                    invoice_no: invoiceNo,
                    student_id: studentId,
                    month: studentTargetMonth,
                    amount: amount,
                    due_date: new Date().toISOString().split('T')[0],
                    status: 'Ödendi',
                    payment_method: method
                }]);

            if (error) throw error;
            fetchData();
            setQuickPayStudentId(null);
        } catch (error) {
            console.error('Ödeme işlemi başarısız:', error);
            alert('Ödeme alınırken hata oluştu.');
        }
    };

    const handleBulkMarkAsPaid = async (method: string) => {
        setIsBulkModalOpen(false);
        // We'll use a single loading state if we had one, but for now we'll just loop
        for (const studentId of selectedStudentIds) {
            const student = studentsData.find(s => s.id === studentId);
            if (student && student.status === 'Ödendi') continue;

            const invoiceNo = `SRV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
            const studentTargetMonth = student?.currentMonthStr || currentMonthStr;
            const amount = student?.monthlyFee || 0;

            await supabase.from('payments').insert([{
                company_id: profile?.company_id,
                invoice_no: invoiceNo,
                student_id: studentId,
                month: studentTargetMonth,
                amount: amount,
                due_date: new Date().toISOString().split('T')[0],
                status: 'Ödendi',
                payment_method: method
            }]);
        }
        setSelectedStudentIds([]);
        fetchData();
    };

    const handleAddPaymentModalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { error } = await supabase
                .from('payments')
                .insert([{
                    invoice_no: newPayment.invoice_no,
                    student_id: newPayment.student_id,
                    month: newPayment.month,
                    amount: parseFloat(newPayment.amount),
                    due_date: newPayment.due_date,
                    status: newPayment.status,
                    payment_method: newPayment.payment_method || null
                }]);

            if (error) throw error;

            setIsAddModalOpen(false);
            setNewPayment({
                invoice_no: `SRV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
                student_id: '',
                month: currentMonthStr,
                amount: '',
                due_date: new Date().toISOString().split('T')[0],
                status: 'Bekliyor',
                payment_method: ''
            });
            fetchData();
        } catch (error) {
            console.error('Error adding payment:', error);
            alert('Ödeme eklenirken bir hata oluştu.');
        }
    };

    const toggleStudentSelection = (id: string) => {
        setSelectedStudentIds(prev =>
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };

    const toggleAllSelection = () => {
        if (selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0) {
            setSelectedStudentIds([]);
        } else {
            setSelectedStudentIds(filteredStudents.map(s => s.id));
        }
    };

    const formatDate = (dateObj: Date) => {
        return dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const filteredStudents = studentsData.filter(s => {
        const matchesSearch = s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.parent_name?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesSchoolLevel = schoolLevelFilter === 'all' || s.school_level === schoolLevelFilter;
        const matchesSchoolId = schoolIdFilter === 'all' || s.school_id === schoolIdFilter;

        return matchesSearch && matchesSchoolLevel && matchesSchoolId;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <CreditCard className="text-secondary" />
                        Aylık Ödemeler ({currentMonthStr})
                    </h1>
                    <p className="text-slate-500 mt-1">Sisteme kayıtlı tüm öğrencilerinizin bu ayki ödeme durumları.</p>
                </div>
                <div className="flex gap-3">
                    {selectedStudentIds.length > 0 && (
                        <button
                            onClick={() => setIsBulkModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium shadow-sm animate-fade-in"
                        >
                            <CheckCircle size={18} />
                            Seçilenleri Ödendi İşaretle ({selectedStudentIds.length})
                        </button>
                    )}
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors shadow-sm font-medium">
                        <Download size={18} />
                        Dışa Aktar
                    </button>
                </div>
            </div>

            {/* School Level Filters */}
            <div className="flex gap-2 pb-2 overflow-x-auto">
                <button
                    onClick={() => setSchoolLevelFilter('all')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${schoolLevelFilter === 'all'
                        ? 'bg-secondary text-white border-secondary shadow-md'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                        }`}
                >
                    Tümü
                </button>
                <button
                    onClick={() => setSchoolLevelFilter('primary')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${schoolLevelFilter === 'primary'
                        ? 'bg-purple-500 text-white border-purple-600 shadow-md'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                        }`}
                >
                    İlkokul
                </button>
                <button
                    onClick={() => setSchoolLevelFilter('middle')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${schoolLevelFilter === 'middle'
                        ? 'bg-orange-500 text-white border-orange-600 shadow-md'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                        }`}
                >
                    Ortaokul
                </button>
                <button
                    onClick={() => setSchoolLevelFilter('high')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${schoolLevelFilter === 'high'
                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-md'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                        }`}
                >
                    Lise
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Öğrenci veya Veli Ara..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full md:w-64">
                    <select
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all appearance-none outline-none"
                        value={schoolIdFilter}
                        onChange={(e) => setSchoolIdFilter(e.target.value)}
                    >
                        <option value="all">Tüm Okullar</option>
                        {schools.map(school => (
                            <option key={school.id} value={school.id}>{school.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#2D4A6E] text-white text-sm">
                                <th className="p-4 w-12 first:pl-6">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-secondary focus:ring-secondary w-4 h-4 cursor-pointer"
                                        checked={filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length}
                                        onChange={toggleAllSelection}
                                    />
                                </th>
                                <th className="p-4 font-semibold whitespace-nowrap">Öğrenci</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Veli</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Aylık Tutar</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Kayıt / Esas Tarih</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Bu Ayın Son Ödemesi</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Bir Sonraki (Gelecek Ay)</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Durum</th>
                                <th className="p-4 font-semibold whitespace-nowrap last:pr-6 text-right">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/80">
                            {filteredStudents.map((student) => (
                                <tr key={student.id} className={`hover:bg-slate-50/80 transition-colors ${student.status === 'Gecikti' ? 'bg-red-50/20' : ''} ${selectedStudentIds.includes(student.id) ? 'bg-blue-50/40 border-l-4 border-l-secondary' : 'border-l-4 border-l-transparent'}`}>
                                    <td className="p-4 first:pl-6">
                                        <input
                                            type="checkbox"
                                            className="rounded border-slate-300 text-secondary focus:ring-secondary w-4 h-4 cursor-pointer"
                                            checked={selectedStudentIds.includes(student.id)}
                                            onChange={() => toggleStudentSelection(student.id)}
                                        />
                                    </td>
                                    <td className="p-4 font-bold text-slate-800">
                                        <button
                                            onClick={() => setSelectedStudentDetails(student)}
                                            className="hover:text-blue-600 transition-colors text-left underline-offset-4 hover:underline"
                                            title="Öğrenci detaylarını gör"
                                        >
                                            {student.full_name}
                                        </button>
                                        <div className="text-xs text-slate-500 font-normal">{student.schoolLevel || '-'}</div>
                                    </td>
                                    <td className="p-4 text-slate-600">
                                        {student.parent_name || '-'}
                                    </td>
                                    <td className="p-4 text-emerald-600 font-bold whitespace-nowrap">
                                        {student.monthlyFee > 0 ? (
                                            <div className="flex flex-col">
                                                <span>{student.monthlyFee.toLocaleString('tr-TR')} ₺</span>
                                                {student.custom_price && <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Özel Fiyat</span>}
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-slate-400 font-normal border-b border-dashed border-slate-300">Belirlenmedi</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-slate-500 font-medium whitespace-nowrap">
                                        <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">
                                            {formatDate(new Date(student.registration_date || student.created_at))}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-800 font-bold whitespace-nowrap">
                                        {formatDate(student.dueDate)}
                                    </td>
                                    <td className="p-4 text-secondary font-medium whitespace-nowrap">
                                        {formatDate(student.nextDueDate)}
                                    </td>
                                    <td className="p-4 whitespace-nowrap">
                                        <div className="flex flex-col gap-1.5 items-start">
                                            <StatusBadge status={student.status} />
                                            {student.status === 'Ödendi' && student.paymentRecord?.payment_method && (
                                                <span className="text-[10px] text-slate-500 font-semibold px-2 py-0.5 bg-slate-50 rounded border border-slate-200">
                                                    {student.paymentRecord.payment_method === 'Nakit' ? '💵 Nakit' : '🏦 Havale'}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 last:pr-6 text-right whitespace-nowrap">
                                        {student.status === 'Ödendi' ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-400 rounded-lg text-sm font-medium border border-slate-200/60 shadow-inner">
                                                <CheckCircle size={16} />
                                                Tahsil Edildi
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setQuickPayStudentId(student.id);
                                                    setNewPayment(prev => ({
                                                        ...prev,
                                                        student_id: student.id,
                                                        amount: student.monthlyFee > 0 ? student.monthlyFee.toString() : ''
                                                    }));
                                                }}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-bold transition-all shadow-sm active:scale-95"
                                            >
                                                <CreditCard size={16} />
                                                Ödeme Al
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredStudents.length === 0 && (
                        <div className="p-12 text-center text-slate-400">
                            <UserPlus size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="mt-2 font-medium">Gösterilecek öğreci bulunamadı.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Pay Method Modal */}
            {quickPayStudentId && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 relative">
                            <h3 className="font-bold text-lg text-slate-800">Ödeme Yöntemi Seçin</h3>
                            <button onClick={() => setQuickPayStudentId(null)} className="text-slate-400 hover:text-red-500 absolute top-4 right-4">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 flex flex-col gap-3">
                            <button
                                onClick={() => handleMarkAsPaid(quickPayStudentId, 'Nakit')}
                                className="w-full py-4 px-4 bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-700 font-bold rounded-xl border border-emerald-200 hover:border-emerald-600 transition-all flex items-center justify-between group"
                            >
                                <span className="text-lg">💵 Nakit</span>
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity">Seç &rarr;</span>
                            </button>
                            <button
                                onClick={() => handleMarkAsPaid(quickPayStudentId, 'Havale/EFT')}
                                className="w-full py-4 px-4 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold rounded-xl border border-blue-200 hover:border-blue-700 transition-all flex items-center justify-between group"
                            >
                                <span className="text-lg">🏦 Havale / EFT</span>
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity">Seç &rarr;</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Payment Method Modal */}
            {isBulkModalOpen && (
                <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-slate-100 flex flex-col items-center gap-2 bg-slate-50 relative">
                            <h3 className="font-bold text-lg text-slate-800">Toplu Tahsilat</h3>
                            <p className="text-sm text-slate-500 font-medium">
                                <span className="text-secondary font-black">{selectedStudentIds.length}</span> öğrenci için ödeme yöntemi seçin
                            </p>
                            <button onClick={() => setIsBulkModalOpen(false)} className="text-slate-400 hover:text-red-500 absolute top-4 right-4">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 flex flex-col gap-3">
                            <button
                                onClick={() => handleBulkMarkAsPaid('Nakit')}
                                className="w-full py-4 px-4 bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-700 font-bold rounded-xl border border-emerald-200 hover:border-emerald-600 transition-all flex items-center justify-between group"
                            >
                                <div className="flex flex-col items-start">
                                    <span className="text-lg">💵 Nakit</span>
                                    <span className="text-[10px] text-emerald-600 group-hover:text-white/80 uppercase font-black tracking-widest">Kasa Girişi</span>
                                </div>
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity font-black">&rarr;</span>
                            </button>
                            <button
                                onClick={() => handleBulkMarkAsPaid('Havale/EFT')}
                                className="w-full py-4 px-4 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold rounded-xl border border-blue-200 hover:border-blue-700 transition-all flex items-center justify-between group"
                            >
                                <div className="flex flex-col items-start">
                                    <span className="text-lg">🏦 Havale / EFT</span>
                                    <span className="text-[10px] text-blue-600 group-hover:text-white/80 uppercase font-black tracking-widest">Banka Girişi</span>
                                </div>
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity font-black">&rarr;</span>
                            </button>
                            <button
                                onClick={() => setIsBulkModalOpen(false)}
                                className="mt-2 w-full py-3 text-slate-400 hover:text-slate-600 text-sm font-bold transition-all"
                            >
                                Vazgeç
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Payment Modal (For custom payments outside of quick action) */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
                        <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex justify-between items-center z-10">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Özel Ödeme Ekle</h2>
                                <p className="text-sm text-slate-500">Geçmiş aylar veya özel tahsilatlar için kayıt oluşturun</p>
                            </div>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAddPaymentModalSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Invoice No */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Fatura No</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
                                        value={newPayment.invoice_no}
                                        onChange={(e) => setNewPayment({ ...newPayment, invoice_no: e.target.value })}
                                        placeholder="SRV-2026-0001"
                                    />
                                </div>

                                {/* Student */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Öğrenci</label>
                                    <select
                                        required
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
                                        value={newPayment.student_id}
                                        onChange={(e) => setNewPayment({ ...newPayment, student_id: e.target.value })}
                                    >
                                        <option value="">Öğrenci Seçin</option>
                                        {studentsData.map(s => (
                                            <option key={s.id} value={s.id}>{s.full_name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Month */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Ait Olduğu Ay</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
                                        value={newPayment.month}
                                        onChange={(e) => setNewPayment({ ...newPayment, month: e.target.value })}
                                        placeholder="Örn: Ocak 2026"
                                    />
                                </div>

                                {/* Amount */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Tutar (₺)</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
                                        value={newPayment.amount}
                                        onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                                        placeholder="2500"
                                    />
                                </div>

                                {/* Due Date */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Son Ödeme Tarihi</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
                                        value={newPayment.due_date}
                                        onChange={(e) => setNewPayment({ ...newPayment, due_date: e.target.value })}
                                    />
                                </div>

                                {/* Status */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Durum</label>
                                    <select
                                        required
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
                                        value={newPayment.status}
                                        onChange={(e) => setNewPayment({ ...newPayment, status: e.target.value })}
                                    >
                                        <option value="Bekliyor">Bekliyor</option>
                                        <option value="Ödendi">Ödendi</option>
                                        <option value="Gecikmiş">Gecikmiş</option>
                                    </select>
                                </div>

                                {/* Payment Method */}
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-medium text-slate-700">Ödeme Yöntemi</label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
                                        value={newPayment.payment_method}
                                        onChange={(e) => setNewPayment({ ...newPayment, payment_method: e.target.value })}
                                    >
                                        <option value="">Seçiniz (İsteğe Bağlı)</option>
                                        <option value="Kredi Kartı">Kredi Kartı</option>
                                        <option value="Havale/EFT">Havale/EFT</option>
                                        <option value="Nakit">Nakit</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 bg-secondary text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
                                >
                                    Ödemeyi Kaydet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Student Details Modal (Premium UI) */}
            {
                selectedStudentDetails && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 max-h-[90vh] overflow-y-auto">
                            {/* Header with Background Pattern */}
                            <div className="relative h-32 bg-slate-900 overflow-hidden shrink-0">
                                <div className="absolute inset-0 opacity-20 pointer-events-none">
                                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]"></div>
                                </div>
                                <button
                                    onClick={() => setSelectedStudentDetails(null)}
                                    className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Profile Section */}
                            <div className="relative px-12 -mt-16 pb-12 flex flex-col items-center">
                                <div className="relative">
                                    <div className="w-32 h-32 rounded-full border-4 border-white bg-slate-800 flex items-center justify-center shadow-2xl">
                                        <span className="text-4xl font-black text-white uppercase">
                                            {selectedStudentDetails.full_name?.split(' ').map((n: string) => n[0]).join('') || 'Ö'}
                                        </span>
                                    </div>
                                    <div className="absolute bottom-1 right-1 w-8 h-8 bg-green-500 border-4 border-white rounded-full shadow-lg"></div>
                                </div>

                                <h2 className="mt-6 text-3xl font-black text-slate-900 tracking-tight">{selectedStudentDetails.full_name}</h2>
                                <div className="mt-2 bg-green-50 text-green-700 px-6 py-1.5 rounded-full text-sm font-bold border border-green-100 uppercase tracking-widest shadow-sm">
                                    Aktif Öğrenci
                                </div>

                                {/* Info Grid */}
                                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-12 w-full text-left">
                                    {/* Section 1: Öğrenci Bilgileri */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                                            <span className="text-xl">🎒</span>
                                            <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Öğrenci Bilgileri</h3>
                                        </div>
                                        <dl className="space-y-4">
                                            <div className="flex justify-between items-center group">
                                                <dt className="text-sm font-medium text-slate-400">Sınıf:</dt>
                                                <dd className="text-sm font-black text-slate-900">{selectedStudentDetails.grade || 'Belirtilmedi'}</dd>
                                            </div>
                                            <div className="flex justify-between items-center group">
                                                <dt className="text-sm font-medium text-slate-400">Kan Grubu:</dt>
                                                <dd className="text-sm font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">{selectedStudentDetails.blood_group || 'Belirtilmedi'}</dd>
                                            </div>
                                            <div className="flex justify-between items-center group">
                                                <dt className="text-sm font-medium text-slate-400">Alerji:</dt>
                                                <dd className="text-sm font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">{selectedStudentDetails.allergies || 'Yok'}</dd>
                                            </div>
                                            <div className="flex justify-between items-center group">
                                                <dt className="text-sm font-medium text-slate-400">Kayıt Tarihi:</dt>
                                                <dd className="text-sm font-black text-slate-900">{formatDate(new Date(selectedStudentDetails.registration_date || selectedStudentDetails.created_at || new Date()))}</dd>
                                            </div>
                                        </dl>
                                    </div>

                                    {/* Section 2: Veli Bilgileri */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                                            <span className="text-xl">👪</span>
                                            <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Veli Bilgileri</h3>
                                        </div>
                                        <dl className="space-y-4">
                                            <div className="flex justify-between items-center group">
                                                <dt className="text-sm font-medium text-slate-400">Veli:</dt>
                                                <dd className="text-sm font-black text-slate-900">{selectedStudentDetails.parent_name || 'Yok'}</dd>
                                            </div>
                                            <div className="flex justify-between items-center group">
                                                <dt className="text-sm font-medium text-slate-400">Telefon:</dt>
                                                <dd className="text-sm font-black text-slate-900">
                                                    <a href={`tel:${selectedStudentDetails.parent_phone}`} className="hover:text-blue-600 transition-colors">
                                                        {selectedStudentDetails.parent_phone || 'Yok'}
                                                    </a>
                                                </dd>
                                            </div>
                                            <div className="flex flex-col gap-2 pt-2">
                                                <dt className="text-sm font-medium text-slate-400 flex items-center gap-2">
                                                    Adres:
                                                </dt>
                                                <dd className="text-sm text-slate-800 leading-relaxed flex items-start gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 font-medium italic">
                                                    {selectedStudentDetails.address || 'Adres Belirtilmemiş'}
                                                    {(selectedStudentDetails.home_latitude && selectedStudentDetails.home_longitude) ? (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setIsLocationModalOpen(true);
                                                            }}
                                                            className="shrink-0 p-1.5 bg-white shadow-sm border border-slate-200 rounded-lg text-red-500 hover:scale-110 active:scale-95 transition-all"
                                                            title="Haritada Göster"
                                                        >
                                                            <MapPin size={16} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="shrink-0 p-1.5 bg-slate-100 shadow-sm border border-slate-200 rounded-lg text-slate-400 cursor-not-allowed"
                                                            title="Konum bilgisi yok"
                                                            disabled
                                                        >
                                                            <MapPin size={16} />
                                                        </button>
                                                    )}
                                                </dd>
                                            </div>
                                        </dl>
                                    </div>

                                    {/* Section 3: Servis Bilgileri */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                                            <span className="text-xl">🚌</span>
                                            <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Servis Bilgileri</h3>
                                        </div>
                                        <dl className="space-y-6">
                                            <div className="flex flex-col gap-2 group">
                                                <dt className="text-sm font-medium text-slate-400">Güzergah (Etiketler):</dt>
                                                <dd className="flex flex-wrap gap-2">
                                                    {selectedStudentDetails.tags && selectedStudentDetails.tags.length > 0 ? (
                                                        selectedStudentDetails.tags.map((tag: string, idx: number) => (
                                                            <span key={idx} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-md shadow-blue-200">
                                                                {tag}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">Etiket Yok</span>
                                                    )}
                                                </dd>
                                            </div>
                                            <div className="flex justify-between items-center group bg-slate-50 p-3 rounded-2xl border border-dashed border-slate-200">
                                                <dt className="text-xs font-bold text-slate-500">Araç Plakası:</dt>
                                                <dd className="text-sm font-black text-blue-700">{selectedStudentDetails.vehicles?.plate_number || 'Atanmadı'}</dd>
                                            </div>
                                            {selectedStudentDetails.vehicles?.plate_number && (
                                                <div className="flex justify-between items-center group bg-slate-50 p-3 rounded-2xl border border-dashed border-slate-200">
                                                    <dt className="text-xs font-bold text-slate-500">Sorumlu Şoför:</dt>
                                                    <dd className="text-sm font-black text-slate-700">{selectedStudentDetails.vehicles?.driver_name || 'Bilinmiyor'}</dd>
                                                </div>
                                            )}
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Location View Modal */}
            {
                isLocationModalOpen && selectedStudentDetails && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl w-full max-w-4xl h-[600px] shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-sm">
                                            {selectedStudentDetails.full_name}
                                        </span>
                                        <span>Konumu</span>
                                    </h3>
                                    <p className="text-slate-500 text-sm">
                                        {selectedStudentDetails.address || 'Adres bilgisi yok'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsLocationModalOpen(false)}
                                    className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="flex-1 relative overflow-hidden rounded-b-2xl">
                                <MapScene
                                    className="w-full h-full"
                                    markers={[{
                                        id: selectedStudentDetails.id,
                                        title: selectedStudentDetails.full_name,
                                        position: [selectedStudentDetails.home_longitude, selectedStudentDetails.home_latitude] as [number, number],
                                        type: 'student_home' as const
                                    }]}
                                />
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Payments;
