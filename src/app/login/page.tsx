
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { 
  ShieldCheck, 
  Loader2, 
  Mail, 
  Lock, 
  LogIn, 
  RefreshCw, 
  AlertCircle,
  Key,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Access Granted",
        description: "Authenticated with the secure wallet network.",
      });
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        title: "Authentication Failed",
        description: "The credentials provided do not match our records for project coinvault-989b4. Please verify your email and password.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast({ title: "Email Required", description: "Please enter your email to receive a reset link.", variant: "destructive" });
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({
        title: "Identity Reset Sent",
        description: "Check your inbox for the secure reset link.",
      });
      setIsRecoveryOpen(false);
    } catch (error: any) {
      toast({
        title: "Recovery Failed",
        description: error.message || "Could not initialize reset protocol.",
        variant: "destructive"
      });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background text-foreground">
      <Card className="w-full max-w-md shadow-2xl border-primary/10 backdrop-blur-sm bg-card/90 rounded-[2.5rem] overflow-hidden">
        <CardHeader className="space-y-1 flex flex-col items-center pb-8 pt-10">
          <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-xl shadow-primary/20 transform -rotate-3 hover:rotate-0 transition-transform">
            <ShieldCheck className="h-10 w-10 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-black tracking-tighter">Institutional Login</CardTitle>
          <CardDescription className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Project: coinvault-989b4</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-5 px-8">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest opacity-60">Identity Endpoint</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  className="pl-10 h-12 bg-background/50 rounded-xl font-bold"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest opacity-60">Master Passphrase</Label>
                
                <Dialog open={isRecoveryOpen} onOpenChange={setIsRecoveryOpen}>
                  <DialogTrigger asChild>
                    <button type="button" className="text-[10px] font-bold text-primary hover:underline uppercase tracking-tighter">Recover Key</button>
                  </DialogTrigger>
                  <DialogContent className="rounded-[2rem] sm:max-w-md border-2 border-primary/10">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-black flex items-center gap-2">
                        <RefreshCw className="h-6 w-6 text-secondary" />
                        Access Recovery
                      </DialogTitle>
                      <DialogDescription className="text-sm font-medium">
                        Regain access to your institutional assets on project coinvault-989b4.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Tabs defaultValue="password" className="w-full mt-4">
                      <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-xl h-12">
                        <TabsTrigger value="password" className="rounded-lg font-black text-[10px] uppercase">Identity Reset</TabsTrigger>
                        <TabsTrigger value="wallet" className="rounded-lg font-black text-[10px] uppercase">Wallet Restore</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="password" className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Verified Email Address</Label>
                          <Input 
                            type="email" 
                            placeholder="name@company.com" 
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            className="h-12 rounded-xl font-bold"
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                          We will send a secure identity verification link to this address to reset your master passphrase for coinvault-989b4.
                        </p>
                        <Button className="w-full h-12 font-black rounded-xl shadow-lg" onClick={handlePasswordReset} disabled={resetLoading}>
                          {resetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Link"}
                        </Button>
                      </TabsContent>
                      
                      <TabsContent value="wallet" className="space-y-4 pt-4">
                        <div className="p-6 bg-primary/5 border border-dashed border-primary/20 rounded-2xl flex items-start gap-3">
                          <Key className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <div className="space-y-2">
                            <h4 className="text-xs font-black uppercase tracking-tight text-primary">Non-Custodial Recovery</h4>
                            <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                              If you have lost access to your email and passphrase, you can recover your assets using your <strong>Private Key</strong>.
                            </p>
                            <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                              1. Create a new account.<br />
                              2. Go to the <strong>Settings</strong> tab.<br />
                              3. Use the <strong>"Import"</strong> feature.
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" className="w-full h-12 font-black rounded-xl border-2" asChild>
                          <Link href="/register">Initialize New Identity <ChevronRight className="ml-2 h-4 w-4" /></Link>
                        </Button>
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-12 bg-background/50 rounded-xl font-bold"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-5 pt-8 pb-10 px-8">
            <Button type="submit" className="w-full h-14 text-xl font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <><LogIn className="mr-2 h-6 w-6" /> Unlock Enclave</>}
            </Button>
            <div className="text-sm text-center text-muted-foreground font-medium">
              New to the network?{' '}
              <Link href="/register" className="text-primary hover:underline font-black">
                Initialize Wallet
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
