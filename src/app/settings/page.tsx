
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Key,
  Fingerprint,
  ShieldAlert,
  Plus,
  Download,
  Eye,
  EyeOff,
  Copy,
  Terminal,
  Settings,
  ArrowRight
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
import { useWalletStore } from '@/lib/store';
import { decryptKey } from '@/lib/encryption';
import Link from 'next/link';

export default function SettingsPage() {
  const auth = useAuth();
  const { user, loading: userLoading } = useUserHook();
  const { assets, generateNewWallet, importPrivateKey } = useWalletStore();
  
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
  const [decryptedKeys, setDecryptedKeys] = useState<Record<string, string>>({});
  const [revealedStates, setRevealedStates] = useState<Record<string, boolean>>({});

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
      toast({ title: "Endpoint Updated" });
      setCurrentPassword('');
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (newPassword !== confirmPassword) {
      toast({ title: "Validation Error", description: "Passphrases do not match.", variant: "destructive" });
      return;
    }

    setLoadingPassword(true);
    try {
      if (currentPassword) {
        const credential = EmailAuthProvider.credential(user.email!, currentPassword);
        await reauthenticateWithCredential(user, credential);
      }

      await updatePassword(user, newPassword);
      toast({ title: "Security Hardened" });
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
    } catch (error: any) {
      toast({ title: "Security Violation", description: error.message, variant: "destructive" });
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    await generateNewWallet('ETH');
    setIsGenerating(false);
    toast({ title: "Key Provisioned" });
  };

  const handleImport = async () => {
    if (!importKey.startsWith('0x') || importKey.length !== 66) {
      toast({ title: "Invalid Key Format", variant: "destructive" });
      return;
    }
    setImportLoading(true);
    try {
      await importPrivateKey('ETH', importKey);
      setIsImportOpen(false);
      setImportKey("");
    } catch (e) { } finally { setImportLoading(false); }
  };

  const handleToggleReveal = async (address: string, encryptedKey?: string) => {
    if (!encryptedKey || !user) return;
    
    if (revealedStates[address]) {
      setRevealedStates(prev => ({ ...prev, [address]: false }));
      return;
    }

    try {
      const decrypted = await decryptKey(user.uid, encryptedKey);
      setDecryptedKeys(prev => ({ ...prev, [address]: decrypted }));
      setRevealedStates(prev => ({ ...prev, [address]: true }));
    } catch (e) {
      toast({ title: "Decryption Failed", variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} Copied` });
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
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="p-4 bg-amber-500/5 border border-dashed border-amber-500/20 rounded-xl flex items-start gap-3">
                  <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-700 font-bold uppercase tracking-tight">
                    Identity changes require your current passphrase for network verification.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Verify Current Passphrase</Label>
                  <Input 
                    type="password" 
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)} 
                    className="h-12 rounded-xl"
                    required
                  />
                </div>
                <Button disabled={loadingEmail} className="w-full h-12 rounded-xl font-bold shadow-lg">
                  {loadingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Identity"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-2xl border-primary/5 bg-card/50 backdrop-blur-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-muted/20 pb-6 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Passphrase Rotation</CardTitle>
                  <CardDescription className="text-xs">Harden your wallet security with a new master key.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8 space-y-6">
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">New Wallet Passphrase</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-12 rounded-xl" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Verify New Passphrase</Label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-12 rounded-xl" required />
                </div>
                <Button disabled={loadingPassword} className="w-full h-12 rounded-xl font-bold bg-secondary text-secondary-foreground">
                  {loadingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Authorize Rotation"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-2xl border-primary/5 bg-card/50 backdrop-blur-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-muted/20 pb-6 border-b flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Wallet Credentials</CardTitle>
                  <CardDescription className="text-xs">Manage your encrypted non-custodial keys.</CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                 <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 font-bold text-[10px] uppercase">
                        <Download className="h-3.5 w-3.5 mr-1.5" /> Import
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-[2rem]">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-black flex gap-2"><Terminal className="h-5 w-5" /> Restore Wallet</DialogTitle>
                        <DialogDescription>Enter an existing private key to restore your assets.</DialogDescription>
                      </DialogHeader>
                      <Textarea 
                        placeholder="0x..." 
                        className="font-mono text-xs min-h-[100px] rounded-xl"
                        value={importKey}
                        onChange={(e) => setImportKey(e.target.value)}
                      />
                      <DialogFooter>
                        <Button className="w-full h-12 font-bold" onClick={handleImport} disabled={importLoading}>
                          {importLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Authorize Restore"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                 </Dialog>
                 <Button onClick={handleGenerate} disabled={isGenerating} size="sm" className="h-9 font-bold text-[10px] uppercase">
                   <Plus className="h-3.5 w-3.5 mr-1.5" /> Generate
                 </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-8 space-y-4">
              {assets.length > 0 ? assets.map((asset, idx) => (
                <div key={idx} className="p-5 border-2 border-primary/5 rounded-2xl bg-muted/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center font-bold text-xs uppercase">{asset.currency}</div>
                      <div>
                        <div className="font-bold text-sm">{asset.currency} Wallet Key</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{asset.address}</div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleToggleReveal(asset.address, asset.privateKey)}
                      className="h-8 font-bold text-[10px] uppercase text-primary"
                    >
                      <Key className="h-3 w-3 mr-1.5" /> {revealedStates[asset.address] ? 'Hide Key' : 'Reveal Key'}
                    </Button>
                  </div>
                  {revealedStates[asset.address] && (
                    <div className="p-4 bg-slate-950 rounded-xl border border-white/10 relative overflow-hidden">
                       <p className="text-[9px] font-black uppercase tracking-widest text-secondary mb-2">Decrypted Cryptographic Key</p>
                       <div className="font-mono text-[10px] break-all text-white/90 pr-10">
                         {decryptedKeys[asset.address]}
                       </div>
                       <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-2 top-8 text-white/50"
                        onClick={() => copyToClipboard(decryptedKeys[asset.address], "Private Key")}
                       >
                         <Copy className="h-4 w-4" />
                       </Button>
                    </div>
                  )}
                </div>
              )) : (
                <div className="py-12 text-center opacity-50 font-bold uppercase text-[10px] tracking-widest border-2 border-dashed rounded-3xl">
                  No active endpoints provisioned.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-950 text-white rounded-[2rem] p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Fingerprint className="h-48 w-48" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest text-secondary flex items-center gap-2 mb-6">
              <ShieldCheck className="h-4 w-4" /> Security Status
            </h3>
            <div className="space-y-4 relative z-10">
               <div className="flex justify-between items-center text-[10px] uppercase font-bold text-white/60">
                 <span>Encryption Protocol</span>
                 <Badge className="bg-green-500 text-white text-[8px]">AES-GCM-256</Badge>
               </div>
               <div className="flex justify-between items-center text-[10px] uppercase font-bold text-white/60">
                 <span>Key Storage</span>
                 <Badge className="bg-green-500 text-white text-[8px]">ENCRYPTED-REST</Badge>
               </div>
               <div className="h-px bg-white/10" />
               <Button variant="outline" className="w-full text-white border-white/10 rounded-xl h-12 text-[10px] uppercase font-black gap-2 group" asChild>
                  <Link href="/settings">
                    <Settings className="h-4 w-4 text-secondary group-hover:rotate-90 transition-transform" />
                    Manage Protocol
                    <ArrowRight className="h-3 w-3 ml-auto" />
                  </Link>
               </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
