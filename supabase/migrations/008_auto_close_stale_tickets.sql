-- Auto-close support tickets with no activity for 90+ days.
--
-- A ticket is stale when it is still open / in progress and its most recent
-- activity -- created, reopened, or the latest message on it -- is more than
-- 90 days old. Closing only flips status (the before-update trigger stamps
-- closed_at); nothing is emailed or texted to the family. A closed ticket can
-- still be reopened from the ticket page.
--
-- Runs once now, then daily at 07:17 UTC via pg_cron.

create extension if not exists pg_cron;

create or replace function public.support_close_stale_tickets(p_days int default 90)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare v_count int;
begin
  update support_tickets t
     set status = 'closed'
   where t.status in ('open', 'in_progress')
     and greatest(
           t.created_at,
           coalesce(t.reopened_at, t.created_at),
           coalesce((select max(m.created_at) from ticket_messages m where m.ticket_id = t.id), t.created_at)
         ) < now() - make_interval(days => p_days);
  get diagnostics v_count = row_count;
  return v_count;
end
$$;

revoke all on function public.support_close_stale_tickets(int) from public, anon, authenticated;

select cron.schedule('support-close-stale-tickets', '17 7 * * *', $$select public.support_close_stale_tickets(90)$$);

select public.support_close_stale_tickets(90);
