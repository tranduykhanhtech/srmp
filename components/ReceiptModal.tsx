'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { X, Download, Share2, Copy, Check, Receipt, Sparkles } from 'lucide-react';
import { Spot } from '@/types/spot';
import { generateReceiptCanvasBlob } from '@/lib/receipt-canvas';
import { triggerHaptic } from '@/lib/haptics';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  allSpots: Spot[];
  bookmarkedSpots: Spot[];
  userName?: string;
  onShowToast: (msg: string) => void;
}

export default function ReceiptModal({
  isOpen,
  onClose,
  allSpots,
  bookmarkedSpots,
  userName = 'Tín đồ ẩm thực',
  onShowToast,
}: ReceiptModalProps) {
  const [source, setSource] = useState<'bookmarks' | 'curated' | 'all'>(
    bookmarkedSpots.length > 0 ? 'bookmarks' : 'curated'
  );
  const [dinerName, setDinerName] = useState(userName);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Update dinerName if userName changes
  React.useEffect(() => {
    if (userName && userName !== 'Tín đồ ẩm thực') {
      setDinerName(userName);
    }
  }, [userName]);

  // Selected spots according to source
  const selectedSpots = useMemo(() => {
    if (source === 'bookmarks') {
      return bookmarkedSpots.length > 0 ? bookmarkedSpots : allSpots.slice(0, 8);
    }
    if (source === 'curated') {
      return allSpots.slice(0, 8);
    }
    return allSpots.slice(0, 10);
  }, [source, bookmarkedSpots, allSpots]);

  // Dominant category
  const dominantCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    selectedSpots.forEach((s) => {
      if (s.category) counts[s.category] = (counts[s.category] || 0) + 1;
    });
    let top = 'Đa dạng';
    let max = 0;
    Object.entries(counts).forEach(([c, cnt]) => {
      if (cnt > max) {
        max = cnt;
        top = c;
      }
    });
    return top;
  }, [selectedSpots]);

  const sourceLabel = useMemo(() => {
    if (source === 'bookmarks') return 'Quán đã lưu';
    if (source === 'curated') return 'Tuyển chọn';
    return 'Tất cả quán';
  }, [source]);

  const handleDownload = useCallback(async () => {
    try {
      setIsExporting(true);
      triggerHaptic('medium');

      const blob = await generateReceiptCanvasBlob({
        userName: dinerName || 'Tín đồ ẩm thực',
        sourceLabel,
        spots: selectedSpots,
      });

      if (!blob) {
        onShowToast('Không thể tạo hóa đơn, vui lòng thử lại');
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `animon-receipt-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      triggerHaptic('success');
      onShowToast('Đã tải hóa đơn gu ăn uống!');
    } catch {
      onShowToast('Lỗi khi xuất ảnh hóa đơn');
    } finally {
      setIsExporting(false);
    }
  }, [dinerName, sourceLabel, selectedSpots, onShowToast]);

  const handleCopyImage = useCallback(async () => {
    try {
      setIsExporting(true);
      triggerHaptic('light');

      const blob = await generateReceiptCanvasBlob({
        userName: dinerName || 'Tín đồ ẩm thực',
        sourceLabel,
        spots: selectedSpots,
      });

      if (!blob) {
        onShowToast('Không thể tạo ảnh hóa đơn');
        return;
      }

      if (typeof navigator !== 'undefined' && 'clipboard' in navigator && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob,
          }),
        ]);
        setCopied(true);
        triggerHaptic('success');
        onShowToast('Đã sao chép ảnh hóa đơn vào clipboard!');
        setTimeout(() => setCopied(false), 2200);
      } else {
        // Fallback to direct download
        handleDownload();
      }
    } catch {
      onShowToast('Không hỗ trợ copy ảnh trực tiếp, đã chuyển sang tải ảnh');
      handleDownload();
    } finally {
      setIsExporting(false);
    }
  }, [dinerName, sourceLabel, selectedSpots, handleDownload, onShowToast]);

  const handleShare = useCallback(async () => {
    try {
      setIsExporting(true);
      triggerHaptic('medium');

      const blob = await generateReceiptCanvasBlob({
        userName: dinerName || 'Tín đồ ẩm thực',
        sourceLabel,
        spots: selectedSpots,
      });

      if (!blob) return;

      const file = new File([blob], 'animon-receipt.png', { type: 'image/png' });

      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'animon Gourmet Receipt',
          text: `Xem hóa đơn gu ăn uống chuẩn gu của ${dinerName} trên animon:`,
        });
        triggerHaptic('success');
      } else {
        handleDownload();
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      handleDownload();
    } finally {
      setIsExporting(false);
    }
  }, [dinerName, sourceLabel, selectedSpots, handleDownload]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      <div
        className="w-full max-w-md max-h-[92vh] flex flex-col bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Topbar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center">
              <Receipt className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-1.5">
                Hóa Đơn Gu Ăn Uống
              </h3>
              <p className="text-[11px] text-neutral-400">animon Gourmet Receipt</p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter source switcher */}
        <div className="px-5 pt-3 pb-2 shrink-0 flex items-center justify-between gap-2 border-b border-neutral-800/80 bg-neutral-950/40 text-xs">
          <span className="text-neutral-400 text-[11px] font-medium shrink-0">Nguồn quán:</span>
          <div className="flex items-center gap-1 overflow-x-auto">
            {bookmarkedSpots.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setSource('bookmarks');
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                  source === 'bookmarks'
                    ? 'bg-white text-black shadow-xs'
                    : 'bg-neutral-800 text-neutral-300 hover:text-white'
                }`}
              >
                Đã lưu ({bookmarkedSpots.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setSource('curated');
              }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                source === 'curated'
                  ? 'bg-white text-black shadow-xs'
                  : 'bg-neutral-800 text-neutral-300 hover:text-white'
              }`}
            >
              Tuyển chọn ({Math.min(allSpots.length, 8)})
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setSource('all');
              }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                source === 'all'
                  ? 'bg-white text-black shadow-xs'
                  : 'bg-neutral-800 text-neutral-300 hover:text-white'
              }`}
            >
              Tất cả
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex justify-center bg-neutral-950/60">
          {/* Authentic Paper Receipt Component */}
          <div className="w-full max-w-[340px] bg-[#fafafa] text-neutral-900 font-mono text-[12px] leading-tight p-5 rounded-md shadow-xl border border-neutral-300 select-none relative transition-all">
            {/* Perforated Top border line */}
            <div className="text-center font-bold tracking-widest text-[9px] text-neutral-400 mb-2">
              - - - - - - - - - - - - - - - - - - - - - - -
            </div>

            {/* Receipt Header */}
            <div className="text-center space-y-1">
              <div className="text-base font-black tracking-widest uppercase">*** ANIMON ***</div>
              <div className="text-[11px] font-bold text-neutral-800">SỔ TAY ẨM THỰC CHUẨN GU</div>
              <div className="text-[10px] text-neutral-500">TỐI GIẢN • TỐC ĐỘ • KHÔNG QUẢNG CÁO</div>
            </div>

            <div className="my-2 border-b border-dashed border-neutral-400" />

            {/* Meta Info */}
            <div className="space-y-0.5 text-[11px]">
              <div className="flex justify-between">
                <span>ORDER: #849201</span>
                <span>NGÀY: 2026-09-24</span>
              </div>
              <div className="flex justify-between items-center">
                <span>THỰC KHÁCH:</span>
                <input
                  type="text"
                  value={dinerName}
                  onChange={(e) => setDinerName(e.target.value)}
                  className="bg-transparent font-bold text-right text-black uppercase max-w-[140px] border-b border-dotted border-neutral-400 focus:outline-hidden"
                  placeholder="TÊN BẠN"
                  title="Chạm để đổi tên trên hóa đơn"
                />
              </div>
              <div className="flex justify-between">
                <span>PHÂN LOẠI:</span>
                <span className="font-bold uppercase">{sourceLabel}</span>
              </div>
            </div>

            <div className="my-2 border-b-2 border-neutral-900" />

            {/* Columns header */}
            <div className="flex justify-between text-[10px] font-bold text-neutral-600 mb-1">
              <span>STT  ĐỊA ĐIỂM</span>
              <span>PHÂN LOẠI</span>
            </div>

            <div className="my-1 border-b border-dashed border-neutral-300" />

            {/* Spots list */}
            <div className="space-y-2 py-1">
              {selectedSpots.map((spot, idx) => (
                <div key={spot.id} className="space-y-0.5">
                  <div className="flex justify-between items-baseline gap-1">
                    <span className="font-bold truncate max-w-[200px]">
                      {String(idx + 1).padStart(2, '0')} {spot.name.toUpperCase()}
                    </span>
                    <span className="text-[10px] font-semibold text-neutral-600 shrink-0">
                      [{spot.category || 'MÓN NGON'}]
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-500 pl-4 truncate">
                    {spot.address || 'Việt Nam'}
                  </div>
                </div>
              ))}

              {selectedSpots.length === 0 && (
                <div className="text-center py-4 text-neutral-400 italic text-[11px]">
                  (Chưa có địa điểm nào được chọn)
                </div>
              )}
            </div>

            <div className="my-2 border-b border-dashed border-neutral-400" />

            {/* Receipt Summary */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>TỔNG ĐỊA ĐIỂM:</span>
                <span className="font-bold">{selectedSpots.length} QUÁN</span>
              </div>
              <div className="flex justify-between">
                <span>GU CHỦ ĐẠO:</span>
                <span className="font-bold uppercase">{dominantCategory}</span>
              </div>
              <div className="flex justify-between">
                <span>VIBE CHECK:</span>
                <span className="font-bold">100% CHUẨN GU</span>
              </div>
              <div className="flex justify-between text-neutral-500">
                <span>PHÍ QUẢNG CÁO:</span>
                <span>0 VND</span>
              </div>
              <div className="my-1 border-b border-neutral-300" />
              <div className="flex justify-between font-bold text-xs">
                <span>TỔNG CỘNG:</span>
                <span>VÔ GIÁ (PRICELESS)</span>
              </div>
              <div className="flex justify-between text-[10px] text-neutral-600">
                <span>HÌNH THỨC:</span>
                <span>ĐAM MÊ ẨM THỰC</span>
              </div>
            </div>

            <div className="my-2 border-b-2 border-neutral-900" />

            {/* Receipt Footer & Barcode */}
            <div className="text-center space-y-1.5 pt-1">
              <div className="font-bold text-[11px]">CẢM ƠN QUÝ KHÁCH!</div>
              <div className="text-[9px] text-neutral-500 leading-tight">
                HÓA ĐƠN KHÔNG CÓ GIÁ TRỊ TÍNH TIỀN<br />
                CHỈ CÓ GIÁ TRỊ NẰM TRONG BỤNG 🍜
              </div>

              {/* Barcode visual */}
              <div className="pt-2 flex flex-col items-center gap-1">
                <div className="flex items-center justify-center gap-[2px] h-9 w-full max-w-[220px] overflow-hidden">
                  {[4, 2, 6, 1, 3, 5, 2, 7, 3, 1, 4, 2, 8, 3, 1, 5, 2, 4, 3, 6, 2, 4, 1, 7, 3, 2, 5].map((w, i) => (
                    <div
                      key={i}
                      className="bg-black h-full"
                      style={{ width: `${w}px` }}
                    />
                  ))}
                </div>
                <span className="text-[9px] tracking-wider text-neutral-600">ANIMON-REAL-TASTE-2026</span>
              </div>

              <div className="text-[9px] text-neutral-400 pt-1">
                animon.io.vn • Sổ tay quán ăn cho giới trẻ
              </div>
            </div>

            {/* Perforated Bottom border line */}
            <div className="text-center font-bold tracking-widest text-[9px] text-neutral-400 mt-2">
              - - - - - - - - - - - - - - - - - - - - - - -
            </div>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="p-4 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-1 text-[11px] text-neutral-400">
            <Sparkles className="w-3.5 h-3.5 text-neutral-300" />
            <span>Chụp hoặc xuất ảnh up Story</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyImage}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              title="Sao chép ảnh vào bộ nhớ tạm"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã chép!' : 'Chép ảnh'}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              title="Chia sẻ hóa đơn"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Chia sẻ</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-white text-black hover:bg-neutral-200 text-xs font-bold active:scale-95 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              title="Tải ảnh PNG độ nét cao về máy"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Đang xuất...' : 'Tải hóa đơn'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
