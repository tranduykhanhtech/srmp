'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';

interface DraggableFabProps {
  onClick: () => void;
}

export default function DraggableFab({ onClick }: DraggableFabProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // References for drag calculations
  const dragInfo = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    hasMoved: boolean;
  }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    hasMoved: false,
  });

  const buttonSize = 56; // 56px = 14 * 4
  const padding = 16;

  // Initialize position at bottom-right corner on mount
  useEffect(() => {
    const updateDefaultPosition = () => {
      if (typeof window !== 'undefined') {
        const defaultX = window.innerWidth - buttonSize - 20;
        const defaultY = window.innerHeight - buttonSize - 32;
        setPosition((prev) => {
          if (!prev) return { x: defaultX, y: defaultY };
          // Keep within bounds on window resize
          const clampedX = Math.min(Math.max(padding, prev.x), window.innerWidth - buttonSize - padding);
          const clampedY = Math.min(Math.max(padding, prev.y), window.innerHeight - buttonSize - padding);
          return { x: clampedX, y: clampedY };
        });
      }
    };

    updateDefaultPosition();
    window.addEventListener('resize', updateDefaultPosition);
    return () => window.removeEventListener('resize', updateDefaultPosition);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!position) return;

    // Capture pointer so dragging doesn't break if cursor leaves button
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    dragInfo.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
      hasMoved: false,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;

    const dx = e.clientX - dragInfo.current.startX;
    const dy = e.clientY - dragInfo.current.startY;

    // Check if movement exceeds threshold (5px)
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragInfo.current.hasMoved = true;
    }

    if (dragInfo.current.hasMoved) {
      const newX = dragInfo.current.initialX + dx;
      const newY = dragInfo.current.initialY + dy;

      const clampedX = Math.min(
        Math.max(padding, newX),
        window.innerWidth - buttonSize - padding
      );
      const clampedY = Math.min(
        Math.max(padding, newY),
        window.innerHeight - buttonSize - padding
      );

      setPosition({ x: clampedX, y: clampedY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;
    setIsDragging(false);

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    // If user didn't drag (or moved <= 4px), treat as tap/click
    if (!dragInfo.current.hasMoved) {
      onClick();
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Don't render until client position is ready to prevent hydration flash
  if (!position) return null;

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        touchAction: 'none', // Critical: prevents browser scrolling while dragging
      }}
      className={`fixed top-0 left-0 z-50 w-14 h-14 rounded-full bg-black text-white shadow-[0_8px_30px_rgba(0,0,0,0.35)] border border-neutral-800 flex items-center justify-center select-none cursor-grab active:cursor-grabbing transition-shadow ${
        isDragging ? 'scale-105 shadow-[0_14px_40px_rgba(0,0,0,0.5)] opacity-95' : 'hover:scale-105 active:scale-95'
      }`}
      title="Kéo để di chuyển • Chạm để thêm quán"
      aria-label="Thêm địa điểm mới"
    >
      <Plus className="w-6 h-6 stroke-[2.6] pointer-events-none" />
    </button>
  );
}
