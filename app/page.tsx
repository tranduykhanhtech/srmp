'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import SpotCard from '@/components/SpotCard';
import CreateSpotModal from '@/components/CreateSpotModal';
import EditSpotModal from '@/components/EditSpotModal';
import AuthModal from '@/components/AuthModal';
import RandomSpotModal from '@/components/RandomSpotModal';
import QrCodeModal from '@/components/QrCodeModal';
import CategoryIcon from '@/components/CategoryIcon';
import { Spot } from '@/types/spot';
import { DEFAULT_PRESET_CATEGORIES } from '@/lib/constants';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { calculateDistanceKm, formatDistance, extractCoordinatesFromUrl } from '@/lib/geo';
import { Search, X, Plus, MapPin, CheckCircle2, Bookmark, Dices, Navigation } from 'lucide-react';

export default function Home() {
  // Auth & Data state (Hydration-safe: matches server on initial render)
  const [user, setUser] = useState<{ name: string; email: string; avatar: string; id?: string } | null>(null);
  const [supabaseReady] = useState(() => isSupabaseConfigured());
  const [spots, setSpots] = useState<Spot[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [highlightedSpotId, setHighlightedSpotId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'bookmarks' | 'my-posts'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Geolocation & Distance state
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [sortByDistance, setSortByDistance] = useState<boolean>(false);
  const [isGettingLocation, setIsGettingLocation] = useState<boolean>(false);

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRandomOpen, setIsRandomOpen] = useState(false);
  const [qrSpot, setQrSpot] = useState<Spot | null>(null);
  const [spotToEdit, setSpotToEdit] = useState<Spot | null>(null);
  const [spotToDelete, setSpotToDelete] = useState<Spot | null>(null);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Sync Supabase Auth & Spots & Bookmarks
  useEffect(() => {
    // 1. Instant Cache Hydration on client mount (safe after initial hydration)
    let currentUser = null;
    try {
      const savedUser = localStorage.getItem('animon_user_session');
      if (savedUser) {
        currentUser = JSON.parse(savedUser);
        setUser(currentUser);
      }
    } catch {}

    if (currentUser) {
      try {
        const savedBookmarks = localStorage.getItem('animon_bookmarks');
        if (savedBookmarks) {
          setBookmarkedIds(JSON.parse(savedBookmarks));
        }
      } catch {}
    } else {
      setBookmarkedIds([]);
      try {
        localStorage.removeItem('animon_bookmarks');
      } catch {}
    }

    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const paramSpot = params.get('spot');
        if (paramSpot) {
          setHighlightedSpotId(paramSpot);
        }
      }
    } catch {}

    try {
      const cachedSpots = localStorage.getItem('animon_spots_cache') || localStorage.getItem('spotshare_spots_cache');
      if (cachedSpots) {
        const parsed = JSON.parse(cachedSpots);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSpots(parsed);
          setLoading(false);
        }
      }
    } catch {}

    if (supabaseReady) {
      const supabase = createClient();
      let isMounted = true;

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!isMounted) return;
        if (session?.user) {
          const userData = {
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Foodie',
            email: session.user.email || '',
            avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || '',
          };
          setUser(userData);
          try {
            localStorage.setItem('animon_user_session', JSON.stringify(userData));
          } catch {}

          // Sync saved bookmarks from Supabase
          supabase
            .from('bookmarks')
            .select('spot_id')
            .eq('user_id', session.user.id)
            .then(
              ({ data: bmData }) => {
                if (bmData && bmData.length > 0) {
                  const dbIds = bmData.map((b: { spot_id: string }) => b.spot_id);
                  setBookmarkedIds((prev) => {
                    const merged = Array.from(new Set([...prev, ...dbIds]));
                    try { localStorage.setItem('animon_bookmarks', JSON.stringify(merged)); } catch {}
                    return merged;
                  });
                }
              },
              () => {}
            );
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (!isMounted) return;
        if (session?.user) {
          const userData = {
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Foodie',
            email: session.user.email || '',
            avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || '',
          };
          setUser(userData);
          try {
            localStorage.setItem('animon_user_session', JSON.stringify(userData));
          } catch {}

          // Sync saved bookmarks
          supabase
            .from('bookmarks')
            .select('spot_id')
            .eq('user_id', session.user.id)
            .then(
              ({ data: bmData }) => {
                if (bmData && bmData.length > 0) {
                  const dbIds = bmData.map((b: { spot_id: string }) => b.spot_id);
                  setBookmarkedIds((prev) => {
                    const merged = Array.from(new Set([...prev, ...dbIds]));
                    try { localStorage.setItem('animon_bookmarks', JSON.stringify(merged)); } catch {}
                    return merged;
                  });
                }
              },
              () => {}
            );
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setBookmarkedIds([]);
          try {
            localStorage.removeItem('animon_user_session');
            localStorage.removeItem('animon_bookmarks');
          } catch {}
          setActiveTab('all');
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
    setBookmarkedIds([]);
    try {
      localStorage.removeItem('animon_user_session');
      localStorage.removeItem('animon_bookmarks');
    } catch {}
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
              latitude: newSpot.latitude,
              longitude: newSpot.longitude,
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
      latitude?: number;
      longitude?: number;
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
            latitude: updatedData.latitude,
            longitude: updatedData.longitude,
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

  const handleToggleBookmark = async (spotId: string) => {
    if (!user) {
      setIsAuthOpen(true);
      showToast('Vui lòng đăng nhập để lưu quán yêu thích!');
      return;
    }

    const isCurrentlyBookmarked = bookmarkedIds.includes(spotId);
    const updated = isCurrentlyBookmarked
      ? bookmarkedIds.filter((id) => id !== spotId)
      : [...bookmarkedIds, spotId];

    setBookmarkedIds(updated);
    try {
      localStorage.setItem('animon_bookmarks', JSON.stringify(updated));
    } catch {}
    showToast(isCurrentlyBookmarked ? 'Đã bỏ lưu quán' : 'Đã lưu quán vào mục yêu thích!');

    if (supabaseReady && user?.id) {
      try {
        const supabase = createClient();
        if (isCurrentlyBookmarked) {
          await supabase.from('bookmarks').delete().match({ user_id: user.id, spot_id: spotId });
        } else {
          await supabase.from('bookmarks').upsert({ user_id: user.id, spot_id: spotId });
        }
      } catch (err) {
        console.warn('Bookmarks Supabase sync note:', err);
      }
    }
  };

  // Auto scroll & highlight shared spot if ?spot=xxx in URL
  useEffect(() => {
    if (highlightedSpotId && spots.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`spot-${highlightedSpotId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 400);
    }
  }, [highlightedSpotId, spots]);

  // Get all unique categories dynamically
  const availableCategories = useMemo(() => {
    const spotCategories = spots.map((s) => s.category).filter(Boolean) as string[];
    return Array.from(new Set([...DEFAULT_PRESET_CATEGORIES, ...spotCategories]));
  }, [spots]);

  // Helper to resolve coordinates for a spot (from lat/lng or google_maps_url)
  const getSpotCoords = useCallback((spot: Spot) => {
    if (spot.latitude && spot.longitude) {
      return { latitude: spot.latitude, longitude: spot.longitude };
    }
    return extractCoordinatesFromUrl(spot.google_maps_url || spot.address || '');
  }, []);

  // Helper to get distance in km from user's current GPS location
  const getSpotDistanceKm = useCallback(
    (spot: Spot) => {
      if (!userCoords) return null;
      const coords = getSpotCoords(spot);
      if (!coords) return null;
      return calculateDistanceKm(
        userCoords.latitude,
        userCoords.longitude,
        coords.latitude,
        coords.longitude
      );
    },
    [userCoords, getSpotCoords]
  );

  // Formatted distance string for display
  const getDistanceText = (spot: Spot): string | undefined => {
    const distKm = getSpotDistanceKm(spot);
    if (distKm === null) return undefined;
    return formatDistance(distKm);
  };

  // Toggle near me sorting
  const handleToggleNearMe = () => {
    if (sortByDistance) {
      setSortByDistance(false);
      showToast('Đã tắt lọc gần tôi');
      return;
    }

    if (userCoords) {
      setSortByDistance(true);
      showToast('Đang hiển thị quán gần bạn nhất!');
      return;
    }

    if (typeof window === 'undefined' || !navigator.geolocation) {
      showToast('Trình duyệt không hỗ trợ định vị GPS');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setSortByDistance(true);
        setIsGettingLocation(false);
        showToast('Đã định vị — Đang sắp xếp quán gần nhất!');
      },
      (err) => {
        setIsGettingLocation(false);
        console.warn('Lỗi lấy vị trí:', err);
        showToast('Vui lòng cấp quyền vị trí trên trình duyệt để dùng tính năng này!');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Handle picking a spot from the Random Roulette
  const handleSelectRandomSpot = (spot: Spot) => {
    setHighlightedSpotId(spot.id);
    setTimeout(() => {
      const el = document.getElementById(`spot-${spot.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 250);
    showToast(`Đã chọn: ${spot.name}`);
  };

  // Filter spots by tab, category, search query, and sort by distance
  const filteredSpots = useMemo(() => {
    let result = spots;

    // Filter by tab
    if (activeTab === 'bookmarks') {
      result = result.filter((s) => bookmarkedIds.includes(s.id));
    } else if (activeTab === 'my-posts' && user) {
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

    // Sort by distance if enabled and coordinates are available
    if (sortByDistance && userCoords) {
      result = [...result].sort((a, b) => {
        const distA = getSpotDistanceKm(a);
        const distB = getSpotDistanceKm(b);
        if (distA !== null && distB !== null) return distA - distB;
        if (distA !== null) return -1;
        if (distB !== null) return 1;
        return 0;
      });
    }

    return result;
  }, [
    spots,
    activeTab,
    selectedCategory,
    user,
    searchQuery,
    bookmarkedIds,
    sortByDistance,
    userCoords,
    getSpotDistanceKm,
  ]);

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
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 py-2 md:py-3.5 px-3.5 sm:px-6 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
        <div className="max-w-md md:max-w-5xl lg:max-w-6xl mx-auto space-y-2 md:space-y-2.5">
          {/* Floating Rounded Search Card */}
          <div className="max-w-md md:max-w-xl mx-auto">
            <div className="relative flex items-center bg-white border border-neutral-200/90 focus-within:border-black rounded-2xl px-3.5 md:px-4.5 h-10.5 md:h-12 transition-all shadow-[0_1px_4px_rgba(0,0,0,0.03)] focus-within:shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
              <Search className="w-4.5 h-4.5 md:w-5 md:h-5 text-neutral-400 shrink-0 mr-2.5 md:mr-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo quán, địa chỉ, món ngon..."
                className="w-full h-full bg-transparent text-sm md:text-[15px] text-neutral-900 placeholder-neutral-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-black transition-colors cursor-pointer"
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Airbnb Style Filter Chips Carousel */}
          <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto md:justify-center pb-1 pt-0.5 scrollbar-none no-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition-all cursor-pointer border ${
                selectedCategory === 'all'
                  ? 'bg-black text-white border-black shadow-sm'
                  : 'bg-white text-neutral-700 border-neutral-200/90 hover:border-neutral-400 hover:text-black shadow-[0_1px_3px_rgba(0,0,0,0.02)]'
              }`}
            >
              <CategoryIcon category="Tất cả" className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span>Tất cả</span>
            </button>

            {availableCategories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(isActive ? 'all' : cat)}
                  className={`flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-black text-white border-black shadow-sm'
                      : 'bg-white text-neutral-700 border-neutral-200/90 hover:border-neutral-400 hover:text-black shadow-[0_1px_3px_rgba(0,0,0,0.02)]'
                  }`}
                >
                  <CategoryIcon category={cat} className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>

          {/* Subheader: Clean Status, Quick Actions & Filter Switch */}
          <div className="flex items-center justify-between text-xs md:text-[13px] text-neutral-600 pt-1.5 pb-0.5 px-0.5 border-t border-neutral-100/80 md:pt-2 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
              <span className="font-semibold text-neutral-800 text-xs md:text-sm">
                {loading ? 'Đang tải...' : `${filteredSpots.length} địa điểm`}
              </span>

              {/* Nút Hôm nay ăn gì? */}
              <button
                type="button"
                onClick={() => setIsRandomOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full text-[11px] md:text-xs font-semibold bg-black text-white border border-black hover:bg-neutral-800 active:scale-95 transition-all shadow-xs cursor-pointer"
                title="Quay ngẫu nhiên chọn quán ăn"
              >
                <Dices className="w-3.5 h-3.5" />
                <span>Hôm nay ăn gì?</span>
              </button>

              {/* Nút Gần tôi */}
              <button
                type="button"
                onClick={handleToggleNearMe}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full text-[11px] md:text-xs font-semibold transition-all cursor-pointer border ${
                  sortByDistance
                    ? 'bg-black text-white border-black shadow-xs'
                    : 'bg-white text-neutral-700 border-neutral-200/90 hover:border-neutral-400 hover:text-black shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
                }`}
                title="Sắp xếp quán theo khoảng cách gần nhất"
              >
                <Navigation className={`w-3 h-3 ${isGettingLocation ? 'animate-spin' : ''}`} />
                <span>{isGettingLocation ? 'Đang định vị...' : 'Gần tôi'}</span>
              </button>
            </div>

            {/* Segmented Control Tabs */}
            <div className="flex items-center p-0.5 bg-neutral-100 rounded-xl border border-neutral-200/80 text-[11px] md:text-xs font-semibold">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-white text-black shadow-xs font-bold'
                    : 'text-neutral-500 hover:text-black'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => {
                  if (!user) {
                    setIsAuthOpen(true);
                    showToast('Vui lòng đăng nhập để xem danh sách đã lưu!');
                    return;
                  }
                  setActiveTab('bookmarks');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'bookmarks'
                    ? 'bg-white text-black shadow-xs font-bold'
                    : 'text-neutral-500 hover:text-black'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${activeTab === 'bookmarks' ? 'fill-black' : ''}`} />
                <span>Đã lưu</span>
                {bookmarkedIds.length > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                      activeTab === 'bookmarks' ? 'bg-black text-white' : 'bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {bookmarkedIds.length}
                  </span>
                )}
              </button>
              {user && (
                <button
                  onClick={() => setActiveTab('my-posts')}
                  className={`px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'my-posts'
                      ? 'bg-white text-black shadow-xs font-bold'
                      : 'text-neutral-500 hover:text-black'
                  }`}
                >
                  Của tôi
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Spot Feed */}
      <main className="flex-1 w-full max-w-md md:max-w-5xl lg:max-w-6xl mx-auto px-4 sm:px-6 pt-4 md:pt-6 pb-12 md:pb-16">
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
                isBookmarked={bookmarkedIds.includes(spot.id)}
                onToggleBookmark={handleToggleBookmark}
                isHighlighted={highlightedSpotId === spot.id}
                onOpenQr={(s) => setQrSpot(s)}
                distanceText={getDistanceText(spot)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-5 rounded-3xl bg-white border border-neutral-200 my-6 space-y-4 shadow-sm max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 border border-neutral-200/80 flex items-center justify-center mx-auto text-neutral-800">
              {activeTab === 'bookmarks' ? (
                <Bookmark className="w-7 h-7" />
              ) : (
                <MapPin className="w-7 h-7" />
              )}
            </div>
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900">
                {activeTab === 'bookmarks'
                  ? 'Chưa có quán nào được lưu'
                  : activeTab === 'my-posts'
                  ? 'Bạn chưa đăng quán nào'
                  : searchQuery || selectedCategory !== 'all'
                  ? 'Không tìm thấy quán nào'
                  : 'Chưa có địa điểm nào'}
              </h2>
              <p className="text-sm text-neutral-500 max-w-xs mx-auto leading-relaxed">
                {activeTab === 'bookmarks'
                  ? 'Bấm vào biểu tượng lá cờ (Bookmark) trên các thẻ quán ăn bạn thích để lưu lại xem sau nhé!'
                  : activeTab === 'my-posts'
                  ? 'Hãy chia sẻ những quán ăn ngon chuẩn gu của bạn cho mọi người cùng biết!'
                  : searchQuery || selectedCategory !== 'all'
                  ? 'Không có kết quả khớp với tìm kiếm. Thử chọn danh mục khác nhé!'
                  : 'Hãy là người đầu tiên chia sẻ quán ăn ngon cho mọi người!'}
              </p>
            </div>
            {activeTab === 'bookmarks' ? (
              <button
                onClick={() => {
                  setActiveTab('all');
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="h-11 px-6 rounded-2xl text-sm font-semibold bg-black text-white hover:bg-neutral-800 cursor-pointer transition-all shadow-md active:scale-95"
              >
                Khám phá quán ngay
              </button>
            ) : activeTab === 'my-posts' ? (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="h-11 px-6 rounded-2xl text-sm font-semibold bg-black text-white hover:bg-neutral-800 cursor-pointer transition-all shadow-md active:scale-95"
              >
                + Đăng quán ngay
              </button>
            ) : searchQuery || selectedCategory !== 'all' ? (
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

      {/* Footer with Copyright */}
      <footer className="w-full border-t border-neutral-200/80 bg-white py-6 md:py-8 px-4 sm:px-6 mt-auto pb-24 sm:pb-8">
        <div className="max-w-md md:max-w-5xl lg:max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight text-neutral-950 text-sm">animon</span>
            <span className="text-neutral-300">•</span>
            <span className="text-xs text-neutral-500">Sổ tay quán ăn chuẩn gu cho giới trẻ</span>
          </div>

          <div className="flex items-center gap-2 text-[12px] text-neutral-400">
            <span>Tối giản, tốc độ & không quảng cáo</span>
            <span className="text-neutral-300">•</span>
            <span className="font-medium text-neutral-600">© 2026 animon. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* Floating Action Button - Fixed bottom right, only shown after user logs in */}
      {user && (
        <div className="fixed bottom-5 right-4 sm:bottom-8 sm:right-8 z-30 pb-safe">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="h-11 sm:h-12 px-4 sm:px-5 rounded-full bg-black text-white shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.35)] flex items-center gap-2 active:scale-95 transition-all cursor-pointer font-bold text-xs sm:text-sm hover:bg-neutral-800"
            aria-label="Thêm quán mới"
          >
            <Plus className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
            <span>Thêm quán</span>
          </button>
        </div>
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

      {/* Random Spot Modal */}
      <RandomSpotModal
        isOpen={isRandomOpen}
        onClose={() => setIsRandomOpen(false)}
        spots={filteredSpots}
        onSelectSpot={handleSelectRandomSpot}
      />

      {/* QR Code Modal */}
      <QrCodeModal
        isOpen={Boolean(qrSpot)}
        onClose={() => setQrSpot(null)}
        spot={qrSpot}
        onShowToast={showToast}
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
