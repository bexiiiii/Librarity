"""
MinIO Storage Service
Handles file upload, download, and management in MinIO object storage
"""
from minio import Minio
from minio.error import S3Error
from io import BytesIO
from typing import Optional, BinaryIO
import structlog
from pathlib import Path

from core.config import settings

logger = structlog.get_logger()


class MinIOService:
    """Service for interacting with MinIO object storage"""
    
    def __init__(self):
        """Initialize MinIO client"""
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_USE_SSL
        )
        self.bucket_name = settings.MINIO_BUCKET_NAME
        self._ensure_bucket_exists()
        
        logger.info(
            "minio_initialized",
            endpoint=settings.MINIO_ENDPOINT,
            bucket=self.bucket_name,
            ssl=settings.MINIO_USE_SSL
        )
    
    def _ensure_bucket_exists(self):
        """Create bucket if it doesn't exist"""
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
                logger.info("minio_bucket_created", bucket=self.bucket_name)
            else:
                logger.info("minio_bucket_exists", bucket=self.bucket_name)
        except S3Error as e:
            logger.error("minio_bucket_error", error=str(e))
            raise
    
    async def upload_file(
        self,
        file_data: bytes,
        object_name: str,
        content_type: str = "application/octet-stream"
    ) -> str:
        """
        Upload file to MinIO
        
        Args:
            file_data: File content as bytes
            object_name: Name/path for the object in MinIO
            content_type: MIME type of the file
            
        Returns:
            Object name (path) in MinIO
        """
        try:
            file_stream = BytesIO(file_data)
            file_size = len(file_data)
            
            self.client.put_object(
                self.bucket_name,
                object_name,
                file_stream,
                file_size,
                content_type=content_type
            )
            
            logger.info(
                "minio_file_uploaded",
                object_name=object_name,
                size=file_size,
                content_type=content_type
            )
            
            return object_name
            
        except S3Error as e:
            logger.error("minio_upload_error", object_name=object_name, error=str(e))
            raise Exception(f"Failed to upload file to MinIO: {str(e)}")
    
    async def download_file(self, object_name: str) -> bytes:
        """
        Download file from MinIO
        
        Args:
            object_name: Name/path of the object in MinIO
            
        Returns:
            File content as bytes
        """
        try:
            response = self.client.get_object(self.bucket_name, object_name)
            data = response.read()
            response.close()
            response.release_conn()
            
            logger.info("minio_file_downloaded", object_name=object_name, size=len(data))
            return data
            
        except S3Error as e:
            logger.error("minio_download_error", object_name=object_name, error=str(e))
            raise Exception(f"Failed to download file from MinIO: {str(e)}")
    
    async def get_file_url(self, object_name: str, expires: int = 3600) -> str:
        """
        Get presigned URL for file access
        
        Args:
            object_name: Name/path of the object in MinIO
            expires: URL expiration time in seconds (default 1 hour)
            
        Returns:
            Presigned URL
        """
        try:
            from datetime import timedelta
            
            url = self.client.presigned_get_object(
                self.bucket_name,
                object_name,
                expires=timedelta(seconds=expires)
            )
            
            logger.info("minio_presigned_url_generated", object_name=object_name, expires=expires)
            return url
            
        except S3Error as e:
            logger.error("minio_presigned_url_error", object_name=object_name, error=str(e))
            raise Exception(f"Failed to generate presigned URL: {str(e)}")
    
    async def delete_file(self, object_name: str) -> bool:
        """
        Delete file from MinIO
        
        Args:
            object_name: Name/path of the object in MinIO
            
        Returns:
            True if successful
        """
        try:
            self.client.remove_object(self.bucket_name, object_name)
            logger.info("minio_file_deleted", object_name=object_name)
            return True
            
        except S3Error as e:
            logger.error("minio_delete_error", object_name=object_name, error=str(e))
            return False
    
    async def file_exists(self, object_name: str) -> bool:
        """
        Check if file exists in MinIO
        
        Args:
            object_name: Name/path of the object in MinIO
            
        Returns:
            True if file exists
        """
        try:
            self.client.stat_object(self.bucket_name, object_name)
            return True
        except S3Error:
            return False
    
    async def list_files(self, prefix: str = "") -> list:
        """
        List files in MinIO bucket
        
        Args:
            prefix: Prefix to filter objects
            
        Returns:
            List of object names
        """
        try:
            objects = self.client.list_objects(self.bucket_name, prefix=prefix, recursive=True)
            file_list = [obj.object_name for obj in objects]
            
            logger.info("minio_files_listed", prefix=prefix, count=len(file_list))
            return file_list
            
        except S3Error as e:
            logger.error("minio_list_error", prefix=prefix, error=str(e))
            return []
    
    async def get_file_metadata(self, object_name: str) -> dict:
        """
        Get file metadata from MinIO
        
        Args:
            object_name: Name/path of the object in MinIO
            
        Returns:
            Dictionary with file metadata
        """
        try:
            stat = self.client.stat_object(self.bucket_name, object_name)
            
            metadata = {
                "size": stat.size,
                "etag": stat.etag,
                "content_type": stat.content_type,
                "last_modified": stat.last_modified,
                "metadata": stat.metadata
            }
            
            logger.info("minio_metadata_retrieved", object_name=object_name)
            return metadata
            
        except S3Error as e:
            logger.error("minio_metadata_error", object_name=object_name, error=str(e))
            raise Exception(f"Failed to get file metadata: {str(e)}")


# Global MinIO service instance
minio_service = MinIOService()


async def save_book_file(user_id: str, book_id: str, file_data: bytes, filename: str) -> str:
    """
    Save book file to MinIO
    
    Args:
        user_id: User ID
        book_id: Book ID
        file_data: File content as bytes
        filename: Original filename
        
    Returns:
        Object path in MinIO
    """
    # Determine content type
    suffix = Path(filename).suffix.lower()
    content_types = {
        '.pdf': 'application/pdf',
        '.epub': 'application/epub+zip',
        '.txt': 'text/plain',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
    content_type = content_types.get(suffix, 'application/octet-stream')
    
    # Create object path: users/{user_id}/books/{book_id}/{filename}
    object_name = f"users/{user_id}/books/{book_id}/{filename}"
    
    await minio_service.upload_file(file_data, object_name, content_type)
    
    return object_name


async def get_book_file(object_path: str) -> bytes:
    """
    Get book file from MinIO
    
    Args:
        object_path: Object path in MinIO
        
    Returns:
        File content as bytes
    """
    return await minio_service.download_file(object_path)


async def delete_book_file(object_path: str) -> bool:
    """
    Delete book file from MinIO
    
    Args:
        object_path: Object path in MinIO
        
    Returns:
        True if successful
    """
    return await minio_service.delete_file(object_path)


async def get_book_file_url(object_path: str, expires: int = 3600) -> str:
    """
    Get presigned URL for book file
    
    Args:
        object_path: Object path in MinIO
        expires: URL expiration in seconds
        
    Returns:
        Presigned URL
    """
    return await minio_service.get_file_url(object_path, expires)
