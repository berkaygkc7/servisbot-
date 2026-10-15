import React from 'react';
import { ozhamleLogo } from '../../assets/ozhamleLogo';
import { CheckCircle2 } from 'lucide-react';

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
    isPrintMode = false,
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

    // -------------------------------------------------------------
    // 1. SERVİSPARK TEMPLATE
    // -------------------------------------------------------------
    if (isServispark) {
        return (
            <div className={`bg-white text-slate-900 font-sans ${isPrintMode ? 'p-2' : 'p-4 sm:p-6'} rounded-2xl border border-slate-200 shadow-sm space-y-4`}>
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-slate-200">
                    <div className="flex flex-col text-[#001f3f]">
                        <div className="flex items-center gap-2">
                            <span className="text-3xl sm:text-4xl font-black italic tracking-tighter text-blue-900">S</span>
                            <div className="flex flex-col">
                                <span className="text-xl sm:text-2xl font-black tracking-tighter leading-none text-slate-900">SERVİS PARK</span>
                                <span className="text-xs font-bold tracking-widest text-blue-900">TURİZM</span>
                            </div>
                        </div>
                        <div className="font-semibold text-xs mt-2 text-slate-600">
                            İrtibat: <strong>0545 283 32 55</strong> &bull; www.servisparkturizm.com
                        </div>
                        <div className="text-[11px] font-bold text-slate-800 mt-0.5">
                            SERVİSPARK TAŞIMACILIK TURİZM TİCARET LİMİTED ŞİRKETİ
                        </div>
                        <div className="text-[10px] text-slate-500">
                            Şeyh Şamil Mh. 137. Cd. A1-3 Eryaman, Etimesgut / ANKARA
                        </div>
                    </div>

                    <div className="text-xs border border-slate-200 rounded-xl p-3 bg-slate-50/70 w-full sm:w-auto min-w-[260px] space-y-1">
                        <div><span className="text-slate-400">Öğrenci:</span> <strong className="text-slate-800">{studentFullName}</strong></div>
                        <div><span className="text-slate-400">Veli:</span> <strong className="text-slate-800">{parentFullName}</strong></div>
                        <div><span className="text-slate-400">Telefon:</span> <strong className="text-slate-800">{parentPhone}</strong></div>
                        <div><span className="text-slate-400">Okul:</span> <strong className="text-slate-800">{schoolName || '-'}</strong></div>
                        <div><span className="text-slate-400">Sınıf:</span> <strong className="text-slate-800">{grade}</strong></div>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                        ÖĞRENCİ SERVİS KAYIT SÖZLEŞMESİ
                    </h2>
                    <span className="text-xs font-mono font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                        NO: 02551
                    </span>
                </div>

                <p className="text-xs font-semibold text-slate-700 text-justify leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <strong>KONU:</strong> 2026/2027 Eğitim ve öğretim yılında öğrenci taşımacılığında velinin ve taşımacılığı üstlenen firmanın menfaatlerini korumak amacıyla bahsedilen öğretim yılında aşağıda belirtilecek şekilde yapılacaktır.
                </p>

                {/* Clauses */}
                <ol className="list-decimal pl-5 text-[11px] sm:text-xs text-slate-700 space-y-2 text-justify leading-relaxed">
                    <li>Servis araçlarımız İçişleri Bakanlığı'nın 28.08.2007 tarih 26627 sayılı okul servis araçları yönetmeliğine uygundur.</li>
                    <li>Servis araçları öğrenciyi aldığı durağa 15 dakika gecikmesi halinde öğrenci ya da veli okul servis yetkilisini arayıp bilgi alır. Aracın gelemeyeceğinin bildirilmesi durumunda taksi ile okula gelinebilir ve taksi ücreti servis yetkilisince karşılanır.</li>
                    <li>Servis konusunda velinin doğrudan muhatabı firmadır. Şikayet ve talepler şoföre değil servis yetkilisine iletilir.</li>
                    <li>Öğrencinin araçtaki hal ve hareketleri öğrenciye yakışır ve diğer öğrencileri rahatsız etmeyecek şekilde olmalıdır. Kural ihlallerinde servis ilişkisi kesilir, kalan borç muaccel olur.</li>
                    <li>Servis güzergahı belediye hattına ve tüm öğrencilerin ikametine göre planlanır, en uygun noktada indirme-bindirme yapılır.</li>
                    <li className="font-semibold text-slate-900 bg-blue-50/60 p-2 rounded border border-blue-100">
                        Servis ücretlerinin ödemesi okuldaki servis yetkilisine yapılır. İlk taksit peşin, kalan taksitler her ayın 1'i ile 10'u arasında tahsil edilir. Yıllık servis ücreti <span className="underline font-black text-blue-900">{totalDebt ? `${totalDebt.toLocaleString('tr-TR')} TL + KDV` : '................... TL + KDV'}</span>'dir.
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
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-3 sm:p-4 bg-slate-50/80 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
                            Resmi Senet ve Taahhüt Bölümü
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold">T.C. Hukukuna Göre Bono Niteliğindedir</span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
                        <div className="bg-white p-1.5 border border-slate-200 rounded">VADE: DÜZENLİ</div>
                        <div className="bg-white p-1.5 border border-slate-200 rounded">TUTAR: {totalDebt ? `${totalDebt.toLocaleString('tr-TR')} TL` : '-'}</div>
                        <div className="bg-white p-1.5 border border-slate-200 rounded">KURUŞ: 00</div>
                        <div className="bg-white p-1.5 border border-slate-200 rounded">NO: 02551</div>
                    </div>

                    <p className="text-[11px] text-slate-700 text-justify leading-relaxed">
                        İşbu emre muharrer senedim mukabilinde <strong>SERVİSPARK TAŞ. TURZ. TİC. LTD. ŞTİ.</strong> veyahut emrühavalesine yukarıda yazılı toplam <strong>{totalDebt ? `${totalDebt.toLocaleString('tr-TR')} TL` : '...................... TL'}</strong> bedeli malen ahzolunmuştur. İşbu bono vadesinde ödenmediği takdirde müteakip bonoların da muacceliyet kesbedeceğini, ihtilaf vukuunda <strong>SİNCAN Mahkemeleri</strong>'nin yetkisini şimdiden kabul eylerim.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 text-xs">
                        <div className="space-y-0.5">
                            <div><span className="text-slate-400">Ödeyecek / Veli:</span> <strong>{parentFullName}</strong></div>
                            <div><span className="text-slate-400">T.C. Kimlik No:</span> <strong>{parentTc}</strong></div>
                            <div><span className="text-slate-400">Telefon:</span> <strong>{parentPhone}</strong></div>
                            <div><span className="text-slate-400">Adres:</span> <span className="text-slate-700">{address}</span></div>
                        </div>

                        <div className="flex flex-col items-center justify-center p-2 bg-white rounded-lg border border-slate-200 text-center">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Veli Dijital Islak İmzası
                            </span>
                            {signature ? (
                                <>
                                    <img src={signature} alt="Veli İmzası" className="max-h-16 max-w-full object-contain my-0.5" />
                                    {signedDate && (
                                        <span className="text-[10px] text-emerald-700 font-semibold mt-1">
                                            ✓ Onay Tarihi: {signedDate}
                                        </span>
                                    )}
                                </>
                            ) : (
                                <span className="text-xs text-amber-600 font-medium py-3 italic">
                                    Henüz İmzalanmadı (İmza Bekleniyor)
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // -------------------------------------------------------------
    // 2. GÜRÖZ TEMPLATE
    // -------------------------------------------------------------
    if (isGuroz) {
        return (
            <div className={`bg-white text-slate-900 font-sans ${isPrintMode ? 'p-2' : 'p-4 sm:p-6'} rounded-2xl border border-slate-200 shadow-sm space-y-4`}>
                {/* Header */}
                <div className="text-center border-b border-slate-200 pb-3">
                    <h2 className="text-lg sm:text-xl font-black text-red-600 tracking-tight">
                        ÖĞRENCİ TAŞIMA SÖZLEŞMESİ
                    </h2>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                        GÜRÖZ TAŞIMACILIK TEM. TUR. İNŞ. SAN. VE TİC. LTD. ŞTİ.
                    </p>
                </div>

                <p className="text-xs font-semibold text-slate-700 text-justify leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <strong>KONU:</strong> 2026/2027 Eğitim ve öğretim yılında öğrenci taşımacılığında veli ve servisçi menfaatlerini korumak amacıyla bahsedilen öğretim yılında aşağıda belirtilen şekilde taşımacılık yapılacaktır.
                </p>

                {/* Clauses */}
                <ol className="list-decimal pl-5 text-[11px] sm:text-xs text-slate-700 space-y-2 text-justify leading-relaxed">
                    <li>Servis araçlarımız İçişleri Bakanlığının 21.05.1992 gün ve 21234 sayılı okul servis araçları yönetmeliğine uygun olacaktır. (Öğrenci ferdi kaza sigortası yapılacaktır.)</li>
                    <li>Yıl içinde Ankara Valiliğinin açıkladığı fiyat tarifesi uygulanacaktır.</li>
                    <li>Servis konusunda velinin muhatabı ilgili firmadır. Firma şoförü herhangi bir sebeple değiştirebilir.</li>
                    <li>Öğrencinin araçtaki hal ve hareketleri bir öğrenciye yakışır şekilde olacaktır. Disiplin durumlarında okul idaresine bildirim yapılır.</li>
                    <li>Servis araçlarımız belediye güzergahında dolaşıp öğrenciyi ikamet adresine en yakın yerde indirir.</li>
                    <li>Servis ücretleri MEB öğrencinin okula geleceği gün sayısına göre hesaplanıp ücret belirlenir.</li>
                    <li>Servis ücretleri en fazla 9 eşit taksite bölünerek tahsil edilir.</li>
                    <li className="font-semibold text-slate-900 bg-red-50/70 p-2 rounded border border-red-100">
                        Ücret ödemesi ayın 15'i ile en geç 20'si arasında yapılacaktır. Bir sezonluk ücretimiz KDV dahil <span className="underline font-black text-red-700">{totalDebt ? `${totalDebt.toLocaleString('tr-TR')} TL` : '................... TL'}</span>'dir. {monthlyPrice ? `(Aylık ${monthlyPrice.toLocaleString('tr-TR')} TL x 9 Taksit)` : ''}
                    </li>
                    <li>Öğrenci servise kaydını yaptırdıktan sonra keyfi olarak servisten ayrılamaz.</li>
                    <li>Bayram ve sömestr tatillerinde fiyat indirimi yapılmayıp yıllık ücretten düşülmüştür.</li>
                    <li>Sözleşmeyi temin altına almak için aşağıdaki teminat senedi veli tarafından imzalanmıştır. Borç bittiğinde senet iptal edilip iade edilir.</li>
                    <li>İşbu sözleşme 12 maddeden ibaret olup, ihtilaf vukuunda <strong>Sincan Mahkemeleri</strong> yetkilidir.</li>
                </ol>

                {/* Student and Parent Details Table */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border border-slate-200 rounded-xl p-3 bg-slate-50/70">
                    <div><span className="text-slate-400">Okulu:</span> <strong className="text-slate-800">{schoolName || '-'}</strong></div>
                    <div><span className="text-slate-400">Öğrenci Adı Soyadı:</span> <strong className="text-slate-800">{studentFullName}</strong></div>
                    <div><span className="text-slate-400">Veli Adı Soyadı:</span> <strong className="text-slate-800">{parentFullName}</strong></div>
                    <div><span className="text-slate-400">Öğrenci / Veli TC:</span> <strong className="text-slate-800">{parentTc}</strong></div>
                    <div><span className="text-slate-400">İletişim Tel:</span> <strong className="text-slate-800">{parentPhone}</strong></div>
                    <div><span className="text-slate-400">Sınıfı:</span> <strong className="text-slate-800">{grade}</strong></div>
                    <div className="sm:col-span-2"><span className="text-slate-400">Ev Adresi:</span> <span className="text-slate-700">{address}</span></div>
                </div>

                {/* Senet */}
                <div className="border-2 border-dashed border-red-200 rounded-xl p-3 sm:p-4 bg-red-50/30 space-y-3">
                    <div className="flex items-center justify-between border-b border-red-200 pb-1.5">
                        <span className="text-xs font-black uppercase text-red-900 tracking-wider">
                            Teminat Senedi (Bono)
                        </span>
                        <span className="text-[10px] text-red-700 font-semibold">Sincan Mahkemeleri Yetkilidir</span>
                    </div>

                    <p className="text-[11px] text-slate-700 text-justify leading-relaxed">
                        İşbu emre muharrer senedim mukabilinde <strong>GÜRÖZ TAŞIMACILIK TEM. TUR. İNŞ. SAN. VE TİC. LTD. ŞTİ.</strong> veyahut emrühavalesine yukarıda yazılı yalnız <strong>{totalDebt ? `${totalDebt.toLocaleString('tr-TR')} TL` : '...................... TL'}</strong> ödeyeceğim. Bedeli ahzolunmuştur. Vadesinde ödenmediği takdirde müteakip bonolar muacceliyet kesbedecektir.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 border-t border-red-100 text-xs">
                        <div className="text-slate-700 space-y-0.5">
                            <div>Borçlu: <strong>{parentFullName}</strong></div>
                            <div>TC: <strong>{parentTc}</strong></div>
                        </div>

                        <div className="flex flex-col items-center justify-center p-2 bg-white rounded-lg border border-slate-200 text-center min-w-[180px]">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Veli İmzası
                            </span>
                            {signature ? (
                                <>
                                    <img src={signature} alt="Veli İmzası" className="max-h-14 max-w-full object-contain" />
                                    {signedDate && (
                                        <span className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                                            ✓ {signedDate}
                                        </span>
                                    )}
                                </>
                            ) : (
                                <span className="text-xs text-amber-600 font-medium py-2 italic">
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
    // 3. ÖZHAMLE / HALEGÜL / GENEL (STANDART) TEMPLATE
    // -------------------------------------------------------------
    return (
        <div className={`bg-white text-slate-900 font-sans ${isPrintMode ? 'p-2' : 'p-4 sm:p-6'} rounded-2xl border border-slate-200 shadow-sm space-y-5`}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    {isOzhamle ? (
                        <img src={ozhamleLogo} alt="Özhamle Turizm" className="h-12 w-auto object-contain" />
                    ) : propCompanyLogo ? (
                        <img src={propCompanyLogo} alt="Firma Logo" className="h-12 w-auto object-contain rounded-lg" />
                    ) : null}
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block">
                            {rawCompanyName}
                        </span>
                        <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-tight mt-0.5">
                            ÖĞRENCİ SERVİS TAŞIMA KAYIT SÖZLEŞMESİ
                        </h2>
                    </div>
                </div>

                <div className="text-right">
                    <span className="text-[11px] text-slate-400 font-medium block">Eğitim-Öğretim Yılı</span>
                    <span className="text-xs font-black text-slate-700 block">2026 - 2027</span>
                </div>
            </div>

            {/* Personalized Student & Parent Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
                <div>
                    <span className="text-slate-400 font-medium block">Öğrenci Adı Soyadı</span>
                    <strong className="text-slate-900 font-bold text-sm block mt-0.5">{studentFullName}</strong>
                </div>

                <div>
                    <span className="text-slate-400 font-medium block">Veli Adı Soyadı</span>
                    <strong className="text-slate-900 font-bold text-sm block mt-0.5">{parentFullName}</strong>
                </div>

                <div>
                    <span className="text-slate-400 font-medium block">Okul / Sınıf</span>
                    <strong className="text-slate-800 font-semibold block mt-0.5 truncate">
                        {schoolName || '-'} ({grade})
                    </strong>
                </div>

                <div>
                    <span className="text-slate-400 font-medium block">İletişim Telefonu</span>
                    <strong className="text-slate-800 font-semibold block mt-0.5">{parentPhone}</strong>
                </div>

                <div className="col-span-1 sm:col-span-2">
                    <span className="text-slate-400 font-medium block">Ev / Alınacak Adres</span>
                    <span className="text-slate-700 font-medium block mt-0.5">{address}</span>
                </div>

                <div>
                    <span className="text-slate-400 font-medium block">Veli T.C. Kimlik No</span>
                    <strong className="text-slate-800 font-semibold block mt-0.5">{parentTc}</strong>
                </div>

                <div className="bg-blue-50/80 border border-blue-200 p-2.5 rounded-lg flex flex-col justify-center">
                    <span className="text-[10px] uppercase font-bold text-blue-900 block">Sezonluk Servis Ücreti</span>
                    <strong className="text-emerald-700 font-black text-sm block">
                        {totalDebt ? `${totalDebt.toLocaleString('tr-TR')} ₺` : 'Belirlenmedi'}
                    </strong>
                    <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                        {installmentText} taksit {monthlyPrice ? `(Aylık ~${monthlyPrice.toLocaleString('tr-TR')} ₺)` : ''}
                    </span>
                </div>
            </div>

            {/* Contract Context / Konu */}
            <p className="text-xs font-semibold text-slate-700 text-justify leading-relaxed bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
                <strong>KONU:</strong> 2026/2027 Eğitim ve öğretim yılında öğrenci taşımacılığında velinin ve taşımacılığı üstlenen <strong>{rawCompanyName}</strong> firmasının menfaatlerini korumak amacıyla bahsedilen öğretim yılında aşağıda belirtilecek şekilde yapılacaktır.
            </p>

            {/* Official 13 Clauses */}
            <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-100 pb-1.5">
                    Sözleşme Maddeleri ve Şartları
                </h4>
                <ol className="list-decimal pl-5 text-[11px] sm:text-xs text-slate-700 space-y-2 text-justify leading-relaxed">
                    <li>Servis araçlarımız İçişleri Bakanlığı'nın 28.08.2007 tarih 26627 sayılı okul servis araçları yönetmeliğine uygundur.</li>
                    <li>Servis araçları öğrenciyi aldığı durağa 15 dakika gecikmesi halinde öğrenci ya da öğrenci velisi okul servis yetkilisini arayıp servis aracı hakkında bilgi alır. Servis yetkilisinin aracın gelemeyeceğini bildirmesi durumunda güzergah üzerindeki diğer servis öğrencilerini almak suretiyle taksi ile okula gelebilir. Bu durumda taksi ücreti servis yetkilisi tarafından karşılanır. Öğrencinin kendi kusuruyla servisi kaçırması durumunda sorumluluk öğrenciye aittir.</li>
                    <li>Servis konusunda velinin muhatabı firmadır. Veli veya öğrenci servis hakkında şikayet ve isteklerini (servis güzergahı, durağı, saati vb.) servis yetkilisine iletmelidir. Servis şoförü bu konularda yetkili değildir.</li>
                    <li>Öğrencinin servisteki hal ve hareketleri bir öğrenciye yakışır, diğer öğrenciler ve servis şoförünü rahatsız etmeyecek şekilde olmalıdır. Araçta kullanımı yasak maddelerin kullanımı kesinlikle yasaktır. Aykırılık tespitinde öğrencinin servisle ilişkisi kesilir, kalan borç miktarı muaccel olur.</li>
                    <li>Servis araçlarımızın ulaşım hattı belediye güzergahına göre düzenlenir, tüm öğrencilerin ikamet adresleri düşünülerek servis şirketi tarafından belirlenir. Uygun olduğu ölçüde öğrenci ikametinin önünde ya da en yakın noktada indirilir.</li>
                    <li className="font-semibold text-slate-900 bg-blue-50/60 p-2.5 rounded-lg border border-blue-100">
                        Servis ücretlerinin ödemesi okuldaki servis yetkilisine yapılır. Başka birine yapılan ödemeler geçerli değildir. İlk taksit en geç okulların açıldığı gün peşin, taksit ödemeleri her ayın 1'i ile 10'u arasında yapılır. Yıllık servis ücreti <span className="underline font-black text-blue-900">{totalDebt ? `${totalDebt.toLocaleString('tr-TR')} TL + KDV` : '................... TL + KDV'}</span> olup, {installmentText} taksit halinde tahsil edilecektir. Ödeme günü üzerinden 15 gün geçmiş olmasına rağmen ödeme yapılmadığı takdirde tüm alacak muacceliyet kazanır.
                    </li>
                    <li>Ücretlendirme yetkili kurumlarca belirlenen fiyatlar, akaryakıt zammı, enflasyon artışı ve tarife değişiklikleri göz önünde bulundurularak servis şirketi tarafından yapılır.</li>
                    <li>Kayıt tüm eğitim-öğretim yılı düşünülerek yapıldığından, dönem bitmeden keyfi olarak servisten ayrılma halinde velinin cezai şart ödeme yükümlülüğü bulunmaktadır.</li>
                    <li>Sözleşmenin haklı sebep olmaksızın veli tarafından tek taraflı feshi halinde tüm alacak muacceliyet kazanır.</li>
                    <li>Öğrenci sayısının azalması halinde firmanın diğer servis araçları ile birleştirme hakkı saklıdır.</li>
                    <li>Güzergahta kayıtlı öğrenci sayısının 12'yi geçmemesi halinde firmanın sözleşmeyi tek taraflı feshetme hakkı vardır.</li>
                    <li>Ödenen servis borçları firma kayıtlarına ve ödeme listelerine işlenir. İhtilaf halinde firma ödeme kayıtları esastır.</li>
                    <li>Öğretim yılı sonunda öğrencinin borcu kalmadığında senet yetkili tarafından iptal edilip veliye iade edilir. İşbu sözleşme iki nüsha olarak tanzim edilmiştir.</li>
                </ol>
            </div>

            {/* Senet / Promissory Note Box */}
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 sm:p-5 bg-slate-50/90 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1 border-b border-slate-200 pb-2">
                    <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
                        Resmi Senet Taahhüt Bölümü (Bono)
                    </span>
                    <span className="text-[11px] text-slate-500 font-semibold">
                        {isOzhamle ? 'İhtilaf halinde Ankara Batı Adliyeleri Yetkilidir' : 'İhtilaf halinde Yetkili Mahkemeler ve İcra Daireleri Geçerlidir'}
                    </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-bold">
                    <div className="bg-white p-2 border border-slate-200 rounded-lg">ÖDEME: DÜZENLİ TAKSİT</div>
                    <div className="bg-white p-2 border border-slate-200 rounded-lg">TUTAR: {totalDebt ? `${totalDebt.toLocaleString('tr-TR')} ₺` : '-'}</div>
                    <div className="bg-white p-2 border border-slate-200 rounded-lg">KURUŞ: 00</div>
                    <div className="bg-white p-2 border border-slate-200 rounded-lg">TAKSİT: {installmentCount} AY</div>
                </div>

                <p className="text-[11px] sm:text-xs text-slate-700 text-justify leading-relaxed">
                    İşbu emre muharrer senedim mukabilinde <strong>{rawCompanyName}</strong> veyahut emrühavalesine yukarıda yazılı yalnız <strong>{totalDebt ? `${totalDebt.toLocaleString('tr-TR')} TL` : '...................... TL'}</strong> bedeli nakden/malen ahzolunmuştur. İşbu bono vadesinde ödenmediği takdirde müteakip bonoların da muacceliyet kesbedeceğini, ihtilaf vukuunda {isOzhamle ? <strong>Ankara Batı Adliyeleri</strong> : <strong>Yetkili Mahkemeler</strong>}'nin selahiyetini şimdiden kabul eylerim.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200 text-xs">
                    <div className="space-y-1">
                        <div><span className="text-slate-400 font-medium">Borçlu / Veli:</span> <strong className="text-slate-800">{parentFullName}</strong></div>
                        <div><span className="text-slate-400 font-medium">T.C. Kimlik No:</span> <strong className="text-slate-800">{parentTc}</strong></div>
                        <div><span className="text-slate-400 font-medium">İletişim:</span> <strong className="text-slate-800">{parentPhone}</strong></div>
                        <div><span className="text-slate-400 font-medium">İkamet Adresi:</span> <span className="text-slate-700">{address}</span></div>
                    </div>

                    <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Veli Dijital Islak İmzası
                        </span>
                        {signature ? (
                            <div className="flex flex-col items-center">
                                <img src={signature} alt="Veli İmzası" className="max-h-16 max-w-full object-contain my-1" />
                                {signedDate && (
                                    <span className="text-[10px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                                        <CheckCircle2 size={12} />
                                        Dijital Zaman Damgası: {signedDate}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <div className="py-2 text-center">
                                <span className="text-xs text-amber-600 font-semibold block">
                                    ⚠️ İmza Bekleniyor
                                </span>
                                <span className="text-[10px] text-slate-400 mt-0.5 block">
                                    Veliye iletilen link üzerinden dokunmatik olarak imzalanacaktır.
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer Notice */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-400 gap-1">
                <span>© {new Date().getFullYear()} {rawCompanyName} - Öğrenci Taşımacılığı Sistemi</span>
                <span>Bu belge dijital olarak oluşturulmuş ve kayıt altına alınmıştır.</span>
            </div>
        </div>
    );
};

export default PersonalizedContractDocument;
