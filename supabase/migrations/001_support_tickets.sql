-- support_tickets + ticket_messages, matching what was applied directly to the shared
-- JSS DB project (ovzrhtwccbjkquqifhgc) via Supabase migrations create_support_tickets and
-- pin_support_tickets_trigger_search_path. Kept here for schema history / local dev parity.

create table support_tickets (
  id                    uuid primary key default gen_random_uuid(),
  channel               text not null check (channel in ('prospect','program','camp','franchise','team','hiring','partner')),
  status                text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  priority              text check (priority in ('urgent','high','normal','low')),
  subject               text,
  body                  text not null,

  family_id             uuid references families(id),
  participant_id        uuid references participants(id),
  partner_id            uuid references partners(id),
  program_id            uuid references programs(id),
  submitted_by_staff_id uuid references staff(id),

  assigned_staff_id     uuid references staff(id),
  assigned_role         text,

  source_table          text,
  source_id             uuid,

  sla_hours             int not null default 48,
  due_at                timestamptz,
  resolved_at           timestamptz,
  closed_at             timestamptz,
  reopened_count        int not null default 0,
  reopened_at           timestamptz,

  rating                int check (rating between 1 and 5),
  rating_submitted_at   timestamptz,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on column support_tickets.priority is 'Set by support_tickets_set_defaults() trigger when null; see support_ticket_sla_hours() for the SLA lookup this pairs with.';

create table ticket_messages (
  id           uuid primary key default gen_random_uuid(),
  ticket_id    uuid not null references support_tickets(id) on delete cascade,
  sender_type  text not null check (sender_type in ('family','staff','partner','prospect','system')),
  sender_id    uuid,
  body         text not null,
  channel      text check (channel in ('sms','email','portal')),
  ai_generated boolean not null default false,
  created_at   timestamptz not null default now()
);

create index ticket_messages_ticket_id_idx on ticket_messages(ticket_id);
create index support_tickets_assigned_staff_id_idx on support_tickets(assigned_staff_id);
create index support_tickets_channel_status_idx on support_tickets(channel, status);
create index support_tickets_due_at_idx on support_tickets(due_at);

-- SLA lookup — edit these two numbers to change SLA windows
create or replace function support_ticket_sla_hours(p_channel text)
returns int
language sql
immutable
set search_path = public
as $$
  select case
    when p_channel in ('prospect','program','camp') then 4   -- tier 1 / urgent channels
    else 48                                                   -- tier 2 / standard channels
  end
$$;

-- BEFORE INSERT: priority, sla_hours, due_at
create or replace function support_tickets_set_defaults()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.priority is null then
    if new.channel in ('prospect','program','camp') then
      new.priority := 'urgent';
    else
      new.priority := 'normal';
    end if;
  end if;

  new.sla_hours := support_ticket_sla_hours(new.channel);
  new.due_at := new.created_at + (new.sla_hours || ' hours')::interval;

  return new;
end;
$$;

create trigger support_tickets_before_insert
before insert on support_tickets
for each row execute function support_tickets_set_defaults();

-- BEFORE UPDATE: updated_at, resolved/closed/reopened bookkeeping
create or replace function support_tickets_track_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();

  if new.status = 'resolved' and old.status is distinct from 'resolved' then
    new.resolved_at := now();
  end if;

  if new.status = 'closed' and old.status is distinct from 'closed' then
    new.closed_at := now();
  end if;

  if old.status = 'closed' and new.status in ('open','in_progress') then
    new.reopened_count := old.reopened_count + 1;
    new.reopened_at := now();
    new.closed_at := null;
    new.resolved_at := null;
  end if;

  return new;
end;
$$;

create trigger support_tickets_before_update
before update on support_tickets
for each row execute function support_tickets_track_status();

-- AFTER INSERT on camp_requests: create the matching ticket
-- security definer: camp_requests inserts happen as anon/family roles that have
-- no insert grant on support_tickets, so the bridging insert must bypass RLS.
create or replace function camp_requests_create_support_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into support_tickets (
    channel, subject, body, family_id, participant_id, program_id, source_table, source_id
  ) values (
    'camp', new.request_type, new.note, new.family_id, new.participant_id, new.program_id, 'camp_requests', new.id
  );
  return new;
end;
$$;

create trigger camp_requests_after_insert_support_ticket
after insert on camp_requests
for each row execute function camp_requests_create_support_ticket();

-- RLS
alter table support_tickets enable row level security;
alter table ticket_messages enable row level security;

create policy support_tickets_management_all
on support_tickets
for all
to authenticated
using (
  exists (select 1 from staff s where s.auth_user_id = auth.uid() and s.is_management = true)
)
with check (
  exists (select 1 from staff s where s.auth_user_id = auth.uid() and s.is_management = true)
);

create policy support_tickets_staff_select
on support_tickets
for select
to authenticated
using (
  exists (
    select 1 from staff s
    where s.auth_user_id = auth.uid()
      and (support_tickets.assigned_staff_id = s.id or support_tickets.assigned_staff_id is null)
  )
);

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
      and (s.is_management = true or t.assigned_staff_id = s.id or t.assigned_staff_id is null)
  )
);

create policy ticket_messages_staff_insert
on ticket_messages
for insert
to authenticated
with check (
  exists (select 1 from staff s where s.auth_user_id = auth.uid())
);

create policy ticket_messages_staff_update
on ticket_messages
for update
to authenticated
using (
  exists (select 1 from staff s where s.auth_user_id = auth.uid())
)
with check (
  exists (select 1 from staff s where s.auth_user_id = auth.uid())
);
