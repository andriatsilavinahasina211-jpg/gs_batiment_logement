import type { Metadata } from "next";
import { Playfair_Display, Montserrat } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-heading",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-primary",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SRB - Service Regionale du Budget Haute Matsiatra",
  description: "Portail Officiel du Service Regionale du Budget Haute Matsiatra",
  icons: {
    icon: "/logo_DGBF.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${montserrat.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  );
}