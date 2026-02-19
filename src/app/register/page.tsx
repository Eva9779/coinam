
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ShieldCheck, Loader2, Mail, Lock, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { toast } from '@/hooks/use-toast';

export default function RegisterPage() {
  const router = useRouter();
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast({
        title: "Security Requirement",
        description: "Password must be at least 6 characters.",
        variant: "destructive"
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast({
        title: "Identity Provisioned",
        description: "Welcome to the secure vault network.",
      });
      router.push('/');
    } catch (error: any) {
      toast({
        title: "Provisioning Failed",
        description: error.message || "An error occurred during account initialization.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
      <Card className="w-full max-w-md shadow-2xl border-primary/10 backdrop-blur-sm bg-card/90">
        <CardHeader className="space-y-1 flex flex-col items-center pb-8">
          <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-xl shadow-primary/20 transform -rotate-3 hover:rotate-0 transition-transform">
            <ShieldCheck className="h-10 w-10 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">Create Vault</CardTitle>
          <CardDescription className="text-muted-foreground font-medium">Initialize your secure identity on the network.</CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider opacity-70">Email Endpoint</Label>
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
              <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider opacity-70">Passphrase</Label>
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
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-xs font-bold uppercase tracking-wider opacity-70">Verify Passphrase</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-11 bg-background/50"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-5 pt-6">
            <Button type="submit" className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <><UserPlus className="mr-2 h-5 w-5" /> Initialize Identity</>}
            </Button>
            <div className="text-sm text-center text-muted-foreground font-medium">
              Already verified?{' '}
              <Link href="/login" className="text-primary hover:underline font-bold">
                Sign In
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
