'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  TrendingUp,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  X,
  ArrowUpRight,
  FileText,
  Building2,
  RefreshCw,
  Wallet,
  CreditCard,
  Activity,
  Target,
} from 'lucide-react';
import { AnimatedCard, AnimatedButton } from '@/components/ui/animated-card';
import { auctionsApi, Bid as ApiBid, portfolioApi } from '@/lib/api';

interface ActiveBid {
  id: string;
  bidReference: string;
  auction: {
    id: string;
    auctionId: string;
    security: {
      name: string;
      isin: string;
    };
    biddingCloseDate: string;
  };
  amount: number;
  yield?: number;
  price?: number;
  type: 'COMPETITIVE' | 'NON_COMPETITIVE';
  status: 'PENDING' | 'SUBMITTED';
  submittedAt: string;
  canModify: boolean;
  canCancel: boolean;
}

interface PendingSettlement {
  id: string;
  auction: {
    id: string;
    auctionId: string;
    security: {
      name: string;
      isin: string;
    };
    settlementDate: string;
  };
  allocatedAmount: number;
  allocatedYield: number;
  allocationRatio: number;
  settlementAmount: number;
  status: 'ALLOCATED' | 'SETTLEMENT_PENDING' | 'SETTLED';
  paymentStatus?: string;
  fundsEarmarked?: boolean;
  paymentReference?: string | null;
  settlementInstructionStatus?: string | null;
  contractId?: string | null;
}

interface PrimaryMarketHolding {
  id: string;
  security: {
    name: string;
    isin: string;
    type: 'TREASURY_BILL' | 'TREASURY_BOND';
    maturityDate: string;
  };
  quantity: number;
  purchasePrice: number;
  purchaseYield: number;
  purchaseDate: string;
  currentValue: number;
  source: 'PRIMARY_MARKET';
  auctionId: string;
}

