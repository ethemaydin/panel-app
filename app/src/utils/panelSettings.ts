import { fetchAppSettings } from '../lib/supabase.ts';

/**
 * Panelden (app_settings tablosu) gelen tasarım/uygulama ayarlarını
 * çalışırken uygulamaya uygular:
 *  - primary_color / background_color / text_color → CSS değişkenleri
 *  - custom_css → <style id="panel-css"> olarak enjekte edilir
 *  - logo_url → window.__EB_LOGO (LoginView/Home LOGO yerine kullanabilir)
 *  - app_name → document.title + window.__EB_APP_NAME
 *  - welcome_text → window.__EB_WELCOME (giriş ekranı mesajı)
 *  - maintenance_message → window.__EB_MAINTENANCE (doluysa App kilitlemeli)
 * Hata durumunda sessiz kalır (çevrimdışı kullanım bozulmaz).
 */
export async function applyPanelSettings(): Promise<Record<string, unknown>> {
  const s = await fetchAppSettings();
  try {
    const root = document.documentElement.style;
    if (typeof s.primary_color === 'string' && s.primary_color) {
      root.setProperty('--pri', s.primary_color);
      // buton metni kontrastı: koyu renk seçildiyse beyaz yaz
      root.setProperty('--onpri', contrastText(s.primary_color));
    }
    if (typeof s.background_color === 'string' && s.background_color)
      root.setProperty('--bg', s.background_color);
    if (typeof s.text_color === 'string' && s.text_color) {
      root.setProperty('--ink', s.text_color);
      root.setProperty('--mute', contrastText(s.text_color) === '#ffffff' ? '#C8A3A8' : '#7A5A60');
    }
    let el = document.getElementById('panel-css') as HTMLStyleElement | null;
    if (typeof s.custom_css === 'string' && s.custom_css.trim()) {
      if (!el) {
        el = document.createElement('style');
        el.id = 'panel-css';
        document.head.appendChild(el);
      }
      el.textContent = s.custom_css;
    } else if (el) {
      el.textContent = '';
    }
    if (typeof s.logo_url === 'string' && s.logo_url) (window as any).__EB_LOGO = s.logo_url;
    if (typeof s.app_name === 'string' && s.app_name) {
      document.title = s.app_name;
      (window as any).__EB_APP_NAME = s.app_name;
    }
    (window as any).__EB_WELCOME = typeof s.welcome_text === 'string' ? s.welcome_text : '';
    (window as any).__EB_MAINTENANCE =
      typeof s.maintenance_message === 'string' ? s.maintenance_message.trim() : '';
    if (s.pass_mark != null) (window as any).__EB_PASSMARK = Number(s.pass_mark) || undefined;
    if (s.word_goal_min != null) (window as any).__EB_GOALMIN = Number(s.word_goal_min) || undefined;
    if (s.word_goal_max != null) (window as any).__EB_GOALMAX = Number(s.word_goal_max) || undefined;
  } catch (err) {
    console.warn('Panel ayarları uygulanamadı:', err);
  }
  return s;
}

/** #hex rengin üzerine okunur yazı rengi (#fff veya #111). */
function contrastText(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#1A0E10' : '#ffffff';
}
