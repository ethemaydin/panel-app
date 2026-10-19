// Supabase Edge Function: admin-users
// Panelden hesap açma/şifre/pasife alma/silme işlemlerini yapar.
// Tam yetkili anahtar sadece burada (sunucuda) kullanılır, uygulamaya/panele asla konmaz.
// Kurulum: Supabase > Edge Functions > "Deploy a new function" > "Via Editor"
//   Ad: admin-users  (aynen böyle yaz)  -> bu dosyanın içindekileri yapıştır -> Deploy.
//   ÖNEMLİ: Fonksiyonun ayarlarında "Verify JWT" ("Verify JWT with legacy secret") anahtarını KAPAT.
//   Çünkü giriş yapanın kimliğini bu kod kendisi doğruluyor (auth.getUser). Açık bırakılırsa yeni
//   Supabase projelerinde panelden gelen istek kapıda reddedilip "Failed to send a request" hatası verebilir.
//   SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY otomatik tanımlıdır.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    })
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: u, error: ue } = await admin.auth.getUser(jwt)
    if (ue || !u?.user) return json({ error: 'Giriş gerekli' }, 401)

    const { data: me } = await admin.from('profiles').select('*').eq('id', u.user.id).single()
    if (!me || !me.active || !['admin', 'teacher'].includes(me.role)) return json({ error: 'Yetkisiz' }, 403)
    const isAdmin = me.role === 'admin'
    const can = (p: string) => isAdmin || !!(me.perms && me.perms[p])

    // Öğretmen bu sınıfa erişebilir mi?
    const inScope = async (classId: string | null) => {
      if (isAdmin) return true
      if (!classId) return can('all_classes')
      if (can('all_classes')) return true
      const { data } = await admin.from('teacher_classes').select('class_id')
        .eq('teacher_id', me.id).eq('class_id', classId)
      return !!(data && data.length)
    }

    const b = await req.json()
    const action: string = b.action
    const log = (target: string | null, detail: Record<string, unknown> = {}) =>
      admin.from('audit_log').insert({
        actor: me.id, actor_name: me.full_name, action: 'FUNC:' + action,
        table_name: 'auth.users', row_id: target, detail,
      })

    // Hedef kullanıcıyı getir + yetki kontrolü
    const loadTarget = async (id: string, perm: string) => {
      const { data: t } = await admin.from('profiles').select('*').eq('id', id).single()
      if (!t) throw new Error('Kullanıcı bulunamadı')
      if (t.id === me.id) throw new Error('Kendi hesabında bu işlemi yapamazsın')
      if (t.role === 'student') {
        if (!can(perm) || !(await inScope(t.class_id))) throw new Error('Bu işlem için yetkin yok')
      } else if (!isAdmin) {
        throw new Error('Öğretmen ve yönetici hesaplarını sadece yönetici değiştirebilir')
      }
      return t
    }

    if (action === 'ping') return json({ ok: true, role: me.role })

    if (action === 'create_student') {
      if (!can('students.create')) return json({ error: 'Öğrenci ekleme yetkin yok' }, 403)
      const classId = b.class_id || null
      if (!(await inScope(classId))) return json({ error: 'Bu sınıfa öğrenci ekleme yetkin yok' }, 403)
      if (!b.email || !b.password || String(b.password).length < 6)
        return json({ error: 'E-posta ve en az 6 karakterli şifre gerekli' }, 400)
      const { data, error } = await admin.auth.admin.createUser({
        email: String(b.email).trim().toLowerCase(), password: b.password, email_confirm: true,
        user_metadata: { full_name: b.full_name || '' },
        app_metadata: { role: 'student', class_id: classId, level: b.level || 'A1', must_change_password: true },
      })
      if (error) return json({ error: error.message }, 400)
      await log(data.user!.id, { email: b.email, class_id: classId })
      return json({ ok: true, id: data.user!.id })
    }

    if (action === 'create_teacher') {
      if (!isAdmin) return json({ error: 'Sadece yönetici öğretmen hesabı açabilir' }, 403)
      if (!b.email || !b.password || String(b.password).length < 6)
        return json({ error: 'E-posta ve en az 6 karakterli şifre gerekli' }, 400)
      const role = b.role === 'admin' ? 'admin' : 'teacher'
      const { data, error } = await admin.auth.admin.createUser({
        email: String(b.email).trim().toLowerCase(), password: b.password, email_confirm: true,
        user_metadata: { full_name: b.full_name || '' },
        app_metadata: { role },
      })
      if (error) return json({ error: error.message }, 400)
      const id = data.user!.id
      // profiles satırı henüz yoksa (auth.users tetikleyicisi eksikse) satırı kendimiz açalım;
      // aksi halde aşağıdaki update sessizce 0 satır günceller ve perms/full_name kaybolur.
      const { data: prof } = await admin.from('profiles').select('id').eq('id', id).maybeSingle()
      if (!prof) {
        const { error: insErr } = await admin.from('profiles').insert({
          id, email: String(b.email).trim().toLowerCase(), full_name: b.full_name || '',
          role, perms: b.perms || {}, active: true,
        })
        if (insErr) return json({ error: 'Profil oluşturulamadı: ' + insErr.message }, 400)
      }
      await admin.from('profiles').update({ perms: b.perms || {}, full_name: b.full_name || '' }).eq('id', id)
      const ids: string[] = b.class_ids || []
      if (ids.length) await admin.from('teacher_classes').insert(ids.map((c) => ({ teacher_id: id, class_id: c })))
      await log(id, { email: b.email, role })
      return json({ ok: true, id })
    }

    if (action === 'set_password') {
      const t = await loadTarget(b.user_id, 'students.password')
      if (!b.password || String(b.password).length < 6) return json({ error: 'En az 6 karakterli şifre gerekli' }, 400)
      const { error } = await admin.auth.admin.updateUserById(t.id, { password: b.password })
      if (error) return json({ error: error.message }, 400)
      if (t.role === 'student') await admin.from('profiles').update({ must_change_password: true }).eq('id', t.id)
      await log(t.id)
      return json({ ok: true })
    }

    if (action === 'set_active') {
      const t = await loadTarget(b.user_id, 'students.deactivate')
      const active = !!b.active
      const { error } = await admin.auth.admin.updateUserById(t.id, { ban_duration: active ? 'none' : '876000h' })
      if (error) return json({ error: error.message }, 400)
      await admin.from('profiles').update({ active }).eq('id', t.id)
      await log(t.id, { active })
      return json({ ok: true })
    }

    if (action === 'update_email') {
      const t = await loadTarget(b.user_id, 'students.edit')
      const email = String(b.email || '').trim().toLowerCase()
      if (!email.includes('@')) return json({ error: 'Geçerli e-posta yaz' }, 400)
      const { error } = await admin.auth.admin.updateUserById(t.id, { email, email_confirm: true })
      if (error) return json({ error: error.message }, 400)
      await admin.from('profiles').update({ email }).eq('id', t.id)
      await log(t.id, { email })
      return json({ ok: true })
    }

    if (action === 'delete_user') {
      const t = await loadTarget(b.user_id, 'students.delete')
      const { error } = await admin.auth.admin.deleteUser(t.id)
      if (error) return json({ error: error.message }, 400)
      await log(t.id, { email: t.email, name: t.full_name })
      return json({ ok: true })
    }

    return json({ error: 'Bilinmeyen işlem' }, 400)
  } catch (e) {
    return json({ error: (e as Error).message || String(e) }, 400)
  }
})
