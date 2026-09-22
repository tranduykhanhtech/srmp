'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, QrCode, Download, Copy, Check, ExternalLink } from 'lucide-react';
import { Spot } from '@/types/spot';
import CategoryIcon from './CategoryIcon';

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const shareUrl = typeof window !== 'undefined' && spot
    ? `${window.location.origin}/?spot=${spot.id}`
    : spot
    ? `https://animon.io.vn/?spot=${spot.id}`
    : '';

  useEffect(() => {
    if (isOpen && spot && canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        shareUrl,
        {
          width: 220,
          margin: 1.5,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'M',
        },
        (err) => {
          if (err) {
            console.error('Lỗi tạo mã QR:', err);
          } else if (canvasRef.current) {
            setQrDataUrl(canvasRef.current.toDataURL('image/png'));
          }
        }
      );
    }
  }, [isOpen, spot, shareUrl]);

  if (!isOpen || !spot) return null;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      if (onShowToast) onShowToast('Đã chép liên kết quán');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `animon-${spot.name.toLowerCase().replace(/[^a-z0-9]/gi, '-')}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (onShowToast) onShowToast('Đã tải mã QR về máy');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm bg-white border border-neutral-200 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-neutral-900 text-left">
              Mã QR Quán Ăn
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-black rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Spot Info */}
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5">
            {spot.category && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full">
                <CategoryIcon category={spot.category} className="w-3 h-3" />
                {spot.category}
              </span>
            )}
          </div>
          <h4 className="text-lg font-black text-neutral-900 leading-snug">
            {spot.name}
          </h4>
          <p className="text-xs text-neutral-500 line-clamp-1 max-w-[260px] mx-auto">
            {spot.address}
          </p>
        </div>

        {/* QR Canvas Box */}
        <div className="flex flex-col items-center justify-center p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 shadow-inner">
          <div className="p-2.5 bg-white rounded-xl shadow-xs border border-neutral-100">
            <canvas ref={canvasRef} className="mx-auto block" />
          </div>
          <p className="text-[11px] text-neutral-500 mt-2.5">
            Mở Camera điện thoại quét mã để xem quán trên <b>animon</b>
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownloadQr}
              className="h-10 rounded-xl bg-black text-white text-xs font-semibold hover:bg-neutral-800 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Tải ảnh QR
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="h-10 rounded-xl border border-neutral-200 hover:border-black bg-white text-neutral-800 hover:text-black text-xs font-semibold active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Đã chép link' : 'Chép link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
