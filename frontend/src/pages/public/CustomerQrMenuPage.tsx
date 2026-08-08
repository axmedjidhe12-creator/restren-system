import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useLanguage, LanguageCode } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import axios from 'axios';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Plus, Minus, Send, Utensils, ArrowLeft, LayoutDashboard,
  Loader2, AlertCircle, Trash2, Star, Clock, Bell, PhoneCall, MapPin,
  Mail, Image as ImageIcon, Info, Phone, MessageSquare, ShieldCheck,
  CheckCircle2, User, Lock, LogIn, Sparkles, Heart, ChevronRight,
  Wifi, Crown, ChevronLeft, X
} from 'lucide-react';

interface MenuItem {
  id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  price: number | string;
  images?: string[];
  isPopular?: boolean;
  prepTimeMins?: number;
  isAvailable: boolean;
}

interface Category {
  id: string;
  name: Record<string, string>;
  imageUrl?: string;
  menuItems: MenuItem[];
}

interface RestaurantInfo {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  description?: string;
  currency: string;
  branchId: string | null;
}

type CartItem = { item: MenuItem; quantity: number };

interface CustomerReview {
  id: string;
  name: string;
  rating: number;
  date: string;
  comment: string;
  dishName?: string;
  verified: boolean;
}

type TabType = 'home' | 'menu' | 'gallery' | 'about' | 'contact' | 'reviews' | 'staff';

// Default Gallery Images for Restaurant
const DEFAULT_GALLERY = [
  {
    url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80',
    title: 'Signature Grilled Ribeye Steak',
    category: 'Dishes'
  },
  {
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80',
    title: 'Luxury Dining Hall & Ambiance',
    category: 'Interior'
  },
  {
    url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1000&q=80',
    title: 'Artisanal Wood-Fired Pizza',
    category: 'Dishes'
  },
  {
    url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80',
    title: 'Outdoor Garden Terrace',
    category: 'Interior'
  },
  {
    url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1000&q=80',
    title: 'Signature Tropical Cocktails & Refreshments',
    category: 'Drinks'
  },
  {
    url: 'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&w=1000&q=80',
    title: 'Master Chef Preparing Dishes Live',
    category: 'Kitchen'
  }
];

// Initial Customer Reviews
const INITIAL_REVIEWS: CustomerReview[] = [
  {
    id: 'rev-1',
    name: 'Abdi Hassan',
    rating: 5,
    date: '2 days ago',
    comment: 'Maqayada ugu wanaagsan magaalada! Cuntadooda waa super fresh, shaqalahana aad ayay u edeb badan yihiin. QR code ordering super smooth!',
    dishName: 'Special Tibs & Injera',
    verified: true
  },
  {
    id: 'rev-2',
    name: 'Sara Tesfaye',
    rating: 5,
    date: '1 week ago',
    comment: 'The atmosphere is breathtaking and the food quality is unmatched. Loved the fast service and clean environment.',
    dishName: 'Grilled Ribeye Steak',
    verified: true
  },
  {
    id: 'rev-3',
    name: 'Mohamed Nur',
    rating: 4,
    date: '2 weeks ago',
    comment: 'Cunno aad u macaan iyo adeeg degdeg ah. Telebirr payment instant ayay ahayd. Recommended for family dinners.',
    dishName: 'Special Pasta & Mango Juice',
    verified: true
  }
];

