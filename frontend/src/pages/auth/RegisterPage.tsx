import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { Building2, User, Mail, Lock, Phone, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

const FEATURES = [
  'QR-based digital menu (English & Somali)',
  'Live Kitchen Display System (KDS)',
  'Telebirr & CBE payment proof verification',
  'Multi-branch & staff management',
  'Real-time Socket.IO order tracking',
  'Ethiopian VAT (15%) auto-calculation',
];

export const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    restaurantName: '', restaurantSlug: '', fullName: '',
    email: '', phone: '', password: ''
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'restaurantName' && !prev.restaurantSlug) {
        updated.restaurantSlug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/register', formData);
      if (res.data.success) {
        toast.success('Restaurant onboarding complete! Welcome aboard 🎉');
        login(res.data.data.token, res.data.data.user);
        navigate('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen hero-grid flex items-center justify-center px-4 py-12" style={{ backgroundColor: '#fdfbf7' }}>
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 items-center">

        {/* Left — Feature List */}
        <div className="hidden lg:block animate-fade-in-up">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg, #2d5a2d, #1f421f)', color: '#ffffff' }}>
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold tracking-widest uppercase" style={{ color: '#1c1917' }}>RESTREN SYSTEM</span>
          </div>

          <h2 className="font-serif text-4xl font-bold leading-tight mb-4" style={{ color: '#1c1917' }}>
            Launch Your Restaurant<br />
            <span className="gradient-text-gold">on Ethiopia's Cloud</span>
          </h2>

          <p className="text-sm leading-relaxed mb-8 max-w-sm" style={{ color: '#57534e' }}>
            Join hundreds of Ethiopian restaurants managing their business smarter, faster, and more profitably.
          </p>

          <div className="space-y-3">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-3 text-sm font-medium" style={{ color: '#292524' }}>
                <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#2d5a2d' }} />
                {f}
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 rounded-xl glass-card-gold">
            <span className="text-xs font-bold uppercase tracking-widest block mb-1" style={{ color: '#86682b' }}>Free Trial</span>
            <p className="text-sm font-semibold" style={{ color: '#1c1917' }}>14 days on us. No credit card required.</p>
          </div>
        </div>

        {/* Right — Registration Form */}
        <div className="glass-card p-8 shadow-xl animate-slide-in-left">
          <div className="text-center mb-7">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3"
              style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e' }}>
              <Sparkles className="w-3.5 h-3.5" /> 14-Day Free Trial
            </span>
            <h1 className="font-serif text-3xl font-bold" style={{ color: '#1c1917' }}>Register Your Restaurant</h1>
            <p className="text-sm mt-1" style={{ color: '#78716c' }}>Start managing QR orders &amp; live kitchen dispatch</p>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            {/* Restaurant Name */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#44403c' }}>
                Restaurant Name
              </label>
              <div className="relative flex items-center">
                <Building2 className="w-4 h-4 absolute left-3 text-stone-500 pointer-events-none z-10" />
                <input
                  type="text" name="restaurantName" value={formData.restaurantName}
                  onChange={handleChange} placeholder="Royal Restaurant"
                  className="input-dark input-with-icon" required
                />
              </div>
            </div>

            {/* Slug */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#44403c' }}>
                URL Slug
              </label>
              <input
                type="text" name="restaurantSlug" value={formData.restaurantSlug}
                onChange={handleChange} placeholder="royal-restaurant"
                className="input-dark font-mono font-bold" style={{ color: '#86682b' }} required
              />
              <p className="text-[10px] mt-1 font-mono" style={{ color: '#78716c' }}>/r/{formData.restaurantSlug || 'your-slug'}</p>
            </div>

            {/* Owner Name */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#44403c' }}>
                Owner Full Name
              </label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 absolute left-3 text-stone-500 pointer-events-none z-10" />
                <input
                  type="text" name="fullName" value={formData.fullName}
                  onChange={handleChange} placeholder="Abebe Bikila"
                  className="input-dark input-with-icon" required
                />
              </div>
            </div>

            {/* Phone */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#44403c' }}>
                Phone (Ethiopian)
              </label>
              <div className="relative flex items-center">
                <Phone className="w-4 h-4 absolute left-3 text-stone-500 pointer-events-none z-10" />
                <input
                  type="text" name="phone" value={formData.phone}
                  onChange={handleChange} placeholder="+251 911 234 567"
                  className="input-dark input-with-icon" required
                />
              </div>
            </div>

            {/* Email */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#44403c' }}>
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 absolute left-3 text-stone-500 pointer-events-none z-10" />
                <input
                  type="email" name="email" value={formData.email}
                  onChange={handleChange} placeholder="owner@royal.et"
                  className="input-dark input-with-icon" required
                />
              </div>
            </div>

            {/* Password */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#44403c' }}>
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 absolute left-3 text-stone-500 pointer-events-none z-10" />
                <input
                  type="password" name="password" value={formData.password}
                  onChange={handleChange} placeholder="••••••••"
                  className="input-dark input-with-icon" required minLength={8}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit" disabled={loading}
              id="register-submit-btn"
              className="col-span-2 btn-primary flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Creating your restaurant...
                </>
              ) : (
                <>Launch My Restaurant <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-xs mt-5" style={{ color: '#78716c' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-bold hover:underline" style={{ color: '#2d5a2d' }}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};
