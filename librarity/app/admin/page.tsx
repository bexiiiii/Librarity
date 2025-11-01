"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";

// Import components
import { Sidebar } from "@/components/admin/Sidebar";
import { DashboardTab } from "@/components/admin/DashboardTab";
import { UsersTab } from "@/components/admin/UsersTab";
import { BooksTab } from "@/components/admin/BooksTab";
import { AnalyticsTab } from "@/components/admin/AnalyticsTab";
import { RevenueTab } from "@/components/admin/RevenueTab";
import { ContentTab } from "@/components/admin/ContentTab";
import { SystemHealthTab } from "@/components/admin/SystemHealthTab";
import { LogsTab } from "@/components/admin/LogsTab";
import { SettingsTab } from "@/components/admin/SettingsTab";
import { MetricsTab } from "@/components/admin/MetricsTab";
import { TokenUsageTab } from "@/components/admin/TokenUsageTab";

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

interface AdminUser {
  id: string;
  email: string;
  username?: string;
  role: string;
  created_at: string;
  is_banned: boolean;
}

interface CurrentUser {
  email: string;
  username?: string;
  role: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Dashboard data
  const [overviewStats, setOverviewStats] = useState<OverviewStats>({
    users: { total: 0, active: 0, today: 0, week: 0, free: 0, pro: 0, ultimate: 0 },
    books: { total: 0, today: 0, week: 0 },
    chats: { total: 0, today: 0, week: 0 },
    tokens: { total: 0, today: 0, week: 0 },
  });
  const [growthData, setGrowthData] = useState<{
    users: GrowthData[];
    books: GrowthData[];
    chats: GrowthData[];
    tokens: GrowthData[];
  }>({
    users: [],
    books: [],
    chats: [],
    tokens: [],
  });

  // New metrics data
  const [activeUsers, setActiveUsers] = useState<any>(null);
  const [chatModes, setChatModes] = useState<any>(null);
  const [timeInApp, setTimeInApp] = useState<any>(null);
  const [viralCoefficient, setViralCoefficient] = useState<any>(null);
  const [retention, setRetention] = useState<any>(null);
  const [conversion, setConversion] = useState<any>(null);

  // Users tab data
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const checkAuthAndLoadData = async () => {
    console.log("=== ADMIN AUTH CHECK STARTED ===");
    try {
      const token = localStorage.getItem("access_token"); // Changed from "token" to "access_token"
      console.log("Token exists:", !!token);
      if (!token) {
        console.log("No token, redirecting to login");
        router.push("/admin/login");
        return;
      }

      console.log("Fetching current user...");
      const user = await api.getCurrentUser();
      console.log("=== USER DATA RECEIVED ===");
      console.log("Full user object:", JSON.stringify(user, null, 2));
      console.log("User role:", user.role);
      console.log("User role type:", typeof user.role);
      console.log("User email:", user.email);
      
      // Check if user is admin (handle both "admin" and "UserRole.ADMIN" formats)
      const isAdmin = user.role === "admin" || 
                      user.role === "UserRole.ADMIN" || 
                      user.role?.toLowerCase() === "admin" ||
                      (typeof user.role === 'object' && user.role?.value === "admin");
      
      console.log("Is admin check result:", isAdmin);
      
      if (!isAdmin) {
        console.log("❌ User is not admin, redirecting to home. Role was:", user.role);
        router.push("/");
        return;
      }

      console.log("✅ User is admin, loading dashboard");
      setCurrentUser(user);
      await loadData();
    } catch (error) {
      console.error("❌ Auth check failed:", error);
      router.push("/admin/login");
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      // Load dashboard data
      const [overview, growth, active, modes, time, viral, ret, conv] = await Promise.all([
        api.getAdminOverviewStats(),
        api.getAdminGrowthStats(7),
        api.getActiveUsersStats().catch(() => null),
        api.getChatModesStats().catch(() => null),
        api.getTimeInAppStats().catch(() => null),
        api.getViralCoefficientStats().catch(() => null),
        api.getRetentionStats().catch(() => null),
        api.getConversionToPremiumStats().catch(() => null),
      ]);

      setOverviewStats(overview);
      setGrowthData(growth);
      setActiveUsers(active);
      setChatModes(modes);
      setTimeInApp(time);
      setViralCoefficient(viral);
      setRetention(ret);
      setConversion(conv);

      // Load users data if on users tab
      if (activeTab === "users") {
        await loadUsers();
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  };

  const loadUsers = async () => {
    try {
      const page = isNaN(currentPage) || currentPage < 1 ? 1 : currentPage;
      const response = await api.getAllUsers(page, 20);
      setUsers(response.users || []);
      setTotalPages(Math.ceil(response.total / 20));
    } catch (error) {
      console.error("Failed to load users:", error);
    }
  };

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  useEffect(() => {
    if (!loading && activeTab === "users") {
      loadUsers();
    }
  }, [currentPage, activeTab]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === "dashboard") {
        loadData();
      } else if (activeTab === "users") {
        loadUsers();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [activeTab]);

  const handleLogout = () => {
    localStorage.removeItem("access_token"); // Changed from "token" to "access_token"
    router.push("/admin/login");
  };

  const handleBanUser = async (userId: string) => {
    try {
      await api.banUser(userId);
      await loadUsers();
    } catch (error) {
      console.error("Failed to ban user:", error);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      await api.unbanUser(userId);
      await loadUsers();
    } catch (error) {
      console.error("Failed to unban user:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#ff4ba8] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Fixed Sidebar */}
      <div className="flex-shrink-0">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          handleLogout={handleLogout}
        />
      </div>

      {/* Scrollable Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          {activeTab === "dashboard" && (
            <DashboardTab 
              overviewStats={overviewStats} 
              growthData={growthData}
              activeUsers={activeUsers}
              chatModes={chatModes}
              timeInApp={timeInApp}
              viralCoefficient={viralCoefficient}
              retention={retention}
              conversion={conversion}
            />
          )}

          {activeTab === "users" && (
            <UsersTab
              users={users}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
              handleBanUser={handleBanUser}
              handleUnbanUser={handleUnbanUser}
              onUserUpdated={loadUsers}
            />
          )}

          {activeTab === "books" && <BooksTab />}
          {activeTab === "analytics" && <AnalyticsTab />}
          {activeTab === "token-usage" && <TokenUsageTab />}
          {activeTab === "revenue" && <RevenueTab />}
          {activeTab === "metrics" && <MetricsTab />}
          {activeTab === "content" && <ContentTab />}
          {activeTab === "system" && <SystemHealthTab />}
          {activeTab === "logs" && <LogsTab />}
          {activeTab === "settings" && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}
