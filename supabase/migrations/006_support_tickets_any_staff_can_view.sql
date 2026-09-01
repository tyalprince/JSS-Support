-- Assignment is accountability for completion, not an access gate — any active staff member
-- should be able to see and respond to any ticket, not just their own assigned/unassigned
-- ones. Management retains exclusive INSERT/UPDATE/DELETE via support_tickets_management_all;
-- this only widens read access to match. Matches Supabase migration
-- support_tickets_any_staff_can_view applied directly to the shared JSS DB.

drop policy support_tickets_staff_select on support_tickets;
create policy support_tickets_staff_select
on support_tickets
for select
to authenticated
using (
  exists (select 1 from staff s where s.auth_user_id = auth.uid())
);

drop policy ticket_messages_staff_select on ticket_messages;
create policy ticket_messages_staff_select
on ticket_messages
for select
to authenticated
using (
  exists (
    select 1
    from support_tickets t
    join staff s on s.auth_user_id = auth.uid()
    where t.id = ticket_messages.ticket_id
  )
);
