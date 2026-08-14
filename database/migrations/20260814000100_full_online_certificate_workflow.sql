-- Full-online deployment migration. Legacy pickup rows remain available for
-- audit history, but request delivery now ends in secure PDF download.

update public.certificate_requests
set status = 'ready_for_download', updated_at = now()
where status = 'ready_for_pickup';

alter table public.certificate_requests
  drop constraint if exists certificate_requests_status_check;

alter table public.certificate_requests
  add constraint certificate_requests_status_check
  check (status in ('pending', 'accepted', 'rejected', 'ready_for_download', 'done', 'cancelled'));
