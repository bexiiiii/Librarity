"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  BookOpen, 
  MessageSquare, 
  Coins, 
  TrendingUp,
  Shield,
  Activity,
  Ban
} from "lucide-react";
import api from "@/lib/api";

interface AdminStats {
  total_users: number;
  active_users: number;
  total_books: number;
  total_chats: number;
  total_tokens_used: number;
  subscriptions_by_tier: Record<string, number>;
}

interface AdminUser {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  role: string;
  is_active: boolean;
  created_at: string;
  subscription?: {
    tier: string;
    tokens_used: number;
    token_limit: number;
  };
  total_books: number;
  total_chats: number;
  total_tokens_used: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "books">("overview");

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const statsData = await api.getAdminStats();
      setStats(statsData);

      if (activeTab === "users") {
        const usersData = await api.getAllUsers();
        setUsers(usersData);
      }
    } catch (error) {
      console.error("Failed to load admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId: string, isActive: boolean) => {
    try {
      if (isActive) {
        await api.banUser(userId);
      } else {
        await api.unbanUser(userId);
      }
      loadData();
    } catch (error) {
      console.error("Failed to ban/unban user:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">Librarity System Management</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              <span className="text-sm text-muted-foreground">System Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="container mx-auto px-6">
          <div className="flex gap-8">
            {["overview", "users", "books"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {activeTab === "overview" && stats && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                icon={<Users className="w-6 h-6" />}
                title="Total Users"
                value={stats.total_users}
                subtitle={`${stats.active_users} active`}
                color="blue"
              />
              <StatCard
                icon={<BookOpen className="w-6 h-6" />}
                title="Total Books"
                value={stats.total_books}
                subtitle="Uploaded"
                color="purple"
              />
              <StatCard
                icon={<MessageSquare className="w-6 h-6" />}
                title="Total Chats"
                value={stats.total_chats}
                subtitle="Conversations"
                color="green"
              />
              <StatCard
                icon={<Coins className="w-6 h-6" />}
                title="Tokens Used"
                value={stats.total_tokens_used.toLocaleString()}
                subtitle="Total consumption"
                color="orange"
              />
            </div>

            {/* Subscriptions */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Subscriptions by Tier
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(stats.subscriptions_by_tier).map(([tier, count]) => (
                  <div key={tier} className="bg-background/50 p-4 rounded-lg">
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm text-muted-foreground capitalize">{tier}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">User</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Tier</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Books</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Chats</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Tokens</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">{user.email}</div>
                          <div className="text-sm text-muted-foreground">{user.username}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary">
                          {user.subscription?.tier || "free"}
                        </span>
                      </td>
                      <td className="px-4 py-3">{user.total_books}</td>
                      <td className="px-4 py-3">{user.total_chats}</td>
                      <td className="px-4 py-3">
                        {user.subscription && (
                          <div className="text-xs">
                            {user.subscription.tokens_used} / {user.subscription.token_limit}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            user.is_active
                              ? "bg-green-500/10 text-green-500"
                              : "bg-red-500/10 text-red-500"
                          }`}
                        >
                          {user.is_active ? "Active" : "Banned"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleBanUser(user.id, user.is_active)}
                          className="text-sm text-red-500 hover:text-red-400 flex items-center gap-1"
                        >
                          <Ban className="w-4 h-4" />
                          {user.is_active ? "Ban" : "Unban"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, subtitle, color }: { 
  icon: React.ReactNode; 
  title: string; 
  value: number | string; 
  subtitle: string; 
  color: "blue" | "purple" | "green" | "orange";
}) {
  const colorClasses = {
    blue: "from-blue-500/10 to-blue-600/10 text-blue-500",
    purple: "from-purple-500/10 to-purple-600/10 text-purple-500",
    green: "from-green-500/10 to-green-600/10 text-green-500",
    orange: "from-orange-500/10 to-orange-600/10 text-orange-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${colorClasses[color]} rounded-lg p-6 border border-border`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-background/50 rounded-lg">{icon}</div>
      </div>
      <div className="space-y-1">
        <div className="text-3xl font-bold">{value}</div>
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </motion.div>
  );
}
