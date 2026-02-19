
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  ShieldCheck, 
  Wallet,
  Activity,
  Info
} from "lucide-react";
import { MOCK_WALLET_BALANCES, MOCK_TRANSACTIONS, MOCK_MARKET_DATA } from "@/lib/data";

export default function Dashboard() {
  const totalBalance = MOCK_WALLET_BALANCES.reduce((acc, curr) => acc + curr.fiatValueUSD, 0);
  
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <Alert variant="default" className="bg-amber-50 border-amber-200">
        <Info className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800">Demo Environment</AlertTitle>
        <AlertDescription className="text-amber-700">
          This is a user interface demonstration. No real cryptocurrency transactions are processed, and all balances are simulated for preview purposes.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Balance Card */}
        <Card className="md:col-span-2 bg-primary text-primary-foreground overflow-hidden relative shadow-xl">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Wallet className="h-48 w-48" />
          </div>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-primary-foreground/80 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Secure Wallet Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-4">
              ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="gap-2 shadow-lg">
                <ArrowUpRight className="h-4 w-4" /> Send
              </Button>
              <Button variant="outline" className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20">
                <ArrowDownLeft className="h-4 w-4" /> Receive
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Market Highlights */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Market Sentiment
              <Activity className="h-4 w-4 text-secondary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {MOCK_MARKET_DATA.slice(0, 3).map((item) => (
              <div key={item.currency} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs">
                    {item.currency[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{item.currency}</div>
                    <div className="text-xs text-muted-foreground">${item.currentPriceUSD.toLocaleString()}</div>
                  </div>
                </div>
                <div className={cn(
                  "text-xs font-semibold px-2 py-1 rounded",
                  item.dailyChangePercent >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                )}>
                  {item.dailyChangePercent >= 0 ? '+' : ''}{item.dailyChangePercent}%
                </div>
              </div>
            ))}
            <Button variant="ghost" className="w-full text-xs text-muted-foreground mt-2" asChild>
              <a href="/market">View all markets</a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Asset Tracking List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-secondary" />
            Your Assets
          </h3>
          <div className="grid gap-3">
            {MOCK_WALLET_BALANCES.map((asset) => (
              <Card key={asset.currency} className="hover:border-secondary transition-all cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-bold text-sm text-primary">
                      {asset.currency}
                    </div>
                    <div>
                      <div className="font-semibold">{asset.currency}</div>
                      <div className="text-xs text-muted-foreground">{asset.amount} {asset.currency}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">${asset.fiatValueUSD.toLocaleString()}</div>
                    <div className="text-xs text-green-500 font-medium">+1.2%</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Transactions History */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-secondary" />
            Recent Activity
          </h3>
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <div className="divide-y">
                {MOCK_TRANSACTIONS.slice(0, 4).map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center",
                        tx.type === 'receive' ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                      )}>
                        {tx.type === 'receive' ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {tx.type === 'receive' ? 'Received' : 'Sent'} {tx.currency}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                          {tx.description}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn(
                        "font-semibold text-sm",
                        tx.type === 'receive' ? "text-green-600" : "text-foreground"
                      )}>
                        {tx.type === 'receive' ? '+' : '-'}{tx.amount} {tx.currency}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(tx.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Helper function for conditional class names
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
