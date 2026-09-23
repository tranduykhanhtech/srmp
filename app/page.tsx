'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { INITIAL_SEED_SPOTS } from '@/lib/seed-data';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { calculateDistanceKm, formatDistance, extractCoordinatesFromUrl, geocodeAddressViaNominatim } from '@/lib/geo';
import { Search, X, Plus, MapPin, CheckCircle2, Bookmark, Dices, Navigation, ArrowUp } from 'lucide-react';

export default function Home() {
  // Auth & Data state (Hydration-safe: matches server on initial render)
  const [user, setUser] = useState<{ name: string; email: string; avatar: string; id?: string } | null>(null);
  const [supabaseReady] = useState(() => isSupabaseConfigured());
  const [spots, setSpots] = useState<Spot[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [highlightedSpotId, setHighlightedSpotId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'bookmarks' | 'my-posts'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Geolocation & Distance state
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [sortByDistance, setSortByDistance] = useState<boolean>(false);
  const [isGettingLocation, setIsGettingLocation] = useState<boolean>(false);
  const [geocodedMap, setGeocodedMap] = useState<Record<string, { latitude: number; longitude: number }>>({});

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

  // Scroll to top
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 350);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
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
      const savedGeocodes = localStorage.getItem('animon_geocoded_cache');
      if (savedGeocodes) {
        setGeocodedMap(JSON.parse(savedGeocodes));
      }
    } catch {}

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
        } else {
          setSpots(INITIAL_SEED_SPOTS);
          setLoading(false);
        }
      } else {
        setSpots(INITIAL_SEED_SPOTS);
        setLoading(false);
      }
    } catch {
      setSpots(INITIAL_SEED_SPOTS);
      setLoading(false);
    }

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
            if (data.length > 0) {
              setSpots(data);
              try {
                localStorage.setItem('animon_spots_cache', JSON.stringify(data));
              } catch {}
            } else {
              setSpots(INITIAL_SEED_SPOTS);
            }
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
      setSpots(INITIAL_SEED_SPOTS);
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
        const basePayload: Record<string, any> = {
          name: newSpot.name,
          address: newSpot.address,
          category: newSpot.category,
          note: newSpot.note,
          google_maps_url: newSpot.google_maps_url,
          author_name: newSpot.author_name,
          created_by: user?.id,
        };
        if (tempId.includes('-') && tempId.length === 36) {
          basePayload.id = tempId;
        }

        const payloadWithCoords = {
          ...basePayload,
          ...(typeof newSpot.latitude === 'number' && typeof newSpot.longitude === 'number'
            ? { latitude: newSpot.latitude, longitude: newSpot.longitude }
            : {}),
        };

        let { data, error } = await supabase
          .from('spots')
          .insert([payloadWithCoords])
          .select()
          .single();

        // Tự động fallback nếu DB remote chưa chạy migration thêm cột latitude / longitude (PGRST204)
        if (
          error &&
          (error.code === 'PGRST204' ||
            error.message?.includes('latitude') ||
            error.message?.includes('longitude'))
        ) {
          console.warn('DB Supabase chưa có cột latitude/longitude, tự động lưu dự phòng:', error.message);
          const fallbackRes = await supabase
            .from('spots')
            .insert([basePayload])
            .select()
            .single();
          data = fallbackRes.data;
          error = fallbackRes.error;
        }

        if (error) {
          console.error('Lỗi khi lưu vào Supabase:', error);
          showToast(`Lưu ý DB: ${error.message}`);
        } else if (data) {
          setSpots((prev) => {
            const merged = { ...newSpot, ...(data as Spot) };
            if (newSpot.latitude && !merged.latitude) merged.latitude = newSpot.latitude;
            if (newSpot.longitude && !merged.longitude) merged.longitude = newSpot.longitude;
            const updated = prev.map((s) => (s.id === tempId ? merged : s));
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
        const basePayload: Record<string, any> = {
          name: updatedData.name,
          address: updatedData.address,
          category: updatedData.category,
          note: updatedData.note,
          google_maps_url: updatedData.google_maps_url,
        };

        const payloadWithCoords = {
          ...basePayload,
          ...(typeof updatedData.latitude === 'number' && typeof updatedData.longitude === 'number'
            ? { latitude: updatedData.latitude, longitude: updatedData.longitude }
            : {}),
        };

        let { error } = await supabase
          .from('spots')
          .update(payloadWithCoords)
          .eq('id', spotId);

        // Fallback nếu DB remote chưa có cột latitude/longitude
        if (
          error &&
          (error.code === 'PGRST204' ||
            error.message?.includes('latitude') ||
            error.message?.includes('longitude'))
        ) {
          console.warn('DB Supabase chưa có cột latitude/longitude, tự động cập nhật dự phòng:', error.message);
          const fallbackRes = await supabase
            .from('spots')
            .update(basePayload)
            .eq('id', spotId);
          error = fallbackRes.error;
        }

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

  // Compute top 4 most popular categories based on spots count
  const topPopularCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    spots.forEach((s) => {
      if (s.category) {
        counts[s.category] = (counts[s.category] || 0) + 1;
      }
    });
    const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const merged = Array.from(new Set([...sorted, ...DEFAULT_PRESET_CATEGORIES]));
    return merged.slice(0, 4);
  }, [spots]);

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dropdown suggestions when typing in search
  const searchDropdownSpots = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return spots
      .filter((spot) => {
        const matchName = spot.name.toLowerCase().includes(q);
        const matchAddress = spot.address.toLowerCase().includes(q);
        const matchCategory = spot.category ? spot.category.toLowerCase().includes(q) : false;
        const matchNote = spot.note ? spot.note.toLowerCase().includes(q) : false;
        return matchName || matchAddress || matchCategory || matchNote;
      })
      .slice(0, 6);
  }, [spots, searchQuery]);

  // Handle select a spot from dropdown list
  const handleSelectDropdownSpot = (spot: Spot) => {
    setIsSearchFocused(false);
    setActiveTab('all');
    setSelectedCategory('all');
    setTimeout(() => {
      const el = document.getElementById(`spot-${spot.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedSpotId(spot.id);
        setTimeout(() => setHighlightedSpotId(null), 3500);
      }
    }, 120);
  };

  // Helper to resolve coordinates for a spot (from lat/lng, geocoded cache, or google_maps_url)
  const getSpotCoords = useCallback(
    (spot: Spot) => {
      if (typeof spot.latitude === 'number' && typeof spot.longitude === 'number') {
        return { latitude: spot.latitude, longitude: spot.longitude };
      }
      if (geocodedMap[spot.id]) return geocodedMap[spot.id];
      if (geocodedMap[spot.address]) return geocodedMap[spot.address];
      return extractCoordinatesFromUrl(spot.google_maps_url || spot.address || '');
    },
    [geocodedMap]
  );

  // Auto-geocode spots in the background when "Gần tôi" is active
  useEffect(() => {
    if (!sortByDistance && !userCoords) return;

    const spotsNeedingGeocode = spots.filter((s) => {
      const hasCoords = typeof s.latitude === 'number' && typeof s.longitude === 'number';
      const hasCache = Boolean(geocodedMap[s.id] || geocodedMap[s.address]);
      return !hasCoords && !hasCache && Boolean(s.address);
    });

    if (spotsNeedingGeocode.length === 0) return;

    let isCancelled = false;

    const runGeocodeQueue = async () => {
      for (const s of spotsNeedingGeocode.slice(0, 15)) {
        if (isCancelled) break;
        const coords = await geocodeAddressViaNominatim(s.address);
        if (coords && !isCancelled) {
          setGeocodedMap((prev) => {
            const next = { ...prev, [s.id]: coords, [s.address]: coords };
            try {
              localStorage.setItem('animon_geocoded_cache', JSON.stringify(next));
            } catch {}
            return next;
          });

          // Sync to Supabase in the background if possible
          if (supabaseReady) {
            try {
              const supabase = createClient();
              supabase
                .from('spots')
                .update({ latitude: coords.latitude, longitude: coords.longitude })
                .eq('id', s.id)
                .then(() => {});
            } catch {}
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    };

    runGeocodeQueue();

    return () => {
      isCancelled = true;
    };
  }, [spots, sortByDistance, userCoords, geocodedMap, supabaseReady]);

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
          {/* Floating Rounded Search Card with Autocomplete Dropdown */}
          <div ref={searchContainerRef} className="max-w-md md:max-w-xl mx-auto relative z-40">
            <div className="relative flex items-center bg-white border border-neutral-200/90 focus-within:border-black rounded-2xl px-3.5 md:px-4.5 h-10.5 md:h-12 transition-all shadow-[0_1px_4px_rgba(0,0,0,0.03)] focus-within:shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
              <Search className="w-4.5 h-4.5 md:w-5 md:h-5 text-neutral-400 shrink-0 mr-2.5 md:mr-3" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsSearchFocused(false);
                }}
                placeholder="Tìm theo quán, địa chỉ, món ngon..."
                className="w-full h-full bg-transparent text-sm md:text-[15px] text-neutral-900 placeholder-neutral-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchFocused(false);
                  }}
                  className="p-1 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-black transition-colors cursor-pointer"
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dropdown list when searching */}
            {isSearchFocused && searchQuery.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-200/90 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                {searchDropdownSpots.length > 0 ? (
                  <div>
                    <div className="py-2 px-3.5 bg-neutral-50/80 border-b border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">
                      <span>Gợi ý địa điểm</span>
                      <span>{searchDropdownSpots.length} kết quả</span>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-neutral-100">
                      {searchDropdownSpots.map((spot) => {
                        const distText = getDistanceText(spot);
                        return (
                          <button
                            key={spot.id}
                            type="button"
                            onClick={() => handleSelectDropdownSpot(spot)}
                            className="w-full px-3.5 py-2.5 text-left flex items-center justify-between hover:bg-neutral-50 transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                              <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0 text-neutral-700 group-hover:bg-black group-hover:text-white transition-colors">
                                <CategoryIcon category={spot.category || 'Tụ họp'} className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-neutral-900 leading-snug group-hover:text-black truncate">
                                  {spot.name}
                                </p>
                                <p className="text-xs text-neutral-500 truncate">
                                  {spot.address}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {distText && (
                                <span className="text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full">
                                  📍 {distText}
                                </span>
                              )}
                              <span className="text-xs text-neutral-400 group-hover:text-black">
                                →
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="px-3.5 py-2 bg-neutral-50 flex items-center justify-between text-[11px] text-neutral-500 border-t border-neutral-100">
                      <span>Nhấn vào quán để xem ngay</span>
                      <button
                        type="button"
                        onClick={() => setIsSearchFocused(false)}
                        className="font-semibold text-neutral-900 hover:underline cursor-pointer"
                      >
                        Xem danh sách bên dưới ↓
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-7 px-4 text-center space-y-1">
                    <p className="text-sm font-semibold text-neutral-800">
                      Không tìm thấy quán nào khớp với &quot;{searchQuery}&quot;
                    </p>
                    <p className="text-xs text-neutral-500">
                      Thử tìm theo tên món, tên quán hoặc quận/huyện
                    </p>
                  </div>
                )}
              </div>
            )}
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

      {/* Floating Action Buttons */}
      <div className="fixed bottom-5 right-4 sm:bottom-8 sm:right-8 z-30 flex flex-col-reverse items-end gap-2.5 pb-safe pointer-events-none">
        {/* 1. Add Spot (Only when logged in, anchored to bottom) */}
        {user && (
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="h-11 sm:h-12 px-4 sm:px-5 rounded-full bg-black text-white shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.35)] flex items-center gap-2 active:scale-95 transition-all cursor-pointer font-bold text-xs sm:text-sm hover:bg-neutral-800 pointer-events-auto"
            aria-label="Thêm quán mới"
          >
            <Plus className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
            <span>Thêm quán</span>
          </button>
        )}

        {/* 2. Scroll To Top Button (Stacked above Add Spot, or at bottom if not logged in) */}
        <button
          type="button"
          onClick={scrollToTop}
          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/95 text-neutral-800 hover:text-black hover:bg-neutral-50 border border-neutral-300/80 shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)] flex items-center justify-center active:scale-90 transition-all duration-200 backdrop-blur-md cursor-pointer ${
            showScrollTop
              ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
              : 'opacity-0 translate-y-2 scale-90 pointer-events-none'
          }`}
          aria-label="Cuộn lên đầu trang"
          title="Lên đầu trang"
        >
          <ArrowUp className="w-4.5 h-4.5 stroke-[2.2]" />
        </button>
      </div>

      {/* Modals */}
      <CreateSpotModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSpot}
        user={user}
        existingCategories={availableCategories}
        topCategories={topPopularCategories}
      />

      <EditSpotModal
        isOpen={Boolean(spotToEdit)}
        onClose={() => setSpotToEdit(null)}
        onSubmit={handleEditSpot}
        spot={spotToEdit}
        existingCategories={availableCategories}
        topCategories={topPopularCategories}
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
