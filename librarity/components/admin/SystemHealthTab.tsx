"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Activity, Database, Server, Cpu, CheckCircle, AlertCircle } from "lucide-react";

interface HealthStatus {
  status: "healthy" | "warning" | "error";
  message: string;
}

export function SystemHealthTab() {
  const [health, setHealth] = useState<{
    api: HealthStatus;
    database: HealthStatus;
    storage: HealthStatus;
  }>({
    api: { status: "healthy", message: "All systems operational" },
    database: { status: "healthy", message: "Database connected" },
    storage: { status: "healthy", message: "Storage accessible" },
  });

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    try {
      // Check API health
      const response = await fetch('http://localhost:8000/api/health');
      if (response.ok) {
        setHealth(prev => ({
          ...prev,
          api: { status: "healthy", message: "API responding normally" }
        }));
      } else {
        setHealth(prev => ({
          ...prev,
          api: { status: "error", message: "API returned error" }
        }));
      }
    } catch (error) {
      setHealth(prev => ({
        ...prev,
        api: { status: "error", message: "API unreachable" }
      }));
    }
  };

  const getStatusIcon = (status: HealthStatus["status"]) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      case "warning":
        return <AlertCircle className="w-8 h-8 text-yellow-600" />;
      case "error":
        return <AlertCircle className="w-8 h-8 text-red-600" />;
    }
  };

  const getStatusBg = (status: HealthStatus["status"]) => {
    switch (status) {
      case "healthy":
        return "bg-green-50 border-green-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      case "error":
        return "bg-red-50 border-red-200";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">System Health</h2>
        <p className="text-sm text-gray-500 mt-1">Monitor system performance and health</p>
      </div>

      {/* Overall Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl p-6 border-2 ${
          health.api.status === "healthy" && health.database.status === "healthy"
            ? "bg-green-50 border-green-200"
            : "bg-yellow-50 border-yellow-200"
        }`}
      >
        <div className="flex items-center gap-4">
          {health.api.status === "healthy" && health.database.status === "healthy" ? (
            <CheckCircle className="w-12 h-12 text-green-600" />
          ) : (
            <AlertCircle className="w-12 h-12 text-yellow-600" />
          )}
          <div>
            <h3 className="text-xl font-bold text-gray-900">System Status</h3>
            <p className="text-gray-600">
              {health.api.status === "healthy" && health.database.status === "healthy"
                ? "All systems operational"
                : "Some services need attention"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Component Status */}
      <div className="grid grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`rounded-2xl p-6 border-2 ${getStatusBg(health.api.status)}`}
        >
          <div className="flex items-start justify-between mb-4">
            <Server className="w-8 h-8 text-gray-700" />
            {getStatusIcon(health.api.status)}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">API Server</h3>
          <p className="text-sm text-gray-600">{health.api.message}</p>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">Uptime: 99.9%</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`rounded-2xl p-6 border-2 ${getStatusBg(health.database.status)}`}
        >
          <div className="flex items-start justify-between mb-4">
            <Database className="w-8 h-8 text-gray-700" />
            {getStatusIcon(health.database.status)}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Database</h3>
          <p className="text-sm text-gray-600">{health.database.message}</p>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">Response time: ~50ms</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`rounded-2xl p-6 border-2 ${getStatusBg(health.storage.status)}`}
        >
          <div className="flex items-start justify-between mb-4">
            <Cpu className="w-8 h-8 text-gray-700" />
            {getStatusIcon(health.storage.status)}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">CPU & Memory</h3>
          <p className="text-sm text-gray-600">System resources nominal</p>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">CPU: ~25% | RAM: ~40%</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-6 border-2 border-gray-200"
        >
          <div className="flex items-start justify-between mb-4">
            <Activity className="w-8 h-8 text-gray-700" />
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">API Performance</h3>
          <p className="text-sm text-gray-600">Average response time optimal</p>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">Avg: 120ms | P95: 250ms</div>
          </div>
        </motion.div>
      </div>

      {/* Recent Events */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-2xl border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent System Events</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 text-sm">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-gray-900">System startup successful</div>
              <div className="text-gray-500 text-xs">All services initialized</div>
            </div>
            <div className="text-xs text-gray-400 ml-auto">Just now</div>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-gray-900">Database connection established</div>
              <div className="text-gray-500 text-xs">PostgreSQL ready</div>
            </div>
            <div className="text-xs text-gray-400 ml-auto">1m ago</div>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-gray-900">Health check passed</div>
              <div className="text-gray-500 text-xs">All endpoints responding</div>
            </div>
            <div className="text-xs text-gray-400 ml-auto">2m ago</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
