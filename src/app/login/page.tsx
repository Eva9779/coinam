'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ShieldCheck, Loader2, Mail, Lock, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useVaultStore } from '@/lib/store';
import { toast } from '@/hooks/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useVaultStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Local session initialization
    setTimeout(() => {
      signIn(email);
      toast({
        title: "Access Granted",
        description: "Authenticated with the secure vault network.",
      });
      router.push('/');
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
      <Card className="w-full max-w-md shadow-2xl border-primary/10 backdrop-blur-sm bg-card/90">
        <CardHeader className="space-y-1 flex flex-col items-center pb-8">
          <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-xl shadow-primary/20 transform -rotate-3 hover:rotate-0 transition-transform">
            <ShieldCheck className="h-10 w-10 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">Vault Access</CardTitle>
          <CardDescription className="text-muted-foreground font-medium">Enter your credentials to access the secure network.</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider opacity-70">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  className="pl-10 h-11 bg-background/50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider opacity-70">Passphrase</Label>
                <button type="button" className="text-[10px] font-bold text-primary hover:underline uppercase tracking-tighter">Recover Key</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-11 bg-background/50"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-5 pt-6">
            <Button type="submit" className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <><LogIn className="mr-2 h-5 w-5" /> Unlock Vault</>}
            </Button>
            <div className="text-sm text-center text-muted-foreground font-medium">
              New to the network?{' '}
              <Link href="/register" className="text-primary hover:underline font-bold">
                Initialize Vault
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
