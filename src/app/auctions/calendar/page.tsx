'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  TrendingUp, 
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Timer,
  Banknote
} from 'lucide-react';
import Link from 'next/link';
import { AnimatedCard, AnimatedButton } from '@/components/ui/animated-card';

interface Auction {
  id: string;
  auctionCode: string;
  auctionDate: string;
  announcementDate: string;
  biddingOpenDate: string;
  biddingCloseDate: string;
  settlementDate: string;
  targetAmount: number;
  status: string;
  cutoffYield: number | null;
  weightedAvgYield: number | null;
  totalBids: number;
  totalAmount: number;
  security: {
    id: string;
    name: string;
    code: string;
    type: string;
    couponRate: number | null;
  };
}

export default function AuctionCalendarPage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  useEffect(() => {
    fetchAuctions();
  }, []);

  const fetchAuctions = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/v1/auctions');
      if (res.ok) {
        const data = await res.json();
        setAuctions(data);
      }
    } catch (error) {
      console.error('Failed to fetch auctions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GH', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-GH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000_000) return `GHS ${(amount / 1_000_000_000).toFixed(1)}B`;
    if (amount >= 1_000_000) return `GHS ${(amount / 1_000_000).toFixed(0)}M`;
    return `GHS ${amount.toLocaleString()}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-xs font-medium flex items-center gap-1"><Timer className="h-3 w-3" /> Open</span>;
      case 'UPCOMING':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-xs font-medium flex items-center gap-1"><CalendarIcon className="h-3 w-3" /> Upcoming</span>;
      case 'CLOSED':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full text-xs font-medium flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Closed</span>;
      case 'SETTLED':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 rounded-full text-xs font-medium flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Settled</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  const getSecurityTypeBadge = (type: string) => {
    switch (type) {
      case 'TREASURY_BILL':
        return <span className="px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded-full text-xs font-medium">T-Bill</span>;
      case 'TREASURY_BOND':
        return <span className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full text-xs font-medium">Bond</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">{type}</span>;
    }
  };

  const filteredAuctions = auctions.filter(a => {
    const matchesType = !filterType || a.security.type === filterType;
    const matchesStatus = !filterStatus || a.status === filterStatus;
    return matchesType && matchesStatus;
  }).sort((a, b) => new Date(b.auctionDate).getTime() - new Date(a.auctionDate).getTime());

  const openAuctions = filteredAuctions.filter(a => a.status === 'OPEN');
  const upcomingAuctions = filteredAuctions.filter(a => a.status === 'UPCOMING');
  const pastAuctions = filteredAuctions.filter(a => a.status === 'SETTLED' || a.status === 'CLOSED');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 text-primary" />
              Auction Calendar
            </h1>
            <p className="text-muted-foreground mt-1">Bank of Ghana Treasury Securities Auction Schedule</p>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
            >
              <option value="">All Types</option>
              <option value="TREASURY_BILL">Treasury Bills</option>
              <option value="TREASURY_BOND">Government Bonds</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
            >
              <option value="">All Status</option>
              <option value="OPEN">Open</option>
              <option value="UPCOMING">Upcoming</option>
              <option value="SETTLED">Settled</option>
            </select>
          </div>
        </div>

        {/* Open Auctions */}
        {openAuctions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              Open for Bidding ({openAuctions.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {openAuctions.map((auction) => (
                <AnimatedCard key={auction.id} className="p-5 border-2 border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between mb-3">
                    {getSecurityTypeBadge(auction.security.type)}
                    {getStatusBadge(auction.status)}
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{auction.security.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono mb-3">{auction.auctionCode}</p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Auction Date:</span>
                      <span className="font-medium">{formatDate(auction.auctionDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bidding Closes:</span>
                      <span className="font-medium text-red-600">{formatTime(auction.biddingCloseDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Target Amount:</span>
                      <span className="font-medium">{formatCurrency(auction.targetAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Settlement:</span>
                      <span className="font-medium">{formatDate(auction.settlementDate)}</span>
                    </div>
                  </div>

                  <Link href={`/auctions/${auction.id}`}>
                    <AnimatedButton variant="primary" className="w-full mt-4 text-sm">
                      <Banknote className="h-4 w-4 mr-2" />
                      Place Bid
                    </AnimatedButton>
                  </Link>
                </AnimatedCard>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Auctions */}
        {upcomingAuctions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-blue-500" />
              Upcoming Auctions ({upcomingAuctions.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Security</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Auction Date</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Bidding Opens</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Bidding Closes</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Target</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Settlement</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingAuctions.sort((a, b) => new Date(a.auctionDate).getTime() - new Date(b.auctionDate).getTime()).map((auction) => (
                    <tr key={auction.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-foreground">{auction.security.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{auction.auctionCode}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">{getSecurityTypeBadge(auction.security.type)}</td>
                      <td className="py-3 px-4 font-medium">{formatDate(auction.auctionDate)}</td>
                      <td className="py-3 px-4">{formatDate(auction.biddingOpenDate)}</td>
                      <td className="py-3 px-4 text-red-600 font-medium">{formatDate(auction.biddingCloseDate)} {formatTime(auction.biddingCloseDate)}</td>
                      <td className="py-3 px-4 font-medium">{formatCurrency(auction.targetAmount)}</td>
                      <td className="py-3 px-4">{formatDate(auction.settlementDate)}</td>
                      <td className="py-3 px-4">{getStatusBadge(auction.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Past Auctions / Results */}
        {pastAuctions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gray-500" />
              Recent Auction Results ({pastAuctions.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Security</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Auction Date</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Target</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Total Bids</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Amount Bid</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cutoff Yield</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Wtd Avg Yield</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pastAuctions.map((auction) => (
                    <tr key={auction.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-foreground">{auction.security.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{auction.auctionCode}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">{formatDate(auction.auctionDate)}</td>
                      <td className="py-3 px-4">{formatCurrency(auction.targetAmount)}</td>
                      <td className="py-3 px-4 font-medium">{auction.totalBids}</td>
                      <td className="py-3 px-4 font-medium">{formatCurrency(auction.totalAmount)}</td>
                      <td className="py-3 px-4 font-medium text-primary">{auction.cutoffYield ? `${auction.cutoffYield.toFixed(2)}%` : '-'}</td>
                      <td className="py-3 px-4 font-medium">{auction.weightedAvgYield ? `${auction.weightedAvgYield.toFixed(2)}%` : '-'}</td>
                      <td className="py-3 px-4">{getStatusBadge(auction.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Schedule Info */}
        <AnimatedCard className="p-6 mt-8 bg-muted/30">
          <h3 className="font-semibold text-foreground mb-4">BoG Auction Schedule</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-background rounded-lg border border-border">
              <p className="font-semibold text-foreground">91-Day T-Bill</p>
              <p className="text-muted-foreground">Weekly (Every Friday)</p>
            </div>
            <div className="p-3 bg-background rounded-lg border border-border">
              <p className="font-semibold text-foreground">182-Day T-Bill</p>
              <p className="text-muted-foreground">Bi-weekly</p>
            </div>
            <div className="p-3 bg-background rounded-lg border border-border">
              <p className="font-semibold text-foreground">364-Day T-Bill</p>
              <p className="text-muted-foreground">Monthly</p>
            </div>
            <div className="p-3 bg-background rounded-lg border border-border">
              <p className="font-semibold text-foreground">GoG Bonds</p>
              <p className="text-muted-foreground">Monthly (2Y, 3Y, 5Y, 7Y+)</p>
            </div>
          </div>
        </AnimatedCard>
      </div>
    </div>
  );
}
