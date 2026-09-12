-- Backs the JSS Insight tab: staff paste an inbound email or phone number and get the
-- matching family straight back. Participants/registrations/programs/subsessions are then
-- pulled with normal embedded selects from the client, all still governed by the existing
-- families_select_staff / participants_select_staff / registrations_select_staff RLS policies.
-- Matches Supabase migration search_family_contacts_rpc applied directly to the shared JSS DB
-- project. Kept here for schema history / local dev parity.
--
-- Phone numbers are stored in mixed formats ("724-984-6186", "7249549046", ...), so phone
-- lookups normalize both sides to digits-only before comparing. Email lookups are a plain
-- substring match. SECURITY INVOKER (the default, not set here) means this runs as the
-- calling user, so RLS still applies -- it grants no access beyond what that policy already
-- allows.
create or replace function search_family_contacts(p_query text)
returns setof families
language sql
stable
set search_path = public
as $$
  select f.*
  from families f
  where
    length(trim(coalesce(p_query, ''))) > 0
    and (
      f.primary_email ilike '%' || trim(p_query) || '%'
      or f.secondary_email ilike '%' || trim(p_query) || '%'
      or f.primary_email_2 ilike '%' || trim(p_query) || '%'
      or (
        length(regexp_replace(p_query, '\D', '', 'g')) >= 7
        and (
          regexp_replace(coalesce(f.primary_phone, ''), '\D', '', 'g') like '%' || regexp_replace(p_query, '\D', '', 'g') || '%'
          or regexp_replace(coalesce(f.secondary_phone, ''), '\D', '', 'g') like '%' || regexp_replace(p_query, '\D', '', 'g') || '%'
        )
      )
    )
  order by f.primary_email
  limit 25;
$$;

grant execute on function search_family_contacts(text) to authenticated;
