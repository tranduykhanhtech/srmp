/**
 * Tiện ích địa lý & tọa độ cho animon
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Bóc tách tọa độ (lat, lng) từ URL Google Maps
 * Hỗ trợ các định dạng phổ biến:
 * - https://www.google.com/maps/place/.../@10.776889,106.700806,17z/...
 * - https://maps.google.com/?q=10.776889,106.700806
 * - https://www.google.com/maps?ll=10.776889,106.700806
 * - https://www.google.com/maps/dir/?api=1&destination=10.776889,106.700806
 */
export function extractCoordinatesFromUrl(url: string): Coordinates | null {
  if (!url || typeof url !== 'string') return null;

  try {
    // 1. Dạng /@10.776889,106.700806
    const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      if (isValidCoord(lat, lng)) return { latitude: lat, longitude: lng };
    }

    // 2. Dạng ?q=10.776889,106.700806 hoặc ?ll=... hoặc &destination=...
    const paramMatch = url.match(/[?&](?:q|ll|destination)=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (paramMatch) {
      const lat = parseFloat(paramMatch[1]);
      const lng = parseFloat(paramMatch[2]);
      if (isValidCoord(lat, lng)) return { latitude: lat, longitude: lng };
    }

    // 3. Dạng search trực tiếp 10.776889,106.700806
    const rawMatch = url.match(/(-?\d{1,2}\.\d{4,}),\s*(-?\d{1,3}\.\d{4,})/);
    if (rawMatch) {
      const lat = parseFloat(rawMatch[1]);
      const lng = parseFloat(rawMatch[2]);
      if (isValidCoord(lat, lng)) return { latitude: lat, longitude: lng };
    }
  } catch (err) {
    console.warn('Lỗi trích xuất tọa độ:', err);
  }

  return null;
}

function isValidCoord(lat: number, lng: number): boolean {
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Tính khoảng cách giữa 2 điểm tọa độ theo công thức Haversine (đơn vị: km)
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Bán kính Trái Đất theo km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Định dạng khoảng cách thân thiện cho người dùng Việt Nam
 * Ví dụ: 350m, 1.2 km, 15 km
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters}m`;
  }
  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km`;
  }
  return `${Math.round(distanceKm)} km`;
}

/**
 * Tự động tìm kiếm tọa độ (latitude, longitude) từ chuỗi địa chỉ văn bản
 * Sử dụng OpenStreetMap Nominatim hoàn toàn miễn phí
 */
export async function geocodeAddressViaNominatim(address: string): Promise<Coordinates | null> {
  if (!address || typeof address !== 'string' || address.trim().length < 3) return null;

  // 1. Thử nguyên văn trước
  // 2. Nếu không ra, bỏ bớt số nhà và ký tự đầu để tìm tên đường + quận/huyện
  const queries = [
    address.trim(),
    address.replace(/^[\d\s\-\/\,]+[a-zA-Z]?\s+(?:Đ\.|Đường|Phố|Ngõ|Hẻm)?/i, '').trim(),
  ].filter((q, idx, arr) => q.length >= 3 && arr.indexOf(q) === idx);

  for (const q of queries) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          q
        )}&countrycodes=vn&limit=1`,
        {
          headers: {
            'Accept-Language': 'vi,en;q=0.9',
          },
        }
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        if (isValidCoord(lat, lon)) {
          return { latitude: lat, longitude: lon };
        }
      }
    } catch {
      // bỏ qua nếu lỗi mạng và thử tiếp
    }
  }

  return null;
}

