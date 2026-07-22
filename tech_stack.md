# ServisBot Teknoloji Stack'i

ServisBot, modern ve ölçeklenebilir bir mimari üzerine inşa edilmiştir. Proje; **Web Dashboard**, **Mobil Uygulama** ve **Backend (Supabase)** olmak üzere üç ana kısımdan oluşmaktadır.

## 1. Web Yönetim Paneli (Desktop)
Yöneticilerin servisleri, rotaları, sürücüleri ve finansal süreçleri yönettiği kısımdır.

- **Frontend Framework:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Dil:** [TypeScript](https://www.typescriptlang.org/)
- **Stil & UI:** 
    - **Tailwind CSS 4:** Modern ve hızlı arayüz tasarımı.
    - **Framer Motion:** Akıcı animasyonlar ve geçişler.
    - **Headless UI:** Erişilebilir ve özelleştirilebilir bileşenler.
    - **Lucide React:** Modern ikon seti.
- **Harita & Harita İşlemleri:**
    - **MapLibre GL / Mapbox GL:** Gelişmiş harita katmanları ve rota çizimi.
    - **Turf.js:** Coğrafi analizler (mesafe ölçümü, alan hesaplama vb.).
- **Veri & Raporlama:**
    - **Recharts:** Finansal ve operasyonel raporlar için grafikler.
    - **XLSX:** Excel formatında veri dışa aktarımı.
    - **QRCode.react:** Sürücü ve öğrenci takibi için QR kod üretimi.

## 2. Mobil Uygulama (Expo)
Sürücülerin rotaları takip ettiği ve velilerin çocuklarını izlediği kısımdır.

- **Framework:** [Expo](https://expo.dev/) (React Native)
- **Navigasyon:** **Expo Router** (Dosya tabanlı yönlendirme).
- **Stil:** **Twrnc** (Tailwind CSS tabanlı mobil stil yönetimi).
- **Donanım Erişimi:**
    - **Expo Location:** Canlı konum takibi.
    - **Expo Camera:** QR kod tarama (Sürücü/Öğrenci girişi).
    - **Expo Notifications:** Anlık bildirimler (Push Notifications).
- **Harita:** **React Native Maps** (Google Maps / Apple Maps entegrasyonu).

## 3. Backend & Veritabanı (BaaS)
Tüm sistemin beyni olarak **Supabase** kullanılmaktadır.

- **Veritabanı:** **PostgreSQL** (İlişkisel veritabanı).
- **Kimlik Doğrulama:** **Supabase Auth** (E-posta/Şifre ve OTP girişleri).
- **Güvenlik:** **RLS (Row Level Security)** (Her kullanıcının sadece kendi verisini görmesini sağlayan güvenlik katmanı).
- **Gerçek Zamanlı Veri:** **Supabase Realtime** (Harita üzerindeki araç hareketlerini anlık yansıtabilmek için).
- **Dosya Depolama:** **Supabase Storage** (Belgeler ve profil resimleri için).

---

> [!TIP]
> **Mimari Yaklaşım:** Proje bir monorepo yapısında ilerliyor, bu sayede web ve mobil projeler arasında TypeScript tipleri ve bazı yardımcı fonksiyonlar paylaşılabiliyor.
