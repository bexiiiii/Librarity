"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Star, Eye, Share2, TrendingUp, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

interface SharedContent {
  id: string;
  title: string;
  type: string;
  shares: number;
  views: number;
  created_at: string;
}

export function ContentTab() {
  const [loading, setLoading] = useState(true);
  const [sharedContent, setSharedContent] = useState<SharedContent[]>([]);
  const [stats, setStats] = useState({
    total_items: 0,
    total_views: 0,
    total_shares: 0,
    featured: 0
  });

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
      const response = await api.getSharedContent();
      setSharedContent(response.content || []);
      setStats(response.stats || stats);
    } catch (error) {
      console.error("Failed to load content:", error);
      setSharedContent([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Content Management</h2>
        <p className="text-sm text-gray-500 mt-1">Manage featured content and shared items</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white"
        >
          <Share2 className="w-8 h-8 mb-4 opacity-80" />
          <div className="text-3xl font-bold mb-1">{stats.total_items}</div>
          <div className="text-purple-100">Shared Items</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white"
        >
          <Eye className="w-8 h-8 mb-4 opacity-80" />
          <div className="text-3xl font-bold mb-1">{stats.total_views}</div>
          <div className="text-blue-100">Total Views</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white"
        >
          <Star className="w-8 h-8 mb-4 opacity-80" />
          <div className="text-3xl font-bold mb-1">{stats.featured}</div>
          <div className="text-orange-100">Featured Items</div>
        </motion.div>
      </div>

      {/* Shared Content Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#eb6a48]" />
            Shared Content
          </h3>
        </div>
        
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-purple-600 border-t-transparent" />
          </div>
        ) : sharedContent.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Views</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Shares</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sharedContent.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.title || 'Untitled'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.views}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.shares}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No shared content yet</h4>
            <p className="text-gray-500 text-sm">
              When users share book summaries or chat insights, they will appear here.
            </p>
          </div>
        )}
      </motion.div>

      {/* Feature Zones */}
      <div className="grid grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#eb6a48]" />
            Trending Topics
          </h3>
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No trending data available yet</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[#eb6a48]" />
            Moderation Queue
          </h3>
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No items pending moderation</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
