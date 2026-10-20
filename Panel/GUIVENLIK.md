# 🔐 Güvenlik Notu — Anahtar Yönetimi

## Yapılan inceleme sonucu
- `panel/index.html` içinde gömülü olan anahtar **anon (public)** anahtardır — JWT payload doğrulandı: `"role":"anon"`.
- **service_role / secret anahtar panele hiçbir zaman konulmadı ve konulamaz.** Panelde böyle bir sızıntı tespit edilmemiştir.

## Alınan önlemler (index.html)
1. Anahtar artık `resolveAnonKey()` ile belirleniyor; öncelik sırası:
   - URL parametresi `?key=<anon_anahtar>` (geçici kullanım),
   - `localStorage.eb_anon_key`,
   - dosyaya gömülü yedek (`ANON_KEY_FALLBACK`).
2. Hangi kaynaktan gelirse gelsin, anahtarın JWT payload'ındaki `role` alanı **mutlaka `anon`** olmak zorunda. `service_role` veya bozuk bir anahtar verilirse panel uyarı verip **durur** (gizli anahtar istemcide asla kullanılamaz).
3. Kod içine "buraya service_role koyma" uyarı yorumu eklendi.

## Edge Function tarafı (doğru mimari)
- Gizli anahtar (`SUPABASE_SERVICE_ROLE_KEY`) yalnızca Supabase sunucusunda, otomatik ortam değişkeni olarak durur (`panel/2-edge-function-admin-users.ts` satır 22). Koda yazılmaz, panele taşınmaz.

## Öneriler
- Projeyi başka birine paylaşırken ya da repoya yeni anon anahtar girerken yine de **Settings → API Keys → "anon public"** anahtarını kullanın; asla "secret key" kopyalamayın.
- Şüphe durumunda Supabase → Settings → API Keys → **Reset** ile anon anahtarı yenileyin; panelde `?key=...` parametresiyle veya `ANON_KEY_FALLBACK` satırını güncelleyerek devam edin.
- Yetki denetimleri RLS + Edge Function'dadır; anon anahtarın sızması tek başına veri erişimine yetmez, yine de gizlilik ilkesi gereği reset alışkanlığı edinin.

## ⚠️ Kritik: GitHub kişisel erişim token'ı (PAT) sızıntısı
- Son konuşmada **GitHub personal access token'ı (başlangıcı: `github_pat_11CRW5…`, tam değer burada kasıtlı olarak yazılmadı) sohbete düz metin olarak yazılmıştır.** Bu token artık herkese açık sayılır ve derhâl iptal edilmelidir:
  1. https://github.com/settings/tokens → ilgili token → **Delete / Revoke**
  2. Gerekirse hesabında oturum verdiği cihazları kontrol et (Settings → Sessions).
- Token'ı bundan böyle sohbetlere/kodlara değil, yalnızca git credential manager veya ortam değişkeni (`GITHUB_TOKEN`) üzerinden kullan.
