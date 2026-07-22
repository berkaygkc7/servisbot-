import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, CheckCircle2, User, Phone, MapPin, AlertCircle, Loader2, GraduationCap, School, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const ApplicationForm: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [contractAccepted, setContractAccepted] = useState(false);
    const [companyName, setCompanyName] = useState<string>('');
    const [schools, setSchools] = useState<{id: string, name: string}[]>([]);

    const [formData, setFormData] = useState({
        studentName: '',
        parentName: '',
        parentPhone: '',
        address: '',
        schoolLevel: '',
        schoolId: '',
        grade: ''
    });

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        setSubmitting(true);
        setError(null);

        let lat = null;
        let lng = null;
        let addressStr = formData.address;
        
        const coordMatch = formData.address.trim().match(/^([+-]?\d+\.?\d*)\s*[,\s]\s*([+-]?\d+\.?\d*)$/);
        if (coordMatch) {
            lat = parseFloat(coordMatch[1]);
            lng = parseFloat(coordMatch[2]);
            addressStr = "Konum İşaretlendi 📍";
        }

        try {
            const { data, error } = await supabase.rpc('submit_student_application', {
                p_public_token: token,
                p_full_name: formData.studentName,
                p_parent_name: formData.parentName,
                p_parent_phone: formData.parentPhone,
                p_address: addressStr,
                p_lat: lat,
                p_lng: lng,
                p_school_id: formData.schoolId || null,
                p_school_level: formData.schoolLevel || null,
                p_grade: formData.grade || null
            });

            if (error) throw error;

            if (data && data.success) {
                setSubmitted(true);
            } else {
                setError(data?.message || 'Başvuru gönderilirken bir hata oluştu.');
            }
        } catch (err: any) {
            console.error("Form submit error:", err);
            setError('Sistemsel bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={32} />
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
                                    disabled={submitting}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Veli Adı Soyadı</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-400" />
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
                                        {schools.map(school => (
                                            <option key={school.id} value={school.id}>{school.name}</option>
                                        ))}
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
                                    placeholder="Mahalle, sokak... Veya koordinat: 40.348, 36.543"
                                    disabled={submitting}
                                />
                            </div>
                            <p className="mt-2 ml-1 text-xs text-slate-500 flex items-start gap-1.5">
                                <AlertCircle size={14} className="shrink-0 mt-0.5 text-blue-500" /> 
                                <span>Daha doğru bir konumlandırma için lütfen Google Haritalar'dan evinizin konumunu bularak, kordinatları (örn: <strong className="font-semibold text-slate-700">40.348, 36.543</strong>) kopyalayıp adres alanına yapıştırın.</span>
                            </p>
                        </div>

                        {/* Sözleşme Kabul */}
                        <div className="pt-1">
                            <label
                                htmlFor="contract-checkbox"
                                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all select-none ${
                                    contractAccepted
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                                }`}
                            >
                                <div className="relative flex-shrink-0 mt-0.5">
                                    <input
                                        id="contract-checkbox"
                                        type="checkbox"
                                        checked={contractAccepted}
                                        onChange={(e) => setContractAccepted(e.target.checked)}
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
                                    <span className="text-blue-600 underline underline-offset-2 cursor-pointer hover:text-blue-700">
                                        Sözleşmeyi görüntüle
                                    </span>
                                </span>
                            </label>
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
            
        </div>
    );
};

export default ApplicationForm;
