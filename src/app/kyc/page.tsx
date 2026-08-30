
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ShieldCheck, 
  User, 
  Fingerprint, 
  MapPin, 
  Globe, 
  Loader2, 
  CheckCircle2, 
  Landmark,
  ShieldAlert
} from 'lucide-react';
import { useWalletStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

export default function KYCPage() {
  const { kycStatus, submitKYC } = useWalletStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    legalName: '',
    idType: '',
    idNumber: '',
    taxResidency: 'Jamaica',
    investorStatus: 'retail'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await submitKYC(formData);
    setLoading(false);
  };

  if (kycStatus === 'pending') {
    return (
      <div className="max-w-md mx-auto py-20">
        <Card className="text-center p-8 space-y-6 rounded-[3rem] shadow-2xl border-primary/10">
          <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mx-auto border-2 border-dashed border-primary/20">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Compliance Review</h2>
          <p className="text-muted-foreground text-sm font-medium">
            Your institutional identity is being verified by the Antigravity Compliance Protocol. This usually takes 30-60 seconds.
          </p>
          <Button variant="outline" className="w-full h-12 rounded-xl font-bold" onClick={() => router.push('/dashboard')}>
            Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  if (kycStatus === 'verified') {
    return (
      <div className="max-w-md mx-auto py-20">
        <Card className="text-center p-8 space-y-6 rounded-[3rem] shadow-2xl border-primary/10">
          <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto border-2 border-green-500/20 shadow-2xl shadow-green-500/5">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Protocol Verified</h2>
          <p className="text-muted-foreground text-sm font-medium">
            Your identity has been fully verified for Jamaican FSC compliance. Tokenized Equity and Debt trading is now active.
          </p>
          <Button className="w-full h-12 rounded-xl font-bold shadow-xl" onClick={() => router.push('/stocks')}>
            Access Stock Enclave
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-black text-primary tracking-tighter flex items-center justify-center gap-3">
          <Landmark className="h-10 w-10 text-secondary" />
          Regulatory Compliance
        </h2>
        <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-[0.3em]">Institutional Verification Enclave</p>
      </div>

      <Card className="rounded-[2.5rem] shadow-2xl border-primary/10 bg-card/50 backdrop-blur-xl overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <ShieldCheck className="h-48 w-48" />
          </div>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Fingerprint className="h-6 w-6 text-secondary" />
            Institutional KYC
          </CardTitle>
          <CardDescription className="text-primary-foreground/70 font-medium">
            Complete your profile to unlock Real World Asset (RWA) trading in Jamaica.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Full Legal Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Enter full name" 
                    className="pl-10 h-12 rounded-xl"
                    value={formData.legalName}
                    onChange={(e) => setFormData({...formData, legalName: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Tax Residency</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    value="Jamaica" 
                    disabled 
                    className="pl-10 h-12 rounded-xl bg-muted/50"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Identity Document Type</Label>
                <Select value={formData.idType} onValueChange={(v) => setFormData({...formData, idType: v})}>
                  <SelectTrigger className="h-12 rounded-xl font-bold">
                    <SelectValue placeholder="Select ID Type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="national_id">National ID (Jamaica)</SelectItem>
                    <SelectItem value="drivers_license">Driver's License</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Document Number</Label>
                <Input 
                  placeholder="ID Number" 
                  className="h-12 rounded-xl"
                  value={formData.idNumber}
                  onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="p-4 bg-amber-500/5 border border-dashed border-amber-500/20 rounded-2xl flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-700 font-bold uppercase leading-relaxed tracking-tight">
                By submitting, you declare that you are a resident of Jamaica and understand the risks associated with tokenized equity trading.
              </p>
            </div>
          </CardContent>
          <CardFooter className="p-8 pt-0">
            <Button size="lg" className="w-full h-16 text-xl font-black rounded-2xl shadow-xl gap-3 transition-transform hover:scale-[1.01] active:scale-[0.99]" disabled={loading}>
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ShieldCheck className="h-6 w-6" />}
              Authorize Compliance Review
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
