"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DollarSign, CreditCard, TrendingUp, Users, Calendar } from "lucide-react";
import api from "@/lib/api";

interface Payment {
  id: string;
  user_email: string;
  amount: number;
  currency: string;
  status: string;
  tier: string;
  created_at: string;
}

interface RevenueStats {
  total_revenue: number;
  monthly_revenue: number;
  paying_users: number;
  conversion_rate: number;
}

export function RevenueTab() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<RevenueStats>({
    total_revenue: 0,
    monthly_revenue: 0,
    paying_users: 0,
    conversion_rate: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadRevenue();
  }, [currentPage]);

  const loadRevenue = async () => {
    try {
      setLoading(true);
      const [paymentsData, statsData] = await Promise.all([
        api.getPaymentHistory(currentPage, 20),
        api.getRevenueStats(),
      ]);
      setPayments(paymentsData.payments || []);
      setTotalPages(Math.ceil((paymentsData.total || 0) / 20));
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load revenue:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      completed: { bg: "bg-green-100", text: "text-green-800" },
      pending: { bg: "bg-yellow-100", text: "text-yellow-800" },
      failed: { bg: "bg-red-100", text: "text-red-800" },
      refunded: { bg: "bg-gray-100", text: "text-gray-800" },
    };
    const style = config[status] || config.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Revenue & Payments</h2>
        <p className="text-sm text-gray-500 mt-1">Financial metrics and payment history</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 border border-gray-200"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Total Revenue</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">${stats.total_revenue.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">All time</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 border border-gray-200"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">This Month</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">${stats.monthly_revenue.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">Current month</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 border border-gray-200"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-500">Paying Users</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.paying_users}</div>
          <div className="text-xs text-gray-500 mt-1">Active subscriptions</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 border border-gray-200"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-sm text-gray-500">Conversion</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.conversion_rate.toFixed(1)}%</div>
          <div className="text-xs text-gray-500 mt-1">Free to paid</div>
        </motion.div>
      </div>

      {/* Payment History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#eb6a48] border-t-transparent" />
          </div>
        ) : payments.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{payment.user_email}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        ${payment.amount.toFixed(2)} {payment.currency.toUpperCase()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {payment.tier}
                        </span>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(payment.status)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(payment.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">Page {currentPage} of {totalPages}</div>
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
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No payment history yet - Coming soon</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
