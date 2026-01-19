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
  Download,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { AnimatedCard, AnimatedButton } from '@/components/ui/animated-card';
import { auctionsApi, Bid as ApiBid } from '@/lib/api';

interface Bid {
  id: string;
  bidReference: string;
  auction: {
    id: string;
    auctionId: string;
    security: {
      name: string;
      isin: string;
      type: 'TREASURY_BILL' | 'TREASURY_BOND';
    };
    biddingCloseDate: string;
    settlementDate: string;
  };
  type: 'COMPETITIVE' | 'NON_COMPETITIVE';
  amount: number;
  yield?: number;
  price?: number;
  status: 'PENDING' | 'SUBMITTED' | 'ALLOTTED' | 'REJECTED' | 'CANCELLED';
  submittedAt: string;
  allocatedAmount?: number;
  allocatedYield?: number;
  allocationRatio?: number;
  rejectionReason?: string;
}

export default function MyBidsPage() {
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'SUBMITTED' | 'ALLOTTED' | 'REJECTED'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'COMPETITIVE' | 'NON_COMPETITIVE'>('all');

  const mapApiBidToUi = (bid: ApiBid): Bid => {
    const auction = bid.auction as any;
    const security = auction?.security as any;

    return {
      id: bid.id,
      bidReference: (bid as any).bidCode || (bid as any).bidReference || bid.id,
      auction: {
        id: auction?.id || bid.auctionId,
        auctionId: auction?.auctionId || auction?.auctionCode || auction?.id || bid.auctionId,
        security: {
          name: security?.name || 'Security',
          isin: security?.isin || security?.code || '',
          type: (security?.type === 'TREASURY_BILL' || security?.type === 'TREASURY_BOND'
            ? security.type
            : 'TREASURY_BOND'),
        },
        biddingCloseDate: auction?.biddingCloseDate || auction?.auctionDate || bid.createdAt,
        settlementDate: auction?.settlementDate || bid.updatedAt,
      },
      type: (bid.type === 'COMPETITIVE' || bid.type === 'NON_COMPETITIVE'
        ? bid.type
        : 'COMPETITIVE'),
      amount: bid.amount,
      yield: bid.yield ?? undefined,
      price: (bid as any).price ?? undefined,
      status: (bid.status as any) || 'PENDING',
      submittedAt: (bid as any).submittedAt || bid.createdAt,
      allocatedAmount: (bid as any).allocatedAmount ?? undefined,
      allocatedYield: (bid as any).allocatedYield ?? undefined,
      allocationRatio: (bid as any).allocationRatio ?? undefined,
      rejectionReason: (bid as any).rejectionReason ?? undefined,
    };
  };

  const { data: apiBids, isLoading, refetch } = useQuery({
    queryKey: ['my-bids', statusFilter, typeFilter],
    enabled: !!token,
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.type = typeFilter;
      const rawBids = await auctionsApi.getMyBids(params);
      return (rawBids as ApiBid[]).map(mapApiBidToUi);
    },
  });

  const bids: Bid[] = apiBids || [];

  // Filter bids
  const filteredBids = bids?.filter(bid => {
    const matchesSearch = !searchQuery || 
      bid.bidReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bid.auction.security.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bid.auction.auctionId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bid.status === statusFilter;
    const matchesType = typeFilter === 'all' || bid.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Calculate statistics
  const stats = filteredBids?.reduce(
    (acc, bid) => {
      acc.totalBids += 1;
      acc.totalAmount += bid.amount;
      
      if (bid.status === 'PENDING') acc.pendingCount += 1;
      if (bid.status === 'SUBMITTED') acc.submittedCount += 1;
      if (bid.status === 'ALLOTTED') {
        acc.allottedCount += 1;
        acc.allottedAmount += bid.allocatedAmount || bid.amount;
      }
      if (bid.status === 'REJECTED') acc.rejectedCount += 1;
      
      return acc;
    },
    {
      totalBids: 0,
      totalAmount: 0,
      pendingCount: 0,
      submittedCount: 0,
      allottedCount: 0,
      allottedAmount: 0,
      rejectedCount: 0,
    }
  ) || {
    totalBids: 0,
    totalAmount: 0,
    pendingCount: 0,
    submittedCount: 0,
    allottedCount: 0,
    allottedAmount: 0,
    rejectedCount: 0,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'ALLOTTED': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'REJECTED': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="h-4 w-4" />;
      case 'SUBMITTED': return <FileText className="h-4 w-4" />;
      case 'ALLOTTED': return <CheckCircle className="h-4 w-4" />;
      case 'REJECTED': return <AlertCircle className="h-4 w-4" />;
      case 'CANCELLED': return <X className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const handleExport = () => {
    if (!filteredBids || filteredBids.length === 0) return;

    const headers = ['Bid Reference', 'Auction', 'Security', 'Type', 'Amount', 'Yield', 'Status', 'Submitted Date'];
    const rows = filteredBids.map((bid) => [
      bid.bidReference,
      bid.auction.auctionId,
      bid.auction.security.name,
      bid.type,
      bid.amount.toLocaleString(),
      bid.yield ? `${bid.yield.toFixed(2)}%` : 'N/A',
      bid.status,
      new Date(bid.submittedAt).toLocaleDateString(),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-bids-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container-content py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">My Bids</h1>
              <p className="text-muted-foreground">View and track all your auction bids</p>
            </div>
            <div className="flex items-center gap-3">
              <AnimatedButton variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </AnimatedButton>
              <AnimatedButton variant="outline" onClick={handleExport} disabled={!filteredBids || filteredBids.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </AnimatedButton>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <AnimatedCard className="p-6 border border-border">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Bids</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalBids}</p>
                <p className="text-sm text-muted-foreground">₵{(stats.totalAmount / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard className="p-6 border border-border" delay={100}>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Allotted</p>
                <p className="text-2xl font-bold text-green-600">{stats.allottedCount}</p>
                <p className="text-sm text-muted-foreground">₵{(stats.allottedAmount / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard className="p-6 border border-border" delay={200}>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendingCount + stats.submittedCount}</p>
                <p className="text-sm text-muted-foreground">Awaiting results</p>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard className="p-6 border border-border" delay={300}>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejectedCount}</p>
                <p className="text-sm text-muted-foreground">Not accepted</p>
              </div>
            </div>
          </AnimatedCard>
        </div>

        {/* Filters */}
        <AnimatedCard className="p-6 border border-border mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              Filters
            </h2>
            {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setTypeFilter('all');
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Clear All
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
              <input
                type="text"
                placeholder="Search bids..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              >
                <option value="all">All Status</option>
                <option value="PENDING">⏳ Pending</option>
                <option value="SUBMITTED">📤 Submitted</option>
                <option value="ALLOTTED">✅ Allotted</option>
                <option value="REJECTED">❌ Rejected</option>
              </select>
            </div>
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              >
                <option value="all">All Types</option>
                <option value="COMPETITIVE">🎯 Competitive</option>
                <option value="NON_COMPETITIVE">📋 Non-Competitive</option>
              </select>
            </div>
          </div>
        </AnimatedCard>

        {/* Bids List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading bids...</p>
          </div>
        ) : filteredBids && filteredBids.length > 0 ? (
          <div className="space-y-6">
            {filteredBids.map((bid, index) => (
              <AnimatedCard 
                key={bid.id}
                className="border border-border overflow-hidden"
                delay={index * 100}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {bid.auction.security.name}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(bid.status)}`}>
                          {getStatusIcon(bid.status)}
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
                        Auction ID: {bid.auction.auctionId} • ISIN: {bid.auction.security.isin}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-foreground">
                        ₵{bid.amount.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">Bid Amount</p>
                    </div>
                  </div>

                  {/* Bid Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Submitted</p>
                      <p className="text-sm font-medium">
                        {new Date(bid.submittedAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(bid.submittedAt).toLocaleTimeString()}
                      </p>
                    </div>
                    {bid.yield && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Bid Yield</p>
                        <p className="text-sm font-medium">{bid.yield.toFixed(2)}%</p>
                      </div>
                    )}
                    {bid.price && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Bid Price</p>
                        <p className="text-sm font-medium">₵{bid.price.toFixed(2)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Settlement Date</p>
                      <p className="text-sm font-medium">
                        {new Date(bid.auction.settlementDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Allocation Details */}
                  {bid.status === 'ALLOTTED' && bid.allocatedAmount && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-green-800 dark:text-green-200 mb-3">Allocation Details</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Allocated Amount</p>
                          <p className="text-sm font-medium text-green-600">₵{bid.allocatedAmount.toLocaleString()}</p>
                        </div>
                        {bid.allocatedYield && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Allocated Yield</p>
                            <p className="text-sm font-medium text-green-600">{bid.allocatedYield.toFixed(2)}%</p>
                          </div>
                        )}
                        {bid.allocationRatio && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Allocation Ratio</p>
                            <p className="text-sm font-medium text-green-600">{bid.allocationRatio.toFixed(0)}%</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Rejection Details */}
                  {bid.status === 'REJECTED' && bid.rejectionReason && (
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">Rejection Reason</h4>
                      <p className="text-sm text-red-700 dark:text-red-300">{bid.rejectionReason}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-4 border-t border-border">
                    <AnimatedButton 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => window.location.href = `/auctions/${bid.auction.id}`}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Auction
                    </AnimatedButton>
                    {bid.status === 'ALLOTTED' && (
                      <AnimatedButton 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => window.location.href = `/trading/portfolio`}
                      >
                        <TrendingUp className="h-4 w-4 mr-2" />
                        View in Portfolio
                      </AnimatedButton>
                    )}
                  </div>
                </div>
              </AnimatedCard>
            ))}
          </div>
        ) : (
          <AnimatedCard className="p-12 text-center border border-border">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No bids found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'You haven\'t placed any bids yet. Start bidding in Treasury auctions to see them here.'}
            </p>
            <div className="flex items-center gap-3 justify-center">
              <Link href="/trading/primary-market">
                <AnimatedButton variant="primary">
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Browse Auctions
                </AnimatedButton>
              </Link>
            </div>
          </AnimatedCard>
        )}
      </div>
    </div>
  );
}

