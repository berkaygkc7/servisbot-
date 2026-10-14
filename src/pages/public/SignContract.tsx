import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
    CheckCircle2, 
    AlertCircle, 
    FileText, 
    Send, 
    Loader2, 
    ShieldCheck, 
    School, 
    User, 
    Phone, 
    MapPin
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import SignaturePad from '../../components/shared/SignaturePad';

interface ContractData {
    id: string;
    full_name: string;
    parent_name: string;
    parent_phone: string;
    parent_tc?: string;
    address: string;
    grade?: string;
    total_debt?: number;
    custom_price?: number;
    shift?: string;
    parent_signature?: string | null;
    contract_signed_at?: string | null;
    school_name?: string;
    company_name?: string;
    company_logo?: string | null;
}

const SignContract: React.FC = () => {
    const { token } = useParams<{ token: string }>();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [contract, setContract] = useState<ContractData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [contractAccepted, setContractAccepted] = useState(false);
    const [signature, setSignature] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        const fetchContract = async () => {
            if (!token) {
                setError('Geçersiz sözleşme bağlantısı.');
                setLoading(false);
                return;
            }

            try {
                // 1. Try RPC
                const { data, error: rpcError } = await supabase.rpc('get_contract_by_token', { p_token: token });

                if (!rpcError && data && data.success && data.student) {
                    setContract(data.student);
                    if (data.student.parent_signature) {
                        setIsSuccess(true);
                    }
                    setLoading(false);
                    return;
                }

                // 2. Fallback direct query if RPC has not been created yet in DB
                const { data: dbStudent, error: dbError } = await supabase
                    .from('students')
                    .select('*, schools(name), companies(company_name, logo_url)')
                    .or(`login_token.eq.${token},id.eq.${token}`)
                    .maybeSingle();

                if (dbError || !dbStudent) {
                    setError('Sözleşme bulunamadı veya bağlantı süresi dolmuş.');
                } else {
                    const formatted: ContractData = {
                        id: dbStudent.id,
                        full_name: dbStudent.full_name,
                        parent_name: dbStudent.parent_name,
                        parent_phone: dbStudent.parent_phone,
                        parent_tc: dbStudent.parent_tc,
                        address: dbStudent.address,
                        grade: dbStudent.grade,
                        total_debt: dbStudent.total_debt,
                        custom_price: dbStudent.custom_price,
                        shift: dbStudent.shift,
                        parent_signature: dbStudent.parent_signature,
                        contract_signed_at: dbStudent.contract_signed_at,
                        school_name: dbStudent.schools?.name || '',
                        company_name: dbStudent.companies?.company_name || '',
                        company_logo: dbStudent.companies?.logo_url
                    };
                    setContract(formatted);
                    if (formatted.parent_signature) {
                        setIsSuccess(true);
                    }
                }
            } catch (err: any) {
                console.error('Error fetching contract for signing:', err);
                setError('Sözleşme yüklenirken bir sorun oluştu.');
            } finally {
                setLoading(false);
            }
        };

        fetchContract();
    }, [token]);

    const handleSignSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        if (!contractAccepted) {
            alert('Lütfen sözleşme şartlarını okuyup kabul ettiğinizi onaylayınız.');
            return;
        }

        if (!signature) {
            alert('Lütfen parmağınızla imza kutusuna imzanızı atınız.');
            return;
        }

        setSubmitting(true);

        try {
            // 1. Try RPC
            const { data, error: rpcError } = await supabase.rpc('sign_contract_by_token', {
                p_token: token,
                p_signature: signature
            });

            if (!rpcError && data && data.success) {
                setIsSuccess(true);
                setContract(prev => prev ? {
                    ...prev,
                    parent_signature: signature,
                    contract_signed_at: new Date().toISOString()
                } : null);
                return;
            }

            // 2. Fallback update
            const { error: updateError } = await supabase
                .from('students')
                .update({
                    parent_signature: signature,
                    contract_signed_at: new Date().toISOString()
                })
                .or(`login_token.eq.${token},id.eq.${token}`);

            if (updateError) throw updateError;

            setIsSuccess(true);
            setContract(prev => prev ? {
                ...prev,
                parent_signature: signature,
                contract_signed_at: new Date().toISOString()
            } : null);

        } catch (err: any) {
            console.error('Signing error:', err);
            alert(err.message || 'İmza kaydedilirken bir hata oluştu. Lütfen tekrar deneyiniz.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl flex flex-col items-center max-w-sm w-full text-center border border-slate-100">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                    <h3 className="font-bold text-slate-800 text-lg">Sözleşme Yükleniyor</h3>
                    <p className="text-slate-400 text-xs mt-1">Lütfen bekleyiniz, öğrenci ve sözleşme detayları getiriliyor...</p>
                </div>
            </div>
        );
    }

    if (error || !contract) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 shadow-xl max-w-md w-full text-center border border-slate-100">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Sözleşme Bulunamadı</h2>
                    <p className="text-slate-500 text-sm mb-6 font-medium">
                        {error || 'Geçersiz veya süresi dolmuş imza bağlantısı.'}
                    </p>
                    <p className="text-xs text-slate-400">
                        Lütfen servis firmanız ile iletişime geçerek yeni bir imza linki talep ediniz.
                    </p>
                </div>
            </div>
        );
    }

    const companyName = contract.company_name || 'Öğrenci Servis Taşımacılığı';

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 py-6 px-3 sm:px-6 flex justify-center">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 relative overflow-hidden">
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-bold text-2xl shadow-inner shrink-0">
                            {contract.company_logo ? (
                                <img src={contract.company_logo} alt="Firma Logo" className="w-full h-full object-cover rounded-2xl" />
                            ) : (
                                <FileText className="text-blue-400" size={28} />
                            )}
                        </div>
                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-widest text-blue-400 block">
                                {companyName}
                            </span>
                            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white mt-0.5">
                                Öğrenci Taşıma Sözleşmesi & Senet Onayı
                            </h1>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 sm:p-7 space-y-6 flex-1">
                    {/* Student Info Card */}
                    <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2">
                            Öğrenci ve Veli Bilgileri
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="flex items-center gap-2">
                                <User size={15} className="text-blue-600 shrink-0" />
                                <div>
                                    <span className="text-slate-400 block text-[10px]">Öğrenci Adı Soyadı</span>
                                    <strong className="text-slate-800 text-sm">{contract.full_name}</strong>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <User size={15} className="text-slate-400 shrink-0" />
                                <div>
                                    <span className="text-slate-400 block text-[10px]">Veli Adı Soyadı</span>
                                    <strong className="text-slate-800">{contract.parent_name || 'Belirtilmedi'}</strong>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <School size={15} className="text-slate-400 shrink-0" />
                                <div>
                                    <span className="text-slate-400 block text-[10px]">Okul / Sınıf</span>
                                    <span className="font-semibold text-slate-800">
                                        {contract.school_name || '-'} {contract.grade ? `(${contract.grade}. Sınıf)` : ''}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Phone size={15} className="text-slate-400 shrink-0" />
                                <div>
                                    <span className="text-slate-400 block text-[10px]">İletişim Telefonu</span>
                                    <span className="font-semibold text-slate-800">{contract.parent_phone}</span>
                                </div>
                            </div>

                            {contract.total_debt ? (
                                <div className="col-span-1 sm:col-span-2 bg-blue-50/70 border border-blue-200/80 p-3 rounded-xl flex items-center justify-between">
                                    <span className="font-medium text-blue-900 text-xs">Sezonluk Servis Ücreti:</span>
                                    <span className="font-black text-blue-700 text-base">
                                        {Number(contract.total_debt).toLocaleString('tr-TR')} ₺
                                    </span>
                                </div>
                            ) : null}

                            {contract.address && (
                                <div className="col-span-1 sm:col-span-2 flex items-start gap-2 pt-1 border-t border-slate-200">
                                    <MapPin size={15} className="text-slate-400 shrink-0 mt-0.5" />
                                    <span className="text-slate-600 leading-snug">{contract.address}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* If Already Signed */}
                    {isSuccess ? (
                        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-6 text-center space-y-4 animate-in zoom-in-95 duration-300">
                            <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30">
                                <CheckCircle2 size={36} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-emerald-900">
                                    Sözleşme Başarıyla İmzalandı!
                                </h3>
                                <p className="text-xs text-emerald-700 mt-1 max-w-sm mx-auto font-medium">
                                    Sayın {contract.parent_name}, öğrenciniz {contract.full_name} için servis taşıma sözleşmesini dokunmatik olarak onayladınız ve imzanız firmanızın sistemine resmi olarak kaydedildi.
                                </p>
                            </div>

                            {/* Rendered Signature Card */}
                            {(contract.parent_signature || signature) && (
                                <div className="bg-white p-4 rounded-2xl border border-emerald-200 max-w-xs mx-auto shadow-sm">
                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-1">
                                        Kayıtlı Veli Islak İmzası
                                    </span>
                                    <img 
                                        src={contract.parent_signature || signature!} 
                                        alt="Kaydedilen Veli İmzası" 
                                        className="h-16 max-w-full object-contain mx-auto my-1" 
                                    />
                                    {contract.contract_signed_at && (
                                        <span className="text-[10px] text-slate-500 font-medium block mt-1 border-t border-slate-100 pt-1">
                                            İmza Tarihi: {new Date(contract.contract_signed_at).toLocaleString('tr-TR')}
                                        </span>
                                    )}
                                </div>
                            )}

                            <p className="text-[11px] text-emerald-600 font-medium">
                                Bu pencereyi kapatabilirsiniz. İyi ve güvenli bir eğitim-öğretim yılı dileriz.
                            </p>
                        </div>
                    ) : (
                        /* Signing Form */
                        <form onSubmit={handleSignSubmit} className="space-y-6">
                            {/* Contract Clauses Box */}
                            <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 max-h-72 overflow-y-auto text-xs text-slate-600 space-y-3 bg-slate-50/50 leading-relaxed custom-scrollbar">
                                <h4 className="font-bold text-sm text-slate-800 border-b border-slate-200 pb-2">
                                    Sözleşme Maddeleri ve Şartları
                                </h4>
                                <ol className="list-decimal pl-4 space-y-2">
                                    <li>Servis araçlarımız İçişleri Bakanlığı Okul Servis Araçları Yönetmeliği'ne tam uyumludur.</li>
                                    <li>Servis araçları öğrenciyi aldığı durağa gecikmesi halinde öğrenci velisi firma yetkilisi ile irtibata geçer.</li>
                                    <li>Servis konusunda velinin doğrudan muhatabı ilgili taşıma firmasıdır.</li>
                                    <li>Öğrencinin araçtaki hal ve hareketleri genel ahlak ve disiplin kurallarına uygun olacaktır.</li>
                                    <li>Servis araçlarımızın ulaşım hattı belediye güzergahına ve öğrenci ikamet adresine uygun olarak planlanır.</li>
                                    <li>Servis ücreti peşin veya anlaşılan taksitler halinde belirtilen tarihlerde ödenir.</li>
                                    <li>Ücretlendirmede yetkili kurumlarca belirlenen fiyat tarifesi ve akaryakıt güncellemeleri esas alınır.</li>
                                    <li>Sözleşme eğitim-öğretim yılı boyunca geçerli olup, keyfi olarak sözleşme feshedilemez.</li>
                                    <li>İş bu sözleşme karşılıklı mutabakatla düzenlenmiş olup veli tarafından dokunmatik olarak imzalanarak senet niteliği taşımaktadır.</li>
                                </ol>
                                <p className="font-bold text-center text-slate-800 pt-2 border-t border-slate-200">
                                    ⚠️ İş bu sözleşme veli ve firma arasında senet niteliği taşımaktadır.
                                </p>
                            </div>

                            {/* Checkbox */}
                            <div 
                                onClick={() => setContractAccepted(!contractAccepted)}
                                className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all select-none ${
                                    contractAccepted
                                        ? 'border-blue-600 bg-blue-50/70'
                                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={contractAccepted}
                                    readOnly
                                    className="mt-0.5 h-4 w-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                                />
                                <span className="text-xs sm:text-sm text-slate-700 leading-snug">
                                    Yukarıdaki sözleşme metnini ve senet taahhüt şartlarını okudum, aynen kabul ve taahhüt ediyorum.
                                </span>
                            </div>

                            {/* Signature Pad */}
                            <div className="pt-1">
                                <SignaturePad
                                    onSignatureChange={(sig) => setSignature(sig)}
                                    disabled={submitting}
                                    height={160}
                                />
                            </div>

                            {/* Submit Button */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={submitting || !contractAccepted || !signature}
                                    className="w-full py-4 px-6 rounded-2xl shadow-lg shadow-blue-600/30 text-white bg-blue-600 hover:bg-blue-700 font-bold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="animate-spin" size={20} />
                                            İmzanız Kaydediliyor...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={18} />
                                            Sözleşmeyi Onayla ve İmzala
                                        </>
                                    )}
                                </button>
                                {(!contractAccepted || !signature) && (
                                    <p className="text-center text-xs text-amber-700 font-medium mt-2.5">
                                        {!contractAccepted 
                                            ? '⚠️ Lütfen önce sözleşme şartlarını onaylayınız.' 
                                            : '✍️ Lütfen parmağınızla yukarıdaki kutucuğa imzanızı atınız.'}
                                    </p>
                                )}
                            </div>
                        </form>
                    )}
                </div>

                {/* Footer Security Badge */}
                <div className="bg-slate-50 py-3.5 px-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    256-bit SSL ile güvenli dijital onay sistemi
                </div>
            </div>
        </div>
    );
};

export default SignContract;
