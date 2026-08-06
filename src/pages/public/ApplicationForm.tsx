import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, CheckCircle2, User, Phone, MapPin, AlertCircle, Loader2, GraduationCap, School, Building2, Search, Smartphone, X, Users, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Map, AdvancedMarker, useMapsLibrary } from '@vis.gl/react-google-maps';

function safeRender(val: any): string {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') {
        return String(val.name || val.title || val.label || val.school_level || val.id || '');
    }
    return String(val);
}

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    errorMsg?: string;
}

class ApplicationFormErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: any): ErrorBoundaryState {
        return { hasError: true, errorMsg: error?.toString() || 'Bilinmeyen hata' };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error("ApplicationForm Error Boundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-8 shadow-xl max-w-md w-full text-center border border-slate-100">
                        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Başvuru Formu Yüklenemedi</h2>
                        <p className="text-slate-500 mb-6 text-sm">
                            Kayıt formunda beklenmedik bir durum oluştu. Lütfen sayfayı yenileyiniz.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20"
                        >
                            Sayfayı Yenile
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

const ApplicationForm: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [contractAccepted, setContractAccepted] = useState(false);
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
    const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
    const [companyName, setCompanyName] = useState<string>('');
    const [schools, setSchools] = useState<{id: string, name: string}[]>([]);
    const [neighborhoods, setNeighborhoods] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        studentName: '',
        parentName: '',
        parentTc: '',
        parentPhone: '',
        address: '',
        neighborhood: '',
        schoolLevel: '',
        schoolId: '',
        grade: ''
    });

    const geocodingLibrary = useMapsLibrary('geocoding');
    const [pickerCoordinates, setPickerCoordinates] = useState<[number, number] | null>(null);
    const [mapCenter, setMapCenter] = useState<[number, number]>([39.92077, 32.85411]); // Default Ankara
    const [mapZoom, setMapZoom] = useState(6);
    const [isSearchingMap, setIsSearchingMap] = useState(false);

    // 1. Validate Token and Get Company
    useEffect(() => {
        const fetchCompany = async () => {
            if (!token) {
                setError('Geçersiz bağlantı. Başvuru kodu bulunamadı.');
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase.rpc('get_company_info_by_token', {
                    p_token: token
                });

                if (error) throw error;

                if (data && data.success) {
                    setCompanyName(data.company_name);
                    setSchools(data.schools || []);
                    setNeighborhoods(data.neighborhoods || []);
                } else {
                    setError('Geçersiz veya süresi dolmuş başvuru bağlantısı.');
                }
            } catch (err: any) {
                console.error("Token validation error:", err);
                setError('Bağlantı kontrolü sırasında bir hata oluştu.');
            } finally {
                setLoading(false);
            }
        };

        fetchCompany();
    }, [token]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSearchAddress = async () => {
        if (!formData.address.trim() || !geocodingLibrary) return;
        
        setIsSearchingMap(true);
        try {
            const geocoder = new geocodingLibrary.Geocoder();
            const response = await geocoder.geocode({ address: formData.address + ' Turkey' });
            if (response.results && response.results.length > 0) {
                const location = response.results[0].geometry.location;
                const lat = location.lat();
                const lng = location.lng();
                setMapCenter([lat, lng]);
                setMapZoom(16);
                setPickerCoordinates([lat, lng]);
            } else {
                alert('Adres haritada bulunamadı. Lütfen daha açık yazın veya haritadan kendiniz işaretleyin.');
            }
        } catch (error) {
            console.error('Search error:', error);
            alert('Harita araması sırasında bir hata oluştu.');
        } finally {
            setIsSearchingMap(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        // Frontend LocalStorage Rate Limiting
        const today = new Date().toISOString().split('T')[0];
        const rateLimitKey = `registration_attempts_${today}`;
        const attempts = parseInt(localStorage.getItem(rateLimitKey) || '0', 10);
        
        if (attempts >= 3) {
            setError('Güvenlik nedeniyle bu cihazdan günlük kayıt sınırına (3) ulaştınız. Lütfen yarın tekrar deneyin.');
            return;
        }

        setSubmitting(true);
        setError(null);

        let lat = pickerCoordinates ? pickerCoordinates[0] : null;
        let lng = pickerCoordinates ? pickerCoordinates[1] : null;
        let addressStr = formData.address;
        
        // If they didn't pick on map, check if they pasted coordinates
        if (!lat || !lng) {
            const coordMatch = formData.address.trim().match(/^([+-]?\d+\.?\d*)\s*[,\s]\s*([+-]?\d+\.?\d*)$/);
            if (coordMatch) {
                lat = parseFloat(coordMatch[1]);
                lng = parseFloat(coordMatch[2]);
                addressStr = "Konum İşaretlendi 📍";
            } else if (addressStr.trim().length > 5) {
                // Geocode the address using Google Maps API
                try {
                    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
                    if (apiKey) {
                        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressStr)}&key=${apiKey}`);
                        const geocodeData = await res.json();
                        if (geocodeData.results && geocodeData.results.length > 0) {
                            lat = geocodeData.results[0].geometry.location.lat;
                            lng = geocodeData.results[0].geometry.location.lng;
                        }
                    }
                } catch (e) {
                    console.error("Geocoding failed:", e);
                }
            }
        }

        try {
            const { data, error } = await supabase.rpc('submit_student_application', {
                p_public_token: token,
                p_full_name: formData.studentName,
                p_parent_name: formData.parentName,
                p_parent_tc: formData.parentTc || null,
                p_parent_phone: formData.parentPhone,
                p_address: addressStr,
                p_lat: lat,
                p_lng: lng,
                p_school_id: formData.schoolId || null,
                p_school_level: formData.schoolLevel || null,
                p_grade: formData.grade || null,
                p_neighborhood: formData.neighborhood || null
            });

            if (error) throw error;

            if (data && data.success) {
                // Increment attempt counter on success
                localStorage.setItem(rateLimitKey, (attempts + 1).toString());
                setSubmitted(true);
            } else {
                console.error("RPC returned error:", data?.error);
                setError(data?.message || data?.error || 'Başvuru gönderilirken bir hata oluştu.');
            }
        } catch (err: any) {
            console.error("Form submit error:", err);
            setError(err.message || 'Sistemsel bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
                <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 flex flex-col items-center shadow-2xl animate-in zoom-in duration-500">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Smartphone className="text-white w-8 h-8 animate-pulse" />
                        </div>
                    </div>
                    <h2 className="text-white text-xl font-bold mt-6 tracking-tight">Güvenli Bağlantı Kuruluyor...</h2>
                    <p className="text-blue-200/80 text-sm mt-2 text-center max-w-[250px]">Lütfen bekleyin, okul ve firma bilgileri doğrulanıyor.</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-8 shadow-xl max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Hata</h2>
                    <p className="text-slate-500 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                    >
                        Ana Sayfaya Dön
                    </button>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-8 shadow-xl max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-500">
                        <CheckCircle2 size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Başvurunuz Alındı</h2>
                    <p className="text-slate-500 mb-6 font-medium">
                        {companyName} firmasına öğrenci kayıt ön başvurunuz başarıyla iletildi. Firma yetkilileri en kısa sürede sizinle iletişime geçecektir.
                    </p>
                    <p className="text-xs text-slate-400 mb-6">
                        Güvenle bu sayfayı kapatabilirsiniz.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 flex flex-col items-center">
            
            <div className="max-w-md w-full mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-2xl mb-4 shadow-sm border border-blue-200">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-600">
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Kayıt Başvurusu</h1>
                <p className="text-slate-500 font-medium">Lütfen öğrenci ve veli bilgilerini eksiksiz doldurunuz.</p>
                
                <div className="mt-4 py-2 px-4 bg-white rounded-xl shadow-sm border border-slate-200 inline-block font-bold text-blue-700">
                    {companyName}
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 border border-slate-100">
                <div className="p-6 sm:p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Öğrenci Adı Soyadı</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    required
                                    type="text"
                                    name="studentName"
                                    value={formData.studentName}
                                    onChange={handleChange}
                                    className="appearance-none block w-full pl-11 pr-3 py-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800 transition-colors"
                                    placeholder="Örn: Ahmet Yılmaz"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Veli Adı Soyadı</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Users className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    required
                                    type="text"
                                    name="parentName"
                                    value={formData.parentName}
                                    onChange={handleChange}
                                    className="appearance-none block w-full pl-11 pr-3 py-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800 transition-colors"
                                    placeholder="Örn: Mehmet Yılmaz"
                                    disabled={submitting}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Veli TC Kimlik No</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <CreditCard className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    required
                                    type="text"
                                    name="parentTc"
                                    value={formData.parentTc}
                                    onChange={handleChange}
                                    maxLength={11}
                                    pattern="\d{11}"
                                    className="appearance-none block w-full pl-11 pr-3 py-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800 transition-colors"
                                    placeholder="11 haneli TC Kimlik Numaranız"
                                    disabled={submitting}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Veli Telefon Numarası</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Phone className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    required
                                    type="tel"
                                    name="parentPhone"
                                    value={formData.parentPhone}
                                    onChange={handleChange}
                                    className="appearance-none block w-full pl-11 pr-3 py-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800 transition-colors"
                                    placeholder="05XX XXX XX XX"
                                    disabled={submitting}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Okul Seviyesi</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <GraduationCap className="h-5 w-5 text-slate-400" />
                                </div>
                                <select
                                    name="schoolLevel"
                                    value={formData.schoolLevel}
                                    onChange={(e: any) => handleChange(e)}
                                    className="appearance-none block w-full pl-11 pr-10 py-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800 transition-colors bg-white select-arrow"
                                    disabled={submitting}
                                >
                                    <option value="">Seçiniz...</option>
                                    <option value="primary">İlkokul</option>
                                    <option value="middle">Ortaokul</option>
                                    <option value="high">Lise</option>
                                </select>
                            </div>
                        </div>

                        {schools.length > 0 && (
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Okul Adı</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <School className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <select
                                        name="schoolId"
                                        value={formData.schoolId}
                                        onChange={(e: any) => handleChange(e)}
                                        className="appearance-none block w-full pl-11 pr-10 py-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800 transition-colors bg-white select-arrow"
                                        disabled={submitting}
                                    >
                                        <option value="">Seçiniz...</option>
                                        {schools.map((school, i) => {
                                            const id = typeof school === 'object' ? (school.id || String(i)) : String(school);
                                            const name = safeRender(school);
                                            return <option key={id} value={id}>{name}</option>;
                                        })}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">
                                        Fiyatlandırma Mahallesi
                                        <span className="text-red-500 ml-1">*</span>
                                    </label>
                                    <select
                                        required
                                        name="neighborhood"
                                        value={formData.neighborhood}
                                        onChange={handleChange as any}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                                    >
                                        <option value="">Lütfen Mahalle Seçin</option>
                                        {neighborhoods.map((n, i) => {
                                            const name = safeRender(n);
                                            return <option key={i} value={name}>{name}</option>;
                                        })}
                                        <option value="Diğer">Diğer (Listede Yok)</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Sınıf</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Building2 className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    name="grade"
                                    value={formData.grade}
                                    onChange={handleChange}
                                    className="appearance-none block w-full pl-11 pr-3 py-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800 transition-colors"
                                    placeholder="Örn: 9/A"
                                    disabled={submitting}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Ev/Alınacak Adres</label>
                            <div className="relative">
                                <div className="absolute top-3.5 left-0 pl-3.5 pointer-events-none">
                                    <MapPin className="h-5 w-5 text-slate-400" />
                                </div>
                                <textarea
                                    required
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    rows={3}
                                    className="appearance-none block w-full pl-11 pr-3 py-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800 transition-colors resize-none"
                                    placeholder="Mahalle, sokak..."
                                    disabled={submitting}
                                />
                            </div>
                            
                            <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-semibold text-slate-600">Haritadan Konum Seçin</span>
                                    <button 
                                        type="button"
                                        onClick={handleSearchAddress}
                                        disabled={isSearchingMap || !formData.address.trim()}
                                        className="text-xs bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                                    >
                                        {isSearchingMap ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                                        Yazdığım Adresi Bul
                                    </button>
                                </div>
                                <div className="h-[200px] w-full rounded-lg overflow-hidden border border-slate-200 relative">
                                    <Map
                                        center={{ lat: mapCenter[0], lng: mapCenter[1] }}
                                        zoom={mapZoom}
                                        mapId="registration_map"
                                        disableDefaultUI={false}
                                        gestureHandling="greedy"
                                        onClick={(e) => {
                                            if (e.detail.latLng) {
                                                setPickerCoordinates([e.detail.latLng.lat, e.detail.latLng.lng]);
                                            }
                                        }}
                                        onCameraChanged={(ev) => {
                                            setMapCenter([ev.detail.center.lat, ev.detail.center.lng]);
                                            setMapZoom(ev.detail.zoom);
                                        }}
                                    >
                                        {pickerCoordinates && (
                                            <AdvancedMarker position={{ lat: pickerCoordinates[0], lng: pickerCoordinates[1] }} />
                                        )}
                                    </Map>
                                </div>
                                <div className="mt-2 text-[10px] flex items-start gap-1">
                                    {pickerCoordinates ? (
                                        <>
                                            <CheckCircle2 size={12} className="shrink-0 text-emerald-500 mt-0.5" />
                                            <span className="text-emerald-600 font-medium">📍 Konum başarıyla işaretlendi. İsterseniz haritaya tıklayarak pimin yerini değiştirebilirsiniz.</span>
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle size={12} className="shrink-0 text-blue-500 mt-0.5" />
                                            <span className="text-slate-500">Lütfen harita üzerinde tam konumunuzu tıklayarak işaretleyin veya 'Yazdığım Adresi Bul' butonuna basın. (Kırmızı pin çıkacaktır)</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sözleşme Kabul */}
                        <div className="pt-1">
                            <div
                                onClick={() => {
                                    if (submitting) return;
                                    if (contractAccepted) {
                                        setContractAccepted(false);
                                    } else {
                                        setIsTermsModalOpen(true);
                                    }
                                }}
                                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all select-none ${
                                    contractAccepted
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                                }`}
                            >
                                <div className="relative flex-shrink-0 mt-0.5">
                                    <input
                                        type="checkbox"
                                        checked={contractAccepted}
                                        readOnly
                                        disabled={submitting}
                                        className="sr-only"
                                    />
                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                        contractAccepted
                                            ? 'bg-blue-600 border-blue-600'
                                            : 'bg-white border-slate-300'
                                    }`}>
                                        {contractAccepted && (
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                                <span className="text-sm text-slate-600 leading-relaxed">
                                    <span className="font-semibold text-slate-800">Sözleşme metnini okudum, kabul ediyorum.</span>
                                    {' '}
                                    <span 
                                        onClick={(e) => {
                                            e.stopPropagation(); // prevent div onClick
                                            setIsTermsModalOpen(true);
                                        }}
                                        className="text-blue-600 underline underline-offset-2 cursor-pointer hover:text-blue-700"
                                    >
                                        Sözleşmeyi görüntüle
                                    </span>
                                </span>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={submitting || !contractAccepted}
                                className="w-full py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-500/30 text-base font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                            >
                                {submitting ? (
                                    <><Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" /> Gönderiliyor...</>
                                ) : (
                                    <><Send className="-ml-1 mr-2 h-5 w-5" /> Başvuruyu Gönder</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
                
                <div className="bg-slate-50 py-4 px-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs font-medium text-slate-400">
                    <CheckCircle2 size={14} />
                    Bilgileriniz güvenle iletilmektedir
                </div>
            </div>
            
            {/* Terms of Service Modal */}
            {isTermsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                            <h3 className="text-lg font-bold text-slate-800">
                                Hizmet Sözleşmesi ve Kullanıcı Onay Metni
                            </h3>
                            <button 
                                onClick={() => setIsTermsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div 
                            className="p-6 overflow-y-auto text-sm text-slate-600 space-y-4"
                            onScroll={(e) => {
                                const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                                // 10px tolerance
                                if (scrollHeight - scrollTop <= clientHeight + 10) {
                                    setIsScrolledToBottom(true);
                                }
                            }}
                        >
                            <p className="font-semibold text-slate-700">Lütfen aşağıdaki metni dikkatlice okuyunuz. "Okudum ve Onaylıyorum" seçeneğini işaretleyerek aşağıdaki şartları kabul etmiş sayılırsınız.</p>
                            
                            <h3 className="font-bold text-lg text-slate-800 text-center mt-4">ÖĞRENCİ SERVİS KAYIT SÖZLEŞMESİ</h3>

                            <p className="font-semibold text-slate-800"><span className="underline">KONU:</span> 2026/2027 Eğitim ve öğretim yılında öğrenci taşımacılığında velinin ve taşımacılığı üstlenen firmanın menfaatlerini korumak amacıyla bahsedilen öğretim yılında aşağıda belirtilecek şekilde yapılacaktır.</p>

                            <ol className="list-decimal pl-5 space-y-3 font-medium text-slate-700">
                                <li>Servis araçlarımız İçişleri Bakanlığı'nın 28.08.2007 tarih 26627 sayılı okul servis araçları yönetmeliğine uygundur.</li>
                                <li>Servis araçları öğrenciyi aldığı durağa 15 dakika gecikmesi halinde öğrenci ya da öğrenci velisi okul servis yetkilisini arayıp servis aracı hakkında bilgi alır. Servis yetkilisinin aracın gelemeyeceğini bildirmesi durumunda güzergah üzerindeki diğer servis öğrencilerini almak suretiyle taksi ile okula gelebilir. Bu durumda taksi ücreti servis yetkilisi tarafından karşılanır. Öğrencinin kendi kusuruyla servisi kaçırması durumunda sorumluluk öğrenciye aittir.</li>
                                <li>Servis konusunda velinin muhatabı firmadır. Veli veya öğrenci servis hakkında şikayet ve isteklerini (servis güzergahı, durağı, saati, vb. konularda) servis yetkilisine iletmelidir. Servis şoförü bu konularda yetkili değildir.</li>
                                <li>Öğrencinin servisteki hal ve hareketleri bir öğrenciye yakışır, diğer öğrenciler ve servis şoförünü rahatsız etmeyecek şekilde olmalıdır. Araçta alkol, sigara vb. bağımlılık yaratıcı ve kullanımı yasak olan maddelerin kullanımı kesinlikle yasaktır. Bu kurallara aykırılık tespit edilmesi halinde yetkili makamlara bildirilmekle birlikte öğrencinin servisle ilişkisi kesilir. Kalan borç miktarı muaccel olur.</li>
                                <li>Servis araçlarımızın ulaşım hattı belediye güzergahına göre düzenlenir, tüm öğrencilerin ikamet adresleri düşünülerek servis şirketi tarafından belirlenir. Şirket tarafından belirlenen güzergaha uygun olduğu ölçüde öğrenci ikametinin önünde ya da ikametine yakın bir noktada indirilir.</li>
                                <li>
                                    <p>Servis ücretlerinin ödemesi okuldaki servis yetkilisine yapılır. Başka birine yapılan ödemeler geçerli değildir. İlk taksit en geç okulların açıldığı gün peşin olarak alınmak suretiyle, taksit ödemeleri her ayın 1'i ile 10'u arasında yapılır. Servis ücretleri belirlenip 10 (on) taksit halinde ödenmesi kararlaştırıldığı için toplam sene üzerinden hesaplanmakta olup, ara tatiller, resmi ve milli tatiller ile eğitim öğretime ara verildiği dönemler belirlenen fiyata dahil değildir.</p>
                                    <p>Yıllık servis ücreti ....................................TL+KDV'dir.</p>
                                    <p>Ödeme günü üzerinden 15 gün geçmiş olmasına rağmen ödeme yapılmadığı takdirde, tüm alacak miktarı muacceliyet kazanmış olacaktır.</p>
                                </li>
                                <li>Ücretlendirme Ankara Ticaret Odası ya da Ankara Servisçiler Odası tarafından belirlenen fiyatlar dikkate alınarak servis şirketi tarafından belirlenir. Bahsedilen kuruluşların fiyat açıklamaması durumunda fiyat listesi okulun açılış tarihinden itibaren akaryakıt zammı, önceki yıla ait servis ücretleri, enflasyon artışı, işçilik giderlerindeki artış, tarife değişikliği göz önünde bulundurularak servis şirketi tarafından yapılacaktır. Enflasyon artışı nedeniyle sene içerisinde tarafların anlaştığı fiyatlarda artış ve güncelleme yapılabilir. Bu değişiklikler velilerin telefonlarına yazılı bildirim olarak gönderilecektir. Servis şirketinin sene içerisinde akaryakıt ve diğer giderlere gelen zamlar nedeniyle servis ücretinde değişiklik yapma hakkı saklı tutulmaktadır.</li>
                                <li>Servis araçları sene başında serviste bulunan boş yer ve kayıt olan öğrenci sayısına göre belirlendiği için servis şirketi öğrencinin servise kaydını tüm eğitim öğretim yılı düşünülerek yapmaktadır. Sözleşmede belirtilen eğitim öğretim yılı bitiminden önce öğrencinin servisten ayrılması durumunda velinin</li>
                                <li>Servis şirketi ile yapılan sözleşmenin veli tarafından, haklı sebebe dayanmadan, tek taraflı feshedilmesi durumunda tüm alacak muacceliyet kazanır. Mücbir sebepler dışında taşınma, nakil gibi sebepler haklı sebep sayılmamaktadır.</li>
                                <li>Öğrenci sayısının serviste azalması durumunda şirketin mevcut öğrencileri diğer servis araçları ile birleştirme imkanı bulunmaktadır. Şirketin bu konuda sözleşmede değişiklik yapma hakkı saklıdır.</li>
                                <li>Bir bölgede servise kayıt olan öğrenci sayısının 12'yi geçmemesi halinde şirket sözleşmeyi tek taraflı olarak feshetme hakkına haizdir. Veli bu durumda hiçbir hak talep etmeyeceğini kabul ederek sözleşmeyi imzalamıştır.</li>
                                <li>Ödenen servis borçları öğrenci zarfına ve öğrenci ödeme listesine servis yetkilisi tarafından işlenir. Veli ödemelerini öğrenci zarfından takip edecektir. Ödemeler hususunda herhangi bir ihtilafa düşülmesi durumunda firmada bulunan öğrenci ödeme listeleri geçerlidir.</li>
                                <li>Öğretim yılı sonunda öğrencinin öğrenci zarfında borcu gözükmüyorsa senet yetkili tarafından iptal edilip, veliye iade edilir. İş bu sözleşme iki nüsha olarak tanzim edilmiştir.</li>
                            </ol>
                        </div>
                        <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
                            <button 
                                disabled={!isScrolledToBottom}
                                onClick={() => {
                                    setIsTermsModalOpen(false);
                                    setContractAccepted(true);
                                }}
                                className={`px-6 py-2.5 text-white rounded-xl font-bold transition-all shadow-sm ${
                                    isScrolledToBottom 
                                        ? 'bg-blue-600 hover:bg-blue-700' 
                                        : 'bg-slate-300 cursor-not-allowed'
                                }`}
                            >
                                {isScrolledToBottom ? 'Okudum, Onaylıyorum' : 'Aşağıya Kaydırın'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ApplicationFormWrapped: React.FC = (props) => (
    <ApplicationFormErrorBoundary>
        <ApplicationForm {...props} />
    </ApplicationFormErrorBoundary>
);

export default ApplicationFormWrapped;
