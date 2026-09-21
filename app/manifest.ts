import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'animon — Sổ tay quán ăn cho giới trẻ',
    short_name: 'animon',
    description: 'Sổ tay quán ăn & cafe chuẩn gu giới trẻ. Tối giản, tốc độ và không quảng cáo.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
