// src/app/layout.tsx

import type { Metadata } from "next";
import localFont from "next/font/local"; // 1. Use next/font/local
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

// 2. Configure the local font
const nataSans = localFont({
  src: "../../public/NataSans-VariableFont_wght.ttf",
  display: "swap",
  weight: "100 900", // Specify the available weight range
  variable: "--font-nata-sans", // Assign a CSS variable
});

export const metadata: Metadata = {
  title: "Pharmacy Inventory System",
  description: "Advanced pharmacy inventory management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* 3. Apply the font variable to the <body> tag */}
      <body className={`${nataSans.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
