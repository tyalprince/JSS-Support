-- Families can read their own support_tickets and the messages on them (Phase 6 family
-- portal). Writes (replies, ratings) still go through service-role server routes only —
-- no family-facing insert/update policy is added here. Matches Supabase migration
-- support_tickets_family_read_access applied directly to the shared JSS DB project.

create policy support_tickets_family_select
on support_tickets
for select
to authenticated
using (
  family_id in (
    select id from families f
    where f.auth_user_id = auth.uid()
       or f.secondary_auth_user_id = auth.uid()
       or f.primary_email = auth.email()
       or f.secondary_email = auth.email()
  )
);

create policy ticket_messages_family_select
on ticket_messages
for select
to authenticated
using (
  exists (
    select 1
    from support_tickets t
    join families f on f.id = t.family_id
    where t.id = ticket_messages.ticket_id
      and (
        f.auth_user_id = auth.uid()
        or f.secondary_auth_user_id = auth.uid()
        or f.primary_email = auth.email()
        or f.secondary_email = auth.email()
      )
  )
);
