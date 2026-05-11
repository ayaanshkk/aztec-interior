"use client";

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { API_ROOT } from '@/lib/api'; // ✅ Import from centralized config

interface Notification {
  id: string;
  message: string;
  read: boolean;
  dismissed: boolean;
  created_at: string;
  customer_id?: string;
  job_id?: string;
  form_submission_id?: number;
  form_type?: string;
  moved_by?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  fetchAllNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const unreadCount = notifications.filter(n => !n.read && !n.dismissed).length;

  // ✅ Helper to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  // ✅ Fetch notifications (for sidebar - excludes dismissed)
  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_ROOT}/notifications`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        // ✅ Map backend notification_id to frontend id
        const mappedData = data.map((n: any) => ({
          ...n,
          id: String(n.notification_id),  // ✅ Convert to string for React keys
          customer_id: n.customer_id || n.client_id,
        }));
        setNotifications(mappedData);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Fetch ALL notifications (for full page - includes dismissed)
  const fetchAllNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_ROOT}/notifications/all`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        // ✅ Map backend notification_id to frontend id
        const mappedData = data.map((n: any) => ({
          ...n,
          id: String(n.notification_id),  // ✅ Convert to string for React keys
          customer_id: n.customer_id || n.client_id,
        }));
        setNotifications(mappedData);
      }
    } catch (error) {
      console.error('Failed to fetch all notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`${API_ROOT}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, read: true } : n))
        );
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch(`${API_ROOT}/notifications/mark-all-read`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, read: true }))
        );
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // ✅ Dismiss notification (hide from sidebar, keep in full page)
  const dismissNotification = async (id: string) => {
    try {
      const response = await fetch(`${API_ROOT}/notifications/${id}/dismiss`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, dismissed: true } : n))
        );
      }
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch(`${API_ROOT}/notifications/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const clearAllNotifications = async () => {
    try {
      const response = await fetch(`${API_ROOT}/notifications/clear-all`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        dismissNotification,
        deleteNotification,
        clearAllNotifications,
        fetchNotifications,
        fetchAllNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}