// Default Demo Categories for Fallback/Offline mode
const DEFAULT_DEMO_CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    name: { en: 'Cuntooyinka Waaweyn', so: 'Cuntooyinka Waaweyn' },
    menuItems: [
      {
        id: 'item-1',
        name: { en: 'Tibs Gaar ah & Injera', so: 'Tibs Gaar ah & Injera' },
        description: { en: 'Chick fresh cooked with garlic, onions, and spicy peppers.', so: 'Hilib lo’aad oo kulul oo ku bislaaday basal, ahayso, iyo basbaas berri.' },
        price: '350.00',
        images: ['https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80'],
        isPopular: true,
        prepTimeMins: 3,
        isAvailable: true
      },
      {
        id: 'item-2',
        name: { en: 'Repulika Special Steak', so: 'Repulika Special Steak' },
        description: { en: 'Centurions premium ribeye cut served with roasted garlic butter.', so: 'Steak lo’aad oo jilicsan oo la socda subag ahayso iyo salad.' },
        price: '290.00',
        images: ['https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1000&q=80'],
        isPopular: true,
        prepTimeMins: 2,
        isAvailable: true
      },
      {
        id: 'item-3',
        name: { en: 'Promenade & Injera', so: 'Promenade & Injera' },
        description: { en: 'Marinated beef with ethiopian herbs, sautéed spinach and paprica.', so: 'Hilib lo’aad oo la mariyay xawaash iyo khadraat.' },
        price: '250.00',
        images: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1000&q=80'],
        isPopular: true,
        prepTimeMins: 2,
        isAvailable: true
      },
      {
        id: 'item-4',
        name: { en: 'Rik Gaar ah & Injera', so: 'Rik Gaar ah & Injera' },
        description: { en: 'Fresh tender beef cooked in traditional clay pot with rosemary.', so: 'Hilib lo’aad oo jilicsan oo lagu kariyay kildhi.' },
        price: '80.00',
        images: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1000&q=80'],
        isPopular: false,
        prepTimeMins: 2,
        isAvailable: true
      },
      {
        id: 'item-5',
        name: { en: 'Ribeye Steak Lagilliyay', so: 'Ribeye Steak Lagilliyay' },
        description: { en: 'Custom steak cut grilled over charcoal with melted herb butter.', so: 'Steak lo’aad oo dabka lagu gilliya.' },
        price: '190.00',
        images: ['https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=1000&q=80'],
        isPopular: true,
        prepTimeMins: 3,
        isAvailable: true
      },
      {
        id: 'item-6',
        name: { en: 'The Pluslok Injera', so: 'The Pluslok Injera' },
        description: { en: 'Traditional rich soup served with warm injera rolls.', so: 'Cunno dhaqameed macaan oo la socota injera.' },
        price: '50.00',
        images: ['https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=80'],
        isPopular: false,
        prepTimeMins: 2,
        isAvailable: true
      }
    ]
  }
];

