
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ExternalLink, ArrowRightLeft, Zap } from "lucide-react";

export function BridgeToBaseButton({ userId }: { userId: string }) {
  const [amount, setAmount] = useState("0.0105");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleBridge() {
    setLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const res = await fetch("/api/wallet/bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amountEth: amount })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bridge failed");
      setTxHash(data.txHash);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pt-6 border-t border-primary/10 space-y-4">
      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 flex items-center gap-2">
          <ArrowRightLeft className="h-3 w-3" />
          Bridge Ethereum (L1) → Base (L2)
        </Label>
        <div className="flex gap-2">
          <Input
            type="number"
            step="0.0005"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-12 rounded-xl font-bold bg-background/50 border-2"
            placeholder="0.0105"
            disabled={loading}
          />
          <Button
            onClick={handleBridge}
            disabled={loading || !amount}
            className="h-12 px-6 font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 gap-2 shrink-0"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Bridge
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-[10px] text-red-600 font-bold uppercase">{error}</p>
        </div>
      )}
      
      {txHash && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
          <p className="text-[10px] text-emerald-700 font-bold uppercase leading-tight">
            Deposit Authorized! Assets arrive on Base in ~3-5 mins.
          </p>
          <a
            href={`https://etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] font-black text-emerald-600 uppercase hover:underline flex items-center gap-1"
          >
            Verify on Etherscan
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
      
      <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tight italic">
        * Gas fee applies on Ethereum Mainnet. Ensure ~0.005 ETH extra for network fees.
      </p>
    </div>
  );
}
