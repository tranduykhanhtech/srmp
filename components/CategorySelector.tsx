'use client';

import React, { useState } from 'react';
import { Search, X, Plus, Tag, Sparkles } from 'lucide-react';
import CategoryIcon from './CategoryIcon';

interface CategorySelectorProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  allCategories: string[];
  topCategories?: string[];
}

export default function CategorySelector({
  selectedCategory,
  onSelectCategory,
  allCategories,
  topCategories = [],
}: CategorySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Fallback top 4 categories if not provided
  const popularCategories =
    topCategories.length > 0
      ? topCategories.slice(0, 4)
      : allCategories.slice(0, 4);

  // Filtered categories when searching
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const filteredCategories = trimmedQuery
    ? allCategories.filter((cat) => cat.toLowerCase().includes(trimmedQuery))
    : [];

  const exactMatchExists = allCategories.some(
    (cat) => cat.toLowerCase() === trimmedQuery
  );

  const handleSelect = (cat: string) => {
    onSelectCategory(cat);
    setSearchQuery('');
  };

  const handleCreateNew = () => {
    if (!searchQuery.trim()) return;
    const newCat = searchQuery.trim();
    onSelectCategory(newCat);
    setSearchQuery('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[13px] font-bold text-neutral-900 flex items-center gap-1.5">
          <Tag className="w-4 h-4 text-neutral-700" />
          <span>Danh mục</span>
        </label>
        {selectedCategory && (
          <span className="text-[11px] text-neutral-500 font-medium">
            Đang chọn:{' '}
            <strong className="text-black">{selectedCategory}</strong>
          </span>
        )}
      </div>

      {/* Category Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (filteredCategories.length > 0) {
                handleSelect(filteredCategories[0]);
              } else if (searchQuery.trim()) {
                handleCreateNew();
              }
            }
          }}
          placeholder="Tìm hoặc gõ danh mục mới..."
          maxLength={30}
          className="w-full h-10 pl-9.5 pr-8 rounded-xl bg-neutral-50/80 border border-neutral-200/90 text-[13px] text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:bg-white transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-black rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
            aria-label="Xóa tìm kiếm danh mục"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* When Search Query is Active */}
      {trimmedQuery ? (
        <div className="p-2 bg-neutral-50/90 rounded-xl border border-neutral-200/80 space-y-1.5 animate-in fade-in duration-150">
          {filteredCategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {filteredCategories.slice(0, 6).map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleSelect(cat)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-black text-white shadow-xs'
                        : 'bg-white text-neutral-800 border border-neutral-200 hover:border-black'
                    }`}
                  >
                    <CategoryIcon category={cat} className="w-3.5 h-3.5" />
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          )}

          {!exactMatchExists && searchQuery.trim() && (
            <button
              type="button"
              onClick={handleCreateNew}
              className="w-full py-2 px-3 rounded-lg bg-neutral-900 hover:bg-black text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo danh mục mới: &quot;{searchQuery.trim()}&quot;</span>
            </button>
          )}
        </div>
      ) : (
        /* When NOT searching: Display Top ~4 Popular Categories */
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-neutral-500 font-medium px-0.5">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Phổ biến nhất:</span>
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {popularCategories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleSelect(cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-black text-white shadow-xs'
                      : 'bg-white text-neutral-800 border border-neutral-200 hover:border-neutral-400'
                  }`}
                >
                  <CategoryIcon category={cat} className="w-3.5 h-3.5" />
                  <span>{cat}</span>
                </button>
              );
            })}

            {/* If selected category is outside the top 4, display it as an active pill */}
            {selectedCategory && !popularCategories.includes(selectedCategory) && (
              <button
                type="button"
                onClick={() => handleSelect(selectedCategory)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-black text-white shadow-xs transition-all cursor-pointer"
              >
                <CategoryIcon category={selectedCategory} className="w-3.5 h-3.5" />
                <span>{selectedCategory}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
