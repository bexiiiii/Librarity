#!/usr/bin/env python3
"""
Apply database schema changes for optimization features
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from core.database import AsyncSessionLocal, engine

async def apply_migration():
    """Apply database schema changes"""
    
    sql_statements = [
        # Add file_hash column to books table
        "ALTER TABLE books ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64);",
        "CREATE INDEX IF NOT EXISTS idx_books_file_hash ON books(file_hash);",
        "CREATE INDEX IF NOT EXISTS idx_books_owner_created ON books(owner_id, created_at);",
        "CREATE INDEX IF NOT EXISTS idx_books_owner_status ON books(owner_id, processing_status);",
        "CREATE INDEX IF NOT EXISTS idx_books_owner_processed ON books(owner_id, is_processed);",
        "CREATE INDEX IF NOT EXISTS idx_books_file_hash_owner ON books(file_hash, owner_id);",
        
        # Add token usage tracking columns
        "ALTER TABLE token_usage ADD COLUMN IF NOT EXISTS book_id UUID REFERENCES books(id);",
        "ALTER TABLE token_usage ADD COLUMN IF NOT EXISTS model_name VARCHAR(100);",
        "ALTER TABLE token_usage ADD COLUMN IF NOT EXISTS response_time_ms INTEGER;",
        "ALTER TABLE token_usage ADD COLUMN IF NOT EXISTS cache_hit BOOLEAN DEFAULT FALSE;",
        
        # Add indexes for token usage analytics
        "CREATE INDEX IF NOT EXISTS idx_token_usage_user_created ON token_usage(user_id, created_at);",
        "CREATE INDEX IF NOT EXISTS idx_token_usage_user_action ON token_usage(user_id, action);",
        "CREATE INDEX IF NOT EXISTS idx_token_usage_action_created ON token_usage(action, created_at);",
        "CREATE INDEX IF NOT EXISTS idx_token_usage_model_created ON token_usage(model_name, created_at);",
    ]
    
    async with AsyncSessionLocal() as session:
        try:
            print("🚀 Applying database migrations...")
            
            for i, statement in enumerate(sql_statements, 1):
                print(f"\n[{i}/{len(sql_statements)}] Executing: {statement[:80]}...")
                await session.execute(text(statement))
                await session.commit()
                print(f"✅ Success")
            
            print("\n" + "="*60)
            print("✨ All migrations applied successfully!")
            print("="*60)
            
            # Verify columns
            print("\n📊 Verifying changes...")
            
            # Check books table
            result = await session.execute(text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'books' AND column_name = 'file_hash'
            """))
            row = result.fetchone()
            if row:
                print(f"✅ books.file_hash: {row[1]}")
            else:
                print("❌ books.file_hash: NOT FOUND")
            
            # Check token_usage table
            result = await session.execute(text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'token_usage' 
                AND column_name IN ('book_id', 'model_name', 'response_time_ms', 'cache_hit')
                ORDER BY column_name
            """))
            rows = result.fetchall()
            print(f"\n✅ token_usage columns added: {len(rows)}/4")
            for row in rows:
                print(f"   - {row[0]}: {row[1]}")
            
            # Check indexes
            result = await session.execute(text("""
                SELECT indexname 
                FROM pg_indexes 
                WHERE tablename IN ('books', 'token_usage')
                AND indexname LIKE 'idx_%'
                ORDER BY indexname
            """))
            indexes = result.fetchall()
            print(f"\n✅ Total indexes created: {len(indexes)}")
            for idx in indexes:
                print(f"   - {idx[0]}")
                
        except Exception as e:
            print(f"\n❌ Error: {e}")
            await session.rollback()
            raise
        finally:
            await session.close()
    
    await engine.dispose()

if __name__ == "__main__":
    print("="*60)
    print("Database Migration Script")
    print("Adding optimization features and token tracking")
    print("="*60)
    
    asyncio.run(apply_migration())
