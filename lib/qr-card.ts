import QRCode from 'qrcode';
import { Spot } from '@/types/spot';

export type QrCardTheme = 'light' | 'dark';

// Helper to wrap text into lines based on canvas measurement
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0] || '';

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine + ' ' + word;
    const width = ctx.measureText(testLine).width;
    if (width < maxWidth) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// Helper to draw rounded rectangles compatible with all browsers
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

// Draw corner register cross mark '+'
function drawCross(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size, y);
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size);
  ctx.stroke();
}

// Draw camera viewfinder corner focus brackets '┌ ┐ └ ┘'
function drawFocusBrackets(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  bracketLen: number,
  color: string,
  lineWidth: number = 3.5
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Top-Left
  ctx.beginPath();
  ctx.moveTo(x, y + bracketLen);
  ctx.lineTo(x, y);
  ctx.lineTo(x + bracketLen, y);
  ctx.stroke();

  // Top-Right
  ctx.beginPath();
  ctx.moveTo(x + w - bracketLen, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + bracketLen);
  ctx.stroke();

  // Bottom-Left
  ctx.beginPath();
  ctx.moveTo(x, y + h - bracketLen);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + bracketLen, y + h);
  ctx.stroke();

  // Bottom-Right
  ctx.beginPath();
  ctx.moveTo(x + w - bracketLen, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y + h - bracketLen);
  ctx.stroke();
}

// Draw decorative ticket barcode
function drawDecorativeBarcode(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  color: string
) {
  const bars = [3, 1, 4, 2, 5, 2, 1, 3, 2, 4, 6, 2, 3, 1, 4, 2, 5, 1, 3, 4, 2, 1, 5, 3, 2, 4];
  ctx.fillStyle = color;
  let currentX = startX;
  const height = 24;

  for (let i = 0; i < bars.length; i++) {
    const width = bars[i];
    if (i % 2 === 0) {
      ctx.fillRect(currentX, startY, width, height);
    }
    currentX += width + 1.5;
  }
}

/**
 * Generates an aesthetic, magazine-grade branded QR Card for a spot.
 * Resolution: 800 x (1120 to 1200) px (Retina 2x, print-ready standee).
 */
