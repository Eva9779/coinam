
"use client";

import './globals.css';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { Toaster } from '@/components/ui/toaster';
import { ShieldCheck, Database, LogOut, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getLiveBlockNumber } from '@/lib/blockchain';
import { useVaultStore } from '@/lib/store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [blockHeight, setBlockHeight] = useState<string>('Syncing...');
  const { clearVault } = useVaultStore();

  useEffect(() => {
    async function syncNetwork() {
      const block = await getLiveBlockNumber();
      if (block) {
        setBlockHeight(block.toString());
      }
    }
    syncNetwork();
    const interval = setInterval(syncNetwork, 12000); 
    return () => clearInterval(interval);
  }, []);

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <title>CoinVault | Institutional Asset Management</title>
      </head>
      <body className="font-body antialiased bg-background text-foreground overflow-hidden">
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <aside className="w-64 border-r bg-card flex flex-col hidden md:flex">
            <div className="h-16 flex items-center px-6 border-b">
              <div className="flex items-center gap-2 text-primary font-bold text-xl">
                <ShieldCheck className="h-8 w-8 text-secondary" />
                <span>CoinVault</span>
              </div>
            </div>
            <SidebarNav />
            <div className="mt-auto p-4">
              <div className="bg-primary/5 rounded-lg p-3 text-xs text-muted-foreground border border-primary/10">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-primary">Mainnet Status</p>
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                </div>
                <div className="flex items-center gap-2 opacity-80">
                  <Database className="h-3 w-3" />
                  Block: {blockHeight}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Topbar */}
            <header className="h-16 border-b bg-card flex items-center justify-between px-8 shrink-0">
              <h1 className="font-semibold text-lg uppercase tracking-tight opacity-70 text-xs">Secure Asset Vault</h1>
              <div className="flex items-center gap-4">
                <button className="text-muted-foreground hover:text-foreground relative">
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-secondary rounded-full border-2 border-card" />
                  <span className="sr-only">Notifications</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-xs shadow-inner hover:ring-2 hover:ring-secondary/50 transition-all outline-none">
                      JD
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Vault Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10" onClick={clearVault}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Disconnect Vault</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 bg-[#fdfdfd]">
              {children}
            </div>
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
