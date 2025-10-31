"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import api from "@/lib/api";
import { BookUpload } from "@/components/ui/book-upload";
import CardDemo from "@/components/ui/card-studio";
import { ProfileModal } from "@/components/ui/profile-modal";
import MobileChatModes from "@/components/ui/mobile-chat-modes";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface ChatSession {
  session_id: string;
  book_id: string;
  book_title: string;
  book_author?: string;
  created_at: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface User {
  id: string;
  email: string;
  full_name?: string;
  subscription_tier?: string;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [uploadedBook, setUploadedBook] = useState<{ id: string; title: string; author?: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
  const [chatMode, setChatMode] = useState<"book_brain" | "author" | "coach" | "citation">(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('chatMode') as "book_brain" | "author" | "coach" | "citation";
      return savedMode || "book_brain";
    }
    return "book_brain";
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  // Save chat mode to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chatMode', chatMode);
    }
  }, [chatMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Функция для сортировки чатов (новые сначала)
  const sortChatSessions = (sessions: ChatSession[]) => {
    return sessions.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  const loadUserData = async () => {
    try {
      const userData = await api.getCurrentUser();
      setUser(userData);
      
      if (userData) {
        // Load subscription data
        try {
          const subData = await api.getSubscription();
          setSubscription(subData);
        } catch (error) {
          // Silent error handling in production
        }
        
        const sessions = await api.getChatSessions();
        // Сортируем чаты по дате создания - новые сначала
        setChatSessions(sortChatSessions(sessions));
      }
    } catch (error) {
      // Silent error handling in production
    } finally {
      setLoading(false);
    }
  };

  const handleLoginClick = () => {
    setIsAuthOpen(true);
  };

  const handleAuthSuccess = () => {
    setIsAuthOpen(false);
    loadUserData();
  };

  const handleChatClick = async (sessionId: string) => {
    console.log("=== handleChatClick called with sessionId:", sessionId);
    setCurrentSessionId(sessionId);
    try {
      const chatHistory = await api.getChatHistory(sessionId);
      
      setMessages(chatHistory?.messages || []);
      
      // Load book info if we have book_id
      if (chatHistory?.book_id) {
        try {
          const bookInfo = await api.getBook(chatHistory.book_id);
          setUploadedBook({
            id: bookInfo.id,
            title: bookInfo.title,
            author: bookInfo.author,
          });
        } catch (error) {
          // Silent error handling in production
        }
      }
    } catch (error) {
      // Silent error handling in production
    }
  };

  const pollBookStatus = async (bookId: string) => {
    const maxAttempts = 60; // Max 5 minutes (60 * 5 seconds)
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const bookData = await api.getBook(bookId);
        
        if (bookData.is_processed) {
          setIsProcessing(false);
          setProcessingStatus("");
          setUploadProgress(0);
          
          // Book is ready - just set it as uploaded book and show chat interface
          setUploadedBook(bookData);
          setMessages([]);
          setCurrentSessionId(null);
          
          // Reload sessions list
          const sessions = await api.getChatSessions();
          setChatSessions(sortChatSessions(sessions));
        } else if (attempts < maxAttempts) {
          attempts++;
          const status = bookData.processing_status || "processing";
          setProcessingStatus(
            status === "processing" 
              ? `Обработка книги... (${Math.round((attempts / maxAttempts) * 100)}%)`
              : "Обработка книги..."
          );
          setTimeout(checkStatus, 5000); // Check every 5 seconds
        } else {
          setIsProcessing(false);
          setProcessingStatus("");
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "⚠️ Обработка книги занимает больше времени, чем ожидалось. Пожалуйста, попробуйте позже или обновите страницу.",
            },
          ]);
        }
      } catch (error) {
        console.error("Error checking book status:", error);
        setIsProcessing(false);
        setProcessingStatus("");
      }
    };

    checkStatus();
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !uploadedBook) return;

    const userMessage: Message = {
      role: "user",
      content: inputMessage,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    try {
      const response = await api.chatWithBook({
        book_id: uploadedBook.id,
        message: inputMessage,
        session_id: currentSessionId || undefined, // Allow creating new session
        mode: chatMode,
      });
      
      // If this was the first message, store the session_id
      if (!currentSessionId && response.session_id) {
        setCurrentSessionId(response.session_id);
        
        // Reload sessions list to show new session
        const sessions = await api.getChatSessions();
        setChatSessions(sortChatSessions(sessions));
      }
      
      const assistantMessage: Message = {
        role: "assistant",
        content: response.ai_response, // Changed from response.answer to response.ai_response
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Error sending message:", error);
      
      // Show error message to user
      const errorMessage: Message = {
        role: "assistant",
        content: error.message?.includes("still being processed") 
          ? "Книга все еще обрабатывается. Пожалуйста, подождите немного и попробуйте снова."
          : "Произошла ошибка при отправке сообщения. Пожалуйста, попробуйте снова.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    // Check if user is logged in
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    const bookFile = files.find(
      (file) =>
        file.type === "application/pdf" ||
        file.type === "application/epub+zip" ||
        file.name.endsWith(".epub")
    );

    if (bookFile) {
      await handleFileUpload(bookFile);
    }
  };

  const handleFileUpload = async (file: File) => {
    // Check if user is logged in
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Upload with progress
      const response: any = await api.uploadBook(file, undefined, (progress) => {
        setUploadProgress(progress);
      });
      
      setIsUploading(false);
      
      setUploadedBook({
        id: response.id,
        title: response.title,
        author: response.author,
      });

      // Check if book is already processed
      if (response.is_processed) {
        // Start chat with the book to create a session
        const chatResponse = await api.chatWithBook({
          book_id: response.id,
          message: "Привет! Расскажи кратко о чем эта книга.",
          mode: chatMode,
        });
        
        if (chatResponse.session_id) {
          setCurrentSessionId(chatResponse.session_id);
          setMessages([
            {
              role: "user",
              content: "Привет! Расскажи кратко о чем эта книга.",
          },
          {
            role: "assistant",
            content: chatResponse.ai_response, // Changed from chatResponse.answer
          },
        ]);
        
        // Reload sessions list
        const sessions = await api.getChatSessions();
        setChatSessions(sortChatSessions(sessions));
      }
      } else {
        // Book is processing, start polling
        setIsProcessing(true);
        setProcessingStatus("Обработка книги...");
        setMessages([
          {
            role: "assistant",
            content: "📚 Книга загружена! Сейчас идет обработка текста и создание индексов. Это может занять некоторое время...",
          },
        ]);
        
        // Poll book status
        pollBookStatus(response.id);
      }
    } catch (error) {
      console.error("Error uploading book:", error);
      setIsUploading(false);
      setIsProcessing(false);
      setUploadProgress(0);
      setMessages([
        {
          role: "assistant",
          content: "❌ Произошла ошибка при загрузке книги. Пожалуйста, попробуйте еще раз.",
        },
      ]);
    }
  };

  const handleUploadClick = () => {
    // Check if user is logged in
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    fileInputRef.current?.click();
  };

  const filteredChats = chatSessions.filter((chat) =>
    chat.book_title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-[100dvh] bg-[#11101d]">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar - Hidden on mobile by default */}
      <div className={`
        fixed md:relative w-[320px] bg-[#11101d] flex flex-col h-full border-r border-[#33333e]/30 z-50 transition-transform duration-300
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Close button for mobile */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="absolute top-4 right-4 md:hidden text-white/60 hover:text-white"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {/* Logo */}
        <div className="pt-6 px-5 mb-6">
          <div className="flex items-center gap-2.5">
            <Image src="/book 1.png" alt="Librarity Logo" width={40} height={40} />
            <h1 className="text-white text-2xl font-semibold">
              Librarity
            </h1>
          </div>
        </div>

        {/* Search */}
        <div className="px-5 mb-4">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="8.5"
                  cy="8.5"
                  r="5.75"
                  stroke="white"
                  strokeWidth="1.5"
                />
                <path
                  d="M13 13L17 17"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 bg-[#33333e] rounded-full pl-10 pr-3 text-white text-sm placeholder:text-white/50 outline-none focus:ring-2 focus:ring-pink-500 transition-all"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="px-5 mb-3">
          <div className="h-[1px] bg-white/10" />
        </div>

        {/* New Chat Button */}
        <div className="px-5 mb-3">
          <button
            onClick={() => {
              setCurrentSessionId(null);
              setMessages([]);
              setUploadedBook(null);
            }}
            className="w-full bg-[#ff4ba8] hover:bg-[#ff3b98] text-white py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + New Chat
          </button>
        </div>

        {/* Chats Section */}
        <div className="flex-1 overflow-y-auto px-5 pb-3">
          <h2 className="text-white text-sm font-semibold mb-2">Chats</h2>
          
          <div className="space-y-1.5">
            {filteredChats.length > 0 ? (
              filteredChats.map((chat, index) => (
                <motion.button
                  key={chat.session_id}
                  onClick={() => handleChatClick(chat.session_id)}
                  className={`w-full h-9 rounded-lg px-3 text-left text-white text-sm transition-colors ${
                    currentSessionId === chat.session_id
                      ? "bg-[#ff4ba8]"
                      : "bg-[#33333e] hover:bg-[#3d3d4a]"
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="truncate">{chat.book_title}</div>
                </motion.button>
              ))
            ) : (
              <p className="text-white/40 text-xs py-2">No chats yet</p>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="px-5 mb-3">
          <div className="h-[1px] bg-white/10" />
        </div>

        {/* Pro Plan Card - Only show for free tier */}
        {(!subscription || subscription.tier === 'free') && (
          <div className="px-5 mb-4">
            <div 
              className="rounded-2xl p-4 relative overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600"
              style={{
                backgroundImage: 'url("/Rectangle 7.png")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            >
              {/* Dark overlay for better text visibility */}
              <div className="absolute inset-0 bg-black/20 z-0" />
              
              {/* Logo */}
              <div className="mb-3 relative z-10">
                <img 
                  src="/book 1.png" 
                  alt="Librarity" 
                  className="h-8 w-auto"
                />
              </div>
              
              <h3 className="text-white text-lg font-semibold mb-1 relative z-10">
                Pro Plan
              </h3>
              <div className="text-white text-sm font-medium mb-4 relative z-10">
                <p>More books</p>
                <p>More possibilities</p>
              </div>
              <div className="flex items-center justify-between relative z-10">
                <p className="text-white text-sm">
                  <span className="font-semibold">$10</span>
                  <span className="font-light opacity-80"> / month</span>
                </p>
                <button 
                  onClick={() => setIsProfileOpen(true)}
                  className="bg-white text-black px-5 py-1.5 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-colors"
                >
                  Get
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Profile */}
        {user && (
          <div className="px-5 pb-4">
            <button
              onClick={() => setIsProfileOpen(true)}
              className="w-full bg-[#ff4ba8] rounded-xl p-2.5 flex items-center gap-2.5 hover:bg-[#ff3b98] transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-black/40 text-sm font-semibold">
                  {user.full_name
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase() || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-white text-sm font-medium truncate">
                  {user.full_name || user.email}
                </p>
                <p className="text-white/70 text-xs capitalize">
                  {subscription?.tier 
                    ? `${subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)} Plan`
                    : "Free Plan"}
                </p>
              </div>
            </button>
          </div>
        )}
      </div>

  {/* Main Content Area */}
  <div className="flex-1 flex flex-col min-h-0 bg-white">
        {/* Header - Mobile & Desktop */}
        <div className="h-14 md:h-16 flex items-center justify-between px-4 md:px-6 border-b border-gray-100 bg-[#11101d] md:bg-white">
          {/* Mobile: Hamburger menu */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden text-white p-2"
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Desktop: Logo on left */}
          <div className="hidden md:flex items-center gap-2">
            <Image src="/book 1.png" alt="Librarity Logo" width={40} height={40} />
            <h1 className="text-gray-900 text-xl font-semibold">
              Librarity
            </h1>
          </div>

          {/* Mobile: Logo and current mode in center */}
          <div className="md:hidden absolute left-1/2 transform -translate-x-1/2 text-center">
            <h1 className="text-white text-lg font-semibold">
              Librarity
            </h1>
            {uploadedBook && (
              <p className="text-white/60 text-[10px] font-medium mt-0.5">
                {chatMode === 'book_brain' && '💬 General'}
                {chatMode === 'citation' && '📖 Citations'}
                {chatMode === 'author' && '✍️ Author'}
                {chatMode === 'coach' && '🎯 Coach'}
              </p>
            )}
          </div>

          {/* Desktop: Right side content */}
          <div className="hidden md:flex items-center gap-4">
            {!user && !loading && (
              <button
                onClick={handleLoginClick}
                className="bg-[#ff4ba8] text-white h-10 px-8 rounded-full text-sm font-semibold hover:bg-[#ff3b98] transition-colors shadow-sm cursor-pointer"
              >
                Login / Sign up
              </button>
            )}
          </div>

          {/* Mobile: Login button */}
          {!user && !loading && (
            <button
              onClick={handleLoginClick}
              className="md:hidden bg-white text-[#11101d] h-9 px-6 rounded-full text-sm font-semibold hover:bg-gray-100 transition-colors"
            >
              Login
            </button>
          )}
        </div>

        {/* Chat Area or Upload Area */}
        {uploadedBook ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 max-w-5xl mx-auto w-full min-h-0">
              {messages.length === 0 && !isProcessing ? (
                /* Welcome message when book is ready */
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="mb-6">
                    <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                      {uploadedBook.title}
                    </h2>
                    {uploadedBook.author && (
                      <p className="text-gray-600 mb-4">by {uploadedBook.author}</p>
                    )}
                    <p className="text-gray-500 text-sm">
                      ✨ Book is ready! Select a chat mode and start asking questions.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-white border border-gray-200 text-black text-right"
                          : "bg-[#f7f7f7] text-black"
                      }`}
                    >
                      {message.role === "user" ? (
                        <p className="text-base leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                      ) : (
                        <div className="text-base leading-relaxed">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
                              em: ({ children }) => <em className="italic">{children}</em>,
                              ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                              li: ({ children }) => <li className="ml-2">{children}</li>,
                              code: ({ children }) => <code className="bg-gray-200 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>,
                              pre: ({ children }) => <pre className="bg-gray-800 text-white p-3 rounded-lg overflow-x-auto mb-2">{children}</pre>,
                              h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-base font-bold mb-2">{children}</h3>,
                              blockquote: ({ children }) => <blockquote className="border-l-4 border-pink-500 pl-3 italic my-2">{children}</blockquote>,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-[#f7f7f7] rounded-2xl px-4 py-3">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 md:p-4 border-t border-gray-100 max-w-5xl mx-auto w-full" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
              {isProcessing ? (
                <div className="mb-3 flex items-center justify-center gap-2 text-sm text-gray-600 bg-pink-50 py-2 px-4 rounded-lg">
                  <svg
                    className="animate-spin h-4 w-4 text-pink-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>{processingStatus}</span>
                </div>
              ) : (
                <>
                  {/* Desktop Chat Modes */}
                  <motion.div 
                    className="mb-3 hidden md:block"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex gap-2 flex-wrap mb-2">
                      <motion.button
                        onClick={() => setChatMode("book_brain")}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          chatMode === "book_brain"
                            ? "bg-[#ff4ba8] text-white shadow-sm"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        🧠 Book Brain
                      </motion.button>
                      <motion.button
                        onClick={() => setChatMode("author")}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          chatMode === "author"
                            ? "bg-[#ff4ba8] text-white shadow-sm"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        ✍️ Author Mode
                      </motion.button>
                      <motion.button
                        onClick={() => setChatMode("coach")}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          chatMode === "coach"
                            ? "bg-[#ff4ba8] text-white shadow-sm"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        🎯 Coach Mode
                      </motion.button>
                      <motion.button
                        onClick={() => setChatMode("citation")}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          chatMode === "citation"
                            ? "bg-[#ff4ba8] text-white shadow-sm"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        📖 With Citations
                      </motion.button>
                    </div>
                    
                    {/* Mode Description */}
                    <div className="text-xs text-gray-500 px-1">
                      {chatMode === "book_brain" && " Chat with the book's knowledge"}
                      {chatMode === "author" && " Talk as if you're the author"}
                      {chatMode === "coach" && " Get coaching and guidance"}
                      {chatMode === "citation" && " Answers with page references"}
                    </div>
                  </motion.div>

                  {/* Mobile Mode Selector Modal */}
                  <AnimatePresence>
                    {isModeSelectorOpen && (
                      <>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="fixed inset-0 bg-black/50 z-50 md:hidden"
                          onClick={() => setIsModeSelectorOpen(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 20 }}
                          className="fixed bottom-20 left-4 right-4 bg-white rounded-2xl shadow-2xl z-50 p-4 md:hidden"
                        >
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">Choose Chat Mode</h3>
                          <div className="space-y-2">
                            <button
                              onClick={() => {
                                setChatMode("book_brain");
                                setIsModeSelectorOpen(false);
                              }}
                              className={`w-full px-4 py-3 rounded-xl text-left transition-all ${
                                chatMode === "book_brain"
                                  ? "bg-[#ff4ba8] text-white"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              <div className="font-medium">🧠 Book Brain</div>
                              <div className="text-xs opacity-80 mt-0.5">Chat with the book's knowledge</div>
                            </button>
                            <button
                              onClick={() => {
                                setChatMode("author");
                                setIsModeSelectorOpen(false);
                              }}
                              className={`w-full px-4 py-3 rounded-xl text-left transition-all ${
                                chatMode === "author"
                                  ? "bg-[#ff4ba8] text-white"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              <div className="font-medium">✍️ Author Mode</div>
                              <div className="text-xs opacity-80 mt-0.5">Talk as if you're the author</div>
                            </button>
                            <button
                              onClick={() => {
                                setChatMode("coach");
                                setIsModeSelectorOpen(false);
                              }}
                              className={`w-full px-4 py-3 rounded-xl text-left transition-all ${
                                chatMode === "coach"
                                  ? "bg-[#ff4ba8] text-white"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              <div className="font-medium">🎯 Coach Mode</div>
                              <div className="text-xs opacity-80 mt-0.5">Get coaching and guidance</div>
                            </button>
                            <button
                              onClick={() => {
                                setChatMode("citation");
                                setIsModeSelectorOpen(false);
                              }}
                              className={`w-full px-4 py-3 rounded-xl text-left transition-all ${
                                chatMode === "citation"
                                  ? "bg-[#ff4ba8] text-white"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              <div className="font-medium">📖 With Citations</div>
                              <div className="text-xs opacity-80 mt-0.5">Answers with page references</div>
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </>
              )}
              
              {/* Input with Mobile Plus Button */}
              <div className="relative">
                {/* Mobile: Chat mode selector using MobileChatModes component */}
                <div className="md:hidden absolute left-2 top-1/2 -translate-y-1/2 z-10">
                  <MobileChatModes
                    currentMode={chatMode}
                    onModeChange={(mode) => setChatMode(mode)}
                    availableModes={{
                      citation: subscription?.has_citation_mode || false,
                      author: subscription?.has_author_mode || false,
                      coach: subscription?.has_coach_mode || false,
                    }}
                  />
                </div>

                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && !isProcessing && handleSendMessage()}
                  onFocus={() => {
                    // Small delay so mobile keyboard opens and then we scroll the messages into view
                    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 300);
                  }}
                  placeholder={isProcessing ? "Ждем завершения обработки..." : "Ask from book ....."}
                  disabled={isProcessing}
                  className="w-full h-12 md:h-13 bg-[#f7f7f7] border border-black/20 rounded-[23px] pl-12 md:pl-4 pr-12 text-sm outline-none focus:ring-2 focus:ring-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isProcessing}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#ff4ba8] text-white w-10 h-10 rounded-full hover:bg-[#ff3b98] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="currentColor" 
                    className="w-5 h-5 -rotate-45"
                  >
                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                  </svg>
                </button>
              </div>

              {/* Mobile: Disclaimer text */}
              <p className="md:hidden text-center text-[11px] text-black/70 mt-2">
                Librarity might make mistakes
              </p>
            </div>
          </div>
        ) : (
          /* Upload Area */
          <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 gap-6">
            {/* Welcome Message */}
            <div className="text-center max-w-3xl">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                Welcome to Librarity! 📚
              </h1>
              <p className="text-gray-600 text-base md:text-lg mb-6">
                Transform your reading experience with AI. Upload any book and chat with it in <br /> <b>4 intelligent modes:</b>
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <span className="px-4 py-2 bg-[#11101d] text-white rounded-full font-medium text-sm">
                  📖 Book Brain
                </span>
                <span className="px-4 py-2 bg-[#11101d] text-white rounded-full font-medium text-sm">
                  ✍️ Author Mode
                </span>
                <span className="px-4 py-2 bg-[#11101d] text-white rounded-full font-medium text-sm">
                  🎯 Coach Mode
                </span>
                <span className="px-4 py-2 bg-[#11101d] text-white rounded-full font-medium text-sm">
                  📝 With Citations
                </span>
              </div>
            </div>

            {/* Upload Box */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={!isUploading && !isProcessing ? handleUploadClick : undefined}
              className={`border-2 border-dashed rounded-3xl md:rounded-3xl w-full max-w-2xl h-36 md:h-48 flex flex-col items-center justify-center gap-2 md:gap-3 transition-all ${
                isUploading || isProcessing
                  ? "border-pink-500 bg-pink-50"
                  : isDragging
                  ? "border-pink-500 bg-pink-50 scale-[1.02] cursor-pointer"
                  : "border-gray-300 bg-gray-50 hover:border-pink-400 hover:bg-pink-50/50 cursor-pointer"
              }`}
            >
              {isUploading ? (
                // Upload progress
                <div className="w-full px-6 md:px-8 text-center">
                  <div className="mb-3 md:mb-4">
                    <svg
                      className="animate-spin h-10 w-10 md:h-12 md:w-12 mx-auto text-pink-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                  <p className="text-gray-700 font-medium mb-2 text-sm md:text-base">Загрузка книги...</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 md:h-2.5 mb-2">
                    <div
                      className="bg-pink-500 h-2 md:h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-gray-500 text-xs md:text-sm">{uploadProgress}%</p>
                </div>
              ) : isProcessing ? (
                // Processing indicator
                <div className="w-full px-6 md:px-8 text-center">
                  <div className="mb-3 md:mb-4">
                    <svg
                      className="animate-spin h-10 w-10 md:h-12 md:w-12 mx-auto text-pink-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                  <p className="text-gray-700 font-medium mb-2 text-sm md:text-base">{processingStatus}</p>
                  <p className="text-gray-500 text-xs md:text-sm">Создание индексов для AI-поиска...</p>
                </div>
              ) : (
                // Normal upload area
                <>
                  <svg
                    width="50"
                    height="50"
                    viewBox="0 0 85 85"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="opacity-70 md:w-16 md:h-16"
                  >
                    <path
                      d="M42.5 60V25M42.5 25L27.5 40M42.5 25L57.5 40"
                      stroke="#ff5eb1"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M20 70H65"
                      stroke="#ff5eb1"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="text-center px-4">
                    <p className="text-gray-600 text-sm md:text-base font-medium mb-1">
                      Upload book in PDF or Epub format
                    </p>
                    <p className="text-gray-400 text-xs md:text-sm hidden md:block">
                      Click to browse or drag and drop
                    </p>
                  </div>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.epub"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* Upload Book Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-2xl bg-gray-900/95 backdrop-blur-xl border-white/[0.1]">
          <BookUpload
            onUploadSuccess={(book) => {
              setIsUploadOpen(false);
              setUploadedBook({
                id: book.id,
                title: book.title,
                author: book.author,
              });
            }}
            onClose={() => setIsUploadOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Auth Dialog */}
      {isAuthOpen && (
        <Dialog open={isAuthOpen} onOpenChange={setIsAuthOpen}>
          <DialogContent className="sm:max-w-md bg-white border-gray-200 z-[100]">
            <CardDemo onSuccess={handleAuthSuccess} />
          </DialogContent>
        </Dialog>
      )}

      {/* Profile Modal */}
      {isProfileOpen && user && (
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
        />
      )}
    </div>
  );
}
