import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEffect } from "react";
import { getStoredUserId } from "@/lib/authToken";

export interface Notification {
  id: number;
  userId: number;
  branchId: number | null;
  type: "low_stock" | "stock_movement" | "staff_activity" | "system";
  title: string;
  message: string;
  isRead: boolean;
  metadata?: {
    itemId?: number;
    movementId?: number;
    currentQuantity?: string;
    threshold?: string;
  } | null;
  createdAt: string;
}

export function useNotifications() {
  const queryClient = useQueryClient();
  const userId = getStoredUserId();

  // Query to fetch the list of notifications
  const query = useQuery<Notification[]>({
    queryKey: ["notifications", userId],
    queryFn: () => api.get<Notification[]>("/notifications"),
    enabled: !!userId,
  });

  // Mutation to mark a specific notification as read
  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => api.put<Notification>(`/notifications/${id}/read`, {}),
    onSuccess: (updatedNotif) => {
      // Optimistically update the cache
      queryClient.setQueryData<Notification[]>(["notifications", userId], (old) => {
        if (!old) return [];
        return old.map((n) => (n.id === updatedNotif.id ? updatedNotif : n));
      });
    },
  });

  // Mutation to mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: () => api.put<{ success: boolean }>("/notifications/read-all", {}),
    onSuccess: () => {
      queryClient.setQueryData<Notification[]>(["notifications", userId], (old) => {
        if (!old) return [];
        return old.map((n) => ({ ...n, isRead: true }));
      });
    },
  });

  // Establish SSE stream connection for real-time updates
  useEffect(() => {
    if (!userId) return;

    const eventSource = new EventSource(`/api/notifications/stream?userId=${userId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "connected") {
          return;
        }

        // Add the new notification to cache instantly!
        queryClient.setQueryData<Notification[]>(["notifications", userId], (old) => {
          if (!old) return [data];
          if (old.some((n) => n.id === data.id)) return old;
          return [data, ...old];
        });
      } catch (err) {
        console.error("Failed to parse incoming SSE message", err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn("SSE connection error, will automatically reconnect", err);
    };

    return () => {
      eventSource.close();
    };
  }, [userId, queryClient]);

  const notifications = query.data || [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    isLoading: query.isLoading,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
  };
}
