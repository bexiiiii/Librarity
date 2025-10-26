'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Book, Sparkles, Loader2, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface BookInfo {
  id: string;
  title: string;
  author?: string;
  cover_image_url?: string;
}

interface BookChatProps {
  onUploadClick?: () => void;
}

export function BookChat({ onUploadClick }: BookChatProps) {
  const [books, setBooks] = useState<BookInfo[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingBooks, setIsFetchingBooks] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Загрузка книг при монтировании
  useEffect(() => {
    loadBooks();
  }, []);

  // Автоскролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadBooks = async () => {
    try {
      setIsFetchingBooks(true);
      const response = await api.getBooks(1, 50);
      setBooks(response.items || []);
      if (response.items && response.items.length > 0) {
        setSelectedBook(response.items[0]);
      }
    } catch (error) {
      console.error('Failed to load books:', error);
    } finally {
      setIsFetchingBooks(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedBook || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await api.chatWithBook({
        book_id: selectedBook.id,
        message: inputValue,
        session_id: sessionId || undefined,
        mode: 'default',
        include_citations: true,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response || response.ai_response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (response.session_id && !sessionId) {
        setSessionId(response.session_id);
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Ошибка: ${error.message || 'Не удалось получить ответ'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen flex flex-col w-full items-center justify-center bg-transparent text-white p-4 sm:p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse delay-700" />
        <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-fuchsia-500/10 rounded-full mix-blend-normal filter blur-[96px] animate-pulse delay-1000" />
      </div>

      <div className="w-full max-w-4xl mx-auto relative flex flex-col h-[90vh]">
        {/* Book Selector */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6"
        >
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.1] rounded-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white/80 flex items-center gap-2">
                <Book className="w-4 h-4" />
                Выберите книгу
              </h3>
              <Button
                onClick={onUploadClick}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Загрузить
              </Button>
            </div>

            {isFetchingBooks ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              </div>
            ) : books.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-white/60 text-sm mb-4">
                  У вас пока нет загруженных книг
                </p>
                <Button
                  onClick={onUploadClick}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Загрузить первую книгу
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {books.map((book) => (
                  <motion.button
                    key={book.id}
                    onClick={() => {
                      setSelectedBook(book);
                      setMessages([]);
                      setSessionId(null);
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      p-4 rounded-xl border text-left transition-all
                      ${selectedBook?.id === book.id
                        ? 'bg-purple-600/20 border-purple-500/50'
                        : 'bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.05]'
                      }
                    `}
                  >
                    <h4 className="font-medium text-white text-sm mb-1 line-clamp-1">
                      {book.title}
                    </h4>
                    {book.author && (
                      <p className="text-xs text-white/60 line-clamp-1">
                        {book.author}
                      </p>
                    )}
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Chat Messages */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 bg-white/[0.03] backdrop-blur-xl border border-white/[0.1] rounded-2xl p-4 sm:p-6 overflow-hidden flex flex-col"
        >
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {selectedBook && messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Готовы обсудить "{selectedBook.title}"?
                </h3>
                <p className="text-sm text-white/60 max-w-md">
                  Задайте любой вопрос о содержании книги, попросите краткое изложение или попросите AI помочь вам понять сложные концепции
                </p>
              </div>
            )}

            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`
                      max-w-[80%] rounded-2xl px-4 py-3 text-sm
                      ${message.role === 'user'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                        : 'bg-white/[0.05] text-white/90'
                      }
                    `}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white/[0.05]">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                    <span className="text-sm text-white/60">AI думает...</span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          {selectedBook && (
            <div className="relative">
              <div className="flex items-end gap-2 bg-white/[0.03] border border-white/[0.1] rounded-2xl p-3">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Напишите ваш вопрос о книге..."
                  rows={1}
                  className="flex-1 bg-transparent text-white placeholder:text-white/40 focus:outline-none resize-none max-h-32 text-sm"
                  style={{ height: 'auto' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                  }}
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  size="icon"
                  className="flex-shrink-0 w-9 h-9 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-white/40 mt-2 text-center">
                Нажмите Enter для отправки, Shift+Enter для новой строки
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
