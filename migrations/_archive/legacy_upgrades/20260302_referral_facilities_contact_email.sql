-- Add contact_email to referral_facilities.
ALTER TABLE referral_facilities ADD COLUMN IF NOT EXISTS contact_email VARCHAR;
