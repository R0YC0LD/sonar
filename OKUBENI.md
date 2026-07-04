# Sonar — Dunyayi Dinle

Sonar, kullanicilarin site icinde profil olusturup muzik arayarak dinledigi ve
o anda ne dinlediklerini konumlariyla birlikte 3D dunya uzerinde canli gosteren
bir sosyal muzik haritasi uygulamasidir.

- Site icinde kullanici adi ve profil fotografi belirleme
- Profil fotografini cihazdan yukleme ve Firebase Storage'da saklama
- YouTube Data API ile muzik/video arama
- YouTube IFrame Player ile sitede oynatma
- O anda calan parcanin Firestore ile canli paylasimi
- 3D dunya uzerinde aktif dinleyiciler
- Zoom yapinca kullanici/profil/sarki popup'lari
- Konum gizliligi: **Global / Sadece Arkadaslar / Kapali**

---

## 1) Gereksinimler

- Node.js 18+
- Bir Google/Firebase hesabi
- YouTube Data API v3 API key

## 2) Kurulum

```bash
npm install
```

## 3) Firebase Kurulumu

### a) Proje olustur

1. https://console.firebase.google.com adresine gir.
2. **Add project** ile yeni proje olustur.

### b) Web uygulamasi ekle ve config'i al

1. Proje ana sayfasinda **</> (Web)** simgesine tikla.
2. Uygulamaya isim ver, **Register app** de.
3. Verilen `firebaseConfig` degerlerini `.env` dosyasina gir.

### c) Authentication

> **Anonymous (Anonim)** saglayicisini ac.

Kullanici profili uygulamanin icinde olusturulur. Firebase Anonymous Auth,
her ziyaretciye Firestore guvenlik kurallarinin calismasi icin bir `uid` verir.

1. Firebase Console → **Authentication** → **Get started**
2. **Sign-in method** → **Anonymous** → **Enable**

### d) Firestore Database

1. **Firestore Database** → **Create database** → **Production mode** sec.
2. **Rules** sekmesinde `KURALLAR-firestore.rules.txt` icindeki metni yapistir ve yayinla.

### e) Storage

Profil fotograflari Firebase Storage'a yuklenir.

1. **Storage** → **Get started** ile Storage'i ac.
2. **Rules** sekmesinde `KURALLAR-storage.rules.txt` icindeki metni yapistir ve yayinla.

## 4) Ortam Degiskenleri

`.env.example` dosyasini `.env` olarak kopyala ve doldur:

```bash
Copy-Item .env.example .env
```

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

VITE_YOUTUBE_API_KEY=...
```

Canli GitHub Pages yayininda repo ayarlarina `VITE_YOUTUBE_API_KEY` adli GitHub Secret
eklenmelidir. YouTube API key icin referrer kisitlarina su adresleri ekle:

```text
https://r0yc0ld.github.io/*
http://127.0.0.1:5173/*
http://localhost:5173/*
```

## 5) Gelistirme

```bash
npm run dev
```

Tarayicida `http://127.0.0.1:5173` ac.

## 6) Canliya Alma

Bu repo GitHub Pages icin hazirlanmistir. `main` branch'ine push yapildiginda
`.github/workflows/deploy.yml` otomatik build alip yayinlar.

Elle build almak icin:

```bash
npm run build
```

---

## Nasil Calisiyor?

| Katman | Teknoloji | Gorev |
|--------|-----------|-------|
| Arayuz | React + Vite + Tailwind | 3D globe, player, kartlar, paneller |
| Globe | `cobe` | WebGL dunya + marker |
| Player | YouTube Data API + IFrame API | Video arama ve gorunur YouTube player ile oynatma |
| Kimlik | Firebase Anonymous Auth | Guvenlik kurallari icin `uid` |
| Gercek zamanli | Firestore `onSnapshot` | Aktif kullanicilari ve calan parcayi canli yayinlar |
| Avatar | Firebase Storage | Kullanici profil fotograflarini saklar |
| Konum | Tarayici Geolocation + IP fallback | Enlem/boylam + sehir/ulke |

Her kullanicinin kaydi `users/{uid}` altinda tutulur. Uygulama profil, konum,
su an calan parca ve son aktiflik bilgisini Firestore'a yazar. 5 dakikadan uzun
suredir aktif olmayanlar haritadan duser.

## Gizlilik

- **Kapali** secilirse konum Firestore'a hic yazilmaz.
- **Sadece Arkadaslar** secilirse yalnizca arkadas olarak eklenenler haritada gorebilir.
- Harici muzik hesabi sifresi veya token saklanmaz.
- Kurallar kullanicilarin yalnizca kendi Firestore kayitlarini yazmasina izin verir.
