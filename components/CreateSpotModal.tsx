'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, MapPin, Tag } from 'lucide-react';
import { Spot } from '@/types/spot';
import { DEFAULT_PRESET_CATEGORIES } from '@/lib/constants';
import CategoryIcon from './CategoryIcon';

interface CreateSpotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (spotData: Omit<Spot, 'id' | 'created_at'>) => void;
  user: { name: string; email: string; avatar: string } | null;
  existingCategories?: string[];
}

export default function CreateSpotModal({
  isOpen,
  onClose,
  onSubmit,
  user,
  existingCategories = [],
}: CreateSpotModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('Tụ họp');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const finalCategory = isCustomCategory
        ? (customCategoryInput.trim() || 'Khác')
        : category;

      await onSubmit({
        name: name.trim(),
        address: address.trim(),
        category: finalCategory,
        note: note.trim() || undefined,
        google_maps_url: `https://maps.google.com/?q=${encodeURIComponent(name.trim() + ' ' + address.trim())}`,
        author_name: user?.name || 'Ẩn danh',
      });

      setName('');
      setAddress('');
      setCategory('Tụ họp');
      setIsCustomCategory(false);
      setCustomCategoryInput('');
      setNote('');
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
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[13px] font-bold text-neutral-900 flex items-center gap-1.5">
                <Tag className="w-4 h-4" />
                <span>Danh mục</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsCustomCategory(!isCustomCategory);
                  if (!isCustomCategory) setCustomCategoryInput('');
                }}
                className="text-xs font-semibold text-black underline cursor-pointer"
              >
                {isCustomCategory ? '← Chọn có sẵn' : '+ Tự tạo danh mục'}
              </button>
            </div>

            {isCustomCategory ? (
              <div className="space-y-1.5">
                <input
                  type="text"
                  required={isCustomCategory}
                  maxLength={30}
                  value={customCategoryInput}
                  onChange={(e) => setCustomCategoryInput(e.target.value)}
                  placeholder="Nhập tên danh mục mới (tối đa 30 ký tự)"
                  className="w-full h-11 px-4 rounded-xl bg-neutral-50 border border-neutral-200 text-black text-sm focus:outline-none focus:border-black focus:bg-white transition-all"
                />
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {allAvailableCategories.map((cat) => {
                  const isSelected = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-black text-white shadow-sm'
                          : 'bg-white text-neutral-700 border border-neutral-200 hover:border-neutral-400'
                      }`}
                    >
                      <CategoryIcon category={cat} className="w-3.5 h-3.5" />
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Địa chỉ */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[13px] font-bold text-neutral-900">
                Địa chỉ <span className="text-red-500">*</span>
              </label>
              {address.length >= 150 && (
                <span className="text-[11px] text-neutral-400 font-mono">
                  {address.length}/200
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={200}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Số nhà, tên đường, quận/huyện..."
                className="w-full h-12 px-4 pl-10 rounded-xl bg-neutral-50/70 border border-neutral-200 text-black placeholder-neutral-400 focus:outline-none focus:border-black focus:bg-white transition-all text-[15px]"
              />
              <MapPin className="w-4.5 h-4.5 text-neutral-700 absolute left-3.5 top-3.5" />
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
    </div>
  );
}
