
"use client";

import { useEffect, useState } from "react";
import { generateSmartAlerts, SmartAlertsOutput } from "@/ai/flows/smart-alerts-flow";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ShieldAlert, TrendingUp, Zap, Sparkles, RefreshCw } from "lucide-react";
import { useVaultStore } from "@/lib/store";
import { INITIAL_MARKET_DATA } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useUserHook } from "@/firebase";

export default function AlertsPage() {
  const { assets, transactions, initialized } = useVaultStore();
  const { user } = useUserHook();
  const [data, setData] = useState<SmartAlertsOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const fetchAlerts = async () => {
    if (!initialized || !user) return;
    setLoading(true);
    try {
      const response = await generateSmartAlerts({
        userId: user.uid,
        walletBalances: assets.map(a => ({
          currency: a.currency,
          amount: a.amount,
          fiatValueUSD: a.fiatValueUSD
        })),
        recentTransactions: transactions.map(t => ({
          id: t.id,
          type: t.type === 'trade' ? 'send' : t.type,
          currency: t.currency.split(' ')[0],
          amount: t.amount,
          fiatValueUSD: t.fiatValueUSD,
          timestamp: t.timestamp,
          fromAddress: t.fromAddress,
          toAddress: t.toAddress,
          description: t.description
        })),
        marketData: INITIAL_MARKET_DATA,
        userAverageTransactionAmountUSD: 500,
        userHighValueThresholdUSD: 5000,
      });
      setData(response);
    } catch (error) {
      console.error("Failed to fetch alerts", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    if (initialized && user) {
      fetchAlerts();
    }
  }, [initialized, user]);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-secondary" />
            Active Intelligence
          </h2>
          <p className="text-muted-foreground">
            Continuous AI monitoring for account security and market dynamics.
          </p>
        </div>
        <button 
          onClick={fetchAlerts}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-secondary hover:underline disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Re-analyze Assets
        </button>
      </div>

      <div className="grid gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))
        ) : data?.alerts.length ? (
          data.alerts.map((alert, idx) => (
            <Card key={idx} className="border-l-4 overflow-hidden shadow-sm" style={{ borderLeftColor: getSeverityColor(alert.severity) }}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="flex items-center gap-1 uppercase tracking-wider text-[10px] font-bold">
                    {getTypeIcon(alert.type)}
                    {alert.type.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {mounted ? new Date(alert.timestamp).toLocaleString() : '...'}
                  </span>
                </div>
                <CardTitle className="text-xl">{alert.title}</CardTitle>
                <CardDescription className="text-base text-foreground/80 mt-2 leading-relaxed">
                  {alert.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 border-t bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {alert.relatedAsset && (
                    <div className="text-xs">
                      <span className="text-muted-foreground mr-1">Asset:</span>
                      <span className="font-bold text-primary">{alert.relatedAsset}</span>
                    </div>
                  )}
                  <div className="text-xs">
                    <span className="text-muted-foreground mr-1">Status:</span>
                    <span className="font-bold uppercase" style={{ color: getSeverityColor(alert.severity) }}>
                      {alert.severity}
                    </span>
                  </div>
                </div>
                {alert.transactionId && (
                  <button className="text-xs font-medium text-secondary hover:underline">
                    Investigate
                  </button>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-dashed border-2 flex flex-col items-center justify-center py-20 text-center">
            <Zap className="h-12 w-12 text-muted mb-4" />
            <h3 className="text-xl font-semibold mb-2">System Healthy</h3>
            <p className="text-muted-foreground max-w-sm">
              AI Guardian reports no anomalies in your account activity or current market exposure.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'critical': return '#ef4444';
    case 'high': return '#f97316';
    case 'medium': return '#eab308';
    case 'low': return '#00BCD4';
    default: return '#3F51B5';
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'unusual_transaction': return <AlertCircle className="h-3 w-3" />;
    case 'large_transaction': return <ShieldAlert className="h-3 w-3" />;
    case 'significant_market_movement': return <TrendingUp className="h-3 w-3" />;
    case 'low_balance_warning': return <Zap className="h-3 w-3" />;
    default: return <Sparkles className="h-3 w-3" />;
  }
}
