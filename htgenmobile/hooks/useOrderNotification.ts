import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { orderService, OrderResponse } from '@/services/orderService';
import { pushNotificationService } from '@/services/pushNotificationService';
import { useNotification } from '@/contexts/NotificationContext';

const ENABLE_ORDER_NOTIFICATIONS = false;

export function useOrderNotification() {
  const { showInfo } = useNotification();
  const previousOrderIdsRef = useRef<Set<string>>(new Set());
  const notificationSentRef = useRef<Set<string>>(new Set());
  const isInitializedRef = useRef(false);

  const { data: ordersResponse } = useQuery({
    queryKey: ['orders', 'initiation-notification'],
    queryFn: async () => {
      return await orderService.getByStatus('initiation');
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!ENABLE_ORDER_NOTIFICATIONS) {
      return;
    }

    if (!ordersResponse?.success || !ordersResponse.data) return;

    const orders = ordersResponse.data as OrderResponse[];
    
    // Initialize previousOrderIds on first load (don't send notifications for existing orders)
    if (!isInitializedRef.current) {
      previousOrderIdsRef.current = new Set(orders.map((o) => o.orderId));
      isInitializedRef.current = true;
      return;
    }

    const currentOrderIds = new Set(orders.map((o) => o.orderId));

    // Find new orders that weren't in the previous set
    const newOrders = orders.filter(
      (order) =>
        !previousOrderIdsRef.current.has(order.orderId) &&
        String(order.orderStatus).toLowerCase() === 'initiation'
    );

    // Send notifications for new orders
    newOrders.forEach((order) => {
      const orderId = order.orderId;
      
      // Only send notification if we haven't sent one for this order yet
      if (!notificationSentRef.current.has(orderId)) {
        const orderName = order.orderName || 'Đơn hàng mới';
        const message = `Đơn hàng "${orderName}" đang ở trạng thái khởi tạo`;

        console.log('[useOrderNotification] New initiation order detected:', orderId, orderName);

        // Show in-app notification
        showInfo('Đơn hàng mới cần xử lý', message, 5000);

        // Send push notification
        pushNotificationService
          .scheduleLocalNotification(
            'Đơn hàng mới cần xử lý',
            message,
            {
              type: 'info',
              orderId: orderId,
              screen: '/orders',
            },
            0 // Send immediately
          )
          .catch((error) => {
            console.error('[useOrderNotification] Error sending push notification:', error);
          });

        notificationSentRef.current.add(orderId);
      }
    });

    // Update previous order IDs
    previousOrderIdsRef.current = currentOrderIds;

    // Clean up old notifications (older than 1 hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const ordersToKeep = orders.filter((order) => {
      if (!order.createdAt) return true;
      const createdAt = new Date(order.createdAt).getTime();
      return createdAt > oneHourAgo;
    });
    const ordersToKeepIds = new Set(ordersToKeep.map((o) => o.orderId));
    
    // Remove notifications for orders that are no longer in initiation status or are too old
    notificationSentRef.current.forEach((orderId) => {
      if (!ordersToKeepIds.has(orderId)) {
        notificationSentRef.current.delete(orderId);
      }
    });
  }, [ordersResponse, showInfo]);
}
