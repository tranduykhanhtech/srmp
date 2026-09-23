import { Spot } from '@/types/spot';

export interface ReceiptData {
  userName: string;
  sourceLabel: string;
  spots: Spot[];
  dateStr?: string;
  orderNumber?: string;
}

/**
 * Generates a high-resolution PNG Blob of the Gourmet Receipt using HTML5 Canvas.
 */
export async function generateReceiptCanvasBlob(data: ReceiptData): Promise<Blob | null> {
  if (typeof window === 'undefined') return null;

  const width = 720;
  const paddingX = 48;
  const headerHeight = 270;
  const itemHeight = 64;
  const spotCount = Math.min(data.spots.length, 12);
  const itemsHeight = spotCount * itemHeight;
  const summaryHeight = 280;
  const footerHeight = 220;
  const height = headerHeight + itemsHeight + summaryHeight + footerHeight;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background - Thermal receipt paper tint
  ctx.fillStyle = '#fbfbfa';
  ctx.fillRect(0, 0, width, height);

  // Perforated / Zigzag paper edges
  const toothSize = 12;
  const teethCount = Math.floor(width / toothSize);

  // Top zigzag teeth (cutout)
  ctx.fillStyle = '#000000';
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i <= teethCount; i++) {
    const x = i * toothSize;
    ctx.lineTo(x, i % 2 === 0 ? 0 : 8);
  }
  ctx.lineTo(width, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  // Clear top teeth
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.restore();

  // Draw border outline
  ctx.strokeStyle = '#e5e5e3';
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, width - 12, height - 12);

  // Helpers
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const drawDashedLine = (y: number, char = '-') => {
    ctx.fillStyle = '#6b7280';
    ctx.font = '16px monospace';
    const text = char.repeat(46);
    ctx.textAlign = 'center';
    ctx.fillText(text, width / 2, y);
    ctx.textAlign = 'left';
  };

  const drawDoubleLine = (y: number) => {
    drawDashedLine(y, '=');
  };

  let currentY = 32;

  // 1. Header
  ctx.fillStyle = '#09090b';
  ctx.textAlign = 'center';
  ctx.font = '900 32px monospace';
  ctx.fillText('*** A N I M O N ***', width / 2, currentY);

  currentY += 40;
  ctx.font = 'bold 15px monospace';
  ctx.fillStyle = '#27272a';
  ctx.fillText('SỔ TAY ẨM THỰC CHUẨN GU', width / 2, currentY);

  currentY += 24;
  ctx.font = '13px monospace';
  ctx.fillStyle = '#71717a';
  ctx.fillText('TỐI GIẢN • TỐC ĐỘ • KHÔNG QUẢNG CÁO', width / 2, currentY);

  currentY += 28;
  drawDashedLine(currentY);

  // Order Details
  currentY += 26;
  ctx.textAlign = 'left';
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#18181b';

  const now = new Date();
  const dateFormatted = data.dateStr || `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const orderId = data.orderNumber || `#${Math.floor(100000 + Math.random() * 900000)}`;

  ctx.fillText(`ORDER: ${orderId}`, paddingX, currentY);
  ctx.textAlign = 'right';
  ctx.fillText(`NGÀY: ${dateFormatted}`, width - paddingX, currentY);

  currentY += 24;
  ctx.textAlign = 'left';
  ctx.fillText(`THỰC KHÁCH: ${(data.userName || 'TÍN ĐỒ ẨM THỰC').toUpperCase()}`, paddingX, currentY);
  ctx.textAlign = 'right';
  ctx.fillText(`BỘ LỌC: ${data.sourceLabel.toUpperCase()}`, width - paddingX, currentY);

  currentY += 28;
  drawDoubleLine(currentY);

  // Table Column Header
  currentY += 26;
  ctx.textAlign = 'left';
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = '#52525b';
  ctx.fillText('STT  TÊN QUÁN & ĐỊA ĐIỂM', paddingX, currentY);
  ctx.textAlign = 'right';
  ctx.fillText('PHÂN LOẠI', width - paddingX, currentY);

  currentY += 22;
  drawDashedLine(currentY);
  currentY += 24;

  // 2. Spots List
  const displayedSpots = data.spots.slice(0, spotCount);

  displayedSpots.forEach((spot, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    const rawName = spot.name.toUpperCase();
    const truncatedName = rawName.length > 25 ? rawName.slice(0, 24) + '…' : rawName;
    const cat = (spot.category || 'MÓN NGON').toUpperCase();
    const rawAddress = (spot.address || '').trim();
    const cleanAddress = rawAddress.length > 40 ? rawAddress.slice(0, 39) + '…' : rawAddress;

    // Spot Name & Category
    ctx.textAlign = 'left';
    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = '#09090b';
    ctx.fillText(`${num}  ${truncatedName}`, paddingX, currentY);

    ctx.textAlign = 'right';
    ctx.font = '13px monospace';
    ctx.fillStyle = '#3f3f46';
    ctx.fillText(`[${cat}]`, width - paddingX, currentY);

    // Spot Address
    currentY += 20;
    ctx.textAlign = 'left';
    ctx.font = '12px monospace';
    ctx.fillStyle = '#71717a';
    ctx.fillText(`    ${cleanAddress || 'Việt Nam'}`, paddingX, currentY);

    currentY += 36;
  });

  if (displayedSpots.length === 0) {
    ctx.textAlign = 'center';
    ctx.font = 'italic 14px monospace';
    ctx.fillStyle = '#71717a';
    ctx.fillText('(Chưa lưu quán nào - Khám phá các quán ngon bên ngoài nhé!)', width / 2, currentY + 10);
    currentY += 50;
  }

  // 3. Summary Section
  drawDashedLine(currentY);
  currentY += 26;

  // Most common category
  const catCount: Record<string, number> = {};
  data.spots.forEach((s) => {
    if (s.category) catCount[s.category] = (catCount[s.category] || 0) + 1;
  });
  let topCat = 'ĐA DẠNG';
  let maxCount = 0;
  Object.entries(catCount).forEach(([c, cnt]) => {
    if (cnt > maxCount) {
      maxCount = cnt;
      topCat = c.toUpperCase();
    }
  });

  const drawRow = (label: string, value: string, isBold = false) => {
    ctx.textAlign = 'left';
    ctx.font = isBold ? 'bold 14px monospace' : '13px monospace';
    ctx.fillStyle = isBold ? '#09090b' : '#3f3f46';
    ctx.fillText(label, paddingX, currentY);

    ctx.textAlign = 'right';
    ctx.fillText(value, width - paddingX, currentY);
    currentY += 22;
  };

  drawRow('TỔNG SỐ QUÁN ĐÃ LƯU:', `${data.spots.length} ĐỊA ĐIỂM`);
  drawRow('GU ẨM THỰC CHÍNH:', topCat);
  drawRow('VIBE CHECK:', '100% CHUẨN GU (CHÂN ÁI)');
  drawRow('PHÍ QUẢNG CÁO / SEEDING:', '0 VND (FREE FOREVER)');
  currentY += 4;
  drawDashedLine(currentY);
  currentY += 26;
  drawRow('TỔNG CỘNG:', 'VÔ GIÁ (PRICELESS)', true);
  drawRow('HÌNH THỨC THANH TOÁN:', 'THANH TOÁN BẰNG ĐAM MÊ');

  currentY += 10;
  drawDoubleLine(currentY);

  // 4. Footer & Barcode
  currentY += 30;
  ctx.textAlign = 'center';
  ctx.font = 'bold 15px monospace';
  ctx.fillStyle = '#09090b';
  ctx.fillText('CẢM ƠN QUÝ KHÁCH ĐÃ TIN DÙNG!', width / 2, currentY);

  currentY += 22;
  ctx.font = '12px monospace';
  ctx.fillStyle = '#71717a';
  ctx.fillText('HÓA ĐƠN KHÔNG CÓ GIÁ TRỊ TÍNH TIỀN,', width / 2, currentY);
  currentY += 18;
  ctx.fillText('CHỈ CÓ GIÁ TRỊ NẰM TRONG BỤNG 🍜', width / 2, currentY);

  // Draw Realistic Barcode
  currentY += 28;
  const barcodeWidth = 440;
  const barcodeHeight = 44;
  const barcodeX = (width - barcodeWidth) / 2;

  ctx.fillStyle = '#09090b';
  let bx = barcodeX;
  const barPattern = [
    3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 4, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 4,
    1, 2, 3, 1, 4, 2, 1, 3, 2,
  ];

  barPattern.forEach((w, i) => {
    if (i % 2 === 0) {
      ctx.fillRect(bx, currentY, w * 2.2, barcodeHeight);
    }
    bx += w * 2.2 + 2;
  });

  currentY += barcodeHeight + 14;
  ctx.font = '12px monospace';
  ctx.fillStyle = '#52525b';
  ctx.fillText('ANIMON-REAL-TASTE-2026', width / 2, currentY);

  currentY += 22;
  ctx.font = '11px monospace';
  ctx.fillStyle = '#a1a1aa';
  ctx.fillText('https://animon.io.vn • Sổ tay quán ăn cho giới trẻ', width / 2, currentY);

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/png');
  });
}
