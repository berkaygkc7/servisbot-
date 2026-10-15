import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
    CheckCircle2, 
    AlertCircle, 
    FileText, 
    Send, 
    Loader2, 
    ShieldCheck, 
    Printer
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import SignaturePad from '../../components/shared/SignaturePad';
import PersonalizedContractDocument from '../../components/contracts/PersonalizedContractDocument';

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
    const isSigned = isSuccess || Boolean(contract.parent_signature);

    return (
        <div className="min-h-screen bg-slate-100 py-6 px-3 sm:px-6 flex justify-center">
            <style>{`
                @media print {
                    @page { size: A4 portrait; margin: 8mm; }
                    body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .no-print { display: none !important; }
                    .print-full { max-width: 100% !important; margin: 0 !important; box-shadow: none !important; border: none !important; }
                }
            `}</style>

            <div className="w-full max-w-4xl space-y-4 print-full">
                {/* Header (hidden in print) */}
                <div className="no-print bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                            {contract.company_logo ? (
                                <img src={contract.company_logo} alt="Firma Logo" className="w-full h-full object-cover rounded-2xl" />
                            ) : (
                                <FileText className="text-blue-400" size={24} />
                            )}
                        </div>
                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-widest text-blue-600 block">
                                {companyName}
                            </span>
                            <h1 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">
                                {isSigned ? 'Onaylı Öğrenci Servis Sözleşmesi' : 'Öğrenci Servis Sözleşmesi ve Senet Onayı'}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {isSigned && (
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
                            >
                                <Printer size={15} />
                                Sözleşmeyi Yazdır / PDF
                            </button>
                        )}
                    </div>
                </div>

                {/* Status Notice Banner (hidden in print) */}
                <div className="no-print">
                    {isSigned ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                                <CheckCircle2 size={20} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-bold text-emerald-900">
                                    Sözleşmeniz Resmi Olarak Onaylanmıştır
                                </h3>
                                <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
                                    Sayın <strong>{contract.parent_name}</strong>, öğrenciniz <strong>{contract.full_name}</strong> için servis taşıma sözleşmesi ve senet taahhüdü onaylanmış olup, ıslak imzanız resmi nüshaya kaydedilmiştir. Aşağıdan sözleşmenizi inceleyebilir, çıktısını alabilir veya PDF olarak saklayabilirsiniz.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                                <FileText size={18} />
                            </div>
                            <div>
                                <h3 className="text-xs sm:text-sm font-bold text-blue-900">
                                    Lütfen Sözleşmenizi İnceleyip Aşağıdan İmzalayınız
                                </h3>
                                <p className="text-[11px] sm:text-xs text-blue-700 mt-0.5 leading-relaxed">
                                    Sayın <strong>{contract.parent_name}</strong>, öğrenciniz <strong>{contract.full_name}</strong> için <strong>{companyName}</strong> tarafından hazırlanan resmi servis taşıma sözleşmesi aşağıdadır. Maddeleri ve senet taahhüdünü inceledikten sonra alt kısımdaki imza kutusundan imzanızı atarak onaylayabilirsiniz.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* The FULL Personalized Contract Document */}
                <div className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden">
                    <PersonalizedContractDocument
                        student={contract}
                        companyName={companyName}
                        companyLogo={contract.company_logo}
                    />
                </div>

                {/* Signing Area (if unsigned, hidden in print) */}
                {!isSigned && (
                    <div className="no-print bg-white rounded-3xl p-5 sm:p-7 shadow-md border border-slate-200">
                        <form onSubmit={handleSignSubmit} className="space-y-5">
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
                                <span className="text-xs sm:text-sm text-slate-700 leading-snug font-medium">
                                    Yukarıdaki öğrenci taşıma sözleşmesi metnini ve senet taahhüt şartlarını okudum, aynen kabul ve taahhüt ediyorum.
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
                                    className="w-full py-4 px-6 rounded-2xl shadow-lg shadow-blue-600/30 text-white bg-blue-600 hover:bg-blue-700 font-bold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
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
                    </div>
                )}

                {/* Footer Security Badge */}
                <div className="no-print bg-white rounded-2xl py-3 px-6 border border-slate-200 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    256-bit SSL ile güvenli dijital sözleşme sistemi
                </div>
            </div>
        </div>
    );
};

export default SignContract;
