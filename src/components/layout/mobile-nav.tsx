"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Wallet, 
  Repeat, 
  Bot, 
  Menu as MenuIcon 
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";
import { ShieldCheck } from "lucide-react";

const mobileItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Wallet", href: "/wallet", icon: Wallet },
  { name: "Trade", href: "/trade", icon: Repeat },
  { name: "Bot", href: "/bot", icon: Bot },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/80 backdrop-blur-xl border-t h-20 px-6 flex items-center justify-between pb-safe">
      {mobileItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1.5 transition-all",
              isActive ? "text-primary scale-110" : "text-muted-foreground opacity-70"
            )}
          >
            <item.icon className={cn("h-6 w-6", isActive && "stroke-[2.5px]")} />
            <span className="text-[10px] font-black uppercase tracking-tighter">{item.name}</span>
          </Link>
        );
      })}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="flex flex-col items-center gap-1.5 text-muted-foreground opacity-70">
            <MenuIcon className="h-6 w-6" />
            <span className="text-[10px] font-black uppercase tracking-tighter">More</span>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-[2.5rem] p-0 border-t-2 border-primary/20">
          <SheetHeader className="p-8 border-b">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-secondary" />
              <SheetTitle className="text-2xl font-black text-primary">Menu</SheetTitle>
            </div>
          </SheetHeader>
          <div className="overflow-y-auto h-full pb-20">
            <SidebarNav onItemClick={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
