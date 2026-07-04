# 🌐 Sonar — Dünyayı Dinle

Kullanıcıların **Spotify hesaplarını bağlayıp**, dünya modeli (3D globe) üzerinde
**birbirlerinin şu an ne dinlediklerini ve konumlarını canlı olarak** gördüğü platform.

- 🎧 Spotify ile giriş (PKCE — Client Secret gerekmez)
- 🌍 3D interaktif dünya (mouse tekerleği + iki parmak ile zoom, sürükleyerek döndürme)
- 📍 Konum gizliliği: **Global / Sadece Arkadaşlar / Kapalı**
- 👤 Spotify profil fotoğrafı + kullanıcı adı görünür
- ⚡ Firebase Firestore ile gerçek zamanlı senkronizasyon

---

## 1) Gereksinimler
- [Node.js 18+](https://nodejs.org)
- Bir Google/Firebase hesabı
- Bir Spotify hesabı (ücretsiz olabilir)

## 2) Kurulum
```bash
npm install
```

## 3) Firebase Kurulumu

### a) Proje oluştur
1. https://console.firebase.google.com → **Add project** (Proje ekle)
2. Proje adını gir, oluştur.

### b) Web uygulaması ekle ve config'i al
1. Proje ana sayfasında **</> (Web)** simgesine tıkla.
2. Uygulamaya isim ver, **Register app** de.
3. Sana verilen `firebaseConfig` değerlerini `.env` dosyasına gireceksin (aşağıda).

### c) Authentication (KİMLİK DOĞRULAMA) — **ne seçmeliyim?**
> **Cevap: "Anonymous" (Anonim) sağlayıcısını aç.**

Neden? Spotify, Firebase'in yerleşik giriş sağlayıcılarından **değildir**. Kullanıcı
kimliği için Spotify'ı ayrı olarak (PKCE ile) kullanıyoruz; Firebase Anonymous Auth ise
sadece her kullanıcıya güvenlik kurallarının çalışması için bir `uid` verir.

1. Firebase Console → **Authentication** → **Get started**
2. **Sign-in method** sekmesi → **Anonymous** → **Enable** → Kaydet.

*(İstersen ileride Google ile giriş de ekleyebilirsin ama zorunlu değil.)*

### d) Firestore Database
1. **Firestore Database** → **Create database** → **Production mode** seç → bölge seç.
2. Oluştuktan sonra **Rules** sekmesine gel ve
   [`KURALLAR-firestore.rules.txt`](KURALLAR-firestore.rules.txt) içindeki metni yapıştır → **Publish**.

### e) Storage (opsiyonel ama kuralları yükle)
1. **Storage** → **Get started** → varsayılanlarla ilerle.
2. **Rules** sekmesine gel ve
   [`KURALLAR-storage.rules.txt`](KURALLAR-storage.rules.txt) içindeki metni yapıştır → **Publish**.

> Not: Spotify profil fotoğrafları Spotify CDN'inden geldiği için Storage **zorunlu değil**.
> Sadece kullanıcı kendi özel avatarını yüklemek isterse gerekir.

## 4) Spotify Kurulumu
1. https://developer.spotify.com/dashboard → **Create app**
2. **Redirect URIs** kısmına şunları ekle (ikisini de):
   - `http://127.0.0.1:5173/callback`  (yerel geliştirme)
   - `https://SENIN-SITEN.web.app/callback`  (canlı site — Firebase Hosting adresin)
3. **APIs used**: "Web API" seçili olsun.
4. **Client ID**'yi kopyala (Client Secret'a GEREK YOK).

### Başkaları Spotify ile bağlanamıyorsa
Spotify yeni uygulamaları varsayılan olarak **Development mode** ile açar. Bu modda
uygulamayı yalnızca uygulama sahibi ve Dashboard'da izin verilen test kullanıcıları
kullanabilir. Başka biri bağlanınca Spotify token verse bile Web API istekleri 403
dönebilir; uygulama bu yüzden tekrar giriş ekranına döner.

Test kullanıcılarını eklemek için:
1. Spotify Developer Dashboard'a gir.
2. Uygulamanı aç → **Settings**.
3. **Users Management** sekmesine gir.
4. **Add new user** ile kullanıcının Spotify hesabındaki e-posta adresini ekle.

Daha geniş kitleye açmak için Spotify'ın **Extended quota mode** onayı gerekir.

## 5) Ortam Değişkenleri (`.env`)
`.env.example` dosyasını `.env` olarak kopyala ve doldur:

```bash
# PowerShell:
Copy-Item .env.example .env
```

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

VITE_SPOTIFY_CLIENT_ID=...
VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/callback
```

## 6) Geliştirme
```bash
npm run dev
```
Tarayıcıda **http://127.0.0.1:5173** aç (Spotify redirect için `localhost` yerine
`127.0.0.1` kullan — Spotify artık `http://localhost`'a izin vermiyor).

## 7) Canlıya Alma (Firebase Hosting)
```bash
npm install -g firebase-tools   # ilk sefer
firebase login
```
`.firebaserc` dosyasındaki `SENIN-FIREBASE-PROJE-ID` kısmını gerçek proje ID'nle değiştir.
Sonra:
```bash
npm run build
firebase deploy
```
Bu komut siteyi + Firestore kurallarını + Storage kurallarını birlikte yükler.

> ⚠️ Canlıya aldıktan sonra Spotify Dashboard'daki Redirect URI'yi güncellemeyi
> (`https://SENIN-SITEN.web.app/callback`) ve `.env` içindeki `VITE_SPOTIFY_REDIRECT_URI`'yi
> canlı adresle değiştirmeyi unutma, sonra tekrar `npm run build && firebase deploy`.

---

## Nasıl Çalışıyor? (kısa mimari)
| Katman | Teknoloji | Görev |
|--------|-----------|-------|
| Arayüz | React + Vite + Tailwind | 3D globe, kartlar, paneller |
| Globe | `cobe` | WebGL dünya + marker/arc |
| Giriş | Spotify OAuth **PKCE** | Client Secret'sız güvenli giriş |
| Kimlik | Firebase **Anonymous Auth** | Güvenlik kuralları için `uid` |
| Gerçek zamanlı | Firestore `onSnapshot` | Herkesin "şu an çalan"ını canlı yayınlar |
| Konum | Tarayıcı Geolocation + IP fallback | Enlem/boylam + şehir/ülke |

Her kullanıcının kaydı `users/{uid}` altında tutulur; 20 saniyede bir "şu an çalan"
şarkı güncellenir. 5 dakikadan uzun süredir aktif olmayanlar haritadan düşer.

## Gizlilik
- **Kapalı** seçilirse konum Firestore'a **hiç yazılmaz**.
- **Sadece Arkadaşlar** seçilirse yalnızca seni arkadaş ekleyenler haritada görebilir.
- Kurallar (`firestore.rules`) kullanıcıların **yalnızca kendi** kayıtlarını yazmasına izin verir.
