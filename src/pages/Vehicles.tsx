import React, { useState } from 'react';
import { Plus, Search, Filter, X } from 'lucide-react';
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
        if (data) {
            setVehicles(data.map((v: any) => ({
                id: v.id,
                plate: v.plate_number,
                driver: v.driver_name || '',
                driver_id: v.driver_id,
                capacity: v.capacity || 16,
                status: v.status || 'active',
                location: v.current_latitude && v.current_longitude ? `${v.current_latitude.toFixed(4)}, ${v.current_longitude.toFixed(4)}` : 'Konum Yok',
                current_latitude: v.current_latitude,
                current_longitude: v.current_longitude
            })));
        }
        if (error) console.error('Error fetching vehicles:', error);
        setLoading(false);
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
                driver_name: formData.driver,
                driver_phone: selectedDriverObj ? selectedDriverObj.phone : null,
                driver_id: formData.driver_id,
                capacity: formData.capacity,
                status: formData.status
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
                                    required
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-secondary"
                                    value={formData.driver || ''}
                                    onChange={e => {
                                        const selectedDriver = drivers.find(d => d.full_name === e.target.value);
                                        setFormData({
                                            ...formData,
                                            driver: e.target.value,
                                            driver_id: selectedDriver?.id
                                        });
                                    }}
                                >
                                    <option value="">Sürücü Seçin</option>
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
        </div>
    );
};

export default Vehicles;
