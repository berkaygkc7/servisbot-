import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Upload, X, Download, Trash2, Loader2, MapPin, Tag as TagIcon, Check, Smartphone } from 'lucide-react';
import * as XLSX from 'xlsx';
import StudentList, { type Student } from '../components/dashboard/StudentList';
import QrCodeModal from '../components/shared/QrCodeModal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

import MapScene from '../components/map/MapScene';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
const Students: React.FC = () => {
    const { profile } = useAuth();
    const geocodingLibrary = useMapsLibrary('geocoding');
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDeleteMenu, setShowDeleteMenu] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'primary' | 'middle' | 'high' | 'pending'>('all');
    const [activeTagFilter, setActiveTagFilter] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [formData, setFormData] = useState<Partial<Student>>({});
    const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
    const [vehicles, setVehicles] = useState<{ id: string; plate_number: string }[]>([]);

    // Location Modal State
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [selectedStudentForLocation, setSelectedStudentForLocation] = useState<Student | null>(null);
    const [pickerCoordinates, setPickerCoordinates] = useState<[number, number] | null>(null);
    const [isPickingLocation, setIsPickingLocation] = useState(false);
    const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);
    const [mapSearchQuery, setMapSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [mapZoom, setMapZoom] = useState<number | undefined>(undefined);
    const [hasSearchResult, setHasSearchResult] = useState(false);

    const handleAddressSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const query = mapSearchQuery.trim();
        if (!query || !geocodingLibrary) return;

        setIsSearching(true);
        try {
            // Coordinate detection
            const coordMatch = query.match(/^([+-]?\d+\.?\d*)\s*[,\s]\s*([+-]?\d+\.?\d*)$/);
            if (coordMatch) {
                const lat = parseFloat(coordMatch[1]);
                const lng = parseFloat(coordMatch[2]);
                if (!isNaN(lat) && !isNaN(lng)) {
                    setMapCenter([lng, lat]);
                    setMapZoom(18);
                    setPickerCoordinates([lat, lng]);
                    setHasSearchResult(true);
                    setIsSearching(false);
                    return;
                }
            }

            const geocoder = new geocodingLibrary.Geocoder();
            const response = await geocoder.geocode({ address: query });
            if (response.results && response.results.length > 0) {
                const location = response.results[0].geometry.location;
                const lat = location.lat();
                const lng = location.lng();
                setMapCenter([lng, lat]);
                setMapZoom(18);
                setPickerCoordinates([lat, lng]);
                setHasSearchResult(true);
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    // Detail Modal State
    const [selectedStudentDetails, setSelectedStudentDetails] = useState<Student | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // QR Modal State
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [selectedQrStudent, setSelectedQrStudent] = useState<Student | null>(null);

    // Tag State
    const [availableTags, setAvailableTags] = useState<{ id: string; name: string }[]>([]);
    const [locationMethod, setLocationMethod] = useState<'parent' | 'map'>('map');

    // Fetch Students on Load
    useEffect(() => {
        fetchStudents();
        fetchSchools();
        fetchVehicles();
        fetchTags();

        // Realtime subscription for students
        const channel = supabase
            .channel('public:students')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'students' },
                () => {
                    console.log('Öğrenci tablosu güncellendi, liste yenileniyor...');
                    fetchStudents();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchSchools = async () => {
        const { data } = await supabase.from('schools').select('id, name');
        if (data) setSchools(data);
    };

    const fetchVehicles = async () => {
        const { data } = await supabase.from('vehicles').select('id, plate_number').order('plate_number');
        if (data) setVehicles(data);
    };

    const fetchTags = async () => {
        const { data } = await supabase.from('tags').select('id, name').order('name');
        if (data) setAvailableTags(data);
    };

    const fetchStudents = async () => {
        // setLoading(true); // Don't show loading on background refresh
        try {
            const { data, error } = await supabase
                .from('students')
                .select(`
                    *,
                    schools (id, name),
                    vehicles (id, plate_number, driver_name)
                `);

            if (error) throw error;

            console.log('Fetched students:', data);

            // Map DB data to UI interface
            const mappedStudents: Student[] = data?.map((s: any) => ({
                id: s.id,
                full_name: s.full_name,
                name: s.full_name, // UI helper
                parent: s.parent_name || 'Bilinmiyor', // UI helper
                parent_name: s.parent_name,
                parent_phone: s.parent_phone,
                phone: s.parent_phone, // UI helper
                school_id: s.school_id,
                school_name: s.schools?.name,
                school: s.schools?.name || 'Okul Yok', // UI helper
                vehicle_id: s.vehicle_id,
                vehicle_plate: s.vehicles?.plate_number,
                driver_name: s.vehicles?.driver_name,
                grade: s.grade,
                schoolLevel: s.school_level,
                route_status: s.vehicle_id ? 'assigned' : 'unassigned',
                location: s.address || (s.home_latitude ? 'Konum İşaretlendi 📍' : 'Adres Yok'),
                coordinates: s.home_latitude && s.home_longitude ? [s.home_latitude, s.home_longitude] : undefined,
                address: s.address,
                blood_group: s.blood_group,
                allergies: s.allergies,
                registration_date: s.registration_date,
                status: s.status,
                tags: s.tags || [],
                custom_price: s.custom_price || null,
                login_token: s.login_token
            })) || [];

            setStudents(mappedStudents);
        } catch (error) {
            console.error('Error fetching students:', error);
            // alert('Öğrenciler yüklenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string | undefined | null) => {
        if (!dateString) return 'Yeni';
        const dateObj = new Date(dateString);
        return dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const handleAddClick = () => {
        setEditingStudent(null);
        setFormData({ route_status: 'unassigned' });
        setPickerCoordinates(null);
        setLocationMethod('map'); // Default to map for new
        setIsModalOpen(true);
    };

    const handleEditClick = (student: Student) => {
        setEditingStudent(student);
        setFormData({ ...student });
        setPickerCoordinates(student.coordinates && student.coordinates[0] !== 0 ? student.coordinates : null);

        // Determine method based on existing data
        if (student.address === 'Veli Uygulamadan Seçecek' || (!student.coordinates || student.coordinates[0] === 0)) {
            setLocationMethod('parent');
        } else {
            setLocationMethod('map');
        }

        setIsModalOpen(true);
    };

    const handleDeleteClick = async (id: string) => {
        if (!window.confirm('Bu öğrenciyi silmek istediğinize emin misiniz?')) return;

        try {
            const { error } = await supabase.from('students').delete().eq('id', id);
            if (error) throw error;
            setStudents(prev => prev.filter(s => s.id !== id));
        } catch (error) {
            console.error('Error deleting student:', error);
            alert('Silme işlemi başarısız oldu.');
        }
    };

    const handleApprove = async (student: Student) => {
        try {
            const { error } = await supabase
                .from('students')
                .update({ status: 'active' })
                .eq('id', student.id);
            if (error) throw error;
            alert(`${student.name} başarıyla onaylandı.`);
            fetchStudents();
        } catch (error) {
            console.error('Error approving student:', error);
            alert('Öğrenci onaylanırken bir hata oluştu.');
        }
    };

    const handleReject = async (student: Student) => {
        try {
            const { error } = await supabase
                .from('students')
                .delete()
                .eq('id', student.id);
            if (error) throw error;
            alert(`${student.name} başvurusu reddedildi ve silindi.`);
            fetchStudents();
        } catch (error) {
            console.error('Error rejecting student:', error);
            alert('Başvuru silinirken bir hata oluştu.');
        }
    };

    const handleShowLocation = (student: Student) => {
        if (!student.coordinates || (student.coordinates[0] === 0 && student.coordinates[1] === 0)) {
            alert('Bu öğrenci için konum bilgisi (Ev adresi) bulunamadı.');
            return;
        }
        setSelectedStudentForLocation(student);
        setIsPickingLocation(false);
        setIsLocationModalOpen(true);
    };

    const handleShowDetails = (student: Student) => {
        setSelectedStudentDetails(student);
        setIsDetailModalOpen(true);
    };

    const handleShowQr = (student: Student) => {
        setSelectedQrStudent(student);
        setIsQrModalOpen(true);
    };
    
    const handleAddSibling = (student: Student) => {
        setEditingStudent(null);
        // Pre-fill with sibling's shared data
        setFormData({
            parent_name: student.parent_name,
            parent_phone: student.parent_phone,
            location: student.address,
            coordinates: student.coordinates && student.coordinates[0] !== 0 ? student.coordinates : undefined,
            school_id: student.school_id, // Often same family goes to same school
            route_status: 'unassigned'
        });
        
        // Match location method
        if (student.address === 'Veli Uygulamadan Seçecek' || (!student.coordinates || student.coordinates[0] === 0)) {
            setLocationMethod('parent');
        } else {
            setLocationMethod('map');
            if (student.coordinates && student.coordinates[0] !== 0) {
                setPickerCoordinates(student.coordinates);
            }
        }
        
        setIsModalOpen(true);
    };

    const handlePickLocation = () => {
        setIsPickingLocation(true);
        setSelectedStudentForLocation(null);
        setMapSearchQuery('');
        setMapCenter(undefined);
        // If already has coords, center there or set marker there
        if (formData.coordinates && formData.coordinates[0] !== 0) {
            setPickerCoordinates(formData.coordinates);
            setMapZoom(17);
        } else {
            setPickerCoordinates(null);
            setMapZoom(undefined);
        }
        setIsLocationModalOpen(true);
    };


    const handleLocationSave = () => {
        if (pickerCoordinates) {
            setFormData({
                ...formData,
                coordinates: pickerCoordinates,
                location: `Konum Seçildi (${pickerCoordinates[0].toFixed(5)}, ${pickerCoordinates[1].toFixed(5)})`
            });
        }
        setIsLocationModalOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!profile?.company_id) {
            alert('Oturum bilgileri yüklenemedi. Lütfen sayfayı yenileyiniz.');
            setLoading(false);
            return;
        }

        try {
            const studentData = {
                company_id: profile.company_id,
                full_name: formData.full_name,
                parent_name: formData.parent_name,
                parent_phone: formData.parent_phone,
                school_id: formData.school_id || null,
                vehicle_id: formData.vehicle_id || null, // Handle vehicle assignment
                address: formData.location || '',
                tags: formData.tags || [],
                blood_group: formData.blood_group || null,
                allergies: formData.allergies || null,
                registration_date: formData.registration_date || null,
                school_level: formData.schoolLevel || null,
                grade: formData.grade || null,
                home_latitude: formData.coordinates ? formData.coordinates[0] : null,
                home_longitude: formData.coordinates ? formData.coordinates[1] : null,
                custom_price: formData.custom_price || null,
                status: formData.status || 'active'
            };

            if (editingStudent) {
                // Update
                const { error } = await supabase
                    .from('students')
                    .update(studentData)
                    .eq('id', editingStudent.id);

                if (error) throw error;
            } else {
                // Create
                const { error } = await supabase
                    .from('students')
                    .insert([studentData]);

                if (error) throw error;
            }

            await fetchStudents(); // Refresh list
            setIsModalOpen(false);
        } catch (error: any) {
            console.error('Error saving student:', error);
            alert(`Kaydetme işlemi başarısız: ${error.message || 'Bilinmeyen hata'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadTemplate = () => {
        let exportData;
        if (students && students.length > 0) {
            exportData = students.map(s => ({
                "Ad Soyad": s.full_name || '',
                "Veli": s.parent_name || '',
                "Telefon": s.parent_phone || '',
                "Okul": s.school_name || '',
                "Adres": s.address || '',
                "Etiketler": s.tags ? s.tags.join(', ') : ''
            }));
        } else {
            exportData = [
                { "Ad Soyad": "Örnek Öğrenci", "Veli": "Örnek Veli", "Telefon": "0555 555 55 55", "Okul": "Atatürk İlkokulu", "Adres": "Örnek Mah. Örnek Sok. No:1", "Etiketler": "Sabah, Lise" },
                { "Ad Soyad": "Ali Veli", "Veli": "Ayşe Veli", "Telefon": "0544 444 44 44", "Okul": "Cumhuriyet Lisesi", "Adres": "Merkez Mah. Okul Cad. No:5", "Etiketler": "" }
            ];
        }

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Öğrenciler");
        XLSX.writeFile(wb, students && students.length > 0 ? "ogrenci_listesi.xlsx" : "ogrenci_sablon.xlsx");
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const bstr = event.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);

            // Map Excel data to Student interface
            // Expected headers: "Ad Soyad", "Veli", "Telefon", "Okul", "Adres"
            const newStudents: Partial<Student>[] = data.map((row: any) => ({
                company_id: profile?.company_id,
                full_name: row['Ad Soyad'] || row['name'] || 'Bilinmiyor',
                parent_name: row['Veli'] || row['parent'] || '',
                parent_phone: row['Telefon'] || row['phone'] || '',
                // school: row['Okul'] || row['school'] || '',
                // schoolLevel: (row['Seviye'] === 'İlkokul' ? 'primary' : row['Seviye'] === 'Ortaokul' ? 'middle' : row['Seviye'] === 'Lise' ? 'high' : undefined),
                address: row['Adres'] || row['location'] || '',
                status: 'active',
                tags: row['Etiketler'] ? row['Etiketler'].split(',').map((t: string) => t.trim()) : []
            }));

            if (newStudents.length > 0) {
                if (window.confirm(`${newStudents.length} öğrenci bulundu. Eklemek istiyor musunuz?`)) {
                    // Bulk insert to Supabase
                    insertBulkStudents(newStudents);
                }
            } else {
                alert('Excel dosyasında uygun veri bulunamadı. Lütfen sütun başlıklarını kontrol edin: "Ad Soyad", "Veli", "Telefon", "Okul", "Adres"');
            }
        };
        reader.readAsBinaryString(file);

        // Reset input
        e.target.value = '';
    };

    const insertBulkStudents = async (students: any[]) => {
        setLoading(true);
        try {
            const { error } = await supabase.from('students').insert(students);
            if (error) throw error;
            await fetchStudents();
            alert('Öğrenciler başarıyla eklendi!');
        } catch (error) {
            console.error('Error bulk inserting:', error);
            alert('Toplu ekleme sırasında hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.parent.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.school.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter = activeFilter === 'pending'
            ? s.status === 'pending'
            : activeFilter === 'all'
                ? s.status !== 'pending'
                : s.schoolLevel === activeFilter && s.status !== 'pending';

        // Tag Filter Logic
        const matchesTags = activeTagFilter.length === 0 ||
            (s.tags && activeTagFilter.every(tag => s.tags?.includes(tag)));

        return matchesSearch && matchesFilter && matchesTags;
    });

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Öğrenci Yönetimi</h1>
                    <p className="text-slate-500">Tüm öğrenci ve personel kayıtlarını yönetin.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleDownloadTemplate}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                    >
                        <Download size={18} />
                        Şablon İndir
                    </button>
                    <label className="group relative flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium cursor-pointer">
                        <Upload size={18} />
                        Excel Yükle
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                        {/* Tooltip */}
                        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 w-72 bg-slate-800 text-white text-xs p-3 rounded-xl shadow-xl z-50 flex flex-col gap-1.5 pointer-events-none">
                            <p className="font-semibold text-blue-300 border-b border-slate-600 pb-1.5 mb-0.5">Excel Yükleme Rehberi</p>
                            <p><span className="text-slate-400 font-bold">1-</span> Şablonunuz <em>Ad Soyad, Veli, Telefon, Okul, Adres</em> sütunlarından oluşmalıdır.</p>
                            <p><span className="text-slate-400 font-bold">2-</span> Unutmayın, toplu yükleme yaptıktan sonra öğrencilerin diğer bilgilerini güncellemelisiniz.</p>
                            <p><span className="text-slate-400 font-bold">3-</span> Adres kolonuna kordinat yazarsanız, öğrencinin konumu haritaya otomatik eklenir.</p>
                            {/* Ok/Kuyruk yapısı (Yukarı bakan ok) */}
                            <div className="absolute left-1/2 -translate-x-1/2 -top-2 border-l-[6px] border-r-[6px] border-b-[8px] border-transparent border-b-slate-800"></div>
                        </div>
                    </label>
                    <button
                        onClick={handleAddClick}
                        className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-white rounded-xl hover:bg-blue-600 transition-colors font-medium shadow-sm hover:shadow-md"
                    >
                        <Plus size={20} />
                        Yeni Öğrenci
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="İsim, veli veya okul ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
                    />
                </div>
                <div className="relative">
                    <button
                        onClick={() => setShowDeleteMenu(!showDeleteMenu)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-100 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-medium"
                    >
                        <Trash2 size={18} />
                        Sil
                    </button>
                    {showDeleteMenu && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50 p-2 z-50">
                            <div className="p-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tehlikeli İşlem</div>
                            <button
                                onClick={async () => {
                                    setShowDeleteMenu(false);
                                    if (students.length > 0 && window.confirm('Tüm öğrenci listesini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
                                        alert('Bu özellik güvenlik nedeniyle geçici olarak devre dışı.');
                                    }
                                }}
                                className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-semibold"
                            >
                                <Trash2 size={16} />
                                Tümünü Sil
                            </button>
                        </div>
                    )}
                </div>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium">
                    <Filter size={18} />
                    Filtrele
                </button>
            </div>

            {/* Tag Filters (New) */}
            {availableTags.length > 0 && (
                <div className="flex gap-2 pb-2 overflow-x-auto items-center">
                    <span className="text-sm font-medium text-slate-500 mr-2 flex items-center gap-1">
                        <TagIcon size={14} /> Etiketler:
                    </span>
                    {availableTags.map(tag => (
                        <button
                            key={tag.id}
                            onClick={() => {
                                if (activeTagFilter.includes(tag.name)) {
                                    setActiveTagFilter(prev => prev.filter(t => t !== tag.name));
                                } else {
                                    setActiveTagFilter(prev => [...prev, tag.name]);
                                }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors border ${activeTagFilter.includes(tag.name)
                                ? 'bg-blue-50 text-blue-600 border-blue-200 font-semibold'
                                : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                                }`}
                        >
                            {tag.name}
                        </button>
                    ))}
                    {activeTagFilter.length > 0 && (
                        <button
                            onClick={() => setActiveTagFilter([])}
                            className="text-xs text-red-500 hover:underline ml-2"
                        >
                            Temizle
                        </button>
                    )}
                </div>
            )}

            {/* School Level Filters */}
            <div className="flex gap-2 pb-2 overflow-x-auto">
                <button
                    onClick={() => setActiveFilter('all')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeFilter === 'all'
                        ? 'bg-secondary text-white shadow-md shadow-blue-100'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                        }`}
                >
                    Tümü
                </button>
                <button
                    onClick={() => setActiveFilter('primary')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeFilter === 'primary'
                        ? 'bg-purple-500 text-white shadow-md shadow-purple-100'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                        }`}
                >
                    İlkokul
                </button>
                <button
                    onClick={() => setActiveFilter('middle')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeFilter === 'middle'
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-100'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                        }`}
                >
                    Ortaokul
                </button>
                <button
                    onClick={() => setActiveFilter('high')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeFilter === 'high'
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-100'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                        }`}
                >
                    Lise
                </button>
                <div className="w-px h-6 bg-slate-200 mx-2 self-center"></div>
                <button
                    onClick={() => setActiveFilter('pending')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${activeFilter === 'pending'
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-100'
                        : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200'
                        }`}
                >
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    Onay Bekleyenler ({students.filter(s => s.status === 'pending').length})
                </button>
            </div>

            {/* Student List */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="animate-spin text-secondary" size={32} />
                </div>
            ) : (
                <StudentList
                    students={filteredStudents}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                    onShowLocation={handleShowLocation}
                    onShowDetails={handleShowDetails}
                    onShowQr={handleShowQr}
                    onAddSibling={handleAddSibling}
                    onApprove={handleApprove}
                    onReject={handleReject}
                />
            )}

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-800">
                                {editingStudent ? 'Öğrenciyi Düzenle' : formData.parent_name ? 'Kardeş Öğrenci Kaydı' : 'Yeni Öğrenci'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex flex-col max-h-[80vh]">
                            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Öğrenci Adı</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-secondary"
                                        value={formData.full_name || ''}
                                        onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                        placeholder="Ad Soyad"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Veli Adı</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-secondary"
                                        value={formData.parent_name || ''}
                                        onChange={e => setFormData({ ...formData, parent_name: e.target.value })}
                                        placeholder="Veli Adı"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
                                    <input
                                        required
                                        type="tel"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-secondary"
                                        value={formData.parent_phone || ''}
                                        onChange={e => setFormData({ ...formData, parent_phone: e.target.value })}
                                        placeholder="05XX XXX XX XX"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Okul</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-secondary appearance-none bg-white"
                                        value={formData.school_id || ''}
                                        onChange={e => setFormData({ ...formData, school_id: e.target.value })}
                                    >
                                        <option value="">Okul Seçiniz</option>
                                        {schools.map(school => (
                                            <option key={school.id} value={school.id}>{school.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Servis Aracı</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-secondary appearance-none bg-white"
                                        value={formData.vehicle_id || ''}
                                        onChange={e => setFormData({ ...formData, vehicle_id: e.target.value })}
                                    >
                                        <option value="">Servis Atanmadı</option>
                                        {vehicles.map(vehicle => (
                                            <option key={vehicle.id} value={vehicle.id}>{vehicle.plate_number}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Okul Seviyesi</label>
                                        <select
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-secondary appearance-none bg-white"
                                            value={formData.schoolLevel || ''}
                                            onChange={e => setFormData({ ...formData, schoolLevel: e.target.value as any })}
                                        >
                                            <option value="">Seçiniz</option>
                                            <option value="primary">İlkokul</option>
                                            <option value="middle">Ortaokul</option>
                                            <option value="high">Lise</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Sınıf</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-secondary"
                                            value={formData.grade || ''}
                                            onChange={e => setFormData({ ...formData, grade: e.target.value })}
                                            placeholder="Örn: 9/A"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Özel Fiyatlandırma (₺)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-secondary"
                                            value={formData.custom_price || ''}
                                            onChange={e => setFormData({ ...formData, custom_price: e.target.value ? Number(e.target.value) : undefined })}
                                            placeholder="İsteğe bağlı. Standart fiyat için boş bırakın."
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Kan Grubu</label>
                                        <select
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-secondary appearance-none bg-white font-medium text-red-600"
                                            value={formData.blood_group || ''}
                                            onChange={e => setFormData({ ...formData, blood_group: e.target.value })}
                                        >
                                            <option value="">Seçiniz</option>
                                            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'].map(group => (
                                                <option key={group} value={group}>{group}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Kayıt Tarihi</label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-secondary"
                                            value={formData.registration_date || ''}
                                            onChange={e => setFormData({ ...formData, registration_date: e.target.value })}
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Alerji / Notlar</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-secondary"
                                            value={formData.allergies || ''}
                                            onChange={e => setFormData({ ...formData, allergies: e.target.value })}
                                            placeholder="Alerji veya özel notlar..."
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-3">Ev Konumu</label>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setLocationMethod('parent');
                                                    setFormData({ ...formData, location: 'Veli Uygulamadan Seçecek', coordinates: undefined });
                                                }}
                                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${locationMethod === 'parent'
                                                    ? 'bg-blue-50 border-blue-500 shadow-md ring-2 ring-blue-500/10'
                                                    : 'bg-white border-slate-100 hover:border-slate-300'
                                                    }`}
                                            >
                                                <div className={`p-2 rounded-lg ${locationMethod === 'parent' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                    <Smartphone size={20} />
                                                </div>
                                                <div className="text-center">
                                                    <div className={`text-sm font-bold ${locationMethod === 'parent' ? 'text-blue-900' : 'text-slate-700'}`}>Veli Seçecek</div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">Uygulama üzerinden</div>
                                                </div>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setLocationMethod('map')}
                                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${locationMethod === 'map'
                                                    ? 'bg-indigo-50 border-indigo-500 shadow-md ring-2 ring-indigo-500/10'
                                                    : 'bg-white border-slate-100 hover:border-slate-300'
                                                    }`}
                                            >
                                                <div className={`p-2 rounded-lg ${locationMethod === 'map' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                    <MapPin size={20} />
                                                </div>
                                                <div className="text-center">
                                                    <div className={`text-sm font-bold ${locationMethod === 'map' ? 'text-indigo-900' : 'text-slate-700'}`}>Haritadan Seç</div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">Şimdi manuel işaretle</div>
                                                </div>
                                            </button>
                                        </div>

                                        {locationMethod === 'map' && (
                                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                                <button
                                                    type="button"
                                                    onClick={handlePickLocation}
                                                    className={`w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed rounded-xl transition-all ${formData.coordinates && formData.coordinates[0] !== 0
                                                        ? 'bg-green-50 border-green-200 text-green-700'
                                                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-white hover:border-indigo-300 hover:text-indigo-600'
                                                        }`}
                                                >
                                                    {formData.coordinates && formData.coordinates[0] !== 0 ? (
                                                        <>
                                                            <Check size={18} />
                                                            Konum İşaretlendi (Düzenle)
                                                        </>
                                                    ) : (
                                                        <>
                                                            <MapPin size={18} />
                                                            Haritayı Aç ve Konum Seç
                                                        </>
                                                    )}
                                                </button>
                                                <p className="text-[10px] text-slate-400 mt-2 text-center">
                                                    Haritadan öğrencinin evini işaretleyerek rotaya dahil edebilirsiniz.
                                                </p>
                                            </div>
                                        )}

                                        {locationMethod === 'parent' && (
                                            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                                                <div className="flex gap-2">
                                                    <Smartphone size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                                    <p className="text-xs text-amber-800 leading-relaxed">
                                                        Öğrencinin konumu Veli işaretlediği zaman güncellenecek
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Tag Selection in Modal */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Etiketler</label>
                                    <div className="flex flex-wrap gap-2">
                                        {availableTags.length === 0 ? (
                                            <p className="text-sm text-slate-400">Henüz etiket tanımlanmamış. Ayarlar sayfasından ekleyebilirsiniz.</p>
                                        ) : availableTags.map(tag => {
                                            const isSelected = formData.tags?.includes(tag.name);
                                            return (
                                                <button
                                                    key={tag.id}
                                                    type="button"
                                                    onClick={() => {
                                                        const currentTags = formData.tags || [];
                                                        if (isSelected) {
                                                            setFormData({ ...formData, tags: currentTags.filter(t => t !== tag.name) });
                                                        } else {
                                                            setFormData({ ...formData, tags: [...currentTags, tag.name] });
                                                        }
                                                    }}
                                                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${isSelected
                                                        ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium shadow-sm'
                                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    {tag.name} {isSelected && '✓'}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || (locationMethod === 'map' && (!formData.coordinates || formData.coordinates[0] === 0))}
                                    className="flex-1 py-2.5 bg-secondary text-white rounded-xl font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {editingStudent ? 'Güncelle' : 'Kaydet'}
                                </button>
                            </div>
                        </form>
                    </div >
                </div >
            )}

            {/* Location View/Pick Modal */}
            {
                isLocationModalOpen && (selectedStudentForLocation || isPickingLocation) && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl w-full max-w-4xl h-[600px] shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-sm">
                                            {isPickingLocation ? (editingStudent ? editingStudent.name : 'Yeni Öğrenci') : selectedStudentForLocation!.name}
                                        </span>
                                        <span>{isPickingLocation ? 'İçin Konum Seçin' : 'Konumu'}</span>
                                    </h3>
                                    <p className="text-slate-500 text-sm">
                                        {isPickingLocation
                                            ? 'Haritada öğrencinin evinin olduğu noktaya tıklayın.'
                                            : (selectedStudentForLocation!.address || 'Adres bilgisi yok')}
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
                                    markers={
                                        isPickingLocation && pickerCoordinates
                                            ? [{
                                                id: 'picker',
                                                title: hasSearchResult ? 'Arama Sonucu' : 'Seçilen Konum',
                                                position: [pickerCoordinates[1], pickerCoordinates[0]],
                                                type: hasSearchResult ? 'search_result' : 'student_home' as any
                                            }]
                                            : selectedStudentForLocation // Viewing mode
                                                ? [{
                                                    id: selectedStudentForLocation.id,
                                                    title: selectedStudentForLocation.name,
                                                    position: [selectedStudentForLocation.coordinates![1], selectedStudentForLocation.coordinates![0]] as [number, number],
                                                    type: 'student_home' as const
                                                }]
                                                : []
                                    }
                                    center={mapCenter}
                                    zoom={mapZoom}
                                    onMapClick={(lng, lat) => {
                                        if (isPickingLocation) {
                                            setPickerCoordinates([lat, lng]); // Store as [lat, lng]
                                            setHasSearchResult(false); // Reset to home icon if manual click
                                        }
                                    }}
                                />

                                {/* Search Bar Overlay */}
                                {isPickingLocation && (
                                    <div className="absolute top-6 left-6 right-6 z-50 max-w-md mx-auto">
                                        <form onSubmit={handleAddressSearch} className="flex gap-2 bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-2xl border border-white/50">
                                            <div className="relative flex-1">
                                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="text"
                                                    value={mapSearchQuery}
                                                    onChange={(e) => setMapSearchQuery(e.target.value)}
                                                    placeholder="Adres veya yer ara... (örn: Kaşıkçıbağları)"
                                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={isSearching}
                                                className="px-4 py-2 bg-secondary text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-all shadow-md active:scale-95 disabled:opacity-50"
                                            >
                                                {isSearching ? '...' : 'Ara'}
                                            </button>
                                        </form>
                                    </div>
                                )}

                                {isPickingLocation && (
                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white p-2 rounded-xl shadow-xl flex gap-3 z-50">
                                        <button
                                            onClick={() => setIsLocationModalOpen(false)}
                                            className="px-6 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                                        >
                                            İptal
                                        </button>
                                        <button
                                            onClick={handleLocationSave}
                                            disabled={!pickerCoordinates}
                                            className="px-6 py-2 bg-secondary text-white rounded-lg hover:bg-blue-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Konumu Kaydet
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Student Details Modal (Premium UI) */}
            {
                isDetailModalOpen && selectedStudentDetails && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
                            {/* Header with Background Pattern */}
                            <div className="relative h-32 bg-slate-900 overflow-hidden">
                                <div className="absolute inset-0 opacity-20 pointer-events-none">
                                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]"></div>
                                </div>
                                <button
                                    onClick={() => setIsDetailModalOpen(false)}
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
                                            {selectedStudentDetails.name.split(' ').map(n => n[0]).join('')}
                                        </span>
                                    </div>
                                    <div className="absolute bottom-1 right-1 w-8 h-8 bg-green-500 border-4 border-white rounded-full shadow-lg"></div>
                                </div>

                                <h2 className="mt-6 text-3xl font-black text-slate-900 tracking-tight">{selectedStudentDetails.name}</h2>
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
                                                <dd className="text-sm font-black text-slate-900">{formatDate(selectedStudentDetails.registration_date || new Date().toISOString())}</dd>
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
                                                <dd className="text-sm font-black text-slate-900">{selectedStudentDetails.parent}</dd>
                                            </div>
                                            <div className="flex justify-between items-center group">
                                                <dt className="text-sm font-medium text-slate-400">Telefon:</dt>
                                                <dd className="text-sm font-black text-slate-900">
                                                    <a href={`tel:${selectedStudentDetails.phone}`} className="hover:text-blue-600 transition-colors">
                                                        {selectedStudentDetails.phone}
                                                    </a>
                                                </dd>
                                            </div>
                                            <div className="flex flex-col gap-2 pt-2">
                                                <dt className="text-sm font-medium text-slate-400 flex items-center gap-2">
                                                    Adres:
                                                </dt>
                                                <dd className="text-sm text-slate-800 leading-relaxed flex items-start gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 font-medium italic">
                                                    {selectedStudentDetails.address || 'Adres Belirtilmemiş'}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsDetailModalOpen(false);
                                                            handleShowLocation(selectedStudentDetails);
                                                        }}
                                                        className="shrink-0 p-1.5 bg-white shadow-sm border border-slate-200 rounded-lg text-red-500 hover:scale-110 active:scale-95 transition-all"
                                                        title="Haritada Göster"
                                                    >
                                                        <MapPin size={16} />
                                                    </button>
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
                                                        selectedStudentDetails.tags.map((tag, idx) => (
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
                                                <dd className="text-sm font-black text-blue-700">{selectedStudentDetails.vehicle_plate || 'Atanmadı'}</dd>
                                            </div>
                                            {selectedStudentDetails.vehicle_plate && (
                                                <div className="flex justify-between items-center group bg-slate-50 p-3 rounded-2xl border border-dashed border-slate-200">
                                                    <dt className="text-xs font-bold text-slate-500">Sorumlu Şoför:</dt>
                                                    <dd className="text-sm font-black text-slate-700">{selectedStudentDetails.driver_name || 'Bilinmiyor'}</dd>
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

            {/* QR Code Modal for Login */}
            {selectedQrStudent && (
                <QrCodeModal
                    isOpen={isQrModalOpen}
                    onClose={() => setIsQrModalOpen(false)}
                    token={selectedQrStudent.login_token || '12345678-1234-1234-1234-123456789abc'}
                    type="parent"
                    userName={selectedQrStudent.parent}
                />
            )}
        </div >
    );
};

export default Students;