export const CustomerQrMenuPage: React.FC = () => {
  const { restaurantSlug } = useParams<{ restaurantSlug: string }>();
  const [searchParams] = useSearchParams();
  const tableNumber = searchParams.get('table') || '1';
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  // Navigation State
  const [activeTab, setActiveTab] = useState<TabType>('menu');

  // Restaurant & Menu State
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_DEMO_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reviews State
  const [reviews, setReviews] = useState<CustomerReview[]>(INITIAL_REVIEWS);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newReviewName, setNewReviewName] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewDish, setNewReviewDish] = useState('');

  // Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSendingContact, setIsSendingContact] = useState(false);

  // Quick Staff Login Loading State
  const [staffLoginLoading, setStaffLoginLoading] = useState<string | null>(null);

  // Waiter Call Socket handler
  const handleCallWaiter = () => {
    if (!restaurantInfo?.id || !restaurantInfo?.branchId) return;
    try {
      const socket = io('/', { path: '/socket.io' });
      socket.emit('call_waiter', {
        restaurantId: restaurantInfo.id,
        branchId: restaurantInfo.branchId,
        tableNumber
      });
      toast.success(`🛎️ Waiter notified for Table #${tableNumber}!`, { icon: '🔔', duration: 4000 });
      setTimeout(() => socket.disconnect(), 1000);
    } catch {
      toast.error('Failed to alert waiter');
    }
  };

  // Fetch Public Menu Data
  const fetchPublicMenu = useCallback(async () => {
    if (!restaurantSlug) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await axios.get(`/api/v1/menu/public/${restaurantSlug}`);
      if (res.data.success && res.data.data.restaurant) {
        setRestaurantInfo(res.data.data.restaurant);
        setCategories(res.data.data.categories?.length > 0 ? res.data.data.categories : DEFAULT_DEMO_CATEGORIES);
      } else {
        setRestaurantInfo({
          id: 'demo-rest-id',
          name: restaurantSlug.replace(/-/g, ' ').toUpperCase(),
          slug: restaurantSlug,
          currency: 'USD',
          branchId: 'demo-branch-id',
          description: 'Samm ipsum erens at amet, rebet and heeting, advidead aotemioblers nacioas.'
        });
        setCategories(DEFAULT_DEMO_CATEGORIES);
      }
    } catch {
      // Fallback demo data if backend is offline
      setRestaurantInfo({
        id: 'demo-rest-id',
        name: restaurantSlug.replace(/-/g, ' ').toUpperCase(),
        slug: restaurantSlug,
        currency: 'USD',
        branchId: 'demo-branch-id',
        description: 'Samm ipsum erens at amet, rebet and heeting, advidead aotemioblers nacioas.'
      });
      setCategories(DEFAULT_DEMO_CATEGORIES);
    } finally {
      setIsLoading(false);
    }
  }, [restaurantSlug]);

  useEffect(() => {
    fetchPublicMenu();
  }, [fetchPublicMenu]);

  // Handle Quick Demo Staff Logins
  const handleStaffQuickLogin = async (role: 'OWNER' | 'KITCHEN' | 'WAITER') => {
    const credentials = {
      OWNER: { email: 'owner@safari.com', pass: 'Password123!', path: '/dashboard', label: 'Owner' },
      KITCHEN: { email: 'kitchen@safari.com', pass: 'Password123!', path: '/kds', label: 'Kitchen Staff' },
      WAITER: { email: 'waiter@safari.com', pass: 'Password123!', path: '/waiter', label: 'Waiter Staff' }
    }[role];

    setStaffLoginLoading(role);
    try {
      const res = await api.post('/auth/login', { email: credentials.email, password: credentials.pass });
      if (res.data.success) {
        toast.success(`Welcome back to ${restaurantInfo?.name || 'Restaurant'}! Logged in as ${credentials.label}`);
        login(res.data.data.token, res.data.data.user);
        navigate(credentials.path);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to authenticate quick test account');
    } finally {
      setStaffLoginLoading(null);
    }
  };

  // Cart operations
  const allItems: MenuItem[] = categories.flatMap((cat) => cat.menuItems);
  const displayedItems =
    activeCategory === 'ALL'
      ? allItems
      : categories.find((c) => c.id === activeCategory)?.menuItems || allItems;

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) => (c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, { item, quantity: 1 }];
    });
    toast.success(`${t(item.name)} added to cart`, { duration: 1500 });
  };

  const decreaseCart = (itemId: string) => {
    setCart((prev) =>
      prev
        .map((c) => (c.item.id === itemId ? { ...c, quantity: c.quantity - 1 } : c))
        .filter((c) => c.quantity > 0)
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((c) => c.item.id !== itemId));
  };

  const cartTotal = cart.reduce((sum, c) => sum + Number(c.item.price) * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    if (!restaurantInfo?.id || !restaurantInfo?.branchId) {
      toast.error('Restaurant information missing. Please refresh.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await axios.post('/api/v1/orders/public', {
        restaurantId: restaurantInfo.id,
        branchId: restaurantInfo.branchId,
        tableId: null,
        orderType: 'DINE_IN',
        paymentMethod: 'CASH',
        customerName: `Table ${tableNumber}`,
        items: cart.map((c) => ({
          menuItemId: c.item.id,
          quantity: c.quantity
        }))
      });

      if (res.data.success) {
        toast.success(`✅ Order ${res.data.data.orderNumber} sent to kitchen!`, { duration: 5000 });
        setCart([]);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Review
  const handleAddReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewName.trim() || !newReviewComment.trim()) {
      toast.error('Please provide your name and review comment');
      return;
    }
    const newRev: CustomerReview = {
      id: `rev-${Date.now()}`,
      name: newReviewName,
      rating: newReviewRating,
      date: 'Just now',
      comment: newReviewComment,
      dishName: newReviewDish.trim() || undefined,
      verified: true
    };
    setReviews([newRev, ...reviews]);
    toast.success('Mahadsanid! Review-gaaga waa la daabacay ⭐');
    setShowReviewModal(false);
    setNewReviewName('');
    setNewReviewComment('');
    setNewReviewDish('');
    setNewReviewRating(5);
  };

  // Submit Contact Form
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactPhone) {
      toast.error('Please enter name and phone number');
      return;
    }
    setIsSendingContact(true);
    setTimeout(() => {
      setIsSendingContact(false);
      toast.success('Fariintaada waa la diray!');
      setContactName('');
      setContactPhone('');
      setContactMessage('');
    }, 1000);
  };

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f5f2eb' }}>
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-emerald-800" />
          <p className="text-base font-bold text-stone-700">Loading Royal Restaurant UI...</p>
        </div>
      </div>
    );
  }

  const restName = restaurantInfo?.name || 'Royal Restaurant';

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: '#f5f2eb', color: '#1c1917' }}>

      {/* ── TOP HEADER NAVBAR (EXACT MATCH WITH REFERENCE IMAGE) ── */}
      <div className="bg-[#f5f2eb] border-b border-[#e5dec9]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#224822] text-[#c9a84c]">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif font-extrabold text-xl leading-tight text-[#1c1917]">
                {restName}
              </h1>
              <p className="text-[10px] font-bold tracking-widest text-[#86682b] uppercase">
                ETHIOPIAN SAAS PLATFORM
              </p>
            </div>
          </div>

          {/* Right Header Navigation Actions */}
          <div className="flex items-center gap-3">
            {/* Language Pill */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#e9e3d3] border border-[#d8cfb9]">
              {(['en', 'so'] as LanguageCode[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-black tracking-wider transition ${
                    language === lang ? 'bg-[#224822] text-white' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>

            <Link to="/login" className="text-xs font-bold text-stone-800 hover:text-emerald-800 px-2">
              Sign In
            </Link>

            <Link
              to="/register"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#224822] hover:bg-[#193619] text-white shadow-sm transition"
            >
              Get Started
            </Link>
          </div>

        </div>

        {/* Sub-Header Navigation Links Bar */}
        <div className="max-w-6xl mx-auto px-4 flex gap-6 overflow-x-auto scrollbar-hide py-2 text-xs font-bold text-stone-700">
          <button onClick={() => setActiveTab('home')} className={`hover:text-[#224822] ${activeTab === 'home' ? 'text-[#224822] font-extrabold border-b-2 border-[#224822] pb-0.5' : ''}`}>
            Home
          </button>
          <button onClick={() => setActiveTab('menu')} className={`hover:text-[#224822] ${activeTab === 'menu' ? 'text-[#224822] font-extrabold border-b-2 border-[#224822] pb-0.5' : ''}`}>
            Menu
          </button>
          <button onClick={() => setActiveTab('gallery')} className={`hover:text-[#224822] ${activeTab === 'gallery' ? 'text-[#224822] font-extrabold border-b-2 border-[#224822] pb-0.5' : ''}`}>
            Gallery
          </button>
          <button onClick={() => setActiveTab('about')} className={`hover:text-[#224822] ${activeTab === 'about' ? 'text-[#224822] font-extrabold border-b-2 border-[#224822] pb-0.5' : ''}`}>
            About
          </button>
          <button onClick={() => setActiveTab('contact')} className={`hover:text-[#224822] ${activeTab === 'contact' ? 'text-[#224822] font-extrabold border-b-2 border-[#224822] pb-0.5' : ''}`}>
            Contact
          </button>
          <button onClick={() => setActiveTab('reviews')} className={`hover:text-[#224822] ${activeTab === 'reviews' ? 'text-[#224822] font-extrabold border-b-2 border-[#224822] pb-0.5' : ''}`}>
            Reviews ({reviews.length})
          </button>
          <button onClick={() => setActiveTab('staff')} className={`hover:text-[#224822] ${activeTab === 'staff' ? 'text-[#224822] font-extrabold border-b-2 border-[#224822] pb-0.5' : ''}`}>
            Staff Portal
          </button>
        </div>
      </div>

      {/* ── HERO BANNER (DEEP FOREST GREEN WITH GOLD CROWN) ── */}
      <div className="max-w-6xl mx-auto px-4 pt-4">
        <div className="relative rounded-2xl overflow-hidden text-center text-white py-12 px-6 shadow-md"
          style={{ background: 'linear-gradient(135deg, #193619 0%, #224822 100%)' }}>
          <div className="relative z-10 max-w-xl mx-auto space-y-3">
            {/* Golden Crown Icon */}
            <div className="w-16 h-16 mx-auto mb-1 flex items-center justify-center text-[#e5c158]">
              <Crown className="w-12 h-12 stroke-[1.5]" />
            </div>

            <h2 className="font-serif text-4xl lg:text-5xl font-normal tracking-tight text-[#faf7f0]">
              {restName}
            </h2>

            <p className="text-xs text-[#d3e2d3] leading-relaxed max-w-md mx-auto">
              Samm ipsum erens at amet, rebet and heeting, advidead aotemioblers nacioas.
            </p>
          </div>
        </div>
      </div>

      {/* ── SECONDARY TAB CONTROLS (ROUNDED CARD TABS BAR) ── */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-[#eae4d5] p-2 rounded-2xl border border-[#d8cfb9]">
          <button
            onClick={() => setActiveTab('home')}
            className={`py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'home'
                ? 'bg-[#224822] text-white shadow-sm font-extrabold'
                : 'bg-transparent text-stone-700 hover:bg-[#dfd7c4]'
            }`}
          >
            <Utensils className="w-4 h-4" /> Home &amp; Order
          </button>

          <button
            onClick={() => setActiveTab('menu')}
            className={`py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'menu'
                ? 'bg-[#224822] text-white shadow-sm font-extrabold'
                : 'bg-transparent text-stone-700 hover:bg-[#dfd7c4]'
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> Menu &amp; Order
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'gallery'
                ? 'bg-[#224822] text-white shadow-sm font-extrabold'
                : 'bg-transparent text-stone-700 hover:bg-[#dfd7c4]'
            }`}
          >
            <ImageIcon className="w-4 h-4" /> Gallery &amp; Reviews
          </button>

          <button
            onClick={() => setActiveTab('staff')}
            className={`py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'staff'
                ? 'bg-[#224822] text-white shadow-sm font-extrabold'
                : 'bg-transparent text-stone-700 hover:bg-[#dfd7c4]'
            }`}
          >
            <Lock className="w-4 h-4" /> Staff Portal
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* ============================================== */}
        {/* TAB: MENU & ORDER (MATCHES REFERENCE IMAGE)    */}
        {/* ============================================== */}
        {(activeTab === 'menu' || activeTab === 'home') && (
          <div className="space-y-6 animate-fade-in-up">
            
            {/* Category Header Row */}
            <div className="flex items-center justify-between pb-2 border-b border-[#e5dec9]">
              <h3 className="font-serif text-2xl font-bold text-[#1c1917]">
                Cuntooyinka Waaweyn ({displayedItems.length})
              </h3>
              
              <div className="flex items-center gap-2 text-xs font-bold text-[#86682b]">
                <button
                  onClick={() => setActiveCategory('ALL')}
                  className="flex items-center gap-1 hover:underline px-2 py-1 rounded bg-[#eae4d5]"
                >
                  <ChevronLeft className="w-4 h-4" /> All Items <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 3-COLUMN FOOD CARDS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {displayedItems.map((item) => {
                const cartEntry = cart.find((c) => c.item.id === item.id);
                const imageUrl = item.images && item.images.length > 0 ? item.images[0] : null;

                return (
                  <div
                    key={item.id}
                    className="bg-[#fbf9f4] border border-[#e5dec9] rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition duration-200"
                  >
                    {/* Top Dish Image */}
                    <div className="w-full h-48 overflow-hidden bg-[#eee5d3] relative">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={t(item.name)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#c9a84c]">
                          <Utensils className="w-10 h-10" />
                        </div>
                      )}
                    </div>

                    {/* Card Content Body */}
                    <div className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-serif font-bold text-lg text-[#1c1917] leading-tight">
                          {t(item.name)}
                        </h4>
                        <span className="font-serif font-extrabold text-base text-[#b43e19] shrink-0">
                          {Number(item.price).toFixed(2)} ETB
                        </span>
                      </div>

                      <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                        {t(item.description)}
                      </p>

                      <div className="flex items-center gap-1 text-[11px] font-semibold text-stone-500 pt-1">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        <span>• {item.prepTimeMins || 3} mins prep</span>
                      </div>
                    </div>

                    {/* Card Action Button */}
                    <div className="p-4 pt-0">
                      {cartEntry ? (
                        <div className="flex items-center justify-between bg-[#eee5d3] p-1.5 rounded-xl border border-[#d8cfb9]">
                          <button
                            onClick={() => decreaseCart(item.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-stone-300 font-bold text-stone-900"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-extrabold text-xs text-stone-900">{cartEntry.quantity} in order</span>
                          <button
                            onClick={() => addToCart(item)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#224822] font-bold text-white"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-extrabold bg-[#224822] hover:bg-[#193619] text-white flex items-center justify-center gap-2 shadow-sm transition"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" /> Add to Order
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* ============================================== */}
        {/* TAB: GALLERY                                   */}
        {/* ============================================== */}
        {activeTab === 'gallery' && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-[#86682b]">Visual Gallery</p>
              <h2 className="font-serif text-3xl font-bold text-stone-900">Sawirada Maqayada ({restName})</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {DEFAULT_GALLERY.map((img, idx) => (
                <div key={idx} className="bg-[#fbf9f4] border border-[#e5dec9] rounded-2xl overflow-hidden shadow-sm">
                  <img src={img.url} alt={img.title} className="w-full h-56 object-cover" />
                  <div className="p-3 text-center">
                    <span className="text-xs font-bold text-stone-800">{img.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================== */}
        {/* TAB: ABOUT US                                  */}
        {/* ============================================== */}
        {activeTab === 'about' && (
          <div className="max-w-4xl mx-auto animate-fade-in-up space-y-6">
            <div className="bg-[#fbf9f4] border border-[#e5dec9] p-8 rounded-2xl space-y-4">
              <h2 className="font-serif text-3xl font-bold text-stone-900">{restName}</h2>
              <p className="text-sm text-stone-700 leading-relaxed">
                {restaurantInfo?.description || 'Samm ipsum erens at amet, rebet and heeting, advidead aotemioblers nacioas.'}
              </p>
            </div>
          </div>
        )}

        {/* ============================================== */}
        {/* TAB: CONTACT                                   */}
        {/* ============================================== */}
        {activeTab === 'contact' && (
          <div className="max-w-3xl mx-auto animate-fade-in-up space-y-6">
            <div className="bg-[#fbf9f4] border border-[#e5dec9] p-8 rounded-2xl space-y-4">
              <h2 className="font-serif text-3xl font-bold text-stone-900">Contact &amp; Location</h2>
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Your Name" className="input-dark w-full" required />
                <input type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Phone Number" className="input-dark w-full" required />
                <textarea rows={3} value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} placeholder="Message" className="input-dark w-full" />
                <button type="submit" className="btn-primary w-full py-3 text-xs font-bold">Submit Message</button>
              </form>
            </div>
          </div>
        )}

        {/* ============================================== */}
        {/* TAB: REVIEWS                                   */}
        {/* ============================================== */}
        {activeTab === 'reviews' && (
          <div className="max-w-3xl mx-auto animate-fade-in-up space-y-6">
            <div className="bg-[#fbf9f4] border border-[#e5dec9] p-6 rounded-2xl flex justify-between items-center">
              <div>
                <h3 className="font-serif text-2xl font-bold text-stone-900">Customer Reviews</h3>
                <p className="text-xs text-stone-500">4.9 ★★★★★ out of 5 stars</p>
              </div>
              <button onClick={() => setShowReviewModal(true)} className="btn-gold px-4 py-2 text-xs font-bold">Write Review</button>
            </div>

            <div className="space-y-4">
              {reviews.map((rev) => (
                <div key={rev.id} className="bg-[#fbf9f4] border border-[#e5dec9] p-5 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center font-bold text-stone-900 text-xs">
                    <span>{rev.name}</span>
                    <span className="text-amber-500 flex">{[...Array(rev.rating)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}</span>
                  </div>
                  <p className="text-xs text-stone-700 italic">"{rev.comment}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================== */}
        {/* TAB: STAFF PORTAL                              */}
        {/* ============================================== */}
        {activeTab === 'staff' && (
          <div className="max-w-md mx-auto animate-fade-in-up">
            <div className="bg-[#fbf9f4] border border-[#e5dec9] p-8 rounded-2xl text-center space-y-6 shadow-sm">
              <div className="w-14 h-14 mx-auto rounded-xl flex items-center justify-center bg-[#224822] text-[#c9a84c]">
                <Lock className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-serif text-2xl font-bold text-stone-900">Staff Access Portal</h3>
                <p className="text-xs text-stone-500 mt-1">Quick login for {restName} staff</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => handleStaffQuickLogin('OWNER')} className="p-3 rounded-xl font-bold text-xs bg-amber-100 text-amber-900 border border-amber-300">
                  👔 Owner
                </button>
                <button onClick={() => handleStaffQuickLogin('KITCHEN')} className="p-3 rounded-xl font-bold text-xs bg-emerald-100 text-emerald-900 border border-emerald-300">
                  🍳 Kitchen
                </button>
                <button onClick={() => handleStaffQuickLogin('WAITER')} className="p-3 rounded-xl font-bold text-xs bg-blue-100 text-blue-900 border border-blue-300">
                  🤵 Waiter
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── CART FIXED BOTTOM DRAWER ── */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-stone-950/90 to-transparent">
          <div className="max-w-3xl mx-auto rounded-2xl shadow-2xl overflow-hidden bg-[#1c3822] border border-amber-400/40 text-white p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-300 block">Cart Total ({cartCount} items)</span>
              <span className="text-xl font-black text-white">{cartTotal.toFixed(2)} ETB</span>
            </div>
            <button onClick={handleSubmitOrder} disabled={isSubmitting} className="btn-gold px-6 py-2.5 text-xs font-bold flex items-center gap-2">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Place Order
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default CustomerQrMenuPage;
