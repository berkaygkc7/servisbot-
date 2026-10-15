import React from 'react';
import { ozhamleLogo } from '../../assets/ozhamleLogo';

export interface PersonalizedContractStudent {
    id?: string;
    login_token?: string;
    full_name?: string;
    name?: string;
    parent_name?: string;
    parent?: string;
    parent_phone?: string;
    phone?: string;
    parent_tc?: string;
    address?: string;
    grade?: string;
    school_name?: string;
    school?: string;
    schools?: { id?: string; name?: string };
    total_debt?: number;
    custom_price?: number;
    parent_signature?: string | null;
    contract_signed_at?: string | null;
    registration_date?: string;
    blood_group?: string;
    shift?: string;
    company_name?: string;
    company_logo?: string | null;
}

interface PersonalizedContractDocumentProps {
    student: PersonalizedContractStudent;
    companyName?: string;
    companyLogo?: string | null;
    isPrintMode?: boolean;
}

export const PersonalizedContractDocument: React.FC<PersonalizedContractDocumentProps> = ({
    student,
    companyName: propCompanyName,
    companyLogo: propCompanyLogo,
}) => {
    const rawCompanyName =
        student.company_name ||
        propCompanyName ||
        'Öğrenci Servis Taşımacılığı';

    const compNameLower = (rawCompanyName || '').toLowerCase();
    const normComp = compNameLower
        .replace(/ö/g, 'o')
        .replace(/ü/g, 'u')
        .replace(/ı/g, 'i')
        .replace(/ş/g, 's')
        .replace(/ğ/g, 'g')
        .replace(/ç/g, 'c')
        .replace(/\s+/g, '');

    const isHalegul = normComp.includes('halegul');
    const isGuroz = normComp.includes('guroz');
    const isOzhamle = normComp.includes('ozhamle');
    const isServispark = normComp.includes('servispark');

    const schoolName =
        student.school_name ||
        student.schools?.name ||
        student.school ||
        '';

    const schoolStr = (schoolName || '')
        .toLowerCase()
        .replace(/ö/g, 'o')
        .replace(/ü/g, 'u')
        .replace(/ı/g, 'i')
        .replace(/ş/g, 's')
        .replace(/ğ/g, 'g')
        .replace(/ç/g, 'c')
        .replace(/\s+/g, '');

    const isHakanGuvencer = schoolStr.includes('guvenc') || schoolStr.includes('hakanguvenc');

    // Installment count
    let installmentCount = 10;
    if (isHakanGuvencer) installmentCount = 11;
    else if (isHalegul || isGuroz) installmentCount = 9;

    let installmentText = `${installmentCount} (${installmentCount === 9 ? 'dokuz' : installmentCount === 11 ? 'on bir' : 'on'})`;

    const studentFullName = student.full_name || student.name || 'Belirtilmedi';
    const parentFullName = student.parent_name || student.parent || 'Belirtilmedi';
    const parentPhone = student.parent_phone || student.phone || '-';
    const parentTc = student.parent_tc || '-';
    const address = student.address || '-';
    const grade = student.grade ? `${student.grade}. Sınıf` : 'Belirtilmedi';
    const totalDebt = student.total_debt ? Number(student.total_debt) : null;
    const monthlyPrice = student.custom_price
        ? Number(student.custom_price)
        : totalDebt
        ? Math.round(totalDebt / installmentCount)
        : null;

    const signature = student.parent_signature;
    const signedDate = student.contract_signed_at
        ? new Date(student.contract_signed_at).toLocaleString('tr-TR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          })
        : null;

    const SinglePageStyle = () => (
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
                .single-page-contract {
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                    page-break-after: avoid !important;
                    page-break-before: avoid !important;
                    max-height: 280mm !important;
                    overflow: hidden !important;
                    box-shadow: none !important;
                    border: none !important;
                    padding: 0 !important;
                    margin: 0 !important;
                }
            }
        `}</style>
    );

    // -------------------------------------------------------------
    // 1. SERVİSPARK TEMPLATE (Single Page Optimized)
    // -------------------------------------------------------------
    if (isServispark) {
        return (
            <div className="single-page-contract bg-white text-slate-900 font-sans p-3 sm:p-5 print:p-0 rounded-2xl print:rounded-none border print:border-none border-slate-200 shadow-sm print:shadow-none space-y-2 print:space-y-1">
                <SinglePageStyle />

                {/* Header */}
                <div className="flex justify-between items-start gap-2 pb-2 print:pb-1 border-b border-slate-200">
                    <div className="flex flex-col text-[#001f3f]">
                        <div className="flex items-center gap-1.5">
                            <span className="text-2xl sm:text-3xl font-black italic tracking-tighter text-blue-900">S</span>
                            <div className="flex flex-col">
                                <span className="text-lg sm:text-xl font-black tracking-tighter leading-none text-slate-900">SERVİS PARK</span>
                                <span className="text-[10px] font-bold tracking-widest text-blue-900">TURİZM</span>
                            </div>
                        </div>
                        <div className="font-semibold text-[10px] text-slate-600 mt-0.5">
                            İrtibat: <strong>0545 283 32 55</strong> &bull; www.servisparkturizm.com
                        </div>
                        <div className="text-[9px] font-bold text-slate-800">
                            SERVİSPARK TAŞIMACILIK TURİZM TİCARET LİMİTED ŞİRKETİ
                        </div>
                    </div>

                    <div className="text-[10px] border border-slate-200 rounded-lg p-2 bg-slate-50 print:bg-transparent min-w-[220px] space-y-0.5 leading-tight">
                        <div><span className="text-slate-400">Öğrenci:</span> <strong>{studentFullName}</strong></div>
                        <div><span className="text-slate-400">Veli:</span> <strong>{parentFullName}</strong></div>
                        <div><span className="text-slate-400">Telefon:</span> <strong>{parentPhone}</strong></div>
                        <div><span className="text-slate-400">Okul / Sınıf:</span> <strong>{schoolName || '-'} ({grade})</strong></div>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                        ÖĞRENCİ SERVİS KAYIT SÖZLEŞMESİ
                    </h2>
                    <span className="text-[10px] font-mono font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded">
                        NO: 02551
                    </span>
                </div>

                <p className="text-[9.5px] print:text-[7.8px] font-semibold text-slate-700 text-justify leading-tight bg-slate-50 print:bg-transparent p-1.5 print:p-0 rounded border print:border-none border-slate-100">
                    <strong>KONU:</strong> 2026/2027 Eğitim ve öğretim yılında öğrenci taşımacılığında velinin ve taşımacılığı üstlenen firmanın menfaatlerini korumak amacıyla bahsedilen öğretim yılında aşağıda belirtilecek şekilde yapılacaktır.
                </p>

                {/* Clauses */}
                <ol className="list-decimal pl-4 text-[9.5px] print:text-[7.6px] text-slate-700 space-y-0.5 print:space-y-[1px] text-justify leading-tight print:leading-[1.12]">
                    <li>Servis araçlarımız İçişleri Bakanlığı'nın 28.08.2007 tarih 26627 sayılı okul servis araçları yönetmeliğine uygundur.</li>
                    <li>Servis araçları durağa 15 dk gecikirse servis aranır, gelmeyecekse taksi tutulur ve ücreti servis yetkilisince karşılanır.</li>
                    <li>Servis konusunda velinin doğrudan muhatabı firmadır. Şikayet ve talepler şoföre değil servis yetkilisine iletilir.</li>
                    <li>Öğrencinin araçtaki hal ve hareketleri öğrenciye yakışır olmalıdır. Kural ihlallerinde servis ilişkisi kesilir, kalan borç muaccel olur.</li>
                    <li>Servis güzergahı belediye hattına ve tüm öğrencilerin ikametine göre planlanır, en uygun noktada indirme-bindirme yapılır.</li>
                    <li className="font-semibold text-slate-900 bg-blue-50/70 print:bg-transparent px-1 rounded">
                        Servis ücretlerinin ödemesi okuldaki servis yetkilisine yapılır. İlk taksit peşin, taksitler her ayın 1'i ile 10'u arasında tahsil edilir. Yıllık servis ücreti <span className="underline font-black text-blue-900">{totalDebt ? `${totalDebt.toLocaleString('tr-TR')} TL + KDV` : '................... TL + KDV'}</span>'dir.
                    </li>
                    <li>Ücretlendirmede yetkili oda/kurum tarifesi veya akaryakıt/enflasyon artışları esas alınır.</li>
                    <li>Kayıt tüm eğitim-öğretim yılı düşünülerek yapıldığından, erken ayrılma halinde cezai şart olarak 5 (beş) aylık ücret ödeme yükümlülüğü bulunmaktadır.</li>
                    <li>Haklı bir gerekçe olmadan tek taraflı fesih halinde tüm alacak muacceliyet kazanır.</li>
                    <li>Öğrenci sayısının azalması halinde firmanın diğer servis araçları ile birleştirme hakkı saklıdır.</li>
                    <li>Güzergahtaki öğrenci sayısının 12'yi geçmemesi halinde firmanın sözleşmeyi tek taraflı feshetme hakkı vardır.</li>
                    <li>Ödemeler firma kayıtları ve öğrenci ödeme listeleri üzerinden takip edilir.</li>
                    <li>Öğretim yılı sonunda borcu bulunmayan öğrencinin senedi yetkili tarafından iptal edilip iade edilir. İki nüsha olarak tanzim edilmiştir.</li>
                </ol>

                {/* Senet / Promissory Note Section */}
                <div className="border border-slate-300 rounded-lg p-2 print:p-1 bg-slate-50/80 print:bg-transparent space-y-1">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-0.5">
                        <span className="text-[10px] print:text-[8px] font-black uppercase text-slate-800 tracking-wider">
                            Resmi Senet Taahhüt Bölümü (Bono)
                        </span>
                        <span className="text-[8px] text-slate-500 font-semibold">T.C. Hukukuna Göre Bono Niteliğindedir</span>
                    </div>

                    <div className="grid grid-cols-4 gap-1 text-center text-[9px] print:text-[7.5px] font-bold">
                        <div className="bg-white print:bg-transparent p-0.5 border border-slate-200 rounded">VADE: DÜZENLİ</div>
                        <div className="bg-white print:bg-transparent p-0.5 border border-slate-200 rounded">TUTAR: {totalDebt ? `${totalDebt.toLocaleString('tr-TR')} TL` : '-'}</div>
                        <div className="bg-white print:bg-transparent p-0.5 border border-slate-200 rounded">KURUŞ: 00</div>
                        <div className="bg-white print:bg-transparent p-0.5 border border-slate-200 rounded">NO: 02551</div>
                    </div>

                    <p className="text-[9px] print:text-[7.5px] text-slate-700 text-justify leading-tight">
                        İşbu emre muharrer senedim mukabilinde <strong>SERVİSPARK TAŞ. TURZ. TİC. LTD. ŞTİ.</strong> veyahut emrühavalesine yukarıda yazılı toplam <strong>{totalDebt ? `${totalDebt.toLocaleString('tr-TR')} TL` : '...................... TL'}</strong> bedeli malen ahzolunmuştur. Vadesinde ödenmediği takdirde müteakip bonolar muacceliyet kesbedecek, ihtilafta <strong>SİNCAN Mahkemeleri</strong> yetkilidir.
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 text-[9px] print:text-[7.5px]">
                        <div>
                            <div>Ödeyecek / Veli: <strong>{parentFullName}</strong></div>
                            <div>T.C. Kimlik: <strong>{parentTc}</strong> &bull; Tel: <strong>{parentPhone}</strong></div>
                            <div className="truncate">Adres: <strong>{address}</strong></div>
                        </div>

                        <div className="flex flex-col items-center justify-center p-1 bg-white print:bg-transparent rounded border border-slate-200 text-center">
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                                Veli Islak İmzası
                            </span>
                            {signature ? (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <img src={signature} alt="Veli İmzası" className="max-h-8 max-w-[120px] object-contain" />
                                    {signedDate && (
                                        <span className="text-[7.5px] text-emerald-700 font-semibold block">
                                            ✓ {signedDate}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <span className="text-[8.5px] text-amber-600 font-medium py-1 italic">
                                    İmza Bekleniyor
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // -------------------------------------------------------------
    // 2. GÜRÖZ TEMPLATE (Single Page Optimized)
    // -------------------------------------------------------------
    if (isGuroz) {
        return (
            <div className="single-page-contract bg-white text-slate-900 font-sans p-3 sm:p-5 print:p-0 rounded-2xl print:rounded-none border print:border-none border-slate-200 shadow-sm print:shadow-none space-y-2 print:space-y-1">
                <SinglePageStyle />

                {/* Header */}
                <div className="text-center border-b border-slate-200 pb-1.5">
                    <h2 className="text-base sm:text-lg font-black text-red-600 tracking-tight">
                        ÖĞRENCİ TAŞIMA SÖZLEŞMESİ
                    </h2>
                    <p className="text-[9.5px] text-slate-500 font-semibold">
                        GÜRÖZ TAŞIMACILIK TEM. TUR. İNŞ. SAN. VE TİC. LTD. ŞTİ.
                    </p>
                </div>

                <p className="text-[9.5px] print:text-[7.8px] font-semibold text-slate-700 text-justify leading-tight bg-slate-50 print:bg-transparent p-1.5 print:p-0 rounded border print:border-none border-slate-100">
                    <strong>KONU:</strong> 2026/2027 Eğitim ve öğretim yılında öğrenci taşımacılığında veli ve servisçi menfaatlerini korumak amacıyla bahsedilen öğretim yılında aşağıda belirtilen şekilde taşımacılık yapılacaktır.
                </p>

                {/* Clauses */}
                <ol className="list-decimal pl-4 text-[9.5px] print:text-[7.6px] text-slate-700 space-y-0.5 print:space-y-[1px] text-justify leading-tight print:leading-[1.12]">
                    <li>Servis araçlarımız İçişleri Bakanlığının 21.05.1992 gün ve 21234 sayılı okul servis araçları yönetmeliğine uygun olacaktır. (Öğrenci ferdi kaza sigortası yapılacaktır.)</li>
                    <li>Yıl içinde Ankara Valiliğinin açıkladığı fiyat tarifesi uygulanacaktır.</li>
                    <li>Servis konusunda velinin muhatabı ilgili firmadır. Firma şoförü herhangi bir sebeple değiştirebilir.</li>
                    <li>Öğrencinin araçtaki hal ve hareketleri bir öğrenciye yakışır şekilde olacaktır. Disiplin durumlarında okul idaresine bildirim yapılır.</li>
                    <li>Servis araçlarımız belediye güzergahında dolaşıp öğrenciyi ikamet adresine en yakın yerde indirir.</li>
                    <li>Servis ücretleri MEB öğrencinin okula geleceği gün sayısına göre hesaplanıp ücret belirlenir.</li>
                    <li>Servis ücretleri en fazla 9 eşit taksite bölünerek tahsil edilir.</li>
                    <li className="font-semibold text-slate-900 bg-red-50/70 print:bg-transparent px-1 rounded">
                        Ücret ödemesi ayın 15'i ile en geç 20'si arasında yapılacaktır. Bir sezonluk ücretimiz KDV dahil <span className="underline font-black text-red-700">{totalDebt ? `${totalDebt.toLocaleString('tr-TR')} TL` : '................... TL'}</span>'dir. {monthlyPrice ? `(Aylık ${monthlyPrice.toLocaleString('tr-TR')} TL x 9 Taksit)` : ''}
                    </li>
                    <li>Öğrenci servise kaydını yaptırdıktan sonra keyfi olarak servisten ayrılamaz.</li>
                    <li>Bayram ve sömestr tatillerinde fiyat indirimi yapılmayıp yıllık ücretten düşülmüştür.</li>
                    <li>Sözleşmeyi temin altına almak için aşağıdaki teminat senedi veli tarafından imzalanmıştır. Borç bittiğinde senet iptal edilip iade edilir.</li>
                    <li>İşbu sözleşme 12 maddeden ibaret olup, ihtilaf vukuunda <strong>Sincan Mahkemeleri</strong> yetkilidir.</li>
                </ol>

                {/* Student and Parent Details */}
                <div className="grid grid-cols-2 gap-1 text-[9px] print:text-[7.5px] border border-slate-200 rounded p-1.5 bg-slate-50/70 print:bg-transparent leading-tight">
                    <div>Okul: <strong>{schoolName || '-'}</strong> ({grade})</div>
                    <div>Öğrenci: <strong>{studentFullName}</strong></div>
                    <div>Veli: <strong>{parentFullName}</strong> (TC: {parentTc})</div>
                    <div>Tel: <strong>{parentPhone}</strong></div>
                    <div className="col-span-2 truncate">Adres: <strong>{address}</strong></div>
                </div>

                {/* Senet */}
                <div className="border border-red-200 rounded p-1.5 bg-red-50/30 print:bg-transparent space-y-1">
                    <div className="flex items-center justify-between border-b border-red-100 pb-0.5">
                        <span className="text-[9px] print:text-[7.5px] font-black uppercase text-red-900 tracking-wider">
                            Teminat Senedi (Bono)
                        </span>
                        <span className="text-[8px] text-red-700 font-semibold">Sincan Mahkemeleri Yetkilidir</span>
                    </div>

                    <p className="text-[9px] print:text-[7.5px] text-slate-700 text-justify leading-tight">
                        İşbu emre muharrer senedim mukabilinde <strong>GÜRÖZ TAŞIMACILIK TEM. TUR. İNŞ. SAN. VE TİC. LTD. ŞTİ.</strong> veyahut emrühavalesine yukarıda yazılı yalnız <strong>{totalDebt ? `${totalDebt.toLocaleString('tr-TR')} TL` : '...................... TL'}</strong> ödeyeceğim. Bedeli ahzolunmuştur. Vadesinde ödenmediği takdirde müteakip bonolar muacceliyet kesbedecektir.
                    </p>

                    <div className="flex justify-between items-center gap-2 pt-0.5 border-t border-red-100 text-[9px] print:text-[7.5px]">
                        <div>Borçlu: <strong>{parentFullName}</strong> &bull; TC: <strong>{parentTc}</strong></div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[8px] font-bold text-slate-500 uppercase">Veli İmzası:</span>
                            {signature ? (
                                <img src={signature} alt="Veli İmzası" className="max-h-8 max-w-[110px] object-contain" />
                            ) : (
                                <span className="text-[8px] text-amber-600 italic">İmza Bekleniyor</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // -------------------------------------------------------------
    // 3. ÖZHAMLE / HALEGÜL / GENEL (STANDART) TEMPLATE (Single Page Optimized)
    // -------------------------------------------------------------
    return (
        <div className="single-page-contract bg-white text-slate-900 font-sans p-3 sm:p-5 print:p-0 rounded-2xl print:rounded-none border print:border-none border-slate-200 shadow-sm print:shadow-none space-y-2 print:space-y-1">
            <SinglePageStyle />

            {/* Header */}
            <div className="flex justify-between items-center gap-2 pb-1.5 border-b border-slate-200">
                <div className="flex items-center gap-2">
                    {isOzhamle ? (
                        <img src={ozhamleLogo} alt="Özhamle Turizm" className="h-8 print:h-7 w-auto object-contain" />
                    ) : propCompanyLogo ? (
                        <img src={propCompanyLogo} alt="Firma Logo" className="h-8 print:h-7 w-auto object-contain rounded" />
                    ) : null}
                    <div>
                        <span className="text-[10px] print:text-[8px] font-bold uppercase tracking-wider text-blue-600 block leading-tight">
                            {rawCompanyName}
                        </span>
                        <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight leading-tight">
                            ÖĞRENCİ SERVİS TAŞIMA KAYIT SÖZLEŞMESİ
                        </h2>
                    </div>
                </div>

                <div className="text-right">
                    <span className="text-[9px] text-slate-400 font-medium block leading-tight">Eğitim-Öğretim Yılı</span>
                    <span className="text-[10px] font-black text-slate-700 block leading-tight">2026 - 2027</span>
                </div>
            </div>

            {/* Personalized Student & Parent Info Table (Compact 2 Rows) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-50 print:bg-transparent p-2 print:p-1 rounded-lg border border-slate-200/80 text-[10px] print:text-[7.8px] leading-tight">
                <div>
                    <span className="text-slate-400 block text-[8.5px] print:text-[7px]">Öğrenci Adı Soyadı</span>
                    <strong className="text-slate-900 font-bold block">{studentFullName}</strong>
                </div>

                <div>
                    <span className="text-slate-400 block text-[8.5px] print:text-[7px]">Veli Adı Soyadı</span>
                    <strong className="text-slate-900 font-bold block">{parentFullName}</strong>
                </div>

                <div>
                    <span className="text-slate-400 block text-[8.5px] print:text-[7px]">Okul / Sınıf</span>
                    <strong className="text-slate-800 font-semibold block truncate">
                        {schoolName || '-'} ({grade})
                    </strong>
                </div>

                <div>
                    <span className="text-slate-400 block text-[8.5px] print:text-[7px]">İletişim / TC</span>
                    <strong className="text-slate-800 font-semibold block">
                        {parentPhone} &bull; {parentTc}
                    </strong>
                </div>

                <div className="col-span-2 sm:col-span-3 truncate">
                    <span className="text-slate-400 block text-[8.5px] print:text-[7px]">Ev / Alınacak Adres</span>
                    <span className="text-slate-700 font-medium block truncate">{address}</span>
                </div>

                <div className="bg-blue-50/80 print:bg-transparent border border-blue-200 print:border-none p-1 print:p-0 rounded flex flex-col justify-center">
                    <span className="text-[8px] print:text-[7px] uppercase font-bold text-blue-900 block">Sezonluk Ücret</span>
                    <strong className="text-emerald-700 font-black text-[11px] print:text-[8px] block">
                        {totalDebt ? `${totalDebt.toLocaleString('tr-TR')} ₺` : 'Belirlenmedi'}
                    </strong>
                    <span className="text-[8px] print:text-[6.5px] text-slate-500 font-medium block">
                        {installmentText} taksit
                    </span>
                </div>
            </div>

            {/* Contract Context / Konu */}
            <p className="text-[9.5px] print:text-[7.8px] font-semibold text-slate-700 text-justify leading-tight bg-slate-50 print:bg-transparent p-1.5 print:p-0 rounded border print:border-none border-slate-100">
                <strong>KONU:</strong> 2026/2027 Eğitim ve öğretim yılında öğrenci taşımacılığında velinin ve taşımacılığı üstlenen <strong>{rawCompanyName}</strong> firmasının menfaatlerini korumak amacıyla bahsedilen öğretim yılında aşağıda belirtilecek şekilde yapılacaktır.
            </p>

            {/* Official 13 Clauses */}
            <ol className="list-decimal pl-4 text-[9.5px] print:text-[7.5px] text-slate-700 space-y-0.5 print:space-y-[0.8px] text-justify leading-tight print:leading-[1.11]">
                <li>Servis araçlarımız İçişleri Bakanlığı'nın 28.08.2007 tarih 26627 sayılı okul servis araçları yönetmeliğine uygundur.</li>
                <li>Servis araçları durağa 15 dk gecikirse servis yetkilisi aranır. Aracın gelemeyeceği bildirilirse taksi tutulur ve ücreti servis yetkilisince karşılanır.</li>
                <li>Servis konusunda velinin muhatabı firmadır. Veli veya öğrenci şikayet ve isteklerini şoföre değil servis yetkilisine iletmelidir.</li>
                <li>Öğrencinin servisteki hal ve hareketleri bir öğrenciye yakışır şekilde olmalıdır. Aykırılık tespitinde öğrencinin servisle ilişkisi kesilir, kalan borç muaccel olur.</li>
                <li>Servis ulaşım hattı belediye güzergahına göre düzenlenir ve tüm öğrencilerin ikameti gözetilerek en yakın noktada indirme/bindirme yapılır.</li>
                <li className="font-semibold text-slate-900 bg-blue-50/70 print:bg-transparent px-1 rounded">
                    Servis ücretleri okuldaki yetkiliye ödenir. İlk taksit en geç açılış günü peşin, kalan taksitler her ayın 1'i ile 10'u arasında tahsil edilir. Yıllık servis ücreti <span className="underline font-black text-blue-900">{totalDebt ? `${totalDebt.toLocaleString('tr-TR')} TL + KDV` : '................... TL + KDV'}</span> olup, {installmentText} taksit halinde ödenecektir. 15 gün gecikmede tüm alacak muacceliyet kazanır.
                </li>
                <li>Ücretlendirmede yetkili kurumlarca belirlenen fiyatlar, akaryakıt ve enflasyon artışları göz önünde bulundurulur.</li>
                <li>Kayıt tüm eğitim-öğretim yılı düşünülerek yapıldığından, dönem bitmeden keyfi olarak servisten ayrılma halinde velinin cezai şart ödeme yükümlülüğü bulunmaktadır.</li>
                <li>Sözleşmenin haklı sebep olmaksızın veli tarafından tek taraflı feshi halinde tüm alacak muacceliyet kazanır.</li>
                <li>Öğrenci sayısının azalması halinde firmanın diğer servis araçları ile birleştirme hakkı saklıdır.</li>
                <li>Güzergahta kayıtlı öğrenci sayısının 12'yi geçmemesi halinde firmanın sözleşmeyi tek taraflı feshetme hakkı vardır.</li>
                <li>Ödenen servis borçları firma kayıtlarına ve ödeme listelerine işlenir. İhtilaf halinde firma ödeme kayıtları esastır.</li>
                <li>Öğretim yılı sonunda borcu kalmayan öğrencinin senedi yetkili tarafından iptal edilip iade edilir. İki nüsha olarak tanzim edilmiştir.</li>
            </ol>

            {/* Senet / Promissory Note Box (Compact) */}
            <div className="border border-slate-300 rounded-lg p-2 print:p-1 bg-slate-50/90 print:bg-transparent space-y-1">
                <div className="flex justify-between items-center border-b border-slate-200 pb-0.5">
                    <span className="text-[9.5px] print:text-[7.8px] font-black uppercase text-slate-800 tracking-wider">
                        Resmi Senet Taahhüt Bölümü (Bono)
                    </span>
                    <span className="text-[8px] text-slate-500 font-semibold">
                        {isOzhamle ? 'İhtilafta Ankara Batı Adliyeleri Yetkilidir' : 'İhtilafta Yetkili Mahkemeler Geçerlidir'}
                    </span>
                </div>

                <div className="grid grid-cols-4 gap-1 text-center text-[9px] print:text-[7.5px] font-bold">
                    <div className="bg-white print:bg-transparent p-0.5 border border-slate-200 rounded">ÖDEME: TAKSİT</div>
                    <div className="bg-white print:bg-transparent p-0.5 border border-slate-200 rounded">TUTAR: {totalDebt ? `${totalDebt.toLocaleString('tr-TR')} ₺` : '-'}</div>
                    <div className="bg-white print:bg-transparent p-0.5 border border-slate-200 rounded">KURUŞ: 00</div>
                    <div className="bg-white print:bg-transparent p-0.5 border border-slate-200 rounded">TAKSİT: {installmentCount} AY</div>
                </div>

                <p className="text-[9px] print:text-[7.5px] text-slate-700 text-justify leading-tight">
                    İşbu emre muharrer senedim mukabilinde <strong>{rawCompanyName}</strong> veyahut emrühavalesine yukarıda yazılı yalnız <strong>{totalDebt ? `${totalDebt.toLocaleString('tr-TR')} TL` : '...................... TL'}</strong> bedeli nakden/malen ahzolunmuştur. Vadesinde ödenmediğinde müteakip bonolar muacceliyet kesbedecek olup {isOzhamle ? <strong>Ankara Batı Adliyeleri</strong> : <strong>Yetkili Mahkemeler</strong>}'nin selahiyetini kabul eylerim.
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 text-[9px] print:text-[7.5px] leading-tight">
                    <div className="space-y-0.5">
                        <div>Borçlu / Veli: <strong>{parentFullName}</strong> &bull; TC: <strong>{parentTc}</strong></div>
                        <div className="truncate">Adres: <strong>{address}</strong></div>
                    </div>

                    <div className="flex items-center justify-end gap-2 bg-white print:bg-transparent p-1 rounded border border-slate-200">
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                            Veli Islak İmzası:
                        </span>
                        {signature ? (
                            <div className="flex items-center gap-1.5">
                                <img src={signature} alt="Veli İmzası" className="max-h-8 max-w-[110px] object-contain" />
                                {signedDate && (
                                    <span className="text-[7px] text-emerald-700 font-semibold block">
                                        ✓ {signedDate}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <span className="text-[8.5px] text-amber-600 font-semibold italic">
                                İmza Bekleniyor
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PersonalizedContractDocument;
