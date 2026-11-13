-- ============================================================
-- 恋爱小站 · Supabase 数据库初始化脚本
-- 用法：Supabase 控制台 → SQL Editor → New query → 粘贴本文件全部内容 → Run
-- ============================================================

-- 1. 站点设置（单行，id 恒为 1）
create table if not exists public.site_settings (
  id int primary key default 1 check (id = 1),
  nick1 text default '我',
  nick2 text default '你',
  start_date text default '2026-11-08T20:00:00',
  match_percent int default 99,
  updated_at timestamptz default now()
);

-- 2. 相遇日记（只保存用户新增的见面）
create table if not exists public.meetings (
  id bigint generated always as identity primary key,
  date text,
  title text,
  text text,
  photos jsonb default '[]',
  created_at timestamptz default now()
);

-- 3. 送你的花
create table if not exists public.bouquets (
  id bigint generated always as identity primary key,
  date text,
  note text,
  photo text,
  created_at timestamptz default now()
);

-- 4. 有趣的瞬间（照片 + 备注）
create table if not exists public.gallery (
  id bigint generated always as identity primary key,
  src text,
  caption text,
  created_at timestamptz default now()
);

-- 5. 心情动态
create table if not exists public.moments (
  id bigint generated always as identity primary key,
  mood text,
  face text,
  text text,
  photo text,
  who int,
  time text,
  created_at timestamptz default now()
);

-- 启用行级安全（个人恋爱小站，数据不敏感，开放匿名读写）
alter table public.site_settings enable row level security;
alter table public.meetings enable row level security;
alter table public.bouquets enable row level security;
alter table public.gallery enable row level security;
alter table public.moments enable row level security;

create policy "anon_all" on public.site_settings for all using (true) with check (true);
create policy "anon_all" on public.meetings for all using (true) with check (true);
create policy "anon_all" on public.bouquets for all using (true) with check (true);
create policy "anon_all" on public.gallery for all using (true) with check (true);
create policy "anon_all" on public.moments for all using (true) with check (true);

-- 授权匿名角色
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.site_settings to anon, authenticated;
grant select, insert, update, delete on public.meetings to anon, authenticated;
grant select, insert, update, delete on public.bouquets to anon, authenticated;
grant select, insert, update, delete on public.gallery to anon, authenticated;
grant select, insert, update, delete on public.moments to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
