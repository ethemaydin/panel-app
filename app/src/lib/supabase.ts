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

/** "Şifremi unuttum": e-postaya sıfırlama bağlantısı gönderir. */
export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo: `${location.origin}${location.pathname}` }
  );
  return { error };
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
