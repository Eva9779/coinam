
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Key,
  Fingerprint,
  ShieldAlert
} from 'lucide-react';
import { useAuth, useUserHook } from '@/firebase';
import { updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const auth = useAuth();
  const { user, loading: userLoading } = useUserHook();
  
  const [email, setEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !email) return;
    setLoadingEmail(true);
    
    try {
      // Re-authentication is often required for email updates
      if (currentPassword) {
        const credential = EmailAuthProvider.credential(user.email!, currentPassword);
        await reauthenticateWithCredential(user, credential);
      }
      
      await updateEmail(user, email);
      toast({
        title: "Endpoint Updated",
        description: "Your verified email has been updated on the network.",
      });
      setCurrentPassword('');
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "A secure session is required. Please re-authenticate.",
        variant: "destructive"
      });
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passphrases do not match.",
        variant: "destructive"
      });
      return;
    }

    setLoadingPassword(true);
    try {
      if (currentPassword) {
        const credential = EmailAuthProvider.credential(user.email!, currentPassword);
        await reauthenticateWithCredential(user, credential);
      }

      await updatePassword(user, newPassword);
      toast({
        title: "Security Hardened",
        description: "Your vault passphrase has been updated successfully.",
      });
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
    } catch (error: any) {
      toast({
        title: "Security Violation",
        description: error.message || "Failed to update security credentials.",
        variant: "destructive"
      });
    } finally {
      setLoadingPassword(false);
    }
  };

  if (userLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Synchronizing Security Session...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary flex items-center gap-3 tracking-tighter">
            <Key className="h-8 w-8 text-secondary" />
            Security Terminal
          </h2>
          <p className="text-muted-foreground text-sm font-medium">Manage your cryptographic identity and network access credentials.</p>
        </div>
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1 gap-1.5 font-bold uppercase text-[10px]">
          <ShieldCheck className="h-3.5 w-3.5" />
          Enclave Verified
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Email Update Card */}
          <Card className="shadow-2xl border-primary/5 bg-card/50 backdrop-blur-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-muted/20 pb-6 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Identity Endpoint</CardTitle>
                  <CardDescription className="text-xs">Update your primary network contact address.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8 space-y-6">
              <form onSubmit={handleUpdateEmail} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Verified Email</Label>
                  <Input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="name@company.com"
                    className="h-12 rounded-xl font-medium"
                  />
                </div>
                <div className="p-4 bg-amber-500/5 border border-dashed border-amber-500/20 rounded-xl flex items-start gap-3">
                  <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-700 font-bold uppercase tracking-tight leading-relaxed">
                    Identity changes require your current passphrase for network verification.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Verify Current Passphrase</Label>
                  <Input 
                    type="password" 
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)} 
                    placeholder="••••••••"
                    className="h-12 rounded-xl font-medium"
                    required
                  />
                </div>
                <Button disabled={loadingEmail} className="w-full h-12 rounded-xl font-bold shadow-lg">
                  {loadingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Identity"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Password Update Card */}
          <Card className="shadow-2xl border-primary/5 bg-card/50 backdrop-blur-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-muted/20 pb-6 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Passphrase Rotation</CardTitle>
                  <CardDescription className="text-xs">Harden your vault security with a new master key.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8 space-y-6">
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">New Vault Passphrase</Label>
                  <Input 
                    type="password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    placeholder="Min. 8 characters"
                    className="h-12 rounded-xl font-medium"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Verify New Passphrase</Label>
                  <Input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    placeholder="••••••••"
                    className="h-12 rounded-xl font-medium"
                    required
                  />
                </div>
                <Button disabled={loadingPassword} className="w-full h-12 rounded-xl font-bold shadow-lg bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  {loadingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Authorize Rotation"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-950 text-white border-none shadow-2xl relative overflow-hidden rounded-[2rem] p-4">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Fingerprint className="h-48 w-48" />
            </div>
            <CardHeader className="relative z-10">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-secondary flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Security Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase opacity-60">MFA Status</span>
                  <Badge variant="outline" className="text-[8px] bg-green-500/20 text-green-400 border-none">ACTIVE</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase opacity-60">Network Sync</span>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </div>
              </div>
              
              <div className="p-4 bg-secondary/10 rounded-xl border border-secondary/20 space-y-2">
                <h4 className="text-xs font-black uppercase tracking-tight text-secondary">Session Persistence</h4>
                <p className="text-[10px] opacity-70 leading-relaxed">
                  Cryptographic sessions are isolated to your local device. Changes to your identity credentials propagate through our decentralized auth layer.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-dashed border-2 bg-muted/20 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-black uppercase tracking-tight">Security Protocol</h4>
            </div>
            <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
              If you lose your master passphrase, your non-custodial assets can only be recovered using your secure seed phrase. Coin A,M does not store your private keys.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
