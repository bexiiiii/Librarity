/**
 * API Client for Lexent AI Backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

class APIClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('access_token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.detail || error.message || 'Request failed');
    }

    return response.json();
  }

  // Generic GET method
  async get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' });
  }

  // Auth endpoints
  async register(data: { email: string; password: string; full_name?: string; username?: string }) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(response.access_token);
    return response;
  }

  async login(email: string, password: string) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async logout() {
    this.clearToken();
  }

  // Google OAuth endpoints
  async initGoogleOAuth() {
    return this.request('/auth/oauth/google');
  }

  async handleGoogleCallback(code: string, state: string) {
    const data = await this.request(`/auth/oauth/google/callback?code=${code}&state=${state}`, {
      method: 'GET',
    });
    this.setToken(data.access_token);
    return data;
  }

  // Books endpoints
  async uploadBook(
    file: File, 
    metadata?: { title?: string; author?: string; description?: string },
    onProgress?: (progress: number) => void
  ) {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata?.title) formData.append('title', metadata.title);
    if (metadata?.author) formData.append('author', metadata.author);
    if (metadata?.description) formData.append('description', metadata.description);

    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Use XMLHttpRequest for upload progress
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.detail || 'Upload failed'));
          } catch (e) {
            reject(new Error('Upload failed'));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error'));
      });

      xhr.open('POST', `${this.baseURL}/books/upload`);
      
      // Set authorization header
      if (this.token) {
        xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);
      }

      xhr.send(formData);
    });
  }

  async getBooks(page = 1, pageSize = 20) {
    return this.request(`/books/?page=${page}&page_size=${pageSize}`);
  }

  async getBook(bookId: string) {
    return this.request(`/books/${bookId}`);
  }

  async deleteBook(bookId: string) {
    return this.request(`/books/${bookId}`, { method: 'DELETE' });
  }

  // Chat endpoints
  async chatWithBook(data: {
    book_id: string;
    message: string;
    mode?: string;
    session_id?: string;
    include_citations?: boolean;
  }) {
    return this.request('/chat/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getChatHistory(sessionId: string) {
    return this.request(`/chat/history/${sessionId}`);
  }

  async getChatSessions(bookId?: string) {
    const query = bookId ? `?book_id=${bookId}` : '';
    return this.request(`/chat/sessions${query}`);
  }

  // Subscription endpoints
  async getSubscription() {
    return this.request('/subscription/');
  }

  async upgradeSubscription(tier: string, billingInterval = 'monthly') {
    return this.request('/subscription/upgrade', {
      method: 'POST',
      body: JSON.stringify({ tier, billing_interval: billingInterval }),
    });
  }

  async getTokenUsage() {
    return this.request('/subscription/tokens');
  }

  async getTokenStats() {
    return this.request('/subscription/tokens/stats');
  }

  // Admin endpoints
  async getAdminStats() {
    return this.request('/admin/stats');
  }

  async getAdminOverviewStats() {
    return this.request('/admin/stats/overview');
  }

  async getAdminGrowthStats(days = 30) {
    return this.request(`/admin/stats/growth?days=${days}`);
  }

  async getActiveUsersStats() {
    return this.request('/admin/stats/active-users');
  }

  async getChatModesStats(days = 30) {
    return this.request(`/admin/stats/chat-modes?days=${days}`);
  }

  async getTimeInAppStats(days = 30) {
    return this.request(`/admin/stats/time-in-app?days=${days}`);
  }

  async getViralCoefficientStats(days = 30) {
    return this.request(`/admin/stats/viral-coefficient?days=${days}`);
  }

  async getRetentionStats() {
    return this.request('/admin/stats/retention');
  }

  async getConversionToPremiumStats() {
    return this.request('/admin/stats/conversion-to-premium');
  }

  async getAllUsers(page = 1, pageSize = 50) {
    return this.request(`/admin/users?page=${page}&page_size=${pageSize}`);
  }

  async searchUsers(query: string, skip = 0, limit = 50) {
    return this.request(`/admin/users/search?q=${query}&skip=${skip}&limit=${limit}`);
  }

  async updateUserRole(userId: string, role: string) {
    return this.request(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  async deleteUser(userId: string) {
    return this.request(`/admin/users/${userId}`, { method: 'DELETE' });
  }

  async getAllBooks(page = 1, pageSize = 50) {
    return this.request(`/admin/books?page=${page}&page_size=${pageSize}`);
  }

  async getAdminBooks(page = 1, pageSize = 20, search?: string, status?: string) {
    let query = `page=${page}&page_size=${pageSize}`;
    if (search) query += `&search=${encodeURIComponent(search)}`;
    if (status) query += `&status=${status}`;
    return this.request(`/admin/books?${query}`);
  }

  async deleteAdminBook(bookId: string) {
    return this.request(`/admin/books/${bookId}`, { method: 'DELETE' });
  }

  async reprocessBook(bookId: string) {
    return this.request(`/admin/books/${bookId}/reprocess`, { method: 'POST' });
  }

  async getTrendingContent(limit = 20) {
    return this.request(`/admin/content/trending?limit=${limit}`);
  }

  async featureContent(contentId: string, isFeatured: boolean) {
    return this.request(`/admin/content/${contentId}/feature`, {
      method: 'PATCH',
      body: JSON.stringify({ is_featured: isFeatured }),
    });
  }

  async recalculateLeaderboard() {
    return this.request('/admin/leaderboard/calculate', { method: 'POST' });
  }

  async getLeaderboardTop(limit = 100) {
    return this.request(`/admin/leaderboard/top?limit=${limit}`);
  }

  async testEmail(email: string) {
    return this.request('/admin/notifications/test-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async testTelegram() {
    return this.request('/admin/notifications/test-telegram', { method: 'POST' });
  }

  async broadcastNotification(subject: string, message: string) {
    return this.request('/admin/notifications/broadcast', {
      method: 'POST',
      body: JSON.stringify({ subject, message }),
    });
  }

  // Analytics endpoints
  async getBookAnalytics(limit = 10) {
    return this.request(`/admin/analytics/books?limit=${limit}`);
  }

  async getTopicAnalytics(limit = 10) {
    return this.request(`/admin/analytics/topics?limit=${limit}`);
  }

  async getAIIssues(days = 7) {
    return this.request(`/admin/analytics/ai-issues?days=${days}`);
  }

  async getEngagementTrends(days = 30) {
    return this.request(`/admin/analytics/engagement?days=${days}`);
  }

  async getStartupMetrics(days = 30) {
    return this.request(`/admin/analytics/startup-metrics?days=${days}`);
  }

  // Revenue endpoints
  async getRevenueStats() {
    return this.request('/admin/revenue/stats');
  }

  async getPaymentHistory(page = 1, pageSize = 20) {
    return this.request(`/admin/payments?page=${page}&page_size=${pageSize}`);
  }

  // Promo code endpoints
  async getPromoCodes(skip = 0, limit = 100) {
    return this.request(`/admin/promo-codes?skip=${skip}&limit=${limit}`);
  }

  async createPromoCode(data: {
    code: string;
    discount_percent: number;
    max_uses: number;
    tier: string;
    expires_days: number;
  }) {
    return this.request('/admin/promo-codes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async togglePromoCode(codeId: string, isActive: boolean) {
    return this.request(`/admin/promo-codes/${codeId}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
    });
  }

  async deletePromoCode(codeId: string) {
    return this.request(`/admin/promo-codes/${codeId}`, { method: 'DELETE' });
  }

  // User tier management
  async updateUserTier(userId: string, tier: string) {
    return this.request(`/admin/users/${userId}/subscription`, {
      method: 'PATCH',
      body: JSON.stringify({ tier }),
    });
  }

  // Content management endpoints
  async getSharedContent(page = 1, pageSize = 20) {
    return this.request(`/admin/content/shared?page=${page}&page_size=${pageSize}`);
  }

  // System logs endpoints
  async getSystemLogs(category = 'all', page = 1, pageSize = 50, days = 7) {
    return this.request(`/admin/logs?category=${category}&page=${page}&page_size=${pageSize}&days=${days}`);
  }

  // System settings endpoints
  async getSystemSettings() {
    return this.request('/admin/system-settings');
  }

  // Billing endpoints
  async getBillingHistory() {
    return this.request('/billing/history');
  }

  async applyPromoCode(code: string) {
    return this.request('/billing/apply-promo', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  // Polar.sh endpoints
  async createPolarCheckout(tier: string, billingInterval: string = 'monthly') {
    return this.request('/polar/create-checkout', {
      method: 'POST',
      body: JSON.stringify({ tier, billing_interval: billingInterval }),
    });
  }

  async checkPolarStatus() {
    return this.request('/polar/status');
  }

  // Token Usage Analytics endpoints (Admin only)
  async getTokenUsageSummary(days = 30) {
    return this.request(`/admin/analytics/token-usage/summary?days=${days}`);
  }

  async getTokenUsageByAction(days = 30) {
    return this.request(`/admin/analytics/token-usage/by-action?days=${days}`);
  }

  async getTokenUsageByUser(days = 30) {
    return this.request(`/admin/analytics/token-usage/by-user?days=${days}`);
  }

  async getTokenUsageTimeline(days = 30) {
    return this.request(`/admin/analytics/token-usage/timeline?days=${days}`);
  }

  // Admin - User Management
  async getAdminUsers(page = 1, limit = 20, filters?: any) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filters || {})
    });
    return this.request(`/admin/users?${params}`);
  }

  async updateUserSubscription(userId: string, data: any) {
    return this.request(`/admin/users/${userId}/subscription`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async banUser(userId: string, reason?: string) {
    return this.request(`/admin/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async unbanUser(userId: string) {
    return this.request(`/admin/users/${userId}/unban`, {
      method: 'POST',
    });
  }
}

const api = new APIClient(API_BASE_URL);

export default api;
