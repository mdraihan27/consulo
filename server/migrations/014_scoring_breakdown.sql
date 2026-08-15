-- 014_scoring_breakdown.sql
-- Updates scoring system: Questionnaire (50%), Certifications (30%), Ratings (20%)

ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS assessment_score INTEGER;
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS cert_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS rating_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE freelancer_certifications ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0;
