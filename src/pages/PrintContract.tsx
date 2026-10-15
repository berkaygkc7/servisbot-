import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import PersonalizedContractDocument from '../components/contracts/PersonalizedContractDocument';

const PrintContract: React.FC = () => {
    const { profile } = useAuth();
    const [printData, setPrintData] = useState<any>(null);

    useEffect(() => {
        const dataStr = localStorage.getItem('print_contract_data');
        if (dataStr) {
            try {
                const data = JSON.parse(dataStr);
                setPrintData(data);
                
                // If signature was not in localStorage data, fetch live from Supabase
                if (data?.student?.id && !data.student.parent_signature) {
                    (async () => {
                        try {
                            const { data: dbStudent } = await supabase
                                .from('students')
                                .select('parent_signature, contract_signed_at')
                                .eq('id', data.student.id)
                                .maybeSingle();

                            if (dbStudent?.parent_signature) {
                                setPrintData((prev: any) => ({
                                    ...prev,
                                    student: {
                                        ...prev?.student,
                                        parent_signature: dbStudent.parent_signature,
                                        contract_signed_at: dbStudent.contract_signed_at
                                    }
                                }));
                            }
                        } catch (err: unknown) {
                            console.log('Could not fetch student signature', err);
                        } finally {
                            setTimeout(() => {
                                window.print();
                            }, 250);
                        }
                    })();
                } else {
                    // Data already contains everything needed, trigger print swiftly
                    setTimeout(() => {
                        window.print();
                    }, 250);
                }
            } catch (err) {
                console.error("Error parsing print data", err);
            }
        }
    }, []);

    if (!printData) {
        return (
            <div className="p-10 text-center font-bold text-slate-500">
                Yazdırılacak sözleşme bulunamadı. Lütfen listeye dönüp tekrar "Yazdır" butonuna basın.
            </div>
        );
    }

    const { student } = printData;
    const companyName = student?.company_name || profile?.companies?.company_name || 'Öğrenci Servis Taşımacılığı';
    const companyLogo = student?.company_logo || profile?.companies?.logo_url;

    return (
        <div className="bg-slate-100 min-h-screen text-slate-900 font-sans print:bg-white print:p-0 print:m-0 print:min-h-0">
            {/* Print Specific Global Reset */}
            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 4mm 6mm !important;
                    }
                    html, body {
                        width: 100% !important;
                        height: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        overflow: hidden !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>

            {/* Top Toolbar (Screen only) */}
            <div className="no-print fixed top-0 left-0 right-0 bg-slate-900 text-white px-4 py-3 sm:px-6 flex justify-between items-center shadow-lg z-50">
                <div className="flex items-center gap-3">
                    <span className="text-xl">📄</span>
                    <div>
                        <h2 className="font-bold text-sm sm:text-base m-0 leading-tight">
                            Resmi Sözleşme Yazdırma (Tek Sayfa A4)
                        </h2>
                        <p className="text-slate-300 text-xs mt-0.5 hidden sm:block">
                            Sözleşme ve senet metni A4 tek sayfaya tam sığacak şekilde optimize edilmiştir.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => window.close()} 
                        className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                    >
                        Kapat
                    </button>
                    <button 
                        onClick={() => window.print()} 
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                        <span>🖨️</span> Yazdır / PDF Kaydet
                    </button>
                </div>
            </div>

            {/* Document Content */}
            <div className="pt-16 pb-10 print:pt-0 print:pb-0 px-2 sm:px-4 flex justify-center">
                <div className="w-full max-w-[210mm] bg-white shadow-2xl print:shadow-none rounded-2xl print:rounded-none overflow-hidden print:overflow-visible">
                    <PersonalizedContractDocument
                        student={student}
                        companyName={companyName}
                        companyLogo={companyLogo}
                    />
                </div>
            </div>
        </div>
    );
};

export default PrintContract;
