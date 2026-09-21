-- A note the admin writes for the parent about ONE document that needs correcting
-- (what is wrong with it), shown on the parent's Requirements page and included in the
-- correction email and notification. Null when the document is not awaiting correction.
--
-- Parents cannot change it: the application_documents lock trigger already rejects any
-- non-admin update that touches a column other than file_url and verification_status.

alter table public.application_documents
  add column correction_note text;

alter table public.application_documents
  add constraint application_documents_correction_note_check
  check (correction_note is null or char_length(btrim(correction_note)) between 1 and 500);
