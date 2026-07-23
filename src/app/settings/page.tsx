
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Key,
  Fingerprint,
  ShieldAlert,
  Plus,
  Download,
  Eye,
  EyeOff,
  Copy,
  AlertTriangle,
  Terminal,
  Cpu
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { useAuth, useUserHook } from '@/firebase';
import { updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { toast } from '@/hooks/use-toast';
import { useVaultStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const auth = useAuth();
  const { user, loading: userLoading } = useUserHook();
  const { assets, generateNewWallet, importPrivateKey } = useVaultStore();
  
  const [email, setEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importKey, setImportKey] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !email) return;
    setLoadingEmail(true);
    
    try {
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

  const handleGenerate = async () => {
    setIsGenerating(true);
    generateNewWallet('ETH');
    setIsGenerating(false);
    toast({
      title: "Key Provisioned",
      description: "A new cryptographic endpoint is now live in your vault.",
    });
  };

  const handleImport = async () => {
    if (!importKey.startsWith('0x') || importKey.length !== 66) {
      toast({ title: "Invalid Key Format", description: "Private keys must be 66 characters long and start with 0x.", variant: "destructive" });
      return;
    }

    setImportLoading(true);
    try {
      await importPrivateKey('ETH', importKey as `0x${string}`);
      setIsImportOpen(false);
      setImportKey("");
    } catch (e) {
      // Error handled in store
    } finally {
      setImportLoading(false);
    }
  };

  const toggleRevealKey = (address: string) => {
    setRevealedKeys(prev => ({ ...prev, [address]: !prev[address] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: `${label} Copied`,
      description: "Stored in secure clipboard.",
    });
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
        <div className="lg:col-span-2 space-y-8">
          {/* Identity Update Card */}
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

          {/* Vault Key Management Card */}
          <Card className="shadow-2xl border-primary/5 bg-card/50 backdrop-blur-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-muted/20 pb-6 border-b flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Vault Credentials</CardTitle>
                  <CardDescription className="text-xs">Manage your non-custodial cryptographic keys.</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                 <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-lg font-bold text-[10px] uppercase">
                        <Download className="h-3.5 w-3.5" /> Import
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-[2rem] max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                          <Terminal className="h-5 w-5 text-secondary" />
                          Restore Vault
                        </DialogTitle>
                        <DialogDescription className="text-sm font-medium">
                          Enter an existing private key to restore your assets.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Private Key (0x...)</Label>
                          <Textarea 
                            placeholder="0x..." 
                            className="font-mono text-xs min-h-[100px] rounded-xl bg-muted/30"
                            value={importKey}
                            onChange={(e) => setImportKey(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button className="w-full h-12 font-bold rounded-xl" onClick={handleImport} disabled={importLoading}>
                          {importLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Authorize Restore"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                 </Dialog>
                 <Button onClick={handleGenerate} disabled={isGenerating} size="sm" className="h-9 gap-1.5 rounded-lg font-bold text-[10px] uppercase">
                   <Plus className="h-3.5 w-3.5" /> Generate
                 </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-8 space-y-4">
              {assets.length > 0 ? assets.map((asset, idx) => (
                <div key={idx} className="p-5 border-2 border-primary/5 rounded-2xl bg-muted/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center font-bold text-xs border uppercase">
                        {asset.currency}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{asset.currency} Vault Key</div>
                        <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[150px]">{asset.address}</div>
                      </div>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 gap-1.5 rounded-lg font-bold text-[10px] uppercase hover:bg-primary/10 text-primary">
                          <Key className="h-3 w-3" /> Reveal Key
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-[2rem] max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-xl font-black">Secret Key Exposure</DialogTitle>
                          <DialogDescription className="text-sm font-medium">
                            Absolute control over your <span className="text-primary font-bold">{asset.currency}</span> assets.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-6 space-y-6">
                          <div className="p-5 bg-slate-950 rounded-2xl border border-white/10 relative overflow-hidden">
                            <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-3">Private Cryptographic Key</p>
                            <div className="font-mono text-xs break-all text-white/90 leading-relaxed min-h-[40px] flex items-center">
                              {revealedKeys[asset.address] ? (
                                asset.privateKey || "Key not found in enclave."
                              ) : (
                                <span className="opacity-30 tracking-[0.3em]">••••••••••••••••••••••••••••••••</span>
                              )}
                            </div>
                            <div className="absolute top-4 right-4 flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-white/50 hover:text-white"
                                onClick={() => toggleRevealKey(asset.address)}
                              >
                                {revealedKeys[asset.address] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              {revealedKeys[asset.address] && asset.privateKey && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-white/50 hover:text-white"
                                  onClick={() => copyToClipboard(asset.privateKey!, "Private Key")}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="p-4 bg-amber-500/10 rounded-xl border border-dashed border-amber-500/20 flex gap-3 items-start">
                            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
                            <p className="text-[10px] text-amber-700 font-bold uppercase tracking-tight leading-relaxed">
                              NEVER share this key. Platform engineers cannot recover it if lost.
                            </p>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-3xl opacity-50 font-bold uppercase text-[10px] tracking-widest">
                  No active endpoints provisioned.
                </div>
              )}
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
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-4 shadow-inner">
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
                <h4 className="text-xs font-black uppercase tracking-tight text-secondary">Enclave Protection</h4>
                <p className="text-[10px] opacity-70 leading-relaxed font-medium">
                  Cryptographic keys are isolated to your private vault. Our team has zero access to your master keys.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-dashed border-2 bg-muted/20 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-black uppercase tracking-tight">Access Protocol</h4>
            </div>
            <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
              Loss of your master passphrase and recovery materials will result in permanent loss of assets. Keep backups in offline locations.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
