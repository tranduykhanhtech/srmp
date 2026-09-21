import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  metadataBase: new URL('https://animon.io.vn'),
  title: "animon — Sổ tay quán ăn cho giới trẻ",
  description: "Lưu và tìm nhanh địa điểm ăn uống, cafe chuẩn gu giới trẻ. Tối giản, tốc độ và không quảng cáo.",
  keywords: ["animon", "quán ăn", "cafe chill", "địa điểm ăn uống", "sổ tay ẩm thực"],
  authors: [{ name: "animon" }],
  openGraph: {
    title: "animon — Sổ tay quán ăn cho giới trẻ",
    description: "Lưu và tìm nhanh địa điểm ăn uống, cafe chuẩn gu giới trẻ. Tối giản, tốc độ và không quảng cáo.",
    url: "https://animon.io.vn",
    siteName: "animon",
    locale: "vi_VN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "animon — Sổ tay quán ăn cho giới trẻ",
    description: "Lưu và tìm nhanh địa điểm ăn uống, cafe chuẩn gu giới trẻ.",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "animon",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body suppressHydrationWarning className="bg-white text-black antialiased">
        {children}
      </body>
    </html>
  );
}
