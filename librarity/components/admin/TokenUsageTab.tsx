"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { 
  TrendingUp, 
  DollarSign, 
  Zap, 
  Clock,
  Activity,
  Users,
  Database,
  BarChart3
} from "lucide-react";

interface TokenSummary {
  period_days: number;
  total_tokens: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_cost_usd: number;
  total_requests: number;
  avg_tokens_per_request: number;
  avg_response_time_ms: number;
  cache_hit_rate_percent: number;
}

interface ActionStat {
  action: string;
  total_tokens: number;
  request_count: number;
  total_cost_usd: number;
  avg_response_time_ms: number;
  avg_tokens_per_request: number;
}

interface UserStat {
  user_id: string;
  email: string;
  username: string;
  total_tokens: number;
  request_count: number;
  total_cost_usd: number;
  avg_tokens_per_request: number;
}

interface TimelinePoint {
  date: string;
  total_tokens: number;
  request_count: number;
  total_cost_usd: number;
}

const actionColors: Record<string, string> = {
  chat: "bg-violet-500",
  embed: "bg-blue-500",
  summarize: "bg-green-500",
  upload: "bg-orange-500",
  default: "bg-gray-500"
};

const actionIcons: Record<string, any> = {
  chat: Activity,
  embed: Database,
  summarize: BarChart3,
  upload: TrendingUp
};

export function TokenUsageTab() {
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<TokenSummary | null>(null);
  const [actions, setActions] = useState<ActionStat[]>([]);
  const [topUsers, setTopUsers] = useState<UserStat[]>([]);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryRes, actionsRes, usersRes, timelineRes] = await Promise.all([
        api.getTokenUsageSummary(period),
        api.getTokenUsageByAction(period),
        api.getTokenUsageByUser(period),
        api.getTokenUsageTimeline(period)
      ]);

      setSummary(summaryRes.data);
      setActions(actionsRes.data.actions || []);
      setTopUsers(usersRes.data.top_users || []);
      setTimeline(timelineRes.data.timeline || []);
    } catch (error) {
      console.error("Failed to load token usage data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const getMaxTokens = () => {
    return Math.max(...actions.map(a => a.total_tokens), 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Token Usage Analytics</h2>
        <div className="flex gap-2">
          {[7, 30, 90, 365].map((days) => (
            <button
              key={days}
              onClick={() => setPeriod(days)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === days
                  ? "bg-violet-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                <Zap className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Tokens</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(summary.total_tokens)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {formatNumber(summary.avg_tokens_per_request)} avg per request
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900">${summary.total_cost_usd.toFixed(2)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              ${(summary.total_cost_usd / summary.total_requests).toFixed(4)} per request
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Response</p>
                <p className="text-2xl font-bold text-gray-900">{summary.avg_response_time_ms.toFixed(0)}ms</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {summary.total_requests} total requests
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Cache Hit Rate</p>
                <p className="text-2xl font-bold text-gray-900">{summary.cache_hit_rate_percent.toFixed(1)}%</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Redis caching efficiency
            </p>
          </motion.div>
        </div>
      )}

      {/* Usage by Action (Main Chart) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
      >
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Activity className="w-5 h-5 text-violet-600" />
          Token Usage by Function
        </h3>

        <div className="space-y-4">
          {actions.map((action, index) => {
            const Icon = actionIcons[action.action] || Activity;
            const color = actionColors[action.action] || actionColors.default;
            const percentage = (action.total_tokens / getMaxTokens()) * 100;

            return (
              <motion.div
                key={action.action}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${color}/20 flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${color.replace('bg-', 'text-')}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 capitalize">{action.action}</p>
                      <p className="text-xs text-gray-500">
                        {action.request_count} requests • {action.avg_response_time_ms.toFixed(0)}ms avg
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{formatNumber(action.total_tokens)}</p>
                    <p className="text-xs text-gray-500">${action.total_cost_usd.toFixed(2)}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, delay: 0.6 + index * 0.1 }}
                    className={`h-full ${color} rounded-full`}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Top Users */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
      >
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          Top Users by Token Usage
        </h3>

        <div className="space-y-3">
          {topUsers.map((user, index) => (
            <motion.div
              key={user.user_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 + index * 0.05 }}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white font-bold">
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{user.email}</p>
                  <p className="text-xs text-gray-500">
                    {user.request_count} requests • {formatNumber(user.avg_tokens_per_request)} avg
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">{formatNumber(user.total_tokens)}</p>
                <p className="text-xs text-green-600">${user.total_cost_usd.toFixed(2)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Timeline Chart */}
      {timeline.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Token Usage Over Time
          </h3>

          <div className="h-64 flex items-end justify-between gap-2">
            {timeline.slice(-30).map((point, index) => {
              const maxTokens = Math.max(...timeline.map(p => p.total_tokens));
              const height = (point.total_tokens / maxTokens) * 100;
              const date = new Date(point.date);
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;

              return (
                <div
                  key={point.date}
                  className="flex-1 flex flex-col items-center gap-2 group relative"
                >
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ duration: 0.5, delay: 1.1 + index * 0.02 }}
                    className={`w-full rounded-t-lg ${
                      isWeekend ? "bg-violet-300" : "bg-violet-500"
                    } hover:bg-violet-400 transition-colors cursor-pointer`}
                  />
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 text-white text-xs rounded-lg p-2 whitespace-nowrap shadow-xl">
                      <p className="font-bold">{date.toLocaleDateString()}</p>
                      <p>{formatNumber(point.total_tokens)} tokens</p>
                      <p className="text-green-400">${point.total_cost_usd.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between mt-4 text-xs text-gray-500">
            <span>{timeline[0]?.date}</span>
            <span>{timeline[timeline.length - 1]?.date}</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
