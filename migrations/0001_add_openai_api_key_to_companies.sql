-- Add openai_api_key column to companies table
ALTER TABLE companies
ADD COLUMN openai_api_key TEXT;
