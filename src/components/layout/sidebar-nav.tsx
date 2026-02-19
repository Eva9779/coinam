
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
  Repeat
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Wallet", href: "/wallet", icon: Wallet },
  { name: "Trade", href: "/trade", icon: Repeat },
  { name: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { name: "Market", href: "/market", icon: TrendingUp },
  { name: "Smart Alerts", href: "/alerts", icon: Bell },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-2 px-2 py-4">
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
