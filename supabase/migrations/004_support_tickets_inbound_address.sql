-- Tracks which of help@/questions@/support@/info@jumpstartsportspgh.com a ticket came in
-- on, so outbound replies can go back out from that same address instead of always support@.
-- Matches Supabase migration support_tickets_inbound_address applied directly to the shared
-- JSS DB.

alter table support_tickets add column inbound_address text;
