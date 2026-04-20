'use client';

import { useState, useEffect } from 'react';
import { 
  Building2, 
  Clock, 
  Copy, 
  CheckCircle2, 
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  FileText,
  Calendar,
  ArrowRight,
  Shield,
  Banknote
} from 'lucide-react';
import { AnimatedCard, AnimatedButton } from '@/components/ui/animated-card';

interface SettlementBankDetails {
  bankName: string;
  swiftCode: string;
  accountName: string;
  accountNumber: string;
  branch: string;
  contactEmail: string;
  contactPhone: string[];
}

interface SettlementTimeline {
  activity: string;
  timeline: string;
}

export default function SettlementPage() {
  const [bankDetails, setBankDetails] = useState<SettlementBankDetails | null>(null);
  const [timeline, setTimeline] = useState<SettlementTimeline[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettlementInfo();
  }, []);

  const fetchSettlementInfo = async () => {
    try {
      const [bankRes, timelineRes] = await Promise.all([
        fetch('http://localhost:3001/api/v1/settlement/bank-details'),
        fetch('http://localhost:3001/api/v1/settlement/timeline'),
      ]);

      if (bankRes.ok) setBankDetails(await bankRes.json());
      if (timelineRes.ok) setTimeline(await timelineRes.json());
    } catch (error) {
      console.error('Failed to fetch settlement info:', error);
      // Fallback data
      setBankDetails({
        bankName: 'Zenith Bank Ghana',
        swiftCode: 'ZEBLGHAC',
        accountName: 'Constant Capital - Collection Account Tbills',
        accountNumber: '6010109500',
        branch: 'Head Office',
        contactEmail: 'trading@constantcap.com.gh',
        contactPhone: ['0302500386', '0244836183', '0500793944'],
      });
      setTimeline([
        { activity: 'Tendering of Orders', timeline: 'Order book opens on Thursdays and closes on Fridays at 10:00 AM. Amendment of order ends at 11:00 AM on Friday.' },
        { activity: 'Contract Note', timeline: 'Contract notes will be sent to Trustees and Fund Managers, at the latest Sunday evening.' },
        { activity: 'Settlement of Trades', timeline: "Transfer of funds should be credited to Constant Capital's collection account by Monday 9:00 or at the latest by 10:00 AM on Monday." },
        { activity: 'Proof of Settlement', timeline: 'Proof of settlement should be sent through email: trading@constantcap.com.gh' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const timelineIcons = [
    <FileText key="0" className="h-5 w-5" />,
    <FileText key="1" className="h-5 w-5" />,
    <Banknote key="2" className="h-5 w-5" />,
    <Mail key="3" className="h-5 w-5" />,
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Settlement Information</h1>
              <p className="text-muted-foreground">Constant Capital (Ghana) Limited - Primary Dealer</p>
            </div>
          </div>
        </div>

        {/* Company Info Banner */}
        <AnimatedCard className="mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Constant Capital (Ghana) Limited</h2>
                <p className="text-orange-100 text-sm mt-1">Licensed Primary Dealer - Broker Dealer</p>
              </div>
              <div className="flex flex-col gap-1 text-sm text-orange-100">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>#6 Tanbu Link, East Legon, PMB 171, KIA, Accra, Ghana</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>+233 302 500386 / 0244836183 / 0500793944</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <a href="mailto:trading@constantcap.com.gh" className="underline">trading@constantcap.com.gh</a>
                </div>
              </div>
            </div>
          </div>
        </AnimatedCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Settlement Timeline */}
          <AnimatedCard className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Settlement Timeline</h2>
            </div>

            <div className="space-y-0">
              {timeline.map((item, index) => (
                <div key={index} className="relative flex gap-4 pb-8 last:pb-0">
                  {/* Vertical line */}
                  {index < timeline.length - 1 && (
                    <div className="absolute left-5 top-10 w-0.5 h-full bg-border" />
                  )}
                  
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center z-10 ${
                    index === 0 ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' :
                    index === 1 ? 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300' :
                    index === 2 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300' :
                    'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
                  }`}>
                    {timelineIcons[index]}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm uppercase tracking-wide">{item.activity}</h3>
                    <p className="text-muted-foreground text-sm mt-1 leading-relaxed">{item.timeline}</p>
                  </div>
                </div>
              ))}
            </div>
          </AnimatedCard>

          {/* Bank Details */}
          {bankDetails && (
            <AnimatedCard className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Building2 className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Settlement Bank Details</h2>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-800 dark:text-amber-200 text-sm">
                    Transfer of funds should be credited to the account below by <strong>Monday 9:00 AM</strong> or at the latest by <strong>10:00 AM on Monday</strong>.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Bank', value: bankDetails.bankName, key: 'bank' },
                  { label: 'SWIFT Code', value: bankDetails.swiftCode, key: 'swift' },
                  { label: 'Account Name', value: bankDetails.accountName, key: 'name' },
                  { label: 'Account Number', value: bankDetails.accountNumber, key: 'number' },
                  { label: 'Branch', value: bankDetails.branch, key: 'branch' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">{item.label}</p>
                      <p className="font-semibold text-foreground mt-0.5">{item.value}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(item.value, item.key)}
                      className="p-2 hover:bg-accent rounded-lg transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedField === item.key ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <Mail className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-800 dark:text-red-200 text-sm font-semibold">Proof of Settlement</p>
                    <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                      Should be sent to: <a href={`mailto:${bankDetails.contactEmail}`} className="font-bold underline">{bankDetails.contactEmail}</a>
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <Phone className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-blue-800 dark:text-blue-200 text-sm font-semibold">Contact</p>
                    <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                      {bankDetails.contactPhone.join(' / ')}
                    </p>
                  </div>
                </div>
              </div>
            </AnimatedCard>
          )}
        </div>

        {/* Key Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <AnimatedCard className="p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-300" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Weekly Auctions</h3>
            <p className="text-muted-foreground text-sm">T-Bills auctioned every Friday. Order book opens Thursday, closes Friday 10:00 AM.</p>
          </AnimatedCard>

          <AnimatedCard className="p-6 text-center">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-6 w-6 text-orange-600 dark:text-orange-300" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Contract Notes</h3>
            <p className="text-muted-foreground text-sm">Sent to Trustees and Fund Managers by Sunday evening at the latest.</p>
          </AnimatedCard>

          <AnimatedCard className="p-6 text-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-6 w-6 text-green-600 dark:text-green-300" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">T+1 Settlement</h3>
            <p className="text-muted-foreground text-sm">Settlement by Monday 10:00 AM. Proof of payment via email to trading desk.</p>
          </AnimatedCard>
        </div>
      </div>
    </div>
  );
}
