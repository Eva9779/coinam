
"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ShieldCheck, 
  Zap, 
  Bot, 
  ChevronRight, 
  Globe, 
  Lock, 
  Activity,
  ArrowUpRight,
  Sparkles,
  Smartphone,
  CreditCard,
  Layers
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background selection:bg-secondary selection:text-white">
      <header className="h-20 border-b bg-background/80 backdrop-blur-xl sticky top-0 z-50 px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary font-bold text-2xl tracking-tighter">
          <ShieldCheck className="h-9 w-9 text-secondary" />
          <span>Coin A,M</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-bold text-muted-foreground uppercase tracking-widest">
          <Link href="#features" className="hover:text-primary transition-colors">Features</Link>
          <Link href="#security" className="hover:text-primary transition-colors">Security</Link>
          <Link href="#ai" className="hover:text-primary transition-colors">AI Intelligence</Link>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="font-bold text-sm uppercase tracking-widest hidden sm:flex" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button className="font-bold h-11 px-6 rounded-xl shadow-xl hover:scale-105 active:scale-95 transition-all" asChild>
            <Link href="/register">Get Started</Link>
          </Button>
        </div>
      </header>

      <section className="relative pt-24 pb-32 px-6 sm:px-12 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
        <div className="max-w-6xl mx-auto flex flex-col items-center text-center space-y-8 relative z-10">
          <Badge variant="outline" className="py-2 px-4 rounded-full border-secondary/30 bg-secondary/5 text-secondary font-black tracking-[0.2em] text-[10px] uppercase animate-in fade-in slide-in-from-bottom-4 duration-1000">
            Institutional Asset Security Protocol
          </Badge>
          <h1 className="text-5xl sm:text-8xl font-black tracking-tighter leading-[0.9] text-primary max-w-4xl">
            Secure Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-blue-600">Digital Legacy</span> with AI Intelligence.
          </h1>
          <p className="text-xl text-muted-foreground font-medium max-w-2xl leading-relaxed">
            Experience the world's most advanced non-custodial wallet. Integrated with native Apple/Google Pay and AI-driven autonomous trading bots.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button size="lg" className="h-16 px-10 text-xl font-black rounded-2xl shadow-2xl group" asChild>
              <Link href="/register">
                Open Wallet 
                <ChevronRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="h-16 px-10 text-xl font-black rounded-2xl border-2" asChild>
              <Link href="/login">Access Wallet</Link>
            </Button>
          </div>
          
          <div className="flex items-center gap-8 pt-12 opacity-40 grayscale">
             <div className="flex items-center gap-2 font-black italic text-2xl">VISA</div>
             <div className="flex items-center gap-2 font-black italic text-2xl">Mastercard</div>
             <div className="flex items-center gap-2 font-bold text-xl"><Smartphone className="h-5 w-5" /> Apple Pay</div>
             <div className="flex items-center gap-2 font-bold text-xl"><Smartphone className="h-5 w-5" /> Google Pay</div>
          </div>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -z-10" />
      </section>

      <section id="features" className="py-24 px-6 sm:px-12 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-secondary/10 flex items-center justify-center">
                <Smartphone className="h-7 w-7 text-secondary" />
              </div>
              <h3 className="text-2xl font-black tracking-tight">Instant On-Ramp</h3>
              <p className="text-muted-foreground font-medium leading-relaxed">
                Fund your secure wallet in seconds using Apple Pay, Google Pay, or Debit Card. No complex exchanges required.
              </p>
            </div>
            <div className="space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Bot className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-2xl font-black tracking-tight">Quantum AI Bot</h3>
              <p className="text-muted-foreground font-medium leading-relaxed">
                Deploy advanced autonomous trading strategies. Our AI monitors global sentiment 24/7 to rebalance your portfolio.
              </p>
            </div>
            <div className="space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-green-500/10 flex items-center justify-center">
                <ShieldCheck className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="text-2xl font-black tracking-tight">Wallet Isolation</h3>
              <p className="text-muted-foreground font-medium leading-relaxed">
                Non-custodial cryptographic keys generated on-device. You maintain absolute control over your digital assets.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="security" className="py-24 px-6 sm:px-12 bg-slate-950 text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <Lock className="h-[600px] w-[600px] absolute -right-20 -bottom-20 rotate-12" />
        </div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          <div className="space-y-8">
            <Badge className="bg-secondary/20 text-secondary border-none px-4 py-1.5 font-bold uppercase tracking-widest text-xs">
              Hardware Enclave
            </Badge>
            <h2 className="text-4xl sm:text-6xl font-black tracking-tighter leading-tight">
              Bank-Grade Security for Every Transaction.
            </h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <Activity className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <h4 className="font-bold text-lg">Real-Time Monitoring</h4>
                  <p className="opacity-60 text-sm">AI Guardian continuously scans for unusual behavior and unauthorized access attempts.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <Globe className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <h4 className="font-bold text-lg">Decentralized Settlement</h4>
                  <p className="opacity-60 text-sm">Transactions are settled directly on the Ethereum Mainnet, ensuring immutable records.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-3xl space-y-6 shadow-2xl">
             <div className="flex items-center justify-between border-b border-white/10 pb-6">
               <div className="flex items-center gap-3">
                 <Layers className="h-6 w-6 text-secondary" />
                 <span className="font-bold uppercase tracking-widest text-xs opacity-50">Protocol: Wallet-Secure-V4</span>
               </div>
               <Badge className="bg-green-500 text-white border-none animate-pulse">ACTIVE</Badge>
             </div>
             <div className="space-y-4">
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                   <div className="h-full bg-secondary w-3/4" />
                </div>
                <div className="flex justify-between text-[10px] font-bold opacity-40 uppercase tracking-widest">
                  <span>Encryption Key Strength</span>
                  <span>4096-bit AES</span>
                </div>
             </div>
             <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-sm font-mono leading-relaxed opacity-70">
                0x71C7656EC7ab88b098defB751B7401B5f6d8976F...
             </div>
          </div>
        </div>
      </section>

      <footer className="py-20 px-6 sm:px-12 bg-background border-t">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12">
          <div className="space-y-4 max-w-sm">
            <div className="flex items-center gap-2 text-primary font-bold text-2xl tracking-tighter">
              <ShieldCheck className="h-8 w-8 text-secondary" />
              <span>Coin A,M</span>
            </div>
            <p className="text-muted-foreground font-medium text-sm leading-relaxed">
              Leading the transition to decentralized finance with institutional security and AI intelligence.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
            <div className="space-y-4">
              <h4 className="font-black text-xs uppercase tracking-widest text-primary">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground font-medium">
                <li><Link href="/dashboard" className="hover:text-primary">Dashboard</Link></li>
                <li><Link href="/wallet" className="hover:text-primary">Wallet</Link></li>
                <li><Link href="/bot" className="hover:text-primary">AI Trading</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-black text-xs uppercase tracking-widest text-primary">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground font-medium">
                <li><Link href="#" className="hover:text-primary">About</Link></li>
                <li><Link href="#" className="hover:text-primary">Security</Link></li>
                <li><Link href="#" className="hover:text-primary">Terms</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-12 mt-12 border-t flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          <span>&copy; 2024 Coin A,M Protocol</span>
          <div className="flex gap-6">
            <Link href="#">Twitter</Link>
            <Link href="#">Github</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
