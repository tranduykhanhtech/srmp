'use client';

import React, { useState } from 'react';
import { MapPin, Navigation, Trash2, Copy, Check, Pencil } from 'lucide-react';
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
}

export default function SpotCard({ 
  spot, 
  isOwner, 
  onDelete, 
  onEdit,
  searchQuery = '',
  onShowToast,
  onSelectCategory,
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
    <article className="rounded-2xl bg-white border border-neutral-200/90 p-4.5 transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:border-neutral-300 md:hover:-translate-y-1 flex flex-col justify-between gap-3.5 text-black h-full">
      <div className="space-y-3">
        {/* Name, Category Badge, Edit & Delete Buttons */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5 flex-1 min-w-0">
            <h2 className="font-bold text-[17px] text-neutral-900 leading-snug tracking-tight">
              {renderHighlighted(spot.name)}
            </h2>

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

        {/* Note if available */}
        {spot.note && (
          <p className="text-[13.5px] text-neutral-800 bg-neutral-50/90 p-3 rounded-xl border border-neutral-100 leading-relaxed whitespace-pre-line">
            {renderHighlighted(spot.note)}
          </p>
        )}
      </div>

      {/* Footer: Author & Maps Button */}
      <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
        <span className="text-xs text-neutral-500 truncate">
          bởi <b className="text-neutral-800 font-semibold">{spot.author_name}</b>
        </span>

        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 px-4 h-9 rounded-xl bg-black text-white font-semibold text-xs hover:bg-neutral-800 active:scale-95 transition-all shadow-sm shadow-black/10"
        >
          <Navigation className="w-3.5 h-3.5 text-white fill-white" />
          <span>Chỉ đường</span>
        </a>
      </div>
    </article>
  );
}
