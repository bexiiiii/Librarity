-- Delete broken book with missing MinIO file
-- Book ID: 4ef19245-1f46-4d5c-b008-016222ef3359

DELETE FROM books 
WHERE id = '4ef19245-1f46-4d5c-b008-016222ef3359';

-- Verify deletion
SELECT COUNT(*) as remaining_books 
FROM books 
WHERE owner_id = 'fb0699ef-7f58-4a45-b3e2-2fde43e32b85';
