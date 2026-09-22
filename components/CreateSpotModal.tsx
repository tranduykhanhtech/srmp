'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, MapPin, Tag, Navigation, Check, Compass } from 'lucide-react';
import { Spot } from '@/types/spot';
import { DEFAULT_PRESET_CATEGORIES } from '@/lib/constants';
import { extractCoordinatesFromUrl } from '@/lib/geo';
import CategoryIcon from './CategoryIcon';
import CategorySelector from './CategorySelector';
import MapPickerModal from './MapPickerModal';

interface CreateSpotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (spotData: Omit<Spot, 'id' | 'created_at'>) => void;
  user: { name: string; email: string; avatar: string } | null;
  existingCategories?: string[];
  topCategories?: string[];
}

export default function CreateSpotModal({
  isOpen,
  onClose,
  onSubmit,
  user,
  existingCategories = [],
  topCategories = [],
}: CreateSpotModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('Tụ họp');
  const [note, setNote] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const allAvailableCategories = Array.from(
    new Set([...DEFAULT_PRESET_CATEGORIES, ...existingCategories])
  );

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isSubmitting]);

  if (!isOpen) return null;

  const handleGetLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleLocationPicked = (loc: {
    address: string;
    latitude: number;
    longitude: number;
  }) => {
    setCoords({ latitude: loc.latitude, longitude: loc.longitude });
    if (!address.trim() || address.length < 5) {
      setAddress(loc.address);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const finalCategory = category.trim() || 'Tụ họp';

      let finalCoords = coords;
      if (!finalCoords) {
        const extracted = extractCoordinatesFromUrl(address);
        if (extracted) finalCoords = extracted;
      }

      await onSubmit({
        name: name.trim(),
        address: address.trim(),
        category: finalCategory,
        note: note.trim() || undefined,
        google_maps_url: finalCoords
          ? `https://maps.google.com/?q=${finalCoords.latitude},${finalCoords.longitude}`
          : `https://maps.google.com/?q=${encodeURIComponent(name.trim() + ' ' + address.trim())}`,
        latitude: finalCoords?.latitude,
        longitude: finalCoords?.longitude,
        author_name: user?.name || 'Ẩn danh',
      });

      setName('');
      setAddress('');
      setCategory('Tụ họp');
      setNote('');
      setCoords(null);
      onClose();
    } catch (err) {
      console.error('Error submitting spot:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-150 p-0 sm:p-4">
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white border border-neutral-200 text-black shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] flex flex-col pb-safe animate-in slide-in-from-bottom-6 duration-200">
        {/* Pull handle */}
        <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto sm:hidden mb-1 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Thêm địa điểm ăn uống</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Lưu lại tọa độ chuẩn gu vào animon</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 -mr-1 rounded-full text-neutral-400 hover:text-black active:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-40"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1">
          {/* Tên quán */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[13px] font-bold text-neutral-900">
                Tên quán / Địa điểm <span className="text-red-500">*</span>
              </label>
              {name.length >= 70 && (
                <span className="text-[11px] text-neutral-400 font-mono">
                  {name.length}/100
                </span>
              )}
            </div>
            <input
              ref={inputRef}
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Cà phê Nắng, Quán Bánh Mì Chảo..."
              className="w-full h-12 px-4 rounded-xl bg-neutral-50/70 border border-neutral-200 text-black placeholder-neutral-400 focus:outline-none focus:border-black focus:bg-white transition-all text-[15px]"
            />
          </div>

          {/* Danh mục (Category) */}
          <CategorySelector
            selectedCategory={category}
            onSelectCategory={setCategory}
            allCategories={allAvailableCategories}
            topCategories={topCategories}
          />

          {/* Địa chỉ */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[13px] font-bold text-neutral-900">
                Địa chỉ <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsMapPickerOpen(true)}
                className="text-xs font-semibold text-neutral-800 hover:text-black hover:bg-neutral-100 px-2.5 py-1 rounded-full border border-neutral-200/90 transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              >
                <Compass className="w-3.5 h-3.5 text-black" />
                <span>Chọn trên bản đồ</span>
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={200}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Số nhà, tên đường hoặc chọn trên bản đồ..."
                className="w-full h-12 px-4 pl-10 rounded-xl bg-neutral-50/70 border border-neutral-200 text-black placeholder-neutral-400 focus:outline-none focus:border-black focus:bg-white transition-all text-[15px]"
              />
              <MapPin className="w-4.5 h-4.5 text-neutral-700 absolute left-3.5 top-3.5" />
            </div>

            {/* GPS Coordinates Helper */}
            <div className="flex items-center justify-between mt-1.5 px-0.5">
              {coords ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  <span>Đã ghim ({coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)})</span>
                  <button
                    type="button"
                    onClick={() => setIsMapPickerOpen(true)}
                    className="text-neutral-500 hover:text-black underline ml-1 text-xs cursor-pointer"
                  >
                    Xem lại
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoords(null)}
                    className="text-neutral-400 hover:text-black ml-1 text-xs cursor-pointer"
                    title="Bỏ ghim tọa độ"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isLocating}
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-black transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>{isLocating ? 'Đang định vị...' : 'Gắn tọa độ vị trí hiện tại'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[13px] font-bold text-neutral-900">
                Ghi chú thêm
              </label>
              <span className="text-[11px] text-neutral-400 font-mono">
                {note.length}/350
              </span>
            </div>
            <textarea
              rows={2}
              maxLength={350}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Bánh mì giòn rụm, mở từ 16h, có chỗ để xe..."
              className="w-full p-3.5 rounded-xl bg-neutral-50/70 border border-neutral-200 text-black placeholder-neutral-400 focus:outline-none focus:border-black focus:bg-white transition-all text-sm leading-relaxed"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2 shrink-0">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 flex items-center justify-center gap-2 rounded-xl font-bold bg-black text-white hover:bg-neutral-800 active:scale-[0.98] transition-all cursor-pointer text-sm shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang lưu địa điểm...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
                  <span>Lưu địa điểm</span>
                </>
              )}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="w-full sm:w-auto h-11 px-5 flex items-center justify-center rounded-xl text-sm font-medium text-neutral-500 hover:text-black active:bg-neutral-100 cursor-pointer disabled:opacity-40"
            >
              Hủy
            </button>
          </div>
        </form>
      </div>

      {/* Map Picker Modal */}
      <MapPickerModal
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        onSelectLocation={handleLocationPicked}
        initialCoords={coords}
        initialAddress={address}
      />
    </div>
  );
}
