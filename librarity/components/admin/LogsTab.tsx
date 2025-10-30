"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, AlertCircle, Info, Shield, Activity } from "lucide-react";
import api from "@/lib/api";

interface LogEntry {
  id: string;
  timestamp: string;
  level: "error" | "info" | "warning" | "success";
  category: string;
  message: string;
  details?: string;
}

export function LogsTab() {
  const [activeCategory, setActiveCategory] = useState<"error" | "info" | "audit" | "access">("error");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState({
    errors_24h: 0,
    warnings_24h: 0,
    info_24h: 0,
    audit_24h: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [activeCategory]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const response = await api.getSystemLogs(activeCategory, 1, 50, 7);
      setLogs(response.logs || []);
      if (response.stats) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error("Failed to load logs:", error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: LogEntry["level"]) => {
    switch (level) {
      case "error":
        return "text-red-600 bg-red-50";
      case "warning":
        return "text-yellow-600 bg-yellow-50";
      case "info":
        return "text-blue-600 bg-blue-50";
      case "success":
        return "text-green-600 bg-green-50";
    }
  };

  const getLevelIcon = (level: LogEntry["level"]) => {
    switch (level) {
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case "info":
        return <Info className="w-5 h-5 text-blue-600" />;
      case "success":
        return <Info className="w-5 h-5 text-green-600" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString() + " " + date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">System Logs</h2>
        <p className="text-sm text-gray-500 mt-1">View and analyze system logs</p>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveCategory("error")}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeCategory === "error"
              ? "border-red-600 text-red-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Error Logs
          </div>
        </button>
        <button
          onClick={() => setActiveCategory("info")}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeCategory === "info"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            Info Logs
          </div>
        </button>
        <button
          onClick={() => setActiveCategory("audit")}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeCategory === "audit"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Audit Logs
          </div>
        </button>
        <button
          onClick={() => setActiveCategory("access")}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeCategory === "access"
              ? "border-green-600 text-green-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Access Logs
          </div>
        </button>
      </div>

      {/* Log Entries */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-purple-600 border-t-transparent" />
          </div>
        ) : logs.length > 0 ? (
          logs.map((log, index) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${getLevelColor(log.level)}`}>
                  {getLevelIcon(log.level)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 px-2 py-1 bg-gray-100 rounded">
                        {log.category}
                      </span>
                      <span className={`text-xs font-semibold uppercase px-2 py-1 rounded ${getLevelColor(log.level)}`}>
                        {log.level}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatTime(log.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">{log.message}</p>
                  {log.details && (
                    <p className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded">
                      {log.details}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl p-12 border border-gray-200 text-center"
          >
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No logs found</h3>
            <p className="text-sm text-gray-500">
              No {activeCategory} logs available at this time
            </p>
          </motion.div>
        )}
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
          <div className="text-2xl font-bold text-red-600">{stats.errors_24h}</div>
          <div className="text-xs text-red-600">Errors (24h)</div>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-600">{stats.warnings_24h}</div>
          <div className="text-xs text-yellow-600">Warnings (24h)</div>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">{stats.info_24h}</div>
          <div className="text-xs text-blue-600">Info (24h)</div>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
          <div className="text-2xl font-bold text-purple-600">{stats.audit_24h}</div>
          <div className="text-xs text-purple-600">Audit (24h)</div>
        </div>
      </div>
    </div>
  );
}
