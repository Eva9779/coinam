
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
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { useWalletStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Germany", "France", "Japan", "Jamaica", "Singapore", "Switzerland", "Australia"
];

export default function KYCPage() {
  const { kycStatus, submitKYC } = useWalletStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    legalName: '',
    idType: '',
    idNumber: '',
    taxResidency: 'United States',
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
          <h2 className="text-2xl font-black tracking-tight">Institutional Review</h2>
          <p className="text-muted-foreground text-sm font-medium">
            Our global compliance protocol is reviewing your identity for RWA trading. This usually takes 30-60 seconds.
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
          <h2 className="text-2xl font-black tracking-tight">Identity Verified</h2>
          <p className="text-muted-foreground text-sm font-medium">
            Your global institutional profile is verified. Tokenized Stocks and Bonds (RWA) trading is now active for your account.
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
          <Globe className="h-10 w-10 text-secondary" />
          Global Verification
        </h2>
        <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-[0.3em]">Universal Asset Compliance Enclave</p>
      </div>

      <Card className="rounded-[2.5rem] shadow-2xl border-primary/10 bg-card/50 backdrop-blur-xl overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <ShieldCheck className="h-48 w-48" />
          </div>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Fingerprint className="h-6 w-6 text-secondary" />
            Institutional Profile
          </CardTitle>
          <CardDescription className="text-primary-foreground/70 font-medium">
            Verification required for Real World Asset (RWA) exposure globally.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Full Legal Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <input 
                    placeholder="Johnathan Doe" 
                    className="flex h-12 w-full rounded-xl border border-input bg-background px-10 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={formData.legalName}
                    onChange={(e) => setFormData({...formData, legalName: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Tax Residency</Label>
                <Select value={formData.taxResidency} onValueChange={(v) => setFormData({...formData, taxResidency: v})}>
                  <SelectTrigger className="h-12 rounded-xl font-bold">
                    <SelectValue placeholder="Select Country" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {COUNTRIES.map(country => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    <SelectItem value="passport">Passport (International)</SelectItem>
                    <SelectItem value="national_id">National ID / Driver's License</SelectItem>
                    <SelectItem value="entity">Corporate Entity Registration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Document Number</Label>
                <input 
                  placeholder="ID / Passport Number" 
                  className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.idNumber}
                  onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="p-4 bg-amber-500/5 border border-dashed border-amber-500/20 rounded-2xl flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-700 font-bold uppercase leading-relaxed tracking-tight">
                By submitting, you declare your tax residency is accurate and you accept the risks of trading tokenized securities in your local jurisdiction.
              </p>
            </div>
          </CardContent>
          <CardFooter className="p-8 pt-0">
            <Button size="lg" className="w-full h-16 text-xl font-black rounded-2xl shadow-xl gap-3 transition-transform hover:scale-[1.01] active:scale-[0.99]" disabled={loading}>
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ShieldCheck className="h-6 w-6" />}
              Authorize Global Verification
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
