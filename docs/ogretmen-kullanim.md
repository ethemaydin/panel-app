# Öğretmen Kullanım Kılavuzu — English Base

## 1) Giriş ve Şifre
- İlk girişte size verilen şifreyle girin; uygulama **şifre değiştirmenizi zorunlu tutar**.
- Şifrenizi unuttuysanız: panel üzerinden yöneticiniz sıfırlama başlatabilir (SMTP kuruluysa e-posta gelir).

## 2) Ekranlar
| Sekme | Ne yaparsınız? |
|-------|----------------|
| 🏠 Ana | Sınıf seçimi, öğrenci kartları, yoklama başlatma |
| 📚 Konular | Kendi eklediğiniz konular + seviyeye göre otomatik gelen konular |
| ✍️ Ödevler | Yazılı/test ödevleri oluşturma, atama, teslim görme |
| 👥 Öğrenciler | Arama, detay (bilinen kelime, konu geçmişi, notlar), yetkilendirme |

## 3) Konu Oluşturma / Düzenleme
1. Konular sekmesi → **+ Yeni Konu** (veya mevcut konuda ✏️).
2. Alanlar: ad, ikon, seviye (A1–C1), açıklama, anlatım (exp), örnek cümleler (EN/TR çifti).
3. Alt konu (subtopic) ve soru ekleyebilirsiniz: çoktan seçmeli, boşluk doldurma, eşleştirme, yazılı.
4. **Erişim:** Konu editöründeki "Görünürlük" bölümünden sınıf veya tekil öğrenci seçin.
   - Seçim yapmazsanız konu yalnızca **seviyesine uygun tüm öğrencilere** açık kalır.
5. Kaydedince değişiklik ~60 saniye içinde öğrenci cihazlarına yansır (Realtime açıksa anında).

## 4) Kelime Havuzu
- Konu içinden kelime eklerseniz hem havuza hem konuya düşer.
- Kelime alanları: EN, TR, örnek cümle, görsel (opsiyonel).
- Öğrenciler "Flashcards" ekranında bu havuzdan hedef sayıda kelime görür; seviyenizde kelime yoksa uyarı verilir.

## 5) Ödev Verme
1. Ödevler → **+ Ödev**: başlık, hedef konu/alt konu, tür (**Yazılı / Test**), geçerli sınıf/öğrenciler.
2. Test ödevinde soruları panelden veya editörden ekleyin; **geçme notu** varsayılan %60.
3. Atadığınız öğrenci listesi net olsun: atanmamış ödevler herkese görünür.
4. Teslimler geldiğinde puanlayın; yorumunuz öğrenciye bildirim olarak gider.

## 6) Yoklama
- Ana ekran → sınıf seç → **Ders Başlat**: seans açılır, öğrencileri tek tek işaretleyin.
- Seansı bitirince veriler paneldeki devam raporuna işlenir. (Seans silmek index kaymasına yol açabilir; arşivlemeyi tercih edin.)

## 7) Bildirim / Mesaj Gönderme
- Panelden zamanlanmış mesaj gönderilebilir (ör. "Yarın 5. ünite testi var").
- Uygulama içi duyurular da aynı listede görünür; okundu bilgisi panele döner.

## 8) Sık Sorulanlar
**Öğrenci eklediğim konuyu görmüyor?**
→ Erişim listesinde mi? Seviyesi uyuyor mu? Öğrenci uygulamayı tamamen kapatıp açsın; hâlâ yoksa öğretmenden "senkronu yenile" iste (giriş ekranı verileri günceller).

**Test skoru yanlış mı görünüyor?**
→ Geçme notu %60 altındaysa konu tamamlanmış sayılmaz; tekrar denenebilir. Skor, doğru sayısı/toplam şeklinde hesaplanır.

**Verilerim diğer cihazdaki öğrenciye ulaşmıyor?**
→ Aynı Supabase projesine bağlı olduğunuzdan emin olun (ortam değişkenleri); sürüm farkı olabilir — her iki tarafı da güncelleyin.
