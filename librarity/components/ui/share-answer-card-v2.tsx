'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Download, Share2, Sparkles, BookOpen, Check } from 'lucide-react';
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
  onClose,
}: ShareAnswerCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateImage = async () => {
    if (!cardRef.current) return null;

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
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
    link.download = `librarity-${bookTitle.slice(0, 30)}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleShare = async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) return;

    // Convert to blob for sharing
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], 'librarity-share.png', { type: 'image/png' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: 'AI Book Chat - librarity',
          text: `💡 Check out this insight from "${bookTitle}"!`,
          files: [file],
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    } else {
      // Fallback to download
      handleDownload();
    }
  };

  return (
    <>
      {/* Modal Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-5xl max-h-[90vh] bg-gray-900 rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          {/* Content - Horizontal Layout */}
          <div className="flex flex-col md:flex-row overflow-auto max-h-[90vh]">
            {/* Left Side - Preview Card */}
            <div className="md:w-2/5 p-6 md:p-8 flex items-center justify-center bg-gray-950/50 border-r border-white/10">
              <div className="w-full max-w-[200px]">
                {/* Preview Card - scaled down version */}
                <div className="aspect-[9/16] bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-4 flex flex-col justify-between relative overflow-hidden rounded-xl shadow-2xl">
                  {/* Decorative blobs */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
                  <div className="absolute bottom-0 left-0 w-20 h-20 bg-pink-500/20 rounded-full blur-2xl" />

                  {/* Logo */}
                  <div className="relative z-10">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-white" />
                      <span className="text-sm font-bold text-white">librarity</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="relative z-10 space-y-2">
                    <div className="bg-white/10 backdrop-blur-sm rounded-md p-2 border border-white/20">
                      <p className="text-[8px] text-white/70 mb-0.5">Question</p>
                      <p className="text-[10px] font-medium text-white line-clamp-2">
                        {question}
                      </p>
                    </div>

                    <div className="bg-white/20 backdrop-blur-sm rounded-md p-2 border border-white/30">
                      <p className="text-[8px] text-white/80 mb-0.5">Answer</p>
                      <p className="text-[9px] text-white line-clamp-3">
                        {answer}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="relative z-10">
                    <div className="bg-white/10 backdrop-blur-sm rounded-md p-2 border border-white/20">
                      <p className="text-[8px] text-white/70 mb-0.5">From</p>
                      <p className="text-[10px] font-bold text-white line-clamp-1">{bookTitle}</p>
                      {bookAuthor && (
                        <p className="text-[8px] text-white/80 line-clamp-1">{bookAuthor}</p>
                      )}
                    </div>
                    <p className="text-center text-[8px] text-white/60 mt-1">librarity.com</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Info & Actions */}
            <div className="md:w-3/5 p-6 md:p-8 flex flex-col justify-center">
              <div className="space-y-6">
                {/* Header */}
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Share Your Answer</h3>
                  <p className="text-white/60">Download or share this beautiful card on social media</p>
                </div>

                {/* Info */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-start gap-3">
                    <BookOpen className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/60 mb-1">From book</p>
                      <p className="font-semibold text-white truncate">{bookTitle}</p>
                      {bookAuthor && (
                        <p className="text-sm text-white/60 truncate">by {bookAuthor}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>1080×1920 HD</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>Instagram Ready</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>TikTok Ready</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>Story Format</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    onClick={handleDownload}
                    disabled={isGenerating}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-black rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-5 h-5" />
                    <span>{isGenerating ? 'Generating...' : 'Download PNG'}</span>
                  </button>

                  <button
                    onClick={handleShare}
                    disabled={isGenerating}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg font-medium hover:from-violet-700 hover:to-indigo-700 transition-colors disabled:opacity-50"
                  >
                    <Share2 className="w-5 h-5" />
                    <span>Share Now</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Hidden Full-Size Card for Generation - 1080x1920 (9:16) */}
      <div
        ref={cardRef}
        className="fixed -left-[9999px] top-0"
        style={{ width: '1080px', height: '1920px' }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, rgb(124, 58, 237) 0%, rgb(147, 51, 234) 50%, rgb(79, 70, 229) 100%)',
            padding: '80px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Decorative elements */}
          <div
            style={{
              position: 'absolute',
              top: '0',
              right: '0',
              width: '500px',
              height: '500px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              filter: 'blur(100px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '0',
              left: '0',
              width: '400px',
              height: '400px',
              background: 'rgba(236, 72, 153, 0.2)',
              borderRadius: '50%',
              filter: 'blur(80px)',
            }}
          />

          {/* Logo */}
          <div style={{ position: 'relative', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '40px',
                }}
              >
                ✨
              </div>
              <span
                style={{
                  fontSize: '72px',
                  fontWeight: 'bold',
                  color: 'white',
                  lineHeight: '1',
                }}
              >
                librarity
              </span>
            </div>
          </div>

          {/* Content */}
          <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '40px' }}>
            {/* Question */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '24px',
                padding: '40px',
                border: '2px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <p
                style={{
                  fontSize: '28px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  marginBottom: '16px',
                  fontWeight: '600',
                }}
              >
                Question
              </p>
              <p
                style={{
                  fontSize: '40px',
                  fontWeight: '600',
                  color: 'white',
                  lineHeight: '1.4',
                  margin: 0,
                }}
              >
                {question.length > 150 ? question.slice(0, 150) + '...' : question}
              </p>
            </div>

            {/* Answer */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                borderRadius: '24px',
                padding: '40px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
              }}
            >
              <p
                style={{
                  fontSize: '28px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginBottom: '16px',
                  fontWeight: '600',
                }}
              >
                Answer
              </p>
              <p
                style={{
                  fontSize: '36px',
                  color: 'white',
                  lineHeight: '1.5',
                  margin: 0,
                }}
              >
                {answer.length > 300 ? answer.slice(0, 300) + '...' : answer}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div style={{ position: 'relative', zIndex: 10 }}>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '24px',
                padding: '40px',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                marginBottom: '24px',
              }}
            >
              <p
                style={{
                  fontSize: '24px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  marginBottom: '12px',
                }}
              >
                From
              </p>
              <p
                style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: 'white',
                  margin: '0',
                  lineHeight: '1.2',
                }}
              >
                {bookTitle}
              </p>
              {bookAuthor && (
                <p
                  style={{
                    fontSize: '32px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    margin: '8px 0 0 0',
                  }}
                >
                  {bookAuthor}
                </p>
              )}
            </div>
            <p
              style={{
                textAlign: 'center',
                fontSize: '32px',
                color: 'rgba(255, 255, 255, 0.6)',
                margin: 0,
              }}
            >
              librarity.com • Chat with any book using AI
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
