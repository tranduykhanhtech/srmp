'use client';

import React from 'react';
import { 
  Heart, 
  Users, 
  Moon, 
  Coffee, 
  Utensils, 
  Zap, 
  Compass, 
  Tag 
} from 'lucide-react';

interface CategoryIconProps {
  category: string;
  className?: string;
}

export default function CategoryIcon({ category, className = "w-3.5 h-3.5" }: CategoryIconProps) {
  const norm = category.toLowerCase();
  
  if (norm === 'tất cả' || norm === 'all') {
    return <Compass className={className} />;
  }
  if (norm.includes('hẹn hò') || norm.includes('date') || norm.includes('lãng mạn')) {
    return <Heart className={className} />;
  }
  if (norm.includes('tụ họp') || norm.includes('bạn bè') || norm.includes('nhóm')) {
    return <Users className={className} />;
  }
  if (norm.includes('cú đêm') || norm.includes('đêm') || norm.includes('24/7') || norm.includes('night')) {
    return <Moon className={className} />;
  }
  if (norm.includes('cafe') || norm.includes('cà phê') || norm.includes('coffee') || norm.includes('chill')) {
    return <Coffee className={className} />;
  }
  if (norm.includes('ăn vặt') || norm.includes('ăn uống') || norm.includes('food')) {
    return <Utensils className={className} />;
  }
  if (norm.includes('deadline') || norm.includes('làm việc') || norm.includes('học')) {
    return <Zap className={className} />;
  }

  return <Tag className={className} />;
}
