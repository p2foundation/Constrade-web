'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight,
  BarChart3,
  Activity,
  Eye,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { AnimatedCard, AnimatedButton } from '@/components/ui/animated-card';
import OrderForm from '@/components/trading/OrderForm';
import tradingApi, { MarketData as ApiMarketData } from '@/lib/trading-api';
import { securitiesApi, Security } from '@/lib/api';
import { toast } from 'sonner';

interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
  orders: number;
}

interface MarketData {
  symbol: string;
  name: string;
  lastPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  bid: number;
  ask: number;
  spread: number;
}

interface RecentTrade {
  id: string;
  time: string;
  price: number;
  quantity: number;
  type: 'BUY' | 'SELL';
}

export default function OrderBookPage() {
  const { user, token, isAuthenticated } = useAuth();
  const [securities, setSecurities] = useState<Security[]>([]);
  const [selectedSecurityId, setSelectedSecurityId] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const [buyOrders, setBuyOrders] = useState<OrderBookEntry[]>([]);
  const [sellOrders, setSellOrders] = useState<OrderBookEntry[]>([]);
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load tradable securities (T-Bills & Gov bonds) once authenticated
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const loadSecurities = async () => {
      try {
        const all = await securitiesApi.getAll();
        const filtered = all.filter(
          (s: Security) => s.securityType === 'TREASURY_BILL' || s.securityType === 'TREASURY_BOND',
        );
        setSecurities(filtered);
        if (filtered.length > 0 && !selectedSecurityId) {
          setSelectedSecurityId(filtered[0].id);
        }
      } catch (error) {
        console.error('Failed to load securities for trading:', error);
        toast.error('Unable to load tradable securities');
      }
    };

    loadSecurities();
  }, [isAuthenticated, token, selectedSecurityId]);

  // Load live orderbook + market data for selected security
  useEffect(() => {
    if (!isAuthenticated || !token || !selectedSecurityId) return;

    fetchOrderBookData(selectedSecurityId);
    const interval = setInterval(() => {
      if (autoRefresh) {
        fetchOrderBookData(selectedSecurityId);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isAuthenticated, token, selectedSecurityId, autoRefresh]);

  const fetchOrderBookData = async (securityId: string) => {
    setLoading(true);
    try {
      // Market data
      const md: ApiMarketData = await tradingApi.getMarketData(securityId);

      setMarketData((prev) => ({
        ...prev,
        [securityId]: {
          symbol: md.security?.code || md.securityId,
          name: md.security?.name || md.securityId,
          lastPrice: md.lastPrice,
          change: (md as any).change ?? 0,
          changePercent: (md as any).changePercent ?? 0,
          volume: md.volume,
          high: md.highPrice ?? md.lastPrice,
          low: md.lowPrice ?? md.lastPrice,
          bid: md.bidPrice ?? md.lastPrice,
          ask: md.askPrice ?? md.lastPrice,
          spread: md.spread ?? (md.askPrice && md.bidPrice ? md.askPrice - md.bidPrice : 0),
        },
      }));

      // Orderbook
      const ob = await tradingApi.getOrderBook(securityId);
      const bids: OrderBookEntry[] = (ob.bids || []).map((b: any) => ({
        price: b.price,
        quantity: b.quantity,
        total: b.quantity * b.price,
        orders: b.orderCount ?? 1,
      }));
      const asks: OrderBookEntry[] = (ob.asks || []).map((a: any) => ({
        price: a.price,
        quantity: a.quantity,
        total: a.quantity * a.price,
        orders: a.orderCount ?? 1,
      }));
      setBuyOrders(bids);
      setSellOrders(asks);

      // Recent trades
      const trades = await tradingApi.getRecentTrades(securityId, 20);
      const mappedTrades: RecentTrade[] = (trades || []).map((t: any) => ({
        id: t.id,
        time: new Date(t.tradeDate).toLocaleTimeString('en-GH', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        price: t.price,
        quantity: t.quantity,
        type: 'BUY',
      }));
      setRecentTrades(mappedTrades);
    } catch (error) {
      console.error('Failed to fetch live order book data:', error);
      toast.error('Unable to load live order book');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSubmit = async (order: any) => {
    if (!token || !selectedSecurityId) {
      toast.error('Trading session not ready. Please refresh and try again.');
      return;
    }

    setOrderLoading(true);
    try {
      await tradingApi.placeOrder(
        {
          securityId: selectedSecurityId,
          side: order.type,
          type: order.orderType,
          quantity: order.quantity,
          price: order.price,
        },
        token,
      );
      toast.success('Order submitted successfully');
      await fetchOrderBookData(selectedSecurityId);
    } catch (error: any) {
      console.error('Failed to submit order:', error);
      toast.error(error.message || 'Failed to submit order');
    } finally {
      setOrderLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const currentSecurity = selectedSecurityId ? marketData[selectedSecurityId] : undefined;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Order Book
          </h1>
          <p className="text-muted-foreground mb-6">
            Please sign in to access the live trading interface
          </p>
          <Link href="/login">
            <AnimatedButton variant="primary">
              Sign In
            </AnimatedButton>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border">
        <div className="container-content py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">
                Live Order Book
              </h1>
              <p className="text-muted-foreground text-sm">
                Real-time secondary market trading
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  autoRefresh 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto Refresh
              </button>
              <Link href="/trading/dashboard">
                <AnimatedButton variant="outline" className="text-sm">
                  Dashboard
                </AnimatedButton>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container-content py-6">
        {/* Security Selector and Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {securities.map((sec, index) => {
                const data = marketData[sec.id];
                if (!data) return null;
                const symbol = data.symbol;
                return (
                  <AnimatedCard
                    key={sec.id}
                    delay={index * 50}
                    className={`p-4 border cursor-pointer transition-all ${
                      selectedSecurityId === sec.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedSecurityId(sec.id)}
                  >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">{symbol}</span>
                    <div className={`flex items-center gap-1 ${
                      data.change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {data.change >= 0 ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      <span className="text-xs font-medium">
                        {data.change >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <div className="mb-2">
                    <p className="text-lg font-bold text-foreground">
                      {data.lastPrice.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {data.name}
                    </p>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Bid: {data.bid.toFixed(2)}</span>
                    <span>Ask: {data.ask.toFixed(2)}</span>
                  </div>
                </AnimatedCard>
              );
              })}
            </div>
          </div>
          
          <AnimatedCard className="p-4 border border-border" delay={300}>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Market Stats</span>
            </div>
            {currentSecurity && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Volume</span>
                  <span className="font-medium">{formatNumber(currentSecurity.volume)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">High</span>
                  <span className="font-medium">{currentSecurity.high.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Low</span>
                  <span className="font-medium">{currentSecurity.low.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Spread</span>
                  <span className="font-medium">{currentSecurity.spread.toFixed(2)}</span>
                </div>
              </div>
            )}
          </AnimatedCard>
        </div>

        {/* Main Trading Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Book */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Book Display */}
            <AnimatedCard className="border border-border">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-foreground">Order Book</h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span>Live</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Sell Orders */}
                  <div>
                    <div className="text-xs font-medium text-red-600 mb-3">Sell (Ask)</div>
                    <div className="space-y-1">
                      {sellOrders.slice().reverse().map((order, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs">
                          <span className="text-red-600 font-medium w-12 text-right">
                            {order.price.toFixed(2)}
                          </span>
                          <div className="flex-1 bg-red-100 dark:bg-red-900/20 rounded h-4 relative overflow-hidden">
                            <div 
                              className="absolute inset-y-0 left-0 bg-red-500/20 rounded"
                              style={{ width: `${Math.min((order.total / 1000000000) * 100, 100)}%` }}
                            />
                            <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                              {formatNumber(order.quantity)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Buy Orders */}
                  <div>
                    <div className="text-xs font-medium text-green-600 mb-3">Buy (Bid)</div>
                    <div className="space-y-1">
                      {buyOrders.map((order, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs">
                          <span className="text-green-600 font-medium w-12 text-right">
                            {order.price.toFixed(2)}
                          </span>
                          <div className="flex-1 bg-green-100 dark:bg-green-900/20 rounded h-4 relative overflow-hidden">
                            <div 
                              className="absolute inset-y-0 left-0 bg-green-500/20 rounded"
                              style={{ width: `${Math.min((order.total / 1000000000) * 100, 100)}%` }}
                            />
                            <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                              {formatNumber(order.quantity)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Spread Display */}
                <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Spread</span>
                    <span className="font-medium text-foreground">
                      {currentSecurity?.spread.toFixed(2)} ({currentSecurity ? ((currentSecurity.spread / currentSecurity.ask) * 100).toFixed(3) : '0'}%)
                    </span>
                  </div>
                </div>
              </div>
            </AnimatedCard>

            {/* Recent Trades */}
            <AnimatedCard className="border border-border">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-foreground">Recent Trades</h2>
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    View All
                  </button>
                </div>

                <div className="space-y-2">
                  {recentTrades.map((trade, index) => (
                    <div key={trade.id} className="flex items-center justify-between py-2 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground font-mono">
                          {trade.time}
                        </span>
                        <span className={`font-medium ${
                          trade.type === 'BUY' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {trade.price.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">
                          {formatNumber(trade.quantity)}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          trade.type === 'BUY' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {trade.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedCard>
          </div>

          {/* Order Form */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              {currentSecurity && (
                <OrderForm
                  security={currentSecurity}
                  onSubmit={handleOrderSubmit}
                  loading={orderLoading}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
