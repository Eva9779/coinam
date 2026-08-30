
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowLeftRight, 
  Bell, 
  Settings, 
  TrendingUp,
  Repeat,
  CreditCard,
  Banknote,
  Bot,
  Landmark,
  ShieldCheck
} from "lucide-react";
import { useWalletStore } from "@/lib/store";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Wallet", href: "/wallet", icon: Wallet },
  { name: "Stocks & Bonds", href: "/stocks", icon: Landmark },
  { name: "Strategy Agent", href: "/bot", icon: Bot },
  { name: "Buy Assets", href: "/buy", icon: CreditCard },
  { name: "Withdraw", href: "/withdraw", icon: Banknote },
  { name: "Trade", href: "/trade", icon: Repeat },
  { name: "Markets", href: "/market", icon: TrendingUp },
  { name: "Smart Alerts", href: "/alerts", icon: Bell },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { kycStatus } = useWalletStore();

  return (
    <nav className="flex flex-col gap-2 px-2 py-4 h-full">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
              isActive 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </Link>
        );
      })}
      
      {kycStatus !== 'verified' && (
        <Link
          href="/kyc"
          className={cn(
            "flex items-center gap-3 px-3 py-2 text-sm font-bold rounded-md transition-colors mt-4 bg-amber-500/10 text-amber-600 border border-amber-500/20",
            pathname === "/kyc" ? "bg-amber-500 text-white" : ""
          )}
        >
          <ShieldCheck className="h-5 w-5" />
          Verify Compliance
        </Link>
      )}

      <div className="mt-auto pt-4 border-t">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
            pathname === "/settings" 
              ? "bg-primary text-primary-foreground" 
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>
      </div>
    </nav>
  );
}
