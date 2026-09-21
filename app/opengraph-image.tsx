import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'animon - Sổ tay quán ăn cho giới trẻ';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#ffffff',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          border: '16px solid #f5f5f5',
          padding: '40px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '90px',
            height: '90px',
            borderRadius: '24px',
            background: '#000000',
            color: '#ffffff',
            fontSize: '52px',
            fontWeight: 800,
            marginBottom: '28px',
          }}
        >
          a
        </div>
        <div
          style={{
            fontSize: '72px',
            fontWeight: 900,
            color: '#000000',
            letterSpacing: '-2px',
            marginBottom: '16px',
          }}
        >
          animon
        </div>
        <div
          style={{
            fontSize: '28px',
            color: '#555555',
            fontWeight: 500,
            letterSpacing: '-0.5px',
            marginBottom: '36px',
          }}
        >
          Sổ tay quán ăn &amp; cafe chuẩn gu giới trẻ
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: '#000000',
            color: '#ffffff',
            padding: '12px 28px',
            borderRadius: '999px',
            fontSize: '20px',
            fontWeight: 600,
          }}
        >
          animon.io.vn
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
