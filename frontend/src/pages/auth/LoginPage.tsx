import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { Lock, Mail, ArrowRight, Utensils, Eye, EyeOff } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please provide both email and password'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        toast.success(`Welcome back, ${res.data.data.user.fullName}!`);
        login(res.data.data.token, res.data.data.user);
        const role = res.data.data.user.role;
        if (role === 'SUPER_ADMIN') navigate('/superadmin');
        else if (role === 'KITCHEN_STAFF') navigate('/kds');
        else if (role === 'WAITER') navigate('/waiter');
        else navigate('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid login credentials');
    } finally {
      setLoading(false);
    }
  };

  const fillAccount = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
  };

  return (
    <div className="min-h-screen hero-grid flex items-center justify-center px-4" style={{ backgroundColor: '#fdfbf7' }}>
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-16 items-center">

        {/* ── Left: Brand Panel ── */}
        <div className="hidden lg:flex flex-col gap-8 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg, #2d5a2d, #1f421f)' }}>
              <Utensils className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-widest uppercase" style={{ color: '#1c1917' }}>
              RESTREN
            </span>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#86682b' }}>
              A Platform to Remember
            </p>
            <h1 className="font-serif text-5xl leading-tight" style={{ color: '#1c1917' }}>
              Manage, Serve,<br />
              <em className="gradient-text-gold">Excel.</em>
            </h1>
            <p className="text-sm mt-4 leading-relaxed max-w-xs" style={{ color: '#57534e' }}>
              Ethiopia's enterprise-grade multi-tenant restaurant platform —
              QR menus, live KDS, and seamless payment management.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {['Multi-Branch', 'Live KDS', 'Telebirr & CBE', 'English & Somali', 'Ethiopian VAT'].map((f) => (
              <span key={f} className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: '#f7f2e6', color: '#644b21', border: '1px solid #ede2cd' }}>
                {f}
              </span>
            ))}
          </div>

          <blockquote className="pl-4 italic text-sm leading-relaxed"
            style={{ color: '#78716c', borderLeft: '3px solid #c9a84c' }}>
            "Where timeless Ethiopian hospitality meets modern technology."
          </blockquote>
        </div>

        {/* ── Right: Login Card ── */}
        <div className="glass-card p-8 lg:p-10 shadow-xl animate-slide-in-left">

          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center animate-float shadow-md"
              style={{ background: '#fdfbf7', border: '1px solid #c9a84c' }}>
              <Utensils className="w-7 h-7" style={{ color: '#2d5a2d' }} />
            </div>
            <h2 className="font-serif text-3xl font-bold mb-1" style={{ color: '#1c1917' }}>Sign In</h2>
            <div className="divider-gold my-3 mx-auto w-16" />
            <p className="text-sm" style={{ color: '#78716c' }}>Access your restaurant dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#44403c' }}>
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 absolute left-3 text-stone-500 pointer-events-none z-10" />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@restaurant.com" className="input-dark input-with-icon" required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#44403c' }}>
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 absolute left-3 text-stone-500 pointer-events-none z-10" />
                <input
                  type={showPass ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••" className="input-dark input-with-icon input-with-right-icon" required
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 text-stone-500 hover:text-stone-800 transition z-10">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} id="login-submit-btn"
              className="btn-primary w-full mt-2 gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Authenticating...</>
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>



          <div className="mt-4 pt-3 text-center">
            <p className="text-xs" style={{ color: '#78716c' }}>
              No account yet?{' '}
              <Link to="/register" className="font-bold transition hover:underline" style={{ color: '#2d5a2d' }}>
                Register Your Restaurant
              </Link>
            </p>
            <p className="text-xs mt-2">
              <Link to="/waiter-login" className="font-bold transition hover:underline flex items-center justify-center gap-1.5 mt-1" style={{ color: '#86682b' }}>
                🤵 Waiter Staff? Login with PIN Code →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
