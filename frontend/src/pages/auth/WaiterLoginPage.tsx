import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Utensils, ArrowRight, KeyRound, Lock } from 'lucide-react';

export const WaiterLoginPage: React.FC = () => {
  const [restaurantSlug, setRestaurantSlug] = useState('safari-restaurant');
  const [pin, setPin] = useState<string[]>(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handlePinInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // numbers only
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = pin.join('');
    if (code.length < 4) {
      toast.error('Please enter the complete 4-digit PIN');
      return;
    }
    if (!restaurantSlug) {
      toast.error('Please enter your restaurant code');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post('/api/v1/auth/waiter-login', {
        waiterCode: code,
        restaurantSlug
      });

      if (res.data.success) {
        toast.success(`Welcome, ${res.data.data.user.fullName}! 🤵`);
        login(res.data.data.token, res.data.data.user);
        navigate('/waiter');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid PIN. Check with your manager.');
      setPin(['', '', '', '']);
      inputRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#fdfbf7' }}
    >
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #2d5a2d, #1f421f)' }}>
            <Utensils className="w-9 h-9 text-white" />
          </div>
          <h1 className="font-serif text-4xl font-black mb-2" style={{ color: '#1c1917' }}>
            Staff PIN Login
          </h1>
          <p className="text-sm font-medium" style={{ color: '#78716c' }}>
            Enter your 4-digit waiter code to access your station
          </p>
        </div>

        <div className="glass-card p-8 shadow-xl space-y-7">

          {/* Restaurant Slug Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#44403c' }}>
              Restaurant Code / Slug
            </label>
            <div className="relative flex items-center">
              <Utensils className="w-4 h-4 absolute left-3 text-stone-400 pointer-events-none z-10" />
              <input
                type="text"
                value={restaurantSlug}
                onChange={(e) => setRestaurantSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                placeholder="safari-restaurant"
                className="input-dark input-with-icon w-full font-mono text-sm"
              />
            </div>
          </div>

          {/* 4-Digit PIN Grid */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-4 text-center" style={{ color: '#44403c' }}>
              Your 4-Digit PIN Code
            </label>
            <div className="flex justify-center gap-3">
              {pin.map((digit, idx) => (
                <input
                  key={idx}
                  ref={inputRefs[idx]}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinInput(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="w-16 h-16 text-center text-2xl font-black rounded-xl shadow-sm focus:ring-2 outline-none transition"
                  style={{
                    background: digit ? '#1c1917' : '#fdfbf7',
                    color: digit ? '#c9a84c' : '#1c1917',
                    border: digit ? '2px solid #2d5a2d' : '2px solid #d6cbb5',
                    fontSize: '1.75rem',
                    letterSpacing: '0.1em'
                  }}
                  autoFocus={idx === 0}
                />
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading || pin.join('').length < 4}
            className="btn-primary w-full py-4 text-sm font-extrabold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Authenticating...</>
            ) : (
              <><KeyRound className="w-4 h-4" /> Login to Waiter Station <ArrowRight className="w-4 h-4" /></>
            )}
          </button>

          {/* Back to normal login link */}
          <div className="text-center pt-2 border-t border-stone-200">
            <a href="/login" className="text-xs font-bold hover:underline" style={{ color: '#86682b' }}>
              Manager/Owner Login →
            </a>
          </div>
        </div>

        {/* Hint for Waiter */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-stone-400">
            Your PIN was assigned by your restaurant manager.
          </p>
        </div>
      </div>
    </div>
  );
};
