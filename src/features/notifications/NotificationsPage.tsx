import { useEffect, useState } from 'react';
import {
  Bell, BellOff, CheckCheck, Trash2,
  CreditCard, Receipt, Calendar, AlertCircle, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import PageHeader from '@/components/layout/PageHeader';
import PageShell from '@/components/layout/PageShell';
import EmptyState from '@/components/shared/EmptyState';
import Pagination from '@/components/shared/Pagination';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { useConfirm } from '@/hooks/use-confirm';
import { useNotificationStore } from '@/stores/notification.store';
import {
  useGetNotifications,
  useGetNotificationsUnreadCount,
  usePatchNotificationsReadAll,
  usePatchNotificationsNotificationIdRead,
  useDeleteNotificationsNotificationId,
} from '@/api/generated/notifications/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { getGetNotificationsQueryKey, getGetNotificationsUnreadCountQueryKey } from '@/api/generated/notifications/notifications';
import type { Notification } from '@/api/generated/schemas/notification';
import type { NotificationType } from '@/api/generated/schemas/notificationType';

// ─── Notification type config ─────────────────────────────────────────────────

type NotifConfig = {
  icon: React.ElementType;
  label: string;
  color: string;
};

const TYPE_CONFIG: Record<string, NotifConfig> = {
  'subscription.created':      { icon: Calendar,     label: 'Subscription Created',  color: 'text-green-500' },
  'subscription.expiring_soon':{ icon: AlertCircle,  label: 'Expiring Soon',         color: 'text-yellow-500' },
  'subscription.expired':      { icon: AlertCircle,  label: 'Subscription Expired',  color: 'text-red-500' },
  'subscription.renewed':      { icon: RefreshCw,    label: 'Subscription Renewed',  color: 'text-green-500' },
  'subscription.cancelled':    { icon: BellOff,      label: 'Subscription Cancelled',color: 'text-red-500' },
  'invoice.issued':            { icon: Receipt,      label: 'Invoice Issued',        color: 'text-blue-500' },
  'invoice.overdue':           { icon: AlertCircle,  label: 'Invoice Overdue',       color: 'text-red-500' },
  'payment.received':          { icon: CreditCard,   label: 'Payment Received',      color: 'text-green-500' },
  'instalment.due':            { icon: CreditCard,   label: 'Instalment Due',        color: 'text-yellow-500' },
  'instalment.overdue':        { icon: AlertCircle,  label: 'Instalment Overdue',    color: 'text-red-500' },
};

function getConfig(type?: string): NotifConfig {
  return TYPE_CONFIG[type ?? ''] ?? { icon: Bell, label: 'Notification', color: 'text-muted-foreground' };
}

// ─── NotificationItem ─────────────────────────────────────────────────────────

function NotificationItem({
  notification,
  onRead,
  onDelete,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const cfg = getConfig(notification.type);
  const Icon = cfg.icon;
  const isUnread = !notification.read;

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-4 transition-colors ${
        isUnread ? 'bg-primary/5 border-primary/20' : 'bg-card'
      }`}
    >
      {/* Icon */}
      <div className={`mt-0.5 shrink-0 ${cfg.color}`}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm ${isUnread ? 'font-semibold' : 'font-medium'}`}>
            {notification.title}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            {isUnread && (
              <span className="h-2 w-2 rounded-full bg-primary" />
            )}
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {notification.createdAt
                ? new Date(notification.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : ''}
            </span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{notification.body}</p>

        <div className="flex items-center gap-2 pt-1">
          <Badge variant="outline" className="text-xs px-2 py-0">
            {cfg.label}
          </Badge>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {isUnread && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Mark as read"
            onClick={() => onRead(notification._id ?? '')}
          >
            <CheckCheck className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          title="Delete"
          onClick={() => onDelete(notification._id ?? '')}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── NotificationsPage ────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const limit = 20;

  const { confirm, confirmProps } = useConfirm();

  // Store sync
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const clearUnread    = useNotificationStore((s) => s.clearUnread);
  const decrementUnread = useNotificationStore((s) => s.decrementUnread);

  // Queries
  const { data, isLoading, refetch } = useGetNotifications(
    { page, limit, unreadOnly },
    { query: { staleTime: 1000 * 30, refetchInterval: 1000 * 60 } },
  );

  const { data: countData } = useGetNotificationsUnreadCount({
    query: {
      staleTime: 1000 * 30,
      refetchInterval: 1000 * 60,
    },
  });

  // Sync unread count into store whenever it updates
  useEffect(() => {
    if (countData?.data?.count !== undefined) {
      setUnreadCount(countData.data.count);
    }
  }, [countData, setUnreadCount]);

  const notifications: Notification[] = data?.data ?? [];
  const pagination = data?.pagination;
  const unreadCount = data?.unreadCount ?? 0;

  // Mutations
  const markAllRead = usePatchNotificationsReadAll({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetNotificationsUnreadCountQueryKey() });
        clearUnread();
      },
    },
  });

  const markOneRead = usePatchNotificationsNotificationIdRead({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetNotificationsUnreadCountQueryKey() });
        decrementUnread();
      },
    },
  });

  const deleteNotif = useDeleteNotificationsNotificationId({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetNotificationsUnreadCountQueryKey() });
      },
    },
  });

  function handleMarkRead(id: string) {
    markOneRead.mutate({ notificationId: id });
  }

  function handleDelete(id: string) {
    confirm(
      {
        title: 'Delete notification?',
        description: 'This notification will be permanently removed.',
        variant: 'destructive',
        confirmLabel: 'Delete',
      },
      () => deleteNotif.mutate({ notificationId: id }),
    );
  }

  function handleMarkAllRead() {
    markAllRead.mutate();
  }

  return (
    <PageShell>
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Refresh
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={markAllRead.isPending}
              >
                <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                Mark all read
              </Button>
            )}
          </div>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Switch
            id="unreadOnly"
            checked={unreadOnly}
            onCheckedChange={(v) => { setUnreadOnly(v); setPage(1); }}
          />
          <Label htmlFor="unreadOnly" className="text-sm cursor-pointer">
            Unread only
          </Label>
        </div>
        {unreadCount > 0 && (
          <Badge variant="secondary">{unreadCount} unread</Badge>
        )}
      </div>

      <Separator />

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-12 w-12" />}
          title={unreadOnly ? 'No unread notifications' : 'No notifications yet'}
          description={
            unreadOnly
              ? 'Toggle off "Unread only" to see all notifications.'
              : 'Notifications about subscriptions, invoices, and payments will appear here.'
          }
          action={
            unreadOnly
              ? { label: 'Show all', onClick: () => setUnreadOnly(false) }
              : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <NotificationItem
              key={notif._id}
              notification={notif}
              onRead={handleMarkRead}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {pagination && notifications.length > 0 && (
        <Pagination
          meta={pagination}
          onPageChange={setPage}
        />
      )}

      <ConfirmDialog {...confirmProps} loading={deleteNotif.isPending} />
    </PageShell>
  );
}
