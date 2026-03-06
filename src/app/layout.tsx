
'use client';

import './globals.css';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { Toaster } from '@/components/ui/toaster';
import { ShieldCheck, Database, LogOut, User as UserIcon, Loader2, Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getLiveBlockNumber } from '@/lib/blockchain';
import { VaultProvider } from '@/lib/store';
import { usePathname, useRouter } from 'next/navigation';
import { FirebaseClientProvider, useUserHook, useAuth } from '@/firebase';
import { signOut as firebaseSignOut } from 'firebase/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUserHook();
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();

  const isAuthPage = pathname === '/login' || pathname === '/register';

  useEffect(() => {
    if (!loading) {
      if (!user && !isAuthPage) {
        router.push('/login');
      } else if (user && isAuthPage) {
        router.push('/');
      }
    }
  }, [user, loading, isAuthPage, router]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && isAuthPage) {
    return <>{children}</>;
  }

  if (!user) {
    return null;
  }

  const handleSignOut = () => {
    firebaseSignOut(auth).then(() => {
      router.push('/login');
    });
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <AppContent onSignOut={handleSignOut} userEmail={user.email || 'User'} userId={user.uid}>
        {children}
      </AppContent>
    </div>
  );
}

function AppContent({ children, onSignOut, userEmail, userId }: { children: React.ReactNode, onSignOut: () => void, userEmail: string, userId: string }) {
  const [blockHeight, setBlockHeight] = useState<string>('Syncing...');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    async function syncNetwork() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const block = await getLiveBlockNumber();
        clearTimeout(timeoutId);
        
        if (block) {
          setBlockHeight(block.toString());
        }
      } catch (e) {
        // Silently handle sync errors
      }
    }
    syncNetwork();
    const interval = setInterval(syncNetwork, 12000); 
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <aside className="w-64 border-r bg-card flex flex-col hidden lg:flex">
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
        <header className="h-16 border-b bg-card flex items-center justify-between px-4 sm:px-8 shrink-0 gap-4">
          <div className="flex items-center gap-2 lg:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button className="p-2 hover:bg-muted rounded-lg">
                  <Menu className="h-6 w-6 text-primary" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <SheetHeader className="p-6 border-b flex flex-row items-center gap-2">
                  <ShieldCheck className="h-8 w-8 text-secondary" />
                  <SheetTitle className="text-xl font-bold text-primary">CoinVault</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col h-full">
                   <SidebarNav />
                   <div className="mt-auto p-6 border-t bg-muted/20">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        Network Live: {blockHeight}
                      </div>
                   </div>
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2 text-primary font-bold text-lg sm:text-xl lg:hidden">
              <ShieldCheck className="h-6 w-6 sm:h-8 sm:w-8 text-secondary" />
              <span className="hidden sm:inline">CoinVault</span>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-1 overflow-hidden">
            <Badge variant="outline" className="text-[9px] font-bold border-secondary/30 text-secondary bg-secondary/5 hidden sm:flex whitespace-nowrap">
              v1.2.8 - MULTI-VAULT-STABLE
            </Badge>
            <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full border bg-primary/5 border-primary/10 truncate">
              <span className="text-[9px] font-bold text-muted-foreground uppercase">VAULT ID:</span>
              <span className="text-[9px] font-mono font-bold text-primary truncate">{userId}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-10 px-2 sm:px-3 rounded-xl border flex items-center gap-2 sm:gap-3 hover:bg-muted/50 transition-all outline-none">
                  <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-xs shadow-inner shrink-0">
                    {userEmail[0].toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-muted-foreground hidden md:inline-block truncate max-w-[120px]">{userEmail}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Account Session</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-default flex flex-col items-start gap-1 p-3">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <UserIcon className="h-4 w-4" />
                    <span className="truncate max-w-[180px]">{userEmail}</span>
                  </div>
                  <div className="mt-2 w-full p-2 rounded bg-muted/50 text-[10px] font-mono break-all leading-tight">
                    <p className="text-muted-foreground mb-1 uppercase font-bold tracking-tighter">Verified UID</p>
                    {userId}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10" onClick={onSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#fdfdfd]">
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <title>CoinVault | Asset Security</title>
      </head>
      <body className="font-body antialiased bg-background text-foreground overflow-hidden">
        <FirebaseClientProvider>
          <VaultProvider>
            <AuthGuard>
              {children}
            </AuthGuard>
          </VaultProvider>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
