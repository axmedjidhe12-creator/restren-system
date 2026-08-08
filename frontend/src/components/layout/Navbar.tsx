import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage, LanguageCode } from '../../contexts/LanguageContext';
import { Utensils, LogOut, Globe, Shield, LayoutDashboard, MonitorPlay, QrCode, Settings } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const location = useLocation();

  // Hide SaaS Navbar on Customer QR Menu pages (/r/*), KDS (/kds) and Waiter POS (/waiter) for isolated standalone view
  if (
    location.pathname.startsWith('/r/') ||
    (location.pathname === '/kds' && user?.role === 'KITCHEN_STAFF') ||
    location.pathname === '/waiter'
  ) {
    return null;
  }

  const isManagement =
    user?.role === 'RESTAURANT_OWNER' ||
    user?.role === 'RESTAURANT_MANAGER' ||
    user?.role === 'SUPER_ADMIN';

  return (
    <nav
      className="sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between shadow-sm"
      style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #eee5d3',
      }}
    >
      {/* ── Logo ── */}
      <Link to="/" className="flex items-center gap-3 group">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md transition-transform duration-200 group-hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #2d5a2d, #1f421f)' }}
        >
          <Utensils className="w-5 h-5 text-white stroke-[2.5]" />
        </div>
        <div>
          <span className="font-sans font-black text-lg tracking-widest uppercase" style={{ color: '#1c1917' }}>
            RESTREN <span style={{ color: '#86682b' }}>SYSTEM</span>
          </span>
          <span className="block text-[9px] uppercase tracking-[0.2em] font-extrabold" style={{ color: '#78716c' }}>
            Ethiopia SaaS Platform
          </span>
        </div>
      </Link>

      {/* ── Center Navigation Links for Authenticated Management Users Only ── */}
      {isAuthenticated && isManagement && (
        <div className="hidden md:flex items-center gap-1 p-1 rounded-xl"
          style={{ background: '#f7f2e6', border: '1px solid #ede2cd' }}>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              backgroundColor: location.pathname === '/dashboard' ? '#2d5a2d' : 'transparent',
              color: location.pathname === '/dashboard' ? '#ffffff' : '#57534e',
            }}
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
          </Link>

          <Link
            to="/kds"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              backgroundColor: location.pathname === '/kds' ? '#2d5a2d' : 'transparent',
              color: location.pathname === '/kds' ? '#ffffff' : '#57534e',
            }}
          >
            <MonitorPlay className="w-3.5 h-3.5" /> Kitchen (KDS)
          </Link>

          <Link
            to="/waiter"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              backgroundColor: location.pathname === '/waiter' ? '#2d5a2d' : 'transparent',
              color: location.pathname === '/waiter' ? '#ffffff' : '#57534e',
            }}
          >
            <Utensils className="w-3.5 h-3.5" /> Waiter POS
          </Link>

          <Link
            to={`/r/${user?.restaurantSlug || 'safari-restaurant'}?table=1`}
            target="_blank"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-stone-200"
            style={{ color: '#86682b' }}
          >
            <QrCode className="w-3.5 h-3.5" /> Preview QR Menu
          </Link>

          {user?.role === 'SUPER_ADMIN' && (
            <Link
              to="/superadmin"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                backgroundColor: location.pathname === '/superadmin' ? '#86682b' : 'transparent',
                color: location.pathname === '/superadmin' ? '#ffffff' : '#86682b',
              }}
            >
              <Shield className="w-3.5 h-3.5" /> SuperAdmin
            </Link>
          )}
        </div>
      )}

      {/* ── Right Controls ── */}
      <div className="flex items-center gap-4">

        {/* Language Selector */}
        <div className="flex items-center gap-0.5 p-1 rounded-lg"
          style={{ background: '#f7f2e6', border: '1px solid #ede2cd' }}>
          <Globe className="w-3.5 h-3.5 mx-1.5" style={{ color: '#78716c' }} />
          {(['en', 'so'] as LanguageCode[]).map((code) => (
            <button
              key={code}
              onClick={() => setLanguage(code)}
              className="px-2.5 py-1 rounded text-[11px] font-bold tracking-wider transition-all duration-150"
              style={{
                backgroundColor: language === code ? '#2d5a2d' : 'transparent',
                color: language === code ? '#ffffff' : '#57534e',
              }}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Auth Section */}
        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            {/* User Info */}
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold" style={{ color: '#1c1917' }}>{user?.fullName}</div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest flex items-center justify-end gap-1"
                style={{ color: '#86682b' }}>
                <Shield className="w-3 h-3" /> {user?.role.replace(/_/g, ' ')}
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              className="p-2 rounded-lg transition-all duration-150"
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
              }}
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login"
              className="px-4 py-2 text-sm font-semibold transition-all duration-150"
              style={{ color: '#44403c' }}
            >
              Sign In
            </Link>
            <Link to="/register" className="btn-primary text-sm px-4 py-2">
              Get Started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};
