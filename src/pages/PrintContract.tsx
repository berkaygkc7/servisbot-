import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const PrintContract: React.FC = () => {
    const { profile } = useAuth();
    const [printData, setPrintData] = useState<any>(null);

    useEffect(() => {
        const dataStr = localStorage.getItem('print_contract_data');
        if (dataStr) {
            try {
                const data = JSON.parse(dataStr);
                setPrintData(data);
                
                setTimeout(() => {
                    window.print();
                }, 800);
            } catch (err) {
                console.error("Error parsing print data", err);
            }
        }
    }, []);

    if (!printData) {
        return <div className="p-10 text-center font-bold text-slate-500">Yazdırılacak sözleşme bulunamadı. Lütfen listeye dönüp tekrar "Yazdır" butonuna basın.</div>;
    }

    const { student } = printData;
    const companyName = student?.company_name || profile?.companies?.company_name || '...................................................';
    
    const compNameLower = (companyName || '').toLowerCase();
    const normComp = compNameLower.replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ç/g, 'c');
    const isHalegul = normComp.includes('halegul');
    const isGuroz = normComp.includes('guroz');
    const installmentText = isHalegul ? '9 (dokuz)' : '10 (on)'; // default one

    const displayCompanyName = companyName;

    const PrintHeader = () => (
        <div className="no-print fixed top-0 left-0 right-0 bg-slate-800 text-white p-4 flex justify-between items-center shadow-lg z-50">
            <div>
                <h2 className="font-bold text-lg m-0">Sözleşme Yazdırma Modu</h2>
                <p className="text-slate-300 text-xs mt-1">Yazdırma penceresi otomatik açılmadıysa sağdaki butona tıklayın.</p>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={() => window.close()} 
                    className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    Kapat
                </button>
                <button 
                    onClick={() => window.print()} 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md shadow-blue-500/20 transition-colors"
                >
                    Yazdır
                </button>
            </div>
        </div>
    );

    if (isGuroz) {
        return (
            <div className="bg-white min-h-screen text-black font-sans print:p-0 p-8 text-sm">
                <style>{`
                    @media print {
                        @page { size: A4 portrait; margin: 10mm; }
                        body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                        .no-print { display: none !important; }
                    }
                    .contract-text { font-size: 11px; line-height: 1.4; text-align: justify; }
                    .contract-text li { margin-bottom: 4px; }
                    .senet-input { border: 1px solid #000; height: 30px; display: inline-block; width: 100%; }
                `}</style>
                <PrintHeader />
                <div className="max-w-4xl mx-auto contract-text pt-16 print:pt-0">
                    <h1 className="text-center font-bold text-xl mb-4 text-red-600">ÖĞRENCİ TAŞIMA SÖZLEŞMESİ</h1>
                    
                    <p className="mb-4">KONU: 2026/2027 Eğitim ve öğretim yılında öğrenci taşımacılığında veli ve servisçi menfaatlerini korumak amacıyla bahsedilen öğretim yılında aşağıda belirtilen şekilde taşımacılık yapılacaktır.</p>

                    <ol className="list-decimal pl-5 mb-4">
                        <li>Servis araçlarımız İçişleri Bakanlığının 21.05.1992 gün ve 21234 sayılı okul servis araçları yönetmeliğine uygun olacaktır. (Öğrenci ferdi kaza sigortası yapılacaktır.)</li>
                        <li>Yıl içinde Ankara Valiliğinin açıkladığı fiyat tarifesi uygulanacaktır.</li>
                        <li>Servis konusunda velinin muhatabı ilgili firmadır. Firma servis şoförünü herhangi bir sebeple dahil işten ayırabilir. Bu durumda velinin aksini iddia etmesi söz konusu değildir.</li>
                        <li>Öğrencinin servisteki hal ve hareketleri bir öğrenciye yakışır şekilde olacaktır. Yaptığı suçun durumuna göre firma servisteki disiplini sağlamak için öğrenciyi okul idaresine bildirmek zorundadır.</li>
                        <li>Servis araçlarımız belediye güzergahında dolaşıp öğrenciyi ikamet adresine en yakın yerde indirir. Bu durumlarda ancak öğrencinin evi servis güzergahına ters düşmüyorsa öğrenciyi kapısında bırakır. Güzergaha ters düşüyorsa(zaman kaybı ve diğer çocukları fazla dolaştırma gibi) durumlar varsa evine en uygun yerde indirilir.</li>
                        <li>Servis ücretlerinin Milli Eğitim Bakanlığının öğrencinin okula geleceği gün sayısına göre hesaplanıp ücret belirlenir.</li>
                        <li>Servis ücretleri en fazla 9 eşit taksite bölünerek tahsil edilir.</li>
                        <li>Ücret ödemesi ayın 15 ile en geç 20 si arasında yapılacaktır. Firma yetkilisi veya görevlendirdiği kişi şoföre ödeme yapar. Ankara valiliğinin öğrenciyi servis fiyatlarının tespiti için görevlendirdiği kurum veya kuruluşun açıklayacağı fiyat dikkate alınacaktır. Şayet bahsedilen kuruluş fiyat açıklamadıysa okulun açılış tarihinden itibaren Akaryakıt zammı servis ücretlerine yansıtılacaktır.<br/><br/>
                        Bir sezonluk ücretimiz KDV dahil ............................................................................................................... TL'dir.</li>
                        <li className="mt-2">Bir öğrenci servise kaydını yaptırdıktan sonra keyfi olarak servisten ayrılamaz.</li>
                        <li>Bayram tatilleri, sömestr tatili ve bunun gibi tatillerde fiyat indirimi yapılmayıp yıllık ücretten düşülmüştür.</li>
                        <li>Bu sözleşmeyi taraflar olarak hazırlayıp, sözleşmeyi temin altına almak için aşağıdaki teminat senedi öğrenci velisi tarafından imzalanmıştır. Öğretim yılı sonunda öğrencinin servis kartında borcu gözükmüyorsa senet firma tarafından iptal edilip veliye iade edilecektir. Bahsedilen sözleşme ........................................................................................................................... tarihleri arasını kapsar.</li>
                    </ol>

                    <p className="mb-2">Bu sözleşme 12 maddeden olup, ihtilaf vukuunda Sincan mahkemeleri yetkilidir.<br/>
                    Yukarıdaki tüm maddeleri okudum kabul ediyorum.</p>

                    <div className="flex justify-between items-start mb-6 border-b-2 border-dotted border-gray-400 pb-6">
                        <div className="w-1/2">
                            <table className="w-full">
                                <tbody>
                                    <tr><td className="w-40 font-bold py-1">OKULU</td><td>: ......................................................................</td></tr>
                                    <tr><td className="w-40 font-bold py-1">ADI SOYADI</td><td>: ......................................................................</td></tr>
                                    <tr><td className="w-40 font-bold py-1">VELİNİN ADI SOYADI</td><td>: ......................................................................</td></tr>
                                    <tr><td className="w-40 font-bold py-1">EV ADRESİ</td><td>: ......................................................................</td></tr>
                                    <tr><td colSpan={2} className="py-1">...........................................................................................................</td></tr>
                                    <tr><td className="w-40 font-bold py-1">ÖĞRENCİ KİMLİK NO</td><td>: ......................................................................</td></tr>
                                    <tr><td className="w-40 font-bold py-1">TEL</td><td>: ......................................................................</td></tr>
                                    <tr><td className="w-40 font-bold py-1">SINIF NO</td><td>: ......................................................................</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="w-1/2 text-center flex flex-col items-center">
                            <p className="font-bold mb-4">SÖZLEŞME TARİHİ</p>
                            <p>...........................................................................</p>
                            <div className="mt-4 flex flex-col items-center">
                                <div className="text-4xl font-black italic transform -skew-x-12 tracking-tighter" style={{color: '#d32f2f'}}>
                                    <span className="text-black">G</span>T
                                </div>
                                <h2 className="font-bold text-lg mt-2">GÜRÖZ TAŞIMACILIK</h2>
                                <p className="text-xs">Tem. Tur. İnş. San. Ve Tic. Ltd. Şti.</p>
                                <p className="text-xs mt-1">Çoğlu Mahallesi 832 Sk. No15/AD Sincan/Ankara</p>
                                <p className="text-xs">Tel: (0312) 277 45 25 Fax: (0312) 277 57 90</p>
                                <p className="text-xs text-blue-600">bilgi@gurozturizm.com - www.gurozturizm.com</p>
                            </div>
                        </div>
                    </div>

                    <div className="senet-section">
                        <table className="w-full text-center font-bold mb-4">
                            <thead>
                                <tr>
                                    <td className="w-1/4 pb-2">Vade</td>
                                    <td className="w-1/4 pb-2">Tediye Tarihi</td>
                                    <td className="w-1/4 pb-2">Türk Lirası</td>
                                    <td className="w-1/4 pb-2">No</td>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="px-2"><div className="senet-input"></div></td>
                                    <td className="px-2"><div className="senet-input"></div></td>
                                    <td className="px-2"><div className="senet-input"></div></td>
                                    <td className="px-2"><div className="senet-input"></div></td>
                                </tr>
                            </tbody>
                        </table>
                        
                        <div className="leading-loose">
                            İş bu emre muharrer senedim ....................................................................... Mukabilinde ............................................. Tarihinde Bay / Bayan ............................................................................ Velahut emrühavale .................................. Yukarıda yazılı yalnız .........................<br/>
                            T. Lirası ................................................ ödeyeceği ............................... Bedeli ...................................... ahzolmuştur. İşbu bono vadesinde Ödemediği taktirde, mütakip bonolarında muacceliyet kesbedeceğini, ihtilaf vuku unda SİNCAN Mahkemelerinin selahiyetini Şimdiden kabul eyleri......
                        </div>

                        <div className="flex justify-between mt-6">
                            <div className="w-1/2">
                                <p>İsim : ...............................................................................................</p>
                                <p className="mt-2">Adres: ..............................................................................................</p>
                                <p>...........................................................................................................</p>
                                <p className="mt-4 font-bold">KEFİL</p>
                                <p className="mt-2">Adı ve Adresi : ...................................................................................</p>
                            </div>
                            <div className="w-1/3 text-center">
                                <p>İmza</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen text-black font-serif print:p-0 p-8">
            <style>{`
                @media print {
                    @page { size: A4 portrait; margin: 15mm; }
                    body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .no-print { display: none !important; }
                }
                .contract-text { font-size: 13px; line-height: 1.5; text-align: justify; }
                .contract-text li { margin-bottom: 8px; }
            `}</style>

            <PrintHeader />

            <div className="max-w-4xl mx-auto contract-text pt-16 print:pt-0">
                <h2 className="text-center font-bold text-lg mb-6">ÖĞRENCİ SERVİS KAYIT SÖZLEŞMESİ</h2>
                
                <div className="mb-6 space-y-3">
                    <p><strong>FİRMA ADI:</strong> {displayCompanyName}</p>
                    <p><strong>ÖĞRENCİNİN ADI SOYADI:</strong> ................................................................</p>
                    <p><strong>OKULU:</strong> ................................................................</p>
                    <p><strong>SINIFI:</strong> ................................................................</p>
                    <p><strong>VELİNİN ADI SOYADI:</strong> ................................................................</p>
                    <p><strong>VELİNİN TELEFONU:</strong> ................................................................</p>
                    <p><strong>EV / ALINACAK ADRES:</strong> ................................................................................................................................</p>
                    <p><strong>YILLIK SERVİS ÜCRETİ:</strong> .................................................... TL + KDV</p>
                </div>

                <p className="font-bold mb-3 uppercase underline">KONU: 2026/2027 EĞİTİM VE ÖĞRETİM YILINDA ÖĞRENCİ TAŞIMACILIĞINDA VELİNİN VE TAŞIMACILIĞI ÜSTLENEN FİRMANIN MENFAATLERİNİ KORUMAK AMACIYLA BAHSEDİLEN ÖĞRETİM YILINDA AŞAĞIDA BELİRTİLECEK ŞEKİLDE YAPILACAKTIR.</p>

                <ol className="list-decimal pl-5">
                    <li>Servis araçlarımız İçişleri Bakanlığı'nın 28.08.2007 tarih 26627 sayılı okul servis araçları yönetmeliğine uygundur.</li>
                    <li>Servis araçları öğrenciyi aldığı durağa 15 dakika gecikmesi halinde öğrenci ya da öğrenci velisi okul servis yetkilisini arayıp servis aracı hakkında bilgi alır. Servis yetkilisinin aracın gelemeyeceğini bildirmesi durumunda güzergah üzerindeki diğer servis öğrencilerini almak suretiyle taksi ile okula gelebilir. Bu durumda taksi ücreti servis yetkilisi tarafından karşılanır. Öğrencinin kendi kusuruyla servisi kaçırması durumunda sorumluluk öğrenciye aittir.</li>
                    <li>Servis konusunda velinin muhatabı firmadır. Veli veya öğrenci servis hakkında şikayet ve isteklerini (servis güzergahı, durağı, saati, vb. konularda) servis yetkilisine iletmelidir. Servis şoförü bu konularda yetkili değildir.</li>
                    <li>Öğrencinin servisteki hal ve hareketleri bir öğrenciye yakışır, diğer öğrenciler ve servis şoförünü rahatsız etmeyecek şekilde olmalıdır. Araçta alkol, sigara vb. bağımlılık yaratıcı ve kullanımı yasak olan maddelerin kullanımı kesinlikle yasaktır. Bu kurallara aykırılık tespit edilmesi halinde yetkili makamlara bildirilmekle birlikte öğrencinin servisle ilişkisi kesilir. Kalan borç miktarı muaccel olur.</li>
                    <li>Servis araçlarımızın ulaşım hattı belediye güzergahına göre düzenlenir, tüm öğrencilerin ikamet adresleri düşünülerek servis şirketi tarafından belirlenir. Şirket tarafından belirlenen güzergaha uygun olduğu ölçüde öğrenci ikametinin önünde ya da ikametine yakın bir noktada indirilir.</li>
                    <li>
                        <p>Servis ücretlerinin ödemesi okuldaki servis yetkilisine yapılır. Başka birine yapılan ödemeler geçerli değildir. İlk taksit en geç okulların açıldığı gün peşin olarak alınmak suretiyle, taksit ödemeleri her ayın 1'i ile 10'u arasında yapılır. Servis ücretleri belirlenip {installmentText} taksit halinde ödenmesi kararlaştırıldığı için toplam sene üzerinden hesaplanmakta olup, ara tatiller, resmi ve milli tatiller ile eğitim öğretime ara verildiği dönemler belirlenen fiyata dahil değildir.</p>
                        <p className="mt-2">Ödeme günü üzerinden 15 gün geçmiş olmasına rağmen ödeme yapılmadığı takdirde, tüm alacak miktarı muacceliyet kazanmış olacaktır.</p>
                    </li>
                    <li>Ücretlendirme Ankara Ticaret Odası ya da Ankara Servisçiler Odası tarafından belirlenen fiyatlar dikkate alınarak servis şirketi tarafından belirlenir. Bahsedilen kuruluşların fiyat açıklamaması durumunda fiyat listesi okulun açılış tarihinden itibaren akaryakıt zammı, önceki yıla ait servis ücretleri, enflasyon artışı, işçilik giderlerindeki artış, tarife değişikliği göz önünde bulundurularak servis şirketi tarafından yapılacaktır. Enflasyon artışı nedeniyle sene içerisinde tarafların anlaştığı fiyatlarda artış ve güncelleme yapılabilir. Bu değişiklikler velilerin telefonlarına yazılı bildirim olarak gönderilecektir. Servis şirketinin sene içerisinde akaryakıt ve diğer giderlere gelen zamlar nedeniyle servis ücretinde değişiklik yapma hakkı saklı tutulmaktadır.</li>
                    <li>Servis araçları sene başında serviste bulunan boş yer ve kayıt olan öğrenci sayısına göre belirlendiği için servis şirketi öğrencinin servise kaydını tüm eğitim öğretim yılı düşünülerek yapmaktadır. Sözleşmede belirtilen eğitim öğretim yılı bitiminden önce öğrencinin servisten ayrılması durumunda velinin</li>
                    <li>Servis şirketi ile yapılan sözleşmenin veli tarafından, haklı sebebe dayanmadan, tek taraflı feshedilmesi durumunda tüm alacak muacceliyet kazanır. Mücbir sebepler dışında taşınma, nakil gibi sebepler haklı sebep sayılmamaktadır.</li>
                    <li>Öğrenci sayısının serviste azalması durumunda şirketin mevcut öğrencileri diğer servis araçları ile birleştirme imkanı bulunmaktadır. Şirketin bu konuda sözleşmede değişiklik yapma hakkı saklıdır.</li>
                    <li>Bir bölgede servise kayıt olan öğrenci sayısının 12'yi geçmemesi halinde şirket sözleşmeyi tek taraflı olarak feshetme hakkına haizdir. Veli bu durumda hiçbir hak talep etmeyeceğini kabul ederek sözleşmeyi imzalamıştır.</li>
                    <li>Ödenen servis borçları öğrenci zarfına ve öğrenci ödeme listesine servis yetkilisi tarafından işlenir. Veli ödemelerini öğrenci zarfından takip edecektir. Ödemeler hususunda herhangi bir ihtilafa düşülmesi durumunda firmada bulunan öğrenci ödeme listeleri geçerlidir.</li>
                    <li>Öğretim yılı sonunda öğrencinin öğrenci zarfında borcu gözükmüyorsa senet yetkili tarafından iptal edilip, veliye iade edilir. İş bu sözleşme iki nüsha olarak tanzim edilmiştir.</li>
                </ol>

                <div className="mt-12 flex justify-between px-10">
                    <div className="text-center">
                        <p className="font-bold">VELİ</p>
                        <p className="text-sm text-slate-500 mt-1">İmza</p>
                    </div>
                    <div className="text-center">
                        <p className="font-bold">FİRMA YETKİLİSİ</p>
                        <p className="text-sm text-slate-500 mt-1">İmza / Kaşe</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrintContract;
