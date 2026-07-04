"use client";

const CONTACT_EMAIL = "by599296@gmail.com";
const LAST_UPDATED = "4 Temmuz 2026";
const SITE_NAME = "Sonar";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-lg font-bold text-white">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-white/70">{children}</div>
    </section>
  );
}

const BASE = import.meta.env.BASE_URL;

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="relative z-10 mx-auto min-h-full max-w-2xl px-5 py-10">
      <a
        href={BASE}
        className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
      >
        ← Ana sayfaya dön
      </a>
      <div className="glass rounded-2xl p-6 md:p-8">
        <h1 className="text-2xl font-extrabold text-white md:text-3xl">{title}</h1>
        <p className="mt-1 mb-6 text-xs text-white/40">Son güncelleme: {LAST_UPDATED}</p>
        {children}
        <div className="mt-8 border-t border-white/10 pt-4 text-xs text-white/40">
          Sorularınız için:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-spotify hover:underline">
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-4 text-xs text-white/40">
        <a href={`${BASE}privacy`} className="hover:text-white">Gizlilik Politikası</a>
        <span>·</span>
        <a href={`${BASE}terms`} className="hover:text-white">Kullanım Şartları</a>
      </div>
    </div>
  );
}

export function PrivacyPolicy() {
  return (
    <Shell title="Gizlilik Politikası">
      <p className="mb-6 text-sm text-white/70">
        Bu politika, {SITE_NAME} ("biz", "platform") olarak sizden hangi verileri topladığımızı,
        neden topladığımızı ve nasıl koruduğumuzu açıklar. Platformu kullanarak bu politikayı
        kabul etmiş olursunuz.
      </p>

      <Section title="1. Topladığımız Veriler">
        <p>Site profilinizi oluşturduğunuzda şu verileri işleriz:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>Belirlediğiniz kullanıcı adı ve profil fotoğrafı URL'i</li>
          <li>Site içindeki player'da çaldığınız şarkı bilgisi</li>
          <li>Yaklaşık konumunuz (tarayıcı konum izniyle GPS veya IP adresi tabanlı şehir/ülke)</li>
          <li>Seçtiğiniz gizlilik tercihi (global / sadece arkadaşlar / kapalı)</li>
        </ul>
        <p>
          Harici müzik hesabı şifresi veya token istemeyiz, görmeyiz ve saklamayız.
        </p>
      </Section>

      <Section title="2. Verileri Nasıl Kullanıyoruz">
        <p>
          Verileriniz yalnızca hizmetin temel işlevi için kullanılır: dünya haritası üzerinde,
          <b> sizin seçtiğiniz gizlilik ayarına göre</b>, o anda ne dinlediğinizi diğer
          kullanıcılara göstermek. Verilerinizi satmayız, reklam amacıyla üçüncü taraflara
          pazarlamayız.
        </p>
      </Section>

      <Section title="3. Konum ve Gizlilik Kontrolü">
        <p>Konum paylaşımı tamamen sizin kontrolünüzdedir:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li><b>Global:</b> Konumunuz tüm kullanıcılara görünür.</li>
          <li><b>Sadece Arkadaşlar:</b> Yalnızca sizi arkadaş ekleyen kişiler görebilir.</li>
          <li><b>Kapalı:</b> Konumunuz sunucuya <b>hiç kaydedilmez</b>, haritada görünmezsiniz.</li>
        </ul>
        <p>Bu ayarı istediğiniz an "Ayarlar" bölümünden değiştirebilirsiniz.</p>
      </Section>

      <Section title="4. Veri Saklama ve Silme">
        <p>
          Verileriniz Google Firebase (Firestore) üzerinde saklanır. 5 dakikadan uzun süre aktif
          olmadığınızda haritadan otomatik olarak kaldırılırsınız. "Bağlantıyı kes / Çıkış"
          seçeneğine tıkladığınızda kaydınız <b>kalıcı olarak silinir</b>. Tüm verilerinizin
          silinmesini talep etmek için bizimle iletişime geçebilirsiniz.
        </p>
      </Section>

      <Section title="5. Üçüncü Taraf Hizmetler">
        <p>Platform aşağıdaki hizmetleri kullanır ve onların kendi gizlilik politikaları geçerlidir:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li><b>Müzik arama servisi</b> — çalınabilir preview ve kapak görseli</li>
          <li><b>Google Firebase</b> — kimlik doğrulama, veri saklama, barındırma</li>
          <li><b>Konum servisleri</b> — yaklaşık şehir/ülke belirleme (ipapi.co, bigdatacloud.net)</li>
        </ul>
      </Section>

      <Section title="6. Güvenlik">
        <p>
          Verilere erişim Firebase güvenlik kurallarıyla kısıtlanmıştır; her kullanıcı yalnızca
          kendi kaydını değiştirebilir. Yine de internet üzerinden hiçbir aktarımın %100 güvenli
          olmadığını hatırlatırız.
        </p>
      </Section>

      <Section title="7. Çocukların Gizliliği">
        <p>
          Platform 13 yaşından küçük kullanıcılara yönelik değildir.
        </p>
      </Section>

      <Section title="8. Değişiklikler">
        <p>
          Bu politikayı zaman zaman güncelleyebiliriz. Önemli değişikliklerde bu sayfadaki "Son
          güncelleme" tarihini değiştiririz.
        </p>
      </Section>

      <p className="mt-6 text-xs text-white/40">
        {SITE_NAME}, Spotify, Last.fm veya Apple ile bağlantılı, onlara ait veya onlar tarafından
        desteklenen bir hizmet değildir.
      </p>
    </Shell>
  );
}

