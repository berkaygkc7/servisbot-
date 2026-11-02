import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Filter, X, Users, Printer, Phone, MessageSquare, School, Share2, Download, FileSpreadsheet } from 'lucide-react';
import { saveAs } from 'file-saver';
import VehicleList, { type Vehicle } from '../components/dashboard/VehicleList';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import MapScene, { MapFallback } from '../components/map/MapScene';
import VehicleProfileModal from '../components/VehicleProfileModal';
import { preloadRoute } from '../utils/routePreloader';
import { useVehiclesQuery } from '../hooks/queries/useVehiclesQuery';



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
    const [vehicleShiftFilter, setVehicleShiftFilter] = useState<'all' | 'sabah' | 'oglen'>('all');
    const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('all');

    // Profile Modal State
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [selectedVehicleProfile, setSelectedVehicleProfile] = useState<Vehicle | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Vehicle>>({});

    const { data: driversData = [] } = useQuery({
        queryKey: ['drivers', profile?.company_id],
        queryFn: async () => {
            const { data } = await supabase.from('drivers').select('id, full_name, phone').eq('status', 'active');
            return data || [];
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 1000 * 60 * 60 * 24,
    });

    React.useEffect(() => {
        if (driversData.length > 0) setDrivers(driversData);
    }, [driversData]);

    const {
        vehicles: vehiclesData,
        isLoading: isVehiclesLoading,
        invalidateVehicles
    } = useVehiclesQuery();

    React.useEffect(() => {
        if (vehiclesData) {
            setVehicles(vehiclesData);
            setLoading(false);
        }
    }, [vehiclesData]);

    React.useEffect(() => {
        setLoading(isVehiclesLoading);
    }, [isVehiclesLoading]);

    const fetchVehicles = async () => {
        await invalidateVehicles();
    };

    const handleShowStudents = async (vehicle: Vehicle) => {
        setSelectedVehicleForStudents(vehicle);
        setIsStudentsModalOpen(true);
        setLoadingVehicleStudents(true);
        setStudentSearchTerm('');
        setSelectedSchoolFilter('all');

        try {
            const { data, error } = await supabase
                .from('students')
                .select('id, full_name, parent_name, parent_phone, parent_tc, school_level, grade, neighborhood, address, schools(id, name), shift, blood_group')
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

    const handleShareStudents = async () => {
        if (!selectedVehicleForStudents) return;

        const filtered = vehicleStudents.filter(s => {
            const term = studentSearchTerm.toLowerCase();
            const matchesSearch = (
                (s.full_name || '').toLowerCase().includes(term) ||
                (s.parent_name || '').toLowerCase().includes(term) ||
                (s.neighborhood || '').toLowerCase().includes(term) ||
                (s.schools?.name || '').toLowerCase().includes(term)
            );
            const matchesShift = vehicleShiftFilter === 'all' || 
                (vehicleShiftFilter === 'sabah' && s.shift === 'Sabahçı') || 
                (vehicleShiftFilter === 'oglen' && s.shift === 'Öğlenci');
            const matchesSchool = selectedSchoolFilter === 'all' || s.schools?.id === selectedSchoolFilter;
            return matchesSearch && matchesShift && matchesSchool;
        });

        const lines = [
            `🚌 ${selectedVehicleForStudents.plate} - TAŞINAN ÖĞRENCİ LİSTESİ`,
            `Sürücü: ${selectedVehicleForStudents.driver || 'Atanmadı'}`,
            `Kapasite: ${selectedVehicleForStudents.capacity} Kişilik (Toplam ${filtered.length} Öğrenci)`,
            `----------------------------------------`,
            ...filtered.map((s, index) => {
                const school = s.schools?.name || s.school_level || 'Okul Belirtilmedi';
                const gradeStr = s.grade ? ` (${s.grade})` : '';
                const parentStr = s.parent_name ? ` - Veli: ${s.parent_name}` : '';
                const phoneStr = s.parent_phone ? ` (${s.parent_phone})` : '';
                const nbrStr = s.neighborhood ? ` [${s.neighborhood}]` : '';
                return `${index + 1}. ${s.full_name}${gradeStr} - ${school}${parentStr}${phoneStr}${nbrStr}`;
            }),
            `----------------------------------------`,
            `ServisBot Otomasyon Sistemi`
        ];

        const shareText = lines.join('\n');

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${selectedVehicleForStudents.plate} Öğrenci Listesi`,
                    text: shareText
                });
                return;
            } catch (err) {
                // fallback to clipboard
            }
        }

        try {
            await navigator.clipboard.writeText(shareText);
            alert('Öğrenci listesi panoya kopyalandı! WhatsApp veya e-postaya yapıştırarak paylaşabilirsiniz.');
        } catch (err) {
            alert('Liste kopyalanamadı.');
        }
    };

    const handlePrintStudents = () => {
        if (!selectedVehicleForStudents) return;

        // Apply same filters as on screen
        const filteredStudents = vehicleStudents.filter(s => {
            const term = studentSearchTerm.toLowerCase();
            const matchesSearch = (
                (s.full_name || '').toLowerCase().includes(term) ||
                (s.parent_name || '').toLowerCase().includes(term) ||
                (s.neighborhood || '').toLowerCase().includes(term) ||
                (s.schools?.name || '').toLowerCase().includes(term)
            );
            const matchesShift = vehicleShiftFilter === 'all' || 
                (vehicleShiftFilter === 'sabah' && s.shift === 'Sabahçı') || 
                (vehicleShiftFilter === 'oglen' && s.shift === 'Öğlenci');
            const matchesSchool = selectedSchoolFilter === 'all' || s.schools?.id === selectedSchoolFilter;
            return matchesSearch && matchesShift && matchesSchool;
        });

        // Store in localStorage for the new window to read
        localStorage.setItem('print_vehicle_data', JSON.stringify({
            vehicle: selectedVehicleForStudents,
            students: filteredStudents
        }));

        // Open new tab (this avoids pop-up blockers as it is triggered directly by user click)
        const printWindow = window.open('/print-preview', '_blank');
        
        if (!printWindow) {
            alert("Yeni sekme açılamadı! Lütfen tarayıcınızın pop-up (açılır pencere) engelleyicisini kapatıp tekrar deneyin.");
        }
    };

    const handleExportExcel = async () => {
        if (!selectedVehicleForStudents) return;
        const XLSX = await import('xlsx');

        const filteredStudents = vehicleStudents.filter(s => {
            const term = studentSearchTerm.toLowerCase();
            const matchesSearch = (
                (s.full_name || '').toLowerCase().includes(term) ||
                (s.parent_name || '').toLowerCase().includes(term) ||
                (s.neighborhood || '').toLowerCase().includes(term) ||
                (s.schools?.name || '').toLowerCase().includes(term)
            );
            const matchesShift = vehicleShiftFilter === 'all' || 
                (vehicleShiftFilter === 'sabah' && s.shift === 'Sabahçı') || 
                (vehicleShiftFilter === 'oglen' && s.shift === 'Öğlenci');
            const matchesSchool = selectedSchoolFilter === 'all' || s.schools?.id === selectedSchoolFilter;
            return matchesSearch && matchesShift && matchesSchool;
        });

        const data = filteredStudents.map((s, index) => ({
            'Sıra': index + 1,
            'Öğrenci Adı Soyadı': s.full_name,
            'Okul': s.schools?.name || s.school_level || '',
            'Veli Adı Soyadı': s.parent_name || '',
            'Veli Telefon': s.parent_phone || ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Öğrenciler');
        
        // Sütun genişliklerini ayarla
        const wscols = [
            { wch: 8 },  // Sıra
            { wch: 30 }, // Öğrenci Adı Soyadı
            { wch: 30 }, // Okul
            { wch: 25 }, // Veli Adı Soyadı
            { wch: 18 }  // Veli Telefon
        ];
        worksheet['!cols'] = wscols;

        XLSX.writeFile(workbook, `${selectedVehicleForStudents.plate}_Ogrenci_Listesi.xlsx`);
    };

    const handleExportDetailedExcel = async () => {
        if (!selectedVehicleForStudents) return;

        const filteredStudents = vehicleStudents.filter(s => {
            const term = studentSearchTerm.toLowerCase();
            const matchesSearch = (
                (s.full_name || '').toLowerCase().includes(term) ||
                (s.parent_name || '').toLowerCase().includes(term) ||
                (s.neighborhood || '').toLowerCase().includes(term) ||
                (s.schools?.name || '').toLowerCase().includes(term)
            );
            const matchesShift = vehicleShiftFilter === 'all' || 
                (vehicleShiftFilter === 'sabah' && s.shift === 'Sabahçı') || 
                (vehicleShiftFilter === 'oglen' && s.shift === 'Öğlenci');
            const matchesSchool = selectedSchoolFilter === 'all' || s.schools?.id === selectedSchoolFilter;
            return matchesSearch && matchesShift && matchesSchool;
        });

        if (filteredStudents.length === 0) {
            alert('Dışa aktarılacak öğrenci bulunamadı.');
            return;
        }

        try {
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            const sheetName = `${selectedVehicleForStudents.plate} Detaylı`.substring(0, 31);
            const worksheet = workbook.addWorksheet(sheetName);

            // Sütun yapılandırması
            worksheet.columns = [
                { key: 'sn', width: 6 },
                { key: 'student_name', width: 28 },
                { key: 'school', width: 32 },
                { key: 'grade', width: 14 },
                { key: 'parent_name', width: 26 },
                { key: 'parent_phone', width: 18 },
                { key: 'parent_tc', width: 16 },
                { key: 'neighborhood', width: 22 },
                { key: 'address', width: 45 },
                { key: 'shift', width: 15 },
                { key: 'blood_group', width: 13 }
            ];

            const calibriFont = (bold = false, size = 10, color = 'FF000000') => ({
                name: 'Calibri',
                size,
                bold,
                color: { argb: color }
            });

            const allThinBorders = {
                top: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
                left: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
                bottom: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
                right: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } }
            };

            // 1. Satır: Başlık Bannerı
            worksheet.mergeCells('A1:K1');
            const titleRow = worksheet.getRow(1);
            titleRow.height = 32;
            const titleCell = worksheet.getCell('A1');
            titleCell.value = `🚌 ${selectedVehicleForStudents.plate} - TAŞINAN ÖĞRENCİ DETAYLI BİLGİ LİSTESİ`;
            titleCell.font = calibriFont(true, 13, 'FFFFFFFF');
            titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
            titleCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1E3A8A' } // Koyu Lacivert / Mavi
            };

            // 2. Satır: Alt Bilgi (Sürücü, Kapasite, Tarih)
            worksheet.mergeCells('A2:K2');
            const subRow = worksheet.getRow(2);
            subRow.height = 22;
            const subCell = worksheet.getCell('A2');
            const driverName = selectedVehicleForStudents.driver || 'Atanmadı';
            subCell.value = `Sürücü: ${driverName}   •   Kapasite: ${selectedVehicleForStudents.capacity} Kişilik   •   Toplam Öğrenci: ${filteredStudents.length}   •   Tarih: ${new Date().toLocaleDateString('tr-TR')}`;
            subCell.font = calibriFont(true, 10, 'FF334155');
            subCell.alignment = { vertical: 'middle', horizontal: 'center' };
            subCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF1F5F9' }
            };

            // 3. Satır: Boşluk
            worksheet.getRow(3).height = 8;

            // 4. Satır: Sütun Başlıkları
            const headerTitles = [
                'S.N',
                'ÖĞRENCİ ADI SOYADI',
                'OKUL',
                'SINIF / KADEME',
                'VELİ ADI SOYADI',
                'VELİ TELEFON',
                'VELİ T.C.',
                'MAHALLE',
                'EV / AÇIK ADRES',
                'SERVİS DEVRİ',
                'KAN GRUBU'
            ];
            const headerRow = worksheet.addRow(headerTitles);
            headerRow.height = 26;
            headerRow.eachCell((cell) => {
                cell.font = calibriFont(true, 10, 'FFFFFFFF');
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF047857' } // Emerald yeşili
                };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FF065F46' } },
                    left: { style: 'thin', color: { argb: 'FF065F46' } },
                    bottom: { style: 'medium', color: { argb: 'FF065F46' } },
                    right: { style: 'thin', color: { argb: 'FF065F46' } }
                };
            });

            // 5+. Satırlar: Öğrenci Verileri
            filteredStudents.forEach((s, idx) => {
                const schoolName = s.schools?.name || s.school_level || '-';
                const gradeStr = s.grade ? `${s.grade}. Sınıf` : (s.school_level || '-');
                const phoneStr = s.parent_phone || '-';
                const shiftStr = s.shift || 'Tam Gün';
                const bloodStr = s.blood_group || '-';
                const tcStr = s.parent_tc || '-';
                const nbrStr = s.neighborhood || '-';
                const addrStr = s.address || '-';

                const rowData = [
                    idx + 1,
                    s.full_name || '',
                    schoolName,
                    gradeStr,
                    s.parent_name || '-',
                    phoneStr,
                    tcStr,
                    nbrStr,
                    addrStr,
                    shiftStr,
                    bloodStr
                ];

                const row = worksheet.addRow(rowData);
                row.height = 24;

                const isEven = idx % 2 === 1;
                const rowBg = isEven ? 'FFF8FAFC' : 'FFFFFFFF';

                row.eachCell((cell, colNumber) => {
                    cell.border = allThinBorders;
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: rowBg }
                    };

                    if (colNumber === 1 || colNumber === 4 || colNumber === 7 || colNumber === 10 || colNumber === 11) {
                        cell.alignment = { vertical: 'middle', horizontal: 'center' };
                        cell.font = calibriFont(false, 9.5);
                    } else if (colNumber === 2) {
                        cell.alignment = { vertical: 'middle', horizontal: 'left' };
                        cell.font = calibriFont(true, 10, 'FF0F172A');
                    } else if (colNumber === 6) {
                        cell.alignment = { vertical: 'middle', horizontal: 'center' };
                        cell.font = calibriFont(true, 10, 'FF0369A1');
                    } else {
                        cell.alignment = { vertical: 'middle', horizontal: 'left' };
                        cell.font = calibriFont(false, 9.5);
                    }
                });
            });

            // Sayfa yapısı: A4 yatay ve sütunları tek sayfaya sığdır
            worksheet.pageSetup = {
                paperSize: 9, // A4
                orientation: 'landscape',
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 0,
                margins: {
                    left: 0.25, right: 0.25,
                    top: 0.3, bottom: 0.3,
                    header: 0.15, footer: 0.15
                }
            };

            const fileName = `${selectedVehicleForStudents.plate}_Detayli_Ogrenci_Listesi.xlsx`;
            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), fileName);

        } catch (error) {
            console.error('Detaylı Excel oluşturulurken hata:', error);
            alert('Detaylı Excel tablosu oluşturulurken bir hata oluştu.');
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
                            };
                        }
                        return prev;
                    });
                }
            )
            .on(
                'broadcast',
                { event: 'location_update' },
                ({ payload }) => {
                    if (!payload) return;
                    const lat = payload.current_latitude ?? payload.latitude;
                    const lng = payload.current_longitude ?? payload.longitude;
                    const id = payload.vehicle_id ?? payload.id;
                    const plate = payload.plate_number ?? payload.plate;

                    if (!lat || !lng) return;

                    setVehicles(prev => prev.map(v => {
                        if (v.id === id || v.plate === plate) {
                            return {
                                ...v,
                                location: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                                current_latitude: lat,
                                current_longitude: lng
                            };
                        }
                        return v;
                    }));

                    setSelectedVehicleForLocation(prev => {
                        if (prev && (prev.id === id || prev.plate === plate)) {
                            return {
                                ...prev,
                                current_latitude: lat,
                                current_longitude: lng
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
                status: formData.status || 'active',
                color: formData.color || null
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

    const handleShowProfile = (vehicle: Vehicle) => {
        setSelectedVehicleProfile(vehicle);
        setIsProfileModalOpen(true);
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
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
            <div className="flex flex-col sm:flex-row gap-4 no-print">
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
                <div className="text-center py-10 text-slate-500 no-print">Yükleniyor...</div>
            ) : (
                <div className="no-print">
                    <VehicleList
                        vehicles={filteredVehicles}
                        onEdit={handleEditClick}
                        onDelete={handleDeleteClick}
                        onShowLocation={handleShowLocation}
                        onShowStudents={handleShowStudents}
                        onShowProfile={handleShowProfile}
                    />
                </div>
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
                            {/* Vehicle Color Picker */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Araç Rengi <span className="text-slate-400 font-normal text-xs">(haritada öğrenci markerları bu renkte gösterilir)</span></label>
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <input
                                            type="color"
                                            id="vehicle-color-picker"
                                            value={formData.color || '#3b82f6'}
                                            onChange={e => setFormData({ ...formData, color: e.target.value })}
                                            className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#06b6d4','#14b8a6','#64748b'].map(c => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, color: c })}
                                                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                                                    formData.color === c ? 'border-slate-700 scale-110' : 'border-white shadow-sm'
                                                }`}
                                                style={{ backgroundColor: c }}
                                                title={c}
                                            />
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, color: undefined })}
                                            className="w-6 h-6 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-[10px] hover:border-slate-500 transition-colors"
                                            title="Renk Kaldır"
                                        >×</button>
                                    </div>
                                </div>
                                {formData.color && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: formData.color }} />
                                        <span className="text-xs text-slate-500 font-mono">{formData.color}</span>
                                    </div>
                                )}
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
                            {selectedVehicleForLocation.current_longitude && selectedVehicleForLocation.current_latitude ? (
                                <MapScene
                                    className="w-full h-full"
                                    center={[selectedVehicleForLocation.current_longitude, selectedVehicleForLocation.current_latitude]}
                                    zoom={15}
                                    markers={[{
                                        id: selectedVehicleForLocation.id,
                                        title: selectedVehicleForLocation.plate,
                                        position: [selectedVehicleForLocation.current_longitude, selectedVehicleForLocation.current_latitude] as [number, number],
                                        type: 'vehicle' as const
                                    }]}
                                />
                            ) : (
                                <MapFallback
                                    type="no_coords"
                                    title="Canlı Konum Verisi Bulunamadı"
                                    description={`${selectedVehicleForLocation.plate} plakalı araca ait anlık GPS konumu henüz sisteme iletilmedi. Sürücü uygulamayı açtığında veya sefere başladığında konumu haritada canlı olarak görüntülenecektir.`}
                                    className="w-full h-full"
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Student List Modal */}
            {isStudentsModalOpen && selectedVehicleForStudents && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    {/* INTERACTIVE SCREEN MODAL (NOW USED FOR PRINT AS WELL) */}
                    <div id="printable-student-modal" className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200 overflow-hidden vehicle-student-modal-content">
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
                            <div className="flex flex-col items-end gap-2 no-print">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleShareStudents}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all text-xs font-bold shadow-sm shadow-emerald-600/20 active:scale-95"
                                        title="Öğrenci Listesini Paylaş"
                                    >
                                        <Share2 size={15} />
                                        <span>Paylaş</span>
                                    </button>
                                    <button
                                        onClick={handleExportExcel}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all text-xs font-bold shadow-sm shadow-green-600/20 active:scale-95"
                                        title="Excel ile İndir"
                                    >
                                        <Download size={15} />
                                        <span>Excel</span>
                                    </button>
                                    <button
                                        onClick={handlePrintStudents}
                                        onMouseEnter={() => preloadRoute('/print-preview')}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-xs font-bold shadow-sm active:scale-95"
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
                                <button
                                    onClick={handleExportDetailedExcel}
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl transition-all text-xs font-bold shadow-sm shadow-emerald-700/25 active:scale-95 border border-emerald-500/30"
                                    title="Öğrenci, veli, adres, telefon, T.C., okul ve sınıf bilgilerini içeren detaylı Excel tablosunu indir"
                                >
                                    <FileSpreadsheet size={15} />
                                    <span>Detaylı Excel Tablosu</span>
                                </button>
                            </div>
                        </div>

                        {/* School Filter Bar */}
                        {(() => {
                            // Araçtaki öğrencilerin okullarını bul
                            const vehicleSchools = Array.from(
                                new Map(
                                    vehicleStudents
                                        .filter(s => s.schools?.id)
                                        .map(s => [s.schools.id, s.schools.name])
                                ).entries()
                            ).map(([id, name]) => ({ id, name }));

                            if (vehicleSchools.length === 0) return null;

                            return (
                                <div className="px-4 pt-3 pb-2 border-b border-slate-100 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 no-print">
                                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                        <span className="text-xs font-semibold text-slate-500 shrink-0 flex items-center gap-1">
                                            <School size={13} />
                                            Okul:
                                        </span>
                                        <button
                                            onClick={() => setSelectedSchoolFilter('all')}
                                            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                                selectedSchoolFilter === 'all'
                                                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                                                    : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600'
                                            }`}
                                        >
                                            Tümü ({vehicleStudents.length})
                                        </button>
                                        {vehicleSchools.map(school => (
                                            <button
                                                key={school.id}
                                                onClick={() => setSelectedSchoolFilter(school.id)}
                                                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                                    selectedSchoolFilter === school.id
                                                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                                                        : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600'
                                                }`}
                                            >
                                                {school.name} ({vehicleStudents.filter(s => s.schools?.id === school.id).length})
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Search & Stats Bar */}
                        <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-center gap-3">
                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto no-print">
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
                                <select
                                    value={vehicleShiftFilter}
                                    onChange={(e) => setVehicleShiftFilter(e.target.value as any)}
                                    className="w-full sm:w-40 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 font-medium"
                                >
                                    <option value="all">Tüm Öğrenciler</option>
                                    <option value="sabah">Sadece Sabahçılar</option>
                                    <option value="oglen">Sadece Öğlenciler</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="px-3 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-xl border border-blue-100">
                                    Toplam: {vehicleStudents.filter(s => selectedSchoolFilter === 'all' || s.schools?.id === selectedSchoolFilter).length} Öğrenci
                                </span>
                                <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold rounded-xl border border-emerald-100">
                                    Doluluk: %{Math.min(100, Math.round((vehicleStudents.length / (selectedVehicleForStudents.capacity || 1)) * 100))}
                                </span>
                            </div>
                        </div>

                        {/* Student List Content */}
                        <div className="flex-1 overflow-y-auto p-4 vehicle-student-scroll-area">
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
                                                <th className="p-3 text-right no-print">İletişim</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs">
                                            {vehicleStudents
                                                .filter(s => {
                                                    const term = studentSearchTerm.toLowerCase();
                                                    const matchesSearch = (
                                                        (s.full_name || '').toLowerCase().includes(term) ||
                                                        (s.parent_name || '').toLowerCase().includes(term) ||
                                                        (s.neighborhood || '').toLowerCase().includes(term) ||
                                                        (s.schools?.name || '').toLowerCase().includes(term)
                                                    );
                                                    const matchesShift = vehicleShiftFilter === 'all' || 
                                                        (vehicleShiftFilter === 'sabah' && s.shift === 'Sabahçı') || 
                                                        (vehicleShiftFilter === 'oglen' && s.shift === 'Öğlenci');
                                                    const matchesSchool = selectedSchoolFilter === 'all' || s.schools?.id === selectedSchoolFilter;
                                                    return matchesSearch && matchesShift && matchesSchool;
                                                })
                                                .map((s, index) => (
                                                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                                                        <td className="p-3 text-slate-400 font-medium">{index + 1}</td>
                                                        <td className="p-3 font-bold text-slate-800 break-words">{s.full_name}</td>
                                                        <td className="p-3">
                                                            <div className="font-semibold text-slate-700 flex items-center gap-1">
                                                                <School size={13} className="text-slate-400 shrink-0" />
                                                                <span className="break-words">{s.schools?.name || s.school_level || 'Okul Belirtilmedi'}</span>
                                                            </div>
                                                            {s.grade && <span className="text-[11px] text-slate-400 font-medium">{s.grade}</span>}
                                                        </td>
                                                        <td className="p-3">
                                                            <div className="font-medium text-slate-700 break-words">{s.parent_name || 'Belirtilmedi'}</div>
                                                            <div className="text-[11px] text-slate-400">{s.parent_phone || ''}</div>
                                                        </td>
                                                        <td className="p-3 text-slate-600 break-words">
                                                            {s.neighborhood && <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold mr-1 mb-1">{s.neighborhood}</span>}
                                                            <span className="text-slate-500">{s.address}</span>
                                                        </td>
                                                        <td className="p-3 text-right no-print">
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

            <VehicleProfileModal 
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                vehicle={selectedVehicleProfile}
            />
        </div>
    );
};

export default Vehicles;