export async function generateBrandedQrCard(
  spot: Spot,
  shareUrl: string,
  theme: QrCardTheme = 'light'
): Promise<{ blob: Blob; dataUrl: string }> {
  const isDark = theme === 'dark';

  // Palette definition
  const colors = {
    bg: isDark ? '#0c0c0d' : '#ffffff',
    cardBorder: isDark ? '#262626' : '#e5e5e5',
    innerBorder: isDark ? '#1a1a1a' : '#f0f0f0',
    cross: isDark ? '#404040' : '#cccccc',
    textPrimary: isDark ? '#ffffff' : '#0a0a0a',
    textSecondary: isDark ? '#999999' : '#5c5c5c',
    divider: isDark ? '#222222' : '#eeeeee',
    badgeBg: isDark ? '#1a1a1a' : '#f5f5f5',
    badgeBorder: isDark ? '#333333' : '#e5e5e5',
    badgeText: isDark ? '#f0f0f0' : '#171717',
    bracket: isDark ? '#ffffff' : '#000000',
    qrContainerBg: isDark ? '#ffffff' : '#fafafa',
    qrContainerBorder: isDark ? '#ffffff' : '#eaeaea',
    ctaBg: isDark ? '#ffffff' : '#000000',
    ctaText: isDark ? '#000000' : '#ffffff',
    noteBg: isDark ? '#171717' : '#f7f7f7',
    noteBorder: isDark ? '#2a2a2a' : '#e5e5e5',
    noteText: isDark ? '#d4d4d4' : '#333333',
    barcode: isDark ? '#aaaaaa' : '#222222',
  };

  // 1. Generate High-Res QR code
  const qrDataUrl = await QRCode.toDataURL(shareUrl, {
    width: 440,
    margin: 1.5,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });

  const qrImg = new Image();
  await new Promise<void>((resolve, reject) => {
    qrImg.onload = () => resolve();
    qrImg.onerror = (e) => reject(e);
    qrImg.src = qrDataUrl;
  });

  // Calculate dynamic canvas dimensions based on note existence
  const hasNote = Boolean(spot.note && spot.note.trim().length > 0);
  const width = 800;
  const height = hasNote ? 1100 : 1000;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get 2D context');

  // Background
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, width, height);

  // Outer Card Frame
  ctx.strokeStyle = colors.cardBorder;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  drawRoundedRect(ctx, 24, 24, width - 48, height - 48, 32);
  ctx.stroke();

  // Subtle Inner Frame Line
  ctx.strokeStyle = colors.innerBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  drawRoundedRect(ctx, 40, 40, width - 80, height - 80, 24);
  ctx.stroke();

  // Corner Register Cross Marks '+'
  ctx.strokeStyle = colors.cross;
  ctx.lineWidth = 1.5;
  drawCross(ctx, 40, 40, 6);
  drawCross(ctx, width - 40, 40, 6);
  drawCross(ctx, 40, height - 40, 6);
  drawCross(ctx, width - 40, height - 40, 6);

  // ==========================================
  // 1. Header: Brand Logo & Editorial Header
  // ==========================================
  // Squircle icon background
  ctx.fillStyle = isDark ? '#ffffff' : '#000000';
  ctx.beginPath();
  drawRoundedRect(ctx, 58, 58, 48, 48, 14);
  ctx.fill();

  // Logo letter "a" inside squircle
  ctx.fillStyle = isDark ? '#000000' : '#ffffff';
  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('a', 58 + 24, 58 + 24);

  // Brand text
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = colors.textPrimary;
  ctx.font = 'bold 25px system-ui, -apple-system, sans-serif';
  ctx.fillText('animon', 118, 58);

  ctx.fillStyle = colors.textSecondary;
  ctx.font = '600 11px system-ui, -apple-system, sans-serif';
  ctx.fillText('CURATED FOOD ARCHIVE // VIETNAM', 118, 88);

  // Category Pill Badge (Top Right)
  if (spot.category) {
    const categoryText = spot.category.toUpperCase();
    ctx.font = '700 13px system-ui, -apple-system, sans-serif';
    const catWidth = ctx.measureText(categoryText).width + 36;
    const catX = width - 58 - catWidth;
    const catY = 62;

    ctx.fillStyle = colors.badgeBg;
    ctx.beginPath();
    drawRoundedRect(ctx, catX, catY, catWidth, 38, 19);
    ctx.fill();
    ctx.strokeStyle = colors.badgeBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = colors.badgeText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(categoryText, catX + catWidth / 2, catY + 19);
  }

  // Header separator
  ctx.strokeStyle = colors.divider;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(58, 126);
  ctx.lineTo(width - 58, 126);
  ctx.stroke();

  // ==========================================
  // 2. Spot Details (Name, Address, Note)
  // ==========================================
  let currentY = 150;

  // Spot Name (Bold, Editorial Impact)
  ctx.fillStyle = colors.textPrimary;
  ctx.font = 'bold 35px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const nameLines = wrapText(ctx, spot.name, 660).slice(0, 2);
  for (const line of nameLines) {
    ctx.fillText(line, width / 2, currentY);
    currentY += 42;
  }

  // Spot Address
  currentY += 4;
  ctx.fillStyle = colors.textSecondary;
  ctx.font = '500 16px system-ui, -apple-system, sans-serif';
  const addressLines = wrapText(ctx, `📍 ${spot.address}`, 640).slice(0, 2);
  for (const line of addressLines) {
    ctx.fillText(line, width / 2, currentY);
    currentY += 24;
  }

  // Spot Note / Pro-tip (if exists)
  if (hasNote && spot.note) {
    currentY += 12;
    ctx.font = 'italic 15px system-ui, -apple-system, sans-serif';
    const noteContent = `“ ${spot.note.trim()} ”`;
    const noteLines = wrapText(ctx, noteContent, 580).slice(0, 2);
    const noteBoxHeight = noteLines.length * 22 + 16;
    const noteBoxWidth = Math.min(640, Math.max(...noteLines.map(l => ctx.measureText(l).width)) + 48);
    const noteBoxX = (width - noteBoxWidth) / 2;

    ctx.fillStyle = colors.noteBg;
    ctx.beginPath();
    drawRoundedRect(ctx, noteBoxX, currentY, noteBoxWidth, noteBoxHeight, 14);
    ctx.fill();
    ctx.strokeStyle = colors.noteBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = colors.noteText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    let noteTextY = currentY + 9;
    for (const line of noteLines) {
      ctx.fillText(line, width / 2, noteTextY);
      noteTextY += 22;
    }
    currentY += noteBoxHeight + 8;
  }

  // ==========================================
  // 3. QR Section (Camera Viewfinder Centerpiece)
  // ==========================================
  const footerY = height - 88;
  const qrBoxSize = 430;
  const qrBoxX = (width - qrBoxSize) / 2;
  const remainingSpace = footerY - currentY;
  const qrBoxY = currentY + Math.max(16, (remainingSpace - qrBoxSize) / 2);

  // Viewfinder Outer Corner Brackets
  drawFocusBrackets(
    ctx,
    qrBoxX,
    qrBoxY,
    qrBoxSize,
    qrBoxSize,
    28,
    colors.bracket,
    3.5
  );

  // QR Container Card
  const qrInnerMargin = 16;
  const qrCardX = qrBoxX + qrInnerMargin;
  const qrCardY = qrBoxY + qrInnerMargin;
  const qrCardSize = qrBoxSize - qrInnerMargin * 2;

  ctx.fillStyle = colors.qrContainerBg;
  ctx.beginPath();
  drawRoundedRect(ctx, qrCardX, qrCardY, qrCardSize, qrCardSize, 24);
  ctx.fill();
  ctx.strokeStyle = colors.qrContainerBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Draw QR Image Centered
  const qrImgSize = 340;
  const qrImgX = (width - qrImgSize) / 2;
  const qrImgY = qrCardY + (qrCardSize - qrImgSize) / 2;
  ctx.drawImage(qrImg, qrImgX, qrImgY, qrImgSize, qrImgSize);

  // Center Monogram Logo on QR Code
  const centerLogoSize = 56;
  const centerLogoX = (width - centerLogoSize) / 2;
  const centerLogoY = qrImgY + (qrImgSize - centerLogoSize) / 2;

  // White halo behind center logo
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  drawRoundedRect(ctx, centerLogoX - 4, centerLogoY - 4, centerLogoSize + 8, centerLogoSize + 8, 16);
  ctx.fill();

  // Black center squircle
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  drawRoundedRect(ctx, centerLogoX, centerLogoY, centerLogoSize, centerLogoSize, 14);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('a', centerLogoX + centerLogoSize / 2, centerLogoY + centerLogoSize / 2);

  // ==========================================
  // 4. Footer: Ticket Barcode & Authenticity
  // ==========================================

  // Footer separator
  ctx.strokeStyle = colors.divider;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(58, footerY);
  ctx.lineTo(width - 58, footerY);
  ctx.stroke();

  // Left: Decorative Ticket Barcode
  drawDecorativeBarcode(ctx, 58, footerY + 20, colors.barcode);

  ctx.fillStyle = colors.textSecondary;
  ctx.font = '600 11px monospace, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('ANIMON // #FOOD-COLLECTION', 58, footerY + 50);

  // Right: Domain & Motto
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillStyle = colors.textPrimary;
  ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
  ctx.fillText('animon.io.vn', width - 58, footerY + 18);

  ctx.fillStyle = colors.textSecondary;
  ctx.font = '600 11px system-ui, -apple-system, sans-serif';
  ctx.fillText('SỔ TAY ẨM THỰC CHUẨN GU GIỚI TRẺ', width - 58, footerY + 46);

  // Convert to DataURL & Blob
  const dataUrl = canvas.toDataURL('image/png');
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Canvas to Blob failed'));
    }, 'image/png');
  });

  return { blob, dataUrl };
}

/**
 * Generates raw QR Code Blob & Data URL for sticker printing.
 */
export async function generateRawQr(
  shareUrl: string
): Promise<{ blob: Blob; dataUrl: string }> {
  const dataUrl = await QRCode.toDataURL(shareUrl, {
    width: 600,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });

  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return { blob, dataUrl };
}

/**
 * Smart download / save function that handles Mobile (iOS/Android) and Desktop seamlessly.
 * Uses Web Share API (File) when available so iOS pops up "Save Image to Camera Roll",
 * and falls back to clean Blob download links for Desktop.
 */
export async function downloadOrShareImage(
  blob: Blob,
  filename: string,
  title: string,
  text: string
): Promise<'shared' | 'downloaded' | 'manual'> {
  // 1. Web Share API with File (iOS Safari & Android Chrome)
  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: title,
          text: text,
        });
        return 'shared';
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return 'shared';
      }
      console.warn('Web Share API failed, falling back to download:', err);
    }
  }

  // 2. Fallback to Blob object URL download (Desktop / Android fallback)
  try {
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, 1500);
    return 'downloaded';
  } catch (err) {
    console.error('Download link failed:', err);
    return 'manual';
  }
}
