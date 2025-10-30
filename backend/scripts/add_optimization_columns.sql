-- Add file_hash column to books table for deduplication
ALTER TABLE books ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_books_file_hash ON books(file_hash);
CREATE INDEX IF NOT EXISTS idx_books_owner_created ON books(owner_id, created_at);
CREATE INDEX IF NOT EXISTS idx_books_owner_status ON books(owner_id, processing_status);
CREATE INDEX IF NOT EXISTS idx_books_owner_processed ON books(owner_id, is_processed);
CREATE INDEX IF NOT EXISTS idx_books_file_hash_owner ON books(file_hash, owner_id);

-- Add token usage tracking columns
ALTER TABLE token_usage ADD COLUMN IF NOT EXISTS book_id UUID REFERENCES books(id);
ALTER TABLE token_usage ADD COLUMN IF NOT EXISTS model_name VARCHAR(100);
ALTER TABLE token_usage ADD COLUMN IF NOT EXISTS response_time_ms INTEGER;
ALTER TABLE token_usage ADD COLUMN IF NOT EXISTS cache_hit BOOLEAN DEFAULT FALSE;

-- Add indexes for token usage analytics
CREATE INDEX IF NOT EXISTS idx_token_usage_user_created ON token_usage(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_token_usage_user_action ON token_usage(user_id, action);
CREATE INDEX IF NOT EXISTS idx_token_usage_action_created ON token_usage(action, created_at);
CREATE INDEX IF NOT EXISTS idx_token_usage_model_created ON token_usage(model_name, created_at);

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'books' AND column_name = 'file_hash';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'token_usage' AND column_name IN ('book_id', 'model_name', 'response_time_ms', 'cache_hit');
