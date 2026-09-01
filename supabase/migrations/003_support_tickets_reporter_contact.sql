-- Lets prospect-channel tickets with no family_id/partner_id (public contact form, inbound
-- email) still carry a reply-to address/phone for the outbound reply flow. Matches Supabase
-- migration support_tickets_reporter_contact applied directly to the shared JSS DB.

alter table support_tickets add column reporter_email text;
alter table support_tickets add column reporter_phone text;
