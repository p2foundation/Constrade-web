'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Download,
  Mail,
  Calendar,
  CheckCircle,
  ArrowLeft,
  Building2,
  DollarSign,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { AnimatedCard, AnimatedButton } from '@/components/ui/animated-card';
import { contractsApi } from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';

export default function ContractDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { token, isAuthenticated } = useAuth();
  const contractId = id as string;

  const { data: contract, isLoading, error } = useQuery({
    queryKey: ['contract', contractId],
    queryFn: () => contractsApi.getById(contractId),
    enabled: !!token && isAuthenticated && !!contractId,
  });

  const handleDownloadPDF = async () => {
    if (!contract) return;
    try {
      const blob = await contractsApi.downloadPDF(contractId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${contract.contractNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Contract downloaded successfully');
    } catch (error: any) {
      toast.error('Failed to download contract', {
        description: error.response?.data?.message || 'An error occurred',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container-content py-8">
          <AnimatedCard className="p-12 text-center border border-border">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Authentication Required</h3>
            <p className="text-muted-foreground mb-6">
              Please log in to view this contract.
            </p>
            <Link href="/login">
              <AnimatedButton variant="primary">Sign In</AnimatedButton>
            </Link>
          </AnimatedCard>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container-content py-8">
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading contract...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container-content py-8">
          <AnimatedCard className="p-12 text-center border border-border">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Contract Not Found</h3>
            <p className="text-muted-foreground mb-6">
              The contract you're looking for doesn't exist or you don't have access to it.
            </p>
            <Link href="/contracts">
              <AnimatedButton variant="primary">View All Contracts</AnimatedButton>
            </Link>
          </AnimatedCard>
        </div>
      </div>
    );
  }

  const contractData = contract.contractData as any;
  const getContractTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      BID_CONFIRMATION: 'Bid Confirmation',
      TRADE_CONFIRMATION: 'Trade Confirmation',
      ALLOCATION_NOTICE: 'Allocation Notice',
      SETTLEMENT_AGREEMENT: 'Settlement Agreement',
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container-content py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <AnimatedButton variant="outline" onClick={() => router.push('/contracts')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contracts
            </AnimatedButton>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{getContractTypeLabel(contract.contractType)}</h1>
              <p className="text-muted-foreground">
                Contract Number: <span className="font-mono font-semibold">{contract.contractNumber}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              {contract.pdfGenerated && (
                <AnimatedButton variant="primary" onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </AnimatedButton>
              )}
            </div>
          </div>
        </div>

        {/* Contract Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <AnimatedCard className="p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Contract Information
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Contract Type</p>
                    <p className="font-medium">{getContractTypeLabel(contract.contractType)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Generated</p>
                    <p className="font-medium">{formatDate(contract.generatedAt)}</p>
                  </div>
                  {contract.emailSent && contract.emailSentAt && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Email Sent</p>
                      <p className="font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4 text-green-500" />
                        {formatDate(contract.emailSentAt)}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Status</p>
                    <p className="font-medium flex items-center gap-2">
                      {contract.pdfGenerated ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          PDF Ready
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4 text-yellow-500" />
                          Generating...
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {contractData?.data && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <h3 className="font-semibold mb-4">Contract Details</h3>
                    <div className="space-y-3">
                      {contractData.data.user && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Investor</p>
                          <p className="font-medium">{contractData.data.user.name || contractData.data.user.email}</p>
                          {contractData.data.user.csdAccount && (
                            <p className="text-xs text-muted-foreground">CSD: {contractData.data.user.csdAccount}</p>
                          )}
                        </div>
                      )}
                      {contractData.data.auction && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Security</p>
                          <p className="font-medium">{contractData.data.auction.title}</p>
                          {contractData.data.auction.isin && (
                            <p className="text-xs text-muted-foreground">ISIN: {contractData.data.auction.isin}</p>
                          )}
                        </div>
                      )}
                      {contractData.data.allocation && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Allocated Amount</p>
                          <p className="font-semibold text-lg text-green-600 dark:text-green-400">
                            {formatCurrency(contractData.data.allocation.allocatedAmount)}
                          </p>
                          {contractData.data.allocation.yield && (
                            <p className="text-sm text-muted-foreground">Yield: {contractData.data.allocation.yield.toFixed(2)}%</p>
                          )}
                        </div>
                      )}
                      {contractData.data.trade && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Trade Amount</p>
                          <p className="font-semibold text-lg">
                            {formatCurrency(contractData.data.trade.amount)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Quantity: {formatCurrency(contractData.data.trade.quantity)} @ {formatCurrency(contractData.data.trade.price)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </AnimatedCard>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <AnimatedCard className="p-6 border border-border">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {contract.pdfGenerated && (
                  <AnimatedButton variant="primary" className="w-full" onClick={handleDownloadPDF}>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </AnimatedButton>
                )}
                <Link href="/contracts">
                  <AnimatedButton variant="outline" className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    View All Contracts
                  </AnimatedButton>
                </Link>
                {contract.relatedEntity?.type === 'ALLOTMENT' && (
                  <Link href="/trading/primary-market?tab=settlement">
                    <AnimatedButton variant="outline" className="w-full">
                      <DollarSign className="h-4 w-4 mr-2" />
                      View Settlement
                    </AnimatedButton>
                  </Link>
                )}
                {contract.relatedEntity?.type === 'TRADE' && (
                  <Link href="/trading/portfolio">
                    <AnimatedButton variant="outline" className="w-full">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      View Portfolio
                    </AnimatedButton>
                  </Link>
                )}
              </div>
            </AnimatedCard>

            <AnimatedCard className="p-6 border border-border">
              <h3 className="font-semibold mb-4">Contract Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">PDF Generated</span>
                  {contract.pdfGenerated ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Email Sent</span>
                  {contract.emailSent ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
              </div>
            </AnimatedCard>
          </div>
        </div>
      </div>
    </div>
  );
}
