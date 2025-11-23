-- Add openai_autocorrect_instructions column to companies table
ALTER TABLE companies
ADD COLUMN openai_autocorrect_instructions TEXT;
