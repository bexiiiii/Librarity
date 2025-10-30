"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Ban, CheckCircle, Edit, X, Check } from "lucide-react";
import api from "@/lib/api";

interface AdminUser {
  id: string;
  email: string;
  username?: string;
  role: string;
  created_at: string;
  is_banned: boolean;
  subscription_tier?: string;
}

interface UsersTabProps {
  users: AdminUser[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  handleBanUser: (userId: string) => void;
  handleUnbanUser: (userId: string) => void;
  onUserUpdated?: () => void;
}

export function UsersTab({
  users,
  searchTerm,
  setSearchTerm,
  currentPage,
  setCurrentPage,
  totalPages,
  handleBanUser,
  handleUnbanUser,
  onUserUpdated,
}: UsersTabProps) {
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [updating, setUpdating] = useState(false);

  const handleChangeTier = async (userId: string) => {
    if (!selectedTier) return;
    
    try {
      setUpdating(true);
      await api.updateUserTier(userId, selectedTier);
      setEditingUser(null);
      if (onUserUpdated) {
        onUserUpdated();
      }
    } catch (error) {
      console.error("Failed to update tier:", error);
      alert("Failed to update subscription tier");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage all registered users</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#eb6a48] focus:border-transparent"
          />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Subscription
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                        {user.username 
                          ? user.username[0]?.toUpperCase() 
                          : user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {user.username || user.email.split('@')[0]}
                        </div>
                        <div className="text-sm text-gray-500">ID: {user.id.slice(0, 8)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {editingUser === user.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedTier}
                          onChange={(e) => setSelectedTier(e.target.value)}
                          disabled={updating}
                          className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#eb6a48]"
                        >
                          <option value="free">Free</option>
                          <option value="pro">Pro</option>
                          <option value="ultimate">Ultimate</option>
                        </select>
                        <button
                          onClick={() => handleChangeTier(user.id)}
                          disabled={updating}
                          className="p-1 bg-green-50 text-green-700 rounded hover:bg-green-100 disabled:opacity-50"
                          title="Save"
                        >
                          {updating ? (
                            <div className="animate-spin w-4 h-4 border-2 border-green-700 border-t-transparent rounded-full" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setEditingUser(null)}
                          disabled={updating}
                          className="p-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {user.subscription_tier || 'free'}
                        </span>
                        <button
                          onClick={() => {
                            setEditingUser(user.id);
                            setSelectedTier(user.subscription_tier || 'free');
                          }}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="Change tier"
                        >
                          <Edit className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    {user.is_banned ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <Ban className="w-3 h-3" />
                        Banned
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3" />
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {user.is_banned ? (
                      <button
                        onClick={() => handleUnbanUser(user.id)}
                        className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                      >
                        Unban
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBanUser(user.id)}
                        className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                      >
                        Ban
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-[#eb6a48] text-white rounded-lg hover:bg-[#d85a38] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
