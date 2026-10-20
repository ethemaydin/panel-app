import type { ReactNode } from 'react';
import type { User, PermKey } from '../types.ts';
import { userCan } from '../types.ts';

/**
 * Panel SQL rol hiyerarşisinin app tarafındaki tek kapı fonksiyonu.
 *   1) admin   → her şeyi yapabilir (her yetki açık).
 *   2) teacher → yalnızca profiles.perms içinde işaretli yetkileri kullanır.
 *   3) student → hiçbir yönetici işlemini yapamaz (öğretmen/admin kontrolünde).
 * Eski localStorage oturumlarında profileRole yoksa 'teacher' varsayılır
 * (geriye dönük uyumluluk; App.tsx açılışta profil güncellemesiyle düzeltir).
 */
export function can(u: User | null, p: PermKey): boolean {
  return userCan(u, p);
}

export function isAdmin(u: User | null): boolean {
  return !!u && u.role === 't' && u.profileRole === 'admin';
}

/** Yetki yoksa children yerine null render eder (UI'de buton/form gizleme). */
export const Gate: React.FC<{ user: User | null; perm: PermKey; children: ReactNode }> = ({
  user,
  perm,
  children,
}) => (can(user, perm) ? <>{children}</> : null);