export default function PrimaryMarketTradingPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'bidding' | 'settlement' | 'holdings'>('bidding');

  const mapApiBidToActive = (bid: ApiBid): ActiveBid => {
    const auction: any = bid.auction;
    const security: any = auction?.security;

    return {
      id: bid.id,
      bidReference: (bid as any).bidCode || bid.id,
      auction: {
        id: auction?.id || bid.auctionId,
        auctionId: auction?.auctionId || auction?.auctionCode || auction?.id || bid.auctionId,
        security: {
          name: security?.name || 'Security',
          isin: security?.isin || security?.code || '',
        },
        biddingCloseDate: auction?.biddingCloseDate || auction?.auctionDate || bid.createdAt,
      },
      amount: bid.amount,
      yield: bid.yield ?? undefined,
      type: (bid.type === 'COMPETITIVE' || bid.type === 'NON_COMPETITIVE' ? bid.type : 'COMPETITIVE'),
      status: (bid.status as any) || 'PENDING',
      submittedAt: (bid as any).submittedAt || bid.createdAt,
      canModify: (bid.status as any) === 'PENDING',
      canCancel: (bid.status as any) === 'PENDING',
      price: (bid as any).price ?? undefined,
    };
  };

  const { data: activeBids, isLoading: bidsLoading, refetch: refetchBids } = useQuery({
    queryKey: ['active-bids'],
    enabled: !!token && activeTab === 'bidding',
    queryFn: async () => {
      const rawBids = await auctionsApi.getMyBids({ status: 'PENDING' });
      return (rawBids as ApiBid[]).map(mapApiBidToActive);
    },
  });

  // Fetch pending settlements from API
  const { data: pendingSettlements, isLoading: settlementLoading, refetch: refetchSettlements } = useQuery({
    queryKey: ['pending-settlements'],
    queryFn: async () => {
      const rawSettlements = await auctionsApi.getMySettlements();
      return (rawSettlements || []).map((s: any): PendingSettlement => ({
        id: s.id,
        auction: {
          id: s.auction.id,
          auctionId: s.auction.auctionId || s.auction.id,
          security: {
            name: s.auction.security.name,
            isin: s.auction.security.isin || '',
          },
          settlementDate: s.auction.settlementDate,
        },
        allocatedAmount: s.allocatedAmount,
        allocatedYield: s.allocatedYield || 0,
        allocationRatio: s.allocationRatio || 0,
        settlementAmount: s.settlementAmount || s.allocatedAmount,
        status: s.status || 'SETTLEMENT_PENDING',
        paymentStatus: s.paymentStatus,
        fundsEarmarked: s.fundsEarmarked,
        paymentReference: s.paymentReference,
        settlementInstructionStatus: s.settlementInstructionStatus,
        contractId: s.contractId,
      }));
    },
    enabled: !!token && activeTab === 'settlement',
  });

  // Fetch holdings from portfolio API
  const { data: holdings, isLoading: holdingsLoading, refetch: refetchHoldings } = useQuery({
    queryKey: ['primary-market-holdings'],
    queryFn: async () => {
      const { portfolioApi } = await import('@/lib/api');
      const rawHoldings = await portfolioApi.getHoldings();
      // All holdings from portfolio are from primary market (auctions)
      // Transform to match PrimaryMarketHolding interface
      return (rawHoldings || []).map((h: any): PrimaryMarketHolding => ({
        id: h.id,
        security: {
          name: h.security?.name || 'Security',
          isin: h.security?.isin || h.security?.code || '',
          type: (h.security?.type || 'TREASURY_BILL') as 'TREASURY_BILL' | 'TREASURY_BOND',
          maturityDate: h.maturityDate || h.security?.maturityDate || new Date().toISOString(),
        },
        quantity: h.amount || 0,
        purchasePrice: h.amount || 0, // Use amount as purchase price
        purchaseYield: h.couponRate || 0,
        purchaseDate: h.purchaseDate || new Date().toISOString(),
        currentValue: h.amount || 0, // For now, current value equals amount
        source: 'PRIMARY_MARKET',
        auctionId: '', // Holdings don't directly link to auctions in schema
      }));
    },
    enabled: !!token && activeTab === 'holdings',
  });

  // Calculate statistics
  const totalActiveBids = activeBids?.length || 0;
  const totalBidAmount = activeBids?.reduce((sum, bid) => sum + bid.amount, 0) || 0;
  const totalPendingSettlement = pendingSettlements?.reduce((sum, s) => sum + s.settlementAmount, 0) || 0;
  const totalHoldingsValue = holdings?.reduce((sum, h) => sum + h.currentValue, 0) || 0;

  const isPaymentConfirmed = (settlement: PendingSettlement) =>
    settlement.paymentStatus === 'PAID' || settlement.fundsEarmarked;

  const isInstructionReady = (settlement: PendingSettlement) =>
    ['GENERATED', 'SENT', 'CONFIRMED'].includes(
      (settlement.settlementInstructionStatus || '').toUpperCase(),
    );

  const getSettlementStepStatus = (settlement: PendingSettlement) => ({
    payment: isPaymentConfirmed(settlement) ? 'complete' : 'current',
    instruction: isInstructionReady(settlement)
      ? 'complete'
      : isPaymentConfirmed(settlement)
        ? 'current'
        : 'upcoming',
    settlement: settlement.status === 'SETTLED'
      ? 'complete'
      : isPaymentConfirmed(settlement) && isInstructionReady(settlement)
        ? 'current'
        : 'upcoming',
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container-content py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Primary Market Trading</h1>
              <p className="text-muted-foreground">
                Manage your auction bids, track settlements, and view primary market holdings
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/auctions">
                <AnimatedButton variant="outline">
                  <Building2 className="h-4 w-4 mr-2" />
                  Browse Auctions
                </AnimatedButton>
              </Link>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <AnimatedCard className="p-6 border border-border">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Bids</p>
                <p className="text-2xl font-bold text-foreground">{totalActiveBids}</p>
                <p className="text-sm text-muted-foreground">₵{(totalBidAmount / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard className="p-6 border border-border" delay={100}>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Settlement</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingSettlements?.length || 0}</p>
                <p className="text-sm text-muted-foreground">₵{(totalPendingSettlement / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard className="p-6 border border-border" delay={200}>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Primary Holdings</p>
                <p className="text-2xl font-bold text-green-600">{holdings?.length || 0}</p>
                <p className="text-sm text-muted-foreground">₵{(totalHoldingsValue / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard className="p-6 border border-border" delay={300}>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Activity className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Exposure</p>
                <p className="text-2xl font-bold text-foreground">
                  ₵{((totalBidAmount + totalPendingSettlement + totalHoldingsValue) / 1000).toFixed(0)}K
                </p>
                <p className="text-sm text-muted-foreground">All primary market</p>
              </div>
            </div>
          </AnimatedCard>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex items-center gap-2 border-b border-border">
            <button
              onClick={() => setActiveTab('bidding')}
              className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
                activeTab === 'bidding'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Active Bidding
                {totalActiveBids > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                    {totalActiveBids}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('settlement')}
              className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
                activeTab === 'settlement'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Settlement
                {pendingSettlements && pendingSettlements.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/10 text-yellow-600">
                    {pendingSettlements.length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('holdings')}
              className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
                activeTab === 'holdings'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Primary Holdings
                {holdings && holdings.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-600">
                    {holdings.length}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Active Bidding Tab */}
        {activeTab === 'bidding' && (
          <div className="space-y-6">
            {bidsLoading ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                <p className="mt-4 text-muted-foreground">Loading active bids...</p>
              </div>
            ) : activeBids && activeBids.length > 0 ? (
              <>
                {activeBids.map((bid, index) => (
                  <AnimatedCard key={bid.id} className="border border-border" delay={index * 100}>
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-foreground">
                              {bid.auction.security.name}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              bid.status === 'SUBMITTED'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}>
                              {bid.status}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              bid.type === 'COMPETITIVE'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            }`}>
                              {bid.type.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Bid Reference: <span className="font-mono font-semibold">{bid.bidReference}</span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Auction: {bid.auction.auctionId} • Closes: {new Date(bid.auction.biddingCloseDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-foreground">
                            ₵{bid.amount.toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground">Bid Amount</p>
                          {bid.yield && (
                            <p className="text-sm font-medium text-primary mt-1">
                              Yield: {bid.yield.toFixed(2)}%
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-4 border-t border-border">
                        {bid.canModify && (
                          <AnimatedButton 
                            variant="outline" 
                            onClick={() => window.location.href = `/auctions/${bid.auction.id}`}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Modify Bid
                          </AnimatedButton>
                        )}
                        {bid.canCancel && (
                          <AnimatedButton 
                            variant="outline" 
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel Bid
                          </AnimatedButton>
                        )}
                        <AnimatedButton 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => window.location.href = `/auctions/${bid.auction.id}`}
                        >
                          <ArrowUpRight className="h-4 w-4 mr-2" />
                          View Auction Details
                        </AnimatedButton>
                      </div>
                    </div>
                  </AnimatedCard>
                ))}
                <AnimatedCard className="p-6 border border-border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold mb-1">Want to place a new bid?</h3>
                      <p className="text-sm text-muted-foreground">
                        Browse available auctions and submit your bids
                      </p>
                    </div>
                    <Link href="/auctions">
                      <AnimatedButton variant="primary">
                        <ArrowUpRight className="h-4 w-4 mr-2" />
                        Browse Auctions
                      </AnimatedButton>
                    </Link>
                  </div>
                </AnimatedCard>
              </>
            ) : (
              <AnimatedCard className="p-12 text-center border border-border">
                <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No Active Bids</h3>
                <p className="text-muted-foreground mb-6">
                  You don't have any active bids. Browse available auctions to place your bids.
                </p>
                <Link href="/auctions">
                  <AnimatedButton variant="primary">
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                    Browse Auctions
                  </AnimatedButton>
                </Link>
              </AnimatedCard>
            )}
          </div>
        )}

        {/* Settlement Tab */}
        {activeTab === 'settlement' && (
          <div className="space-y-6">
            {settlementLoading ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                <p className="mt-4 text-muted-foreground">Loading settlements...</p>
              </div>
            ) : pendingSettlements && pendingSettlements.length > 0 ? (
              <>
                {pendingSettlements.map((settlement, index) => {
                  const progress = getSettlementStepStatus(settlement);
                  return (
                  <AnimatedCard key={settlement.id} className="border border-border" delay={index * 100}>
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-foreground">
                              {settlement.auction.security.name}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              settlement.status === 'SETTLED'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}>
                              <Clock className="h-3 w-3 inline mr-1" />
                              {settlement.status === 'SETTLED' ? 'Settled' : 'Settlement Pending'}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              isPaymentConfirmed(settlement)
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                            }`}>
                              {isPaymentConfirmed(settlement) ? 'Payment Confirmed' : 'Payment Pending'}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Auction: {settlement.auction.auctionId} • ISIN: {settlement.auction.security.isin}
                          </p>
                          {settlement.paymentReference && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Payment Reference: <span className="font-mono">{settlement.paymentReference}</span>
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-foreground">
                            ₵{settlement.settlementAmount.toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground">Settlement Amount</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Allocated Amount</p>
                          <p className="text-sm font-medium">₵{settlement.allocatedAmount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Allocated Yield</p>
                          <p className="text-sm font-medium">{settlement.allocatedYield.toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Allocation Ratio</p>
                          <p className="text-sm font-medium">{settlement.allocationRatio.toFixed(0)}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Settlement Date</p>
                          <p className="text-sm font-medium">
                            {new Date(settlement.auction.settlementDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="bg-muted/40 rounded-lg p-4 mb-4">
                        <p className="text-sm font-medium text-foreground mb-3">Settlement Progress</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {[
                            { label: 'Payment', status: progress.payment },
                            { label: 'CSD Instruction', status: progress.instruction },
                            { label: 'Settlement', status: progress.settlement },
                          ].map((step) => (
                            <div key={step.label} className="flex items-center gap-2">
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  step.status === 'complete'
                                    ? 'bg-green-500'
                                    : step.status === 'current'
                                      ? 'bg-blue-500'
                                      : 'bg-muted-foreground/40'
                                }`}
                              />
                              <span className={`text-xs ${
                                step.status === 'complete'
                                  ? 'text-green-600 dark:text-green-400'
                                  : step.status === 'current'
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-muted-foreground'
                              }`}>
                                {step.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {isPaymentConfirmed(settlement) ? (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
                          <div className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                                Payment Confirmed
                              </p>
                              <p className="text-blue-700 dark:text-blue-300">
                                Your payment is confirmed. Settlement will be processed by CSD on
                                {` `}{new Date(settlement.auction.settlementDate).toLocaleDateString()}.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 mb-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                                Payment Required
                              </p>
                              <p className="text-yellow-700 dark:text-yellow-300">
                                Please ensure payment of ₵{settlement.settlementAmount.toLocaleString()} is made before the settlement date. 
                                Securities will be credited to your CSD account upon successful payment.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3 pt-4 border-t border-border">
                        {isPaymentConfirmed(settlement) ? (
                          <AnimatedButton variant="outline" className="flex-1" disabled>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Payment Confirmed
                          </AnimatedButton>
                        ) : (
                          <AnimatedButton variant="primary" className="flex-1">
                            <CreditCard className="h-4 w-4 mr-2" />
                            Make Payment
                          </AnimatedButton>
                        )}
                        {(settlement as any).contractId ? (
                          <a
                            href={`/contracts/${(settlement as any).contractId}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <AnimatedButton variant="outline" className="flex-1">
                              <FileText className="h-4 w-4 mr-2" />
                              View Contract
                            </AnimatedButton>
                          </a>
                        ) : (
                          <AnimatedButton variant="outline" className="flex-1">
                            <FileText className="h-4 w-4 mr-2" />
                            View Details
                          </AnimatedButton>
                        )}
                      </div>
                    </div>
                  </AnimatedCard>
                  );
                })}
              </>
            ) : (
              <AnimatedCard className="p-12 text-center border border-border">
                <CreditCard className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No Pending Settlements</h3>
                <p className="text-muted-foreground mb-6">
                  You don't have any securities awaiting settlement at the moment.
                </p>
              </AnimatedCard>
            )}
          </div>
        )}

        {/* Primary Holdings Tab */}
        {activeTab === 'holdings' && (
          <div className="space-y-6">
            {holdingsLoading ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                <p className="mt-4 text-muted-foreground">Loading holdings...</p>
              </div>
            ) : holdings && holdings.length > 0 ? (
              <>
                {holdings.map((holding, index) => (
                  <AnimatedCard key={holding.id} className="border border-border" delay={index * 100}>
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-foreground">
                              {holding.security.name}
                            </h3>
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              <CheckCircle className="h-3 w-3 inline mr-1" />
                              Settled
                            </span>
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              Primary Market
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            ISIN: {holding.security.isin}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Maturity: {new Date(holding.security.maturityDate).toLocaleDateString()} • 
                            Purchased: {new Date(holding.purchaseDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-foreground">
                            ₵{holding.currentValue.toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground">Current Value</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Quantity</p>
                          <p className="text-sm font-medium">₵{holding.quantity.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Purchase Price</p>
                          <p className="text-sm font-medium">₵{holding.purchasePrice.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Purchase Yield</p>
                          <p className="text-sm font-medium">{holding.purchaseYield.toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Unrealized P&L</p>
                          <p className={`text-sm font-medium ${
                            holding.currentValue > holding.quantity * holding.purchasePrice
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            ₵{(holding.currentValue - holding.quantity * holding.purchasePrice).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-4 border-t border-border">
                        <AnimatedButton variant="outline" className="flex-1">
                          <TrendingUp className="h-4 w-4 mr-2" />
                          View in Portfolio
                        </AnimatedButton>
                        <AnimatedButton variant="outline" className="flex-1">
                          <FileText className="h-4 w-4 mr-2" />
                          View Certificate
                        </AnimatedButton>
                      </div>
                    </div>
                  </AnimatedCard>
                ))}
              </>
            ) : (
              <AnimatedCard className="p-12 text-center border border-border">
                <Wallet className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No Primary Market Holdings</h3>
                <p className="text-muted-foreground mb-6">
                  You don't have any securities from primary market allocations yet. 
                  Place bids in auctions to acquire securities.
                </p>
                <Link href="/auctions">
                  <AnimatedButton variant="primary">
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                    Browse Auctions
                  </AnimatedButton>
                </Link>
              </AnimatedCard>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
