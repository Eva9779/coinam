"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ExternalLink, ArrowRightLeft, Zap, Lock, ShieldCheck } from "lucide-react";
import { useWalletStore } from "@/lib/store";
import { ethers } from "ethers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

const BASE_L1_BRIDGE = "0x3154Cf16ccdb4C6d922629664174b904d80F2C35";
const BRIDGE_ABI = ["function depositETH(uint32 _minGasLimit, bytes calldata _extraData) external payable"];

export function BridgeToBaseButton({ userId, selectedAddress }: { userId: string, selectedAddress: string }) {
  const { botConfig } = useWalletStore();
  const [amount, setAmount] = useState("0.0105");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pin, setPin] = useState("");

  const isWalletLinked = botConfig && botConfig.address.toLowerCase() === selectedAddress.toLowerCase();

  async function handlePreBridge() {
    if (!isWalletLinked) {
      toast({
        title: "Unlock Required",
        description: "This wallet is not currently linked to your enclave. Please import the private key in Settings.",
        variant: "destructive"
      });
      return;
    }
    setShowPinDialog(true);
  }

  async function handleFinalBridge() {
    if (!botConfig || !pin) return;
    setLoading(true);
    setError(null);
    setTxHash(null);

    try {
      // 1. Decrypt Keystore locally with user PIN
      const wallet = await ethers.Wallet.fromEncryptedJson(botConfig.encryptedJson, pin);
      
      // 2. Setup Provider (Ethereum Mainnet L1)
      const provider = new ethers.JsonRpcProvider("https://ethereum-rpc.publicnode.com");
      const signer = wallet.connect(provider);

      // 3. Contract Instance
      const bridge = new ethers.Contract(BASE_L1_BRIDGE, BRIDGE_ABI, signer);
      
      // 4. Send Transaction directly from client
      const tx = await bridge.depositETH(200000, "0x", { 
        value: ethers.parseEther(amount) 
      });

      setTxHash(tx.hash);
      setShowPinDialog(false);
      setPin("");
      toast({ title: "Bridge Initiated", description: "Transaction signed and broadcasted to L1." });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Execution failed. Ensure PIN is correct and balance is sufficient.");
      toast({ title: "Bridge Failed", description: "Decryption or network error.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pt-6 border-t border-white/10 space-y-4">
      <div className="space-y-3">
        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary opacity-80 flex items-center gap-2">
          <ArrowRightLeft className="h-3 w-3" />
          Cross-Chain Bridge: L1 → L2
        </Label>
        <div className="flex gap-2">
          <Input
            type="number"
            step="0.0005"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-12 rounded-xl font-bold bg-slate-900 border-white/10 text-white"
            placeholder="Amount ETH"
            disabled={loading}
          />
          <Button
            onClick={handlePreBridge}
            disabled={loading || !amount}
            className="h-12 px-6 font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg gap-2 shrink-0"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Bridge
          </Button>
        </div>
      </div>

      {!isWalletLinked && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
           <p className="text-[9px] text-amber-500 font-black uppercase flex items-center gap-2">
             <Lock className="h-3 w-3" /> 
             Action Required: Import Private Key in Settings to link this wallet to your enclave.
           </p>
        </div>
      )}

      {error && isWalletLinked && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-[9px] text-red-600 font-bold uppercase">{error}</p>
        </div>
      )}
      
      {txHash && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
          <p className="text-[10px] text-emerald-400 font-black uppercase leading-tight">
            Deposit Authorized! Assets arrive on Base in ~3-5 mins.
          </p>
          <a
            href={`https://etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] font-black text-emerald-400 uppercase hover:underline flex items-center gap-1"
          >
            Verify Receipt
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
      
      <p className="text-[9px] text-white/40 font-medium uppercase tracking-tight italic">
        * Gas fee applies on Ethereum Mainnet. Ensure ~0.005 ETH extra for network fees.
      </p>

      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="rounded-[2rem] sm:max-w-md bg-slate-900 border-white/10 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2">
              <Lock className="h-6 w-6 text-secondary" />
              Sign Bridge
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Enter your Vault PIN to decrypt your key and sign the L1 deposit to Base.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Vault PIN</Label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                className="h-14 text-2xl tracking-widest text-center font-black rounded-xl border-2 bg-slate-950 border-white/10"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-14 font-black rounded-xl text-lg shadow-xl" onClick={handleFinalBridge} disabled={loading || !pin}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ShieldCheck className="h-5 w-5 mr-2" />}
              Authorize & Sign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}