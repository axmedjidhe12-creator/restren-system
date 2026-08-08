import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';
import {
  TrendingUp, ShoppingBag, Users, UtensilsCrossed, QrCode, MonitorPlay,
  ArrowUp, LayoutDashboard, Plus, Copy, Printer, Settings, Loader2,
  CheckCircle, ExternalLink, Utensils, RefreshCw, AlertCircle, Tag,
  UserPlus, Trash2, Edit3, Key, Phone, BadgeCheck, XCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: Record<string, string>;
  _count?: { menuItems: number };
}

interface MenuItemApi {
  id: string;
  name: Record<string, string>;
  description?: Record<string, string>;
  price: number;
  isAvailable: boolean;
  isPopular: boolean;
  category: { id: string; name: Record<string, string> };
}

interface TableApi {
  id: string;
  tableNumber: string;
  capacity: number;
  qrCodeUrl: string;
  status: string;
}

interface RestaurantProfile {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  logoUrl?: string;
  planId: string;
  branches: { id: string; name: string; city: string }[];
  _count: { users: number; menuItems: number; orders: number };
}

interface OrderSummary {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
}

type DashboardTab = 'overview' | 'tables' | 'menu' | 'settings' | 'staff';

interface WaiterProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  waiterCode: string | null;
  isActive: boolean;
  createdAt: string;
  assignedTables: { id: string; tableNumber: string; capacity: number; status: string }[];
}

const tStr = (v: Record<string, string> | string | any): string => {
  if (!v) return '';
  if (typeof v === 'string') return v;
  return v['en'] || v['so'] || Object.values(v)[0] || '';
};

