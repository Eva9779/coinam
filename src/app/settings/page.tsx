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
  Download,
  Copy,
  Settings,
  ArrowRight,
  Import,
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
import { useWalletStore } from '@/lib/store';
import Link from 'next/link';
import { ethers } from 'ethers';
import { doc, setDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

export default function SettingsPage() {
  const db = useFirestore();
  const { user, loading: userLoading } = useUserHook();
  const { assets, botConfig } = useWalletStore();
  
  const [email, setEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  // Import State
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importKey, setImportKey] = useState("");
  const [importPin, setImportPin] = useState("");
  const [importLoading, setImportLoading] = useState(false);

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

  const handleImportWallet = async () => {
    if (!user || !importKey || !importPin) return;
    
    if (importPin.length < 6) {
      toast({ title: "Weak PIN", variant: "destructive" });
      return;
    }

    setImportLoading(true);
    try {
      const cleanKey = importKey.trim().startsWith('0x') ? importKey.trim() : `0x${importKey.trim()}`;
      const wallet = new ethers.Wallet(cleanKey);
      
      const encryptedJson = await wallet.encrypt(importPin);
      
      const botRef = doc(db, 'userBots', user.uid);
      await setDoc(botRef, {
        address: wallet.address,
        encryptedJson,
        isActive: false,
        targetAsset: "ETH",
        holding: "ASSET",
        updatedAt: new Date().toISOString()
      }, { merge: true });

      toast({ title: "Vault Restored", description: `Linked to: ${wallet.address.slice(0, 10)}...` });
      setIsImportOpen(false);
      setImportKey("");
      setImportPin("");
    } catch (e: any) {
      toast({ title: "Import Failed", description: "Invalid private key format.", variant: "destructive" });
    } finally {
      setImportLoading(false);
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
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Syncing Security...</p>
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
          <p className="text-muted-foreground text-sm font-medium">Manage your identity and non-custodial cloud backups.</p>
        </div>
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1 gap-1.5 font-bold uppercase text-[10px]">
          <ShieldCheck className="h-3.5 w-3.5" />
          Cloud Backup Active
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
            <CardHeader className="bg-muted/20 pb-6 border-b flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Vault Backup</CardTitle>
                  <CardDescription className="text-xs">Manage your standard encrypted cloud wallet.</CardDescription>
                </div>
              </div>
              <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" size="sm" className="h-9 font-bold text-[10px] uppercase gap-1.5">
                    <Import className="h-3.5 w-3.5" /> Restore Vault
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-[2rem] sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-black flex gap-2"><Cpu className="h-5 w-5 text-secondary" /> Import Private Key</DialogTitle>
                    <DialogDescription className="text-xs font-medium">Link an existing wallet. We will encrypt it with your PIN before backing it up to Firestore.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Raw Private Key</Label>
                       <Textarea 
                        placeholder="0x..." 
                        className="font-mono text-xs min-h-[80px] rounded-xl bg-muted/20 border-2"
                        value={importKey}
                        onChange={(e) => setImportKey(e.target.value)}
                       />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Set Vault PIN</Label>
                       <Input 
                        type="password"
                        placeholder="••••••••" 
                        className="h-12 text-xl tracking-widest font-black rounded-xl border-2"
                        value={importPin}
                        onChange={(e) => setImportPin(e.target.value)}
                       />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button className="w-full h-12 font-black rounded-xl" onClick={handleImportWallet} disabled={importLoading}>
                      {importLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Authorize Restore"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="pt-8 space-y-4">
              {botConfig ? (
                <div className="p-5 border-2 border-primary/5 rounded-2xl bg-muted/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center font-bold text-xs uppercase">VAULT</div>
                      <div>
                        <div className="font-bold text-sm">Active Strategy Key</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{botConfig.address}</div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(botConfig.address, "Address")}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-xl border border-white/10">
                     <p className="text-[9px] font-black uppercase tracking-widest text-secondary mb-2">Cloud Backup Hash</p>
                     <div className="font-mono text-[8px] break-all text-white/50">
                       {botConfig?.encryptedJson ? `${botConfig.encryptedJson.slice(0, 150)}...` : "No encrypted cloud backup saved yet."}
                     </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center opacity-50 font-bold uppercase text-[10px] tracking-widest border-2 border-dashed rounded-3xl">
                  No active vault provisioned.
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
              <ShieldCheck className="h-4 w-4" /> Sovereignty
            </h3>
            <div className="space-y-4 relative z-10">
               <div className="flex justify-between items-center text-[10px] uppercase font-bold text-white/60">
                 <span>Encryption</span>
                 <Badge className="bg-green-500 text-white text-[8px]">ETH-KEYSTORE-V3</Badge>
               </div>
               <div className="flex justify-between items-center text-[10px] uppercase font-bold text-white/60">
                 <span>Storage</span>
                 <Badge className="bg-green-500 text-white text-[8px]">FIRESTORE-BACKUP</Badge>
               </div>
               <div className="h-px bg-white/10" />
               <p className="text-[10px] opacity-60 leading-relaxed font-medium">
                 Your vault is secured by your personal PIN. Even our administrators cannot access your funds.
               </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
