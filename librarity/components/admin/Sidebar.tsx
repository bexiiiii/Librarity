"use client";

import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  TrendingUp,
  DollarSign,
  FileText,
  Activity,
  FileCode,
  Settings,
  LogOut,
  User,
  BarChart3,
} from "lucide-react";

interface AdminUser {
  email: string;
  username?: string;
  role: string;
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: AdminUser | null;
  handleLogout: () => void;
}

export function Sidebar({ activeTab, setActiveTab, currentUser, handleLogout }: SidebarProps) {
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "users", label: "Users", icon: Users },
    { id: "books", label: "Books", icon: BookOpen },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
    { id: "revenue", label: "Revenue", icon: DollarSign },
    { id: "metrics", label: "Startup Metrics", icon: BarChart3 },
    { id: "content", label: "Content", icon: FileText },
    { id: "system", label: "System Health", icon: Activity },
    { id: "logs", label: "Logs", icon: FileCode },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="w-64 bg-[#1a1d2e] h-screen flex flex-col sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-white">Librarity</h1>
        <p className="text-sm text-gray-400 mt-1">Admin Panel</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-[#eb6a48] text-white shadow-lg"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{tab.label}</span>
            </motion.button>
          );
        })}
      </nav>

      {/* User Section */}
      {currentUser && (
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
              {currentUser.username?.[0]?.toUpperCase() || currentUser.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {currentUser.username || "Admin"}
              </div>
              <div className="text-xs text-gray-400 truncate">{currentUser.email}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}
