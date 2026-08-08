import React from 'react';
import { ShieldCheck, Building2, CreditCard, Activity, CheckCircle, XCircle, Users, TrendingUp } from 'lucide-react';

const TENANTS = [
  { name: 'Royal Restaurant', city: 'Addis Ababa', status: 'ACTIVE',  plan: 'Enterprise', mrr: '3,500 ETB' },
  { name: 'Harar Gate Café',  city: 'Harar',       status: 'ACTIVE',  plan: 'Startup',    mrr: '1,200 ETB' },
  { name: 'Mogadishu Grill',  city: 'Jijiga',      status: 'ACTIVE',  plan: 'Startup',    mrr: '1,200 ETB' },
  { name: 'Lalibela Dining',  city: 'Lalibela',    status: 'SUSPENDED', plan: 'Startup',  mrr: '0 ETB' },
  { name: 'Awash Lounge',     city: 'Dire Dawa',   status: 'ACTIVE',  plan: 'Enterprise', mrr: '3,500 ETB' },
];

const KPI = [
  { label: 'Total Restaurants', value: '48',        sub: '+6 this month',    icon: <Building2 className="w-5 h-5" />, color: '#86682b' },
  { label: 'Monthly Revenue',   value: '72,000 ETB', sub: 'Active subs',     icon: <CreditCard className="w-5 h-5" />, color: '#2d5a2d' },
  { label: 'Active Tenants',    value: '44',         sub: '4 suspended',     icon: <Users className="w-5 h-5" />,     color: '#86682b' },
  { label: 'System Uptime',     value: '99.9%',      sub: 'All services OK', icon: <Activity className="w-5 h-5" />, color: '#2d5a2d' },
];

export const SuperAdminDashboard: React.FC = () => {
  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#fdfbf7', color: '#1c1917' }}>

      {/* ── Header ── */}
      <div className="flex items-center gap-4 pb-6 mb-8"
        style={{ borderBottom: '1px solid #eee5d3' }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
          style={{ background: 'linear-gradient(135deg, #2d5a2d, #1f421f)', color: '#ffffff' }}>
          <ShieldCheck className="w-7 h-7" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: '#86682b' }}>
            Platform Control
          </p>
          <h1 className="font-serif text-3xl font-bold" style={{ color: '#1c1917' }}>Super Admin Dashboard</h1>
          <p className="text-xs mt-0.5" style={{ color: '#57534e' }}>
            Global SaaS metrics and tenant management center
          </p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        {KPI.map((k) => (
          <div key={k.label} className="glass-card p-5 transition-all duration-200 hover:shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#78716c' }}>{k.label}</span>
              <span className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: '#f7f2e6', border: '1px solid #ede2cd', color: k.color }}>
                {k.icon}
              </span>
            </div>
            <div className="font-serif text-3xl font-bold mb-1" style={{ color: '#1c1917' }}>{k.value}</div>
            <div className="text-xs font-semibold flex items-center gap-1" style={{ color: k.color }}>
              <TrendingUp className="w-3 h-3" /> {k.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Tenant Table ── */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 flex items-center justify-between"
          style={{ borderBottom: '1px solid #eee5d3' }}>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: '#86682b' }}>All Tenants</p>
            <h3 className="font-serif text-xl font-bold" style={{ color: '#1c1917' }}>Restaurant Registry</h3>
          </div>
          <span className="badge-active">Live</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #eee5d3', backgroundColor: '#f7f2e6' }}>
                {['Restaurant', 'City', 'Plan', 'MRR', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase tracking-widest"
                    style={{ color: '#57534e' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TENANTS.map((t, i) => (
                <tr key={t.name}
                  style={{ borderBottom: i < TENANTS.length - 1 ? '1px solid #eee5d3' : 'none' }}
                  className="hover:bg-amber-500/5 transition"
                >
                  <td className="px-5 py-4 font-bold" style={{ color: '#1c1917' }}>{t.name}</td>
                  <td className="px-5 py-4 font-medium" style={{ color: '#57534e' }}>{t.city}</td>
                  <td className="px-5 py-4">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold"
                      style={{
                        background: t.plan === 'Enterprise' ? '#fef3c7' : '#dcfce7',
                        color: t.plan === 'Enterprise' ? '#92400e' : '#166534',
                        border: `1px solid ${t.plan === 'Enterprise' ? '#fde68a' : '#bbf7d0'}`,
                      }}>
                      {t.plan}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs font-bold" style={{ color: '#86682b' }}>{t.mrr}</td>
                  <td className="px-5 py-4">
                    {t.status === 'ACTIVE' ? (
                      <span className="badge-active flex items-center gap-1 w-fit">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="badge-suspended flex items-center gap-1 w-fit">
                        <XCircle className="w-3 h-3" /> Suspended
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <button className="text-xs font-bold px-3 py-1.5 rounded-lg btn-secondary shadow-none">
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
