import React, { useState, useEffect, useRef } from 'react';
import { LuBell, LuCheck, LuCheckCheck, LuTrash2, LuX } from 'react-icons/lu';
import { Notification } from '../types';
import './NotificationBell.css';

interface NotificationBellProps {
  userId: number;
}

function NotificationBell({ userId }: NotificationBellProps): React.ReactElement {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const getHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('normx_kc_access_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchNotifications = async (): Promise<void> => {
    try {
      const headers = getHeaders();
      const [notifRes, countRes] = await Promise.all([
        fetch(`/api/notifications/${userId}`, { headers }),
        fetch(`/api/notifications/${userId}/unread-count`, { headers }),
      ]);
      if (notifRes.ok) {
        const data: Notification[] = await notifRes.json();
        setNotifications(data);
      }
      if (countRes.ok) {
        const data = await countRes.json();
        setUnreadCount(data.count);
      }
    } catch { /* silently */ }
  };

  useEffect(() => {
    if (!userId) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (open && ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const markAsRead = async (id: number): Promise<void> => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PUT', headers: getHeaders() });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silently */ }
  };

  const markAllAsRead = async (): Promise<void> => {
    try {
      await fetch(`/api/notifications/read-all/${userId}`, { method: 'PUT', headers: getHeaders() });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* silently */ }
  };

  const deleteNotification = async (id: number): Promise<void> => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE', headers: getHeaders() });
      const removed = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (removed && !removed.read) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silently */ }
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Il y a ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `Il y a ${diffD}j`;
    return d.toLocaleDateString('fr-FR');
  };

  const typeColor = (type: string): string => {
    switch (type) {
      case 'success': return '#D4A843';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className="notif-bell-wrapper" ref={ref}>
      <button className="notif-bell-btn" onClick={() => setOpen(!open)} title="Notifications">
        <LuBell size={18} />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <span className="notif-dropdown-title">Notifications</span>
            {unreadCount > 0 && (
              <button className="notif-mark-all" onClick={markAllAsRead} title="Tout marquer comme lu">
                <LuCheckCheck size={14} /> Tout lire
              </button>
            )}
            <button className="notif-close-btn" onClick={() => setOpen(false)}><LuX size={16} /></button>
          </div>

          <div className="notif-list">
            {notifications.length === 0 && (
              <div className="notif-empty">Aucune notification.</div>
            )}
            {notifications.map(n => (
              <div key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`}>
                <div className="notif-item-dot" style={{ background: n.read ? 'transparent' : typeColor(n.type) }} />
                <div className="notif-item-content">
                  <div className="notif-item-title">{n.title}</div>
                  <div className="notif-item-message">{n.message}</div>
                  <div className="notif-item-time">{formatDate(n.created_at)}</div>
                </div>
                <div className="notif-item-actions">
                  {!n.read && (
                    <button onClick={() => markAsRead(n.id)} title="Marquer comme lu"><LuCheck size={13} /></button>
                  )}
                  <button onClick={() => deleteNotification(n.id)} title="Supprimer"><LuTrash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
