'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Mail, Calendar, LogOut, Settings, Crown } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'account' | 'subscription' | 'promocode'>('account');
  const [showPricingPlans, setShowPricingPlans] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUserData();
    }
  }, [isOpen]);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const userData = await api.getCurrentUser();
      setUser(userData);
      
      try {
        const subData = await api.getSubscription();
        setSubscription(subData);
      } catch (error) {
        console.error('Failed to load subscription:', error);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    window.location.href = '/';
  };

  const getUserInitial = () => {
    if (user?.username) return user.username[0].toUpperCase();
    if (user?.email) return user.email[0].toUpperCase();
    return 'U';
  };

  const getSubscriptionTier = () => {
    if (!subscription) return 'Free';
    const tier = subscription.tier || 'free';
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  const getFormattedDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 flex items-center justify-center p-0 sm:p-4 z-50 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="flex flex-col md:flex-row w-full h-full md:h-[85vh] md:max-w-6xl bg-[#0a0a0b] md:rounded-3xl overflow-hidden shadow-2xl pointer-events-auto"
            >
              {/* Left Sidebar */}
              <div className="hidden md:flex md:w-80 bg-[#18181b] flex-col flex-shrink-0">

              {/* Sidebar Header */}
              <div className="p-6 space-y-6">
                {/* Profile Section */}
                {!isLoading && user && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-gradient-to-br from-yellow-200 to-lime-300 rounded-full flex items-center justify-center">
                        <span className="text-xl font-bold text-gray-800">
                          {getUserInitial()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold text-white truncate">
                          {user?.username || user?.email?.split('@')[0] || 'User'}
                        </h2>
                        <p className="text-sm text-gray-400 truncate">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Menu Items */}
              <div className="flex-1 px-4 space-y-2">
                <motion.button
                  onClick={() => setActiveSection('account')}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                    activeSection === 'account' 
                      ? "bg-white/10 text-white" 
                      : "text-gray-400"
                  )}
                >
                  <User className="w-5 h-5" />
                  <span className="font-medium">Account</span>
                </motion.button>

                <motion.button
                  onClick={() => setActiveSection('subscription')}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                    activeSection === 'subscription' 
                      ? "bg-white/10 text-white" 
                      : "text-gray-400"
                  )}
                >
                  <Crown className="w-5 h-5" />
                  <span className="font-medium">Subscription</span>
                </motion.button>

                <motion.button
                  onClick={() => setActiveSection('promocode')}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                    activeSection === 'promocode' 
                      ? "bg-white/10 text-white" 
                      : "text-gray-400"
                  )}
                >
                  <Settings className="w-5 h-5" />
                  <span className="font-medium">Promocode</span>
                </motion.button>
              </div>

              {/* Bottom Section */}
              <div className="p-4 space-y-4">
                {/* Discord Banner (optional) */}
                <div className="bg-[#27272a] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-[#5865F2] rounded-full flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g clipPath="url(#clip0)">
                          <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="white"/>
                        </g>
                      </svg>
                    </div>
                    <h3 className="text-white font-semibold">Join our Discord</h3>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">
                    Connect with community, and share your work!
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-2 bg-[#3a3a3f] hover:bg-[#42424a] rounded-lg text-white font-medium transition-colors"
                  >
                    Join now
                  </motion.button>
                </div>

                {/* Logout */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-3 text-gray-400 hover:text-white transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Log out</span>
                </motion.button>
              </div>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 bg-[#0a0a0b] overflow-y-auto relative w-full">
              <div className="max-w-4xl p-4 sm:p-6 md:p-8">
                {/* Close Button */}
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute top-4 right-4 sm:top-6 sm:right-6 md:top-8 md:right-8 w-10 h-10 bg-[#27272a] hover:bg-[#3a3a3f] rounded-full flex items-center justify-center transition-colors z-10"
                >
                  <X className="w-5 h-5 text-white" />
                </motion.button>

                {/* Mobile Navigation Tabs */}
                <div className="md:hidden flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveSection('account')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                      activeSection === 'account'
                        ? 'bg-[#eb6a48] text-white'
                        : 'bg-[#27272a] text-gray-400 hover:text-white'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>Account</span>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveSection('subscription')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                      activeSection === 'subscription'
                        ? 'bg-[#eb6a48] text-white'
                        : 'bg-[#27272a] text-gray-400 hover:text-white'
                    }`}
                  >
                    <Crown className="w-4 h-4" />
                    <span>Subscription</span>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveSection('promocode')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                      activeSection === 'promocode'
                        ? 'bg-[#eb6a48] text-white'
                        : 'bg-[#27272a] text-gray-400 hover:text-white'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Promocode</span>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors whitespace-nowrap flex-shrink-0 bg-[#27272a] text-gray-400 hover:text-white"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log out</span>
                  </motion.button>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-gray-700 border-t-[#eb6a48] rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    {/* Account Section */}
                    {activeSection === 'account' && (
                      <div className="space-y-4 md:space-y-8">
                        {/* Header with Avatar */}
                        <div className="bg-[#27272a] rounded-2xl md:rounded-3xl p-4 md:p-8">
                          <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-4">
                            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                              <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-yellow-200 to-lime-300 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-2xl md:text-3xl font-bold text-gray-800">
                                  {getUserInitial()}
                                </span>
                              </div>
                              <div>
                                <h2 className="text-xl md:text-2xl font-bold text-white">
                                  {user?.username || user?.email?.split('@')[0] || 'User'}
                                </h2>
                                <p className="text-sm md:text-base text-gray-400 break-all">
                                  {user?.email}
                                </p>
                              </div>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-[#eb6a48] hover:bg-[#d85a38] rounded-xl text-white font-medium transition-colors text-sm md:text-base whitespace-nowrap"
                            >
                              <Settings className="w-4 h-4 md:w-5 md:h-5" />
                              Edit profile
                            </motion.button>
                          </div>
                        </div>

                        {/* Account Details */}
                        <div className="bg-[#27272a] rounded-2xl md:rounded-3xl p-4 md:p-8">
                          <h3 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">Account details</h3>
                          <div className="space-y-4 md:space-y-6">
                            <div>
                              <label className="text-xs md:text-sm text-gray-500 mb-2 block">Username</label>
                              <p className="text-base md:text-lg text-white">{user?.username || 'radiating_rainbow_super'}</p>
                            </div>
                            <div>
                              <label className="text-sm text-gray-500 mb-2 block">Email</label>
                              <p className="text-lg text-white">{user?.email}</p>
                            </div>
                          </div>
                        </div>

                        {/* Subscription Section */}
                        {subscription && (
                          <div className="bg-[#27272a] rounded-2xl md:rounded-3xl p-4 md:p-8">
                            <h3 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">Subscription</h3>
                            <div className="bg-gradient-to-br from-[#eb6a48] to-[#d85a38] rounded-xl md:rounded-2xl p-4 md:p-6">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                                    <Crown className="w-5 h-5 md:w-6 md:h-6 text-white" />
                                  </div>
                                  <div>
                                    <p className="text-white font-semibold text-lg md:text-xl">{getSubscriptionTier()} Plan</p>
                                    <p className="text-white/80 text-xs md:text-sm">
                                      {subscription?.tier === 'free' 
                                        ? 'Upgrade to unlock more features' 
                                        : 'You have full access'}
                                    </p>
                                  </div>
                                </div>
                                {subscription?.tier === 'free' && (
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => window.location.href = '/pricing'}
                                    className="px-4 md:px-6 py-2.5 md:py-3 bg-white text-[#eb6a48] font-semibold rounded-xl hover:bg-white/90 transition-colors text-sm md:text-base whitespace-nowrap"
                                  >
                                    Upgrade
                                  </motion.button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Promocode Section */}
                    {activeSection === 'promocode' && (
                      <div className="flex flex-col items-center justify-center min-h-[500px]">
                        <h1 className="text-5xl font-bold text-white mb-12">Enter code</h1>
                        
                        <div className="w-full max-w-md space-y-4">
                          <input
                            type="text"
                            placeholder="Enter your promo code"
                            className="w-full px-6 py-4 bg-[#27272a] border-2 border-gray-800 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-[#eb6a48] transition-colors text-lg"
                          />
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full px-6 py-4 bg-[#eb6a48] text-white font-semibold rounded-2xl hover:bg-[#d85a38] transition-colors text-lg"
                          >
                            Apply Code
                          </motion.button>
                        </div>
                      </div>
                    )}

                    {/* Subscription Management Section */}
                    {activeSection === 'subscription' && (
                      <div className="space-y-6">
                        {!showPricingPlans ? (
                          <>
                            {/* Page Header */}
                            <div className="mb-8">
                              <h1 className="text-3xl font-bold text-white mb-2">Subscription</h1>
                              <p className="text-gray-400">Manage your subscription and billing</p>
                            </div>

                            {/* Current Plan Card */}
                            <div className="bg-[#27272a] rounded-3xl p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                  <div className="w-14 h-14 bg-[#eb6a48]/20 rounded-2xl flex items-center justify-center">
                                    <Crown className="w-7 h-7 text-[#eb6a48]" />
                                  </div>
                                  <div>
                                    <h2 className="text-2xl font-bold text-white capitalize">
                                      {subscription?.tier || 'Free'} Plan
                                    </h2>
                                    <p className="text-sm text-gray-400 mt-1">
                                      {subscription?.is_active ? 'Active subscription' : 'No active subscription'}
                                    </p>
                                  </div>
                                </div>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => setShowPricingPlans(true)}
                                  className="px-6 py-3 bg-[#eb6a48] text-white font-semibold rounded-xl hover:bg-[#d85a38] transition-colors"
                                >
                                  Manage
                                </motion.button>
                              </div>
                              
                              {subscription?.end_date && (
                                <p className="text-sm text-gray-400">
                                  Renews on {new Date(subscription.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Pricing Plans View */}
                            <div className="mb-8">
                              <motion.button
                                onClick={() => setShowPricingPlans(false)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="text-gray-400 hover:text-white mb-4 flex items-center gap-2"
                              >
                                ← Back
                              </motion.button>
                              <h1 className="text-3xl font-bold text-white mb-2">Choose Your Plan</h1>
                              <p className="text-gray-400">Select the plan that fits your needs</p>
                            </div>

                            {/* Pricing Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                              {/* Free Plan */}
                              <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="bg-[#27272a] rounded-2xl md:rounded-3xl p-4 md:p-6 border-2 border-gray-800"
                              >
                                <div className="mb-4 md:mb-6">
                                  <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Free</h3>
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-3xl md:text-4xl font-bold text-white">$0</span>
                                    <span className="text-gray-400">/month</span>
                                  </div>
                                </div>

                                <ul className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                                  <li className="flex items-center gap-2 text-gray-300">
                                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                    </svg>
                                    1 Book
                                  </li>
                                  <li className="flex items-center gap-2 text-gray-300">
                                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                    </svg>
                                    10,000 Tokens/month
                                  </li>
                                  <li className="flex items-center gap-2 text-gray-300">
                                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                    </svg>
                                    Book Brain Mode
                                  </li>
                                  <li className="flex items-center gap-2 text-gray-500">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                                    </svg>
                                    Citation Mode
                                  </li>
                                  <li className="flex items-center gap-2 text-gray-500">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                                    </svg>
                                    Author & Coach Modes
                                  </li>
                                </ul>

                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  disabled={subscription?.tier === 'free'}
                                  className={cn(
                                    "w-full py-2.5 md:py-3 rounded-xl font-semibold transition-colors text-sm md:text-base",
                                    subscription?.tier === 'free'
                                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                                      : "bg-gray-700 text-white hover:bg-gray-600"
                                  )}
                                >
                                  {subscription?.tier === 'free' ? 'Current Plan' : 'Downgrade'}
                                </motion.button>
                              </motion.div>

                              {/* Pro Plan */}
                              <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="bg-[#27272a] rounded-2xl md:rounded-3xl p-4 md:p-6 border-2 border-[#eb6a48] relative"
                              >
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                  <span className="bg-[#eb6a48] text-white px-3 md:px-4 py-1 rounded-full text-xs md:text-sm font-semibold">
                                    Popular
                                  </span>
                                </div>

                                <div className="mb-4 md:mb-6 mt-2">
                                  <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Pro</h3>
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-3xl md:text-4xl font-bold text-white">$10</span>
                                    <span className="text-gray-400">/month</span>
                                  </div>
                                </div>

                                <ul className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                                  <li className="flex items-center gap-2 text-gray-300">
                                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                    </svg>
                                    10 Books
                                  </li>
                                  <li className="flex items-center gap-2 text-gray-300">
                                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                    </svg>
                                    100,000 Tokens/month
                                  </li>
                                  <li className="flex items-center gap-2 text-gray-300">
                                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                    </svg>
                                    All Chat Modes
                                  </li>
                                  <li className="flex items-center gap-2 text-gray-300">
                                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                    </svg>
                                    Citation Mode
                                  </li>
                                  <li className="flex items-center gap-2 text-gray-300">
                                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                    </svg>
                                    Author & Coach Modes
                                  </li>
                                </ul>

                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  disabled={subscription?.tier === 'pro'}
                                  className={cn(
                                    "w-full py-2.5 md:py-3 rounded-xl font-semibold transition-colors text-sm md:text-base",
                                    subscription?.tier === 'pro'
                                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                                      : "bg-[#eb6a48] text-white hover:bg-[#d85a38]"
                                  )}
                                >
                                  {subscription?.tier === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
                                </motion.button>
                              </motion.div>

                              {/* Ultimate Plan */}
                              <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="bg-gradient-to-br from-[#27272a] to-[#1a1a1c] rounded-2xl md:rounded-3xl p-4 md:p-6 border-2 border-purple-600"
                              >
                                <div className="mb-4 md:mb-6">
                                  <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Ultimate</h3>
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-3xl md:text-4xl font-bold text-white">$25</span>
                                    <span className="text-gray-400">/month</span>
                                  </div>
                                </div>

                                <ul className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                                  <li className="flex items-center gap-2 text-gray-300">
                                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                    </svg>
                                    Unlimited Books
                                  </li>
                                  <li className="flex items-center gap-2 text-gray-300">
                                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                    </svg>
                                    500,000 Tokens/month
                                  </li>
                                  <li className="flex items-center gap-2 text-gray-300">
                                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                    </svg>
                                    All Chat Modes
                                  </li>
                                  <li className="flex items-center gap-2 text-gray-300">
                                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                    </svg>
                                    Priority Support
                                  </li>
                                  <li className="flex items-center gap-2 text-gray-300">
                                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                    </svg>
                                    Advanced Analytics
                                  </li>
                                </ul>

                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  disabled={subscription?.tier === 'ultimate'}
                                  className={cn(
                                    "w-full py-2.5 md:py-3 rounded-xl font-semibold transition-colors text-sm md:text-base",
                                    subscription?.tier === 'ultimate'
                                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                                      : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500"
                                  )}
                                >
                                  {subscription?.tier === 'ultimate' ? 'Current Plan' : 'Upgrade to Ultimate'}
                                </motion.button>
                              </motion.div>
                            </div>
                          </>
                        )}

                        {/* Credits - показываем только когда не в режиме выбора плана */}
                        {!showPricingPlans && (
                          <>
                            <div className="bg-[#27272a] rounded-3xl p-6">
                              <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-white">Credits</h2>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="px-6 py-3 bg-[#eb6a48] text-white font-semibold rounded-xl hover:bg-[#d85a38] transition-colors"
                                >
                                  Buy credits
                                </motion.button>
                              </div>

                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <span className="text-3xl font-bold text-white">
                                    {subscription?.tokens_used?.toLocaleString() || 0} Credit
                                  </span>
                                  <span className="text-sm text-gray-400">
                                    of {subscription?.token_limit?.toLocaleString() || 0} total
                                  </span>
                                </div>
                                
                                <div className="w-full bg-gray-800 rounded-full h-3">
                                  <div
                                    className="bg-[#eb6a48] h-3 rounded-full transition-all"
                                    style={{
                                      width: `${subscription?.tokens_usage_percentage || 0}%`
                                    }}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Billing History */}
                            <div className="bg-[#27272a] rounded-3xl p-6">
                              <h2 className="text-2xl font-bold text-white mb-6">Billing history</h2>
                              
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead>
                                    <tr className="border-b border-gray-800">
                                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Date</th>
                                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Amount</th>
                                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Status</th>
                                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Invoice</th>
                                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      <td colSpan={5} className="text-center py-12 text-gray-500">
                                        No billing history available
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Danger Zone */}
                            <div className="bg-[#27272a] rounded-3xl p-6 border-2 border-red-900/30">
                              <h2 className="text-2xl font-bold text-red-400 mb-2">Danger zone</h2>
                              <p className="text-gray-400 text-sm mb-6">
                                Manage subscription cancellation and account deletion
                              </p>
                              
                              <div className="space-y-3">
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  className="w-full px-6 py-3 bg-red-900/20 text-red-400 border-2 border-red-900/50 rounded-xl hover:bg-red-900/30 transition-colors font-semibold"
                                >
                                  Cancel Subscription
                                </motion.button>
                                
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  className="w-full px-6 py-3 bg-red-900/20 text-red-400 border-2 border-red-900/50 rounded-xl hover:bg-red-900/30 transition-colors font-semibold"
                                >
                                  Delete Account
                                </motion.button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
