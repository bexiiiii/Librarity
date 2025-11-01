'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share2, Instagram, Twitter, Facebook, Copy, Check } from 'lucide-react';
import html2canvas from 'html2canvas';

interface ShareAnswerCardProps {
  question: string;
  answer: string;
  bookTitle: string;
  bookAuthor?: string;
  onClose: () => void;
}

export function ShareAnswerCard({ 
  question, 
  answer, 
  bookTitle, 
  bookAuthor,
  onClose 
}: ShareAnswerCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateImage = async () => {
    if (!cardRef.current) return null;

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0A0A0B',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Failed to generate image:', error);
      alert('Failed to generate image. Please try again.');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) return;

    const link = document.createElement('a');
    link.download = `lexentai-${bookTitle.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleShare = async (platform: string) => {
    const dataUrl = await generateImage();
    if (!dataUrl) return;

    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], 'lexentai-share.png', { type: 'image/png' });

    // Try native share API
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${bookTitle} - AI Book Chat`,
          text: question,
          files: [file]
        });
      } catch (error) {
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback to download
      handleDownload();
    }
  };

  const handleCopyLink = async () => {
    const text = `💡 "${question}"\n\n📚 From "${bookTitle}"${bookAuthor ? ` by ${bookAuthor}` : ''}\n\nChat with books using AI at lexentai.com`;
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Truncate text for card
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-4xl bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-white/10 overflow-hidden"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-white/60" />
        </button>

        <div className="grid md:grid-cols-2 gap-6 p-6">
          {/* Left side - Preview */}
          <div className="flex flex-col items-center justify-center">
            <h3 className="text-xl font-semibold text-white/90 mb-4">Preview</h3>
            
            {/* Card Preview - Scaled down version */}
            <div className="relative w-full max-w-[270px] aspect-[9/16] bg-black rounded-xl overflow-hidden shadow-2xl">
              <div
                ref={previewRef}
                className="w-full h-full overflow-hidden"
              >
                {/* Preview Content (scaled down) */}
                <div className="relative w-full h-full bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-4 flex flex-col justify-between text-[0.3rem]">
                  {/* Decorative elements */}
                  <div className="absolute top-0 left-0 w-full h-full opacity-10">
                    <div className="absolute top-2 right-2 w-12 h-12 bg-white rounded-full blur-xl" />
                    <div className="absolute bottom-2 left-2 w-12 h-12 bg-pink-500 rounded-full blur-xl" />
                  </div>

                  {/* Logo */}
                  <div className="relative z-10">
                    <div className="flex items-center gap-1">
                      <div className="w-6 h-6 bg-white/20 backdrop-blur-xl rounded-lg flex items-center justify-center">
                        <span className="text-sm">📚</span>
                      </div>
                      <div>
                        <h1 className="text-lg font-bold text-white">Lexent AI</h1>
                      </div>
                    </div>
                  </div>

                  {/* Question & Answer */}
                  <div className="relative z-10 space-y-2 flex-1 flex flex-col justify-center">
                    {/* Question */}
                    <div className="bg-white/10 backdrop-blur-xl rounded-lg p-2 border border-white/20">
                      <p className="text-[0.35rem] text-white/70 mb-0.5">Question:</p>
                      <p className="text-[0.45rem] font-medium text-white leading-tight">
                        {truncateText(question, 80)}
                      </p>
                    </div>

                    {/* Answer */}
                    <div className="bg-white/20 backdrop-blur-xl rounded-lg p-2 border border-white/30">
                      <p className="text-[0.35rem] text-white/80 mb-0.5">Answer:</p>
                      <p className="text-[0.4rem] text-white leading-tight">
                        {truncateText(answer, 150)}
                      </p>
                    </div>
                  </div>

                  {/* Book Info */}
                  <div className="relative z-10 bg-white/10 backdrop-blur-xl rounded-lg p-2 border border-white/20">
                    <p className="text-[0.35rem] text-white/70 mb-0.5">From:</p>
                    <h2 className="text-[0.5rem] font-bold text-white mb-0.5">{truncateText(bookTitle, 30)}</h2>
                    {bookAuthor && (
                      <p className="text-[0.35rem] text-white/80">{truncateText(bookAuthor, 20)}</p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="relative z-10 text-center">
                    <p className="text-[0.4rem] font-semibold text-white">lexentai.com</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex flex-col justify-center space-y-6">
            <div>
              <h3 className="text-2xl font-semibold text-white/90 mb-2">Share Your Answer</h3>
              <p className="text-white/60">
                Download or share this beautiful card to social media
              </p>
            </div>

            {/* Share buttons */}
            <div className="space-y-3">
              {/* Download */}
              <motion.button
                onClick={handleDownload}
                disabled={isGenerating}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5" />
                <span>{isGenerating ? 'Generating...' : 'Download Image'}</span>
              </motion.button>

              {/* Share (Native) */}
              {typeof window !== 'undefined' && 'share' in navigator && (
                <motion.button
                  onClick={() => handleShare('native')}
                  disabled={isGenerating}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center gap-4 px-6 py-4 bg-white/5 hover:bg-white/10 rounded-xl text-white font-medium transition-all border border-white/10 disabled:opacity-50"
                >
                  <Share2 className="w-5 h-5" />
                  <span>Share to Social Media</span>
                </motion.button>
              )}

              {/* Copy text */}
              <motion.button
                onClick={handleCopyLink}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center gap-4 px-6 py-4 bg-white/5 hover:bg-white/10 rounded-xl text-white font-medium transition-all border border-white/10"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-green-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    <span>Copy Text</span>
                  </>
                )}
              </motion.button>
            </div>

            {/* Social media hints */}
            <div className="pt-4 border-t border-white/10">
              <p className="text-sm text-white/50 mb-3">Perfect for:</p>
              <div className="flex gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-pink-500/10 rounded-lg border border-pink-500/20">
                  <Instagram className="w-4 h-4 text-pink-400" />
                  <span className="text-sm text-pink-400">Instagram Story</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <Twitter className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-blue-400">Twitter/X</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                  <Facebook className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm text-indigo-400">Facebook</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-white/40 text-center pt-4">
              Sharing helps others discover the magic of AI-powered book conversations ✨
            </div>
          </div>
        </div>

        {/* Hidden full-size card for export (1080x1920) */}
        <div className="fixed left-[-9999px] top-0">
          <div
            ref={cardRef}
            className="w-[1080px] h-[1920px]"
          >
            {/* Full-size Card Content */}
            <div className="relative w-full h-full bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-24 flex flex-col justify-between">
              {/* Decorative elements */}
              <div className="absolute top-0 left-0 w-full h-full opacity-10">
                <div className="absolute top-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
                <div className="absolute bottom-20 left-20 w-96 h-96 bg-pink-500 rounded-full blur-3xl" />
              </div>

              {/* Logo */}
              <div className="relative z-10">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center">
                    <span className="text-4xl font-bold text-white">📚</span>
                  </div>
                  <div>
                    <h1 className="text-5xl font-bold text-white">Lexent AI</h1>
                    <p className="text-2xl text-white/80">AI Book Chat</p>
                  </div>
                </div>
              </div>

              {/* Question & Answer */}
              <div className="relative z-10 space-y-12">
                {/* Question */}
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 border border-white/20">
                  <p className="text-2xl text-white/70 mb-4">Question:</p>
                  <p className="text-4xl font-medium text-white leading-relaxed">
                    {truncateText(question, 150)}
                  </p>
                </div>

                {/* Answer */}
                <div className="bg-white/20 backdrop-blur-xl rounded-3xl p-12 border border-white/30">
                  <p className="text-2xl text-white/80 mb-4">Answer:</p>
                  <p className="text-3xl text-white leading-relaxed">
                    {truncateText(answer, 300)}
                  </p>
                </div>
              </div>

              {/* Book Info */}
              <div className="relative z-10 bg-white/10 backdrop-blur-xl rounded-3xl p-12 border border-white/20">
                <p className="text-2xl text-white/70 mb-3">From the book:</p>
                <h2 className="text-5xl font-bold text-white mb-3">{bookTitle}</h2>
                {bookAuthor && (
                  <p className="text-3xl text-white/80">by {bookAuthor}</p>
                )}
              </div>

              {/* Footer */}
              <div className="relative z-10 text-center">
                <p className="text-3xl font-semibold text-white">
                  lexentai.com
                </p>
                <p className="text-2xl text-white/70 mt-3">
                  Chat with any book using AI
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
