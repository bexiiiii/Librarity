"use client";

import { useEffect, useRef, useCallback, useTransition, useState } from "react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    ImageIcon,
    FileUp,
    Figma,
    MonitorIcon,
    CircleUserRound,
    ArrowUpIcon,
    Paperclip,
    PlusIcon,
    SendIcon,
    XIcon,
    LoaderIcon,
    Sparkles,
    Command,
    Share2,
    Upload,
    Brain,
    User,
    GraduationCap,
    Quote,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as React from "react"
import { ShareAnswerCard } from "./share-answer-card-v2";
import { Dialog, DialogTrigger, DialogContent } from './dialog';
import CardDemo from './card-studio';

interface UseAutoResizeTextareaProps {
    minHeight: number;
    maxHeight?: number;
}

function useAutoResizeTextarea({
    minHeight,
    maxHeight,
}: UseAutoResizeTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback(
        (reset?: boolean) => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            if (reset) {
                textarea.style.height = `${minHeight}px`;
                return;
            }

            textarea.style.height = `${minHeight}px`;
            const newHeight = Math.max(
                minHeight,
                Math.min(
                    textarea.scrollHeight,
                    maxHeight ?? Number.POSITIVE_INFINITY
                )
            );

            textarea.style.height = `${newHeight}px`;
        },
        [minHeight, maxHeight]
    );

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = `${minHeight}px`;
        }
    }, [minHeight]);

    useEffect(() => {
        const handleResize = () => adjustHeight();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [adjustHeight]);

    return { textareaRef, adjustHeight };
}

