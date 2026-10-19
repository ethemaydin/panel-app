# English Base — Kurulum ve Dağıtım Rehberi

Bu rehber, **kod ve SQL dışında** kalan tüm altyapı adımlarını sırasıyla anlatır.
Yeni bir kurulumda baştan sona uygulayın.

---

## 0) Ön hazırlık

- [x] GitHub repo (`english-base`) oluşturuldu.
- [x] Supabase projesi hazır: **`gnagqrqhzlqixafihiqo`** — URL ve anon key `app/.env` + panele girildi.
- [ ] Netlify veya Vercel hesabı (panel + web yayınları için).
- [ ] Alan adı (opsiyonel ama mağaza/Push notification için şiddetle önerilir).
- [ ] Google Cloud Console hesabı (FCM / Firebase — Android bildirimleri için).

---

## 1) Supabase Proje Yapılandırması

### 1.1 Anahtarlar — ✅ BU PROJE İÇİN ZATEN YAPILANDIRILDI
Supabase projesi: **`gnagqrqhzlqixafihiqo`** (`https://gnagqrqhzlqixafihiqo.supabase.co`)

- `app/.env` dosyasına Project URL + **anon public key** girildi ve repoya commit'lendi
  (anon key kamuoyuna açık bir anahtardır; tüm koruma RLS policy'lerindedir).
- Panel (`panel/index.html`) aynı URL+key'i kullanıyor — uygulama ve panel **aynı projeye** bağlı.
- ⚠️ `service_role` key hâlâ hiçbir yerde yok; yalnızca Edge Function secret'ı olarak aşağıdaki
  bölüm 2'de tanımlanacak. Bu anahtarı asla repoya/istemciye koymayın.

Netlify/Vercel'e yayınlarken ayrıca Site settings → Environment variables'a aynı iki değeri
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) girmenize gerek **yoktur** — `.env` depoda olduğu
için build otomatik alır. (İsterseniz platform env'leri her zaman önceliklidir.)

### 1.2 SQL Şemaları (SIRALI ÇALIŞTIRMA!)
Dashboard → **SQL Editor**, aşağıdaki sırayla çalıştırın:

> 💡 **Mevcut Supabase projen varsa ve sıfırdan kuracaksın:** aşağıdaki 3 dosyayı ayrı ayrı
> uğraşmak yerine **tek dosyayı** çalıştır: `sql/MEVCUT-SUPABASE-ICIN.sql`
> (A+B+C+D+E+F+G+H bölümleri = temel tablolar + panel + uygulama düzeltmeleri + realtime + indeksler + şifre sıfırlama yardım talepleri; idempotenttir).

> ✅ **Bu proje durumu:** `MEVCUT-SUPABASE-ICIN.sql` A–G bölümleriyle **çalıştırıldı ve doğrulandı**
> (canlı REST kontrolü: topics/words/homework/topic_access/notifications/app_settings hepsi erişilebilir).
> Sonradan eklenen **BÖLÜM H** (`help_requests` tablosu — "Şifremi unuttum" yardım akışı) henüz veritabanında
> YOK. Dashboard → SQL Editor'de sadece **`sql/bolum-H-help-requests.sql`** dosyasını çalıştırman yeterli.

| Sıra | Dosya | Amaç |
|------|-------|------|
| 1 | `supabase-kurulum.sql` | Temel tablolar, RLS policy'ler, trigger'lar |
| 2 | `panel/1-supabase-panel-guncelleme.sql` | Panel özellikleri (ayarlar, mesajlaşma, denetim logu) |
| 3 | `sql/uygulama-duzeltme.sql` | Uygulamanın okuduğu eksik kolonlar + `has_perm` sertleştirme + index'ler |

> ⚠️ `sql/uygulama-duzeltme.sql` içindeki `cron.schedule` satırı **yalnızca pg_cron eklentisi açıksa** çalışır
> (Dashboard → Database → Extensions → `pg_cron` ENABLE). Kapalıysa o satırı atlayın, bölüm 4'e bakın.

### 1.3 Auth Ayarları
Dashboard → **Authentication → Providers → Email**:
- "Confirm email" → **KAPALI** (kurum içi öğretmen-öğrenci sistemi; doğrulama akışı yok).
- "Secure password change" → AÇIK.
- Site URL → panelin yayınlanacağı adres (bkz. bölüm 5).
- Redirect URLs → panel + uygulama domainlerini ekleyin (`https://*.netlify.app`).

SMTP (şifre sıfırlama mail'i için): Authentication → SMTP Settings → kendi SMTP bilgileriniz
(Domain.com, Resend, Mailgun vb.). Boş bırakılırsa `resetPasswordForEmail` sessizce başarısız olur.

### 1.4 Storage Bucket
Dashboard → **Storage → New bucket**:
- Ad: `content`
- Public bucket: ✅ (konu/ödev görselleri herkesçe okunabilir; yazma RLS ile kısıtlı)

Panel ve uygulama görselleri `content/topics`, `content/homeworks`, `content/words` altında tutulur.

### 1.5 Realtime
Database → **Public → Replication** tablolara realtime ekle: `topics`, `subtopics`, `questions`,
`homework`, `homework_targets`, `topic_access`, `notifications`.
(Replication ayarlı değilse de uygulama 60 sn polling fallback'ı ile çalışır.)

---

## 2) Edge Function: `admin-users`

Panel, toplu öğrenci/öğretmen hesabı açmak için bu fonksiyona ihtiyaç duyar
(service_role anahtarı sunucuda kalır).

```bash
npm i -g supabase
supabase login
supabase link --project-ref gnagqrqhzlqixafihiqo
supabase functions deploy admin-users        # panel/2-edge-function-admin-users.ts kaynak alınır
supabase secrets set SERVICE_ROLE_KEY=<Dashboard→Settings→API→service_role> --project-ref gnagqrqhzlqixafihiqo
```

> Fonksiyon dosyası `functions/admin-users/index.ts` adıyla Supabase klasörüne yerleştirilmelidir
> (repo'daki `panel/2-edge-function-admin-users.ts` referans kaynaktır; deploy öncesi birebir kopyala).

Deploy sonrası test:
```bash
curl -X POST https://gnagqrqhzlqixafihiqo.functions.supabase.co/admin-users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduYWdxcnFoemxxaXhhZmloaXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyNTM5OTAsImV4cCI6MjEwNzgyOTk5MH0.VrmUQ_S6Pj9YdgKwPFwOf0cdsXSQP6ZQT4v-uxTsNnI" -d '{"action":"ping"}'
```

---

## 3) İlk Hesaplar ve Demo Veri

1. Supabase → Authentication → Add user → **admin e-postası** oluştur (şifre güçlü tut).
2. `profiles` tablosunda bu kullanıcı için `role='admin', active=true` satırını doğrula/ekle.
3. Panelde giriş yap → sınıf, derslik seviyeleri ve ilk öğretmeni tanımla.
4. Öğretmen hesabını panelden aç (`admin-users` fonksiyonu gereklidir).
5. Uçtan uca smoke testi:
   - Öğretmen: konu + kelime + test türü ödev ekle →
   - Öğrenci: giriş → konuyu gör → testi çöz → ilerleme kaydedildi mi? →
   - Panel: öğrenci detayında geçiş/deneme/teslim istatistikleri görünüyor mu?

---

## 4) Planlı Bildirimler (pg_cron alternatifi)

`deliver_due_messages()` SQL'de tanımlı. Çalıştırma seçeneklerinden biri:

**A) pg_cron (önerilen):**
```sql
select cron.schedule('deliver-messages','* * * * *','select public.deliver_due_messages()');
```

**B) GitHub Actions:** `docs/supabase-setup.md`'deki workflow örneklerine benzer saatlik bir
workflow ile `psql -c "select deliver_due_messages()"`.

**C) Supabase Scheduled Function (deney planı):** Edge Function + cron header.

---

## 5) Panel Hosting (Netlify veya Vercel)

**Netlify:** Repo kökündeki `netlify.toml` hazır (`publish = "panel"`).
```bash
npm i -g netlify-cli
netlify login
netlify link          # yeni site yarat
netlify deploy --prod # panel/index.html yayına girer
```
Vercel alternatifi: `vercel --cmd ""` yerine statik dizin olarak `panel` seçilir.

Yayın sonrası:
- Supabase Auth → Site URL ve Redirect URL'lere panel domainini eklemeyi unutma.
- `app/src/lib/supabaseSync.ts` içindeki `PANEL_URL` sabitini gerçek domain ile değiştir.

---

## 6) Mobil Uygulama Paketleme (Capacitor / Android)

Uygulama şu an web tabanlı simülasyon. Gerçek APK/AAB için:

```bash
cd app
cp .env.example .env            # gerçek değerlerle doldur
npm run build                   # dist/ üretir
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap init                    # capacitor.config.json zaten repoda mevcut
npx cap add android
npx cap sync
npx cap open android            # Android Studio: ikon/splash + build
```

Önemli noktalar:
- `capacitor.config.json` içindeki `server.url` **kalıcı public adresinizi** göstermeli
  (AI Studio preview URL'si DEĞİL). Bu adres kapalıyken offline-only strateji kararı verin.
- İkonlar: `android/app/src/main/res/mipmap-*` (Adaptive icon, 512x512 foreground/background).
- Splash: `@capacitor/splash-screen` yapılandırması config'de mevcut.
- Release imzası: `keytool -genkeypair -v -keystore english-base.keystore ...`
  (keystore dosyası `.gitignore`'da — commit etmeyin!). Build → Generate Signed Bundle (AAB).
- Play Store hedef API seviyesini Supabase SDK gereksinimleriyle kontrol edin.

iOS (gerektiğinde): `npx cap add ios` + Apple Developer hesabı ($99/yıl) + Xcode gerekli.

---

## 7) Hata İzleme (Sentry) ve Gözlemlenebilirlik

1. sentry.io → Create Project (JavaScript React) → DSN al.
2. `app/.env` içine `VITE_SENTRY_DSN=...` ekle (`main.tsx` yalnızca doluysa başlatır — kod hazır).
3. Supabase Log Drains (pro plan): auth + database loglarını Sentry/Datadog'a akıt.
4. Free plandaysanız: GitHub Actions yedekleri (bkz. 8) + panel `audit_log` tablosu yeterli.

---

## 8) Yedekleme

- **Birincil:** Supabase PITR veya Dashboard → Database → Backups (Daily otomatik).
- **İkincil (repo'da hazır):** `.github/workflows/backup.yml` — günlük `pg_dump` artifact'i.
  Aktifleştirmek için repo Settings → Secrets ile `SUPABASE_DB_HOST/NAME/USER/PASS` tanımla.
- **Audit log saklama:** `audit_log` tablosu büyür; aylık temizlik:
  ```sql
  delete from audit_log where created_at < now() - interval '180 days';
  ```
  (Bunu da pg_cron'a ekleyebilirsin.)

---

## 9) Mağaza Süreçleri (Google Play)

- [ ] Play Console hesabı ($25 tek seferlik), geliştirici adı, uygulama adı "English Base".
- [ ] **Gizlilik politikası URL'si** zorunlu → `docs/gizlilik-aydinlatma.md` içeriğini kendi
      alan adınıza yayınlayın (KVKK/GDPR metni taslağı repoda mevcut; avukat onayı önerilir).
- [ ] Data Safety formu: toplanan veriler (e-posta, ad, sınıf, ilerleme) + "kullanılmıyor/satılmıyor" beyanı.
- [ ] Çocuk/öğrenci verisi: hedef kitle beyanı, veli onayı gerektiren yaş aralıkları için
      Family Policies kontrolü — okul bazlı dağıtımda "Managed Google Play" daha uygun olabilir.
- [ ] Uygulama içi ekran görüntüleri (8-10 adet), ikon (512px), feature graphic (1024x500).
- [ ] İçerik derecelendirme anketi (uygulamada şiddet/içerik yok → PEGI 3 / Everyone).
- [ ] Kapalı test grubu → 12+ tester ile 14 gün → üretim yayını.

App Store (iOS) ayrıca: Apple Developer $99/yıl, App Privacy Labels, inceleme süreci ~1-3 gün.

---

## 10) Test Altyapısı

- **CI:** `.github/workflows/ci.yml` hazır — her push'ta `tsc --noEmit` + `vitest run` + `vite build`.
  GitHub → Actions sekmesinden ilk çalıştırmayı doğrula.
- **Manuel E2E senaryo script'i** (her sürüm öncesi):
  1. Öğretmen girişi → yeni konu + 5 kelime + 3 soruluk test ödevi → erişim verilen öğrenciyi seç.
  2. Öğrenci cihazında oturumu kapat/aç (veya bekle: realtime/polling yenilemesi ≤60sn).
  3. Konu listesinde görünüyor mu → kelimeleri öğren → testi çöz (%60 üstü → konu tamamlandı mı?).
  4. Ödev teslimi → öğretmenin "ödevlerim" ekranında düştü mü → panel istatistiklerinde görünüyor mu?
  5. Panelden zamanlanmış bildirim gönder → belirtilen dakikada öğrenciye ulaştı mı?
- **Cihaz matrisi:** Android 8/11/13/14 + Chrome WebView güncellemesi; iOS 16/17 (web sürümü Safari).
- **Yük testi (okul geneli için):** 500 eşzamanlı öğrenci girişi — Supabase free plan limitlerini kontrol edin.

---

## 11) Dokümantasyon & Eğitim

- `docs/kurulum.md` (bu dosya) — teknik kurulum.
- `docs/gizlilik-aydinlatma.md` — KVKK metni taslağı.
- Öğretmen kullanım kılavuzu (PDF/video): konu ekleme, kelime havuzu, ödev atama, yetkilendirme.
- Öğrenci hızlı başlangıç kartı: giriş, ilk konu, test çözme, profil.
- Yetki matrisi tablosu: hangi rol neyi görür/değiştirir (RLS policy özeti).

---

## Kontrol Listesi (özet)

- [ ] Supabase proje + env değişkenleri
- [ ] 3 SQL dosyası SIRAYLA çalıştırıldı
- [ ] Auth: email confirm kapalı, Site URL/Redirect, SMTP
- [ ] `content` storage bucket (public)
- [ ] Realtime replication tablo listesi
- [ ] `admin-users` Edge Function deploy
- [ ] Admin + öğretmen + öğrenci hesapları, demo veri, smoke test
- [ ] pg_cron (veya alternatif) ile mesaj dağıtımı
- [ ] Panel hosting + PANEL_URL güncelleme
- [ ] Capacitor Android projesi + keystore + AAB
- [ ] Sentry DSN
- [ ] Yedekleme (PITR + backup.yml secrets)
- [ ] Play Console: gizlilik URL'si, Data Safety, test grupları
- [ ] CI yeşil, E2E senaryosu geçti
- [ ] Kullanım kılavuzları hazır
