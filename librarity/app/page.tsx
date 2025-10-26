'use client';

import { AnimatedAIChat } from "@/components/ui/animated-ai-chat";
import { Sidebar } from "@/components/ui/sidebar";
import { BookUpload } from "@/components/ui/book-upload";
import { ShareChatDialog } from "@/components/ui/share-chat-dialog";
import { useState, useEffect, useCallback } from "react";
import { Menu, Share2, LogIn, ShareIcon, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import CardDemo from "@/components/ui/card-studio";

export default function Home() {
  const [currentChatId, setCurrentChatId] = useState<string | null | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadedBook, setUploadedBook] = useState<{ id: string; title: string; author?: string; is_processed?: boolean } | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  // Проверка авторизации (должна быть первой)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        await api.getCurrentUser();
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Восстановление данных из localStorage после проверки авторизации
  useEffect(() => {
    if (isLoading) return; // Ждем завершения проверки авторизации
    
    if (typeof window !== 'undefined') {
      if (isAuthenticated) {
        // Восстанавливаем книгу
        const savedBook = localStorage.getItem('uploaded_book');
        console.log('Restoring book from localStorage:', savedBook);
        if (savedBook) {
          try {
            const parsedBook = JSON.parse(savedBook);
            console.log('Parsed book:', parsedBook);
            setUploadedBook(parsedBook);
          } catch (error) {
            console.error('Failed to restore book:', error);
          }
        }
        
        // Восстанавливаем сессию
        const savedSessionId = localStorage.getItem('current_session_id');
        if (savedSessionId) {
          setCurrentChatId(savedSessionId);
        } else {
          setCurrentChatId(null);
        }
      } else {
        // Если пользователь не авторизован, очищаем все данные
        console.log('User not authenticated, clearing all data');
        setUploadedBook(null);
        setCurrentChatId(null);
        localStorage.removeItem('uploaded_book');
        localStorage.removeItem('current_session_id');
        localStorage.removeItem('chat_messages');
      }
    }
  }, [isAuthenticated, isLoading]);

  // Определение размера экрана
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // На десктопе сайдбар открыт по умолчанию
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Слушаем событие создания новой сессии
  useEffect(() => {
    const handleSessionCreated = (event: CustomEvent) => {
      const { sessionId } = event.detail;
      console.log('Session created event received:', sessionId);
      setCurrentChatId(sessionId);
    };
    
    window.addEventListener('session-created', handleSessionCreated as EventListener);
    return () => {
      window.removeEventListener('session-created', handleSessionCreated as EventListener);
    };
  }, []);

  const handleNewChat = () => {
    setCurrentChatId(null);
    // Очищаем сохраненный session_id и сообщения
    if (typeof window !== 'undefined') {
      localStorage.removeItem('current_session_id');
      localStorage.removeItem('chat_messages');
    }
    // Закрываем сайдбар на мобильных после выбора
    if (isMobile) {
      setIsSidebarOpen(false);
    }
    console.log('Creating new chat...');
  };

  const handleSelectChat = (sessionId: string) => {
    setCurrentChatId(sessionId);
    // Закрываем сайдбар на мобильных после выбора
    if (isMobile) {
      setIsSidebarOpen(false);
    }
    console.log('Selected chat:', sessionId);
  };

  const handleToggleSidebar = (open: boolean) => {
    setIsSidebarOpen(open);
  };

  const handleShareChat = () => {
    const savedSessionId = localStorage.getItem('current_session_id');
    const sessionToShare = currentChatId || savedSessionId;
    
    if (sessionToShare) {
      const url = `${window.location.origin}/chat/${sessionToShare}`;
      setShareUrl(url);
      setIsShareOpen(true);
    } else {
      alert('Сначала создайте чат или выберите существующий');
    }
  };

    const handleBookRestore = useCallback((book: { id: string; title: string; author?: string; is_processed?: boolean }) => {
    console.log('handleBookRestore called with:', book);
    setUploadedBook(book);
    console.log('About to save to localStorage:', book);
    if (typeof window !== 'undefined') {
      localStorage.setItem('uploaded_book', JSON.stringify(book));
      // Проверяем что сохранилось
      const saved = localStorage.getItem('uploaded_book');
      console.log('Saved to localStorage (verified):', saved);
    }
  }, []);

  const handleBookRemove = () => {
    setUploadedBook(null);
    // Удаляем из localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('uploaded_book');
    }
  };

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-[#24252d]">
      {/* Sidebar */}
      <Sidebar 
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        isOpen={isSidebarOpen}
        onToggle={handleToggleSidebar}
      />
      
      {/* Main Content */}
      <div 
        className={`
          flex-1 
          flex
          flex-col
          ${isSidebarOpen && !isMobile ? 'ml-0' : 'ml-0'}
          ${isMobile ? 'w-full' : ''}
        `}
      >
        {/* Mobile Menu Button - показывается только на мобильных когда сайдбар закрыт */}
        {!isSidebarOpen && isMobile && (
          <motion.button
            onClick={() => setIsSidebarOpen(true)}
            className="fixed top-4 left-4 z-50 w-10 h-10 bg-white/[0.03] hover:bg-white/[0.05] rounded-xl flex items-center justify-center transition-colors border border-white/[0.05] backdrop-blur-xl"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Menu className="w-5 h-5 text-white/60" />
          </motion.button>
        )}
        
        {/* Auth/Share Button - правый верхний угол */}
        {!isLoading && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-3"
          >
          </motion.div>
        )}
        
        <AnimatedAIChat 
          currentSessionId={currentChatId}
          onUploadClick={() => setIsUploadOpen(true)}
          uploadedBook={uploadedBook}
          onRemoveBook={handleBookRemove}
          onBookRestore={handleBookRestore}
          isAuthenticated={isAuthenticated}
          onShareClick={handleShareChat}
          onToggleSidebar={() => setIsSidebarOpen(true)}
        />

        {/* Upload Book Dialog */}
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogContent className="sm:max-w-2xl bg-gray-900/95 backdrop-blur-xl border-white/[0.1]">
            <BookUpload 
              onUploadSuccess={(book) => {
                setIsUploadOpen(false);
                const uploadedBookData = {
                  id: book.id,
                  title: book.title,
                  author: book.author
                };
                setUploadedBook(uploadedBookData);
                // Сохраняем в localStorage
                if (typeof window !== 'undefined') {
                  localStorage.setItem('uploaded_book', JSON.stringify(uploadedBookData));
                }
              }}
              onClose={() => setIsUploadOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Share Chat Dialog */}
        <ShareChatDialog 
          open={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          shareUrl={shareUrl}
        />
      </div>
    </div>
  );
}
