# Sonar — Dunyayi Dinle

Kullanicilarin **Last.fm kullanici adlarini girip**, 3D dunya uzerinde
birbirlerinin su an ne dinlediklerini veya son dinledikleri sarkiyi ve konumlarini
canli olarak gordugu platform.

- Last.fm kullanici adi ile baglanma, OAuth/Extended quota yok
- Spotify dinlemeleri icin kullanicinin Last.fm hesabinda Spotify scrobbling acik olmali
- 3D interaktif dunya: surukleyerek dondurme, mouse tekerlegi/iki parmak ile zoom
- Konum gizliligi: **Global / Sadece Arkadaslar / Kapali**
- Firebase Firestore ile gercek zamanli senkronizasyon

---

## 1) Gereksinimler

- Node.js 18+
- Bir Google/Firebase hesabi
- Bir Last.fm API key

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

Last.fm girisi Firebase'in kendi kimlik saglayicisi degildir. Firebase Anonymous Auth,
her kullaniciya sadece Firestore guvenlik kurallarinin calismasi icin bir `uid` verir.

1. Firebase Console → **Authentication** → **Get started**
2. **Sign-in method** → **Anonymous** → **Enable**

### d) Firestore Database

1. **Firestore Database** → **Create database** → **Production mode** sec.
2. **Rules** sekmesinde `KURALLAR-firestore.rules.txt` icindeki metni yapistir ve yayinla.

### e) Storage

Storage zorunlu degil; Spotify/Last.fm gorselleri dis CDN'lerden gelir. Yine de Firebase
Storage kullanacaksan `KURALLAR-storage.rules.txt` kurallarini yayinla.

## 4) Last.fm Kurulumu

1. https://www.last.fm/api/account/create adresinden bir API account olustur.
2. Sana verilen **API Key** degerini `.env` dosyasina koy.
3. **Shared secret** degerini bu frontend projeye koyma; bu uygulamada gerekli degil.

Kullanicilar Spotify'da dinlediklerinin gorunmesini istiyorsa Last.fm hesaplarinda
Spotify scrobbling'i acmalidir. Last.fm API dokumanina gore `user.getRecentTracks`
ve `user.getInfo` authentication istemez; API key ve kullanici adi yeterlidir.

## 5) Ortam Degiskenleri

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

VITE_LASTFM_API_KEY=...
```

Canli GitHub Pages yayininda repo ayarlarina `VITE_LASTFM_API_KEY` adli GitHub Secret eklenmelidir.
Yerel gelistirmede `.env` icindeki `VITE_LASTFM_API_KEY` kullanilir.

## 6) Gelistirme

```bash
npm run dev
```

Tarayicida `http://127.0.0.1:5173` ac.

## 7) Canliya Alma

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
| Arayuz | React + Vite + Tailwind | 3D globe, kartlar, paneller |
| Globe | `cobe` | WebGL dunya + marker |
| Dinleme verisi | Last.fm API | Profil ve su an/son dinlenen sarki |
| Kimlik | Firebase Anonymous Auth | Guvenlik kurallari icin `uid` |
| Gercek zamanli | Firestore `onSnapshot` | Aktif kullanicilari canli yayinlar |
| Konum | Tarayici Geolocation + IP fallback | Enlem/boylam + sehir/ulke |

Her kullanicinin kaydi `users/{uid}` altinda tutulur. Uygulama 20 saniyede bir
Last.fm'den son parcayi alir ve Firestore'u gunceller. 5 dakikadan uzun suredir aktif
olmayanlar haritadan duser.

## Gizlilik

- **Kapali** secilirse konum Firestore'a hic yazilmaz.
- **Sadece Arkadaslar** secilirse yalnizca arkadas olarak eklenenler haritada gorebilir.
- Last.fm sifresi veya token saklanmaz; sadece kullanici adi localStorage'da tutulur.
- Kurallar kullanicilarin yalnizca kendi Firestore kayitlarini yazmasina izin verir.