export function TermsOfService() {
  return (
    <Shell title="Kullanım Şartları">
      <p className="mb-6 text-sm text-white/70">
        {SITE_NAME} platformunu kullanarak aşağıdaki şartları kabul etmiş olursunuz. Kabul
        etmiyorsanız lütfen hizmeti kullanmayın.
      </p>

      <Section title="1. Hizmetin Tanımı">
        <p>
          {SITE_NAME}, kullanıcıların site içinde profil oluşturup player'dan müzik arayarak
          dinleyebildiği; seçtikleri gizlilik ayarına göre o anda dinledikleri müziği ve yaklaşık
          konumlarını bir dünya haritası üzerinde diğer kullanıcılarla paylaşabildiği bir sosyal
          keşif platformudur.
        </p>
      </Section>

      <Section title="2. Hesap ve Uygunluk">
        <ul className="ml-5 list-disc space-y-1">
          <li>Gerçek veya yanıltıcı olmayan bir site profili kullanmalısınız.</li>
          <li>En az 13 yaşında olmalısınız.</li>
          <li>Başkasına ait isim, fotoğraf veya kimliği izinsiz kullanamazsınız.</li>
        </ul>
      </Section>

      <Section title="3. Kabul Edilebilir Kullanım">
        <p>Şunları yapmamayı kabul edersiniz:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>Platformu yasa dışı, zararlı veya taciz edici amaçlarla kullanmak</li>
          <li>Otomatik botlarla veri kazımak (scraping) veya sistemi kötüye kullanmak</li>
          <li>Diğer kullanıcıların gizliliğini ihlal etmek veya verilerini izinsiz toplamak</li>
          <li>Platformun güvenliğini aşmaya veya hizmeti aksatmaya çalışmak</li>
        </ul>
      </Section>

      <Section title="4. İçerik ve Fikri Mülkiyet">
        <p>
          Şarkı, albüm kapağı ve sanatçı bilgileri ilgili müzik veri sağlayıcıları ve hak
          sahiplerinden gelen verilerle yalnızca görüntüleme/dinleme amacıyla gösterilir. Platform
          bu içeriğin sahibi değildir.
        </p>
      </Section>

      <Section title="5. Sorumluluğun Sınırlandırılması">
        <p>
          Hizmet "olduğu gibi" sunulur. Kesintisiz veya hatasız çalışacağına dair garanti vermeyiz.
          Platformun kullanımından doğabilecek doğrudan veya dolaylı zararlardan yasaların izin
          verdiği ölçüde sorumlu değiliz.
        </p>
      </Section>

      <Section title="6. Hesabın Sonlandırılması">
        <p>
          İstediğiniz an "Bağlantıyı kes" ile hesabınızı ve verilerinizi silebilirsiniz. Bu
          şartları ihlal eden kullanıcıların erişimini kısıtlama hakkımız saklıdır.
        </p>
      </Section>

      <Section title="7. Değişiklikler ve Geçerli Hukuk">
        <p>
          Bu şartları güncelleyebiliriz; güncel sürüm bu sayfada yayınlanır. Bu şartlar Türkiye
          Cumhuriyeti yasalarına tabidir.
        </p>
      </Section>

      <p className="mt-6 text-xs text-white/40">
        {SITE_NAME}, Spotify, Last.fm veya Apple ile bağlantılı değildir. Müzik içerikleri ilgili
        sağlayıcıların kendi şartlarına tabi olabilir.
      </p>
    </Shell>
  );
}