interface CommandSuggestion {
    icon: React.ReactNode;
    label: string;
    description: string;
    prefix: string;
}

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  containerClassName?: string;
  showRing?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, containerClassName, showRing = true, ...props }, ref) => {
    const [isMounted, setIsMounted] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);
    
    React.useEffect(() => {
      setIsMounted(true);
    }, []);
    
    return (
      <div className={cn(
        "relative",
        containerClassName
      )}>
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
            "transition-all duration-200 ease-in-out",
            "placeholder:text-muted-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
            className
          )}
          ref={ref}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        
        {isMounted && showRing && isFocused && (
          <motion.span 
            className="absolute inset-0 rounded-md pointer-events-none ring-2 ring-offset-0 ring-violet-500/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

interface AnimatedAIChatProps {
    onUploadClick?: () => void;
    uploadedBook?: { id?: string; title: string; author?: string; is_processed?: boolean } | null;
    onRemoveBook?: () => void;
    currentSessionId?: string | null | undefined;
    onBookRestore?: (book: { id: string; title: string; author?: string; is_processed?: boolean }) => void;
    isAuthenticated?: boolean;
    onShareClick?: () => void;
    onToggleSidebar?: () => void;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export function AnimatedAIChat({ onUploadClick, uploadedBook, onRemoveBook, currentSessionId, onBookRestore, isAuthenticated, onShareClick, onToggleSidebar }: AnimatedAIChatProps) {
    const [value, setValue] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [attachments, setAttachments] = useState<string[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [selectedShare, setSelectedShare] = useState<{ question: string; answer: string } | null>(null);
    const [isPending, startTransition] = useTransition();
    const [activeSuggestion, setActiveSuggestion] = useState<number>(-1);
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [recentCommand, setRecentCommand] = useState<string | null>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState<string>('');
    const [showLoginDialog, setShowLoginDialog] = useState(false);
    const [chatMode, setChatMode] = useState<'book_brain' | 'author' | 'coach' | 'citation'>('book_brain');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 60,
        maxHeight: 200,
    });
    const [inputFocused, setInputFocused] = useState(false);
    const commandPaletteRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // Debug: отслеживаем изменения uploadedBook
    useEffect(() => {
        console.log('uploadedBook changed:', uploadedBook);
    }, [uploadedBook]);

    // Периодическая проверка статуса обработки книги
    useEffect(() => {
        if (!uploadedBook?.id || uploadedBook.is_processed !== false) {
            return; // Книга уже обработана или не загружена
        }

        console.log('Starting book processing check for:', uploadedBook.id);
        const checkInterval = setInterval(async () => {
            try {
                const bookData = await api.getBook(uploadedBook.id!);
                console.log('Book status check:', bookData);
                
                if (bookData.is_processed) {
                    console.log('Book processing completed!');
                    // Обновляем книгу через onBookRestore
                    if (onBookRestore) {
                        onBookRestore({
                            id: bookData.id,
                            title: bookData.title,
                            author: bookData.author,
                            is_processed: true
                        });
                    }
                    // Останавливаем проверку
                    clearInterval(checkInterval);
                }
            } catch (error) {
                console.error('Failed to check book status:', error);
            }
        }, 5000); // Проверяем каждые 5 секунд

        // Очистка интервала при размонтировании или изменении книги
        return () => clearInterval(checkInterval);
    }, [uploadedBook?.id, uploadedBook?.is_processed, onBookRestore]);

    const commandSuggestions: CommandSuggestion[] = [
        { 
            icon: <ImageIcon className="w-4 h-4" />, 
            label: "Clone UI", 
            description: "Generate a UI from a screenshot", 
            prefix: "/clone" 
        },
        { 
            icon: <Figma className="w-4 h-4" />, 
            label: "Import Figma", 
            description: "Import a design from Figma", 
            prefix: "/figma" 
        },
        { 
            icon: <MonitorIcon className="w-4 h-4" />, 
            label: "Create Page", 
            description: "Generate a new web page", 
            prefix: "/page" 
        },
        { 
            icon: <Sparkles className="w-4 h-4" />, 
            label: "Improve", 
            description: "Improve existing UI design", 
            prefix: "/improve" 
        },
    ];

    // Конфигурация режимов чата
    const chatModes = [
        {
            value: 'book_brain' as const,
            label: 'Book Brain',
            icon: <Brain className="w-4 h-4" />,
            description: 'Chat with book knowledge'
        },
        {
            value: 'author' as const,
            label: 'Author Mode',
            icon: <User className="w-4 h-4" />,
            description: 'Chat as the author'
        },
        {
            value: 'coach' as const,
            label: 'AI Coach',
            icon: <GraduationCap className="w-4 h-4" />,
            description: 'AI coaching mode'
        },
        {
            value: 'citation' as const,
            label: 'With Citations',
            icon: <Quote className="w-4 h-4" />,
            description: 'Answers with page references'
        }
    ];

    useEffect(() => {
        if (value.startsWith('/') && !value.includes(' ')) {
            setShowCommandPalette(true);
            
            const matchingSuggestionIndex = commandSuggestions.findIndex(
                (cmd) => cmd.prefix.startsWith(value)
            );
            
            if (matchingSuggestionIndex >= 0) {
                setActiveSuggestion(matchingSuggestionIndex);
            } else {
                setActiveSuggestion(-1);
            }
        } else {
            setShowCommandPalette(false);
        }
    }, [value]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    const loadChatHistory = useCallback(async (sessionIdToLoad: string) => {
        setIsLoadingHistory(true);
        try {
            const history = await api.getChatHistory(sessionIdToLoad);
            console.log('Chat history from API:', history);
            if (history && Array.isArray(history.messages)) {
                // Backend теперь возвращает плоский список сообщений с ролями
                const formattedMessages: Message[] = history.messages.map((msg: any) => ({
                    role: msg.role as 'user' | 'assistant',
                    content: msg.content
                }));
                console.log('Formatted messages:', formattedMessages);
                setMessages(formattedMessages);
                setSessionId(sessionIdToLoad);
                
                // Восстанавливаем информацию о книге из session
                // Можно добавить отдельный API endpoint для получения book_id по session_id
                // Пока используем существующую логику если она есть
                
                // Сохраняем в localStorage
                if (typeof window !== 'undefined') {
                    localStorage.setItem('current_session_id', sessionIdToLoad);
                    localStorage.setItem('chat_messages', JSON.stringify(formattedMessages));
                }
            }
        } catch (error: any) {
            console.error('Failed to load chat history:', error);
            // Если 401 - пользователь не авторизован, очищаем данные
            if (error?.status === 401 || error?.message?.includes('401')) {
                console.log('User unauthorized, clearing session data');
                setMessages([]);
                setSessionId(null);
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('current_session_id');
                    localStorage.removeItem('chat_messages');
                    localStorage.removeItem('uploaded_book');
                }
                // Можно также показать уведомление или перенаправить на страницу входа
            }
        } finally {
            setIsLoadingHistory(false);
        }
    }, [onBookRestore]);

    // Загрузка истории при изменении currentSessionId
    useEffect(() => {
        if (currentSessionId && currentSessionId !== sessionId) {
            loadChatHistory(currentSessionId);
        } else if (currentSessionId === null && sessionId !== null) {
            // Новый чат - очищаем
            setMessages([]);
            setSessionId(null);
            if (typeof window !== 'undefined') {
                localStorage.removeItem('current_session_id');
            }
        }
    }, [currentSessionId, sessionId, loadChatHistory]);

    // Восстановление sessionId при загрузке (только если нет currentSessionId)
    useEffect(() => {
        if (typeof window !== 'undefined' && currentSessionId === undefined) {
            const savedSessionId = localStorage.getItem('current_session_id');
            if (savedSessionId) {
                loadChatHistory(savedSessionId);
            }
        }
    }, [currentSessionId, loadChatHistory]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const commandButton = document.querySelector('[data-command-button]');
            
            if (commandPaletteRef.current && 
                !commandPaletteRef.current.contains(target) && 
                !commandButton?.contains(target)) {
                setShowCommandPalette(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showCommandPalette) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveSuggestion(prev => 
                    prev < commandSuggestions.length - 1 ? prev + 1 : 0
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveSuggestion(prev => 
                    prev > 0 ? prev - 1 : commandSuggestions.length - 1
                );
            } else if (e.key === 'Tab' || e.key === 'Enter') {
                e.preventDefault();
                if (activeSuggestion >= 0) {
                    const selectedCommand = commandSuggestions[activeSuggestion];
                    setValue(selectedCommand.prefix + ' ');
                    setShowCommandPalette(false);
                    
                    setRecentCommand(selectedCommand.label);
                    setTimeout(() => setRecentCommand(null), 3500);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setShowCommandPalette(false);
            }
        } else if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (value.trim()) {
                handleSendMessage();
            }
        }
    };

    const handleSendMessage = async () => {
        console.log('handleSendMessage called');
        console.log('value:', value);
        console.log('uploadedBook:', uploadedBook);
        console.log('uploadedBook?.id:', uploadedBook?.id);
        
        if (!value.trim() || !uploadedBook?.id) {
            if (!uploadedBook?.id) {
                console.error('Book not uploaded or missing ID');
                alert('Please upload a book first');
            }
            return;
        }

        // Проверка: книга должна быть обработана
        if (uploadedBook?.is_processed === false) {
            console.warn('Book is still processing');
            alert('Пожалуйста, подождите. Книга еще обрабатывается...');
            return;
        }

        const userMessage = value.trim();
        
        // Добавляем сообщение пользователя
        const userMsg = { role: 'user' as const, content: userMessage };
        console.log('Adding user message:', userMsg);
        setMessages(prev => {
            const newMessages = [...prev, userMsg];
            console.log('Messages after adding user:', newMessages);
            return newMessages;
        });
        setValue("");
        adjustHeight(true);
        setIsTyping(true);

        try {
            // Отправляем запрос в API
            const response = await api.chatWithBook({
                book_id: uploadedBook.id,
                message: userMessage,
                session_id: sessionId || undefined,
                mode: chatMode,
                include_citations: chatMode === 'citation'
            });

            // Сохраняем session_id если это первое сообщение
            if (response.session_id && !sessionId) {
                const newSessionId = response.session_id;
                console.log('New session created:', newSessionId);
                setSessionId(newSessionId);
                // Сохраняем в localStorage
                if (typeof window !== 'undefined') {
                    localStorage.setItem('current_session_id', newSessionId);
                }
                // Обновляем currentChatId в родительском компоненте
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('session-created', { detail: { sessionId: newSessionId } }));
                }
            }

            // Добавляем ответ ассистента
            console.log('Adding assistant message:', response.ai_response);
            setMessages(prev => {
                const newMessages: Message[] = [...prev, { role: 'assistant' as const, content: response.ai_response }];
                console.log('New messages array:', newMessages);
                return newMessages;
            });

            // Отправляем событие для обновления списка чатов в sidebar
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('chat-message-sent', { 
                    detail: { sessionId: sessionId || response.session_id } 
                }));
            }
        } catch (error: any) {
            console.error('Chat error:', error);
            
            // Если 401 - пользователь не авторизован
            if (error?.status === 401 || error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
                console.log('User unauthorized during chat, clearing data and showing login');
                // Очищаем локальные данные
                setMessages([]);
                setSessionId(null);
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('current_session_id');
                    localStorage.removeItem('chat_messages');
                    localStorage.removeItem('uploaded_book');
                }
                // Показываем сообщение об ошибке авторизации
                alert('Your session has expired. Please log in again.');
            } else {
                // Обычная ошибка
                setMessages(prev => [...prev, { 
                    role: 'assistant' as const, 
                    content: `Error: ${error.message || 'Failed to get response. Please try again.'}` 
                }]);
            }
        } finally {
            setIsTyping(false);
        }
    };

    // Автоскролл к последнему сообщению
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Сохранение сообщений в localStorage
    useEffect(() => {
        if (messages.length > 0 && typeof window !== 'undefined') {
            localStorage.setItem('chat_messages', JSON.stringify(messages));
        }
    }, [messages]);

    // Восстановление сообщений из localStorage при загрузке
    useEffect(() => {
        // Только восстанавливаем если пользователь авторизован
        if (typeof window !== 'undefined' && !currentSessionId && messages.length === 0 && isAuthenticated) {
            const savedMessages = localStorage.getItem('chat_messages');
            if (savedMessages) {
                try {
                    const parsed = JSON.parse(savedMessages);
                    console.log('Restored messages from localStorage:', parsed);
                    // Проверяем структуру каждого сообщения
                    parsed.forEach((msg: any, idx: number) => {
                        console.log(`Restored message ${idx}:`, msg, 'role:', msg.role);
                    });
                    setMessages(parsed);
                } catch (error) {
                    console.error('Failed to restore messages:', error);
                    // Очищаем поврежденные данные
                    localStorage.removeItem('chat_messages');
                }
            }
        } else if (!isAuthenticated) {
            // Если пользователь не авторизован - очищаем все данные
            console.log('User not authenticated, clearing local data');
            setMessages([]);
            setSessionId(null);
            if (typeof window !== 'undefined') {
                localStorage.removeItem('chat_messages');
                localStorage.removeItem('current_session_id');
            }
        }
    }, [isAuthenticated]);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Проверка типа файла
        const validTypes = ['application/pdf', 'application/epub+zip'];
        if (!validTypes.includes(file.type) && !file.name.endsWith('.epub')) {
            alert('Please upload a PDF or EPUB file');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setUploadStatus('Uploading file...');

        try {
            // Симуляция прогресса загрузки
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 200);

            const response = await api.uploadBook(file);
            
            console.log('API response:', response);
            console.log('response.id:', response.id);
            
            clearInterval(progressInterval);
            setUploadProgress(100);
            setUploadStatus('Book uploaded successfully!');

            // Сохраняем информацию о книге - backend возвращает id, а не book_id
            const bookData = {
                id: response.id,
                title: response.title || file.name,
                author: response.author
            };

            console.log('Book uploaded successfully:', bookData);

            // Сохраняем в localStorage СРАЗУ
            if (typeof window !== 'undefined') {
                localStorage.setItem('uploaded_book', JSON.stringify(bookData));
            }

            // Передаем книгу в родительский компонент
            if (onBookRestore) {
                console.log('Calling onBookRestore with:', bookData);
                onBookRestore(bookData);
            }

            // Сбрасываем состояние загрузки
            setTimeout(() => {
                setIsUploading(false);
                setUploadProgress(0);
                setUploadStatus('');
                // Сбрасываем input для возможности загрузить другой файл
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }, 1500);

        } catch (error: any) {
            console.error('Upload error:', error);
            setUploadStatus(`Error: ${error.message || 'Failed to upload book'}`);
            setTimeout(() => {
                setIsUploading(false);
                setUploadProgress(0);
                setUploadStatus('');
            }, 3000);
        }
    };

    const handleAttachFile = () => {
        // Если пользователь не авторизован, показываем модалку входа
        if (!isAuthenticated) {
            setShowLoginDialog(true);
            return;
        }
        fileInputRef.current?.click();
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };
    
    const handleShareAnswer = (userQuestion: string, aiAnswer: string) => {
        setSelectedShare({ question: userQuestion, answer: aiAnswer });
        setShareDialogOpen(true);
    };
    
    const selectCommandSuggestion = (index: number) => {
        const selectedCommand = commandSuggestions[index];
        setValue(selectedCommand.prefix + ' ');
        setShowCommandPalette(false);
        
        setRecentCommand(selectedCommand.label);
        setTimeout(() => setRecentCommand(null), 2000);
    };

    return (
        <>
            {/* Desktop Version - предыдущий дизайн с темным фоном и белой областью */}
            <div className="hidden md:flex min-h-screen flex-col w-full items-start justify-start bg-[#24252d] text-black p-4 md:p-6 relative overflow-hidden">
                <div className="w-full h-full bg-white rounded-[24px] shadow-2xl relative overflow-hidden flex flex-col">
                    {/* Desktop: Login/Share buttons inside white area */}
                    {!isAuthenticated && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="absolute top-4 right-4 z-50"
                        >
                            <Dialog>
                                <DialogTrigger asChild>
                                    <motion.button
                                        
                                        className="px-6 py-2.5 bg-[#eb6a48] hover:bg-[#d85a38] rounded-xl transition-colors text-white font-semibold text-base"
                                    >
                                        Login / Sign up
                                    </motion.button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md bg-white">
                                    <CardDemo />
                                </DialogContent>
                            </Dialog>
                        </motion.div>
                    )}
                    
                    {isAuthenticated && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onShareClick}
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="absolute top-4 right-4 z-50 px-6 py-2.5 bg-[#eb6a48] hover:bg-[#d85a38] rounded-xl transition-colors text-white font-semibold text-base shadow-lg"
                        >
                            Share
                        </motion.button>
                    )}
                    
                    <motion.div 
                        className="relative z-10 flex flex-col h-full p-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                    >
                    {/* Content Area - Scrollable when there are messages */}
                    <div className={cn(
                        "flex-1",
                        messages.length > 0 ? "overflow-y-auto" : "flex items-center justify-center"
                    )}>
                    {/* Welcome Screen - показывается когда нет книги */}
                    {messages.length === 0 && !uploadedBook && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="w-full max-w-2xl text-center space-y-6 px-4"
                        >
                                {/* Welcome Message */}
                                <div className="space-y-3">
                                    <motion.h1 
                                        className="text-3xl md:text-4xl font-bold text-black"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3, duration: 0.6 }}
                                    >
                                        Welcome to Librarity! 📚
                                    </motion.h1>
                                    <motion.p 
                                        className="text-base md:text-lg text-black/60 max-w-xl mx-auto"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4, duration: 0.6 }}
                                    >
                                        Upload your book and start a conversation with it. 
                                        Ask questions, get summaries, and explore ideas together!
                                    </motion.p>
                                </div>

                                {/* Hidden File Input */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.epub"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />

                                {/* Upload Button or Progress */}
                                {!isUploading ? (
                                    <motion.button
                                        onClick={handleAttachFile}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5, duration: 0.6 }}
                                        className="w-full flex flex-col items-center gap-4 px-8 py-12 border-2 border-dashed border-black/20 hover:border-[#eb6a48]/50 rounded-2xl transition-all bg-[#f7f7f7] hover:bg-[#f0f0f0]"
                                    >
                                        <div className="w-16 h-16 flex items-center justify-center">
                                            <svg width="85" height="85" viewBox="0 0 85 85" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                                                <path d="M53.125 21.25V31.875C53.125 33.3832 53.7241 34.8296 54.7884 35.8939C55.8527 36.9582 57.2991 37.5573 58.8073 37.5573H69.4323" stroke="#EB6A48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                <path d="M60.5208 63.75H24.4792C22.971 63.75 21.5246 63.1509 20.4603 62.0866C19.396 61.0223 18.7969 59.5759 18.7969 58.0677V26.9323C18.7969 25.4241 19.396 23.9777 20.4603 22.9134C21.5246 21.8491 22.971 21.25 24.4792 21.25H53.125L66.2031 34.3281V58.0677C66.2031 59.5759 65.604 61.0223 64.5397 62.0866C63.4754 63.1509 62.029 63.75 60.5208 63.75Z" stroke="#EB6A48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                <path d="M42.5 35.4167V56.25M42.5 35.4167L35.4167 42.5M42.5 35.4167L49.5833 42.5" stroke="#EB6A48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </div>
                                        <div className="space-y-1.5">
                                            <p className="text-sm text-black/60 font-medium">
                                                Upload book in PDF or Epub format
                                            </p>
                                            <p className="text-xs text-black/40">
                                                Click here to get started
                                            </p>
                                        </div>
                                    </motion.button>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="w-full flex flex-col items-center gap-5 px-8 py-12 border-2 border-dashed border-[#eb6a48]/50 rounded-2xl bg-[#f7f7f7]"
                                    >
                                        <div className="w-full max-w-md space-y-4">
                                            {/* Progress Bar */}
                                            <div className="space-y-3">
                                                <div className="flex justify-between text-sm sm:text-base">
                                                    <span className="text-black/70 font-medium">{uploadStatus}</span>
                                                    <span className="text-[#eb6a48] font-semibold">{uploadProgress}%</span>
                                                </div>
                                                <div className="w-full h-2.5 bg-black/10 rounded-full overflow-hidden">
                                                    <motion.div
                                                        className="h-full bg-[#eb6a48]"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${uploadProgress}%` }}
                                                        transition={{ duration: 0.3 }}
                                                    />
                                                </div>
                                            </div>
                                            
                                            {/* Loading Icon */}
                                            <div className="flex justify-center">
                                                <LoaderIcon className="w-10 h-10 sm:w-12 sm:h-12 text-[#eb6a48] animate-spin" />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                    )}

                    {/* Messages Area */}
                    {messages.length > 0 && (
                        <div 
                            ref={messagesContainerRef}
                            className="flex flex-col flex-1 overflow-y-auto mb-4 sm:mb-6 space-y-3 sm:space-y-4 pr-1 sm:pr-2 scrollbar-thin scrollbar-thumb-black/10 scrollbar-track-transparent hover:scrollbar-thumb-black/20"
                            style={{ maxHeight: 'calc(100vh - 300px)' }}
                        >
                            {isLoadingHistory ? (
                                <div className="flex items-center justify-center py-12">
                                    <LoaderIcon className="w-6 h-6 text-white/40 animate-spin" />
                                </div>
                            ) : (
                                <>
                                    {messages.map((message, index) => {
                                        const isUserMessage = message.role === 'user';
                                        const isAssistantMessage = message.role === 'assistant';
                                        
                                        return (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="flex gap-2 sm:gap-3 w-full"
                                            style={{
                                                justifyContent: isUserMessage ? 'flex-end' : 'flex-start'
                                            }}
                                        >
                                            <div className="flex flex-col gap-2 max-w-[85%] sm:max-w-[80%]">
                                                {/* Бейдж книги для AI ответов (сверху) */}
                                                {isAssistantMessage && uploadedBook && (
                                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#eb6a48] rounded-xl w-fit">
                                                        <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                                                            <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
                                                                <path d="M16.875 6.75V10.125C16.875 10.6223 17.0725 11.0992 17.4242 11.4508C17.7758 11.8025 18.2527 12 18.75 12H22.125" stroke="#EB6A48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                                <path d="M19.2188 20.25H7.78125C7.284 20.25 6.80707 20.0525 6.45543 19.7008C6.10379 19.3492 5.90625 18.8723 5.90625 18.375V8.625C5.90625 8.12774 6.10379 7.65081 6.45543 7.29917C6.80707 6.94754 7.284 6.75 7.78125 6.75H16.875L21.0938 10.9688V18.375C21.0938 18.8723 20.8962 19.3492 20.5446 19.7008C20.1929 20.0525 19.716 20.25 19.2188 20.25Z" stroke="#EB6A48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                            </svg>
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-white font-medium text-xs truncate">
                                                                {uploadedBook.title}
                                                            </span>
                                                            {uploadedBook.author && (
                                                                <span className="text-white/70 text-xs truncate">
                                                                    {uploadedBook.author}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                <div
                                                    className={cn(
                                                        "px-3 py-2.5 rounded-xl",
                                                        isUserMessage
                                                            ? 'bg-[#eb6a48] text-white rounded-br-md'  // User справа
                                                            : 'bg-[#f7f7f7] text-black rounded-bl-md'  // AI слева
                                                    )}
                                                >
                                                    {isUserMessage ? (
                                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                                    ) : (
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkGfm]}
                                                            components={{
                                                                strong: ({ children }) => (
                                                                    <strong className="font-bold text-black">{children}</strong>
                                                                ),
                                                                em: ({ children }) => (
                                                                    <em className="italic text-black/80">{children}</em>
                                                                ),
                                                                ul: ({ children }) => (
                                                                    <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>
                                                                ),
                                                                ol: ({ children }) => (
                                                                    <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>
                                                                ),
                                                                li: ({ children }) => (
                                                                    <li className="ml-2">{children}</li>
                                                                ),
                                                                h1: ({ children }) => (
                                                                    <h1 className="text-lg font-bold text-black mb-2 mt-3">{children}</h1>
                                                                ),
                                                                h2: ({ children }) => (
                                                                    <h2 className="text-base font-bold text-black mb-2 mt-2">{children}</h2>
                                                                ),
                                                                h3: ({ children }) => (
                                                                    <h3 className="text-sm font-bold text-black mb-1 mt-2">{children}</h3>
                                                                ),
                                                                blockquote: ({ children }) => (
                                                                    <blockquote className="border-l-4 border-[#eb6a48] pl-4 italic my-2 text-black/70">
                                                                        {children}
                                                                    </blockquote>
                                                                ),
                                                                code: ({ children }) => (
                                                                    <code className="bg-black/10 px-1.5 py-0.5 rounded text-[#eb6a48] text-sm">
                                                                        {children}
                                                                    </code>
                                                                ),
                                                                p: ({ children }) => (
                                                                    <p className="text-sm leading-relaxed mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>
                                                                ),
                                                            }}
                                                        >
                                                            {message.content}
                                                        </ReactMarkdown>
                                                    )}
                                                </div>
                                                
                                                {/* Share button for assistant messages */}
                                                {isAssistantMessage && index > 0 && (
                                                    <motion.button
                                                        onClick={() => handleShareAnswer(messages[index - 1].content, message.content)}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: 0.2 }}
                                                        className="flex items-center gap-1.5 px-2.5 py-1 bg-black/5 hover:bg-black/10 rounded-lg text-black/60 hover:text-black/80 text-xs transition-all w-fit"
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                    >
                                                        <Share2 className="w-3 h-3" />
                                                        <span>Share Answer</span>
                                                    </motion.button>
                                                )}
                                            </div>
                                        </motion.div>
                                    )})}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>
                    )}

                    {/* Input Area - показывается только когда книга загружена */}
                    {uploadedBook && (
                    <motion.div 
                        className="relative bg-[#f7f7f7] border border-black/10 rounded-xl shadow-sm mt-3"
                        initial={{ scale: 0.98 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        {/* Mode Selector */}
                        <div className="px-3 pt-3 pb-2 border-b border-black/5">
                            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                                {chatModes.map((mode) => (
                                    <motion.button
                                        key={mode.value}
                                        onClick={() => setChatMode(mode.value)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className={cn(
                                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap text-xs font-medium",
                                            chatMode === mode.value
                                                ? "bg-[#eb6a48] text-white shadow-sm"
                                                : "bg-white text-black/60 hover:bg-white/80 hover:text-black/80"
                                        )}
                                        title={mode.description}
                                    >
                                        {mode.icon}
                                        <span>{mode.label}</span>
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                        <div className="p-3">
                            <Textarea
                                ref={textareaRef}
                                value={value}
                                onChange={(e) => {
                                    setValue(e.target.value);
                                    adjustHeight();
                                }}
                                onKeyDown={handleKeyDown}
                                onFocus={() => setInputFocused(true)}
                                onBlur={() => setInputFocused(false)}
                                placeholder={
                                    uploadedBook?.is_processed === false 
                                        ? "Книга обрабатывается... пожалуйста подождите" 
                                        : "Ask a question..."
                                }
                                disabled={uploadedBook?.is_processed === false}
                                containerClassName="w-full"
                                className={cn(
                                    "w-full px-3 py-2 sm:px-4 sm:py-3",
                                    "resize-none",
                                    "bg-transparent",
                                    "border-none",
                                    "text-black text-sm sm:text-base",
                                    "focus:outline-none",
                                    "placeholder:text-black/40",
                                    "min-h-[50px] sm:min-h-[60px]"
                                )}
                                style={{
                                    overflow: "hidden",
                                }}
                                showRing={false}
                            />
                        </div>

                        <AnimatePresence>
                            {uploadedBook && (
                                <motion.div 
                                    className="px-3 sm:px-4 pb-2 sm:pb-3 flex gap-2 flex-wrap"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
                                    <motion.div
                                        className="flex items-center gap-2 text-xs sm:text-sm bg-black/5 py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg text-black"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                    >
                                        <FileUp className="w-4 h-4 text-[#eb6a48]" />
                                        <div className="flex flex-col">
                                            <span className="font-medium">{uploadedBook.title}</span>
                                            {uploadedBook.author && (
                                                <span className="text-black/60 text-xs">{uploadedBook.author}</span>
                                            )}
                                            {uploadedBook.is_processed === false && (
                                                <span className="text-orange-600 text-xs font-medium animate-pulse">
                                                    Обработка книги... пожалуйста подождите
                                                </span>
                                            )}
                                        </div>
                                        <button 
                                            onClick={onRemoveBook}
                                            className="ml-2 text-black/40 hover:text-black transition-colors"
                                        >
                                            <XIcon className="w-3 h-3" />
                                        </button>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="p-4 border-t border-black/5 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <motion.button
                                    type="button"
                                    onClick={handleAttachFile}
                                    whileTap={{ scale: 0.94 }}
                                    className="p-2 text-black/40 hover:text-black/90 rounded-lg transition-colors relative group"
                                >
                                    <Paperclip className="w-5 h-5" />
                                </motion.button>
                            </div>
                            
                            <motion.button
                                type="button"
                                onClick={handleSendMessage}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                disabled={isTyping || !value.trim() || uploadedBook?.is_processed === false}
                                className={cn(
                                    "px-5 py-2.5 rounded-lg text-base font-medium transition-all",
                                    "flex items-center gap-2",
                                    value.trim() && uploadedBook?.is_processed !== false
                                        ? "bg-[#eb6a48] hover:bg-[#d85a38] text-white"
                                        : "bg-black/5 text-black/40 cursor-not-allowed"
                                )}
                            >
                                {isTyping ? (
                                    <LoaderIcon className="w-5 h-5 animate-[spin_2s_linear_infinite]" />
                                ) : (
                                    <SendIcon className="w-5 h-5" />
                                )}
                                <span>Send</span>
                            </motion.button>
                        </div>
                    </motion.div>
                    )}

                </div>
                {/* End of Content Area */}

                    </motion.div>
                </div>
            </div>
            
            {/* Typing Indicator */}
            <AnimatePresence>
                {isTyping && (
                    <motion.div 
                        className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white border border-black/10 rounded-full px-4 py-2 shadow-lg z-50"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-7 rounded-full bg-[#eb6a48] flex items-center justify-center text-center">
                                <span className="text-xs font-medium text-white mb-0.5">AI</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-black/70">
                                <span>Thinking</span>
                                <TypingDots />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Share Dialog */}
            <AnimatePresence>
                {shareDialogOpen && selectedShare && uploadedBook && (
                    <ShareAnswerCard
                        question={selectedShare.question}
                        answer={selectedShare.answer}
                        bookTitle={uploadedBook.title}
                        bookAuthor={uploadedBook.author}
                        onClose={() => {
                            setShareDialogOpen(false);
                            setSelectedShare(null);
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Login Dialog - для неавторизованных пользователей */}
            <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
                <DialogContent className="sm:max-w-md bg-white">
                    <CardDemo />
                </DialogContent>
            </Dialog>

            {/* Mobile Version - новый дизайн с белым фоном и темной шапкой */}
            <div className="md:hidden min-h-screen flex flex-col w-full items-center justify-start bg-white text-black relative overflow-hidden">
                {/* Header - темная шапка */}
                <motion.div 
                    className="w-[calc(100%-24px)] bg-[#24252d] h-[59px] px-4 flex items-center justify-between relative z-50 rounded-[23px] mt-3"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    {/* Sidebar Icon */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onToggleSidebar}
                        className="w-8 h-8 flex items-center justify-center"
                    >
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 9.33333H24M8 16H24M8 22.6667H24" stroke="#EB6A48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </motion.button>

                    {/* Login Button or Librarity Text */}
                    {!isAuthenticated ? (
                        <Dialog>
                            <DialogTrigger asChild>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-6 py-2 bg-white hover:bg-gray-100 rounded-[17px] transition-colors text-black font-semibold text-base"
                                >
                                    Login
                                </motion.button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md bg-white">
                                <CardDemo />
                            </DialogContent>
                        </Dialog>
                    ) : (
                        <p className="text-white font-semibold text-base">
                            Librarity
                        </p>
                    )}
                </motion.div>

                {/* Mobile Content - с приветственным сообщением */}
                <div className="flex-1 w-full flex items-center justify-center p-4">
                    {!uploadedBook ? (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="w-full max-w-md text-center space-y-5"
                        >
                            {/* Welcome Message */}
                            <div className="space-y-2.5">
                                <motion.h1 
                                    className="text-2xl font-bold text-black"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3, duration: 0.6 }}
                                >
                                    Welcome to Librarity! 📚
                                </motion.h1>
                                <motion.p 
                                    className="text-sm text-black/60"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4, duration: 0.6 }}
                                >
                                    Upload your book and start a conversation with it. 
                                    Ask questions, get summaries, and explore ideas together!
                                </motion.p>
                            </div>

                            {/* Hidden File Input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.epub"
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            {/* Upload Button or Progress */}
                            {!isUploading ? (
                                <motion.button
                                    onClick={handleAttachFile}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5, duration: 0.6 }}
                                    className="w-full flex flex-col items-center gap-3 px-6 py-10 border-2 border-dashed border-black/20 hover:border-[#eb6a48]/50 rounded-2xl transition-all bg-[#f7f7f7]"
                                >
                                    <div className="w-12 h-12">
                                        <Upload className="w-full h-full text-[#eb6a48]" />
                                    </div>
                                    <p className="text-sm text-black/55 font-medium text-center">
                                        Upload book in PDF or Epub format
                                    </p>
                                </motion.button>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="w-full flex flex-col items-center gap-3 px-6 py-10 border-2 border-dashed border-[#eb6a48]/50 rounded-2xl bg-[#f7f7f7]"
                                >
                                    <div className="w-full space-y-4">
                                        {/* Progress Bar */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-black/70 font-medium">{uploadStatus}</span>
                                                <span className="text-[#eb6a48] font-semibold">{uploadProgress}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-[#eb6a48]"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${uploadProgress}%` }}
                                                    transition={{ duration: 0.3 }}
                                                />
                                            </div>
                                        </div>
                                        
                                        {/* Loading Icon */}
                                        <div className="flex justify-center">
                                            <LoaderIcon className="w-8 h-8 text-[#eb6a48] animate-spin" />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    ) : (
                        // Когда книга загружена - показываем чат
                        <div className="w-full h-full flex flex-col px-4 py-4 space-y-4 overflow-y-auto">
                            {messages.map((message, index) => {
                                const isUserMessage = message.role === 'user';
                                const isAssistantMessage = message.role === 'assistant';
                                
                                return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="flex gap-2 w-full"
                                    style={{
                                        justifyContent: isUserMessage ? 'flex-end' : 'flex-start'
                                    }}
                                >
                                    {/* Message bubble */}
                                    <div className="flex flex-col gap-2 max-w-[80%]">
                                        {/* Бейдж книги для AI ответов (сверху) */}
                                        {isAssistantMessage && uploadedBook && (
                                            <div className="flex items-center gap-2 px-3 py-2 bg-[#eb6a48] rounded-2xl w-fit">
                                                <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                                                    <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
                                                        <path d="M16.875 6.75V10.125C16.875 10.6223 17.0725 11.0992 17.4242 11.4508C17.7758 11.8025 18.2527 12 18.75 12H22.125" stroke="#EB6A48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                        <path d="M19.2188 20.25H7.78125C7.284 20.25 6.80707 20.0525 6.45543 19.7008C6.10379 19.3492 5.90625 18.8723 5.90625 18.375V8.625C5.90625 8.12774 6.10379 7.65081 6.45543 7.29917C6.80707 6.94754 7.284 6.75 7.78125 6.75H16.875L21.0938 10.9688V18.375C21.0938 18.8723 20.8962 19.3492 20.5446 19.7008C20.1929 20.0525 19.716 20.25 19.2188 20.25Z" stroke="#EB6A48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-white font-medium text-xs truncate">
                                                        {uploadedBook.title}
                                                    </span>
                                                    {uploadedBook.author && (
                                                        <span className="text-white/70 text-[10px] truncate">
                                                            {uploadedBook.author}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div
                                            className={cn(
                                                "px-3 py-2.5 rounded-2xl",
                                                isUserMessage
                                                    ? 'bg-[#eb6a48] text-white rounded-br-md'
                                                    : 'bg-[#f7f7f7] text-black rounded-bl-md'
                                            )}
                                        >
                                            {isUserMessage ? (
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                            ) : (
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        strong: ({ children }) => (
                                                            <strong className="font-bold text-black">{children}</strong>
                                                        ),
                                                        em: ({ children }) => (
                                                            <em className="italic text-black/80">{children}</em>
                                                        ),
                                                        ul: ({ children }) => (
                                                            <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>
                                                        ),
                                                        ol: ({ children }) => (
                                                            <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>
                                                        ),
                                                        li: ({ children }) => (
                                                            <li className="ml-2">{children}</li>
                                                        ),
                                                        h1: ({ children }) => (
                                                            <h1 className="text-lg font-bold text-black mb-2 mt-3">{children}</h1>
                                                        ),
                                                        h2: ({ children }) => (
                                                            <h2 className="text-base font-bold text-black mb-2 mt-2">{children}</h2>
                                                        ),
                                                        h3: ({ children }) => (
                                                            <h3 className="text-sm font-bold text-black mb-1 mt-2">{children}</h3>
                                                        ),
                                                        blockquote: ({ children }) => (
                                                            <blockquote className="border-l-4 border-[#eb6a48] pl-4 italic my-2 text-black/70">
                                                                {children}
                                                            </blockquote>
                                                        ),
                                                        code: ({ children }) => (
                                                            <code className="bg-black/10 px-1.5 py-0.5 rounded text-[#eb6a48] text-sm">
                                                                {children}
                                                            </code>
                                                        ),
                                                        p: ({ children }) => (
                                                            <p className="text-sm leading-relaxed mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>
                                                        ),
                                                    }}
                                                >
                                                    {message.content}
                                                </ReactMarkdown>
                                            )}
                                        </div>
                                        
                                        {/* Share button for assistant messages */}
                                        {isAssistantMessage && index > 0 && (
                                            <motion.button
                                                onClick={() => handleShareAnswer(messages[index - 1].content, message.content)}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.2 }}
                                                className="flex items-center gap-1.5 px-2.5 py-1 bg-black/5 hover:bg-black/10 rounded-lg text-black/60 hover:text-black/80 text-xs transition-all w-fit"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <Share2 className="w-3 h-3" />
                                                <span>Share Answer</span>
                                            </motion.button>
                                        )}
                                    </div>
                                </motion.div>
                            )})}
                            
                            {/* Typing indicator */}
                            {isTyping && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    className="flex items-center gap-3"
                                >
                                    <div className="w-8 h-7 rounded-full bg-[#eb6a48] flex items-center justify-center text-center">
                                        <span className="text-xs font-medium text-white mb-0.5">AI</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-black/70">
                                        <span>Thinking</span>
                                        <TypingDots />
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Mobile Bottom Input - показывается всегда после входа */}
                {isAuthenticated && (
                    <div className="w-full p-4 space-y-2.5">
                        {/* Mode Selector for Mobile */}
                        {uploadedBook && (
                            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
                                {chatModes.map((mode) => (
                                    <motion.button
                                        key={mode.value}
                                        onClick={() => setChatMode(mode.value)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className={cn(
                                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all whitespace-nowrap text-xs font-medium",
                                            chatMode === mode.value
                                                ? "bg-[#eb6a48] text-white shadow-sm"
                                                : "bg-white text-black/60 border border-black/10"
                                        )}
                                        title={mode.description}
                                    >
                                        {mode.icon}
                                        <span>{mode.label}</span>
                                    </motion.button>
                                ))}
                            </div>
                        )}
                        
                        <div className="relative bg-[#f7f7f7] border border-black/20 rounded-[23px] px-4 py-3 flex items-center gap-2">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleAttachFile}
                                className="w-[30px] h-[30px] bg-[#eb6a48] rounded-full flex items-center justify-center"
                            >
                                <PlusIcon className="w-4 h-4 text-white" />
                            </motion.button>
                            <input 
                                type="text"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey && uploadedBook) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder={uploadedBook ? "Ask from book ....." : "Upload a book first"}
                                disabled={!uploadedBook}
                                className="flex-1 bg-transparent text-base text-black/40 outline-none disabled:opacity-50"
                            />
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleSendMessage}
                                disabled={!uploadedBook || !value.trim()}
                                className="w-[41px] h-[41px] bg-[#eb6a48] rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <SendIcon className="w-5 h-5 text-white" />
                            </motion.button>
                        </div>
                        <p className="text-center text-[11px] text-black mt-1.5">
                            Librarity might make mistakes
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}

