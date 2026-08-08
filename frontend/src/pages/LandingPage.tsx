import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QrCode, MonitorPlay, CreditCard, ChevronRight, Globe, ShieldCheck, Zap, Users } from 'lucide-react';

const FEATURES = [
  {
    icon: <QrCode className="w-6 h-6" />,
    title: 'Dynamic QR Table Menus',
    desc: 'Customers scan table QR codes to view instant digital menus in English and Somali with zero app installation.',
    color: '#86682b',
  },
  {
    icon: <MonitorPlay className="w-6 h-6" />,
    title: 'Realtime Kitchen Display',
    desc: 'Live Socket.IO order sync to kitchen displays with audio alerts, status timers, and instant waiter dispatch notifications.',
    color: '#2d5a2d',
  },
  {
    icon: <CreditCard className="w-6 h-6" />,
    title: 'Telebirr & CBE Payments',
    desc: 'Integrated proof upload for Ethiopian payment providers — Telebirr, CBE Birr, Cash, Bank Transfer — with cashier verification.',
    color: '#86682b',
  },
  {
    icon: <Globe className="w-6 h-6" />,
    title: '2-Language Support',
    desc: 'Fully localized platform in English and Somali — serving both international and local customers seamlessly.',
    color: '#2d5a2d',
  },
  {
    icon: <ShieldCheck className="w-6 h-6" />,
    title: 'Enterprise Security',
    desc: 'JWT authentication, bcrypt hashing, RBAC with 8 roles, tenant data isolation, and Helmet security headers.',
    color: '#86682b',
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: 'Multi-Branch Management',
    desc: 'Manage unlimited branches, staff, tables, inventory, and menus independently from a single owner dashboard.',
    color: '#2d5a2d',
  },
];

const STATS = [
  { value: '10,000+', label: 'Orders Processed Daily' },
  { value: '500+', label: 'Restaurant Tenants' },
  { value: '99.9%', label: 'Platform Uptime' },
  { value: '2', label: 'Platform Languages' },
];

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fdfbf7', color: '#1c1917' }}>

      {/* ── HERO ── */}
      <div className="relative overflow-hidden pt-16 pb-28 px-6 max-w-7xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          {/* Badge */}
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-8"
            style={{ background: '#f7f2e6', border: '1px solid #ede2cd', color: '#86682b' }}>
            <span className="w-2 h-2 rounded-full animate-warm-pulse" style={{ backgroundColor: '#2d5a2d' }} />
            Enterprise Restaurant SaaS · Ethiopia
          </span>

          {/* Headline */}
          <h1 className="font-serif text-5xl md:text-7xl max-w-4xl mx-auto leading-tight mb-6"
            style={{ color: '#1c1917', letterSpacing: '-0.02em' }}>
            Where Ethiopian<br />
            <em className="gradient-text-gold">Hospitality</em> Meets<br />
            Modern Technology
          </h1>

          <p className="text-lg max-w-2xl mx-auto leading-relaxed mb-10" style={{ color: '#57534e' }}>
            Multi-tenant SaaS platform built for restaurants across Ethiopia.
            Dynamic QR menus, live Kitchen Display System, Telebirr &amp; CBE payment verification,
            and multi-language support — all in one platform.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/register" className="btn-primary flex items-center gap-2 text-sm">
              Start Free Trial <ChevronRight className="w-4 h-4" />
            </Link>
            <Link to="/r/royal-restaurant?table=1" className="btn-secondary flex items-center gap-2 text-sm">
              <QrCode className="w-4 h-4" style={{ color: '#86682b' }} /> Demo QR Menu
            </Link>
          </div>
        </motion.div>
      </div>

      {/* ── STATS BAR ── */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px"
          style={{ background: '#ede2cd', borderRadius: '1rem', overflow: 'hidden' }}>
          {STATS.map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i, duration: 0.5 }}
              className="text-center py-8 px-4" style={{ backgroundColor: '#ffffff' }}>
              <div className="font-serif text-4xl font-bold mb-1 gradient-text-gold">{s.value}</div>
              <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#78716c' }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── DIVIDER ── */}
      <div className="divider-gold max-w-4xl mx-auto mb-20" />

      {/* ── FEATURES GRID ── */}
      <div className="max-w-7xl mx-auto px-6 pb-28">
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#86682b' }}>Platform Features</p>
          <h2 className="font-serif text-4xl md:text-5xl" style={{ color: '#1c1917' }}>
            Crafted with Passion,<br />
            <em className="gradient-text-gold">Served with Precision</em>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 text-left">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i, duration: 0.5 }}
              className="glass-card p-6 rounded-2xl transition-all duration-200 cursor-default hover:shadow-lg"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-200"
                style={{ background: '#f7f2e6', border: '1px solid #ede2cd', color: f.color }}>
                {f.icon}
              </div>
              <h3 className="font-serif text-xl font-bold mb-2" style={{ color: '#1c1917' }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#57534e' }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── BOTTOM CTA ── */}
      <div className="pb-28 px-6">
        <div className="max-w-3xl mx-auto text-center p-12 rounded-3xl glass-card">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#86682b' }}>Get Started Today</p>
          <h2 className="font-serif text-4xl mb-4" style={{ color: '#1c1917' }}>
            Ready to Transform<br />Your Restaurant?
          </h2>
          <p className="text-sm mb-8" style={{ color: '#57534e' }}>
            Join Ethiopia's fastest-growing restaurant technology platform. 14 days free — no credit card required.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/register" className="btn-primary flex items-center gap-2">
              <Users className="w-4 h-4" /> Register Your Restaurant
            </Link>
            <Link to="/login" className="btn-secondary flex items-center gap-2">
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="text-center py-8 text-xs font-semibold" style={{ color: '#78716c', borderTop: '1px solid #eee5d3' }}>
        © 2026 RESTREN SYSTEM — Ethiopia's Multi-Tenant Restaurant SaaS Platform
      </div>
    </div>
  );
};
