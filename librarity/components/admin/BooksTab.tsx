"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, Search, Trash2, RefreshCw, Eye, User } from "lucide-react";
import { api } from "@/lib/api";

interface BookOwner {
  id: string;
  email: string;
  username?: string;
}

interface AdminBook {
  id: string;
  title: string;
  author?: string;
  owner: BookOwner;
  processing_status: string;
  file_path?: string;
  file_size?: number;
  file_type?: string;
  total_pages?: number;
  total_chunks?: number;
  created_at: string;
  processed_at?: string;
}

export function BooksTab() {
  const [books, setBooks] = useState<AdminBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const response = await api.getAdminBooks(
        currentPage,
        8, // Changed from 20 to 8
        searchTerm || undefined,
        statusFilter !== "all" ? statusFilter : undefined
      );
      setBooks(response.books);
      setTotalPages(Math.ceil(response.total / 8)); // Changed from 20 to 8
    } catch (error) {
      console.error("Failed to load books:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, [currentPage, statusFilter]);

  const handleSearch = () => {
    setCurrentPage(1);
    loadBooks();
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!confirm("Are you sure you want to delete this book? This action cannot be undone.")) {
      return;
    }
    try {
      await fetch(`/api/admin/books/${bookId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      loadBooks();
    } catch (error) {
      console.error("Failed to delete book:", error);
      alert("Failed to delete book");
    }
  };

  const handleReprocessBook = async (bookId: string) => {
    try {
      await fetch(`/api/admin/books/${bookId}/reprocess`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      loadBooks();
    } catch (error) {
      console.error("Failed to reprocess book:", error);
      alert("Failed to reprocess book");
    }
  };

  const handleViewBook = (book: AdminBook) => {
    if (!book.file_path) {
      alert("File path not available");
      return;
    }

    // Construct the full URL for the book file
    const baseUrl = "http://localhost:8000"; // Backend URL
    // Ensure file_path starts with / for proper URL construction
    const filePath = book.file_path.startsWith('/') ? book.file_path : `/${book.file_path}`;
    const fileUrl = `${baseUrl}${filePath}`;
    
    console.log("Opening book:", fileUrl); // Debug log
    
    // Open in new tab
    window.open(fileUrl, "_blank");
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pending" },
      processing: { bg: "bg-blue-100", text: "text-blue-800", label: "Processing" },
      completed: { bg: "bg-green-100", text: "text-green-800", label: "Completed" },
      failed: { bg: "bg-red-100", text: "text-red-800", label: "Failed" },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Book Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage all uploaded books</p>
        </div>
        <div className="flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#eb6a48] focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search books..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#eb6a48] focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-[#eb6a48] text-white rounded-lg hover:bg-[#d85a38] transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#eb6a48] border-t-transparent" />
        </div>
      ) : (
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
                    Book
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {books.map((book) => (
                  <tr key={book.id} className="hover:bg-gray-50 transition-colors h-24">
                    <td className="px-6 py-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg flex-shrink-0">
                          <BookOpen className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate max-w-xs">{book.title}</div>
                          {book.author && (
                            <div className="text-sm text-gray-500 truncate">by {book.author}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {book.owner.username?.[0]?.toUpperCase() || book.owner.email[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {book.owner.username || "Anonymous"}
                          </div>
                          <div className="text-xs text-gray-500 truncate">{book.owner.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-middle">{getStatusBadge(book.processing_status)}</td>
                    <td className="px-6 py-4 align-middle">
                      <div className="text-sm text-gray-600">
                        <div>Size: {formatFileSize(book.file_size)}</div>
                        <div>Type: {book.file_type?.toUpperCase() || "N/A"}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <div className="text-sm text-gray-600">
                        {new Date(book.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewBook(book)}
                          className="p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex-shrink-0"
                          title="View Book"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {book.processing_status === "failed" && (
                          <button
                            onClick={() => handleReprocessBook(book.id)}
                            className="p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors flex-shrink-0"
                            title="Reprocess"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteBook(book.id)}
                          className="p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors flex-shrink-0"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {books.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No books found</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
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
          )}
        </motion.div>
      )}
    </div>
  );
}
