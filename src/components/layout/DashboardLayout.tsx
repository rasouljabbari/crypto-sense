"use client";

import { ReactNode } from "react";
import { SidebarProvider } from "./SidebarContext";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MainContent } from "./MainContent";

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-theme-bg text-theme-text">
        <Sidebar />
        <Header />
        <MainContent>{children}</MainContent>
      </div>
    </SidebarProvider>
  );
}
