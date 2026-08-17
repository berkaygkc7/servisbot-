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
                
                // Trigger print after a short delay to allow styles to load
                setTimeout(() => {
                    window.print();
                }, 800);
            } catch (err) {
                console.error("Error parsing print data", err);
            }
        }
    }, []);

    if (!printData) {
        return <div className="p-10 text-center font-bold text-slate-500">Yazdırılacak veri bulunamadı. Lütfen sekmeyi kapatıp araçlar sayfasından tekrar "Yazdır" butonuna basın.</div>;
    }

    const { vehicle, students } = printData;

    return (
        <div className="bg-white min-h-screen p-8 text-slate-900 font-sans">
            <style>{`
                @media print {
                    @page { size: A4 portrait; margin: 12mm; }
                    body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .no-print { display: none !important; }
                }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
                th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; }
                th { background-color: #f8fafc; font-weight: bold; color: #334155; }
                tr { page-break-inside: avoid; }
            `}</style>
            
            {/* Top Bar (Hidden on Print) */}
            <div className="no-print fixed top-0 left-0 right-0 bg-slate-800 text-white p-4 flex justify-between items-center shadow-lg z-50">
                <div>
                    <h2 className="font-bold text-lg m-0">Baskı Önizleme Modu</h2>
                    <p className="text-slate-300 text-xs mt-1">Yazdırma penceresi otomatik açılmadıysa sağdaki butona tıklayın.</p>
                </div>
                <button 
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white px-6 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95"
                >
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><path d="M6 14h12v8H6z"></path></svg>
                    Yazdır
                </button>
            </div>

            {/* Print Content */}
            <div className="pt-20">
                <div className="flex justify-between items-center border-b-2 border-slate-800 pb-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 m-0">
                        {vehicle.plate} <span className="text-lg font-bold text-slate-500 ml-2">— TAŞINAN YOLCU / ÖĞRENCİ LİSTESİ</span>
                    </h1>
                    <div className="text-sm text-slate-600 mt-2 flex gap-4">
                        <span>Sürücü: <strong>{vehicle.driver || 'Atanmadı'}</strong></span>
                        <span>Kapasite: <strong>{vehicle.capacity} Kişilik</strong></span>
                        <span>Tarih: <strong>{new Date().toLocaleDateString('tr-TR')}</strong></span>
                    </div>
                </div>
                <div className="text-center px-4 py-2 border border-slate-800 rounded-lg bg-slate-50">
                    <div className="text-xl font-black text-slate-900">{students.length} / {vehicle.capacity}</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Yolcu</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style={{ width: '5%' }}>#</th>
                        <th style={{ width: '22%' }}>Öğrenci Adı Soyadı</th>
                        <th style={{ width: '20%' }}>Okul / Sınıf</th>
                        <th style={{ width: '20%' }}>Veli Adı Soyadı</th>
                        <th style={{ width: '13%' }}>Telefon</th>
                        <th style={{ width: '20%' }}>Mahalle / Açık Adres</th>
                    </tr>
                </thead>
                <tbody>
                    {students.map((s: any, index: number) => (
                        <tr key={s.id || index}>
                            <td className="text-slate-500 font-medium">{index + 1}</td>
                            <td className="font-bold text-slate-800">{s.full_name}</td>
                            <td>
                                {s.schools?.name || s.school_level || 'Belirtilmedi'}
                                {s.grade ? ` (${s.grade})` : ''}
                            </td>
                            <td>{s.parent_name || '-'}</td>
                            <td>{s.parent_phone || '-'}</td>
                            <td>
                                {s.neighborhood ? `[${s.neighborhood}] ` : ''}
                                {s.address || ''}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="mt-8 flex justify-between text-xs text-slate-500 font-medium">
                <span>ServisBot Otomasyon Sistemi — Taşıma Yolcu Listesi</span>
                <span>Toplam {students.length} Öğrenci Kayıtlıdır</span>
            </div>
            </div>
        </div>
    );
};

export default PrintPreview;
