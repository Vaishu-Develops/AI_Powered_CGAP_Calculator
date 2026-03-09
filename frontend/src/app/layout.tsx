import type { Metadata } from "next";
import { Outfit, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "CGPA Calculator — Anna University | AI-Powered",
  description:
    "Instantly convert your Anna University marksheet into accurate GPA, CGPA, and Percentage. Powered by advanced 7-layer AI OCR pipeline.",
  keywords: ["CGPA", "Anna University", "GPA Calculator", "Marksheet", "OCR"],
};

import { UserProvider } from "@/context/UserContext";
import { CalcFlowProvider } from "@/context/CalcFlowContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body
        className={`${outfit.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <UserProvider>
          <CalcFlowProvider>
            {children}
          </CalcFlowProvider>
        </UserProvider>
      </body>
    </html>
  );
}
