import React, { useState } from 'react';
import { Plus, Search, Filter, X, Users, Printer, Phone, MessageSquare, School } from 'lucide-react';
import VehicleList, { type Vehicle } from '../components/dashboard/VehicleList';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import MapScene from '../components/map/MapScene';



const Vehicles: React.FC = () => {
    const { profile } = useAuth();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [loading, setLoading] = useState(true);
    const [drivers, setDrivers] = useState<any[]>([]);

    // Location Modal State
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [selectedVehicleForLocation, setSelectedVehicleForLocation] = useState<Vehicle | null>(null);

    // Student List Modal State
    const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
    const [selectedVehicleForStudents, setSelectedVehicleForStudents] = useState<Vehicle | null>(null);
    const [vehicleStudents, setVehicleStudents] = useState<any[]>([]);
    const [loadingVehicleStudents, setLoadingVehicleStudents] = useState(false);
    const [studentSearchTerm, setStudentSearchTerm] = useState('');

    // Form State
    const [formData, setFormData] = useState<Partial<Vehicle>>({});

    React.useEffect(() => {
        fetchVehicles();
        fetchDrivers();
    }, []);

    const fetchDrivers = async () => {
        const { data } = await supabase.from('drivers').select('id, full_name, phone').eq('status', 'active');
        if (data) setDrivers(data);
    };

    const fetchVehicles = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('vehicles').select('*').order('plate_number');

        // Fetch student count per vehicle
        const { data: studentCounts } = await supabase
            .from('students')
            .select('vehicle_id')
            .not('vehicle_id', 'is', null)
            .neq('status', 'pending');

        const countMap: Record<string, number> = {};
        studentCounts?.forEach(s => {
            if (s.vehicle_id) {
                countMap[s.vehicle_id] = (countMap[s.vehicle_id] || 0) + 1;
            }
        });

        if (data) {
            setVehicles(data.map((v: any) => ({
                id: v.id,
                plate: v.plate_number,
                driver: v.driver_name || '',
                driver_id: v.driver_id,
                capacity: v.capacity || 16,
                status: v.status || 'active',
                student_count: countMap[v.id] || 0,
                location: v.current_latitude && v.current_longitude ? `${v.current_latitude.toFixed(4)}, ${v.current_longitude.toFixed(4)}` : 'Konum Yok',
                current_latitude: v.current_latitude,
                current_longitude: v.current_longitude
            })));
        }
        if (error) console.error('Error fetching vehicles:', error);
        setLoading(false);
    };

    const handleShowStudents = async (vehicle: Vehicle) => {
        setSelectedVehicleForStudents(vehicle);
        setIsStudentsModalOpen(true);
        setLoadingVehicleStudents(true);
        setStudentSearchTerm('');

        try {
            const { data, error } = await supabase
                .from('students')
                .select('id, full_name, parent_name, parent_phone, school_level, grade, neighborhood, address, schools(name)')
                .eq('vehicle_id', vehicle.id)
                .neq('status', 'pending')
                .order('full_name');

            if (error) throw error;
            setVehicleStudents(data || []);
        } catch (err) {
            console.error('Error fetching vehicle students:', err);
        } finally {
            setLoadingVehicleStudents(false);
        }
    };

    // Real-time subscription
    React.useEffect(() => {
        const channel = supabase
            .channel('public:vehicles_list')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'vehicles' },
                (payload) => {
                    console.log("Real-time update received:", payload);
                    const updatedVehicle = payload.new;

                    setVehicles(prev => prev.map(v => {
                        if (v.id === updatedVehicle.id) {
                            return {
                                ...v,
                                plate: updatedVehicle.plate_number,
                                driver: updatedVehicle.driver_name || '',
                                driver_id: updatedVehicle.driver_id,
                                capacity: updatedVehicle.capacity || 16,
                                status: updatedVehicle.status || 'active',
                                location: updatedVehicle.current_latitude && updatedVehicle.current_longitude
                                    ? `${updatedVehicle.current_latitude.toFixed(4)}, ${updatedVehicle.current_longitude.toFixed(4)}`
                                    : 'Konum Yok',
                                current_latitude: updatedVehicle.current_latitude,
                                current_longitude: updatedVehicle.current_longitude
                            };
                        }
                        return v;
                    }));

                    // Update selected vehicle if it's the one being tracked
                    setSelectedVehicleForLocation(prev => {
                        if (prev && prev.id === updatedVehicle.id) {
                            return {
                                ...prev,
                                current_latitude: updatedVehicle.current_latitude,
                                current_longitude: updatedVehicle.current_longitude,
                                // Update other fields if necessary
                            };
                        }
                        return prev;
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleAddClick = () => {
        setEditingVehicle(null);
        setFormData({ status: 'active', capacity: 16 });
        setIsModalOpen(true);
    };

    const handleEditClick = (vehicle: Vehicle) => {
        setEditingVehicle(vehicle);
        setFormData(vehicle);
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (id: string) => {
        if (!window.confirm('Bu aracı silmek istediğinize emin misiniz?')) return;

        const { error } = await supabase.from('vehicles').delete().eq('id', id);
        if (error) {
            console.error('Error deleting vehicle:', error);
            if (error.code === '23503' || error.message?.includes('foreign key constraint')) {
                alert('Silme Başarısız: Bu araç şu anda rotalara veya öğrencilere atanmış durumda. Aracı silmek için önce atanmış rotaları silmeli veya değiştirmelisiniz.');
            } else {
                alert('Araç silinirken hata oluştu: ' + error.message);
            }
        } else {
            setVehicles(prev => prev.filter(v => v.id !== id));
        }
    };

    const handleShowLocation = (vehicle: Vehicle) => {
        if (!vehicle.current_latitude || !vehicle.current_longitude) {
            alert('Bu araç için konum bilgisi bulunamadı.');
            return;
        }
        setSelectedVehicleForLocation(vehicle);
        setIsLocationModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const selectedDriverObj = drivers.find(d => d.id === formData.driver_id);

            const vehicleData = {
                company_id: profile?.company_id,
                plate_number: formData.plate,
                driver_name: formData.driver || null,
                driver_phone: selectedDriverObj ? selectedDriverObj.phone : null,
                driver_id: formData.driver_id || null,
                capacity: formData.capacity || 16,
                status: formData.status || 'active'
            };

            if (editingVehicle) {
                // Update
                const { error } = await supabase.from('vehicles').update(vehicleData).eq('id', editingVehicle.id);
                if (error) throw error;
            } else {
                // Create
                const { error } = await supabase.from('vehicles').insert([vehicleData]);
                if (error) throw error;
            }

            await fetchVehicles();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving vehicle:', error);
            alert('İşlem sırasında bir hata oluştu.');
        }
    };

    const filteredVehicles = vehicles.filter(v => {
        const plateStr = v.plate ? v.plate.toLowerCase() : '';
        const driverStr = v.driver ? v.driver.toLowerCase() : '';
        const search = searchTerm.toLowerCase();
        
        return plateStr.includes(search) || driverStr.includes(search);
    });

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Araç Yönetimi</h1>
                    <p className="text-slate-500">Filodaki tüm araçları yönetin ve takip edin.</p>
                </div>
                <button
                    onClick={handleAddClick}
                    className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-white rounded-xl hover:bg-blue-600 transition-colors font-medium shadow-sm hover:shadow-md"
                >
                    <Plus size={20} />
                    Yeni Araç Ekle
                </button>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Plaka veya sürücü ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium">
                    <Filter size={18} />
                    Filtrele
                </button>
            </div>

            {/* Vehicle List */}
            {loading ? (
                <div className="text-center py-10 text-slate-500">Yükleniyor...</div>
            ) : (
                <VehicleList
                    vehicles={filteredVehicles}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                    onShowLocation={handleShowLocation}
                    onShowStudents={handleShowStudents}
                />
            )}

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-800">
                                {editingVehicle ? 'Aracı Düzenle' : 'Yeni Araç Ekle'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Plaka</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-secondary"
                                    value={formData.plate || ''}
                                    onChange={e => setFormData({ ...formData, plate: e.target.value })}
                                    placeholder="34 ABC 123"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Sürücü</label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-secondary"
                                    value={formData.driver || ''}
                                    onChange={e => {
                                        const selectedDriver = drivers.find(d => d.full_name === e.target.value);
                                        setFormData({
                                            ...formData,
                                            driver: e.target.value || undefined,
                                            driver_id: selectedDriver?.id || undefined
                                        });
                                    }}
                                >
                                    <option value="">Sürücü Atanmadı (İsteğe Bağlı)</option>
                                    {drivers.map(driver => (
                                        <option key={driver.id} value={driver.full_name}>
                                            {driver.full_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Kapasite</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-secondary"
                                        value={formData.capacity || ''}
                                        onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Durum</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-secondary appearance-none bg-white"
                                        value={formData.status || 'active'}
                                        onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                    >
                                        <option value="active">Aktif</option>
                                        <option value="maintenance">Bakımda</option>
                                        <option value="out_of_service">Servis Dışı</option>
                                        <option value="inactive">Pasif</option>
                                    </select>
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 bg-secondary text-white rounded-xl font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-100"
                                >
                                    {editingVehicle ? 'Güncelle' : 'Kaydet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Location View Modal */}
            {isLocationModalOpen && selectedVehicleForLocation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-4xl h-[600px] shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-sm">{selectedVehicleForLocation.plate}</span>
                                    <span>Konumu</span>
                                </h3>
                                <p className="text-slate-500 text-sm">{selectedVehicleForLocation.driver}</p>
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
                                    id: selectedVehicleForLocation.id,
                                    title: selectedVehicleForLocation.plate,
                                    position: [selectedVehicleForLocation.current_longitude!, selectedVehicleForLocation.current_latitude!] as [number, number],
                                    type: 'vehicle' as const
                                }]}
                            />
                        </div>
                    </div>
                </div>
            )}
            {/* Student List Modal */}
            {isStudentsModalOpen && selectedVehicleForStudents && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200 overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-slate-100 flex flex-wrap justify-between items-center bg-slate-50/80 gap-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="bg-blue-600 text-white font-black px-3 py-1 rounded-xl text-base tracking-wide shadow-sm">
                                        {selectedVehicleForStudents.plate}
                                    </span>
                                    <h3 className="text-lg font-bold text-slate-800">Taşınan Yolcu / Öğrenci Listesi</h3>
                                </div>
                                <p className="text-slate-500 text-xs mt-1 font-medium flex items-center gap-2">
                                    <span>Sürücü: <strong>{selectedVehicleForStudents.driver || 'Atanmadı'}</strong></span>
                                    <span>•</span>
                                    <span>Kapasite: <strong>{selectedVehicleForStudents.capacity} Kişilik</strong></span>
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => window.print()}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-xs font-bold shadow-sm"
                                    title="Listeyi Yazdır"
                                >
                                    <Printer size={15} />
                                    <span>Yazdır</span>
                                </button>
                                <button
                                    onClick={() => setIsStudentsModalOpen(false)}
                                    className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Search & Stats Bar */}
                        <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-center gap-3">
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Öğrenci, veli veya okul ara..."
                                    value={studentSearchTerm}
                                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="px-3 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-xl border border-blue-100">
                                    Toplam: {vehicleStudents.length} Öğrenci
                                </span>
                                <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold rounded-xl border border-emerald-100">
                                    Doluluk: %{Math.min(100, Math.round((vehicleStudents.length / (selectedVehicleForStudents.capacity || 1)) * 100))}
                                </span>
                            </div>
                        </div>

                        {/* Student List Content */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {loadingVehicleStudents ? (
                                <div className="text-center py-12 text-slate-500 font-medium">Öğrenciler yükleniyor...</div>
                            ) : vehicleStudents.length === 0 ? (
                                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <Users className="mx-auto text-slate-300 mb-2" size={40} />
                                    <p className="text-slate-600 font-bold">Bu araca henüz öğrenci atanmamış.</p>
                                    <p className="text-slate-400 text-xs mt-1">Öğrenciler sayfasından öğrencilere bu aracı tanımlayabilirsiniz.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                                                <th className="p-3">#</th>
                                                <th className="p-3">Öğrenci Adı Soyadı</th>
                                                <th className="p-3">Okul / Sınıf</th>
                                                <th className="p-3">Veli Bilgisi</th>
                                                <th className="p-3">Mahalle / Adres</th>
                                                <th className="p-3 text-right">İletişim</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs">
                                            {vehicleStudents
                                                .filter(s => {
                                                    const term = studentSearchTerm.toLowerCase();
                                                    return (
                                                        (s.full_name || '').toLowerCase().includes(term) ||
                                                        (s.parent_name || '').toLowerCase().includes(term) ||
                                                        (s.neighborhood || '').toLowerCase().includes(term) ||
                                                        (s.schools?.name || '').toLowerCase().includes(term)
                                                    );
                                                })
                                                .map((s, index) => (
                                                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                                                        <td className="p-3 text-slate-400 font-medium">{index + 1}</td>
                                                        <td className="p-3 font-bold text-slate-800">{s.full_name}</td>
                                                        <td className="p-3">
                                                            <div className="font-semibold text-slate-700 flex items-center gap-1">
                                                                <School size={13} className="text-slate-400" />
                                                                <span>{s.schools?.name || s.school_level || 'Okul Belirtilmedi'}</span>
                                                            </div>
                                                            {s.grade && <span className="text-[11px] text-slate-400 font-medium">{s.grade}</span>}
                                                        </td>
                                                        <td className="p-3">
                                                            <div className="font-medium text-slate-700">{s.parent_name || 'Belirtilmedi'}</div>
                                                            <div className="text-[11px] text-slate-400">{s.parent_phone || ''}</div>
                                                        </td>
                                                        <td className="p-3 max-w-[200px] truncate text-slate-600">
                                                            {s.neighborhood && <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold mr-1">{s.neighborhood}</span>}
                                                            <span className="text-slate-500">{s.address}</span>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            {s.parent_phone && (
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <a
                                                                        href={`tel:${s.parent_phone}`}
                                                                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                                                                        title="Ara"
                                                                    >
                                                                        <Phone size={14} />
                                                                    </a>
                                                                    <a
                                                                        href={`https://wa.me/90${s.parent_phone.replace(/\D/g, '')}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors"
                                                                        title="WhatsApp Mesaj Gönder"
                                                                    >
                                                                        <MessageSquare size={14} />
                                                                    </a>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Vehicles;
