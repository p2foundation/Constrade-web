'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Download,
  Mail,
  Calendar,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Eye,
} from 'lucide-react';
import { AnimatedCard, AnimatedButton } from '@/components/ui/animated-card';
import { contractsApi, UserContract } from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';

export default function ContractsPage() {
  const { token, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['user-contracts', filterType],
    queryFn: () => contractsApi.getAll(1, 50),
    enabled: !!token && isAuthenticated,
  });

  const contracts = data?.contracts || [];
  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch =
      !searchQuery ||
      contract.contractNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.relatedEntity?.security.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      filterType === 'ALL' || contract.contractType === filterType;
    return matchesSearch && matchesType;
  });

  const handleDownloadPDF = async (contractId: string, contractNumber: string) => {
    try {
      const blob = await contractsApi.downloadPDF(contractId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${contractNumber}.pdf`;
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

  const getContractTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      BID_CONFIRMATION: 'Bid Confirmation',
      TRADE_CONFIRMATION: 'Trade Confirmation',
      ALLOCATION_NOTICE: 'Allocation Notice',
      SETTLEMENT_AGREEMENT: 'Settlement Agreement',
    };
    return labels[type] || type;
  };

  const getContractTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      BID_CONFIRMATION: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      TRADE_CONFIRMATION: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      ALLOCATION_NOTICE: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      SETTLEMENT_AGREEMENT: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    };
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GH', {
      year: 'numeric',
      month: 'short',
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
              Please log in to view your contracts.
            </p>
            <Link href="/login">
              <AnimatedButton variant="primary">Sign In</AnimatedButton>
            </Link>
          </AnimatedCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container-content py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Contracts</h1>
          <p className="text-muted-foreground">
            View and download your allocation notices, trade confirmations, and settlement agreements
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by contract number or security..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">All Types</option>
            <option value="BID_CONFIRMATION">Bid Confirmations</option>
            <option value="TRADE_CONFIRMATION">Trade Confirmations</option>
            <option value="ALLOCATION_NOTICE">Allocation Notices</option>
            <option value="SETTLEMENT_AGREEMENT">Settlement Agreements</option>
          </select>
        </div>

        {/* Contracts List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading contracts...</p>
          </div>
        ) : filteredContracts.length === 0 ? (
          <AnimatedCard className="p-12 text-center border border-border">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No Contracts Found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || filterType !== 'ALL'
                ? 'No contracts match your search criteria.'
                : 'You don\'t have any contracts yet. Contracts are automatically generated when you receive allocations or execute trades.'}
            </p>
            {(searchQuery || filterType !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterType('ALL');
                }}
                className="text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </AnimatedCard>
        ) : (
          <div className="space-y-4">
            {filteredContracts.map((contract, index) => (
              <AnimatedCard key={contract.id} className="border border-border" delay={index * 50}>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {getContractTypeLabel(contract.contractType)}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getContractTypeColor(
                            contract.contractType
                          )}`}
                        >
                          {contract.contractType.replace('_', ' ')}
                        </span>
                        {contract.emailSent && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            Emailed
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Contract Number: <span className="font-mono font-semibold">{contract.contractNumber}</span>
                      </p>
                      {contract.relatedEntity && (
                        <p className="text-sm text-muted-foreground">
                          {contract.relatedEntity.security} • {formatCurrency(contract.relatedEntity.amount)}
                          {contract.relatedEntity.side && ` • ${contract.relatedEntity.side}`}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground mb-1">Generated</p>
                      <p className="text-sm font-medium text-foreground">
                        {formatDate(contract.generatedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-border">
                    {contract.pdfGenerated ? (
                      <>
                        <AnimatedButton
                          variant="primary"
                          className="flex-1"
                          onClick={() => handleDownloadPDF(contract.id, contract.contractNumber)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </AnimatedButton>
                        <Link href={`/contracts/${contract.id}`}>
                          <AnimatedButton variant="outline" className="flex-1">
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </AnimatedButton>
                        </Link>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        PDF generation in progress...
                      </div>
                    )}
                  </div>
                </div>
              </AnimatedCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
