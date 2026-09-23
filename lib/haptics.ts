/**
 * animon Haptic Feedback Engine
 * Provides subtle tactile feedback on mobile devices using navigator.vibrate
 */

export type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning';

export function triggerHaptic(type: HapticType = 'light') {
  if (typeof window === 'undefined') return;

  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      switch (type) {
        case 'light':
          // Subtle micro-tap (e.g. scroll to top, share, open modal)
          navigator.vibrate(12);
          break;
        case 'selection':
          // Crisp tick on tab switch or category filter
          navigator.vibrate(8);
          break;
        case 'medium':
          // Tactile bump on bookmarking, dice rolling, opening receipt
          navigator.vibrate(24);
          break;
        case 'heavy':
          // Solid tap on delete or primary confirm
          navigator.vibrate(45);
          break;
        case 'success':
          // Double-pulse celebration for saved spot or exported receipt
          navigator.vibrate([16, 50, 24]);
          break;
        case 'warning':
          // Warning alert vibration
          navigator.vibrate([35, 60, 35]);
          break;
        default:
          navigator.vibrate(15);
      }
    }
  } catch {
    // Graceful fallback for non-supporting browsers or blocked permissions
  }
}
