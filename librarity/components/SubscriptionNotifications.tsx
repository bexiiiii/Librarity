"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Zap, Crown, X } from "lucide-react";
import api from "@/lib/api";

interface Subscription {
  tier: string;
  status: string;
  expires_at: string | null;
  auto_renew: boolean;
}

interface TokenUsage {
  tokens_used: number;
  tokens_limit: number;
  requests_count: number;
  cost_usd: number;
}

type NotificationType = 'expired' | 'expiring-soon' | 'token-limit' | 'token-warning' | null;

export function SubscriptionNotifications() {
  const [notification, setNotification] = useState<NotificationType>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkSubscriptionStatus();
    checkTokenUsage();
    
    // Check every 5 minutes
    const interval = setInterval(() => {
      checkSubscriptionStatus();
      checkTokenUsage();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const data = await api.getSubscription();
      setSubscription(data);

      // Check if subscription expired
      if (data.status === 'expired' && !dismissed.has('expired')) {
        setNotification('expired');
        return;
      }

      // Check if expiring soon (within 7 days)
      if (data.expires_at && !dismissed.has('expiring-soon')) {
        const expiresAt = new Date(data.expires_at);
        const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        if (daysLeft <= 7 && daysLeft > 0) {
          setNotification('expiring-soon');
        }
      }
    } catch (error) {
      console.error("Failed to check subscription:", error);
    }
  };

  const checkTokenUsage = async () => {
    try {
      const data = await api.getTokenUsage();
      setTokenUsage(data);

      const usagePercent = (data.tokens_used / data.tokens_limit) * 100;

      // Check if token limit reached
      if (usagePercent >= 100 && !dismissed.has('token-limit')) {
        setNotification('token-limit');
        return;
      }

      // Check if approaching token limit (>80%)
      if (usagePercent >= 80 && usagePercent < 100 && !dismissed.has('token-warning')) {
        setNotification('token-warning');
      }
    } catch (error) {
      console.error("Failed to check token usage:", error);
    }
  };

  const handleDismiss = () => {
    if (notification) {
      setDismissed(prev => new Set(prev).add(notification));
      setNotification(null);
    }
  };

  const handleUpgrade = () => {
    window.location.href = '/pricing';
  };

  const getNotificationContent = () => {
    switch (notification) {
      case 'expired':
        return {
          icon: AlertTriangle,
          color: 'red',
          title: 'Subscription Expired',
          message: 'Your subscription has expired. Upgrade to continue using premium features.',
          action: 'Upgrade Now',
        };
      case 'expiring-soon':
        const daysLeft = subscription?.expires_at 
          ? Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : 0;
        return {
          icon: Crown,
          color: 'yellow',
          title: 'Subscription Expiring Soon',
          message: `Your subscription expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Renew now to avoid interruption.`,
          action: 'Renew Now',
        };
      case 'token-limit':
        return {
          icon: Zap,
          color: 'red',
          title: 'Token Limit Reached',
          message: 'You have reached your monthly token limit. Upgrade your plan to continue.',
          action: 'Upgrade Plan',
        };
      case 'token-warning':
        const percent = tokenUsage 
          ? Math.round((tokenUsage.tokens_used / tokenUsage.tokens_limit) * 100)
          : 0;
        return {
          icon: Zap,
          color: 'orange',
          title: 'Token Usage Warning',
          message: `You have used ${percent}% of your monthly tokens. Consider upgrading to avoid interruption.`,
          action: 'View Plans',
        };
      default:
        return null;
    }
  };

  const content = getNotificationContent();
  if (!content) return null;

  const Icon = content.icon;
  const colorClasses = {
    red: 'bg-red-50 border-red-200 text-red-900',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
  }[content.color];

  const iconClasses = {
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    orange: 'text-orange-600',
  }[content.color];

  const buttonClasses = {
    red: 'bg-red-600 hover:bg-red-700',
    yellow: 'bg-yellow-600 hover:bg-yellow-700',
    orange: 'bg-orange-600 hover:bg-orange-700',
  }[content.color];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-2xl w-full mx-4"
      >
        <div className={`${colorClasses} border-2 rounded-xl p-4 shadow-lg`}>
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-white/50 flex items-center justify-center ${iconClasses}`}>
              <Icon className="w-5 h-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold mb-1">{content.title}</h3>
              <p className="text-sm opacity-90">{content.message}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleUpgrade}
                className={`${buttonClasses} text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap`}
              >
                {content.action}
              </button>
              
              <button
                onClick={handleDismiss}
                className="p-2 hover:bg-black/5 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
