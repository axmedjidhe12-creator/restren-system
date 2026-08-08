import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { CheckCircle2, ChefHat, ArrowLeft, LayoutDashboard } from 'lucide-react';

interface OrderItem {
  id: string;
  quantity: number;
  notes?: string;
  menuItem: {
    name: any;
    images?: string[];
  };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  table?: {
    tableNumber: string;
  };
  items: OrderItem[];
  createdAt: string;
}

export const KitchenDisplayPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLiveOrders = async () => {
    try {
      const res = await api.get('/orders/live?status=PENDING,PREPARING');
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load live kitchen orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveOrders();

    if (!user?.restaurantId) return;

    const socket = io('/', { path: '/socket.io' });

    socket.emit('join_kitchen', { restaurantId: user.restaurantId });

    socket.on('new_kitchen_order', (newOrder: Order) => {
      toast.success(`⚡ New Order ${newOrder.orderNumber}!`, { icon: '🔔', duration: 6000 });
      setOrders((prev) => [newOrder, ...prev]);
    });

    socket.on('order_status_updated', (updatedOrder: Order) => {
      setOrders((prev) =>
        prev
          .map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
          .filter((o) => o.status === 'PENDING' || o.status === 'PREPARING')
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    try {
      const res = await api.patch(`/orders/${orderId}/status`, { status: nextStatus });
      if (res.data.success) {
        toast.success(`Order status updated to ${nextStatus}`);
        setOrders((prev) =>
          prev
            .map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
            .filter((o) => o.status === 'PENDING' || o.status === 'PREPARING')
        );
      }
    } catch (err) {
      toast.error('Failed to update order status');
    }
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#fdfbf7', color: '#1c1917' }}>
      {/* Top Header Bar with Back Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-amber-900/10 mb-6">
        <div className="flex items-center gap-3">
          {(user?.role === 'RESTAURANT_OWNER' || user?.role === 'RESTAURANT_MANAGER' || user?.role === 'SUPER_ADMIN') && (
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2.5 rounded-xl text-stone-700 hover:text-stone-900 transition flex items-center gap-2 text-xs font-bold shadow-sm"
              style={{ background: '#ffffff', border: '1px solid #d6cbb5' }}
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
          )}

          <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md"
            style={{ background: 'linear-gradient(135deg, #2d5a2d, #1f421f)', color: '#ffffff' }}>
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2 font-serif" style={{ color: '#1c1917' }}>
              KITCHEN DISPLAY SYSTEM (KDS)
              <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: '#2d5a2d' }} />
            </h1>
            <p className="text-xs font-mono" style={{ color: '#78716c' }}>
              Logged in as: {user?.fullName || 'Kitchen Staff'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {(user?.role === 'RESTAURANT_OWNER' || user?.role === 'RESTAURANT_MANAGER' || user?.role === 'SUPER_ADMIN') && (
            <Link
              to="/dashboard"
              className="btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5"
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
            </Link>
          )}
          <span className="px-4 py-2 rounded-xl bg-white border border-amber-900/10 text-sm font-semibold shadow-sm">
            Active Orders: <span className="font-bold" style={{ color: '#2d5a2d' }}>{orders.length}</span>
          </span>
        </div>
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="text-center py-24" style={{ color: '#78716c' }}>Loading KDS live feed...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-24 glass-card max-w-2xl mx-auto">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: '#2d5a2d' }} />
          <h3 className="text-lg font-bold font-serif" style={{ color: '#1c1917' }}>All Kitchen Orders Clear!</h3>
          <p className="text-sm mt-1" style={{ color: '#57534e' }}>Standing by for incoming customer orders...</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className={`glass-card p-5 shadow-md flex flex-col justify-between transition ${
                order.status === 'PENDING' ? 'kds-card-pending' : 'kds-card-preparing'
              }`}
            >
              <div>
                <div className="flex items-center justify-between border-b border-amber-900/10 pb-3 mb-3">
                  <div>
                    <span className="text-lg font-black font-mono" style={{ color: '#1c1917' }}>{order.orderNumber}</span>
                    <span className="block text-xs font-semibold" style={{ color: '#86682b' }}>
                      {order.table ? `Table ${order.table.tableNumber}` : order.orderType}
                    </span>
                  </div>
                  <span
                    className={order.status === 'PENDING' ? 'badge-pending' : 'badge-preparing'}
                  >
                    {order.status}
                  </span>
                </div>

                {/* Items List with Food Images */}
                <div className="space-y-2.5 mb-4">
                  {order.items.map((item) => {
                    const imgUrl = item.menuItem?.images && item.menuItem.images.length > 0 ? item.menuItem.images[0] : null;
                    return (
                      <div key={item.id} className="flex items-center gap-3 p-1.5 rounded-xl bg-white/60 border border-stone-200/60">
                        {imgUrl ? (
                          <img src={imgUrl} alt="dish" className="w-12 h-12 rounded-lg object-cover shrink-0 border border-stone-300" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 text-amber-800 font-bold text-xs">
                            🍳
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-sm block truncate" style={{ color: '#1c1917' }}>
                            <span className="font-extrabold mr-1.5" style={{ color: '#2d5a2d' }}>{item.quantity}×</span>
                            {typeof item.menuItem?.name === 'object' ? item.menuItem.name.en : item.menuItem?.name}
                          </span>
                          {item.notes && <span className="text-[11px] text-stone-500 italic block">{item.notes}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-amber-900/10">
                {order.status === 'PENDING' ? (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                    className="w-full py-2.5 rounded-xl btn-gold text-sm font-bold shadow-sm"
                  >
                    Start Preparing
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'READY')}
                    className="w-full py-2.5 rounded-xl btn-primary text-sm font-bold shadow-sm"
                  >
                    Mark Ready for Serving
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
