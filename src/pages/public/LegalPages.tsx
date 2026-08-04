import React from 'react';

import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import { ShieldCheck, FileText, Lock } from 'lucide-react';

const LegalLayout: React.FC<{ children: React.ReactNode; title: string; icon: React.ReactNode; lastUpdated: string }> = ({ children, title, icon, lastUpdated }) => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />
            <main className="flex-grow pt-24 pb-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                        <div className="bg-slate-900 px-8 py-12 text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-6 backdrop-blur-sm border border-white/20">
                                    {icon}
                                </div>
                                <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{title}</h1>
                                <p className="text-slate-400">Son Güncelleme: {lastUpdated}</p>
                            </div>
                        </div>
                        <div className="p-8 md:p-12 prose prose-slate max-w-none prose-headings:text-slate-800 prose-a:text-primary">
                            {children}
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export const KVKK: React.FC = () => (
    <LegalLayout title="KVKK Aydınlatma Metni" icon={<ShieldCheck size={32} />} lastUpdated="04 Ağustos 2026">
        <h3>1. Veri Sorumlusu</h3>
        <p>
            6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, kişisel verileriniz veri sorumlusu sıfatıyla <strong>ServisBot Teknoloji</strong> (bundan böyle "Şirket" veya "ServisBot" olarak anılacaktır) tarafından aşağıda açıklanan kapsamda işlenebilecektir.
        </p>

        <h3>2. Kişisel Verilerin Hangi Amaçla İşleneceği</h3>
        <p>
            Toplanan kişisel verileriniz, ServisBot yazılım sisteminden faydalanabilmeniz, öğrenci ve personel servis süreçlerinin takibi, güzergah ve puantaj hesaplamalarının yapılabilmesi ve müşteri destek hizmetlerinin sunulabilmesi amaçlarıyla, KVKK’nın 5. ve 6. maddelerinde belirtilen kişisel veri işleme şartları ve amaçları dahilinde işlenmektedir.
        </p>

        <h3>3. İşlenen Kişisel Verilerin Kimlere ve Hangi Amaçla Aktarılabileceği</h3>
        <p>
            Toplanan kişisel verileriniz; iş ortaklarımıza, tedarikçilerimize, kanunen yetkili kamu kurumları ve özel kişilere, KVKK’nın 8. ve 9. maddelerinde belirtilen şartlar çerçevesinde aktarılabilecektir. Verileriniz sunucularımızda güvenli bir şekilde saklanmakta olup, izinsiz üçüncü şahıslarla paylaşılmamaktadır.
        </p>

        <h3>4. Kişisel Veri Toplamanın Yöntemi ve Hukuki Sebebi</h3>
        <p>
            Kişisel verileriniz, platformumuzu kullanımınız sırasında elektronik ortamda otomatik yollarla (web sitesi, mobil uygulama, kayıt formları) toplanmaktadır. Bu veriler, sözleşmenin kurulması veya ifası, hukuki yükümlülüklerimizin yerine getirilmesi ve meşru menfaatlerimiz hukuki sebeplerine dayanılarak işlenmektedir.
        </p>

        <h3>5. Veri Sahibinin Hakları</h3>
        <p>
            KVKK’nın 11. maddesi uyarınca veri sahipleri; kişisel verilerinin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme, yurt içinde veya yurt dışında kişisel verilerin aktarıldığı üçüncü kişileri bilme ve eksik/yanlış işlenmişse düzeltilmesini isteme haklarına sahiptir.
        </p>
        <p className="text-sm text-slate-500 mt-8 border-t pt-4">
            * Bu metin standart bir bilgilendirme metnidir ve yasal tavsiye niteliği taşımaz.
        </p>
    </LegalLayout>
);

