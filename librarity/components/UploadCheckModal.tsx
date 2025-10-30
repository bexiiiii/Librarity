"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Zap, Crown, TrendingUp } from "lucide-react";
import api from "@/lib/api";

interface UploadCheckResult {
  canUpload: boolean;
  reason?: string;
  upgradeRequired?: boolean;
  currentTier?: string;
  suggestedTier?: string;
}

interface UploadCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function useUploadCheck() {
  const [checkResult, setCheckResult] = useState<UploadCheckResult | null>(null);
  const [checking, setChecking] = useState(false);

  const checkUploadEligibility = async (): Promise<UploadCheckResult> => {
    setChecking(true);
    try {
      const [subscription, tokenUsage, books] = await Promise.all([
        api.getSubscription(),
        api.getTokenUsage(),
        api.getBooks(1, 1) // Just to get total count
      ]);

      // Check subscription status
      if (subscription.status === 'expired') {
        return {
          canUpload: false,
          reason: 'Your subscription has expired',
          upgradeRequired: true,
          currentTier: subscription.tier,
        };
      }

      // Check token usage
      const tokenPercent = (tokenUsage.tokens_used / tokenUsage.tokens_limit) * 100;
      if (tokenPercent >= 100) {
        return {
          canUpload: false,
          reason: 'You have reached your monthly token limit',
          upgradeRequired: true,
          currentTier: subscription.tier,
          suggestedTier: subscription.tier === 'free' ? 'pro' : 'ultimate',
        };
      }

      // Check book limits based on tier
      const bookLimits: Record<string, number> = {
        free: 5,
        pro: 50,
        ultimate: -1, // unlimited
      };

      const limit = bookLimits[subscription.tier] || 5;
      if (limit !== -1 && books.total >= limit) {
        return {
          canUpload: false,
          reason: `You have reached the book limit for ${subscription.tier} tier (${limit} books)`,
          upgradeRequired: true,
          currentTier: subscription.tier,
          suggestedTier: subscription.tier === 'free' ? 'pro' : 'ultimate',
        };
      }

      // Warn if approaching limits
      if (tokenPercent >= 80) {
        return {
          canUpload: true,
          reason: `You are using ${Math.round(tokenPercent)}% of your monthly tokens`,
          upgradeRequired: false,
        };
      }

      return {
        canUpload: true,
      };
    } catch (error) {
      console.error("Failed to check upload eligibility:", error);
      return {
        canUpload: true, // Allow upload on error
      };
    } finally {
      setChecking(false);
    }
  };

  return { checkUploadEligibility, checking, checkResult };
}

export function UploadCheckModal({ isOpen, onClose, onConfirm }: UploadCheckModalProps) {
  const [result, setResult] = useState<UploadCheckResult | null>(null);
  const { checkUploadEligibility } = useUploadCheck();

  useEffect(() => {
    if (isOpen) {
      checkAndShow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const checkAndShow = async () => {
    const res = await checkUploadEligibility();
    setResult(res);

    // If can upload and no warnings, proceed directly
    if (res.canUpload && !res.reason) {
      onConfirm();
      onClose();
    }
  };

  if (!isOpen || !result) return null;

  const handleUpgrade = () => {
    window.location.href = '/pricing';
  };

  const handleProceed = () => {
    if (result.canUpload) {
      onConfirm();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
        {/* Icon */}
        <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
          result.canUpload ? 'bg-yellow-100' : 'bg-red-100'
        }`}>
          {result.canUpload ? (
            <Zap className="w-8 h-8 text-yellow-600" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-red-600" />
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          {result.canUpload ? 'Usage Warning' : 'Upgrade Required'}
        </h2>

        {/* Message */}
        <p className="text-gray-600 text-center mb-6">
          {result.reason}
        </p>

        {/* Suggested Tier */}
        {result.suggestedTier && (
          <div className="bg-gradient-to-r from-violet-50 to-blue-50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <Crown className="w-6 h-6 text-violet-600" />
              <div>
                <p className="font-semibold text-gray-900">
                  Upgrade to {result.suggestedTier.charAt(0).toUpperCase() + result.suggestedTier.slice(1)}
                </p>
                <p className="text-sm text-gray-600">
                  Get {result.suggestedTier === 'ultimate' ? 'unlimited' : 'more'} books and tokens
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Stats */}
        {result.currentTier && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Current Plan</p>
              <p className="font-bold text-gray-900 capitalize">{result.currentTier}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <p className={`font-bold ${result.canUpload ? 'text-yellow-600' : 'text-red-600'}`}>
                {result.canUpload ? 'Warning' : 'Limit Reached'}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {result.canUpload ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleProceed}
                className="flex-1 px-4 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors"
              >
                Continue Upload
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpgrade}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-blue-700 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                Upgrade Now
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
