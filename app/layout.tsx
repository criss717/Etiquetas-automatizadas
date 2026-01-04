import type { Metadata } from "next";
import { Merienda, Geist, Geist_Mono } from "next/font/google"; // Import Merienda
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Configure Merienda
const merienda = Merienda({
  subsets: ["latin"],
  variable: "--font-merienda",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Alquimara Label Gen",
  description: "Generador de etiquetas automatizado",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${merienda.variable} antialiased font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
