import Link from 'next/link';
import { ArrowLeft, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-full max-w-sm space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Logo / Brand Icon */}
        <div className="w-16 h-16 rounded-3xl bg-black text-white flex items-center justify-center mx-auto shadow-xl">
          <Compass className="w-8 h-8 text-white stroke-[2.2]" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-neutral-400">
            Lỗi 404
          </span>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            Lạc đường rồi bạn ơi!
          </h1>
          <p className="text-sm text-neutral-500 leading-relaxed max-w-xs mx-auto">
            Địa chỉ hoặc trang bạn đang tìm kiếm không tồn tại hoặc đã được chuyển sang chỗ khác trên animon.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-2xl bg-black text-white text-sm font-bold hover:bg-neutral-800 active:scale-95 transition-all shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay về trang chủ animon</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
