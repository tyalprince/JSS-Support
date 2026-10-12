-- Enforce blocked keywords at insert time, so a matching inbound email can never
-- become a ticket regardless of which code path inserts it. Applies only to
-- email-originated tickets (inbound_address set); family/camp/staff tickets are
-- never blocked. Returning NULL from a BEFORE INSERT trigger skips the row.

create or replace function public.support_ticket_is_blocked(p_subject text, p_sender text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from support_blocked_keywords b
    where length(trim(b.keyword)) > 0
      and (
        (b.match_field = 'subject' and strpos(lower(coalesce(p_subject, '')), lower(trim(b.keyword))) > 0)
        or (b.match_field = 'sender' and strpos(lower(coalesce(p_sender, '')), lower(trim(b.keyword))) > 0)
      )
  )
$$;

create or replace function public.support_tickets_block_keywords()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.inbound_address is not null
     and public.support_ticket_is_blocked(new.subject, new.reporter_email) then
    return null;
  end if;
  return new;
end
$$;

create or replace trigger support_tickets_block_keywords
  before insert on public.support_tickets
  for each row execute function public.support_tickets_block_keywords();
