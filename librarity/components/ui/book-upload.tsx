'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BookUploadProps {
  onUploadSuccess?: (book: { id: string; title: string; author: string; description: string }) => void;
  onClose?: () => void;
}

export function BookUpload({ onUploadSuccess, onClose }: BookUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type === 'application/pdf' || droppedFile.type === 'application/epub+zip')) {
      setFile(droppedFile);
      setError('');
    } else {
      setError('Please upload a PDF or EPUB file');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/pdf' || selectedFile.type === 'application/epub+zip') {
        setFile(selectedFile);
        setError('');
      } else {
        setError('Please upload a PDF or EPUB file');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setIsUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const uploadedBook = await api.uploadBook(file, {
        title: title || undefined,
        author: author || undefined,
        description: description || undefined,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      setSuccess(true);

      setTimeout(() => {
        onUploadSuccess?.({
          id: uploadedBook.id,
          title: title || file.name,
          author: author || 'Unknown',
          description: description || ''
        });
        onClose?.();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setError('');
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-2xl mx-auto p-6"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Upload Book</h2>
            <p className="text-sm text-white/60 mt-1">
              Upload PDF or EPUB files to start reading
            </p>
          </div>
          {onClose && (
            <Button
              variant="outline"
              size="icon"
              onClick={onClose}
              className="rounded-full bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.05]"
            >
              <X className="w-4 h-4 text-white/60" />
            </Button>
          )}
        </div>

        {/* Drop Zone */}
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !file && fileInputRef.current?.click()}
            className={`
            relative overflow-hidden rounded-2xl border-2 border-dashed transition-all cursor-pointer
            ${isDragging 
              ? 'border-[#eb6a48] bg-[#eb6a48]/10 scale-[1.02]' 
              : 'border-white/[0.1] bg-white/[0.02] hover:border-white/[0.2] hover:bg-white/[0.03]'
            }
            ${file ? 'cursor-default' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.epub"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />

          <div className="p-12">
            <AnimatePresence mode="wait">
              {!file ? (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-center"
                >
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#eb6a48]/10 mb-6">
                    <Upload className="w-10 h-10 text-[#eb6a48]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Drop your book here
                  </h3>
                  <p className="text-sm text-white/60 mb-4">
                    or click to browse files
                  </p>
                  <p className="text-xs text-white/40">
                    Supports PDF and EPUB formats
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="file"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-4 p-4 bg-white/[0.03] rounded-xl border border-white/[0.05]"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#eb6a48] flex items-center justify-center">
                    {success ? (
                      <CheckCircle className="w-6 h-6 text-white" />
                    ) : (
                      <FileText className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-white/60">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {isUploading && (
                      <div className="mt-2">
                        <div className="w-full h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress}%` }}
                            className="h-full bg-[#eb6a48]"
                          />
                        </div>
                        <p className="text-xs text-white/60 mt-1">
                          {uploadProgress}% uploaded
                        </p>
                      </div>
                    )}
                  </div>
                  {!isUploading && !success && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile();
                      }}
                      className="flex-shrink-0 rounded-full bg-white/[0.03] border-white/[0.05] hover:bg-red-500/20 hover:border-red-500/50"
                    >
                      <X className="w-4 h-4 text-white/60" />
                    </Button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/50 rounded-xl"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Metadata Form */}
        {file && !success && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="title" className="text-white/80">
                Title (optional)
              </Label>
              <Input
                id="title"
                type="text"
                placeholder="Enter book title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isUploading}
                className="bg-white/[0.03] border-white/[0.1] text-white placeholder:text-white/40"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="author" className="text-white/80">
                Author (optional)
              </Label>
              <Input
                id="author"
                type="text"
                placeholder="Enter author name"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                disabled={isUploading}
                className="bg-white/[0.03] border-white/[0.1] text-white placeholder:text-white/40"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-white/80">
                Description (optional)
              </Label>
              <textarea
                id="description"
                placeholder="Enter book description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isUploading}
                rows={3}
                className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.1] rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#eb6a48]/50 disabled:opacity-50"
              />
            </div>
          </motion.div>
        )}

        {/* Action Button */}
        {file && !success && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              className="flex-1 h-12 bg-[#eb6a48] hover:bg-[#d85a38] text-white font-semibold rounded-xl"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Book
                </>
              )}
            </Button>
          </motion.div>
        )}

        {/* Success State */}
        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-8"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Upload Successful!
            </h3>
            <p className="text-sm text-white/60">
              Your book has been uploaded successfully
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