export const PrivacyPolicy: React.FC = () => (
    <LegalLayout title="Gizlilik Politikası" icon={<Lock size={32} />} lastUpdated="04 Ağustos 2026">
        <h3>Giriş</h3>
        <p>
            ServisBot olarak kullanıcılarımızın gizliliğine ve kişisel verilerinin güvenliğine en yüksek düzeyde önem vermekteyiz. Bu Gizlilik Politikası, ServisBot platformunu kullanırken bilgilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu açıklamaktadır.
        </p>

        <h3>Toplanan Bilgiler</h3>
        <p>
            Hizmetlerimizi kullandığınızda şu bilgileri toplayabiliriz:
        </p>
        <ul>
            <li><strong>Kayıt Bilgileri:</strong> Ad, soyad, e-posta adresi, telefon numarası.</li>
            <li><strong>Operasyonel Veriler:</strong> Araç plakaları, şoför bilgileri, öğrenci güzergahları ve durak konumları.</li>
            <li><strong>Cihaz Bilgileri:</strong> IP adresi, tarayıcı türü, uygulama kullanım istatistikleri.</li>
        </ul>

        <h3>Bilgilerin Kullanımı</h3>
        <p>
            Toplanan veriler yalnızca ServisBot sisteminin temel fonksiyonlarının (rotalama, veli bilgilendirmeleri, araç takibi) çalıştırılması, sistem hatalarının giderilmesi ve kullanıcı deneyiminin iyileştirilmesi amacıyla kullanılır.
        </p>

        <h3>Veri Güvenliği</h3>
        <p>
            Tüm verileriniz güncel şifreleme standartları (SSL/TLS) ile korunmakta ve bulut sunucularımızda güvenli bir şekilde saklanmaktadır. Veritabanımıza erişim katı yetkilendirme kurallarına tabidir.
        </p>

        <h3>Çerezler (Cookies)</h3>
        <p>
            Platformumuz, oturum yönetimi ve güvenlik amaçlarıyla temel çerezler kullanmaktadır. Tarayıcı ayarlarınızdan çerezleri devre dışı bırakabilirsiniz ancak bu durum sistemin bazı fonksiyonlarının çalışmamasına neden olabilir.
        </p>
    </LegalLayout>
);

export const TermsOfService: React.FC = () => (
    <LegalLayout title="Kullanım Şartları" icon={<FileText size={32} />} lastUpdated="04 Ağustos 2026">
        <h3>1. Kabul Beyanı</h3>
        <p>
            ServisBot platformuna erişerek veya kullanarak, işbu Kullanım Şartları'nı okuduğunuzu, anladığınızı ve bağlayıcılığını kabul etmiş olursunuz.
        </p>

        <h3>2. Hizmetin Kapsamı</h3>
        <p>
            ServisBot, servis taşımacılığı operasyonlarını yönetmek üzere tasarlanmış bulut tabanlı bir SaaS (Hizmet Olarak Yazılım) platformudur. Şirketimiz, sistemin kesintisiz çalışması için azami gayreti göstermekle birlikte, yaşanabilecek anlık teknik kesintilerden sorumlu tutulamaz.
        </p>

        <h3>3. Kullanıcı Yükümlülükleri</h3>
        <p>
            Kullanıcı, platforma girdiği verilerin (şoför bilgileri, öğrenci adresleri vb.) doğruluğundan bizzat sorumludur. Sistemin amacı dışında, yasa dışı faaliyetler veya üçüncü şahısların gizliliğini ihlal edecek şekilde kullanılması kesinlikle yasaktır.
        </p>

        <h3>4. Fikri Mülkiyet Hakları</h3>
        <p>
            ServisBot yazılımının kodları, tasarımları, logoları ve tüm fikri mülkiyet hakları münhasıran ServisBot'a aittir. Kopyalanması, çoğaltılması veya tersine mühendislik yapılması yasaktır.
        </p>

        <h3>5. Ücretlendirme ve İptal</h3>
        <p>
            Hizmetlerimiz abonelik modeli ile sunulmaktadır. İptal talepleri, aktif fatura döneminin sonundan itibaren geçerli olmak üzere işleme alınır. Geçmiş dönemlere ait ücret iadesi yapılmamaktadır.
        </p>

        <h3>6. Uyuşmazlıkların Çözümü</h3>
        <p>
            İşbu sözleşmeden doğabilecek uyuşmazlıklarda Ankara Mahkemeleri ve İcra Daireleri yetkilidir.
        </p>
    </LegalLayout>
);
