# English Base — Öğrenci/Öğretmen Uygulaması + Yönetim Paneli

İki parçalı proje:
- **`app/`** — React + Vite + Supabase tabanlı öğrenci/öğretmen uygulaması (Capacitor ile Android'e paketlenebilir).
- **`panel/`** — Tek dosyalık statik yönetim paneli (Netlify/Vercel ile yayınlanır).

## Hızlı Başlangıç
```bash
cd app
# .env repoda mevcut (Supabase projesi gnagqrqhzlqixafihiqo'ya bağlı) — kopyalamana gerek yok
npm ci
npm run dev               # http://localhost:3000
npm test                  # vitest birim testleri
npm run lint              # tsc --noEmit
```

## Dizin Haritası
| Yol | Açıklama |
|-----|----------|
| `app/src` | Uygulama kaynak kodu (`lib/supabase.ts` env'den okur) |
| `app/.env` · `.env.example` | Gerçek Supabase değerleri (.env, commit'li) + şablon |
| `app/capacitor.config.json` | Android/iOS paketleme yapılandırması |
| `app/netlify.toml` · `netlify.toml` | Web/app ve panel deploy konfigürasyonları |
| `functions/admin-users/` | Supabase Edge Function (hesap yönetimi; service_role burada) |
| `sql/SIFIRDAN-KURULUM.sql` | **Tek ve tek geçerli SQL kurulum dosyası** (A–I bölümleri, idempotent) |
| `sql/audit-retention.sql` | audit_log 180 gün saklama cron'u (opsiyonel, pg_cron açıksa) |
| `.github/workflows/ci.yml` | Typecheck + test + build CI pipeline'ı |
| `.github/workflows/backup.yml` | Günlük pg_dump yedeği (secrets gerekli) |
| `docs/kurulum.md` | **Kod/SQL dışı tüm kurulum adımlarının ana rehberi** |
| `docs/gizlilik-aydinlatma.md` | KVKK/GDPR aydınlatma + veli onayı taslağı |
| `docs/ogretmen-kullanim.md` · `docs/ogrenci-hizli-baslangic.md` | Kullanım kılavuzları |
| `docs/yetki-matrisi.md` | Rol bazlı erişim matrisi (RLS özet) |

## Kurulum & Yayın
Tüm altyapı adımları (Supabase proje ayarları, SQL sırası, storage bucket, Edge Function
deploy, Netlify, Capacitor/Android, Sentry, yedekleme, Play Store, CI) için:
👉 **[`docs/kurulum.md`](docs/kurulum.md)**

## SQL Çalıştırma
Tek dosya, sıfırdan kurulum: **`sql/SIFIRDAN-KURULUM.sql`** — Supabase Dashboard → SQL Editor'e yapıştır, Run.
(A–I bölümleri: tablolar + panel + yetki fonksiyonları + RLS + indeksler + realtime + ayarlar + şifre sıfırlama yardım talepleri + sonuç doğrulama sorgusu. Idempotenttir, tekrar çalıştırma güvenlidir; yarım kalmış/bozuk tipli eski kurulumların üstüne de güvenle çalışır.)

⚠️ **Başka hiçbir SQL dosyasını çalıştırma.** Eski parçalı dosyalar (`MEVCUT-SUPABASE-ICIN.sql`, `uygulama-duzeltme.sql`, `bolum-H-help-requests.sql`, `supabase-kurulum.sql`) COALESCE/tip hatalarına yol açtığı için depodan kaldırılmıştır; içerikleri SIFIRDAN-KURULUM.sql içinde tek ve doğru sürüm olarak birleştirilmiştir. `panel/1-supabase-panel-guncelleme.sql` yalnızca referanstır (eski projeler için) — yeni kurulumda gerekmez.
