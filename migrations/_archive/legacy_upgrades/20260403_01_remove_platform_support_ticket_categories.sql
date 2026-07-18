-- Revert platform-support ticket intake: remove seeded categories and dependent tickets.
-- ticket_comments, ticket_attachments, and ticket_activity rows cascade when tickets are deleted.

DELETE FROM tickets
WHERE category_id IN (
  SELECT id FROM ticket_categories
  WHERE slug IN ('billing-plans', 'platform-system', 'access-integrations')
);

DELETE FROM ticket_categories
WHERE slug IN ('billing-plans', 'platform-system', 'access-integrations');
