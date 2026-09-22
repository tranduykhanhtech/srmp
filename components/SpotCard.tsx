'use client';

import React, { useState } from 'react';
import { MapPin, Navigation, Trash2, Copy, Check, Pencil, Bookmark, Share2, QrCode } from 'lucide-react';
import { Spot } from '@/types/spot';
import CategoryIcon from './CategoryIcon';

interface SpotCardProps {
  spot: Spot;
  isOwner: boolean;
  onDelete?: (spotId: string) => void;
  onEdit?: (spot: Spot) => void;
  searchQuery?: string;
  onShowToast?: (msg: string) => void;
  onSelectCategory?: (category: string) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (spotId: string) => void;
  isHighlighted?: boolean;
  onOpenQr?: (spot: Spot) => void;
  distanceText?: string;
}

export default function SpotCard({ 
  spot, 
  isOwner, 
  onDelete, 
  onEdit,
  searchQuery = '',
  onShowToast,
  onSelectCategory,
  isBookmarked = false,
  onToggleBookmark,
  isHighlighted = false,
  onOpenQr,
  distanceText,
}: SpotCardProps) {
  const [copied, setCopied] = useState(false);
  const mapsUrl = spot.google_maps_url || `https://maps.google.com/?q=${encodeURIComponent(spot.name + ' ' + spot.address)}`;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`${spot.name}, ${spot.address}`);
      setCopied(true);
      if (onShowToast) onShowToast('Đã chép địa chỉ');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/?spot=${spot.id}`
      : `https://animon.io.vn/?spot=${spot.id}`;

    const shareData = {
      title: `animon — ${spot.name}`,
      text: `${spot.name} (${spot.address}) — Xem quán trên animon:`,
      url: shareUrl,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        if (onShowToast) onShowToast('Đã chép link chia sẻ quán!');
      } catch {
        if (onShowToast) onShowToast('Không thể sao chép link');
      }
    }
  };

  // Highlight search term helper
  const renderHighlighted = (text: string) => {
    if (!searchQuery.trim()) return text;
    const parts = text.split(new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 text-black font-semibold rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <article
      id={`spot-${spot.id}`}
      className={`rounded-3xl bg-white border p-4 sm:p-5 transition-all duration-200 flex flex-col justify-between gap-3 text-black h-full ${
        isHighlighted
          ? 'border-black ring-2 ring-black shadow-xl scale-[1.01]'
          : 'border-neutral-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)] hover:border-neutral-300 md:hover:-translate-y-1'
      }`}
    >
      <div className="space-y-3">
        {/* Name, Category Badge, Edit & Delete Buttons */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5 flex-1 min-w-0">
            <h2 className="font-bold text-[17px] text-neutral-900 leading-snug tracking-tight">
              {renderHighlighted(spot.name)}
            </h2>

            <div className="flex items-center gap-1.5 flex-wrap">
              {spot.category && (
                <button
                  type="button"
                  onClick={() => onSelectCategory && onSelectCategory(spot.category!)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200/80 transition-colors cursor-pointer"
                >
                  <CategoryIcon category={spot.category} className="w-3.5 h-3.5 text-neutral-700" />
                  <span>{spot.category}</span>
                </button>
              )}

              {distanceText && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-neutral-900 bg-neutral-100 px-2.5 py-1 rounded-full border border-neutral-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Cách {distanceText}</span>
                </span>
              )}
            </div>
          </div>

          {isOwner && (
            <div className="flex items-center gap-0.5 -mr-1 shrink-0">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(spot)}
                  className="p-1.5 text-neutral-400 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                  title="Chỉnh sửa quán"
                  aria-label="Chỉnh sửa quán"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(spot.id)}
                  className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                  title="Xóa địa điểm"
                  aria-label="Xóa địa điểm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Address with Copy Button */}
        <div className="flex items-start justify-between gap-2.5 text-[13.5px] text-neutral-700 bg-neutral-50/80 p-3 rounded-xl border border-neutral-150">
          <div className="flex items-start gap-2 min-w-0">
            <MapPin className="w-4 h-4 text-neutral-800 shrink-0 mt-0.5" />
            <span className="leading-relaxed break-words">
              {renderHighlighted(spot.address)}
            </span>
          </div>

          <button
            onClick={handleCopy}
            className="p-1.5 text-neutral-400 hover:text-black hover:bg-neutral-200/70 rounded-lg transition-colors shrink-0 cursor-pointer"
            title="Sao chép địa chỉ"
            aria-label="Sao chép địa chỉ"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Note if available (Pro-tip Style) */}
        {spot.note && (
          <div className="relative pl-3 py-2 pr-2.5 rounded-r-xl bg-neutral-50/90 border-l-2 border-black text-[13px] text-neutral-800 leading-relaxed">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block mb-0.5 select-none">
              Mẹo chuẩn gu
            </span>
            <span className="italic whitespace-pre-line leading-relaxed">
              "{renderHighlighted(spot.note)}"
            </span>
          </div>
        )}
      </div>

      {/* Footer: Author, Bookmark, Share, QR & Maps Button */}
      <div className="pt-2.5 border-t border-neutral-100 flex items-center justify-between text-xs gap-1.5">
        <span className="text-[11px] sm:text-xs text-neutral-500 truncate max-w-[95px] sm:max-w-none">
          bởi <b className="text-neutral-800 font-semibold">{spot.author_name}</b>
        </span>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Bookmark Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleBookmark && onToggleBookmark(spot.id);
            }}
            className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-lg sm:rounded-xl flex items-center justify-center border transition-all active:scale-90 cursor-pointer ${
              isBookmarked
                ? 'bg-black text-white border-black shadow-sm'
                : 'bg-white text-neutral-500 border-neutral-200 hover:text-black hover:border-neutral-300 hover:bg-neutral-50'
            }`}
            title={isBookmarked ? 'Bỏ lưu quán' : 'Lưu quán để dành'}
            aria-label={isBookmarked ? 'Bỏ lưu quán' : 'Lưu quán để dành'}
          >
            <Bookmark className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isBookmarked ? 'fill-white' : ''}`} />
          </button>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-lg sm:rounded-xl flex items-center justify-center border border-neutral-200 bg-white text-neutral-500 hover:text-black hover:border-neutral-300 hover:bg-neutral-50 active:scale-90 transition-all cursor-pointer"
            title="Chia sẻ quán"
            aria-label="Chia sẻ quán"
          >
            <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* QR Code Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenQr && onOpenQr(spot);
            }}
            className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-lg sm:rounded-xl flex items-center justify-center border border-neutral-200 bg-white text-neutral-500 hover:text-black hover:border-neutral-300 hover:bg-neutral-50 active:scale-90 transition-all cursor-pointer"
            title="Mã QR quán"
            aria-label="Mã QR quán"
          >
            <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Directions Button */}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 h-8 sm:h-8.5 rounded-lg sm:rounded-xl bg-black text-white font-semibold text-[11px] sm:text-xs hover:bg-neutral-800 active:scale-95 transition-all shadow-xs"
          >
            <Navigation className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white fill-white" />
            <span>Chỉ đường</span>
          </a>
        </div>
      </div>
    </article>
  );
}
