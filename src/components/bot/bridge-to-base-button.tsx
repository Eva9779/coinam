"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ExternalLink, ArrowRightLeft, Zap } from "lucide-react";
import { useWalletStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function BridgeToBaseButton({ userId, selectedAddress, compact }: { userId: string, selectedAddress?: string, compact?: boolean }) {
  const { botConfig } = useWalletStore();
  const [amount, setAmount] = useState("0.0105");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Verification logic for linked enclave
  const isWalletLinked = Boolean(
    botConfig?.address && 
    (!selectedAddress || botConfig.address.toLowerCase() === selectedAddress.toLowerCase())
  );

  async function handleBridge() {
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
      toast({ title: "Bridge Initiated", description: "Transaction signed by server-side enclave." });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Enclave connection or network error.");
      toast({ title: "Bridge Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("space-y-4", compact ? "space-y-2" : "pt-6 border-t border-white/10")}>
      <div className={cn("space-y-3", compact && "space-y-1.5")}>
        <Label className={cn("font-black uppercase tracking-[0.2em] text-secondary opacity-80 flex items-center gap-2", compact ? "text-[8px]" : "text-[10px]")}>
          <ArrowRightLeft className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
          {compact ? "Bridge: L1 → L2" : "Cross-Chain Bridge: L1 → L2"}
        </Label>
        <div className="flex gap-2">
          <Input
            type="number"
            step="0.0005"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={cn("rounded-xl font-bold bg-slate-900 border-white/10 text-white", compact ? "h-9 text-xs" : "h-12")}
            placeholder="Amount ETH"
            disabled={loading}
          />
          <Button
            onClick={handleBridge}
            disabled={loading || !amount}
            className={cn("font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg gap-2 shrink-0", compact ? "h-9 px-4 text-xs" : "h-12 px-6")}
          >
            {loading ? <Loader2 className={cn(compact ? "h-3 w-3" : "h-4 w-4", "animate-spin")} /> : <Zap className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />}
            Bridge
          </Button>
        </div>
      </div>

      {!isWalletLinked && selectedAddress && !compact && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
           <p className="text-[9px] text-amber-500 font-black uppercase flex items-center gap-2">
             Action Required: Link this wallet to your enclave in Settings to enable bridging.
           </p>
        </div>
      )}

      {error && (
        <div className={cn("bg-red-500/10 border border-red-500/20 rounded-xl", compact ? "p-2" : "p-3")}>
          <p className={cn("font-bold uppercase", compact ? "text-[8px]" : "text-[9px]")}>{error}</p>
        </div>
      )}
      
      {txHash && (
        <div className={cn("bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1", compact ? "p-2" : "p-4 space-y-2")}>
          <p className={cn("text-emerald-400 font-black uppercase leading-tight", compact ? "text-[8px]" : "text-[10px]")}>
            Deposit Authorized!
          </p>
          <a
            href={`https://etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className={cn("font-black text-emerald-400 uppercase hover:underline flex items-center gap-1", compact ? "text-[8px]" : "text-[10px]")}
          >
            Verify Receipt
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      )}
      
      {!compact && (
        <p className="text-[9px] text-white/40 font-medium uppercase tracking-tight italic">
          * No PIN required. Signing is handled by your secure server-side enclave.
        </p>
      )}
    </div>
  );
}
