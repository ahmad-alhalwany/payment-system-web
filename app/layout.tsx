import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Header from "../components/shared/Header";

const cairo = Cairo({
  subsets: ["latin", "arabic"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "شركة العنكبوت للحوالات",
  description: "نظام إدارة التحويلات المالية الداخلية",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="icon" href="/payment-system.ico" type="image/x-icon" />
      </head>
      <body className={`${cairo.variable} font-sans`}>
        <Toaster position="top-center" />
        <Header />
        {children}
      </body>
    </html>
  );
}
