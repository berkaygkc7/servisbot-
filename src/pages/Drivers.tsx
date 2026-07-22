import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Filter, X, Loader2, Calendar as CalendarIcon, Users } from 'lucide-react';
import DriverList, { type Driver } from '../components/dashboard/DriverList';
import DriverLeaveCalendar, { type DriverLeave } from '../components/dashboard/DriverLeaveCalendar';
import LeaveModal from '../components/dashboard/LeaveModal';
import DriverLeavesModal from '../components/dashboard/DriverLeavesModal';
import QrCodeModal from '../components/shared/QrCodeModal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { isWithinInterval, parseISO, format, isAfter } from 'date-fns';
import { tr } from 'date-fns/locale';

const Drivers: React.FC = () => {
    const { profile, loading: authLoading } = useAuth();
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [leaves, setLeaves] = useState<DriverLeave[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Leave Modal State
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // Driver Leaves History Modal
    const [isDriverLeavesModalOpen, setIsDriverLeavesModalOpen] = useState(false);
    const [selectedDriverForLeaves, setSelectedDriverForLeaves] = useState<Driver | null>(null);

    // QR Modal State
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [selectedQrDriver, setSelectedQrDriver] = useState<Driver | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Driver>>({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [driversRes, leavesRes] = await Promise.all([
                supabase.from('drivers').select('*').order('full_name'),
                supabase.from('driver_leaves').select('*').order('start_date')
            ]);

            if (driversRes.data) setDrivers(driversRes.data);

            if (leavesRes.data && driversRes.data) {
                // Enrich leaves with driver names
                const enrichedLeaves = leavesRes.data.map(leave => ({
                    ...leave,
                    driver_name: driversRes.data.find(d => d.id === leave.driver_id)?.full_name || 'Bilinmeyen Şoför'
                }));
                setLeaves(enrichedLeaves);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddClick = () => {
        setEditingDriver(null);
        setFormData({ status: 'active' });
        setIsModalOpen(true);
    };

    const handleEditClick = (driver: Driver) => {
        setEditingDriver(driver);
        setFormData(driver);
        setIsModalOpen(true);
    };

    const handleShowQr = (driver: Driver) => {
        setSelectedQrDriver(driver);
        setIsQrModalOpen(true);
    };

    const handleDeleteClick = async (id: string) => {
        const { error } = await supabase.from('drivers').delete().eq('id', id);
        if (error) {
            console.error('Error deleting driver:', error);
            if (error.code === '23503' || error.message?.includes('foreign key constraint')) {
                alert('Silme Başarısız: Bu şoför şu anda bir araca atanmış durumda. Silmek için önce şoförü "Araçlar" menüsünden veya sistemden çıkarmalısınız.');
            } else {
                alert('Şoför silinirken hata oluştu: ' + error.message);
            }
        } else {
            setDrivers(prev => prev.filter(d => d.id !== id));
            // Also clean up any leaves for this driver
            setLeaves(prev => prev.filter(l => l.driver_id !== id));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (authLoading) {
            alert('Oturum bilgileri henüz yükleniyor, lütfen birkaç saniye sonra tekrar deneyin.');
            setIsSubmitting(false);
            return;
        }

        if (!profile?.company_id) {
            alert('Profil bilgileriniz bulunamadı. Veri tabanını sıfırladıysanız lütfen tekrar kayıt (Registration) yaparak profilinizi oluşturun.');
            setIsSubmitting(false);
            return;
        }

        try {
            const driverData = {
                company_id: profile.company_id,
                full_name: formData.full_name,
                phone: formData.phone,
                blood_group: formData.blood_group,
                status: editingDriver ? formData.status : 'active'
            };

            if (editingDriver) {
                const { error } = await supabase.from('drivers').update(driverData).eq('id', editingDriver.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('drivers').insert([driverData]);
                if (error) throw error;
            }

            await fetchData();
            setIsModalOpen(false);
        } catch (error: any) {
            console.error('Error saving driver:', error);
            alert(`İşlem sırasında bir hata oluştu: ${error.message || 'Bilinmeyen hata'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveLeave = async (leaveData: { driver_id: string; start_date: string; end_date: string; reason: string }) => {
        if (!profile?.company_id) {
            alert('Şirket bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
            return;
        }
        try {
            const { error } = await supabase.from('driver_leaves').insert([{
                ...leaveData,
                company_id: profile.company_id
            }]);

            if (error) throw error;
            await fetchData();
        } catch (error) {
            console.error('Error saving leave:', error);
            throw error;
        }
    };

    const handleDeleteLeave = async (id: string) => {
        if (!window.confirm('Bu izin kaydını silmek istediğinize emin misiniz?')) return;

        try {
            const { error } = await supabase.from('driver_leaves').delete().eq('id', id);
            if (error) throw error;
            await fetchData();
        } catch (error) {
            console.error('Error deleting leave:', error);
            alert('İzin silinirken bir hata oluştu.');
        }
    };

    const handleViewLeaves = (driver: Driver) => {
        setSelectedDriverForLeaves(driver);
        setIsDriverLeavesModalOpen(true);
    };

    const handleDateClick = (date: Date) => {
        setSelectedDate(date);
        setIsLeaveModalOpen(true);
    };

    const filteredDrivers = useMemo(() => {
        const today = new Date();
        return drivers
            .map(driver => {
                const driverLeaves = leaves.filter(l => l.driver_id === driver.id);
                let isOnLeave = false;
                let next_leave: string | undefined = undefined;

                // Sort leaves by start date
                const sortedLeaves = driverLeaves.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

                for (const leave of sortedLeaves) {
                    const start = parseISO(leave.start_date);
                    const end = parseISO(leave.end_date);
                    
                    if (isWithinInterval(today, { start, end })) {
                        isOnLeave = true;
                        next_leave = `${format(start, 'd MMM', { locale: tr })} - ${format(end, 'd MMM yyyy', { locale: tr })}${leave.reason ? ` (${leave.reason})` : ''}`;
                        break;
                    } else if (isAfter(start, today) && !next_leave) {
                        next_leave = `${format(start, 'd MMM', { locale: tr })} - ${format(end, 'd MMM yyyy', { locale: tr })}${leave.reason ? ` (${leave.reason})` : ''}`;
                    }
                }

                return {
                    ...driver,
                    status: isOnLeave ? 'on_leave' : driver.status,
                    next_leave
                } as Driver;
            })
            .filter(d =>
                d.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (d.phone && d.phone.includes(searchTerm))
            );
    }, [drivers, leaves, searchTerm]);

    const leavesOnSelectedDate = useMemo(() => {
        if (!selectedDate) return [];
        return leaves.filter(leave =>
            isWithinInterval(selectedDate, {
                start: parseISO(leave.start_date),
                end: parseISO(leave.end_date)
            })
        );
    }, [selectedDate, leaves]);

    if (authLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="animate-spin text-secondary" size={48} />
                <p className="text-lg font-bold text-slate-400 animate-pulse">Oturum Bilgileri Doğrulanıyor...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Şoför Bilgi Sistemi</h1>
                    <p className="text-slate-500 font-medium">Sürücü kadrosu ve çalışma takvimini buradan yönetin.</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick={() => setIsLeaveModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all font-bold shadow-sm"
                    >
                        <CalendarIcon size={20} strokeWidth={2.5} className="text-amber-500" />
                        İzin Ekle
                    </button>
                    <button
                        onClick={handleAddClick}
                        className="flex items-center gap-2 px-6 py-3 bg-secondary text-white rounded-2xl hover:bg-blue-600 transition-all font-bold shadow-xl shadow-blue-100 hover:shadow-blue-200"
                    >
                        <Plus size={20} strokeWidth={3} />
                        Yeni Şoför Ekle
                    </button>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* Left Column: Calendar & Stats */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Stats Summary Area */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                                <Users size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-black text-slate-800">{drivers.length}</div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Toplam Şoför</div>
                            </div>
                        </div>
                        <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                            </div>
                            <div>
                                <div className="text-2xl font-black text-slate-800">{drivers.filter(d => d.status === 'active').length}</div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aktif Görevde</div>
                            </div>
                        </div>
                        <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                                <CalendarIcon size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-black text-slate-800">
                                    {leaves.filter(l => isWithinInterval(new Date(), { start: parseISO(l.start_date), end: parseISO(l.end_date) })).length}
                                </div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bugün İzinli</div>
                            </div>
                        </div>
                    </div>

                    {/* Calendar Card */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden min-h-[700px]">
                        <DriverLeaveCalendar
                            leaves={leaves}
                            onDateClick={handleDateClick}
                        />
                    </div>
                </div>

                {/* Right Column: Driver List */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/50 flex flex-col h-[850px]">
                        <div className="p-6 border-b border-slate-100">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-black text-slate-800">Şoför Listesi</h2>
                                <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold">
                                    {filteredDrivers.length} Sürücü
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="İsim veya telefon ara..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50/50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-secondary/5 focus:border-secondary transition-all font-medium"
                                    />
                                </div>
                                <button className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all flex items-center justify-center" title="Filtrele">
                                    <Filter size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 className="animate-spin text-secondary" size={32} />
                                    <p className="text-sm font-bold text-slate-400 animate-pulse">Veriler Hazırlanıyor...</p>
                                </div>
                            ) : filteredDrivers.length === 0 ? (
                                <div className="text-center py-20 px-6">
                                    <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                                        <Users size={32} />
                                    </div>
                                    <p className="text-slate-500 font-bold">Aradığınız kriterde şoför bulunamadı.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <DriverList
                                        drivers={filteredDrivers}
                                        onEdit={handleEditClick}
                                        onDelete={handleDeleteClick}
                                        onViewLeaves={handleViewLeaves}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
                    <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-300 overflow-hidden">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                                    {editingDriver ? 'Profil Düzenle' : 'Yeni Kayıt'}
                                </h3>
                                <p className="text-sm font-medium text-slate-500">Şoför bilgilerini detaylıca girin.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 border border-slate-100 rounded-2xl text-slate-400 hover:text-slate-600 transition-all hover:bg-white">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-500 ml-1 uppercase tracking-wider">Ad Soyad</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-secondary/5 focus:border-secondary transition-all font-semibold text-slate-800"
                                    value={formData.full_name || ''}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                    placeholder="Örn: Ahmet Yılmaz"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-500 ml-1 uppercase tracking-wider">İletişim Numarası</label>
                                <input
                                    type="tel"
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-secondary/5 focus:border-secondary transition-all font-semibold text-slate-800"
                                    value={formData.phone || ''}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="05XX XXX XX XX"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-500 ml-1 uppercase tracking-wider">Kan Grubu</label>
                                <select
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-secondary/5 focus:border-secondary transition-all font-bold text-red-600 appearance-none"
                                    value={formData.blood_group || ''}
                                    onChange={e => setFormData({ ...formData, blood_group: e.target.value })}
                                >
                                    <option value="">Seçiniz</option>
                                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'].map(group => (
                                        <option key={group} value={group}>{group}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="pt-6 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-4 border border-slate-100 rounded-2xl text-slate-500 font-bold hover:bg-slate-50 transition-all active:scale-95"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-4 bg-secondary text-white rounded-2xl font-black hover:bg-blue-600 transition-all shadow-xl shadow-blue-100 hover:shadow-blue-200 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                                    {editingDriver ? 'Değişiklikleri Kaydet' : 'Sürücüyü Tanımla'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <LeaveModal
                isOpen={isLeaveModalOpen}
                onClose={() => setIsLeaveModalOpen(false)}
                selectedDate={selectedDate}
                drivers={drivers}
                onSave={handleSaveLeave}
                existingLeaves={leavesOnSelectedDate}
                onDelete={handleDeleteLeave}
            />

            {/* Driver Leaves History Modal */}
            <DriverLeavesModal
                isOpen={isDriverLeavesModalOpen}
                onClose={() => setIsDriverLeavesModalOpen(false)}
                driver={selectedDriverForLeaves}
                leaves={leaves}
                onDeleteLeave={handleDeleteLeave}
                onAddLeaveClick={(driver) => {
                    setSelectedDate(new Date());
                    setIsLeaveModalOpen(true);
                }}
            />

            {/* QR Code Modal for Login */}
            {selectedQrDriver && (
                <QrCodeModal
                    isOpen={isQrModalOpen}
                    onClose={() => setIsQrModalOpen(false)}
                    token={selectedQrDriver.login_token || '12345678-1234-1234-1234-123456789abc'}
                    type="driver"
                    userName={selectedQrDriver.full_name}
                />
            )}
        </div>
    );
};

export default Drivers;

