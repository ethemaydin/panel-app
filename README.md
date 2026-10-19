# English Base — Öğrenci/Öğretmen Uygulaması + Yönetim Paneli

İki parçalı proje:
- **`app/`** — React + Vite + Supabase tabanlı öğrenci/öğretmen uygulaması (Capacitor ile Android'e paketlenebilir).
- **`panel/`** — Tek dosyalık statik yönetim paneli (Netlify/Vercel ile yayınlanır).

## Hızlı Başlangıç
```bash
cd app
cp .env.example .env      # gerçek Supabase değerlerini yaz
npm ci
npm run dev               # http://localhost:3000
npm test                  # vitest birim testleri
npm run lint              # tsc --noEmit
```

## Dizin Haritası
| Yol | Açıklama |
|-----|----------|
| `app/src` | Uygulama kaynak kodu (`lib/supabase.ts` env'den okur) |
| `app/.env.example` | Ortam değişkeni şablonu (VITE_SUPABASE_*, Sentry, Capacitor) |
| `app/capacitor.config.json` | Android/iOS paketleme yapılandırması |
| `app/netlify.toml` · `netlify.toml` | Web/app ve panel deploy konfigürasyonları |
| `functions/admin-users/` | Supabase Edge Function (hesap yönetimi; service_role burada) |
| `sql/uygulama-duzeltme.sql` | Şema ↔ uygulama uyum düzeltmeleri (3. sırada çalıştır) |
| `sql/audit-retention.sql` | audit_log 180 gün saklama cron'u |
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

## SQL Çalıştırma Sırası
1. `supabase-kurulum.sql` (temel şema + RLS)
2. `panel/1-supabase-panel-guncelleme.sql` (panel özellikleri)
3. `sql/uygulama-duzeltme.sql` (uygulama uyumu + has_perm sertleştirme)
4. `sql/audit-retention.sql` (opsiyonel, pg_cron açıksa)