function TypingDots() {
    return (
        <div className="flex items-center ml-1">
            {[1, 2, 3].map((dot) => (
                <motion.div
                    key={dot}
                    className="w-1.5 h-1.5 bg-[#eb6a48] rounded-full mx-0.5"
                    initial={{ opacity: 0.3 }}
                    animate={{ 
                        opacity: [0.3, 0.9, 0.3],
                        scale: [0.85, 1.1, 0.85]
                    }}
                    transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: dot * 0.15,
                        ease: "easeInOut",
                    }}
                    style={{
                        boxShadow: "0 0 4px rgba(235, 106, 72, 0.3)"
                    }}
                />
            ))}
        </div>
    );
}

interface ActionButtonProps {
    icon: React.ReactNode;
    label: string;
}

function ActionButton({ icon, label }: ActionButtonProps) {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
        <motion.button
            type="button"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 rounded-full border border-neutral-800 text-neutral-400 hover:text-white transition-all relative overflow-hidden group"
        >
            <div className="relative z-10 flex items-center gap-2">
                {icon}
                <span className="text-xs relative z-10">{label}</span>
            </div>
            
            <AnimatePresence>
                {isHovered && (
                    <motion.div 
                        className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-indigo-500/10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    />
                )}
            </AnimatePresence>
            
            <motion.span 
                className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-violet-500 to-indigo-500"
                initial={{ width: 0 }}
                whileHover={{ width: "100%" }}
                transition={{ duration: 0.3 }}
            />
        </motion.button>
    );
}

const rippleKeyframes = `
@keyframes ripple {
  0% { transform: scale(0.5); opacity: 0.6; }
  100% { transform: scale(2); opacity: 0; }
}
`;

if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.innerHTML = rippleKeyframes;
    document.head.appendChild(style);
}


