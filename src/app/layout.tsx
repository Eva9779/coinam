
'use client';

import './globals.css';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { Toaster } from '@/components/ui/toaster';
import { ShieldCheck, Database, LogOut, User as UserIcon, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getLiveBlockNumber } from '@/lib/blockchain';
import { useVaultStore } from '@/lib/store';
import { usePathname, useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, initialized, signOut } = useVaultStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (initialized && !user && pathname !== '/login' && pathname !== '/register') {
      router.push('/login');
    }
  }, [user, initialized, pathname, router]);

  const handleSignOut = () => {
    signOut();
    router.push('/login');
  };

  if (!initialized) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && (pathname === '/login' || pathname === '/register')) {
    return <>{children}</>;
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <AppContent onSignOut={handleSignOut} userEmail={user.email}>
        {children}
      </AppContent>
    </div>
  );
}

function AppContent({ children, onSignOut, userEmail }: { children: React.ReactNode, onSignOut: () => void, userEmail: string }) {
  const [blockHeight, setBlockHeight] = useState<string>('Syncing...');

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
    <>
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

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 border-b bg-card flex items-center justify-between px-8 shrink-0">
          <h1 className="font-semibold text-lg uppercase tracking-tight opacity-70 text-xs">Secure Asset Vault</h1>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-xs shadow-inner hover:ring-2 hover:ring-secondary/50 transition-all outline-none">
                  {userEmail[0].toUpperCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Account Session</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-default">
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>{userEmail}</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10" onClick={onSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-[#fdfdfd]">
          {children}
        </div>
      </main>
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <title>CoinVault | Asset Security</title>
      </head>
      <body className="font-body antialiased bg-background text-foreground overflow-hidden">
        <AuthGuard>
          {children}
        </AuthGuard>
        <Toaster />
      </body>
    </html>
  );
}
