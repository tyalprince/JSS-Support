-- Keyword blocker for inbound email tickets.
--
-- Management lists keywords in Support > Settings. An inbound email whose
-- subject (match_field = 'subject') or sender address (match_field = 'sender')
-- contains a keyword, case-insensitively, is dropped by /api/inbound/email
-- instead of becoming a ticket. Used for marketing / automated mail such as
-- MAC.BID alerts and DMARC reports.

create table if not exists public.support_blocked_keywords (
  id uuid primary key default gen_random_uuid(),
  keyword text not null check (length(trim(keyword)) > 0),
  match_field text not null default 'subject' check (match_field in ('subject', 'sender')),
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists support_blocked_keywords_unique
  on public.support_blocked_keywords (lower(trim(keyword)), match_field);

alter table public.support_blocked_keywords enable row level security;

create policy support_blocked_keywords_staff_select on public.support_blocked_keywords
  for select to authenticated
  using (exists (select 1 from staff s where s.auth_user_id = auth.uid()));

create policy support_blocked_keywords_management_all on public.support_blocked_keywords
  for all to authenticated
  using (exists (select 1 from staff s where s.auth_user_id = auth.uid() and s.is_management))
  with check (exists (select 1 from staff s where s.auth_user_id = auth.uid() and s.is_management));

insert into public.support_blocked_keywords (keyword, match_field) values
  ('mac.bid', 'sender'),
  ('macdiscount.com', 'sender'),
  ('Report Domain:', 'subject')
on conflict do nothing;
