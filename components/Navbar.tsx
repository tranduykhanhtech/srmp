'use client';

import React from 'react';
import { Plus, LogOut } from 'lucide-react';

interface NavbarProps {
  user: { name: string; email: string; avatar: string } | null;
  onOpenAuth: () => void;
  onOpenCreateSpot: () => void;
  onSignOut: () => void;
}

export default function Navbar({
  user,
  onOpenAuth,
  onOpenCreateSpot,
  onSignOut,
}: NavbarProps) {
  const [imgError, setImgError] = React.useState(false);

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-gray-200/80 pt-safe">
      <div className="max-w-md md:max-w-5xl lg:max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div 
          onClick={scrollToTop}
          className="flex items-center gap-2.5 select-none cursor-pointer active:opacity-70 transition-opacity"
        >
          <span className="w-3 h-3 rounded-full bg-black" />
          <div className="flex items-baseline gap-2.5">
            <h1 className="font-extrabold text-[19px] md:text-xl text-black tracking-tight lowercase">
              animon
            </h1>
            <span className="hidden md:inline text-xs text-neutral-400 font-medium">
              Sổ tay quán ăn cho giới trẻ
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Quick Add Button */}
          <button
            onClick={() => {
              if (!user) {
                onOpenAuth();
              } else {
                onOpenCreateSpot();
              }
            }}
            className="flex items-center gap-2 h-9.5 md:h-10 px-3.5 md:px-5 rounded-full text-xs md:text-sm font-bold bg-black text-white hover:bg-neutral-800 active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Thêm quán</span>
          </button>

          {/* User Auth */}
          {user ? (
            <div className="flex items-center gap-2.5 pl-2.5 border-l border-gray-200">
              <span className="hidden md:inline text-sm font-semibold text-neutral-800 truncate max-w-[150px]">
                {user.name}
              </span>
              {!imgError && user.avatar ? (
                <img
                  key={user.avatar}
                  src={user.avatar}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-9 h-9 rounded-full object-cover border border-gray-300 shadow-sm"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center border border-gray-300 select-none uppercase">
                  {(user.name || user.email || 'U').charAt(0)}
                </div>
              )}
              <button
                onClick={onSignOut}
                className="p-2 rounded-lg text-gray-500 hover:text-black active:scale-95 transition-all cursor-pointer"
                title="Đăng xuất"
                aria-label="Đăng xuất"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 h-9 md:h-10 px-3.5 md:px-5 rounded-full border border-gray-300 bg-white text-black hover:bg-gray-50 active:scale-95 text-xs md:text-sm font-semibold transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
              <span>Đăng nhập</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
