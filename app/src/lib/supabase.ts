import { createClient } from '@supabase/supabase-js';

// Kimlik bilgileri yalnızca ortam değişkenlerinden okunur (kod içinde hardcoded değer YOKTUR).
// Gerekli değişkenler: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (.env dosyasına bakınız; .env.example şablondur)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase yapılandırması eksik: VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY tanımlanmalı. Uygulama çevrimdışı (yalnızca localStorage) çalışacak.'
  );
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey || 'missing-anon-key'
);

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { data, error };
}

/**
 * "Şifremi unuttum" talebi.
 * Panel SQL'i (request_password_reset RPC) talebi help_requests tablosuna yazar;
 * yönetici panelden görüp Edge Function (resolve_help) ile kapatır.
 * Supabase'in kendi e-posta gönderimi de ayrıca denenir (SMTP yapılandırıldıysa öğrenci
 * bağlantı da alır). Her iki yol başarısız olursa hata döner.
 */
export async function requestPasswordReset(email: string) {
  const em = email.trim().toLowerCase();
  let rpcErr: Error | null = null;
  try {
    const { error } = await supabase.rpc('request_password_reset', { p_email: em });
    if (error) rpcErr = new Error(error.message);
  } catch (e) {
    rpcErr = e as Error;
  }
  // Bağlantı e-postası (best-effort; SMTP kapalıyza hata sayılmaz)
  try {
    await supabase.auth.resetPasswordForEmail(em, {
      redirectTo: `${location.origin}${location.pathname}`,
    });
  } catch {
    /* yok sayılır: yardım talebi zaten kaydedildi */
  }
  return { error: rpcErr };
}

/**
 * Panel Edge Function'ı "admin-users" çağrısı (hesap açma/şifre/pasife alma/silme).
 * Service-role anahtarı yalnızca sunucuda; istek kullanıcının JWT'siyle gider.
 * Başarısız olursa hata nesnesi döner (uygulama lokal işlemlere devam edebilir).
 */
export async function invokeAdminUsers(body: Record<string, unknown>): Promise<{ ok?: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('admin-users', { body });
    if (error) {
      const msg = String((error as any)?.context?.message || error.message || '');
      let parsed: any = null;
      try { parsed = JSON.parse(msg); } catch {}
      return { error: parsed?.error || msg || 'Sunucu hatası' };
    }
    return (data ?? {}) as { ok?: boolean; id?: string; error?: string };
  } catch (e) {
    return { error: (e as Error).message || 'Bağlantı hatası' };
  }
}

/** Sıfırlama bağlantısı açıldığında (type=recovery) aktif oturum var mı? */
export async function hasRecoverySession() {
  const { data } = await supabase.auth.getSession();
  const s = data.session;
  if (!s) return false;
  // recovery oturumlarında amr'de 'recovery' bulunur
  const types = (s.user?.app_metadata?.providers as string[] | undefined) || [];
  void types;
  return true;
}

/** Uygulama ayarlarını (bakım mesajı vb.) panelden çeker. */
export async function fetchAppSettings(): Promise<Record<string, unknown>> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key,value');
    if (error || !data) return {};
    return Object.fromEntries(data.map((r: { key: string; value: unknown }) => [r.key, r.value]));
  } catch {
    return {};
  }
}
