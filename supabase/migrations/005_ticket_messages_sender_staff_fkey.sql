-- ticket_messages.sender_id was left as a plain nullable uuid (only ever populated for
-- sender_type='staff'), with no FK — PostgREST can't resolve the staff!sender_id embed the
-- ticket detail UI relies on without a real relationship in the schema. Matches Supabase
-- migration ticket_messages_sender_staff_fkey applied directly to the shared JSS DB.

alter table ticket_messages
  add constraint ticket_messages_sender_id_fkey foreign key (sender_id) references staff(id);
