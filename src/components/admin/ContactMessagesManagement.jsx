import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  EnvelopeIcon,
  EnvelopeOpenIcon,
  TrashIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import api from '../../utils/api';

const ContactMessagesManagement = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 15,
  });
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchMessages = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        search: searchTerm || undefined,
        filter: filter !== 'all' ? filter : undefined,
        per_page: pagination.per_page,
      };
      const response = await api.get('/admin/contact-messages', { params });
      setMessages(response.data.data.data);
      setPagination({
        current_page: response.data.data.current_page,
        last_page: response.data.data.last_page,
        total: response.data.data.total,
        per_page: response.data.data.per_page,
      });
    } catch (err) {
      setError('Failed to load messages');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [searchTerm, filter]);

  const handlePageChange = (newPage) => fetchMessages(newPage);

  const handleViewMessage = async (message) => {
    setSelectedMessage(message);
    setShowModal(true);
    if (!message.read_at) {
      try {
        await api.put(`/admin/contact-messages/${message.id}/read`);
        setMessages(prev =>
          prev.map(m => m.id === message.id ? { ...m, read_at: new Date().toISOString() } : m)
        );
      } catch (err) {
        console.error('Failed to mark as read:', err);
      }
    }
  };

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.put(`/admin/contact-messages/${id}/read`);
      setMessages(prev =>
        prev.map(m => m.id === id ? { ...m, read_at: new Date().toISOString() } : m)
      );
      if (selectedMessage?.id === id) {
        setSelectedMessage(prev => ({ ...prev, read_at: new Date().toISOString() }));
      }
    } catch (err) {
      console.error('Failed to mark as read');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/admin/contact-messages/${id}`);
      setMessages(prev => prev.filter(m => m.id !== id));
      if (selectedMessage?.id === id) setShowModal(false);
    } catch (err) {
      console.error('Failed to delete message');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return format(new Date(dateString), 'MMM d, yyyy HH:mm');
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
        {error}
      </div>
    );
  }

  const filterBtn = (value, label) => (
    <button
      onClick={() => setFilter(value)}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        filter === value
          ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
          : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/50">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100">Contact Messages</h2>
        <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Manage customer inquiries and feedback</p>
      </div>

      {/* Filters + Search */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          {filterBtn('all', `All (${pagination.total})`)}
          {filterBtn('unread', 'Unread')}
          {filterBtn('read', 'Read')}
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search by name, email, subject..."
            className="w-64 pl-8 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <svg className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-900">
            <tr>
              {['Status', 'Name', 'Email', 'Subject', 'Received', 'Actions'].map(h => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
            {messages.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-10 text-center text-gray-400 dark:text-slate-500 text-sm">
                  No messages found
                </td>
              </tr>
            ) : (
              messages.map((message) => (
                <tr
                  key={message.id}
                  onClick={() => handleViewMessage(message)}
                  className={`cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50 ${
                    !message.read_at ? 'font-semibold' : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    {message.read_at
                      ? <EnvelopeOpenIcon className="h-5 w-5 text-gray-400 dark:text-slate-500" title="Read" />
                      : <EnvelopeIcon className="h-5 w-5 text-green-600" title="Unread" />
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                    {message.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                    {message.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400 max-w-xs truncate">
                    {message.subject}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                    {formatDate(message.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2" onClick={e => e.stopPropagation()}>
                      {!message.read_at && (
                        <button
                          onClick={e => handleMarkRead(message.id, e)}
                          title="Mark as read"
                          className="text-green-600 hover:text-green-800 dark:hover:text-green-400 transition-colors"
                        >
                          <CheckCircleIcon className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={e => handleDelete(message.id, e)}
                        title="Delete"
                        className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.last_page > 1 && (
        <div className="px-6 py-4 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <p className="text-sm text-gray-700 dark:text-slate-400">
            Showing{' '}
            <span className="font-medium">{((pagination.current_page - 1) * pagination.per_page) + 1}</span>{' '}
            to{' '}
            <span className="font-medium">
              {Math.min(pagination.current_page * pagination.per_page, pagination.total)}
            </span>{' '}
            of <span className="font-medium">{pagination.total}</span> results
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(pagination.current_page - 1)}
              disabled={pagination.current_page === 1}
              className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded-md text-sm text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-600 dark:text-slate-400">
              Page {pagination.current_page} of {pagination.last_page}
            </span>
            <button
              onClick={() => handlePageChange(pagination.current_page + 1)}
              disabled={pagination.current_page === pagination.last_page}
              className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded-md text-sm text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Message Detail Modal */}
      {showModal && selectedMessage && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          onClick={() => setShowModal(false)}
        >
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-black/40 dark:bg-black/60" />
            <div
              className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl dark:shadow-slate-900/70 max-w-2xl w-full p-6"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex justify-between items-start mb-5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Message Details</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Meta grid */}
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-y-2 gap-x-4 text-sm">
                  {[
                    ['From', selectedMessage.name],
                    ['Email', selectedMessage.email],
                    ...(selectedMessage.phone ? [['Phone', selectedMessage.phone]] : []),
                    ['Subject', selectedMessage.subject],
                    ['Received', formatDate(selectedMessage.created_at)],
                    ...(selectedMessage.read_at ? [['Read at', formatDate(selectedMessage.read_at)]] : []),
                  ].map(([label, value]) => (
                    <React.Fragment key={label}>
                      <div className="font-medium text-gray-600 dark:text-slate-400">{label}:</div>
                      <div className="col-span-2 text-gray-900 dark:text-slate-100">{value}</div>
                    </React.Fragment>
                  ))}
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-2">Message:</p>
                  <div className="bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg p-3 text-sm text-gray-800 dark:text-slate-200 whitespace-pre-wrap">
                    {selectedMessage.message}
                  </div>
                </div>
              </div>

              {/* Modal actions */}
              <div className="mt-6 flex justify-end space-x-3">
                {!selectedMessage.read_at && (
                  <button
                    onClick={e => handleMarkRead(selectedMessage.id, e)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Mark as Read
                  </button>
                )}
                <button
                  onClick={e => { handleDelete(selectedMessage.id, e); setShowModal(false); }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-800 dark:text-slate-200 text-sm font-medium rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactMessagesManagement;
