"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ExternalLink, ArrowRightLeft, Zap } from "lucide-react";
import { useWalletStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

export function BridgeToBaseButton({ userId, selectedAddress }: { userId: string, selectedAddress: string }) {
  const { botConfig } = useWalletStore();
  const [amount, setAmount] = useState("0.0105");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isWalletLinked = Boolean(
    botConfig?.address && 
    selectedAddress && 
    botConfig.address.toLowerCase() === selectedAddress.toLowerCase()
  );

  async function handleBridge() {
    if (!isWalletLinked) {
      toast({
        title: "Unlock Required",
        description: "This wallet is not currently linked to your enclave. Please import the private key in Settings.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const res = await fetch("/api/wallet/bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amountEth: amount }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Bridge execution failed.");
      }

      setTxHash(data.txHash);
      toast({ title: "Bridge Initiated", description: "Transaction signed and broadcasted to L1." });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Decryption or network error.");
      toast({ title: "Bridge Failed", description: err.message, variant: "destructive" });
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
            onClick={handleBridge}
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
             Action Required: Link this wallet to your enclave in Settings to enable bridging.
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
    </div>
  );
}
