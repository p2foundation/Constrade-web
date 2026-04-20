'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  TrendingUp,
  DollarSign,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  ArrowUpRight,
  FileText,
  Eye,
  Building2,
  Users,
  BarChart3,
  Activity,
  Download,
  X,
  CreditCard,
  Info,
  Loader2,
  CheckCircle2,
  XCircle,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { AnimatedCard, AnimatedButton } from '@/components/ui/animated-card';
import { auctionsApi, Bid as ApiBid, paymentVerificationApi } from '@/lib/api';
import { toast } from 'sonner';

interface Auction {
  id: string;
  auctionId: string;
  security: {
    name: string;
    isin: string;
    type: 'TREASURY_BILL' | 'TREASURY_BOND';
    maturityDate: string;
    couponRate?: number;
    prospectusUrl?: string;
  };
  auctionType: 'COMPETITIVE' | 'NON_COMPETITIVE';
  announcementDate: string;
  biddingOpenDate: string;
  biddingCloseDate: string;
  settlementDate: string;
  totalAmount: number;
  minBidAmount: number;
  maxBidAmount: number;
  priceRange?: {
    min: number;
    max: number;
  };
  status: 'ANNOUNCED' | 'OPEN' | 'CLOSED' | 'RESULTS_PUBLISHED' | 'SETTLED';
  results?: {
    averageYield: number;
    totalBids: number;
    totalAccepted: number;
    bidToCoverRatio: number;
    marginalPrice: number;
    publishedDate: string;
  };
  userBid?: {
    id: string;
    bidReference: string;
    quantity: number;
    price?: number;
    yield?: number;
    status: 'PENDING' | 'SUBMITTED' | 'ALLOTTED' | 'REJECTED';
    submittedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function AuctionDetailPage() {
  const { token, user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const auctionId = params.id as string;
  
  const role = user?.role;
  const isInstitutionalOrPd =
    role === 'PRIMARY_DEALER' ||
    role === 'INSTITUTION' ||
    role === 'BOOK_RUNNER' ||
    role === 'CUSTODIAN' ||
    role === 'ADMIN' ||
    role === 'SUPER_ADMIN' ||
    role === 'DEVELOPER' ||
    role === 'ANALYST';

  const isRetailUser = role === 'USER' || !role;
  
  const [showBidModal, setShowBidModal] = useState(false);
  const [bidForm, setBidForm] = useState({
    bidType: 'COMPETITIVE' as 'COMPETITIVE' | 'NON_COMPETITIVE',
    amount: '',
    yield: '',
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBid, setSelectedBid] = useState<ApiBid | null>(null);

  // Mock auction data - in real app, this would come from BoG compliance APIs
  const mockAuction: Auction = {
    id: '1',
    auctionId: 'bog-2024-006',
    security: {
      name: '91-Day Treasury Bill',
      isin: 'GH091TB202502',
      type: 'TREASURY_BILL',
      maturityDate: '2025-04-15',
    },
    auctionType: 'COMPETITIVE',
    announcementDate: '2024-11-20',
    biddingOpenDate: '2024-11-20',
    biddingCloseDate: '2024-11-25',
    settlementDate: '2024-11-26',
    totalAmount: 500000000,
    minBidAmount: 1000,
    maxBidAmount: 50000000,
    status: 'OPEN',
    createdAt: '2024-11-20T09:00:00Z',
    updatedAt: '2024-11-20T09:00:00Z',
  };

  const { data: auction, isLoading, error } = useQuery({
    queryKey: ['auction', auctionId],
    queryFn: async () => {
      const { auctionsApi } = await import('@/lib/api');
      return await auctionsApi.getById(auctionId);
    },
    enabled: !!token && !!auctionId,
  });

  // Fetch user's bids for this auction
  const { data: userBids, refetch: refetchBids } = useQuery({
    queryKey: ['my-bids', auctionId],
    queryFn: async () => {
      const bids = await auctionsApi.getMyBids({ auctionId });
      return Array.isArray(bids) ? bids : [];
    },
    enabled: !!token && !!auctionId,
  });

  // Submit bid mutation
  const submitBidMutation = useMutation({
    mutationFn: async (data: { bidType: string; amount: string; yield?: string }) => {
      return await auctionsApi.submitBid(auctionId, {
        bidType: data.bidType as "COMPETITIVE" | "NON_COMPETITIVE",
        amount: parseFloat(data.amount),
        yield: data.yield ? parseFloat(data.yield) : undefined,
      });
    },
    onSuccess: (data) => {
      toast.success('Bid submitted successfully!');
      setShowBidModal(false);
      setBidForm({ bidType: 'COMPETITIVE', amount: '', yield: '' });
      queryClient.invalidateQueries({ queryKey: ['my-bids'] });
      queryClient.invalidateQueries({ queryKey: ['auction', auctionId] });
      refetchBids();
    },
    onError: (error: any) => {
      toast.error('Failed to submit bid', {
        description: error.response?.data?.message || 'An error occurred',
      });
    },
  });

  // Get user's bid for this auction (most recent)
  const currentUserBid = userBids && userBids.length > 0 
    ? (userBids as ApiBid[]).find((b: ApiBid) => {
        const bidAuction = (b as any).auction;
        return bidAuction?.id === auctionId || bidAuction?.auctionId === auctionId;
      })
    : null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ANNOUNCED': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'OPEN': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'CLOSED': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'RESULTS_PUBLISHED': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'SETTLED': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ANNOUNCED': return <Calendar className="h-4 w-4" />;
      case 'OPEN': return <Clock className="h-4 w-4" />;
      case 'CLOSED': return <AlertCircle className="h-4 w-4" />;
      case 'RESULTS_PUBLISHED': return <CheckCircle className="h-4 w-4" />;
      case 'SETTLED': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getBidStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'ALLOTTED': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'REJECTED': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getTimeRemaining = (closeDate: string) => {
    const now = new Date();
    const close = new Date(closeDate);
    const diff = close.getTime() - now.getTime();
    
    if (diff <= 0) return 'Closed';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h remaining`;
    return 'Closing soon';
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container-content py-8">
          <AnimatedCard className="p-12 text-center border border-border">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Auction Not Found</h3>
            <p className="text-muted-foreground mb-6">
              The auction you're looking for doesn't exist or has been removed.
            </p>
            <AnimatedButton variant="primary" onClick={() => router.push('/auctions')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Auctions
            </AnimatedButton>
          </AnimatedCard>
        </div>
      </div>
    );
  }

  if (isLoading || !auction) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container-content py-8">
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading auction details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Normalize fields that may not exist on backend Auction type
  const auctionExternalId = (auction as any).auctionId || auction.id;
  const auctionTypeLabel =
    (auction as any).auctionType && typeof (auction as any).auctionType === 'string'
      ? (auction as any).auctionType.replace('_', ' ')
      : 'Treasury Auction';
  const securityIsin =
    (auction.security as any)?.isin || (auction.security as any)?.code || '';

  const now = new Date();
  const lifecycleSteps = [
    {
      key: 'announcement',
      label: 'Announcement',
      date: (auction as any).announcementDate,
    },
    {
      key: 'open',
      label: 'Bidding Opens',
      date: (auction as any).biddingOpenDate,
    },
    {
      key: 'close',
      label: 'Bidding Closes',
      date: (auction as any).biddingCloseDate,
    },
    {
      key: 'allocation',
      label: 'Allocation',
      date: (auction as any).biddingCloseDate,
      complete: (auction as any).cutoffYield !== undefined && (auction as any).cutoffYield !== null,
    },
    {
      key: 'settlement',
      label: 'Settlement',
      date: auction.settlementDate,
      complete: auction.status === 'SETTLED',
    },
  ];

  let currentAssigned = false;
  const lifecycleDisplay = lifecycleSteps.map((step) => {
    const stepDate = step.date ? new Date(step.date) : null;
    const completed = step.complete ?? (stepDate ? now >= stepDate : false);
    const current = !completed && !currentAssigned;
    if (current) currentAssigned = true;
    return {
      ...step,
      date: stepDate,
      completed,
      current,
    };
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container-content py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <AnimatedButton variant="outline" onClick={() => router.push('/auctions')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Auctions
            </AnimatedButton>
          </div>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-foreground">
                  {auction.security.name}
                </h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(auction.status)}`}>
                  {getStatusIcon(auction.status)}
                  {auction.status.replace('_', ' ')}
                </span>
                {auction.status === 'OPEN' && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    {auction.submissionDeadline && getTimeRemaining(auction.submissionDeadline)}
                  </span>
                )}
              </div>
              <p className="text-lg text-muted-foreground mb-1">
                ISIN: {securityIsin}
              </p>
              <p className="text-sm text-muted-foreground">
                Auction ID: {auctionExternalId} • {auctionTypeLabel}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-foreground">
                ₵{(auction.totalAmount / 1000000).toFixed(0)}M
              </p>
              <p className="text-sm text-muted-foreground">Total Amount</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Auction Lifecycle */}
            <AnimatedCard className="p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Auction Lifecycle
              </h2>
              <div className="space-y-4">
                {lifecycleDisplay.map((step) => (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className="mt-1">
                      <span
                        className={`h-2.5 w-2.5 rounded-full inline-block ${
                          step.completed
                            ? 'bg-green-500'
                            : step.current
                              ? 'bg-blue-500'
                              : 'bg-muted-foreground/40'
                        }`}
                      />
                    </div>
                    <div className="flex-1 flex items-center justify-between gap-4">
                      <div>
                        <p className={`text-sm font-medium ${
                          step.completed
                            ? 'text-green-600 dark:text-green-400'
                            : step.current
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-muted-foreground'
                        }`}>
                          {step.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {step.completed
                            ? 'Completed'
                            : step.current
                              ? 'In progress'
                              : 'Upcoming'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {step.date ? step.date.toLocaleDateString() : 'TBD'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
                Timeline reflects Bank of Ghana auction cycle: announcement → bidding → allocation → settlement.
              </div>
            </AnimatedCard>

            {/* Auction Details */}
            <AnimatedCard className="p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Auction Details
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Security Type</p>
                  <p className="font-medium">{auction.security.type.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Maturity Date</p>
                  <p className="font-medium">
                    {new Date(auction.security.maturityDate).toLocaleDateString()}
                  </p>
                </div>
                {auction.security.couponRate && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Coupon Rate</p>
                    <p className="font-medium">{auction.security.couponRate}%</p>
                  </div>
                )}
                {(auction as any).auctionType && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Auction Type</p>
                    <p className="font-medium">{auctionTypeLabel}</p>
                  </div>
                )}
                {(auction as any).announcementDate && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Announcement Date</p>
                    <p className="font-medium">
                      {new Date((auction as any).announcementDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {(auction as any).biddingOpenDate && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Bidding Opens</p>
                    <p className="font-medium">
                      {new Date((auction as any).biddingOpenDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {(auction as any).biddingCloseDate && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Bidding Closes</p>
                    <p className="font-medium">
                      {new Date((auction as any).biddingCloseDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Settlement Date</p>
                  <p className="font-medium">
                    {new Date(auction.settlementDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Minimum Bid</p>
                  <p className="font-medium">₵{auction.minBidAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Maximum Bid</p>
                  <p className="font-medium">₵{auction.maxBidAmount?.toLocaleString() ?? 'N/A'}</p>
                </div>
              </div>
              {auction.priceRange && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-2">Price Range</p>
                  <div className="flex items-center gap-4">
                    <span className="font-medium">₵{auction.priceRange.min.toFixed(2)}</span>
                    <span className="text-muted-foreground">to</span>
                    <span className="font-medium">₵{auction.priceRange.max.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </AnimatedCard>

            {/* Auction Results */}
            {auction.results && (
              <AnimatedCard className="p-6 border border-border">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Auction Results
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Average Yield</p>
                    <p className="text-lg font-semibold">{auction.results.averageYield.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Bid-to-Cover Ratio</p>
                    <p className="text-lg font-semibold">{auction.results.bidToCoverRatio.toFixed(2)}x</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Bids</p>
                    <p className="text-lg font-semibold">₵{(auction.results.totalBids / 1000000).toFixed(0)}M</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Marginal Price</p>
                    <p className="text-lg font-semibold">₵{auction.results.marginalPrice.toFixed(2)}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-1">Published Date</p>
                  <p className="font-medium">
                    {new Date(auction.results.publishedDate).toLocaleDateString()}
                  </p>
                </div>
              </AnimatedCard>
            )}

            {/* Your Bid - Enhanced with Real-time Status */}
            {currentUserBid && (
              <AnimatedCard className="p-6 border border-border bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Your Bid Status
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getBidStatusColor((currentUserBid as any).status || 'PENDING')}`}>
                    {((currentUserBid as any).status || 'PENDING').replace('_', ' ')}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Bid Reference</p>
                    <p className="font-medium font-mono text-sm">{(currentUserBid as any).bidCode || currentUserBid.id.substring(0, 8)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Bid Amount</p>
                    <p className="font-medium">₵{currentUserBid.amount.toLocaleString()}</p>
                  </div>
                  {currentUserBid.yield && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Bid Yield</p>
                      <p className="font-medium">{currentUserBid.yield.toFixed(2)}%</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Submitted</p>
                    <p className="font-medium text-sm">
                      {new Date((currentUserBid as any).submittedAt || currentUserBid.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Allocation Results */}
                {((currentUserBid as any).allocatedAmount !== undefined || (currentUserBid as any).status === 'ALLOCATED') && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      Allocation Results
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Allocated Amount</p>
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          ₵{((currentUserBid as any).allocatedAmount || 0).toLocaleString()}
                        </p>
                      </div>
                      {(currentUserBid as any).allocatedYield && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Allocated Yield</p>
                          <p className="font-semibold">{(currentUserBid as any).allocatedYield.toFixed(2)}%</p>
                        </div>
                      )}
                      {(currentUserBid as any).allocationRatio && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Allocation Ratio</p>
                          <p className="font-semibold">{(currentUserBid as any).allocationRatio.toFixed(1)}%</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Settlement Date</p>
                        <p className="font-medium text-sm">
                          {new Date(auction.settlementDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {(currentUserBid as any).contractId && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium text-foreground">Allocation Contract Note</span>
                          </div>
                          <Link href={`/contracts/${(currentUserBid as any).contractId}`}>
                            <AnimatedButton variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-2" />
                              Download PDF
                            </AnimatedButton>
                          </Link>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Your allocation contract has been generated and emailed to you. Download it for your records.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Requirements */}
                {((currentUserBid as any).status === 'ALLOCATED' || (currentUserBid as any).allocatedAmount) && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Payment Requirements
                    </h3>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">Settlement Amount</p>
                        <p className="font-bold text-lg">
                          ₵{((currentUserBid as any).allocatedAmount || currentUserBid.amount).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Payment must be completed before {new Date(auction.settlementDate).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2">
                        <AnimatedButton
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setSelectedBid(currentUserBid);
                            setShowPaymentModal(true);
                          }}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Make Payment
                        </AnimatedButton>
                        <AnimatedButton
                          variant="outline"
                          size="sm"
                          onClick={() => router.push('/trading/primary-market?tab=settlement')}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Settlement
                        </AnimatedButton>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rejection Reason */}
                {((currentUserBid as any).status === 'REJECTED' || (currentUserBid as any).rejectionReason) && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-900 dark:text-red-200 mb-1">Bid Rejected</p>
                          <p className="text-sm text-red-700 dark:text-red-300">
                            {(currentUserBid as any).rejectionReason || 'Your bid was not successful in this auction.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </AnimatedCard>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <AnimatedCard className="p-6 border border-border">
              <h3 className="font-semibold mb-4">Actions</h3>
              <div className="space-y-3">
                {auction.status === 'OPEN' && !currentUserBid && (
                  <AnimatedButton 
                    variant="primary" 
                    className="w-full"
                    onClick={() => {
                      setBidForm({
                        bidType: isInstitutionalOrPd ? 'COMPETITIVE' : 'NON_COMPETITIVE',
                        amount: '',
                        yield: '',
                      });
                      setShowBidModal(true);
                    }}
                  >
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                    Place Bid
                  </AnimatedButton>
                )}
                {auction.status === 'OPEN' && currentUserBid && (
                  <AnimatedButton 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push('/trading/my-bids')}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View My Bids
                  </AnimatedButton>
                )}
                {auction.security?.prospectusUrl ? (
                  <AnimatedButton 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.open(auction.security.prospectusUrl, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Prospectus
                  </AnimatedButton>
                ) : (
                  <AnimatedButton variant="outline" className="w-full" disabled>
                    <Download className="h-4 w-4 mr-2" />
                    Prospectus Not Available
                  </AnimatedButton>
                )}
                {auction.results && (
                  <AnimatedButton variant="outline" className="w-full">
                    <Eye className="h-4 w-4 mr-2" />
                    View Results
                  </AnimatedButton>
                )}
              </div>
            </AnimatedCard>

            {/* Key Information */}
            <AnimatedCard className="p-6 border border-border">
              <h3 className="font-semibold mb-4">Key Information</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Issuer</p>
                    <p className="font-medium">Bank of Ghana</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Currency</p>
                    <p className="font-medium">GHS (₵)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Settlement</p>
                    <p className="font-medium">T+1</p>
                  </div>
                </div>
              </div>
            </AnimatedCard>
          </div>
        </div>
      </div>

      {/* Bid Submission Modal */}
      {showBidModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Place Your Bid</h2>
              <button
                aria-label="Close bid modal"
                onClick={() => {
                  setShowBidModal(false);
                  setBidForm({ bidType: 'COMPETITIVE', amount: '', yield: '' });
                }}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!bidForm.amount || parseFloat(bidForm.amount) < auction.minBidAmount) {
                  toast.error(`Minimum bid amount is ₵${auction.minBidAmount.toLocaleString()}`);
                  return;
                }
                if (auction.maxBidAmount && parseFloat(bidForm.amount) > auction.maxBidAmount) {
                  toast.error(`Maximum bid amount is ₵${auction.maxBidAmount.toLocaleString()}`);
                  return;
                }
                if (bidForm.bidType === 'COMPETITIVE' && !bidForm.yield) {
                  toast.error('Yield is required for competitive bids');
                  return;
                }
                submitBidMutation.mutate({
                  bidType: bidForm.bidType,
                  amount: bidForm.amount,
                  yield: bidForm.yield || undefined,
                });
              }}
              className="p-6 space-y-6"
            >
              {/* Bid Type Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">Bid Type</label>

                {isRetailUser ? (
                  <>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="p-4 rounded-lg border-2 border-primary bg-primary/10">
                        <div className="font-medium text-foreground">Non-Competitive (Retail)</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          As a retail investor, your bids are submitted as non-competitive and will be
                          allotted at the auction&apos;s clearing yield (marginal rate).
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Competitive bids are reserved for Primary Dealers and institutional participants.
                    </p>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setBidForm({ ...bidForm, bidType: 'NON_COMPETITIVE' })}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        bidForm.bidType === 'NON_COMPETITIVE'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium text-foreground">Non-Competitive</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Accept marginal rate, guaranteed allotment up to limit
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBidForm({ ...bidForm, bidType: 'COMPETITIVE' })}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        bidForm.bidType === 'COMPETITIVE'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium text-foreground">Competitive</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Specify your desired yield/discount rate
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Bid Amount */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Bid Amount (₵) *
                </label>
                <input
                  type="number"
                  required
                  min={auction.minBidAmount}
                  max={auction.maxBidAmount || undefined}
                  step="1000"
                  value={bidForm.amount}
                  onChange={(e) => setBidForm({ ...bidForm, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={`Min: ₵${auction.minBidAmount.toLocaleString()}${auction.maxBidAmount ? `, Max: ₵${auction.maxBidAmount.toLocaleString()}` : ''}`}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Must be in multiples of ₵1,000
                </p>
              </div>

              {/* Yield (for competitive bids) */}
              {bidForm.bidType === 'COMPETITIVE' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Yield (%) *
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    max="100"
                    value={bidForm.yield}
                    onChange={(e) => setBidForm({ ...bidForm, yield: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter desired yield percentage"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Lower yields have higher allocation priority
                  </p>
                </div>
              )}

              {/* Info Notice */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-900 dark:text-blue-200">
                    <p className="font-medium mb-2">Important Information:</p>
                    <ul className="space-y-1 text-blue-800 dark:text-blue-300">
                      <li>• Bids are irrevocable once submitted</li>
                      <li>• Allotment depends on auction results and available amount</li>
                      <li>• Settlement will occur on {new Date(auction.settlementDate).toLocaleDateString()}</li>
                      <li>• Payment will be required upon allocation</li>
                      <li>• You can view your bid status in "My Bids" after submission</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <AnimatedButton
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowBidModal(false);
                    setBidForm({ bidType: 'COMPETITIVE', amount: '', yield: '' });
                  }}
                >
                  Cancel
                </AnimatedButton>
                <AnimatedButton
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  disabled={submitBidMutation.isPending}
                >
                  {submitBidMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Submit Bid
                    </>
                  )}
                </AnimatedButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedBid && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Payment for Bid</h2>
              <button
                aria-label="Close payment modal"
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedBid(null);
                }}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Bid Reference</p>
                <p className="font-mono text-sm">{((selectedBid as any).bidCode || selectedBid.id).substring(0, 12)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Settlement Amount</p>
                <p className="font-bold text-2xl text-foreground">
                  ₵{((selectedBid as any).allocatedAmount || selectedBid.amount).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Settlement Date</p>
                <p className="font-medium">
                  {new Date(auction.settlementDate).toLocaleDateString()}
                </p>
              </div>
              <div className="pt-4 border-t border-border">
                <AnimatedButton
                  variant="primary"
                  className="w-full"
                  onClick={() => {
                    router.push(`/payments?bidId=${selectedBid.id}&amount=${(selectedBid as any).allocatedAmount || selectedBid.amount}`);
                    setShowPaymentModal(false);
                  }}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Proceed to Payment
                </AnimatedButton>
                <AnimatedButton
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => router.push('/trading/primary-market?tab=settlement')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Settlement Details
                </AnimatedButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
