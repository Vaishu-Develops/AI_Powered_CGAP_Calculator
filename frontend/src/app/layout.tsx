import type { Metadata } from "next";
import { Outfit, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
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
    "Instantly convert your Anna University marksheet into accurate GPA, CGPA, and Percentage. Powered by advanced AI OCR technology.",
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
    <html lang="en" className="light" data-scroll-behavior="smooth">
      <body
        className={`${outfit.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <Script id="performance-api-guard" strategy="beforeInteractive">
          {`(function(){
            if (typeof window === 'undefined' || typeof window.performance === 'undefined') return;
            var perf = window.performance;
            var ensureFn = function(name){
              if (typeof perf[name] === 'function') return;
              try {
                Object.defineProperty(perf, name, {
                  value: function(){},
                  configurable: true,
                  writable: true,
                });
              } catch (e) {
                try { perf[name] = function(){}; } catch (_e) {}
              }
            };

            // Next/React dev runtime may call these directly.
            ensureFn('mark');
            ensureFn('measure');
            ensureFn('clearMarks');
            ensureFn('clearMeasures');
            ensureFn('clearResourceTimings');
          })();`}
        </Script>
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="afterInteractive"
        />
        <UserProvider>
          <CalcFlowProvider>
            {children}
          </CalcFlowProvider>
        </UserProvider>
      </body>
    </html>
  );
}
