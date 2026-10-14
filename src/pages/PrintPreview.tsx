import React, { useEffect, useState } from 'react';

const PrintPreview: React.FC = () => {
    const [printData, setPrintData] = useState<any>(null);

    useEffect(() => {
        // Read data from localStorage
        const dataStr = localStorage.getItem('print_vehicle_data');
        if (dataStr) {
            try {
                const data = JSON.parse(dataStr);
                setPrintData(data);
                
                // Trigger print swiftly after styles render
                setTimeout(() => {
                    window.print();
                }, 150);
            } catch (err) {
                console.error("Error parsing print data", err);
            }
        }
    }, []);

    if (!printData) {
        return (
            <div className="p-10 text-center font-bold text-slate-500">
                Yazdırılacak veri bulunamadı. Lütfen sekmeyi kapatıp araçlar sayfasından tekrar "Yazdır" butonuna basın.
            </div>
        );
    }

    const { vehicle, students = [] } = printData;

    // Sayfalara dengeli dağıtım mantığı
    const getPages = (studentsList: any[]) => {
        if (!studentsList || studentsList.length === 0) return [[]];
        
        // 15 ve altı öğrenci: Tek sayfa
        if (studentsList.length <= 15) {
            return [studentsList];
        }
        
        // 16 - 32 arası öğrenci (örneğin 30 öğrencilik liste): Tam 2 sayfaya eşit/dengeli dağıt (15 - 15)
        if (studentsList.length <= 32) {
            const half = Math.ceil(studentsList.length / 2);
            return [
                studentsList.slice(0, half),
                studentsList.slice(half)
            ];
        }
        
        // 32'den fazla ise sayfa başı en fazla 16 öğrenci olacak şekilde sayfalara böl
        const pagesList: any[][] = [];
        const perPage = 16;
        for (let i = 0; i < studentsList.length; i += perPage) {
            pagesList.push(studentsList.slice(i, i + perPage));
        }
        return pagesList;
    };

    const pages = getPages(students);
    const totalPages = pages.length;

    return (
        <div className="bg-slate-100 min-h-screen text-slate-900 font-sans print-wrapper">
            <style>{`
                @media print {
                    @page { 
                        size: A4 portrait; 
                        margin: 8mm 10mm; 
                    }
                    html, body {
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .no-print { 
                        display: none !important; 
                    }
                    .print-wrapper {
                        padding: 0 !important;
                        background: white !important;
                        min-height: auto !important;
                    }
                    .print-page {
                        padding: 0 !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        width: 100% !important;
                        height: 280mm !important;
                        max-height: 280mm !important;
                        display: flex !important;
                        flex-direction: column !important;
                        justify-content: space-between !important;
                        break-after: page !important;
                        page-break-after: always !important;
                        box-sizing: border-box !important;
                    }
                    .print-page:last-child {
                        break-after: auto !important;
                        page-break-after: auto !important;
                    }
                    table { 
                        width: 100% !important; 
                        border-collapse: collapse !important; 
                        margin-top: 8px !important; 
                        font-size: 11px !important; 
                    }
                    th, td { 
                        border: 1px solid #cbd5e1 !important; 
                        padding: 5px 8px !important; 
                        text-align: left !important; 
                        vertical-align: middle !important;
                    }
                    th { 
                        background-color: #f1f5f9 !important; 
                        font-weight: bold !important; 
                        color: #1e293b !important; 
                        font-size: 10.5px !important;
                    }
                    tr { 
                        page-break-inside: avoid !important; 
                        break-inside: avoid !important;
                    }
                }

                @media screen {
                    .print-wrapper {
                        padding: 80px 20px 40px 20px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 25px;
                    }
                    .print-page {
                        background: white;
                        width: 210mm;
                        min-height: 297mm;
                        padding: 12mm 15mm;
                        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                        border-radius: 6px;
                        box-sizing: border-box;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-top: 8px; 
                        font-size: 11px; 
                    }
                    th, td { 
                        border: 1px solid #cbd5e1; 
                        padding: 6px 8px; 
                        text-align: left; 
                        vertical-align: middle;
                    }
                    th { 
                        background-color: #f8fafc; 
                        font-weight: bold; 
                        color: #1e293b; 
                        font-size: 10.5px;
                    }
                }
            `}</style>
            
            {/* Top Bar (Hidden on Print) */}
            <div className="no-print fixed top-0 left-0 right-0 bg-slate-800 text-white p-3 sm:px-6 flex justify-between items-center shadow-lg z-50">
                <div className="flex items-center gap-3">
                    <span className="bg-blue-600 text-white font-bold px-2.5 py-1 rounded-lg text-xs">
                        {vehicle?.plate}
                    </span>
                    <div>
                        <h2 className="font-bold text-sm sm:text-base m-0">Baskı Önizleme Modu</h2>
                        <p className="text-slate-300 text-xs hidden sm:block">
                            Toplam {students.length} Öğrenci • {totalPages} Sayfa Düzeni (Dengeli Dağıtıldı)
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => window.print()}
                        className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95"
                    >
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><path d="M6 14h12v8H6z"></path></svg>
                        Yazdır
                    </button>
                </div>
            </div>

            {/* Print Pages */}
            {pages.map((pageStudents, pageIndex) => {
                const prevStudentsCount = pages.slice(0, pageIndex).reduce((sum, p) => sum + p.length, 0);

                return (
                    <div key={pageIndex} className="print-page">
                        <div>
                            {/* Page Header */}
                            <div className="flex justify-between items-center border-b-2 border-slate-800 pb-2.5 mb-2">
                                <div>
                                    <h1 className="text-xl font-black text-slate-900 m-0 tracking-wide flex items-center gap-2">
                                        <span>{vehicle?.plate}</span>
                                        <span className="text-sm font-bold text-slate-500">
                                            — TAŞINAN YOLCU / ÖĞRENCİ LİSTESİ {totalPages > 1 && `(${pageIndex + 1}/${totalPages})`}
                                        </span>
                                    </h1>
                                    <div className="text-xs text-slate-600 mt-1 flex gap-4">
                                        <span>Sürücü: <strong>{vehicle?.driver || 'Atanmadı'}</strong></span>
                                        <span>Kapasite: <strong>{vehicle?.capacity || '-'} Kişilik</strong></span>
                                        <span>Tarih: <strong>{new Date().toLocaleDateString('tr-TR')}</strong></span>
                                    </div>
                                </div>
                                <div className="text-center px-3 py-1 border border-slate-800 rounded-lg bg-slate-50">
                                    <div className="text-sm font-black text-slate-900">{students.length} / {vehicle?.capacity || '-'}</div>
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                        Sayfa {pageIndex + 1}/{totalPages}
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            <table>
                                <thead>
                                    <tr>
                                        <th style={{ width: '5%', textAlign: 'center' }}>#</th>
                                        <th style={{ width: '23%' }}>Öğrenci Adı Soyadı</th>
                                        <th style={{ width: '20%' }}>Okul / Sınıf</th>
                                        <th style={{ width: '18%' }}>Veli Adı Soyadı</th>
                                        <th style={{ width: '14%' }}>Telefon</th>
                                        <th style={{ width: '20%' }}>Mahalle / Açık Adres</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageStudents.map((s: any, sIdx: number) => {
                                        const globalNum = prevStudentsCount + sIdx + 1;
                                        return (
                                            <tr key={s.id || globalNum}>
                                                <td style={{ textAlign: 'center' }} className="text-slate-500 font-bold">{globalNum}</td>
                                                <td className="font-bold text-slate-900">{s.full_name}</td>
                                                <td>
                                                    <div className="font-semibold text-slate-800 leading-tight">
                                                        {s.schools?.name || s.school_level || 'Belirtilmedi'}
                                                    </div>
                                                    {(s.grade || s.shift) && (
                                                        <div className="text-[10px] text-slate-500 mt-0.5">
                                                            {[s.grade, s.shift].filter(Boolean).join(' • ')}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="text-slate-800 font-medium">{s.parent_name || '-'}</td>
                                                <td className="text-slate-700 font-medium font-mono text-[10.5px]">{s.parent_phone || '-'}</td>
                                                <td className="text-[10px] leading-tight">
                                                    {s.neighborhood && (
                                                        <span className="font-bold text-slate-800 mr-1">[{s.neighborhood}]</span>
                                                    )}
                                                    <span className="text-slate-600">{s.address || ''}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Page Footer */}
                        <div className="border-t border-slate-300 pt-1.5 mt-2 flex justify-between items-center text-[10px] text-slate-500 font-medium">
                            <span>ServisBot Otomasyon Sistemi — Araç Yolcu Listesi</span>
                            <span>Bu Sayfada: {pageStudents.length} Öğrenci • Toplam: {students.length} Öğrenci</span>
                            <span>Sayfa {pageIndex + 1} / {totalPages}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default PrintPreview;
