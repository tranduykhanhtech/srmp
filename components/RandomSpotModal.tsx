'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Dices, MapPin, Navigation, Sparkles, RefreshCw } from 'lucide-react';
import { Spot } from '@/types/spot';
import CategoryIcon from './CategoryIcon';

interface RandomSpotModalProps {
  isOpen: boolean;
  onClose: () => void;
  spots: Spot[];
  onSelectSpot: (spot: Spot) => void;
}

export default function RandomSpotModal({
  isOpen,
  onClose,
  spots,
  onSelectSpot,
}: RandomSpotModalProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [displaySpot, setDisplaySpot] = useState<Spot | null>(null);
  const [pickedSpot, setPickedSpot] = useState<Spot | null>(null);

  const rollSpot = useCallback(() => {
    if (!spots || spots.length === 0) {
      setPickedSpot(null);
      setDisplaySpot(null);
      return;
    }

    if (spots.length === 1) {
      setPickedSpot(spots[0]);
      setDisplaySpot(spots[0]);
      return;
    }

    setIsSpinning(true);

    let counter = 0;
    const maxSteps = 12;
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * spots.length);
      setDisplaySpot(spots[randomIdx]);
      counter++;

      if (counter >= maxSteps) {
        clearInterval(interval);
        // Chọn ra kết quả cuối cùng khác quán hiện tại (nếu danh sách > 1)
        let finalSpot = spots[Math.floor(Math.random() * spots.length)];
        if (displaySpot && spots.length > 1 && finalSpot.id === displaySpot.id) {
          const others = spots.filter((s) => s.id !== displaySpot.id);
          finalSpot = others[Math.floor(Math.random() * others.length)];
        }
        setDisplaySpot(finalSpot);
        setPickedSpot(finalSpot);
        setIsSpinning(false);
      }
    }, 65);
  }, [spots, displaySpot]);

  useEffect(() => {
    if (isOpen) {
      rollSpot();
    } else {
      setIsSpinning(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const mapsUrl = pickedSpot?.google_maps_url || (pickedSpot ? `https://maps.google.com/?q=${encodeURIComponent(pickedSpot.name + ' ' + pickedSpot.address)}` : '#');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white border border-neutral-200 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shadow-xs">
              <Dices className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-1.5">
                Hôm nay ăn gì?
              </h3>
              <p className="text-xs text-neutral-500">animon chọn ngẫu nhiên cho bạn</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-black rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Box */}
        {spots.length === 0 ? (
          <div className="text-center py-10 space-y-3">
            <p className="text-sm text-neutral-600">Chưa có quán ăn nào trong bộ lọc này để quay chọn.</p>
            <button
              onClick={onClose}
              className="h-10 px-5 rounded-xl text-xs font-semibold bg-black text-white hover:bg-neutral-800 transition-all cursor-pointer"
            >
              Đóng lại
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Roulette Card */}
            <div className={`relative p-5 rounded-2xl border transition-all duration-300 ${
              isSpinning 
                ? 'bg-neutral-50 border-dashed border-neutral-400 scale-[0.99]' 
                : 'bg-white border-neutral-200 shadow-sm'
            }`}>
              {isSpinning ? (
                <div className="py-6 text-center space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-200/70 text-xs font-medium text-neutral-700 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Đang tìm quán ngon chuẩn gu...
                  </div>
                  <h4 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight transition-all duration-75">
                    {displaySpot?.name || '...'}
                  </h4>
                  <p className="text-xs text-neutral-400 truncate max-w-[280px] mx-auto">
                    {displaySpot?.address || '...'}
                  </p>
                </div>
              ) : pickedSpot ? (
                <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                      <Sparkles className="w-3.5 h-3.5" />
                      Gợi ý cho bạn hôm nay
                    </span>
                    {pickedSpot.category && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 bg-neutral-100 px-2.5 py-0.5 rounded-full">
                        <CategoryIcon category={pickedSpot.category} className="w-3.5 h-3.5" />
                        {pickedSpot.category}
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
                      {pickedSpot.name}
                    </h4>
                    <div className="flex items-start gap-1.5 text-xs text-neutral-600 mt-1.5 leading-relaxed">
                      <MapPin className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                      <span>{pickedSpot.address}</span>
                    </div>
                  </div>

                  {pickedSpot.note && (
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-xs text-neutral-700 leading-relaxed italic">
                      "{pickedSpot.note}"
                    </div>
                  )}

                  <div className="text-[11px] text-neutral-400 pt-1">
                    Gợi ý bởi <b className="text-neutral-700 font-semibold">{pickedSpot.author_name}</b>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-1">
              {!isSpinning && pickedSpot && (
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectSpot(pickedSpot);
                      onClose();
                    }}
                    className="h-11 rounded-2xl bg-black text-white text-xs sm:text-sm font-semibold hover:bg-neutral-800 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    Xem vị trí này
                  </button>

                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-11 rounded-2xl border border-neutral-200 hover:border-black bg-white text-neutral-800 hover:text-black text-xs sm:text-sm font-semibold active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Chỉ đường
                  </a>
                </div>
              )}

              <button
                type="button"
                onClick={rollSpot}
                disabled={isSpinning || spots.length <= 1}
                className="w-full h-11 rounded-2xl border border-neutral-200 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs sm:text-sm font-semibold active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Dices className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
                <span>{isSpinning ? 'Đang quay...' : 'Quay lại quán khác 🎲'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
