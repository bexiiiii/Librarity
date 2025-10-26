/**
 * API Client for Librarity Backend
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

  // Books endpoints
  async uploadBook(file: File, metadata?: { title?: string; author?: string; description?: string }) {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata?.title) formData.append('title', metadata.title);
    if (metadata?.author) formData.append('author', metadata.author);
    if (metadata?.description) formData.append('description', metadata.description);

    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}/books/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
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

  async getAllUsers(page = 1, pageSize = 50) {
    return this.request(`/admin/users?page=${page}&page_size=${pageSize}`);
  }

  async banUser(userId: string) {
    return this.request(`/admin/users/${userId}/ban`, { method: 'PATCH' });
  }

  async unbanUser(userId: string) {
    return this.request(`/admin/users/${userId}/unban`, { method: 'PATCH' });
  }

  async getAllBooks(page = 1, pageSize = 50) {
    return this.request(`/admin/books?page=${page}&page_size=${pageSize}`);
  }
}

export const api = new APIClient(API_BASE_URL);
export default api;
