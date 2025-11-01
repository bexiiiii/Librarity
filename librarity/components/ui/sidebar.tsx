'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { 
  MessageSquare, 
  Search, 
  Book, 
  Plus,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Sparkles,
  Menu,
  X,
  ZapIcon
} from 'lucide-react';
import { Button } from './button';
import Link from 'next/link';
import { ProfileModal } from './profile-modal';
import { useTranslation } from '@/i18n/use-translation';

interface ChatSession {
  session_id: string;
  book_id: string;
  created_at: string;
  book_title?: string;
  book_author?: string;
}

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  user: { email?: string; username?: string } | null;
  subscription: { subscription_tier?: string; tokens_remaining?: number; max_tokens?: number } | null;
  onNewChat: () => void;
  onSelectChat: (sessionId: string) => void;
  onToggle?: () => void;
}

export function Sidebar({ onNewChat, onSelectChat, isOpen, onToggle, setIsOpen, user: propsUser, subscription: propsSubscription }: SidebarProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ email?: string; username?: string } | null>(propsUser);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [subscription, setSubscription] = useState<{ subscription_tier?: string; tokens_remaining?: number; max_tokens?: number } | null>(propsSubscription);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Функция загрузки сессий - вынесена для переиспользования
  const loadChatSessions = async () => {
    try {
      setIsLoading(true);
      console.log('Loading chat sessions...');
      const sessions = await api.getChatSessions();
      console.log('Loaded chat sessions:', sessions);
      console.log('Number of sessions:', sessions?.length || 0);
      setChatSessions(sessions || []);
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
      setChatSessions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Загрузка данных пользователя
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await api.getCurrentUser();
        setUser(userData);
        setIsAuthenticated(true);
        
        // Загрузка подписки
        try {
          const subData = await api.getSubscription();
          setSubscription(subData);
        } catch (error) {
          console.error('Failed to load subscription:', error);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
        setIsAuthenticated(false);
      }
    };
    loadUserData();
  }, []);

  // Загрузка истории чатов
  useEffect(() => {
    loadChatSessions();

    // Слушаем событие создания новой сессии
    const handleSessionCreated = (event: CustomEvent) => {
      console.log('Session created event received in sidebar:', event.detail);
      // Перезагружаем список чатов с небольшой задержкой
      setTimeout(() => loadChatSessions(), 500);
    };

    window.addEventListener('session-created', handleSessionCreated as EventListener);
    
    // Также слушаем событие отправки сообщения для обновления
    const handleMessageSent = (event: CustomEvent) => {
      console.log('Message sent event received in sidebar:', event.detail);
      // Перезагружаем список чатов с небольшой задержкой
      setTimeout(() => loadChatSessions(), 500);
    };
    
    window.addEventListener('chat-message-sent', handleMessageSent as EventListener);

    return () => {
      window.removeEventListener('session-created', handleSessionCreated as EventListener);
      window.removeEventListener('chat-message-sent', handleMessageSent as EventListener);
    };
  }, []);

  // Фильтрация чатов по поиску
  const filteredChats = chatSessions.filter(chat =>
    chat.book_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.book_author?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewChat = () => {
    onNewChat?.();
  };

  const handleLogout = () => {
    api.logout();
    window.location.href = '/login';
  };

  const getUserInitial = () => {
    if (user?.username) return user.username[0].toUpperCase();
    if (user?.email) return user.email[0].toUpperCase();
    return 'U';
  };

  const getUserName = () => {
    if (user?.username) return user.username;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  const getSubscriptionTier = () => {
    if (!subscription) return 'Free plan';
    const tier = subscription.subscription_tier || 'free';
    return tier.charAt(0).toUpperCase() + tier.slice(1) + ' plan';
  };

  const shouldShowProPlan = () => {
    // Показываем Pro Plan только для пользователей с Free планом
    return isAuthenticated && (!subscription || subscription.subscription_tier === 'free');
  };

  return (
    <>
      {/* Toggle Button - Мобильная версия */}
      <motion.button
        onClick={() => onToggle ? onToggle() : setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 w-10 h-10 bg-white/[0.03] hover:bg-white/[0.05] rounded-xl flex items-center justify-center transition-colors border border-white/[0.05] backdrop-blur-xl md:hidden"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? <X className="w-5 h-5 text-white/60" /> : <Menu className="w-5 h-5 text-white/60" />}
      </motion.button>

      {/* Toggle Button - Десктопная версия (внутри сайдбара) */}
      {isOpen && (
        <motion.button
          onClick={() => onToggle ? onToggle() : setIsOpen(false)}
          className="hidden md:flex fixed top-4 left-[calc(20rem-2rem)] z-50 w-10 h-10 bg-white/[0.03] hover:bg-white/[0.05] rounded-xl items-center justify-center transition-colors border border-white/[0.05] backdrop-blur-xl"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <X className="w-5 h-5 text-white/60" />
        </motion.button>
      )}

      {/* Overlay для мобильных */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onToggle ? onToggle() : setIsOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed md:sticky left-0 top-0 h-screen w-80 max-w-[85vw] bg-[#24252d] flex flex-col z-40"
          >
            {/* Header */}
            <div className="p-4 space-y-4 pt-16 md:pt-4">
              <div className="flex items-center gap-3 px-2">
                <motion.div 
                  className="w-12 h-12 bg-[#eb6a48] rounded-full flex items-center justify-center"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Book className="w-6 h-6 text-white" />
                </motion.div>
                <h1 className="text-2xl font-semibold text-white font-[family-name:var(--font-advercase)]">Lexent AI</h1>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  placeholder={t.common.search.toLowerCase()}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    "w-full pl-10 pr-4 py-2.5 bg-[#33333e] rounded-[20px]",
                    "text-sm text-white/90 placeholder-white/40",
                    "focus:outline-none focus:ring-2 focus:ring-[#eb6a48]/30",
                    "transition-all"
                  )}
                />
              </div>
            </div>

            {/* Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              <div className="space-y-6">
                {/* New Chat Button - показываем только для авторизованных */}
                {isAuthenticated && (
                  <motion.button
                    onClick={handleNewChat}
                    className="w-full flex items-center gap-3 px-3 py-2.5 bg-[#eb6a48] hover:bg-[#d85a38] rounded-md transition-colors text-left"
                    whileHover={{ x: 2, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <Plus className="w-5 h-5 text-white flex-shrink-0" />
                    <span className="text-sm font-medium text-white">{t.sidebar.newChat}</span>
                  </motion.button>
                )}

                {/* Chats Section */}
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3 px-2">
                    {t.sidebar.chats}
                  </h3>
                  <div className="space-y-2">
                  {/* Chat List */}
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    </div>
                  ) : filteredChats.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-8 h-8 text-white/20 mx-auto mb-2" />
                      <p className="text-xs text-white/40">
                        {searchQuery ? 'Ничего не найдено' : t.sidebar.noChats}
                      </p>
                    </div>
                  ) : (
                    filteredChats.map((chat, index) => (
                      <motion.button
                        key={chat.session_id}
                        onClick={() => onSelectChat?.(chat.session_id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 bg-[#33333e] hover:bg-[#3a3a47] rounded-md transition-colors text-left"
                        whileHover={{ x: 2 }}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">
                            {chat.book_title || 'Безымянная книга'}
                          </p>
                          {chat.book_author && (
                            <p className="text-xs text-white/60 truncate">{chat.book_author}</p>
                          )}
                        </div>
                      </motion.button>
                    ))
                  )}
                </div>
              </div>
              </div>
            </div>

            {/* Pro Plan Card - показываем только для Free пользователей */}
            {shouldShowProPlan() && (
              <div className="px-4 pb-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-[#eb6a48] rounded-2xl p-6 space-y-4"
                >
                  <h3 className="text-2xl font-semibold text-white font-[family-name:var(--font-advercase)]">Lexent AI</h3>
                  <h3 className="text-xl font-semibold text-white">{t.subscription.pro} {t.subscription.plan}</h3>
                  <div className="text-base text-white leading-relaxed">
                    <p>{t.common.moreBooks}</p>
                    <p>{t.common.morePossibilities}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-white">
                      <span className="text-base font-medium">$10</span>
                      <span className="text-base font-light">{t.common.perMonth}</span>
                    </div>
                    <Link href="/pricing">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-6 py-2 bg-white text-black font-semibold rounded-xl"
                      >
                        {t.common.get}
                      </motion.button>
                    </Link>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Profile Section - Fixed at Bottom */}
            {isAuthenticated && user && (
              <div className="border-t border-white/[0.05] p-4 bg-[#24252d]">
                <motion.button
                  onClick={() => setShowProfileModal(true)}
                  className="w-full flex items-center gap-3 hover:bg-white/5 rounded-lg p-2 transition-colors"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="w-9 h-9 bg-[#d0d0d0] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-black/50 font-semibold text-sm">{getUserInitial()}</span>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-medium text-white truncate">{getUserName()}</div>
                    <div className="text-xs text-white/60">{getSubscriptionTier()}</div>
                  </div>
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </>
  );
}
