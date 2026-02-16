-- Add subject_name column to study_sessions table
ALTER TABLE study_sessions ADD COLUMN subject_name VARCHAR(100) AFTER subject_id;

-- Update existing records to populate subject_name from subject_id (capitalize first letter)
UPDATE study_sessions 
SET subject_name = CONCAT(UPPER(SUBSTRING(subject_id, 1, 1)), SUBSTRING(subject_id, 2))
WHERE subject_name IS NULL;
