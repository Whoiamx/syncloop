"use client";

import { usePathname } from "next/navigation";
import { NavBar } from "./nav-bar";
import { AppSidebar } from "./app-sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  if (isLanding) {
    return (
      <>
        <NavBar />
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </>
    );
  }

  return (
    <>
      <AppSidebar />
      {/* Main content with left offset for sidebar on desktop */}
      <main className="lg:ml-[220px] min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-8 pt-16 lg:pt-8">
          {children}
        </div>
      </main>
    </>
  );
}