// ── Component ─────────────────────────────────────────────────────────────────
export const OwnerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  // ── Live Data State ───────────────────────────────────────────────────────
  const [restaurantProfile, setRestaurantProfile] = useState<RestaurantProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemApi[]>([]);
  const [tables, setTables] = useState<TableApi[]>([]);
  const [orderSummary, setOrderSummary] = useState<OrderSummary>({ totalRevenue: 0, totalOrders: 0, pendingOrders: 0 });
  const [revenueChartData, setRevenueChartData] = useState<{ day: string; revenue: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Staff State ───────────────────────────────────────────────────────────
  const [waiters, setWaiters] = useState<WaiterProfile[]>([]);
  const [isLoadingWaiters, setIsLoadingWaiters] = useState(false);
  const [showCreateWaiter, setShowCreateWaiter] = useState(false);
  const [editingWaiter, setEditingWaiter] = useState<WaiterProfile | null>(null);
  const [newWaiterForm, setNewWaiterForm] = useState({ fullName: '', phone: '', email: '', tableIds: [] as string[] });
  const [isCreatingWaiter, setIsCreatingWaiter] = useState(false);

  // ── Form State ────────────────────────────────────────────────────────────
  const [newTableNum, setNewTableNum] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('4');
  const [selectedTable, setSelectedTable] = useState<TableApi | null>(null);
  const [isAddingTable, setIsAddingTable] = useState(false);

  const [newItemName, setNewItemName] = useState('');
  const [newItemNameSo, setNewItemNameSo] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCatId, setNewItemCatId] = useState('');
  const [newItemPopular, setNewItemPopular] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);

  const [newCatName, setNewCatName] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);

  const [settings, setSettings] = useState({ name: '', phone: '', email: '' });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // ── Branch & Slug ─────────────────────────────────────────────────────────
  const branchId = restaurantProfile?.branches?.[0]?.id || '';
  const slug = restaurantProfile?.slug || '';
  const restaurantName = restaurantProfile?.name || user?.restaurantName || 'Restaurant';
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';

  // ── Data Fetchers ──────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get('/restaurant/profile');
      if (res.data.success) {
        const p = res.data.data;
        setRestaurantProfile(p);
        setSettings({ name: p.name, phone: p.phone, email: p.email });
      }
    } catch { /* handled by global */ }
  }, []);

  const fetchMenuData = useCallback(async () => {
    try {
      const [catRes, itemRes] = await Promise.all([
        api.get('/menu/categories'),
        api.get('/menu/items')
      ]);
      if (catRes.data.success) setCategories(catRes.data.data);
      if (itemRes.data.success) setMenuItems(itemRes.data.data);
      if (catRes.data.success && catRes.data.data.length > 0 && !newItemCatId) {
        setNewItemCatId(catRes.data.data[0].id);
      }
    } catch { /* handled below */ }
  }, []);

  const fetchTables = useCallback(async (bid: string) => {
    if (!bid) return;
    try {
      const res = await api.get(`/tables?branchId=${bid}`);
      if (res.data.success) {
        setTables(res.data.data);
        if (res.data.data.length > 0 && !selectedTable) {
          setSelectedTable(res.data.data[0]);
        }
      }
    } catch { /* handled below */ }
  }, []);

  const fetchOrderSummary = useCallback(async () => {
    try {
      const res = await api.get('/orders?limit=100');
      if (res.data.success) {
        const { orders, summary } = res.data.data;
        const pending = orders.filter((o: any) => o.status === 'PENDING' || o.status === 'PREPARING').length;

        // Build last-7-days chart data
        const dayMap: Record<string, number> = {};
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        days.forEach((d) => (dayMap[d] = 0));
        orders.forEach((o: any) => {
          const d = new Date(o.createdAt);
          dayMap[days[d.getDay()]] = (dayMap[days[d.getDay()]] || 0) + Number(o.totalAmount);
        });
        setRevenueChartData(days.map((d) => ({ day: d, revenue: parseFloat(dayMap[d].toFixed(2)) })));
        setOrderSummary({
          totalRevenue: Number(summary?.totalRevenue || 0),
          totalOrders: res.data.data.pagination?.total || 0,
          pendingOrders: pending
        });
      }
    } catch { /* no orders yet */ }
  }, []);

  // ── Initial Load ──────────────────────────────────────────────────────────
  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchProfile(), fetchMenuData(), fetchOrderSummary()])
      .finally(() => setIsLoading(false));
  }, []);

  // ── Fetch tables once we have branchId ────────────────────────────────────
  useEffect(() => {
    if (branchId) fetchTables(branchId);
  }, [branchId]);

  // ── Staff / Waiter Functions ───────────────────────────────────────────────
  const fetchWaiters = useCallback(async () => {
    setIsLoadingWaiters(true);
    try {
      const res = await api.get('/staff/waiters');
      if (res.data.success) setWaiters(res.data.data);
    } catch { /* silence */ }
    finally { setIsLoadingWaiters(false); }
  }, []);

  useEffect(() => {
    if (activeTab === 'staff') fetchWaiters();
  }, [activeTab]);

  const handleCreateWaiter = async () => {
    if (!newWaiterForm.fullName || !newWaiterForm.phone || !branchId) {
      toast.error('Full name and phone are required');
      return;
    }
    setIsCreatingWaiter(true);
    try {
      const res = await api.post('/staff/waiters', {
        ...newWaiterForm,
        branchId
      });
      if (res.data.success) {
        const created = res.data.data;
        setWaiters((prev) => [created, ...prev]);
        setNewWaiterForm({ fullName: '', phone: '', email: '', tableIds: [] });
        setShowCreateWaiter(false);
        toast.success(`✅ Waiter created! PIN Code: ${created.waiterCode}`, { duration: 6000 });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create waiter');
    } finally {
      setIsCreatingWaiter(false);
    }
  };

  const handleToggleWaiterActive = async (w: WaiterProfile) => {
    try {
      await api.patch(`/staff/waiters/${w.id}`, { isActive: !w.isActive });
      setWaiters((prev) => prev.map((x) => x.id === w.id ? { ...x, isActive: !w.isActive } : x));
      toast.success(`${w.fullName} ${!w.isActive ? 'activated' : 'deactivated'}`);
    } catch {
      toast.error('Failed to update waiter status');
    }
  };

  const handleDeleteWaiter = async (id: string) => {
    if (!confirm('Permanently deactivate this waiter?')) return;
    try {
      await api.delete(`/staff/waiters/${id}`);
      setWaiters((prev) => prev.filter((w) => w.id !== id));
      toast.success('Waiter removed successfully');
    } catch {
      toast.error('Failed to remove waiter');
    }
  };

  const handleUpdateWaiter = async (w: WaiterProfile, tableIds: string[]) => {
    try {
      const res = await api.patch(`/staff/waiters/${w.id}`, { tableIds });
      if (res.data.success) {
        setWaiters((prev) => prev.map((x) => x.id === w.id ? res.data.data : x));
        setEditingWaiter(null);
        toast.success('Table assignments updated!');
      }
    } catch {
      toast.error('Failed to update waiter');
    }
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNum || !branchId) return;
    setIsAddingTable(true);
    try {
      const res = await api.post('/tables', {
        branchId,
        tableNumber: newTableNum,
        capacity: parseInt(newTableCapacity) || 4
      });
      if (res.data.success) {
        const newT = res.data.data;
        setTables((prev) => [...prev, newT]);
        setSelectedTable(newT);
        setNewTableNum('');
        toast.success(`Table #${newTableNum} created with QR code!`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create table');
    } finally {
      setIsAddingTable(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;
    setIsAddingCat(true);
    try {
      const res = await api.post('/menu/categories', {
        name: { en: newCatName }
      });
      if (res.data.success) {
        const newCat = res.data.data;
        setCategories((prev) => [...prev, newCat]);
        if (!newItemCatId) setNewItemCatId(newCat.id);
        setNewCatName('');
        toast.success(`Category "${newCatName}" created!`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create category');
    } finally {
      setIsAddingCat(false);
    }
  };

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice || !newItemCatId) return;
    setIsAddingItem(true);
    try {
      const res = await api.post('/menu/items', {
        categoryId: newItemCatId,
        name: { en: newItemName, so: newItemNameSo || newItemName },
        description: { en: '' },
        price: parseFloat(newItemPrice),
        isPopular: newItemPopular,
        prepTimeMins: 15
      });
      if (res.data.success) {
        await fetchMenuData();
        setNewItemName('');
        setNewItemNameSo('');
        setNewItemPrice('');
        setNewItemPopular(false);
        toast.success(`${newItemName} added to menu!`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add menu item');
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleToggleAvailability = async (item: MenuItemApi) => {
    try {
      await api.put(`/menu/items/${item.id}`, { isAvailable: !item.isAvailable });
      setMenuItems((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, isAvailable: !m.isAvailable } : m))
      );
      toast.success(`${tStr(item.name)} marked as ${!item.isAvailable ? 'Available' : 'Unavailable'}`);
    } catch {
      toast.error('Failed to update item status');
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await api.put('/restaurant/profile', { name: settings.name, phone: settings.phone, email: settings.email });
      toast.success('Settings saved successfully!');
      fetchProfile();
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const copyQrLink = (tableNumber: string) => {
    const url = `${baseUrl}/r/${slug}?table=${tableNumber}`;
    navigator.clipboard.writeText(url);
    toast.success('QR link copied!');
  };

  // ── Loading Screen ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fdfbf7' }}>
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin mx-auto" style={{ color: '#c9a84c' }} />
          <p className="text-sm font-bold" style={{ color: '#57534e' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ backgroundColor: '#fdfbf7', color: '#1c1917' }}>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="w-full md:w-64 p-6 shadow-sm flex flex-col justify-between shrink-0"
        style={{ backgroundColor: '#ffffff', borderRight: '1px solid #eee5d3' }}>
        <div>
          <div className="mb-8">
            <p className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: '#86682b' }}>
              Management Portal
            </p>
            <h2 className="font-serif text-2xl font-bold truncate" style={{ color: '#1c1917' }}>
              {restaurantName}
            </h2>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold"
              style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>
              ● Live Branch
            </span>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
              { id: 'tables',   label: 'Tables & QR Generator', icon: <QrCode className="w-4 h-4" /> },
              { id: 'menu',     label: 'Menu Manager', icon: <UtensilsCrossed className="w-4 h-4" /> },
              { id: 'staff',    label: 'Staff & Waiters', icon: <Users className="w-4 h-4" /> },
              { id: 'settings', label: 'Restaurant Settings', icon: <Settings className="w-4 h-4" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DashboardTab)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left"
                style={{
                  backgroundColor: activeTab === tab.id ? '#2d5a2d' : 'transparent',
                  color: activeTab === tab.id ? '#ffffff' : '#57534e',
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="pt-6 mt-6 border-t border-stone-200 space-y-2">
          <Link to="/kds" className="btn-primary w-full text-xs py-2.5 flex items-center justify-center gap-2">
            <MonitorPlay className="w-4 h-4" /> Open KDS Screen
          </Link>
          {slug && (
            <a href={`/r/${slug}?table=1`} target="_blank" rel="noreferrer"
              className="btn-secondary w-full text-xs py-2.5 flex items-center justify-center gap-2">
              <ExternalLink className="w-4 h-4 text-stone-600" /> View QR Menu
            </a>
          )}
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">

        {/* ════════════════════════════ OVERVIEW ════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in-up">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div>
                <h1 className="font-serif text-3xl font-bold" style={{ color: '#1c1917' }}>Dashboard Overview</h1>
                <p className="text-sm mt-1" style={{ color: '#57534e' }}>Live sales, order counts, and branch activity</p>
              </div>
              <button onClick={() => { fetchOrderSummary(); fetchMenuData(); }}
                className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {/* KPI Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              {[
                {
                  label: 'Total Revenue',
                  value: `$${orderSummary.totalRevenue.toFixed(2)}`,
                  sub: 'Paid orders only',
                  icon: <TrendingUp className="w-5 h-5" />, color: '#86682b'
                },
                {
                  label: 'Total Orders',
                  value: String(orderSummary.totalOrders),
                  sub: `${orderSummary.pendingOrders} active in KDS`,
                  icon: <ShoppingBag className="w-5 h-5" />, color: '#86682b'
                },
                {
                  label: 'Active Tables',
                  value: `${tables.length} Tables`,
                  sub: 'QR codes generated',
                  icon: <QrCode className="w-5 h-5" />, color: '#2d5a2d'
                },
                {
                  label: 'Menu Items',
                  value: `${menuItems.length} Dishes`,
                  sub: `${menuItems.filter(m => m.isAvailable).length} available`,
                  icon: <Utensils className="w-5 h-5" />, color: '#2d5a2d'
                },
              ].map((c) => (
                <div key={c.label} className="glass-card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-stone-500">{c.label}</span>
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: '#f7f2e6', border: '1px solid #ede2cd', color: c.color }}>
                      {c.icon}
                    </span>
                  </div>
                  <div className="font-serif text-3xl font-bold mb-1" style={{ color: '#1c1917' }}>{c.value}</div>
                  <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: c.color }}>
                    <ArrowUp className="w-3 h-3" /> {c.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 glass-card p-6">
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#86682b' }}>Weekly Sales</p>
                <h3 className="font-serif text-2xl font-bold mb-6" style={{ color: '#1c1917' }}>Daily Revenue ($)</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueChartData.length > 0 ? revenueChartData : [{ day: 'No data', revenue: 0 }]} barSize={32}>
                      <XAxis dataKey="day" stroke="#78716c" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#78716c" fontSize={11} tickLine={false} axisLine={false}
                        tickFormatter={(v) => `$${v}`} />
                      <Tooltip formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'Revenue']} cursor={{ fill: 'rgba(201,168,76,0.06)' }} />
                      <Bar dataKey="revenue" radius={[6, 6, 0, 0]} fill="#c9a84c" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card p-6">
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#86682b' }}>Restaurant Info</p>
                <h3 className="font-serif text-2xl font-bold mb-4" style={{ color: '#1c1917' }}>Profile</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Plan', val: restaurantProfile?.planId?.includes('pro') ? 'Pro Enterprise' : 'Starter' },
                    { label: 'Total Items', val: String(restaurantProfile?._count?.menuItems || menuItems.length) },
                    { label: 'Total Orders', val: String(restaurantProfile?._count?.orders || orderSummary.totalOrders) },
                    { label: 'Staff Members', val: String(restaurantProfile?._count?.users || 0) },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex justify-between text-xs border-b border-stone-100 pb-2">
                      <span className="font-semibold text-stone-500 uppercase tracking-wide">{label}</span>
                      <span className="font-bold" style={{ color: '#1c1917' }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════ TABLES & QR ════════════════════════ */}
        {activeTab === 'tables' && (
          <div className="space-y-8 animate-fade-in-up">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div>
                <h1 className="font-serif text-3xl font-bold" style={{ color: '#1c1917' }}>Tables & QR Code Generator</h1>
                <p className="text-sm mt-1" style={{ color: '#57534e' }}>Generate, preview, print, and copy QR codes for each table</p>
              </div>
              <button onClick={() => branchId && fetchTables(branchId)}
                className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {/* Add Table Form */}
            <div className="glass-card p-6">
              <h3 className="font-serif text-xl font-bold mb-4" style={{ color: '#1c1917' }}>Add New Table</h3>
              {!branchId && (
                <div className="flex items-center gap-2 text-xs text-amber-700 mb-3">
                  <AlertCircle className="w-4 h-4" /> Branch ID loading...
                </div>
              )}
              <form onSubmit={handleAddTable} className="flex gap-4 flex-wrap items-end">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 text-stone-700">Table Number</label>
                  <input
                    type="text"
                    placeholder="e.g. T-05, VIP-2"
                    value={newTableNum}
                    onChange={(e) => setNewTableNum(e.target.value)}
                    className="input-dark w-48"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 text-stone-700">Capacity</label>
                  <input
                    type="number"
                    placeholder="4"
                    min="1"
                    max="30"
                    value={newTableCapacity}
                    onChange={(e) => setNewTableCapacity(e.target.value)}
                    className="input-dark w-24"
                  />
                </div>
                <button type="submit" disabled={isAddingTable || !branchId}
                  className="btn-primary flex items-center gap-2 text-xs py-3 disabled:opacity-60">
                  {isAddingTable ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Generate Table + QR
                </button>
              </form>
            </div>

            {/* Tables Grid + QR Preview */}
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Table List */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="font-serif text-xl font-bold" style={{ color: '#1c1917' }}>
                  Active Tables ({tables.length})
                </h3>
                {tables.length === 0 ? (
                  <div className="glass-card p-10 text-center">
                    <QrCode className="w-10 h-10 mx-auto mb-3 text-stone-400" />
                    <p className="font-serif text-lg font-bold" style={{ color: '#1c1917' }}>No tables yet</p>
                    <p className="text-sm mt-1" style={{ color: '#78716c' }}>Add your first table above to generate QR codes.</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {tables.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTable(t)}
                        className={`glass-card p-5 cursor-pointer transition-all duration-200 ${
                          selectedTable?.id === t.id ? 'border-2 border-amber-600 bg-amber-500/5' : 'hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-serif text-xl font-bold" style={{ color: '#1c1917' }}>
                            Table {t.tableNumber}
                          </span>
                          <span className={t.status === 'AVAILABLE' ? 'badge-active' : 'badge-pending'}>
                            {t.status}
                          </span>
                        </div>
                        <p className="text-xs mb-1" style={{ color: '#78716c' }}>
                          Capacity: {t.capacity} guests
                        </p>
                        <p className="text-xs font-mono mb-3 truncate" style={{ color: '#78716c' }}>
                          /r/{slug}?table={t.tableNumber}
                        </p>
                        <div className="flex gap-2">
                          <button type="button"
                            onClick={(e) => { e.stopPropagation(); copyQrLink(t.tableNumber); }}
                            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1">
                            <Copy className="w-3.5 h-3.5" /> Copy Link
                          </button>
                          <a href={`${baseUrl}/r/${slug}?table=${t.tableNumber}`} target="_blank" rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
                            <ExternalLink className="w-3.5 h-3.5" /> Open
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* QR Preview Panel */}
              {selectedTable && (
                <div className="glass-card p-6 flex flex-col items-center text-center shadow-lg">
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#86682b' }}>
                    Printable QR Stand
                  </p>
                  <h3 className="font-serif text-2xl font-bold mb-4" style={{ color: '#1c1917' }}>
                    Table {selectedTable.tableNumber}
                  </h3>

                  <div id="printable-qr-card" className="p-6 rounded-2xl bg-white border-2 border-stone-200 shadow-md flex flex-col items-center mb-6 w-full">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2"
                      style={{ background: 'linear-gradient(135deg, #2d5a2d, #1f421f)' }}>
                      <Utensils className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-serif font-bold text-lg text-stone-900 mb-1">{restaurantName}</span>
                    <span className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-4">
                      Table {selectedTable.tableNumber}
                    </span>

                    <div className="p-3 bg-white border border-stone-200 rounded-xl shadow-inner mb-4">
                      {selectedTable.qrCodeUrl && selectedTable.qrCodeUrl.startsWith('data:') ? (
                        // Server-generated QR (base64 image)
                        <img src={selectedTable.qrCodeUrl} alt="QR Code" className="w-40 h-40" />
                      ) : (
                        // Frontend-generated QR fallback
                        <QRCodeSVG
                          value={`${baseUrl}/r/${slug}?table=${selectedTable.tableNumber}`}
                          size={160}
                          level="H"
                          includeMargin={true}
                        />
                      )}
                    </div>

                    <p className="text-[11px] font-bold text-stone-700">Scan to View Menu & Order</p>
                    <p className="text-[9px] text-stone-400 mt-1">Powered by RESTREN SaaS</p>
                  </div>

                  <button onClick={() => window.print()}
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                    <Printer className="w-4 h-4" /> Print Table QR Stand
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════ MENU MANAGER ═════════════════════════ */}
        {activeTab === 'menu' && (
          <div className="space-y-8 animate-fade-in-up">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div>
                <h1 className="font-serif text-3xl font-bold" style={{ color: '#1c1917' }}>Menu Manager</h1>
                <p className="text-sm mt-1" style={{ color: '#57534e' }}>Add categories, dishes, prices, and toggle availability</p>
              </div>
              <button onClick={fetchMenuData}
                className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {/* Category Creator */}
            <div className="glass-card p-6">
              <h3 className="font-serif text-xl font-bold mb-4" style={{ color: '#1c1917' }}>
                <Tag className="w-5 h-5 inline mr-2" />
                Add Category
              </h3>
              <form onSubmit={handleAddCategory} className="flex gap-4 flex-wrap items-end">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Category name (e.g. Main Dishes, Beverages)"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="input-dark w-full"
                    required
                  />
                </div>
                <button type="submit" disabled={isAddingCat}
                  className="btn-primary flex items-center gap-2 text-xs py-3 disabled:opacity-60 shrink-0">
                  {isAddingCat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add Category
                </button>
              </form>

              {/* Existing Categories Chips */}
              {categories.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <span key={cat.id} className="px-3 py-1 rounded-full text-xs font-bold"
                      style={{ background: '#f7f2e6', color: '#86682b', border: '1px solid #ede2cd' }}>
                      {tStr(cat.name)} ({cat._count?.menuItems ?? 0})
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Add Menu Item Form */}
            <div className="glass-card p-6">
              <h3 className="font-serif text-xl font-bold mb-4" style={{ color: '#1c1917' }}>Add New Dish</h3>
              {categories.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-amber-700">
                  <AlertCircle className="w-4 h-4" /> Create a category first before adding dishes.
                </div>
              ) : (
                <form onSubmit={handleAddMenuItem} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 text-stone-700">Dish Name (EN)</label>
                    <input type="text" placeholder="e.g. Grilled Salmon"
                      value={newItemName} onChange={(e) => setNewItemName(e.target.value)}
                      className="input-dark" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 text-stone-700">Name (Somali)</label>
                    <input type="text" placeholder="Optional Somali name"
                      value={newItemNameSo} onChange={(e) => setNewItemNameSo(e.target.value)}
                      className="input-dark" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 text-stone-700">Price ($)</label>
                    <input type="number" step="0.01" placeholder="e.g. 12.50"
                      value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)}
                      className="input-dark" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 text-stone-700">Category</label>
                    <select value={newItemCatId} onChange={(e) => setNewItemCatId(e.target.value)} className="input-dark">
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{tStr(cat.name)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-3">
                    <input type="checkbox" id="isPopular" checked={newItemPopular}
                      onChange={(e) => setNewItemPopular(e.target.checked)}
                      className="w-4 h-4 accent-amber-600" />
                    <label htmlFor="isPopular" className="text-xs font-bold text-stone-700">Mark as Popular</label>
                  </div>
                  <button type="submit" disabled={isAddingItem}
                    className="btn-primary flex items-center justify-center gap-2 text-xs py-3 disabled:opacity-60">
                    {isAddingItem ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add Dish
                  </button>
                </form>
              )}
            </div>

            {/* Menu Items Table */}
            <div className="glass-card rounded-2xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-stone-200 flex items-center justify-between">
                <h3 className="font-serif text-xl font-bold" style={{ color: '#1c1917' }}>
                  Menu Items ({menuItems.length})
                </h3>
                <span className="text-xs font-bold text-stone-500">
                  {menuItems.filter(m => m.isAvailable).length} available
                </span>
              </div>
              {menuItems.length === 0 ? (
                <div className="p-12 text-center">
                  <UtensilsCrossed className="w-10 h-10 mx-auto mb-3 text-stone-300" />
                  <p className="font-serif text-lg font-bold" style={{ color: '#1c1917' }}>No menu items yet</p>
                  <p className="text-sm mt-1" style={{ color: '#78716c' }}>Add your first dish above.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: '#f7f2e6', borderBottom: '1px solid #eee5d3' }}>
                        <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-widest text-stone-600">Dish Name</th>
                        <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-widest text-stone-600">Category</th>
                        <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-widest text-stone-600">Price</th>
                        <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-widest text-stone-600">Popular</th>
                        <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-widest text-stone-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {menuItems.map((item) => (
                        <tr key={item.id} className="border-b border-stone-200 hover:bg-stone-50">
                          <td className="px-5 py-4 font-bold" style={{ color: '#1c1917' }}>{tStr(item.name)}</td>
                          <td className="px-5 py-4 text-xs font-semibold text-stone-600">{tStr(item.category?.name)}</td>
                          <td className="px-5 py-4 font-mono font-bold" style={{ color: '#86682b' }}>
                            ${Number(item.price).toFixed(2)}
                          </td>
                          <td className="px-5 py-4">
                            {item.isPopular && (
                              <span className="badge-pending">★ Popular</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <button
                              onClick={() => handleToggleAvailability(item)}
                              className={item.isAvailable ? 'badge-active' : 'badge-suspended'}
                            >
                              {item.isAvailable ? 'Available' : 'Unavailable'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════ SETTINGS ════════════════════════════ */}
        {activeTab === 'settings' && (
          <div className="space-y-8 animate-fade-in-up max-w-2xl">
            <div className="pb-4 border-b border-stone-200">
              <h1 className="font-serif text-3xl font-bold" style={{ color: '#1c1917' }}>Restaurant Settings</h1>
              <p className="text-sm mt-1" style={{ color: '#57534e' }}>Update name, contact, and profile information</p>
            </div>

            <div className="glass-card p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-700">Restaurant Name</label>
                <input type="text" value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  className="input-dark" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-700">Phone Number</label>
                <input type="text" value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="input-dark" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-700">Email Address</label>
                <input type="email" value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="input-dark" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-stone-700">Public Menu URL</label>
                <div className="flex items-center gap-2">
                  <input type="text" value={`${baseUrl}/r/${slug}`} readOnly
                    className="input-dark font-mono text-xs" style={{ color: '#86682b' }} />
                  <button onClick={() => { navigator.clipboard.writeText(`${baseUrl}/r/${slug}`); toast.success('Copied!'); }}
                    className="btn-secondary text-xs px-3 py-3">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <button onClick={handleSaveSettings} disabled={isSavingSettings}
                className="btn-primary w-full py-3 mt-4 flex items-center justify-center gap-2 disabled:opacity-60">
                {isSavingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Save Settings
              </button>
            </div>

            {/* Plan Info */}
            <div className="glass-card p-6">
              <h3 className="font-serif text-xl font-bold mb-4" style={{ color: '#1c1917' }}>Current Subscription Plan</h3>
              <div className="space-y-2.5">
                {[
                  { label: 'Plan', val: restaurantProfile?.planId?.includes('pro') ? '🔑 Pro Enterprise' : '🌱 Starter' },
                  { label: 'Tables Allowed', val: `${tables.length} / ${restaurantProfile?.planId?.includes('pro') ? 50 : 20} used` },
                  { label: 'Menu Items', val: String(menuItems.length) },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between text-xs border-b border-stone-100 pb-2">
                    <span className="font-semibold text-stone-500 uppercase tracking-wide">{label}</span>
                    <span className="font-bold" style={{ color: '#1c1917' }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════ STAFF & WAITERS ════════════════════════════ */}
        {activeTab === 'staff' && (
          <StaffPanel
            waiters={waiters}
            tables={tables}
            isLoading={isLoadingWaiters}
            showCreate={showCreateWaiter}
            setShowCreate={setShowCreateWaiter}
            editingWaiter={editingWaiter}
            setEditingWaiter={setEditingWaiter}
            newWaiterForm={newWaiterForm}
            setNewWaiterForm={setNewWaiterForm}
            isCreating={isCreatingWaiter}
            onRefresh={fetchWaiters}
            onCreateWaiter={handleCreateWaiter}
            onToggleActive={handleToggleWaiterActive}
            onDeleteWaiter={handleDeleteWaiter}
            onUpdateWaiter={handleUpdateWaiter}
          />
        )}

      </main>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STAFF PANEL — separate sub-component for clean code
// ─────────────────────────────────────────────────────────────────────────────
interface StaffPanelProps {
  waiters: WaiterProfile[];
  tables: TableApi[];
  isLoading: boolean;
  showCreate: boolean;
  setShowCreate: (v: boolean) => void;
  editingWaiter: WaiterProfile | null;
  setEditingWaiter: (w: WaiterProfile | null) => void;
  newWaiterForm: { fullName: string; phone: string; email: string; tableIds: string[] };
  setNewWaiterForm: (f: any) => void;
  isCreating: boolean;
  onRefresh: () => void;
  onCreateWaiter: () => void;
  onToggleActive: (w: WaiterProfile) => void;
  onDeleteWaiter: (id: string) => void;
  onUpdateWaiter: (w: WaiterProfile, tableIds: string[]) => void;
}

const StaffPanel: React.FC<StaffPanelProps> = ({
  waiters, tables, isLoading, showCreate, setShowCreate,
  editingWaiter, setEditingWaiter, newWaiterForm, setNewWaiterForm,
  isCreating, onRefresh, onCreateWaiter, onToggleActive, onDeleteWaiter, onUpdateWaiter
}) => {
  const [editTableIds, setEditTableIds] = useState<string[]>([]);

  const toggleEditTable = (id: string) => {
    setEditTableIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const openEdit = (w: WaiterProfile) => {
    setEditingWaiter(w);
    setEditTableIds(w.assignedTables.map((t) => t.id));
  };

  const statusColor: Record<string, string> = {
    AVAILABLE: '#16a34a', OCCUPIED: '#d97706', CLEANING: '#7c3aed', RESERVED: '#0284c7'
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-stone-200">
        <div>
          <h1 className="font-serif text-3xl font-bold" style={{ color: '#1c1917' }}>Staff & Waiters</h1>
          <p className="text-sm mt-1" style={{ color: '#57534e' }}>Manage waiter accounts, PIN codes, and table assignments</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onRefresh} className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5">
            <UserPlus className="w-4 h-4" /> Add Waiter
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Waiters', val: waiters.length, icon: <Users className="w-5 h-5" />, color: '#2d5a2d' },
          { label: 'Active', val: waiters.filter(w => w.isActive).length, icon: <BadgeCheck className="w-5 h-5" />, color: '#16a34a' },
          { label: 'Inactive', val: waiters.filter(w => !w.isActive).length, icon: <XCircle className="w-5 h-5" />, color: '#dc2626' },
          { label: 'Assigned Tables', val: waiters.reduce((sum, w) => sum + w.assignedTables.length, 0), icon: <QrCode className="w-5 h-5" />, color: '#c9a84c' },
        ].map(({ label, val, icon, color }) => (
          <div key={label} className="glass-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + '20', color }}>
              {icon}
            </div>
            <div>
              <p className="text-2xl font-black" style={{ color: '#1c1917' }}>{val}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#78716c' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Waiter Cards */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#c9a84c' }} />
        </div>
      ) : waiters.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Users className="w-12 h-12 mx-auto mb-4" style={{ color: '#d6cbb5' }} />
          <h3 className="font-bold text-lg" style={{ color: '#57534e' }}>No Waiters Yet</h3>
          <p className="text-sm mt-1 mb-4" style={{ color: '#a8a29e' }}>Add your first waiter to get started</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-xs px-5 py-2.5 inline-flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Add First Waiter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {waiters.map((w) => (
            <div key={w.id} className="glass-card p-5 space-y-4" style={{ opacity: w.isActive ? 1 : 0.65 }}>
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg"
                    style={{ background: 'linear-gradient(135deg, #2d5a2d, #1f421f)' }}>
                    {w.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: '#1c1917' }}>{w.fullName}</p>
                    <p className="text-[11px]" style={{ color: '#78716c' }}>{w.email}</p>
                    <p className="text-[11px]" style={{ color: '#78716c' }}>{w.phone}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-1 rounded-full ${w.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {w.isActive ? '● Active' : '● Inactive'}
                </span>
              </div>

              {/* PIN Code */}
              <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: '#1c1917' }}>
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4" style={{ color: '#c9a84c' }} />
                  <span className="text-xs font-bold" style={{ color: '#a8a29e' }}>PIN Code</span>
                </div>
                <span className="font-black text-xl tracking-widest" style={{ color: '#c9a84c', fontFamily: 'monospace' }}>
                  {w.waiterCode ?? '----'}
                </span>
              </div>

              {/* Assigned Tables */}
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest mb-2" style={{ color: '#78716c' }}>Assigned Tables</p>
                {w.assignedTables.length === 0 ? (
                  <p className="text-xs italic" style={{ color: '#a8a29e' }}>No tables assigned</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {w.assignedTables.map((t) => (
                      <span key={t.id} className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                        style={{ borderColor: statusColor[t.status] || '#d6cbb5', color: statusColor[t.status] || '#57534e', background: (statusColor[t.status] || '#d6cbb5') + '18' }}>
                        T-{t.tableNumber} ({t.status})
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1 border-t border-stone-100">
                <button onClick={() => openEdit(w)}
                  className="flex-1 text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 transition"
                  style={{ background: '#fdfbf7', border: '1px solid #d6cbb5', color: '#44403c' }}>
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => onToggleActive(w)}
                  className="flex-1 text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 transition"
                  style={{ background: w.isActive ? '#fef9c3' : '#dcfce7', color: w.isActive ? '#854d0e' : '#166534' }}>
                  {w.isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  {w.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => onDeleteWaiter(w.id)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg transition"
                  style={{ background: '#fee2e2', color: '#dc2626' }} title="Delete waiter">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CREATE WAITER MODAL ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
          <div className="glass-card w-full max-w-md p-7 space-y-5 shadow-2xl relative">
            <button onClick={() => setShowCreate(false)}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full"
              style={{ background: '#eee5d3', color: '#44403c' }}>✕</button>

            <div>
              <h2 className="font-serif text-2xl font-bold" style={{ color: '#1c1917' }}>Add New Waiter</h2>
              <p className="text-xs mt-1" style={{ color: '#78716c' }}>A unique 4-digit PIN will be auto-generated</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#44403c' }}>Full Name *</label>
                <input className="input-dark w-full" placeholder="Ahmed Hassan" value={newWaiterForm.fullName}
                  onChange={(e) => setNewWaiterForm((p: any) => ({ ...p, fullName: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#44403c' }}>Phone *</label>
                <input className="input-dark w-full" placeholder="+251912345678" value={newWaiterForm.phone}
                  onChange={(e) => setNewWaiterForm((p: any) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#44403c' }}>Email (optional)</label>
                <input className="input-dark w-full" placeholder="waiter@restaurant.com" value={newWaiterForm.email}
                  onChange={(e) => setNewWaiterForm((p: any) => ({ ...p, email: e.target.value }))} />
              </div>

              {/* Table assignment */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#44403c' }}>Assign Tables</label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {tables.map((t) => {
                    const sel = newWaiterForm.tableIds.includes(t.id);
                    return (
                      <button key={t.id} type="button"
                        onClick={() => setNewWaiterForm((p: any) => ({
                          ...p,
                          tableIds: sel ? p.tableIds.filter((x: string) => x !== t.id) : [...p.tableIds, t.id]
                        }))}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-lg border transition"
                        style={{
                          background: sel ? '#2d5a2d' : '#fdfbf7',
                          color: sel ? '#fff' : '#44403c',
                          borderColor: sel ? '#2d5a2d' : '#d6cbb5'
                        }}>
                        T-{t.tableNumber}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button onClick={onCreateWaiter} disabled={isCreating || !newWaiterForm.fullName || !newWaiterForm.phone}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50">
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Create Waiter & Generate PIN
            </button>
          </div>
        </div>
      )}

      {/* ── EDIT WAITER MODAL ── */}
      {editingWaiter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
          <div className="glass-card w-full max-w-md p-7 space-y-5 shadow-2xl relative">
            <button onClick={() => setEditingWaiter(null)}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full"
              style={{ background: '#eee5d3', color: '#44403c' }}>✕</button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg"
                style={{ background: 'linear-gradient(135deg, #2d5a2d, #1f421f)' }}>
                {editingWaiter.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="font-serif text-xl font-bold" style={{ color: '#1c1917' }}>{editingWaiter.fullName}</h2>
                <p className="text-xs" style={{ color: '#78716c' }}>PIN: <span className="font-black font-mono" style={{ color: '#c9a84c' }}>{editingWaiter.waiterCode}</span></p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#44403c' }}>Reassign Tables</label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {tables.map((t) => {
                  const sel = editTableIds.includes(t.id);
                  return (
                    <button key={t.id} type="button" onClick={() => toggleEditTable(t.id)}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-lg border transition"
                      style={{
                        background: sel ? '#2d5a2d' : '#fdfbf7',
                        color: sel ? '#fff' : '#44403c',
                        borderColor: sel ? '#2d5a2d' : '#d6cbb5'
                      }}>
                      T-{t.tableNumber}
                    </button>
                  );
                })}
              </div>
            </div>

            <button onClick={() => onUpdateWaiter(editingWaiter, editTableIds)}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" /> Save Table Assignments
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
