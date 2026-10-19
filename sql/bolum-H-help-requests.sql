-- ============ BOLUM H: SIFRE SIRLAMA YARDIM TALEPLERI (help_requests) ============
-- Panele girisi unutan ogretmen/yoneticinin "giris ekranindan" biraktigi talep.
create table if not exists public.help_requests(
  id uuid primary key default gen_random_uuid(),
  email text not null,
  note text,
  status text not null default 'open',   -- open | resolved
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id)
);
alter table public.help_requests enable row level security;

-- Herkes (oturumsuz dahil) yeni talep acabilir; goruntuleme/silme yalniz admin.
drop policy if exists hr_insert on public.help_requests;
create policy hr_insert on public.help_requests for insert to anon, authenticated with check (true);
drop policy if exists hr_select_admin on public.help_requests;
create policy hr_select_admin on public.help_requests for select to authenticated using (public.is_admin());
drop policy if exists hr_update_admin on public.help_requests;
create policy hr_update_admin on public.help_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Guvenli RPC: e-posta kullanicilarin varligini sizdirmadan talebi kaydeder +
-- varsa ilgili profile'e must_change_password bayragi koyar (admin listesinde one cikar).
create or replace function public.request_password_reset(p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_email is null or position('@' in p_email) = 0 then return; end if;
  insert into help_requests(email) values (lower(trim(p_email)));
  select id into v_id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_id is not null then
    update profiles set must_change_password = true where id = v_id;
  end if;
end $$;
revoke all on function public.request_password_reset(text) from public;
grant execute on function public.request_password_reset(text) to anon, authenticated;

-- Panel yardimcilari icin cozme fonksiyonu (audit'e de yazilir)
create or replace function public.resolve_help_request(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'yetki yok'; end if;
  update help_requests set status='resolved', resolved_at=now(), resolved_by=auth.uid() where id=p_id;
  insert into audit_log(action,table_name,row_id,detail)
    values ('FUNC:resolve_help','help_requests',p_id,jsonb_build_object('by',auth.uid()));
end $$;
revoke all on function public.resolve_help_request(uuid) from public;
grant execute on function public.resolve_help_request(uuid) to authenticated;
