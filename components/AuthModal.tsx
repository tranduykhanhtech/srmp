'use client';

import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    if (!configured) {
      setError('Chưa cấu hình Supabase URL và Publishable Key.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';

      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback`,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (signInError) throw signInError;

      if (data?.url) {
        let isIframe = false;
        try {
          isIframe = typeof window !== 'undefined' && window.self !== window.top;
        } catch {
          isIframe = true;
        }

        if (isIframe) {
          window.open(data.url, '_blank');
        } else {
          window.location.href = data.url;
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi kết nối Google OAuth.';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 p-0 sm:p-4">
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl bg-white border border-gray-200 text-black shadow-2xl p-5 sm:p-6 space-y-4 pb-safe animate-in slide-in-from-bottom-6 duration-200">
        {/* Pull Handle */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto sm:hidden mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
          <div>
            <h2 className="text-lg font-bold text-black">Đăng nhập tài khoản</h2>
            <p className="text-sm text-gray-500 mt-0.5">Để lưu và chia sẻ địa điểm</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-1 rounded-full text-gray-400 hover:text-black active:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5 text-black" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Google OAuth Button */}
        <div className="space-y-2.5 pt-1">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full h-12 flex items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white text-black font-bold shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer text-[15px]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>{loading ? 'Đang kết nối...' : 'Tiếp tục với Google'}</span>
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center pt-1 leading-relaxed">
          Đăng nhập an toàn qua tài khoản Google. Không cần mật khẩu.
        </p>
      </div>
    </div>
  );
}
