import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import {
  Utensils, Bell, CheckCircle2, RefreshCw, LogOut,
  Clock, DollarSign, UserCheck, Plus, Trash2, Printer,
  Receipt, ShoppingBag, Send, X, Search, Filter, AlertCircle
} from 'lucide-react';

// ── Interfaces ────────────────────────────────────────────────────────────────

interface MenuItem {
  id: string;
  name: Record<string, string>;
  price: number;
  isAvailable: boolean;
  images?: string[];
  category?: { name: Record<string, string> };
}

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice?: number;
  notes?: string;
  menuItem: { name: any; images?: string[] };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  table?: { id?: string; tableNumber: string };
  tableId?: string;
  subtotal?: number;
  tax?: number;
  totalAmount: number;
  paymentStatus?: string;
  paymentMethod?: string;
  items: OrderItem[];
  createdAt: string;
}

interface Table {
  id: string;
  tableNumber: string;
  capacity: number;
  status: string;
}

type OrderDraft = { menuItem: MenuItem; quantity: number; notes: string };

export const WaiterPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ── Main State ──────────────────────────────────────────────────────────────
  const [liveOrders, setLiveOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'tables'>('orders');
  const [tableFilter, setTableFilter] = useState<string>('ALL');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [waiterCalls, setWaiterCalls] = useState<{ tableNumber: string; timestamp: string }[]>([]);

  // ── Take Order Modal State ──────────────────────────────────────────────────
  const [isTakeOrderOpen, setIsTakeOrderOpen] = useState(false);
  const [selectedTableForOrder, setSelectedTableForOrder] = useState<Table | null>(null);
  const [orderDraft, setOrderDraft] = useState<OrderDraft[]>([]);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');

  // ── Receipt / Bill Modal State ──────────────────────────────────────────────
  const [selectedOrderForBill, setSelectedOrderForBill] = useState<Order | null>(null);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);

  // ── Data Fetchers ──────────────────────────────────────────────────────────
  const fetchLiveOrders = useCallback(async () => {
    try {
      const res = await api.get('/orders/live?status=READY,PREPARING,PENDING,SERVED');
      if (res.data.success) {
        setLiveOrders(res.data.data);
      }
    } catch {
      toast.error('Failed to load live orders');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTables = useCallback(async () => {
    if (!user?.branchId) return;
    try {
      const res = await api.get(`/tables?branchId=${user.branchId}`);
      if (res.data.success) {
        const allTables: Table[] = res.data.data;
        // Waiter sees only their assigned tables; owners/managers see all
        if (user.role === 'WAITER' && user.assignedTables && user.assignedTables.length > 0) {
          const assignedIds = new Set(user.assignedTables.map((t) => t.id));
          setTables(allTables.filter((t) => assignedIds.has(t.id)));
        } else {
          setTables(allTables);
        }
      }
    } catch { /* silence */ }
  }, [user?.branchId, user?.role, user?.assignedTables]);

  const fetchMenuItems = useCallback(async () => {
    try {
      const res = await api.get('/menu/items?isAvailable=true');
      if (res.data.success) {
        setMenuItems(res.data.data);
      }
    } catch { /* silence */ }
  }, []);

  // Initial Load & Socket.IO
  useEffect(() => {
    fetchLiveOrders();
    fetchTables();
    fetchMenuItems();

    if (!user?.restaurantId || !user?.branchId) return;

    const socket = io('/', { path: '/socket.io' });
    socket.emit('join_tenant_room', { restaurantId: user.restaurantId, branchId: user.branchId });

    socket.on('new_order', (newOrder: Order) => {
      toast.success(`🔔 New Order #${newOrder.orderNumber} placed!`, { duration: 6000 });
      setLiveOrders((prev) => [newOrder, ...prev]);
    });

    socket.on('order_status_updated', (updated: Order) => {
      if (updated.status === 'READY') {
        toast.success(`⚡ Order #${updated.orderNumber} is READY for serving!`, { duration: 8000 });
      }
      setLiveOrders((prev) =>
        prev.map((o) => (o.id === updated.id ? updated : o))
      );
    });

    socket.on('waiter_called', (data: { tableNumber: string; timestamp: string }) => {
      toast(`🛎️ Table #${data.tableNumber} requested waiter assistance!`, { icon: '🔔', duration: 10000 });
      setWaiterCalls((prev) => [data, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, [user, fetchLiveOrders, fetchTables, fetchMenuItems]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    try {
      const res = await api.patch(`/orders/${orderId}/status`, { status: nextStatus });
      if (res.data.success) {
        toast.success(`Order status updated to ${nextStatus}`);
        fetchLiveOrders();
        fetchTables();
      }
    } catch {
      toast.error('Failed to update order status');
    }
  };

  const handleUpdateTableStatus = async (tableId: string, newStatus: string) => {
    try {
      const res = await api.patch(`/tables/${tableId}/status`, { status: newStatus });
      if (res.data.success) {
        toast.success(`Table status updated to ${newStatus}`);
        setTables((prev) =>
          prev.map((t) => (t.id === tableId ? { ...t, status: newStatus } : t))
        );
      }
    } catch {
      toast.error('Failed to update table status');
    }
  };

  // ── Take Order Helpers ───────────────────────────────────────────────────
  const openTakeOrderModal = (table?: Table) => {
    if (table) setSelectedTableForOrder(table);
    else if (tables.length > 0) setSelectedTableForOrder(tables[0]);
    setOrderDraft([]);
    setIsTakeOrderOpen(true);
  };

  const addToDraft = (item: MenuItem) => {
    setOrderDraft((prev) => {
      const existing = prev.find((d) => d.menuItem.id === item.id);
      if (existing) {
        return prev.map((d) => (d.menuItem.id === item.id ? { ...d, quantity: d.quantity + 1 } : d));
      }
      return [...prev, { menuItem: item, quantity: 1, notes: '' }];
    });
  };

  const updateDraftQty = (itemId: string, delta: number) => {
    setOrderDraft((prev) =>
      prev
        .map((d) => (d.menuItem.id === itemId ? { ...d, quantity: d.quantity + delta } : d))
        .filter((d) => d.quantity > 0)
    );
  };

  const submitWaiterOrder = async () => {
    if (orderDraft.length === 0 || !selectedTableForOrder || !user?.restaurantId || !user?.branchId) {
      toast.error('Please select items and a table');
      return;
    }
    setIsSubmittingOrder(true);
    try {
      const res = await api.post('/orders/public', {
        restaurantId: user.restaurantId,
        branchId: user.branchId,
        tableId: selectedTableForOrder.id,
        orderType: 'DINE_IN',
        paymentMethod: 'CASH',
        customerName: `Table ${selectedTableForOrder.tableNumber}`,
        items: orderDraft.map((d) => ({
          menuItemId: d.menuItem.id,
          quantity: d.quantity,
          notes: d.notes || undefined
        }))
      });

      if (res.data.success) {
        toast.success(`✅ Order ${res.data.data.orderNumber} sent to kitchen!`);
        setIsTakeOrderOpen(false);
        setOrderDraft([]);
        fetchLiveOrders();
        fetchTables();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to place order');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // ── Bill Modal Helper ─────────────────────────────────────────────────────
  const openBillModal = (order: Order) => {
    setSelectedOrderForBill(order);
    setIsBillModalOpen(true);
  };

  const dismissCall = (idx: number) => {
    setWaiterCalls((prev) => prev.filter((_, i) => i !== idx));
  };

  const tStr = (v: any) => (typeof v === 'object' ? v.en || v.so || Object.values(v)[0] : v);

  const filteredTables =
    tableFilter === 'ALL'
      ? tables
      : tables.filter((t) => t.status === tableFilter);

  const filteredOrders =
    orderStatusFilter === 'ALL'
      ? liveOrders
      : liveOrders.filter((o) => o.status === orderStatusFilter);

  const draftTotal = orderDraft.reduce((s, d) => s + d.menuItem.price * d.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#fdfbf7', color: '#1c1917' }}>

      {/* ── Standalone Waiter Header ── */}
      <header className="px-6 py-4 flex items-center justify-between shadow-sm"
        style={{ backgroundColor: '#ffffff', borderBottom: '2px solid #2d5a2d' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
            style={{ background: 'linear-gradient(135deg, #2d5a2d, #1f421f)' }}>
            <Utensils className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-serif font-black text-lg tracking-wide flex items-center gap-2" style={{ color: '#1c1917' }}>
              WAITER POS & SERVING
              <span className="w-2.5 h-2.5 rounded-full animate-pulse bg-emerald-500" />
            </h1>
            <p className="text-xs font-semibold" style={{ color: '#86682b' }}>
              Staff: {user?.fullName} ({user?.role})
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => openTakeOrderModal()}
            className="px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 btn-gold shadow-md"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Take Table Order
          </button>

          <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#f7f2e6', border: '1px solid #ede2cd' }}>
            <button
              onClick={() => setActiveTab('orders')}
              className="px-4 py-2 rounded-lg text-xs font-bold transition"
              style={{
                backgroundColor: activeTab === 'orders' ? '#2d5a2d' : 'transparent',
                color: activeTab === 'orders' ? '#ffffff' : '#57534e',
              }}
            >
              Orders ({liveOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('tables')}
              className="px-4 py-2 rounded-lg text-xs font-bold transition"
              style={{
                backgroundColor: activeTab === 'tables' ? '#2d5a2d' : 'transparent',
                color: activeTab === 'tables' ? '#ffffff' : '#57534e',
              }}
            >
              Floorplan ({tables.length})
            </button>
          </div>

          <button onClick={() => { fetchLiveOrders(); fetchTables(); }}
            className="p-2.5 rounded-xl text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 shadow-sm"
            title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>

          <button onClick={() => { logout(); navigate('/login'); }}
            className="p-2.5 rounded-xl text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 shadow-sm"
            title="Sign Out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Waiter Calls Alert Bar */}
      {waiterCalls.length > 0 && (
        <div className="px-6 py-3 bg-amber-500 text-stone-900 font-bold text-xs flex flex-wrap items-center justify-between gap-2 shadow-inner animate-pulse-slow">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 animate-bounce text-stone-950" />
            <span>CUSTOMER CALL BELL:</span>
            {waiterCalls.map((call, idx) => (
              <span key={idx} className="px-3 py-1 bg-stone-950 text-amber-400 rounded-full font-extrabold flex items-center gap-2">
                Table #{call.tableNumber}
                <button onClick={() => dismissCall(idx)} className="hover:text-white">✕</button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">

        {/* ════════════════════════════ ORDERS TAB ════════════════════════════ */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl font-bold" style={{ color: '#1c1917' }}>Live Kitchen Orders Stream</h2>
                <p className="text-xs text-stone-500 mt-0.5">Real-time status updates from kitchen to waiter</p>
              </div>

              {/* Status Filter Chips */}
              <div className="flex gap-1.5 overflow-x-auto">
                {['ALL', 'READY', 'PREPARING', 'PENDING', 'SERVED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderStatusFilter(st)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition"
                    style={{
                      backgroundColor: orderStatusFilter === st ? '#2d5a2d' : '#ffffff',
                      color: orderStatusFilter === st ? '#ffffff' : '#57534e',
                      border: `1px solid ${orderStatusFilter === st ? '#2d5a2d' : '#d6cbb5'}`
                    }}
                  >
                    {st === 'ALL' ? `All (${liveOrders.length})` : st}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-20 text-stone-500 font-bold">Loading live orders...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="glass-card p-12 text-center max-w-xl mx-auto">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                <h3 className="font-serif text-xl font-bold text-stone-900">No Active Orders</h3>
                <p className="text-sm text-stone-500 mt-1">Take a new table order using the button above.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredOrders.map((order) => {
                  const isReady = order.status === 'READY';
                  const isServed = order.status === 'SERVED';
                  return (
                    <div
                      key={order.id}
                      className={`glass-card p-5 shadow-md flex flex-col justify-between transition border-2 ${
                        isReady
                          ? 'border-emerald-500 bg-emerald-500/5 ring-4 ring-emerald-500/10'
                          : isServed
                          ? 'border-blue-400 bg-blue-50/20'
                          : 'border-stone-200'
                      }`}
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-200">
                          <div>
                            <span className="font-mono text-lg font-black text-stone-900">{order.orderNumber}</span>
                            <span className="block text-xs font-bold text-amber-800">
                              {order.table ? `Table #${order.table.tableNumber}` : order.orderType}
                            </span>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                              isReady
                                ? 'bg-emerald-600 text-white'
                                : isServed
                                ? 'bg-blue-600 text-white'
                                : order.status === 'PREPARING'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            {isReady ? '⚡ READY TO SERVE' : order.status}
                          </span>
                        </div>

                        {/* Food Items with Thumbnails */}
                        <div className="space-y-2 mb-4">
                          {order.items.map((item) => {
                            const imgUrl = item.menuItem?.images && item.menuItem.images.length > 0 ? item.menuItem.images[0] : null;
                            return (
                              <div key={item.id} className="flex items-center gap-2.5 p-1.5 rounded-lg bg-stone-50 border border-stone-200">
                                {imgUrl ? (
                                  <img src={imgUrl} alt="dish" className="w-10 h-10 rounded-md object-cover shrink-0 border border-stone-300" />
                                ) : (
                                  <div className="w-10 h-10 rounded-md bg-stone-200 flex items-center justify-center shrink-0 text-stone-700 text-xs font-bold">
                                    🍴
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <span className="font-bold text-xs text-stone-900 block truncate">
                                    <span className="font-extrabold text-emerald-800 mr-1.5">{item.quantity}×</span>
                                    {tStr(item.menuItem?.name)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-3 border-t border-stone-200 space-y-2">
                        {isReady && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'SERVED')}
                            className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm"
                          >
                            <UserCheck className="w-4 h-4" /> Mark as SERVED to Table
                          </button>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={() => openBillModal(order)}
                            className="flex-1 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                          >
                            <Printer className="w-3.5 h-3.5" /> Print Bill / Receipt
                          </button>

                          {isServed && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                              className="px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold rounded-xl text-xs"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════ FLOORPLAN TAB ════════════════════════════ */}
        {activeTab === 'tables' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl font-bold" style={{ color: '#1c1917' }}>Floorplan Tables</h2>
                <p className="text-xs text-stone-500 mt-0.5">Manage live table statuses and take direct orders</p>
              </div>

              {/* Status Filters */}
              <div className="flex gap-1.5">
                {['ALL', 'AVAILABLE', 'OCCUPIED', 'CLEANING'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setTableFilter(st)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition"
                    style={{
                      backgroundColor: tableFilter === st ? '#2d5a2d' : '#ffffff',
                      color: tableFilter === st ? '#ffffff' : '#57534e',
                      border: `1px solid ${tableFilter === st ? '#2d5a2d' : '#d6cbb5'}`
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredTables.map((table) => (
                <div key={table.id} className="glass-card p-5 shadow-sm space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-serif font-black text-xl text-stone-900">Table #{table.tableNumber}</span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          table.status === 'AVAILABLE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : table.status === 'OCCUPIED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {table.status}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 font-medium">Capacity: {table.capacity} Guests</p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-stone-200">
                    <button
                      onClick={() => openTakeOrderModal(table)}
                      className="w-full py-2 btn-gold text-xs font-extrabold flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" /> Take Order
                    </button>

                    <div className="flex gap-1">
                      {['AVAILABLE', 'OCCUPIED', 'CLEANING'].map((st) => (
                        <button
                          key={st}
                          onClick={() => handleUpdateTableStatus(table.id, st)}
                          disabled={table.status === st}
                          className={`flex-1 py-1 rounded text-[10px] font-bold transition ${
                            table.status === st
                              ? 'bg-stone-900 text-white'
                              : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                          }`}
                        >
                          {st.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* ════════════════════ TAKE ORDER MODAL ════════════════════ */}
      {isTakeOrderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-amber-900/10">

            {/* Modal Header */}
            <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div>
                <h3 className="font-serif text-xl font-bold text-stone-900">Take Order for Table</h3>
                <p className="text-xs text-stone-500">Select dishes and quantities for the kitchen</p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedTableForOrder?.id || ''}
                  onChange={(e) => {
                    const t = tables.find((tbl) => tbl.id === e.target.value);
                    if (t) setSelectedTableForOrder(t);
                  }}
                  className="input-dark text-xs py-1.5 px-3 font-bold"
                >
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>Table #{t.tableNumber}</option>
                  ))}
                </select>

                <button onClick={() => setIsTakeOrderOpen(false)} className="text-stone-400 hover:text-stone-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 grid md:grid-cols-2 overflow-hidden">

              {/* Menu Dishes Column */}
              <div className="p-4 border-r border-stone-200 overflow-y-auto space-y-3">
                <input
                  type="text"
                  placeholder="Search dish..."
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  className="input-dark w-full text-xs"
                />

                <div className="space-y-2">
                  {menuItems
                    .filter((m) => !menuSearch || tStr(m.name).toLowerCase().includes(menuSearch.toLowerCase()))
                    .map((item) => (
                      <div
                        key={item.id}
                        onClick={() => addToDraft(item)}
                        className="p-2.5 rounded-xl border border-stone-200 hover:border-amber-500 bg-white hover:bg-amber-50/30 cursor-pointer flex items-center justify-between transition"
                      >
                        <div>
                          <span className="font-bold text-xs text-stone-900 block">{tStr(item.name)}</span>
                          <span className="text-xs font-bold text-amber-800">${Number(item.price).toFixed(2)}</span>
                        </div>
                        <button className="w-7 h-7 rounded-lg btn-primary flex items-center justify-center shrink-0">
                          <Plus className="w-4 h-4 stroke-[3]" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              {/* Order Cart Draft Column */}
              <div className="p-4 flex flex-col justify-between bg-stone-50/50">
                <div>
                  <h4 className="font-serif font-bold text-sm text-stone-900 mb-3 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-amber-700" /> Current Order Items ({orderDraft.length})
                  </h4>

                  {orderDraft.length === 0 ? (
                    <div className="text-center py-12 text-stone-400 text-xs">
                      Click dishes on the left to add to order.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {orderDraft.map((d) => (
                        <div key={d.menuItem.id} className="p-2.5 rounded-xl bg-white border border-stone-200 flex items-center justify-between">
                          <div className="flex-1 pr-2">
                            <span className="font-bold text-xs text-stone-900 block">{tStr(d.menuItem.name)}</span>
                            <span className="text-xs text-stone-500 font-bold">${(d.menuItem.price * d.quantity).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => updateDraftQty(d.menuItem.id, -1)}
                              className="w-6 h-6 rounded bg-stone-100 text-stone-800 font-bold flex items-center justify-center"
                            >-</button>
                            <span className="text-xs font-extrabold w-5 text-center">{d.quantity}</span>
                            <button
                              onClick={() => updateDraftQty(d.menuItem.id, 1)}
                              className="w-6 h-6 rounded btn-primary text-white font-bold flex items-center justify-center"
                            >+</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Row */}
                <div className="pt-4 border-t border-stone-200 mt-4 space-y-3">
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span>Total (excl. VAT)</span>
                    <span className="text-lg font-black text-amber-800">${draftTotal.toFixed(2)}</span>
                  </div>

                  <button
                    onClick={submitWaiterOrder}
                    disabled={isSubmittingOrder || orderDraft.length === 0}
                    className="w-full py-3 btn-gold font-extrabold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmittingOrder ? 'Submitting...' : 'Send Order to Kitchen'}
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ════════════════════ PRINT BILL / RECEIPT MODAL ════════════════════ */}
      {isBillModalOpen && selectedOrderForBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-900/10 space-y-6">

            {/* Printable Thermal Receipt Card */}
            <div id="thermal-receipt" className="p-6 bg-stone-50 rounded-xl border border-stone-300 font-mono text-xs text-stone-900 space-y-4">
              <div className="text-center space-y-1">
                <h2 className="font-bold text-base uppercase font-serif">RESTREN SaaS RESTAURANT</h2>
                <p className="text-[10px] text-stone-500">Official Customer Receipt</p>
                <p className="text-[10px] font-bold">Order #{selectedOrderForBill.orderNumber}</p>
                <p className="text-[10px] text-stone-500">{new Date(selectedOrderForBill.createdAt).toLocaleString()}</p>
              </div>

              <div className="border-t border-b border-dashed border-stone-400 py-3 space-y-1.5">
                {selectedOrderForBill.items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.quantity}× {tStr(item.menuItem?.name)}</span>
                    <span className="font-bold">${((item.unitPrice || 5) * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal:</span>
                  <span>${(selectedOrderForBill.subtotal || selectedOrderForBill.totalAmount * 0.85).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Ethiopian VAT (15%):</span>
                  <span>${(selectedOrderForBill.tax || selectedOrderForBill.totalAmount * 0.15).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-sm pt-2 border-t border-stone-950 text-stone-950">
                  <span>TOTAL DUE:</span>
                  <span>${selectedOrderForBill.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-stone-500 pt-2 border-t border-dashed border-stone-400">
                Thank you for dining with us!
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 btn-primary font-bold text-xs flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print Thermal Receipt
              </button>
              <button
                onClick={() => setIsBillModalOpen(false)}
                className="px-4 py-3 btn-secondary font-bold text-xs"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
