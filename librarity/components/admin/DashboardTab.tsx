"use client";

import { motion } from "framer-motion";
import { 
  Users, 
  BookOpen, 
  MessageSquare, 
  Zap,
  TrendingUp,
  Activity
} from "lucide-react";

interface OverviewStats {
  users: {
    total: number;
    active: number;
    today: number;
    week: number;
    free: number;
    pro: number;
    ultimate: number;
  };
  books: {
    total: number;
    today: number;
    week: number;
  };
  chats: {
    total: number;
    today: number;
    week: number;
  };
  tokens: {
    total: number;
    today: number;
    week: number;
  };
}

interface GrowthData {
  date: string;
  count: number;
}

interface DashboardTabProps {
  overviewStats: OverviewStats;
  growthData: {
    users: GrowthData[];
    books: GrowthData[];
    chats: GrowthData[];
    tokens: GrowthData[];
  };
}

export function DashboardTab({ overviewStats, growthData }: DashboardTabProps) {
  return (
    <div className="space-y-6">
      {/* Main Stats Cards with Mini Charts */}
      <div className="grid grid-cols-4 gap-6">
        {/* Users Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">Total Users</div>
              <div className="text-3xl font-bold text-gray-900">
                {overviewStats.users.total}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-green-600 font-semibold">+{overviewStats.users.week}</span>
                <span className="text-xs text-gray-500">this week</span>
              </div>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          {/* Mini Chart */}
          <div className="h-16 flex items-end gap-1">
            {growthData.users.slice(-7).map((data, i) => (
              <div 
                key={i} 
                className="flex-1 bg-blue-100 rounded-t hover:bg-blue-200 transition-colors"
                style={{ 
                  height: `${(data.count / Math.max(...growthData.users.slice(-7).map(d => d.count), 1)) * 100}%`,
                  minHeight: '4px'
                }}
                title={`${new Date(data.date).toLocaleDateString()}: ${data.count}`}
              />
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Active: {overviewStats.users.active}</span>
              <span className="text-green-600">Today: +{overviewStats.users.today}</span>
            </div>
          </div>
        </motion.div>

        {/* Books Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">Total Books</div>
              <div className="text-3xl font-bold text-gray-900">
                {overviewStats.books.total}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-green-600 font-semibold">+{overviewStats.books.week}</span>
                <span className="text-xs text-gray-500">this week</span>
              </div>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <BookOpen className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          {/* Mini Chart */}
          <div className="h-16 flex items-end gap-1">
            {growthData.books.slice(-7).map((data, i) => (
              <div 
                key={i} 
                className="flex-1 bg-purple-100 rounded-t hover:bg-purple-200 transition-colors"
                style={{ 
                  height: `${(data.count / Math.max(...growthData.books.slice(-7).map(d => d.count), 1)) * 100}%`,
                  minHeight: '4px'
                }}
                title={`${new Date(data.date).toLocaleDateString()}: ${data.count}`}
              />
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Avg/user: {(overviewStats.books.total / overviewStats.users.total).toFixed(1)}</span>
              <span className="text-green-600">Today: +{overviewStats.books.today}</span>
            </div>
          </div>
        </motion.div>

        {/* Chats Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">Total Chats</div>
              <div className="text-3xl font-bold text-gray-900">
                {overviewStats.chats.total}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-green-600 font-semibold">+{overviewStats.chats.week}</span>
                <span className="text-xs text-gray-500">this week</span>
              </div>
            </div>
            <div className="p-2 bg-orange-50 rounded-lg">
              <MessageSquare className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          {/* Mini Chart */}
          <div className="h-16 flex items-end gap-1">
            {growthData.chats.slice(-7).map((data, i) => (
              <div 
                key={i} 
                className="flex-1 bg-orange-100 rounded-t hover:bg-orange-200 transition-colors"
                style={{ 
                  height: `${(data.count / Math.max(...growthData.chats.slice(-7).map(d => d.count), 1)) * 100}%`,
                  minHeight: '4px'
                }}
                title={`${new Date(data.date).toLocaleDateString()}: ${data.count}`}
              />
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Avg/user: {(overviewStats.chats.total / overviewStats.users.active).toFixed(1)}</span>
              <span className="text-green-600">Today: +{overviewStats.chats.today}</span>
            </div>
          </div>
        </motion.div>

        {/* Tokens Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">Tokens Used</div>
              <div className="text-3xl font-bold text-gray-900">
                {(overviewStats.tokens.total / 1000).toFixed(1)}K
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-green-600 font-semibold">+{(overviewStats.tokens.week / 1000).toFixed(1)}K</span>
                <span className="text-xs text-gray-500">this week</span>
              </div>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <Zap className="w-5 h-5 text-green-600" />
            </div>
          </div>
          {/* Mini Chart */}
          <div className="h-16 flex items-end gap-1">
            {growthData.tokens.slice(-7).map((data, i) => (
              <div 
                key={i} 
                className="flex-1 bg-green-100 rounded-t hover:bg-green-200 transition-colors"
                style={{ 
                  height: `${(data.count / Math.max(...growthData.tokens.slice(-7).map(d => d.count), 1)) * 100}%`,
                  minHeight: '4px'
                }}
                title={`${new Date(data.date).toLocaleDateString()}: ${data.count}`}
              />
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Avg/chat: {(overviewStats.tokens.total / overviewStats.chats.total).toFixed(0)}</span>
              <span className="text-green-600">Today: +{(overviewStats.tokens.today / 1000).toFixed(1)}K</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Detailed Stats Row */}
      <div className="grid grid-cols-3 gap-6">
        {/* Subscription Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-6 border border-gray-200"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Tiers</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Free Tier</span>
                <span className="text-sm font-semibold text-gray-900">
                  {overviewStats.users.free} ({Math.round((overviewStats.users.free / overviewStats.users.total) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className="bg-gray-400 h-2 rounded-full transition-all"
                  style={{ width: `${(overviewStats.users.free / overviewStats.users.total) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Pro Tier</span>
                <span className="text-sm font-semibold text-gray-900">
                  {overviewStats.users.pro} ({Math.round((overviewStats.users.pro / overviewStats.users.total) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{ width: `${(overviewStats.users.pro / overviewStats.users.total) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Ultimate Tier</span>
                <span className="text-sm font-semibold text-gray-900">
                  {overviewStats.users.ultimate} ({Math.round((overviewStats.users.ultimate / overviewStats.users.total) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className="bg-orange-600 h-2 rounded-full transition-all"
                  style={{ width: `${(overviewStats.users.ultimate / overviewStats.users.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Activity Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl p-6 border border-gray-200"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Today</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm text-gray-600">New Users</span>
              </div>
              <span className="text-lg font-bold text-gray-900">+{overviewStats.users.today}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <BookOpen className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-sm text-gray-600">Books Uploaded</span>
              </div>
              <span className="text-lg font-bold text-gray-900">+{overviewStats.books.today}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <MessageSquare className="w-4 h-4 text-orange-600" />
                </div>
                <span className="text-sm text-gray-600">Chats Created</span>
              </div>
              <span className="text-lg font-bold text-gray-900">+{overviewStats.chats.today}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Zap className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm text-gray-600">Tokens Used</span>
              </div>
              <span className="text-lg font-bold text-gray-900">+{(overviewStats.tokens.today / 1000).toFixed(1)}K</span>
            </div>
          </div>
        </motion.div>

        {/* Key Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl p-6 border border-gray-200"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics</h3>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">User Engagement</div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.round((overviewStats.users.active / overviewStats.users.total) * 100)}%
              </div>
              <div className="text-xs text-gray-500">Active in last 30 days</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Conversion Rate</div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(((overviewStats.users.pro + overviewStats.users.ultimate) / overviewStats.users.total) * 100)}%
              </div>
              <div className="text-xs text-gray-500">Free to paid</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Books per User</div>
              <div className="text-2xl font-bold text-gray-900">
                {(overviewStats.books.total / overviewStats.users.total).toFixed(1)}
              </div>
              <div className="text-xs text-gray-500">Average library size</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Growth Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white rounded-2xl p-6 border border-gray-200"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Growth Trend (Last 7 Days)</h2>
            <p className="text-sm text-gray-500 mt-1">Daily activity metrics</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span className="text-xs text-gray-600">Users</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full" />
              <span className="text-xs text-gray-600">Books</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full" />
              <span className="text-xs text-gray-600">Chats</span>
            </div>
          </div>
        </div>
        <div className="h-64 flex items-end justify-between gap-4">
          {growthData.users.slice(-7).map((data, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex flex-col gap-1 items-center justify-end" style={{ height: '240px' }}>
                {/* Users bar */}
                <div 
                  className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t hover:from-blue-600 hover:to-blue-500 transition-all cursor-pointer relative group"
                  style={{ 
                    height: `${(growthData.users[i].count / Math.max(...growthData.users.map(d => d.count), 1)) * 70}px`,
                    minHeight: '4px'
                  }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {growthData.users[i].count} users
                  </div>
                </div>
                {/* Books bar */}
                <div 
                  className="w-full bg-gradient-to-t from-purple-500 to-purple-400 rounded-t hover:from-purple-600 hover:to-purple-500 transition-all cursor-pointer relative group"
                  style={{ 
                    height: `${(growthData.books[i].count / Math.max(...growthData.books.map(d => d.count), 1)) * 70}px`,
                    minHeight: '4px'
                  }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {growthData.books[i].count} books
                  </div>
                </div>
                {/* Chats bar */}
                <div 
                  className="w-full bg-gradient-to-t from-orange-500 to-orange-400 rounded-t hover:from-orange-600 hover:to-orange-500 transition-all cursor-pointer relative group"
                  style={{ 
                    height: `${(growthData.chats[i].count / Math.max(...growthData.chats.map(d => d.count), 1)) * 70}px`,
                    minHeight: '4px'
                  }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {growthData.chats[i].count} chats
                  </div>
                </div>
              </div>
              <span className="text-xs text-gray-500 mt-2">
                {new Date(data.date).toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
