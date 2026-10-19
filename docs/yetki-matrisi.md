# Yetki Matrisi — English Base (RLS + Uygulama Katmanı Özeti)

Roller: **admin** (panel sahibi), **teacher** (öğretmen), **student** (öğrenci).
Sunucu tarafı zorunlu kontrol Supabase RLS policy'leridir; uygulama arayüzü yalnızca
kolaylık sağlar. `perms` JSONB alanındaki anahtarlar öğretmen yetkisini ince ayarlar
(`has_perm()` fonksiyonu ile okunur; admin tüm yetkilere sahiptir).

## Tablo Erişimleri

| Tablo | Admin | Teacher | Student |
|-------|:-----:|:-------:|:-------:|
| profiles | RW | R (kendi + sınıf öğrencileri*) | R (kendi) |
| classes | RW | R (atandığı) | R (kendi sınıfı) |
| topics | RW | R/W† | R (yalnızca erişim verilen/seviyesine uygun) |
| subtopics | RW | R/W† | R (topic üzerinden) |
| questions | RW | R/W† | R (test sırasında) |
| words | RW | R/W† | R (flashcard havuzu) |
| topic_access | RW | RW (kendi konu öğrencileri) | R (kendi satırları) |
| homework | RW | RW (kendi verdikleri) | R (atanmış olanlar) |
| homework_targets | RW | RW | R |
| homework_submissions | RW | R/W (puanlama) | R/W (kendi teslimleri) |
| topic_pass | RW | R | R/W (kendi) |
| test_attempts | RW | R | R/W (kendi) |
| known_words | RW | R | R/W (kendi) |
| puzzle_state | RW | – | R/W (kendi) |
| notifications | RW | R/W | R + okundu işaretleme (kendi) |
| attendance_sessions/records | RW | RW (kendi seansları) | R (kendi kaydı) |
| audit_log | R | – | – |
| app_settings | RW | R | R (gerekli alanlar) |
| Storage `content` bucket | RW | RW | R |

\* Öğretmenin sınıf erişimi, ilişkisel tablolardan (`classes.teacher_id`, öğrenci-profili eşleşmesi) gelir.
† Topic/subtopic/question/words üzerinde teacher yazar; bu satırların `created_by/owner` kolonları
denetlenir (kurulum SQL'indeki policy'ye bakınız).

## Panel `perms` Anahtarları (JSONB → true/false)

| Anahtar | Ne verir? |
|---------|-----------|
| manage_students | Öğrenci listesi/detay/yoklama yazma |
| manage_homework | Ödev oluşturma/atama/puanlama |
| manage_content | Konu/kelime/soru yönetimi |
| view_reports | İstatistik ve rapor ekranları |
| send_messages | Bildirim/duyuru gönderme |
| manage_teachers | (genelde admin-only) öğretmen hesap yönetimi |

## Uygulama Katmanı Kuralları (arayüz davranışı)

1. **Konu görünürlüğü:** `topic_access` satırı varsa ona göre; yoksa öğrencinin seviyesiyle eşleşen konular otomatik görünür ("fallback"). Öğretmenin "Görünürlük" seçimi hem local `tp` listesine hem `topic_access` tablosuna yazılır.
2. **Ödev görünürlüğü:** `homework.to` boşsa herkese atanmış sayılır; doluysa yalnızca listedeki öğrenciler görür.
3. **Konu tamamlama:** Test puanı ≥ pass notu (varsayılan 60) → `topic_pass` satırı + local `td` güncellenir.
4. **Şifre:** İlk girişte `must_change_password` bayrağı varsaForcePassword ekranı açılır; değişiklik Supabase auth'a da yansıtılır.
5. **Bildirim:** Yalnızca kendine/okuluna/sınıfına gelen mesajlar listelenir; `read_at` işaretlemesi sunucuya yazılır.

## Değişiklik Yönetimi

- Yeni tablo eklerseniz: (a) kurulum/panel SQL'ine RLS ekle, (b) bu matrise satır ekle, (c) CI'daki şema testini güncelle.
- Policy gevşetme (ör. student → write) en az iki kişi tarafından onaylanmalıdır; audit_log'da izlenir.
