import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NavBar } from "./nav-bar";
import { I18nProvider } from "@/lib/i18n-context";
import { ThemeProvider } from "@/lib/theme-context";
import { ToastProvider } from "@/lib/toast-context";
import { ConfirmProvider } from "@/lib/confirm-dialog";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Syncloop — AI Video Subtitles",
  description: "Generate intelligent subtitles for your videos using AI",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="scroll-smooth">
      <body className={`${inter.className} bg-surface-950 text-surface-200 min-h-screen antialiased transition-colors duration-200`}>
        <ThemeProvider>
          <I18nProvider>
            <ToastProvider>
              <ConfirmProvider>
                <NavBar />
                <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
              </ConfirmProvider>
            </ToastProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
