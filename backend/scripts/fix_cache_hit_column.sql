-- Active: 1760214685003@@164.90.180.120@5432@librarity
-- Fix cache_hit column type from VARCHAR to BOOLEAN
-- This migration converts the cache_hit column from String to Boolean type

BEGIN;

-- First, try to convert existing values to boolean
-- Assuming 'true', 'false', 'True', 'False', '1', '0' are possible values
ALTER TABLE token_usage 
ALTER COLUMN cache_hit TYPE BOOLEAN 
USING CASE 
    WHEN cache_hit IN ('true', 'True', '1', 't', 'T') THEN TRUE
    WHEN cache_hit IN ('false', 'False', '0', 'f', 'F') THEN FALSE
    ELSE FALSE
END;

-- Set default value
ALTER TABLE token_usage 
ALTER COLUMN cache_hit SET DEFAULT FALSE;

COMMIT;
