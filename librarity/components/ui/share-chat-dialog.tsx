"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Check, Copy, X, Facebook, MessageCircle, Send } from "lucide-react";
import { motion } from "framer-motion";

interface ShareChatDialogProps {
  open: boolean;
  onClose: () => void;
  shareUrl: string;
}

export function ShareChatDialog({ open, onClose, shareUrl }: ShareChatDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const socialShare = (platform: string) => {
    const text = encodeURIComponent("Посмотри мой разговор с книгой!");
    const url = encodeURIComponent(shareUrl);

    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      telegram: `https://t.me/share/url?url=${url}&text=${text}`,
    };

    window.open(urls[platform], '_blank', 'width=600,height=400');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-md md:max-w-lg bg-[#0A0A0A] border-white/[0.1]"
        showCloseButton={false}
      >
        <div className="flex flex-col space-y-4 p-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg md:text-xl font-semibold text-white">
              Поделиться чатом
            </h3>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white/80 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Description */}
          <p className="text-sm md:text-base text-white/60">
            Отправьте ссылку друзьям, чтобы они увидели ваш разговор с книгой
          </p>

          {/* URL Input */}
          <div className="flex items-center gap-2 p-3 bg-white/[0.05] border border-white/[0.1] rounded-lg">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 bg-transparent text-white/80 text-sm outline-none"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCopy}
              className="px-3 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-md flex items-center gap-2 transition-colors"
            >
              {copied ? (
                <>
                  <Check size={16} />
                  <span className="text-xs sm:text-sm">Скопировано!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span className="text-xs sm:text-sm">Копировать</span>
                </>
              )}
            </motion.button>
          </div>

          {/* Social Share Buttons */}
          <div className="pt-4 border-t border-white/[0.1]">
            <p className="text-sm text-white/60 mb-3">Или поделитесь в:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => socialShare('twitter')}
                className="flex items-center justify-center gap-2 p-3 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.1] rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <span className="text-xs sm:text-sm text-white/80">Twitter</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => socialShare('facebook')}
                className="flex items-center justify-center gap-2 p-3 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.1] rounded-lg transition-colors"
              >
                <Facebook className="w-5 h-5 text-white/80" />
                <span className="text-xs sm:text-sm text-white/80">Facebook</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => socialShare('whatsapp')}
                className="flex items-center justify-center gap-2 p-3 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.1] rounded-lg transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-white/80" />
                <span className="text-xs sm:text-sm text-white/80">WhatsApp</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => socialShare('telegram')}
                className="flex items-center justify-center gap-2 p-3 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.1] rounded-lg transition-colors"
              >
                <Send className="w-5 h-5 text-white/80" />
                <span className="text-xs sm:text-sm text-white/80">Telegram</span>
              </motion.button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
