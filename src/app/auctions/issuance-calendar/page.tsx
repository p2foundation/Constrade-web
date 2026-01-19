'use client';

import { useState, useEffect } from 'react';
import { Calendar, Grid, List, Filter, ChevronLeft, ChevronRight, Download, FileText, TrendingUp, Clock, AlertCircle, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { AnimatedCard, AnimatedButton } from '@/components/ui/animated-card';
import { auctionsApi, Auction as ApiAuction } from '@/lib/api';

interface Auction {
  id: string;
  auctionCode: string;
  securityType: string;
  securityName: string;
  auctionType: string;
  status: string;
  targetAmount: number;
  auctionDate: string;
  settlementDate: string;
  announcementDate?: string;
  issueDate?: string;
  maturityDate?: string;
  highRate?: number;
  investmentRate?: number;
  cusip?: string;
  isReopening?: boolean;
  originalIssueDate?: string;
}

interface IssuanceCalendar {
  id: string;
  title: string;
  period: string;
  fileUrl: string;
  uploadDate: string;
  fileSize: string;
}

interface AuctionResultNotice {
  id: string;
  title: string;
  securityName: string;
  auctionDate: string;
  fileUrl: string;
  source: 'BoG' | 'ConstantTreasury';
}

type ViewMode = 'calendar' | 'list';
type TabType = 'upcoming' | 'reopenings' | 'results' | 'calendar';

export default function IssuanceCalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [issuanceCalendars, setIssuanceCalendars] = useState<IssuanceCalendar[]>([]);
  const [resultNotices, setResultNotices] = useState<AuctionResultNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    fetchAuctions();
    fetchIssuanceCalendars();
    hydrateResultNotices();
  }, []);

  const fetchAuctions = async () => {
    setLoading(true);
    try {
      // Prefer real API data
      const apiAuctions = await auctionsApi.getAll();
      const mapped: Auction[] = (apiAuctions || []).map((a: ApiAuction) => ({
        id: a.id,
        auctionCode: (a as any).auctionId || a.id,
        securityType: a.security.type,
        securityName: a.security.name,
        auctionType: ((a as any).auctionType as string) || 'COMPETITIVE', // backend currently doesn't expose this directly
        status: (a as any).status || 'SCHEDULED',
        targetAmount: (a as any).totalAmount || 0,
        auctionDate: (a as any).auctionDate || (a as any).biddingOpenDate,
        settlementDate: a.settlementDate,
        announcementDate: (a as any).announcementDate,
        issueDate: (a as any).issueDate,
        maturityDate: a.security.maturityDate,
        cusip: (a.security as any).code || (a.security as any).isin,
        isReopening: !!(a as any).isReopening,
        originalIssueDate: (a as any).originalIssueDate,
      }));

      if (mapped.length > 0) {
        setAuctions(mapped);
        return;
      }

      // Fallback to mock data if API returns empty
      const mockAuctions: Auction[] = [
        {
          id: 'mock-1',
          auctionCode: 'GHA-TB-091-2025-Q4',
          securityType: 'TREASURY_BILL',
          securityName: '91-Day Treasury Bill',
          auctionType: 'COMPETITIVE',
          status: 'SCHEDULED',
          targetAmount: 500000000,
          auctionDate: '2025-11-21',
          settlementDate: '2025-11-24',
          announcementDate: '2025-11-14',
          issueDate: '2025-11-24',
          maturityDate: '2026-02-23',
          cusip: 'GHA000123456',
        },
      ];
      setAuctions(mockAuctions);
    } catch (error) {
      console.error('Failed to fetch auctions, falling back to mock data:', error);
      const mockAuctions: Auction[] = [
        {
          id: 'mock-1',
          auctionCode: 'GHA-TB-091-2025-Q4',
          securityType: 'TREASURY_BILL',
          securityName: '91-Day Treasury Bill',
          auctionType: 'COMPETITIVE',
          status: 'SCHEDULED',
          targetAmount: 500000000,
          auctionDate: '2025-11-21',
          settlementDate: '2025-11-24',
          announcementDate: '2025-11-14',
          issueDate: '2025-11-24',
          maturityDate: '2026-02-23',
          cusip: 'GHA000123456',
        },
      ];
      setAuctions(mockAuctions);
    } finally {
      setLoading(false);
    }
  };

  const fetchIssuanceCalendars = async () => {
    try {
      // Mock data - replace with API call
      const mockCalendars: IssuanceCalendar[] = [
        {
          id: '1',
          title: 'Q4 2025 Treasury Issuance Calendar',
          period: 'October - December 2025',
          fileUrl: '/files/q4-2025-issuance-calendar.pdf',
          uploadDate: '2025-09-30',
          fileSize: '2.4 MB',
        },
        {
          id: '2',
          title: 'Q1 2026 Treasury Issuance Calendar',
          period: 'January - March 2026',
          fileUrl: '/files/q1-2026-issuance-calendar.pdf',
          uploadDate: '2025-12-15',
          fileSize: '2.1 MB',
        },
      ];
      setIssuanceCalendars(mockCalendars);
    } catch (error) {
      console.error('Failed to fetch issuance calendars:', error);
    }
  };

  // Mock recent BoG-style PDF result notices (public links)
  const hydrateResultNotices = () => {
    const notices: AuctionResultNotice[] = [
      {
        id: 'bog-838-2025-12-01',
        title: 'Results of Tender 838 held on 1st December 2025',
        securityName: '14-Day BoG Bill',
        auctionDate: '2025-12-01',
        fileUrl:
          'https://www.bog.gov.gh/wp-content/uploads/2025/12/BOG-Auctresults-838-MON-1-DEC-25.pdf',
        source: 'BoG',
      },
      {
        id: 'bog-837-2025-11-25',
        title: 'Results of Tender 837 held on 25th November 2025',
        securityName: '91-Day & 182-Day Treasury Bills',
        auctionDate: '2025-11-25',
        fileUrl:
          'https://www.bog.gov.gh/wp-content/uploads/2025/11/BOG-Auctresults-837-TUE-25-NOV-25.pdf',
        source: 'BoG',
      },
    ];
    setResultNotices(notices);
  };

  const filteredAuctions = auctions.filter((auction) => {
    // Base filters
    const matchesStatus = !filterStatus || auction.status === filterStatus;
    const matchesType = !filterType || auction.securityType === filterType;
    if (!matchesStatus || !matchesType) return false;

    const today = new Date();
    const auctionDate = new Date(auction.auctionDate);

    // Tab-specific filters
    if (activeTab === 'upcoming') {
      const isUpcomingStatus =
        auction.status === 'SCHEDULED' ||
        auction.status === 'ANNOUNCED' ||
        auction.status === 'OPEN';
      return isUpcomingStatus && auctionDate >= today;
    }

    if (activeTab === 'reopenings') {
      return !!auction.isReopening;
    }

    if (activeTab === 'results') {
      const isResultStatus =
        auction.status === 'CLOSED' ||
        auction.status === 'SETTLED' ||
        auction.status === 'RESULTS_PUBLISHED';
      return isResultStatus;
    }

    // Fallback (shouldn't normally hit)
    return true;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getSecurityTypeColor = (type: string) => {
    switch (type) {
      case 'TREASURY_BILL':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'GOVERNMENT_BOND':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'OPEN':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'CLOSED':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'SETTLED':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border">
        <div className="container-content py-8">
          <div className="max-w-4xl">
            <h1 className="text-3xl font-bold text-foreground mb-4 animate-fade-in">
              Treasury Issuance Calendar
            </h1>
            <p className="text-muted-foreground text-lg animate-fade-in-up">
              Stay informed about upcoming Bank of Ghana Treasury auctions and planned securities issuances
            </p>
          </div>
        </div>
      </div>

      <div className="container-content py-8">
        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-8 border-b border-border">
          {[
            { id: 'upcoming', label: 'Upcoming Auctions', icon: Calendar },
            { id: 'reopenings', label: 'Reopenings', icon: TrendingUp },
            { id: 'results', label: 'Recent Results', icon: FileText },
            { id: 'calendar', label: 'Download Calendar', icon: Download },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content based on active tab */}
        {activeTab === 'calendar' ? (
          <div className="space-y-6">
            <div className="text-center py-12">
              <Download className="h-16 w-16 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Official Issuance Calendars
              </h2>
              <p className="text-muted-foreground mb-8">
                Download quarterly Treasury issuance calendars from the Bank of Ghana
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 max-w-4xl mx-auto">
              {issuanceCalendars.map((calendar, index) => (
                <AnimatedCard key={calendar.id} delay={index * 100} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-2">
                        {calendar.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {calendar.period}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Uploaded: {formatDate(calendar.uploadDate)}</span>
                        <span>Size: {calendar.fileSize}</span>
                      </div>
                    </div>
                    <a href={calendar.fileUrl} download>
                      <AnimatedButton variant="primary" className="ml-4">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </AnimatedButton>
                    </a>
                  </div>
                </AnimatedCard>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filters and View Toggle */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-wrap gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Status</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="OPEN">Open for Bidding</option>
                  <option value="CLOSED">Closed</option>
                  <option value="SETTLED">Settled</option>
                </select>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Types</option>
                  <option value="TREASURY_BILL">Treasury Bills</option>
                  <option value="GOVERNMENT_BOND">Government Bonds</option>
                </select>
              </div>
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'calendar'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Results */}
            {activeTab === 'results' && (
              <div className="space-y-6">
                {/* Recent platform auction results */}
                <div>
                  <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Recent Auction Results
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Closed and settled auctions on Constant Treasury with summary statistics and
                    links to the official Bank of Ghana result notices where available.
                  </p>
                </div>

                {/* Results list (same list layout but only for results tab) */}
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading auction data...</p>
                  </div>
                ) : filteredAuctions.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No recent auction results
                    </h3>
                    <p className="text-muted-foreground">
                      When Bank of Ghana completes new tenders and results are captured, they will
                      appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredAuctions
                      .slice()
                      .sort(
                        (a, b) =>
                          new Date(b.auctionDate).getTime() - new Date(a.auctionDate).getTime()
                      )
                      .map((auction, index) => (
                        <AnimatedCard key={auction.id} delay={index * 50} className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="font-semibold text-foreground mb-1">
                                {auction.securityName}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {auction.auctionCode}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                auction.status
                              )}`}
                            >
                              {auction.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground mb-1">Auction Date</p>
                              <p className="font-medium text-foreground">
                                {formatDate(auction.auctionDate)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">Settlement Date</p>
                              <p className="font-medium text-foreground">
                                {formatDate(auction.settlementDate)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">Target Amount</p>
                              <p className="font-medium text-foreground">
                                {formatCurrency(auction.targetAmount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">Security Type</p>
                              <p className="font-medium text-foreground">
                                {auction.securityType.replace('_', ' ')}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t border-border flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>CUSIP/ISIN: {auction.cusip}</span>
                              <span>Type: {auction.auctionType}</span>
                            </div>
                            <div className="flex gap-2">
                              <Link href={`/auctions/${auction.id}`}>
                                <AnimatedButton variant="outline" className="text-sm">
                                  View Auction
                                  <ArrowUpRight className="h-3 w-3 ml-1" />
                                </AnimatedButton>
                              </Link>
                            </div>
                          </div>
                        </AnimatedCard>
                      ))}
                  </div>
                )}

                {/* Official BoG result notices */}
                {resultNotices.length > 0 && (
                  <div className="pt-4 border-t border-border space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Official BoG Result Notices (PDF)
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        These links open the official Bank of Ghana result circulars hosted on
                        bog.gov.gh.
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {resultNotices.map((notice) => (
                        <AnimatedCard key={notice.id} className="p-4 flex items-start justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              {formatDate(notice.auctionDate)}
                            </p>
                            <p className="text-sm font-semibold text-foreground mb-1">
                              {notice.securityName}
                            </p>
                            <p className="text-xs text-muted-foreground">{notice.title}</p>
                          </div>
                          <a href={notice.fileUrl} target="_blank" rel="noreferrer">
                            <AnimatedButton variant="outline" size="sm">
                              <Download className="h-3 w-3 mr-1" />
                              PDF
                            </AnimatedButton>
                          </a>
                        </AnimatedCard>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab !== 'results' && (
              <>
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading auction data...</p>
                  </div>
                ) : filteredAuctions.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No auctions found
                    </h3>
                    <p className="text-muted-foreground">
                      Try adjusting your filters or check back later for new auctions.
                    </p>
                  </div>
                ) : viewMode === 'list' ? (
                  <div className="space-y-4">
                    {filteredAuctions.map((auction, index) => (
                      <AnimatedCard key={auction.id} delay={index * 50} className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-foreground mb-1">
                              {auction.securityName}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {auction.auctionCode}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getSecurityTypeColor(
                                auction.securityType
                              )}`}
                            >
                              {auction.securityType.replace('_', ' ')}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                auction.status
                              )}`}
                            >
                              {auction.status}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground mb-1">Auction Date</p>
                            <p className="font-medium text-foreground">
                              {formatDate(auction.auctionDate)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Settlement Date</p>
                            <p className="font-medium text-foreground">
                              {formatDate(auction.settlementDate)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Target Amount</p>
                            <p className="font-medium text-foreground">
                              {formatCurrency(auction.targetAmount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Maturity Date</p>
                            <p className="font-medium text-foreground">
                              {auction.maturityDate ? formatDate(auction.maturityDate) : 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>CUSIP: {auction.cusip}</span>
                            <span>Type: {auction.auctionType}</span>
                          </div>
                          <Link href={`/auctions/${auction.id}`}>
                            <AnimatedButton variant="outline" className="text-sm">
                              View Details
                              <ArrowUpRight className="h-3 w-3 ml-1" />
                            </AnimatedButton>
                          </Link>
                        </div>
                      </AnimatedCard>
                    ))}
                  </div>
                ) : (
                  // Calendar view: group auctions by month-year and show under headings
                  <div className="space-y-6">
                    {Object.entries(
                      filteredAuctions.reduce<Record<string, Auction[]>>((acc, auction) => {
                        const date = new Date(auction.auctionDate);
                        const key = date.toLocaleDateString('en-GH', {
                          year: 'numeric',
                          month: 'long',
                        });
                        acc[key] = acc[key] || [];
                        acc[key].push(auction);
                        return acc;
                      }, {})
                    ).map(([monthLabel, monthAuctions]) => (
                      <div key={monthLabel} className="space-y-3">
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {monthLabel}
                        </h3>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {monthAuctions
                            .sort(
                              (a, b) =>
                                new Date(a.auctionDate).getTime() -
                                new Date(b.auctionDate).getTime()
                            )
                            .map((auction) => (
                              <AnimatedCard key={auction.id} className="p-4 border border-border">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">
                                      {formatDate(auction.auctionDate)}
                                    </p>
                                    <h4 className="text-sm font-semibold text-foreground">
                                      {auction.securityName}
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                      {auction.auctionCode}
                                    </p>
                                  </div>
                                  <span
                                    className={`px-2 py-1 rounded-full text-[10px] font-medium ${getStatusColor(
                                      auction.status
                                    )}`}
                                  >
                                    {auction.status}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mb-1">
                                  Target: {formatCurrency(auction.targetAmount)}
                                </p>
                                <p className="text-[11px] text-muted-foreground mb-3">
                                  Settlement: {formatDate(auction.settlementDate)}
                                </p>
                                <Link href={`/auctions/${auction.id}`}>
                                  <AnimatedButton variant="outline" className="w-full text-xs">
                                    View Details
                                    <ArrowUpRight className="h-3 w-3 ml-1" />
                                  </AnimatedButton>
                                </Link>
                              </AnimatedCard>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
