"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { motion } from "framer-motion";
import { BookOpen, ArrowLeft, MessageCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  type: "user" | "assistant";
  content: string;
}

interface ChatData {
  chats: Array<{
    user_message: string;
    bot_response: string;
    timestamp: string;
  }>;
  session_id: string;
  book_id: string;
}

interface BookData {
  id: string;
  title: string;
  author?: string;
}

export default function SharedChatPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.sessionId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [bookInfo, setBookInfo] = useState<BookData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadChatData = async () => {
      if (!sessionId) {
        setError("ID сессии не найден");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Загружаем историю чата
        const chatData: ChatData = await api.getChatHistory(sessionId);
        
        if (!chatData?.chats || chatData.chats.length === 0) {
          setError("Чат не найден");
          setIsLoading(false);
          return;
        }

        // Преобразуем в формат сообщений
        const chatMessages: Message[] = [];
        chatData.chats.forEach((chat) => {
          chatMessages.push(
            { type: "user", content: chat.user_message },
            { type: "assistant", content: chat.bot_response }
          );
        });
        setMessages(chatMessages);

        // Загружаем информацию о книге
        if (chatData.book_id) {
          try {
            const book: BookData = await api.getBook(chatData.book_id);
            setBookInfo(book);
          } catch (bookError) {
            console.error("Failed to load book info:", bookError);
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Failed to load chat:", err);
        setError("Не удалось загрузить чат");
        setIsLoading(false);
      }
    };

    loadChatData();
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-white/60">Загрузка чата...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <MessageCircle className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Чат не найден</h1>
          <p className="text-white/60 mb-6">{error}</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-violet-500 hover:bg-violet-600 text-white rounded-full flex items-center gap-2 mx-auto transition-colors"
          >
            <ArrowLeft size={20} />
            Вернуться на главную
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <header className="border-b border-white/[0.1] bg-[#0A0A0A]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-violet-500" />
            <div>
              {bookInfo ? (
                <>
                  <h1 className="font-semibold text-sm md:text-base">
                    {bookInfo.title}
                  </h1>
                  {bookInfo.author && (
                    <p className="text-xs text-white/60">by {bookInfo.author}</p>
                  )}
                </>
              ) : (
                <h1 className="font-semibold text-sm md:text-base">Общий чат</h1>
              )}
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/")}
            className="text-sm text-white/60 hover:text-white/80 transition-colors"
          >
            На главную
          </motion.button>
        </div>
      </header>

      {/* Messages */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 ${
                  message.type === "user"
                    ? "bg-violet-500 text-white"
                    : "bg-white/[0.05] border border-white/[0.1] text-white/90"
                }`}
              >
                {message.type === "user" ? (
                  <p className="text-sm md:text-base whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <div className="text-sm md:text-base markdown-content">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                        em: ({ children }) => <em className="italic text-white/80">{children}</em>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="ml-2">{children}</li>,
                        h1: ({ children }) => <h1 className="text-xl font-bold mb-2 text-white">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-lg font-bold mb-2 text-white">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-base font-bold mb-2 text-white">{children}</h3>,
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-violet-500 pl-4 italic my-3 text-white/70">
                            {children}
                          </blockquote>
                        ),
                        code: ({ children }) => (
                          <code className="bg-white/10 px-1.5 py-0.5 rounded text-violet-300 text-sm">
                            {children}
                          </code>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: messages.length * 0.05 + 0.3 }}
          className="mt-12 text-center"
        >
          <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-2xl p-8">
            <BookOpen className="w-12 h-12 text-violet-500 mx-auto mb-4" />
            <h2 className="text-xl md:text-2xl font-bold mb-2">
              Хотите пообщаться с книгой сами?
            </h2>
            <p className="text-white/60 mb-6">
              Загрузите свою книгу и начните умный диалог с ИИ
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push("/")}
              className="px-8 py-3 bg-violet-500 hover:bg-violet-600 text-white rounded-full font-medium transition-colors"
            >
              Начать общение
            </motion.button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
