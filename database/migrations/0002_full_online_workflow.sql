-- Promote any records created by the retired pickup workflow into the online
-- delivery lifecycle. Existing records and related audit rows are preserved.
UPDATE certificate_requests
SET status = 'ready_for_download', updated_at = datetime('now')
WHERE status = 'ready_for_pickup';
