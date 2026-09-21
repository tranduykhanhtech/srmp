'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import SpotCard from '@/components/SpotCard';
import CreateSpotModal from '@/components/CreateSpotModal';
import EditSpotModal from '@/components/EditSpotModal';
import DraggableFab from '@/components/DraggableFab';
import AuthModal from '@/components/AuthModal';
import CategoryIcon from '@/components/CategoryIcon';
import { Spot } from '@/types/spot';
import { DEFAULT_PRESET_CATEGORIES } from '@/lib/constants';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Search, X, Plus, MapPin, CheckCircle2 } from 'lucide-react';

export default function Home() {
  // Auth state
  const [user, setUser] = useState<{ name: string; email: string; avatar: string; id?: string } | null>(null);
  const [supabaseReady] = useState(() => isSupabaseConfigured());

  // Spots data with Instant Local Cache (Stale-While-Revalidate)
  const [spots, setSpots] = useState<Spot[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('animon_spots_cache') || localStorage.getItem('spotshare_spots_cache');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('animon_spots_cache') || localStorage.getItem('spotshare_spots_cache');
        if (cached && JSON.parse(cached).length > 0) return false;
      } catch {}
    }
    return true;
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'my-posts'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [spotToEdit, setSpotToEdit] = useState<Spot | null>(null);
  const [spotToDelete, setSpotToDelete] = useState<Spot | null>(null);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Sync Supabase Auth & Spots
  useEffect(() => {
    if (supabaseReady) {
      const supabase = createClient();
      let isMounted = true;

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!isMounted) return;
        if (session?.user) {
          setUser({
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Foodie',
            email: session.user.email || '',
            avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || '',
          });
        }
      }).catch(() => {});

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!isMounted) return;
        if (session?.user) {
          setUser({
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Foodie',
            email: session.user.email || '',
            avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || '',
          });
        } else {
          setUser(null);
        }
      });

      // Strict timeout guarantee so skeleton NEVER hangs
      const timeoutTimer = setTimeout(() => {
        if (isMounted) setLoading(false);
      }, 2500);

      // Fetch spots from Supabase with guaranteed timeout fallback
      const fetchSpots = async () => {
        try {
          const { data, error } = await supabase
            .from('spots')
            .select('*')
            .order('created_at', { ascending: false });

          clearTimeout(timeoutTimer);
          if (!isMounted) return;

          if (error) {
            console.warn('Supabase fetch spots note:', error.message);
          } else if (data) {
            setSpots(data);
            try {
              localStorage.setItem('animon_spots_cache', JSON.stringify(data));
            } catch {}
          }
        } catch (err) {
          console.warn('Supabase network error:', err);
        } finally {
          clearTimeout(timeoutTimer);
          if (isMounted) setLoading(false);
        }
      };

      fetchSpots();

      return () => {
        isMounted = false;
        clearTimeout(timeoutTimer);
        subscription.unsubscribe();
      };
    } else {
      setLoading(false);
    }
  }, [supabaseReady]);

  const handleSignOut = async () => {
    if (supabaseReady) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    setUser(null);
    setActiveTab('all');
    setSelectedCategory('all');
    showToast('Đã đăng xuất');
  };

  const handleCreateSpot = async (
    spotData: Omit<Spot, 'id' | 'created_at'>
  ) => {
    const tempId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `spot-${Date.now()}`;
    const newSpot: Spot = {
      ...spotData,
      id: tempId,
      created_by: user?.id,
      created_at: new Date().toISOString(),
    };

    setSpots((prev) => [newSpot, ...prev]);
    showToast('Đã lưu địa điểm mới!');

    if (supabaseReady) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('spots')
          .insert([
            {
              id: tempId.includes('-') && tempId.length === 36 ? tempId : undefined,
              name: newSpot.name,
              address: newSpot.address,
              category: newSpot.category,
              note: newSpot.note,
              google_maps_url: newSpot.google_maps_url,
              author_name: newSpot.author_name,
              created_by: user?.id,
            },
          ])
          .select()
          .single();

        if (error) {
          console.error('Lỗi khi lưu vào Supabase:', error);
          showToast(`Lưu ý DB: ${error.message}`);
        } else if (data) {
          setSpots((prev) => {
            const updated = prev.map((s) => (s.id === tempId ? (data as Spot) : s));
            try {
              localStorage.setItem('animon_spots_cache', JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }
      } catch (err) {
        console.error('Lỗi khi lưu vào Supabase:', err);
      }
    }
  };

  const handleEditSpot = async (
    spotId: string,
    updatedData: {
      name: string;
      address: string;
      category: string;
      note?: string;
      google_maps_url: string;
    }
  ) => {
    setSpots((prev) => {
      const updated = prev.map((s) => (s.id === spotId ? { ...s, ...updatedData } : s));
      try {
        localStorage.setItem('animon_spots_cache', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast('Đã cập nhật địa điểm!');

    if (supabaseReady) {
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from('spots')
          .update({
            name: updatedData.name,
            address: updatedData.address,
            category: updatedData.category,
            note: updatedData.note,
            google_maps_url: updatedData.google_maps_url,
          })
          .eq('id', spotId);

        if (error) {
          console.error('Lỗi khi cập nhật Supabase:', error);
          showToast(`Lưu ý DB: ${error.message}`);
        }
      } catch (err) {
        console.error('Lỗi khi cập nhật Supabase:', err);
      }
    }
  };

  const handleDeleteSpot = async (spotId: string) => {
    setSpots((prev) => {
      const updated = prev.filter((s) => s.id !== spotId);
      try {
        localStorage.setItem('animon_spots_cache', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast('Đã xóa địa điểm');

    if (supabaseReady) {
      try {
        const supabase = createClient();
        await supabase.from('spots').delete().eq('id', spotId);
      } catch (err) {
        console.error('Lỗi khi xóa khỏi Supabase:', err);
      }
    }
  };

  // Get all unique categories dynamically
  const availableCategories = useMemo(() => {
    const spotCategories = spots.map((s) => s.category).filter(Boolean) as string[];
    return Array.from(new Set([...DEFAULT_PRESET_CATEGORIES, ...spotCategories]));
  }, [spots]);

  // Filter spots by tab, category, and search query
  const filteredSpots = useMemo(() => {
    let result = spots;

    // Filter by tab
    if (activeTab === 'my-posts' && user) {
      result = result.filter(
        (s) => s.created_by === user.id || s.author_name === user.name
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter((s) => s.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((spot) => {
        const matchName = spot.name.toLowerCase().includes(q);
        const matchAddress = spot.address.toLowerCase().includes(q);
        const matchCategory = spot.category ? spot.category.toLowerCase().includes(q) : false;
        const matchNote = spot.note ? spot.note.toLowerCase().includes(q) : false;
        return matchName || matchAddress || matchCategory || matchNote;
      });
    }

    return result;
  }, [spots, activeTab, selectedCategory, user, searchQuery]);

  return (
    <div className="min-h-screen bg-neutral-50/50 text-black flex flex-col">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 md:left-auto md:right-8 -translate-x-1/2 md:translate-x-0 z-50 py-3 px-5 rounded-2xl bg-black text-white text-sm font-semibold shadow-2xl flex items-center gap-2.5 animate-in fade-in zoom-in-95 duration-150 whitespace-nowrap">
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <Navbar
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenCreateSpot={() => setIsCreateOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Sticky Apple Maps & Airbnb Style Search + Filter Header */}
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 py-3 md:py-4 px-4 sm:px-6 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
        <div className="max-w-md md:max-w-5xl lg:max-w-6xl mx-auto space-y-3">
          {/* Floating Rounded Search Card */}
          <div className="max-w-md md:max-w-xl mx-auto">
            <div className="mt-1 relative flex items-center bg-white border border-neutral-200/90 focus-within:border-black rounded-2xl px-4.5 h-13 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] focus-within:shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
              <Search className="w-5 h-5 text-neutral-400 shrink-0 mr-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo quán, địa chỉ, món ngon..."
                className="w-full h-full bg-transparent text-[15px] text-neutral-900 placeholder-neutral-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-black transition-colors cursor-pointer"
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              )}
            </div>
          </div>

          {/* Airbnb Style Filter Chips Carousel */}
          <div className="flex items-center gap-2 overflow-x-auto md:justify-center pb-1.5 pt-0.5 scrollbar-none no-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-black text-white shadow-sm'
                  : 'bg-white text-neutral-700 border border-neutral-200/90 hover:border-neutral-400 hover:text-black shadow-[0_1px_3px_rgba(0,0,0,0.02)]'
              }`}
            >
              <CategoryIcon category="Tất cả" className="w-4 h-4" />
              <span>Tất cả</span>
            </button>

            {availableCategories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(isActive ? 'all' : cat)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-black text-white shadow-sm'
                      : 'bg-white text-neutral-700 border border-neutral-200/90 hover:border-neutral-400 hover:text-black shadow-[0_1px_3px_rgba(0,0,0,0.02)]'
                  }`}
                >
                  <CategoryIcon category={cat} className="w-4 h-4" />
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>

          {/* Subheader: Clean Status & Filter Switch */}
          <div className="flex items-center justify-between text-[13px] text-neutral-600 pt-0.5 px-1 border-t border-neutral-100/80 md:pt-2">
            <div className="flex items-center gap-2.5">
              <span className="font-semibold text-neutral-800 text-sm">
                {loading ? 'Đang tải...' : `${filteredSpots.length} địa điểm`}
              </span>
              {selectedCategory !== 'all' && (
                <span className="text-xs px-2.5 py-0.5 bg-neutral-100 rounded-full text-neutral-700 font-medium">
                  {selectedCategory}
                </span>
              )}
            </div>

            {user && (
              <>
                {/* Mobile tab button */}
                <button
                  onClick={() => setActiveTab(activeTab === 'my-posts' ? 'all' : 'my-posts')}
                  className={`md:hidden text-[13px] transition-colors cursor-pointer ${
                    activeTab === 'my-posts' 
                      ? 'font-bold text-black underline' 
                      : 'text-neutral-500 hover:text-black'
                  }`}
                >
                  {activeTab === 'my-posts' ? '← Xem tất cả quán' : 'Quán của tôi'}
                </button>

                {/* Desktop Segmented Tabs */}
                <div className="hidden md:flex items-center p-1 bg-neutral-100 rounded-xl border border-neutral-200/80 text-xs font-semibold">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      activeTab === 'all'
                        ? 'bg-white text-black shadow-sm'
                        : 'text-neutral-600 hover:text-black'
                    }`}
                  >
                    Tất cả quán
                  </button>
                  <button
                    onClick={() => setActiveTab('my-posts')}
                    className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      activeTab === 'my-posts'
                        ? 'bg-white text-black shadow-sm'
                        : 'text-neutral-600 hover:text-black'
                    }`}
                  >
                    Quán của tôi
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Spot Feed */}
      <main className="flex-1 w-full max-w-md md:max-w-5xl lg:max-w-6xl mx-auto px-4 sm:px-6 pt-5 md:pt-8 pb-28 md:pb-16">
        {loading ? (
          <div className="space-y-3.5 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] animate-pulse space-y-3.5 h-48 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="h-5 bg-neutral-200 rounded-full w-24" />
                    <div className="h-4 bg-neutral-100 rounded w-16" />
                  </div>
                  <div className="h-5 bg-neutral-200 rounded-lg w-3/4" />
                  <div className="h-4 bg-neutral-100 rounded-lg w-full" />
                </div>
                <div className="h-8 bg-neutral-100 rounded-xl w-1/3 self-end" />
              </div>
            ))}
          </div>
        ) : filteredSpots.length > 0 ? (
          <div className="space-y-3.5 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-5 lg:gap-6">
            {filteredSpots.map((spot) => (
              <SpotCard
                key={spot.id}
                spot={spot}
                isOwner={Boolean(user && (spot.created_by === user.id || spot.author_name === user.name))}
                onDelete={() => setSpotToDelete(spot)}
                onEdit={(s) => setSpotToEdit(s)}
                searchQuery={searchQuery}
                onShowToast={showToast}
                onSelectCategory={(cat) => setSelectedCategory(cat)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-5 rounded-3xl bg-white border border-neutral-200 my-6 space-y-4 shadow-sm max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 border border-neutral-200/80 flex items-center justify-center mx-auto text-neutral-800">
              <MapPin className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900">
                {searchQuery || selectedCategory !== 'all'
                  ? 'Không tìm thấy quán nào'
                  : 'Chưa có địa điểm nào'}
              </h2>
              <p className="text-sm text-neutral-500 max-w-xs mx-auto leading-relaxed">
                {searchQuery || selectedCategory !== 'all'
                  ? 'Không có kết quả khớp với tìm kiếm. Thử chọn danh mục khác nhé!'
                  : 'Hãy là người đầu tiên chia sẻ quán ăn ngon cho mọi người!'}
              </p>
            </div>
            {searchQuery || selectedCategory !== 'all' ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="h-10 px-5 rounded-xl text-xs font-semibold bg-black text-white hover:bg-neutral-800 cursor-pointer transition-all"
              >
                Xóa bộ lọc
              </button>
            ) : (
              <button
                onClick={() => (user ? setIsCreateOpen(true) : setIsAuthOpen(true))}
                className="h-11 px-6 rounded-2xl text-sm font-semibold bg-black text-white hover:bg-neutral-800 cursor-pointer transition-all shadow-md active:scale-95"
              >
                + Thêm quán đầu tiên
              </button>
            )}
          </div>
        )}
      </main>

      {/* Action Button - Only shown after user logs in */}
      {user && (
        <>
          {/* Mobile: Draggable circular (+) button */}
          <div className="md:hidden">
            <DraggableFab onClick={() => setIsCreateOpen(true)} />
          </div>

          {/* Desktop: Fixed bottom-right (+ Thêm quán) button */}
          <div className="hidden md:block fixed bottom-8 right-8 z-30">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="h-12 px-5 rounded-full bg-black text-white shadow-2xl shadow-black/25 flex items-center gap-2 hover:bg-neutral-800 active:scale-95 transition-all cursor-pointer font-bold text-sm"
              aria-label="Thêm quán mới"
            >
              <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
              <span>Thêm quán</span>
            </button>
          </div>
        </>
      )}

      {/* Modals */}
      <CreateSpotModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSpot}
        user={user}
        existingCategories={availableCategories}
      />

      <EditSpotModal
        isOpen={Boolean(spotToEdit)}
        onClose={() => setSpotToEdit(null)}
        onSubmit={handleEditSpot}
        spot={spotToEdit}
        existingCategories={availableCategories}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      {/* Confirm Delete Dialog */}
      {spotToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="fixed inset-0 -z-10" onClick={() => setSpotToDelete(null)} />
          <div className="w-full max-w-sm rounded-2xl bg-white border border-neutral-200 text-black shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-neutral-950">Xác nhận xóa địa điểm</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Bạn có chắc muốn xóa quán <b className="text-black font-semibold">"{spotToDelete.name}"</b> khỏi animon không? Thao tác này không thể hoàn tác.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setSpotToDelete(null)}
                className="h-10 px-4 rounded-xl text-sm font-semibold text-neutral-600 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteSpot(spotToDelete.id);
                  setSpotToDelete(null);
                }}
                className="h-10 px-4 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
