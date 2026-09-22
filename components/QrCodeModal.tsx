'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  QrCode,
  Download,
  Copy,
  Check,
  Sparkles,
  Sun,
  Moon,
  Loader2,
} from 'lucide-react';
import { Spot } from '@/types/spot';
import {
  generateBrandedQrCard,
  generateRawQr,
  downloadOrShareImage,
  QrCardTheme,
} from '@/lib/qr-card';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  spot: Spot | null;
  onShowToast?: (msg: string) => void;
}

export default function QrCodeModal({
  isOpen,
  onClose,
  spot,
  onShowToast,
}: QrCodeModalProps) {
  const [selectedStyle, setSelectedStyle] = useState<'light' | 'dark' | 'raw'>('light');
  const [lightCardDataUrl, setLightCardDataUrl] = useState<string>('');
  const [lightCardBlob, setLightCardBlob] = useState<Blob | null>(null);
  const [darkCardDataUrl, setDarkCardDataUrl] = useState<string>('');
  const [darkCardBlob, setDarkCardBlob] = useState<Blob | null>(null);
  const [rawQrDataUrl, setRawQrDataUrl] = useState<string>('');
  const [rawQrBlob, setRawQrBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== 'undefined' && spot
      ? `${window.location.origin}/?spot=${spot.id}`
      : spot
      ? `https://animon.io.vn/?spot=${spot.id}`
      : '';

  useEffect(() => {
    let isCancelled = false;

    if (isOpen && spot) {
      setIsGenerating(true);

      const prepareAssets = async () => {
        try {
          // Pre-generate Light Card, Dark Luxury Card, and Raw QR concurrently
          const [lightRes, darkRes, rawRes] = await Promise.all([
            generateBrandedQrCard(spot, shareUrl, 'light'),
            generateBrandedQrCard(spot, shareUrl, 'dark'),
            generateRawQr(shareUrl),
          ]);

          if (!isCancelled) {
            setLightCardDataUrl(lightRes.dataUrl);
            setLightCardBlob(lightRes.blob);
            setDarkCardDataUrl(darkRes.dataUrl);
            setDarkCardBlob(darkRes.blob);
            setRawQrDataUrl(rawRes.dataUrl);
            setRawQrBlob(rawRes.blob);
            setIsGenerating(false);
          }
        } catch (err) {
          console.error('Lỗi khởi tạo thẻ QR:', err);
          if (!isCancelled) setIsGenerating(false);
        }
      };

      prepareAssets();
    } else {
      // Reset state on close
      setLightCardDataUrl('');
      setLightCardBlob(null);
      setDarkCardDataUrl('');
      setDarkCardBlob(null);
      setRawQrDataUrl('');
      setRawQrBlob(null);
      setSelectedStyle('light');
      setIsGenerating(true);
      setIsSaving(false);
    }

    return () => {
      isCancelled = true;
    };
  }, [isOpen, spot, shareUrl]);

  if (!isOpen || !spot) return null;

  const sanitizedSpotName = spot.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-');

  // Active asset based on current style
  const activeBlob =
    selectedStyle === 'dark'
      ? darkCardBlob
      : selectedStyle === 'raw'
      ? rawQrBlob
      : lightCardBlob;

  const activeDataUrl =
    selectedStyle === 'dark'
      ? darkCardDataUrl
      : selectedStyle === 'raw'
      ? rawQrDataUrl
      : lightCardDataUrl;

  // Handle Save / Download
  const handleSaveActive = async () => {
    if (!activeBlob) return;
    setIsSaving(true);
    try {
      const suffix =
        selectedStyle === 'dark'
          ? 'card-dark'
          : selectedStyle === 'raw'
          ? 'qr'
          : 'card-light';
      const filename = `animon-${sanitizedSpotName}-${suffix}.png`;
      const title = `Mã QR ${spot.name} - animon`;
      const text = `Thẻ mã QR quán ${spot.name} trên animon.io.vn`;

      const result = await downloadOrShareImage(activeBlob, filename, title, text);

      if (result === 'downloaded') {
        onShowToast?.('Đã tải ảnh về máy thành công!');
      } else if (result === 'shared') {
        onShowToast?.('Đã mở menu lưu / chia sẻ ảnh!');
      } else {
        onShowToast?.('Bạn có thể chạm giữ vào ảnh để chọn "Lưu vào Ảnh"!');
      }
    } catch (err) {
      console.error('Lỗi lưu ảnh:', err);
      onShowToast?.('Chạm giữ ảnh 1 giây để lưu vào Thư viện ảnh.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      onShowToast?.('Đã chép link quán');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm sm:max-w-md bg-white border border-neutral-200 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3.5 animate-in zoom-in-95 duration-200 max-h-[94vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center shadow-xs">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-neutral-900 leading-tight">
                Thẻ QR Quán Ăn
              </h3>
              <p className="text-[11px] text-neutral-500">
                In để bàn quán, chia sẻ story hoặc dán sticker
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-black rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Style Selector: Light / Dark / Raw */}
        <div className="grid grid-cols-3 p-1 bg-neutral-100 rounded-xl text-xs font-semibold shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setSelectedStyle('light')}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
              selectedStyle === 'light'
                ? 'bg-white text-black shadow-xs font-bold'
                : 'text-neutral-500 hover:text-black'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            Bản Trắng
          </button>
          <button
            type="button"
            onClick={() => setSelectedStyle('dark')}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
              selectedStyle === 'dark'
                ? 'bg-neutral-900 text-white shadow-xs font-bold'
                : 'text-neutral-500 hover:text-black'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            Bản Đen
          </button>
          <button
            type="button"
            onClick={() => setSelectedStyle('raw')}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
              selectedStyle === 'raw'
                ? 'bg-white text-black shadow-xs font-bold'
                : 'text-neutral-500 hover:text-black'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            QR Vuông
          </button>
        </div>

        {/* Live Preview Screen */}
        <div
          className={`flex-1 overflow-y-auto min-h-0 flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-2xl border transition-colors duration-200 ${
            selectedStyle === 'dark'
              ? 'bg-neutral-950 border-neutral-800'
              : 'bg-neutral-50 border-neutral-200/80'
          }`}
        >
          {isGenerating ? (
            <div className="py-14 flex flex-col items-center justify-center gap-3 text-neutral-400">
              <Loader2 className="w-7 h-7 animate-spin text-black dark:text-white" />
              <p className="text-xs font-medium">Đang xuất thẻ chất lượng cao 2x...</p>
            </div>
          ) : selectedStyle === 'raw' && rawQrDataUrl ? (
            <div className="py-4 flex flex-col items-center justify-center space-y-3">
              <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-md">
                <img
                  src={rawQrDataUrl}
                  alt={`Mã QR ${spot.name}`}
                  className="w-44 h-44 object-contain block"
                />
              </div>
              <div className="text-center space-y-0.5">
                <h4 className="font-bold text-sm text-neutral-900">{spot.name}</h4>
                <p className="text-xs text-neutral-500 max-w-[240px] truncate">
                  {spot.address}
                </p>
              </div>
            </div>
          ) : activeDataUrl ? (
            <div className="relative group max-w-[260px] sm:max-w-[280px] w-full my-auto">
              <img
                src={activeDataUrl}
                alt={`Thẻ QR quán ${spot.name}`}
                className={`w-full h-auto rounded-2xl shadow-xl border object-contain transition-transform duration-200 ${
                  selectedStyle === 'dark'
                    ? 'border-neutral-800 shadow-black/50'
                    : 'border-neutral-200/90 shadow-neutral-300/60'
                }`}
              />
              <div className="mt-2 text-center">
                <span
                  className={`inline-block text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                    selectedStyle === 'dark'
                      ? 'text-neutral-400 bg-neutral-900 border border-neutral-800'
                      : 'text-neutral-500 bg-neutral-200/70'
                  }`}
                >
                  💡 Chạm giữ ảnh 1 giây để lưu nhanh vào máy
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Actions Bottom Bar */}
        <div className="space-y-2 shrink-0 pt-0.5">
          {/* Main Primary Action Button */}
          <button
            type="button"
            onClick={handleSaveActive}
            disabled={isGenerating || isSaving}
            className={`w-full h-11 rounded-2xl text-xs sm:text-sm font-semibold active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 ${
              selectedStyle === 'dark'
                ? 'bg-white text-black hover:bg-neutral-200'
                : 'bg-black text-white hover:bg-neutral-800'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang lưu hình ảnh...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>
                  {selectedStyle === 'raw'
                    ? 'Tải mã QR vuông (PNG)'
                    : selectedStyle === 'dark'
                    ? 'Lưu thẻ đen sang trọng'
                    : 'Lưu thẻ trắng tinh tế'}
                </span>
              </>
            )}
          </button>

          {/* Secondary Row */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="h-9 rounded-xl border border-neutral-200 hover:border-black bg-white text-neutral-800 hover:text-black text-xs font-semibold active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Đã chép link</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Chép link</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                setSelectedStyle((prev) =>
                  prev === 'light' ? 'dark' : prev === 'dark' ? 'raw' : 'light'
                )
              }
              className="h-9 rounded-xl border border-neutral-200 hover:border-black bg-white text-neutral-800 hover:text-black text-xs font-semibold active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Đổi kiểu khác</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
