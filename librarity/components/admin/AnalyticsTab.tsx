"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, BarChart3, MessageSquare, BookOpen, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

interface BookAnalytics {
  book_id: string;
  book_title: string;
  total_chats: number;
  total_messages: number;
  avg_messages_per_chat: number;
}

interface TopicAnalytics {
  topic: string;
  count: number;
  percentage: number;
}

export function AnalyticsTab() {
  const [loading, setLoading] = useState(true);
  const [topBooks, setTopBooks] = useState<BookAnalytics[]>([]);
  const [topTopics, setTopTopics] = useState<TopicAnalytics[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [booksData, topicsData] = await Promise.all([
        api.getBookAnalytics(),
        api.getTopicAnalytics(),
      ]);
      setTopBooks(booksData.books || []);
      setTopTopics(topicsData.topics || []);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">AI Analytics</h2>
        <p className="text-sm text-gray-500 mt-1">Insights from user interactions with AI</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Most Discussed Books */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 border border-gray-200"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-50 rounded-lg">
              <BookOpen className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Most Discussed Books</h3>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent" />
            </div>
          ) : topBooks.length > 0 ? (
            <div className="space-y-3">
              {topBooks.map((book, i) => (
                <div key={book.book_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-semibold text-sm">
                      {i + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{book.book_title}</div>
                      <div className="text-xs text-gray-500">{book.total_chats} chats</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">{book.total_messages}</div>
                    <div className="text-xs text-gray-500">messages</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>Coming soon</p>
            </div>
          )}
        </motion.div>

        {/* Popular Topics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 border border-gray-200"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-50 rounded-lg">
              <MessageSquare className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Popular Topics</h3>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-600 border-t-transparent" />
            </div>
          ) : topTopics.length > 0 ? (
            <div className="space-y-3">
              {topTopics.map((topic) => (
                <div key={topic.topic}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{topic.topic}</span>
                    <span className="text-sm text-gray-600">{topic.count} discussions</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-orange-600 h-2 rounded-full transition-all"
                      style={{ width: `${topic.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>Coming soon</p>
            </div>
          )}
        </motion.div>

        {/* AI Performance Issues */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 border border-gray-200 col-span-2"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">AI Performance Issues</h3>
            <span className="ml-auto text-sm text-gray-500">Questions where AI struggles</span>
          </div>
          
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>Coming soon - Will track low-rated responses and error patterns</p>
          </div>
        </motion.div>

        {/* Growth Trends */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 border border-gray-200 col-span-2"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Engagement Trends</h3>
          </div>
          
          <div className="text-center py-8 text-gray-500">
            <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>Coming soon - Will show interaction patterns over time</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
