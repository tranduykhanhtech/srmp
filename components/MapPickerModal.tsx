'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X,
  Search,
  MapPin,
  Navigation,
  Check,
  Loader2,
  Crosshair,
  Compass,
} from 'lucide-react';
import type { Map as LeafletMap } from 'leaflet';

interface MapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (location: {
    address: string;
    latitude: number;
    longitude: number;
  }) => void;
  initialCoords?: { latitude: number; longitude: number } | null;
  initialAddress?: string;
}

export default function MapPickerModal({
  isOpen,
  onClose,
  onSelectLocation,
  initialCoords,
  initialAddress,
}: MapPickerModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);

  const [currentCoords, setCurrentCoords] = useState<{
    latitude: number;
    longitude: number;
  }>({
    latitude: initialCoords?.latitude || 10.7769,
    longitude: initialCoords?.longitude || 106.7009,
  });

  const [resolvedAddress, setResolvedAddress] = useState<string>(
    initialAddress || 'Đang tải vị trí...'
  );
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [isLocatingUser, setIsLocatingUser] = useState<boolean>(false);

  // Search places state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<
    Array<{ display_name: string; lat: string; lon: string }>
  >([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);

  const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reverse Geocoding with OpenStreetMap Nominatim
  const performReverseGeocode = useCallback(
    async (lat: number, lon: number) => {
      setIsGeocoding(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
          {
            headers: {
              'Accept-Language': 'vi,en;q=0.9',
            },
          }
        );
        const data = await res.json();
        if (data && data.address) {
          const addr = data.address;
          const parts = [
            addr.house_number ? `${addr.house_number}` : '',
            addr.road || addr.pedestrian || addr.street || '',
            addr.suburb || addr.quarter || addr.neighbourhood || '',
            addr.city_district || addr.district || addr.county || '',
            addr.city || addr.state || '',
          ].filter(Boolean);

          const fullText = parts.length > 0 ? parts.join(', ') : data.display_name;
          setResolvedAddress(fullText || `${lat.toFixed(5)}, ${lon.toFixed(5)}`);
        } else if (data.display_name) {
          setResolvedAddress(data.display_name);
        } else {
          setResolvedAddress(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
        }
      } catch (err) {
        console.warn('Lỗi phân giải địa chỉ:', err);
        setResolvedAddress(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
      } finally {
        setIsGeocoding(false);
      }
    },
    []
  );

  // Initialize Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    let isCancelled = false;

    const initMap = async () => {
      const L = (await import('leaflet')).default;

      if (isCancelled || !mapContainerRef.current) return;

      // Clean up previous map if exists
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const defaultLat = initialCoords?.latitude || 10.7769;
      const defaultLng = initialCoords?.longitude || 106.7009;

      const map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: 16,
        zoomControl: false,
      });

      const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY || 'cb1_3u3d_1_7729f2893edf916b90aae189';

      // CARTO Positron Minimalist Tiles with authenticated API key (Zero Watermarks)
      L.tileLayer(
        `https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key=${cartoKey}`,
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 20,
        }
      ).addTo(map);

      mapInstanceRef.current = map;

      // Event listeners for dragging map
      map.on('movestart', () => {
        setIsMoving(true);
      });

      map.on('move', () => {
        const center = map.getCenter();
        setCurrentCoords({
          latitude: center.lat,
          longitude: center.lng,
        });
      });

      map.on('moveend', () => {
        setIsMoving(false);
        const center = map.getCenter();
        const lat = center.lat;
        const lon = center.lng;
        setCurrentCoords({ latitude: lat, longitude: lon });

        // Debounce reverse geocoding
        if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
        geocodeTimeoutRef.current = setTimeout(() => {
          performReverseGeocode(lat, lon);
        }, 300);
      });

      // Invalidate size to ensure clean render after modal animation
      setTimeout(() => {
        if (!isCancelled && mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 250);

      // If no initial coords, attempt to fly to user's current GPS location
      if (!initialCoords && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!isCancelled && mapInstanceRef.current) {
              const uLat = pos.coords.latitude;
              const uLng = pos.coords.longitude;
              mapInstanceRef.current.setView([uLat, uLng], 16);
              setCurrentCoords({ latitude: uLat, longitude: uLng });
              performReverseGeocode(uLat, uLng);
            }
          },
          () => {
            // Default fallback is already loaded
            performReverseGeocode(defaultLat, defaultLng);
          },
          { timeout: 5000, enableHighAccuracy: false }
        );
      } else {
        performReverseGeocode(defaultLat, defaultLng);
      }
    };

    initMap();

    return () => {
      isCancelled = true;
      if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, initialCoords, performReverseGeocode]);

  // Handle Search Input Debounce
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            val.trim()
          )}&countrycodes=vn&limit=5`,
          {
            headers: {
              'Accept-Language': 'vi,en;q=0.9',
            },
          }
        );
        const data = await res.json();
        setSearchResults(data || []);
        setShowSearchResults(true);
      } catch (err) {
        console.warn('Lỗi tìm địa điểm:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  // Fly to selected search result
  const handleSelectSearchResult = (result: {
    display_name: string;
    lat: string;
    lon: string;
  }) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    if (mapInstanceRef.current && !isNaN(lat) && !isNaN(lon)) {
      mapInstanceRef.current.flyTo([lat, lon], 17, { duration: 1.2 });
      setSearchQuery('');
      setShowSearchResults(false);
    }
  };

  // Locate user GPS button
  const handleLocateUser = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    setIsLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingUser(false);
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lon], 17, { duration: 1 });
        }
      },
      () => {
        setIsLocatingUser(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Confirm selection
  const handleConfirm = () => {
    onSelectLocation({
      address: resolvedAddress,
      latitude: currentCoords.latitude,
      longitude: currentCoords.longitude,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full h-full sm:h-[88vh] sm:max-w-2xl bg-white sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header & Search Bar */}
        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 z-[1000] space-y-2 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Search Box */}
            <div className="flex-1 relative bg-white border border-neutral-200/90 rounded-2xl shadow-lg px-3.5 h-11 flex items-center gap-2">
              <Search className="w-4 h-4 text-neutral-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Tìm đường, khu vực, quán gần đó..."
                className="w-full h-full bg-transparent text-xs sm:text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none"
              />
              {isSearching && (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-400 shrink-0" />
              )}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setShowSearchResults(false);
                  }}
                  className="p-1 text-neutral-400 hover:text-black rounded-full hover:bg-neutral-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-11 h-11 rounded-2xl bg-white border border-neutral-200/90 text-neutral-500 hover:text-black hover:bg-neutral-100 flex items-center justify-center shadow-lg transition-colors cursor-pointer shrink-0"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="bg-white border border-neutral-200 rounded-2xl shadow-2xl overflow-hidden divide-y divide-neutral-100 max-h-56 overflow-y-auto pointer-events-auto animate-in fade-in duration-150">
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSearchResult(item)}
                  className="w-full px-3.5 py-2.5 text-left text-xs text-neutral-800 hover:bg-neutral-50 flex items-start gap-2.5 transition-colors cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-neutral-500 mt-0.5 shrink-0" />
                  <span className="line-clamp-2 leading-relaxed">
                    {item.display_name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* The Leaflet Map Viewport */}
        <div className="flex-1 w-full h-full relative">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Fixed Center Pin (Grab/Uber Style) */}
          <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center">
            <div
              className={`relative -translate-y-1/2 flex flex-col items-center transition-transform duration-150 ${
                isMoving ? '-translate-y-8 scale-110' : '-translate-y-6 scale-100'
              }`}
            >
              {/* Pin Head */}
              <div className="w-11 h-11 rounded-2xl bg-black text-white shadow-2xl flex items-center justify-center border-2 border-white">
                <Compass className="w-5 h-5 stroke-[2.5]" />
              </div>
              {/* Pin Needle */}
              <div className="w-2.5 h-2.5 bg-black rotate-45 -mt-1.5 border-r border-b border-white" />
              {/* Pin Shadow on the road */}
              <div
                className={`w-4 h-1.5 bg-black/35 rounded-full mt-1.5 transition-all duration-150 ${
                  isMoving ? 'scale-75 opacity-30' : 'scale-100 opacity-75'
                }`}
              />
            </div>
          </div>

          {/* GPS My Location Button */}
          <button
            type="button"
            onClick={handleLocateUser}
            disabled={isLocatingUser}
            className="absolute bottom-36 sm:bottom-28 right-3.5 sm:right-4 z-[500] w-11 h-11 rounded-2xl bg-white border border-neutral-200/90 text-neutral-700 hover:text-black flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
            title="Đến vị trí của tôi"
          >
            {isLocatingUser ? (
              <Loader2 className="w-5 h-5 animate-spin text-black" />
            ) : (
              <Navigation className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Bottom Floating Card: Resolved Address & Confirm Button */}
        <div className="p-3.5 sm:p-5 bg-white border-t border-neutral-100 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] z-[1000] space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800 shrink-0 mt-0.5">
              <MapPin className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Vị trí đã chọn
                </h4>
                {isGeocoding && (
                  <span className="text-[10px] text-neutral-400 flex items-center gap-1 font-medium">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    Đang quét tên đường...
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-neutral-800 font-semibold line-clamp-2 leading-snug mt-0.5">
                {resolvedAddress}
              </p>
              <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                {currentCoords.latitude.toFixed(5)}, {currentCoords.longitude.toFixed(5)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="w-full h-11 sm:h-12 rounded-2xl bg-black text-white text-xs sm:text-sm font-bold hover:bg-neutral-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Xác nhận chọn vị trí này</span>
          </button>
        </div>
      </div>
    </div>
  );
}
