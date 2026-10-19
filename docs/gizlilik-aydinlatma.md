# KVKK / GDPR Aydınlatma Metni ve Velİ Onayı — Taslak

> ⚠️ **Bu metin hukuki danışmanlık değildir.** Yayına almadan önce bir avukatla
> (tercihen eğitim verisi + KVKK deneyimli) gözden geçirin. Köşeli parantezli
> alanları kurum bilgileriyle doldurun.

---

## 1) Veri Sorumlusu

[OKUL/KURUM UNVANI], [ADRES], [E-POSTA / DPO İLETİŞİM] ("Kurum") olarak,
"English Base" eğitim uygulaması kapsamında kişisel verilerinizi 6698 sayılı KVKK
ve yürürlükteyse AB öğrencileri için GDPR Madde 13/14 çerçevesinde işleriz.

## 2) Hangi Verileri İşliyoruz?

| Kategori | Örnek Alanlar | Amaç |
|----------|---------------|------|
| Kimlik | Ad, soyad, e-posta, öğrenci no | Hesap açma, sınıf eşleştirme |
| Eğitim ilerlemesi | Bilinen kelimeler, konu/test sonuçları, ödev teslimleri, yoklama | Öğrenme takibi, raporlama |
| İçerik | Ödev/yazma cevap metinleri, yüklenen görseller | Ödev değerlendirme |
| Teknik | Oturum token'ları, hata logları | Güvenlik, sorun giderme |

**Özel nitelikli veri (KVKK m.6) veya sağlık/davranış notu işlenmez.**
Zorunlu alan dışı bilgi toplamıyoruz.

## 3) İşleme Amaçları ve Hukuki Sebepler

- Sözleşmesel eğitim hizmeti: KVKK m.5/2-c (sözleşmenin kurulması/ifası).
- Açık rıza (fotoğraf/içerik paylaşımı gibi opsiyonel haller): KVKK m.5/1.
- Yasal yükümlülük (MEB kayıt/rapor gereklilikleri): KVKK m.5/2-ç.
- Meşru menfaat (güvenlik, aydınlatma): KVKK m.5/2-f.

## 4) Aktarım

Veriler; Türkiye'de barındırılan Supabase (AB-Frankfurt bölgesi) altyapısında saklanır.
Yurt dışı aktarım KVKK m.9 ve varsa SCC (standart sözleşme) hükümleriyle yapılır.
Üçüncü taraf reklam/analytics aracı **kullanılmaz**; hata izleme (Sentry) yalnızca
teknik log taşır ve kimlik bilgisi maskeleme yapılandırması zorunludur.

## 5) Saklama Süreleri

- Hesap + ilerleme: eğitim ilişkisi boyunca; mezuniyet/ayrılıktan sonra **[1 yıl]** içinde silinir/anonimleştirilir.
- Denetim kayıtları (audit_log): **180 gün**, sonra otomatik silme (cron).
- Yedekler: günlük pg_dump, **90 gün** tutulur, sonra imha edilir.

## 6) İlgili Kişi Hakları (KVKK m.11)

Erişim, düzeltme, silme, işlemeye itiraz, aktarıldığı üçüncü tarafları öğrenme, zarara uğramanız halinde tazmin haklarınızı
**[KVKK BAŞVURU E-POSTASI]** adresine yazılı olarak kullanabilirsiniz. Yanıt süresi: 30 gün.

## 7) Çocukların Verisi ve Veli Onayı

Uygulama hedef kitlesi **[yaş aralığı, ör. 10–18]** öğrencilerdir.
- 13 yaş altı (ve kurum kararına göre lise öncesi) kullanıcılar için velinin açık onayı zorunludur.
- Aşağıdaki onay formu kağıt/dijital imza ile alınmadan hesap etkinleştirilmemelidir.

---

### VELİ ONAY FORMU (taslak)

> Çocuğum **[Ad Soyad]**'ın English Base eğitim uygulamasını kullanabilmesi için;
> kimlik ve eğitim ilerlemesi bilgilerinin Bölüm 2'deki amaçlarla işlenmesine,
> okul içi öğretmenleriyle paylaşılmasına ve Bölüm 4'te belirtilen bulut altyapısında
> saklanmasına **[ ] ONAY VERİYORUM / [ ] REDDEDİYORUM**.
>
> Aydınlatma metnini okudum; dilediğim zaman geri çekme hakkımı biliyorum.
>
> Veli adı-soyadı: ...............  İmza: .........  Tarih: .../.../......

---

## 8) Google Play Data Safety Formuna Notlar

Play Console → Data safety beyanında aşağıdaki eşleme kullanılır:

| Play kategorisi | Bizdeki karşılığı | Toplanıyor mu? | Paylaşılıyor mu? |
|-----------------|-------------------|----------------|------------------|
| Email address | Hesap kimliği | ✅ (uygulama içi) | ❌ |
| Name | Ad-soyad | ✅ | ❌ |
| Student/educator progress | Diğer oyun/öğrenme verileri | ✅ | Sadece öğretmeniyle (kişi içi) |
| Crash logs | Diagnostic data | Sentry varsa ✅ | ❌ |
| Photos/Videos (ödev görseli) | Kullanıcı içeriği | Opsiyonel ✅ | ❌ |

Encryption in transit (TLS) ✅, at rest (Postgres şifreleme) ✅.
"Hesap silme" akışı uygulama/panel üzerinden sağlanmalıdır (Store politikası zorunluluğu).

## 9) Uygulama İçi Bağlantılar

- Gizlilik politikası URL'si: `https://[alanadi]/privacy.html` (bu metnin yayınlanmış hali)
- Destek/KVKK başvuru: `https://[alanadi]/kvkk-basvuru.html`
- Bu URL'ler Play Console "Privacy policy" ve uygulama Profil > Hakkında ekranına eklenir.
