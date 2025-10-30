"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings as SettingsIcon, Tag, Plus, Trash2, ToggleLeft, ToggleRight, Copy, X, Server, Database, Zap, HardDrive, Shield, Cpu } from "lucide-react";
import api from "@/lib/api";

interface PromoCode {
  id: string;
  code: string;
  discount_percent: number;
  max_uses: number;
  current_uses: number;
  tier: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

interface SystemSettings {
  system: {
    app_name: string;
    environment: string;
    debug_mode: boolean;
    version: string;
  };
  features: {
    s3_storage: boolean;
    redis_enabled: boolean;
    qdrant_enabled: boolean;
    polar_integration: boolean;
    celery_enabled: boolean;
  };
  token_limits: {
    free: number;
    pro: number;
    ultimate: number;
  };
  ai_config: {
    model: string;
    embedding_model: string;
    api_configured: boolean;
  };
  database: {
    total_books: number;
    total_chats: number;
    connection_pool_size: number;
  };
  storage: {
    max_upload_size_mb: number;
    storage_used_mb: number;
    s3_bucket: string | null;
  };
  rate_limits: {
    per_minute: number;
    per_hour: number;
  };
}

export function SettingsTab() {
  const [activeSection, setActiveSection] = useState<"general" | "promo">("promo");
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    code: "",
    discount_percent: 10,
    max_uses: 100,
    tier: "pro",
    expires_days: 30,
  });

  useEffect(() => {
    if (activeSection === "promo") {
      loadPromoCodes();
    } else if (activeSection === "general") {
      loadSystemSettings();
    }
  }, [activeSection]);

  const loadPromoCodes = async () => {
    try {
      setLoading(true);
      const codes = await api.getPromoCodes();
      setPromoCodes(codes.promo_codes || []);
    } catch (error) {
      console.error("Failed to load promo codes:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemSettings = async () => {
    try {
      setLoading(true);
      const settings = await api.getSystemSettings();
      setSystemSettings(settings);
    } catch (error) {
      console.error("Failed to load system settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createPromoCode(formData);
      setShowCreateModal(false);
      setFormData({
        code: "",
        discount_percent: 10,
        max_uses: 100,
        tier: "pro",
        expires_days: 30,
      });
      loadPromoCodes();
    } catch (error) {
      console.error("Failed to create promo code:", error);
      alert("Failed to create promo code");
    }
  };

  const handleTogglePromo = async (id: string, isActive: boolean) => {
    try {
      await api.togglePromoCode(id, !isActive);
      loadPromoCodes();
    } catch (error) {
      console.error("Failed to toggle promo code:", error);
    }
  };

  const handleDeletePromo = async (id: string) => {
    if (!confirm("Are you sure you want to delete this promo code?")) return;
    try {
      await api.deletePromoCode(id);
      loadPromoCodes();
    } catch (error) {
      console.error("Failed to delete promo code:", error);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    alert(`Copied: ${code}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-1">System configuration and promo codes</p>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveSection("promo")}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeSection === "promo"
              ? "border-[#eb6a48] text-[#eb6a48]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Tag className="w-4 h-4 inline mr-2" />
          Promo Codes
        </button>
        <button
          onClick={() => setActiveSection("general")}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeSection === "general"
              ? "border-[#eb6a48] text-[#eb6a48]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <SettingsIcon className="w-4 h-4 inline mr-2" />
          General
        </button>
      </div>

      {/* Promo Codes Section */}
      {activeSection === "promo" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Promo Code Management</h3>
              <p className="text-sm text-gray-500 mt-1">Create and manage discount codes</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-[#eb6a48] text-white rounded-lg hover:bg-[#d85a38] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Promo Code
            </button>
          </div>

          {/* Create Modal */}
          <AnimatePresence>
            {showCreateModal && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowCreateModal(false)}
                  className="fixed inset-0 bg-black/50 z-50"
                />
                
                {/* Modal */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#eb6a48] to-[#d85a38]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <Tag className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white">Create New Promo Code</h3>
                    </div>
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <form onSubmit={handleCreatePromo} className="p-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Promo Code *
                        </label>
                        <input
                          type="text"
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                          placeholder="SUMMER2024"
                          required
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#eb6a48] transition-colors font-mono"
                        />
                        <p className="text-xs text-gray-500 mt-1">Enter a unique code (uppercase)</p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Discount Percentage *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={formData.discount_percent}
                            onChange={(e) => setFormData({ ...formData, discount_percent: parseInt(e.target.value) })}
                            min="1"
                            max="100"
                            required
                            className="w-full px-4 py-3 pr-10 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#eb6a48] transition-colors"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Discount percentage (1-100%)</p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Maximum Uses *
                        </label>
                        <input
                          type="number"
                          value={formData.max_uses}
                          onChange={(e) => setFormData({ ...formData, max_uses: parseInt(e.target.value) })}
                          min="1"
                          required
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#eb6a48] transition-colors"
                        />
                        <p className="text-xs text-gray-500 mt-1">How many times can be used</p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Subscription Tier *
                        </label>
                        <select
                          value={formData.tier}
                          onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#eb6a48] transition-colors"
                        >
                          <option value="pro">Pro Tier</option>
                          <option value="ultimate">Ultimate Tier</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Which tier this applies to</p>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Expiration (Days) *
                        </label>
                        <input
                          type="number"
                          value={formData.expires_days}
                          onChange={(e) => setFormData({ ...formData, expires_days: parseInt(e.target.value) })}
                          min="1"
                          required
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#eb6a48] transition-colors"
                        />
                        <p className="text-xs text-gray-500 mt-1">Number of days until expiration</p>
                      </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => setShowCreateModal(false)}
                        className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-[#eb6a48] to-[#d85a38] text-white rounded-xl hover:shadow-lg transition-all font-semibold"
                      >
                        Create Promo Code
                      </button>
                    </div>
                  </form>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Promo Codes List */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
          >
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#eb6a48] border-t-transparent" />
              </div>
            ) : promoCodes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Discount</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Uses</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tier</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Expires</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {promoCodes.map((promo) => (
                      <tr key={promo.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-gray-900">{promo.code}</span>
                            <button
                              onClick={() => copyToClipboard(promo.code)}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                              title="Copy code"
                            >
                              <Copy className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-green-600">
                          {promo.discount_percent}% OFF
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {promo.current_uses} / {promo.max_uses}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {promo.tier}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(promo.expires_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          {promo.is_active ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleTogglePromo(promo.id, promo.is_active)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title={promo.is_active ? "Deactivate" : "Activate"}
                            >
                              {promo.is_active ? (
                                <ToggleRight className="w-5 h-5 text-green-600" />
                              ) : (
                                <ToggleLeft className="w-5 h-5 text-gray-400" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeletePromo(promo.id)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Tag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No promo codes yet - Coming soon</p>
                <p className="text-sm text-gray-400 mt-1">Create your first promo code to get started</p>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* General Settings Section */}
      {activeSection === "general" && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#eb6a48] border-t-transparent" />
            </div>
          ) : systemSettings ? (
            <>
              {/* System Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 border border-gray-200"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Server className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">System Information</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Application</p>
                    <p className="text-base font-semibold text-gray-900">{systemSettings.system.app_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Environment</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      systemSettings.system.environment === 'production' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {systemSettings.system.environment}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Version</p>
                    <p className="text-base font-semibold text-gray-900">{systemSettings.system.version}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Debug Mode</p>
                    <p className="text-base font-semibold text-gray-900">
                      {systemSettings.system.debug_mode ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Features Status */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl p-6 border border-gray-200"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Zap className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Features & Integrations</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(systemSettings.features).map(([key, enabled]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        enabled ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Token Limits */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl p-6 border border-gray-200"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Token Limits by Tier</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(systemSettings.token_limits).map(([tier, limit]) => (
                    <div key={tier} className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                      <p className="text-sm font-semibold text-gray-500 uppercase mb-2">{tier}</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {limit === -1 ? '∞' : limit.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">tokens/month</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* AI Configuration */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl p-6 border border-gray-200"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-pink-100 rounded-lg">
                    <Cpu className="w-5 h-5 text-pink-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">AI Configuration</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Chat Model</p>
                    <p className="text-base font-semibold text-gray-900 font-mono">{systemSettings.ai_config.model}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Embedding Model</p>
                    <p className="text-xs font-semibold text-gray-900 font-mono">{systemSettings.ai_config.embedding_model}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">API Status</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      systemSettings.ai_config.api_configured 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {systemSettings.ai_config.api_configured ? 'Configured' : 'Not Configured'}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Database & Storage */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white rounded-2xl p-6 border border-gray-200"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Database className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Database</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Books</span>
                      <span className="text-lg font-bold text-gray-900">{systemSettings.database.total_books}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Chats</span>
                      <span className="text-lg font-bold text-gray-900">{systemSettings.database.total_chats}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Pool Size</span>
                      <span className="text-lg font-bold text-gray-900">{systemSettings.database.connection_pool_size}</span>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-white rounded-2xl p-6 border border-gray-200"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <HardDrive className="w-5 h-5 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Storage</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Max Upload Size</span>
                      <span className="text-lg font-bold text-gray-900">{systemSettings.storage.max_upload_size_mb} MB</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Storage Used</span>
                      <span className="text-lg font-bold text-gray-900">{systemSettings.storage.storage_used_mb} MB</span>
                    </div>
                    {systemSettings.storage.s3_bucket && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">S3 Bucket</span>
                        <span className="text-sm font-mono text-gray-900">{systemSettings.storage.s3_bucket}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Rate Limits */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-2xl p-6 border border-gray-200"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Shield className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Rate Limits</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Per Minute</p>
                    <p className="text-2xl font-bold text-gray-900">{systemSettings.rate_limits.per_minute}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Per Hour</p>
                    <p className="text-2xl font-bold text-gray-900">{systemSettings.rate_limits.per_hour}</p>
                  </div>
                </div>
              </motion.div>
            </>
          ) : (
            <div className="text-center py-12">
              <SettingsIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Failed to load system settings</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
