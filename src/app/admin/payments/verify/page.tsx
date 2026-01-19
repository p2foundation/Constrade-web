'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Search,
  Filter,
  RefreshCw,
  Upload,
  FileText,
  AlertCircle,
  UserCheck,
  UserX,
  DollarSign,
  Calendar,
  Building2,
  CreditCard,
  CheckCircle2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { paymentVerificationApi, PaymentTransaction } from '@/lib/api';
import Link from 'next/link';

export default function PaymentVerificationPage() {
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentTransaction | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  // Fetch pending verifications
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['payment-verifications', filterStatus, page],
    queryFn: () =>
      paymentVerificationApi.getPendingVerifications({
        status: filterStatus !== 'ALL' ? (filterStatus as any) : undefined,
        page,
        limit,
      }),
  });

  // Verify payment mutation
  const verifyMutation = useMutation({
    mutationFn: (data: { reference: string; notes?: string; verificationData?: any }) =>
      paymentVerificationApi.verifyManually({
        reference: data.reference,
        method: 'MANUAL',
        notes: data.notes,
        verificationData: data.verificationData,
      }),
    onSuccess: (result) => {
      toast.success(
        result.requiresChecker
          ? 'Verification recorded. Awaiting checker approval.'
          : 'Payment verified successfully',
      );
      setShowVerifyModal(false);
      setVerificationNotes('');
      queryClient.invalidateQueries({ queryKey: ['payment-verifications'] });
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to verify payment');
    },
  });

  // Checker approval mutation
  const checkerApproveMutation = useMutation({
    mutationFn: (data: { reference: string; notes?: string }) =>
      paymentVerificationApi.approveAsChecker({
        reference: data.reference,
        method: 'MANUAL',
        notes: data.notes,
      }),
    onSuccess: () => {
      toast.success('Payment approved as checker');
      setShowVerifyModal(false);
      setVerificationNotes('');
      queryClient.invalidateQueries({ queryKey: ['payment-verifications'] });
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve payment');
    },
  });

  // Reject payment mutation
  const rejectMutation = useMutation({
    mutationFn: (data: { reference: string; reason: string }) =>
      paymentVerificationApi.rejectPayment(data),
    onSuccess: () => {
      toast.success('Payment rejected');
      setShowRejectModal(false);
      setRejectionReason('');
      queryClient.invalidateQueries({ queryKey: ['payment-verifications'] });
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reject payment');
    },
  });

  const handleVerify = (transaction: PaymentTransaction) => {
    setSelectedTransaction(transaction);
    setShowVerifyModal(true);
  };

  const handleReject = (transaction: PaymentTransaction) => {
    setSelectedTransaction(transaction);
    setShowRejectModal(true);
  };

  const handleVerifySubmit = () => {
    if (!selectedTransaction) return;

    const metadata = selectedTransaction.metadata || {};
    const requiresChecker = metadata.requiresChecker || selectedTransaction.amount >= 100000;

    if (requiresChecker && metadata.makerVerification) {
      // This is a checker approval
      checkerApproveMutation.mutate({
        reference: selectedTransaction.reference,
        notes: verificationNotes,
      });
    } else {
      // This is a maker verification
      verifyMutation.mutate({
        reference: selectedTransaction.reference,
        notes: verificationNotes,
        verificationData: {
          verifiedBy: user?.id,
          verifiedAt: new Date().toISOString(),
        },
      });
    }
  };

  const handleRejectSubmit = () => {
    if (!selectedTransaction || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    rejectMutation.mutate({
      reference: selectedTransaction.reference,
      reason: rejectionReason,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="h-3 w-3" />
            Verified
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="h-3 w-3" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
            {status}
          </span>
        );
    }
  };

  const filteredTransactions = data?.transactions?.filter((txn) => {
    const matchesSearch =
      txn.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const metadata = selectedTransaction?.metadata || {};
  const requiresChecker = metadata.requiresChecker || (selectedTransaction?.amount || 0) >= 100000;
  const hasMakerVerification = !!metadata.makerVerification;
  const isCheckerApproval = requiresChecker && hasMakerVerification;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payment Verification</h1>
          <p className="text-muted-foreground mt-1">
            Verify and manage payment transactions manually or automatically
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-foreground">
                {data?.transactions?.filter((t) => t.status === 'PENDING').length || 0}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Verified</p>
              <p className="text-2xl font-bold text-foreground">
                {data?.transactions?.filter((t) => t.status === 'COMPLETED').length || 0}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Volume</p>
              <p className="text-2xl font-bold text-foreground">
                ₵
                {(
                  data?.transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0
                ).toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Requires Checker</p>
              <p className="text-2xl font-bold text-foreground">
                {data?.transactions?.filter(
                  (t) => (t.metadata?.requiresChecker || t.amount >= 100000) && t.status === 'PENDING',
                ).length || 0}
              </p>
            </div>
            <UserCheck className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by reference, email, or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="ALL">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="VERIFIED">Verified</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Transactions Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Reference</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : filteredTransactions?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No pending verifications found
                  </td>
                </tr>
              ) : (
                filteredTransactions?.map((transaction) => {
                  const txnMetadata = transaction.metadata || {};
                  const needsChecker =
                    (txnMetadata.requiresChecker || transaction.amount >= 100000) &&
                    transaction.status === 'PENDING';
                  const hasMaker = !!txnMetadata.makerVerification;

                  return (
                    <tr key={transaction.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <code className="text-sm font-mono text-foreground">{transaction.reference}</code>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground">
                            {transaction.user?.firstName} {transaction.user?.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">{transaction.user?.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-foreground">
                          ₵{transaction.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-foreground">{transaction.type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(transaction.status)}
                          {needsChecker && (
                            <span className="text-xs text-purple-600 dark:text-purple-400">
                              {hasMaker ? 'Awaiting Checker' : 'Requires Checker'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedTransaction(transaction);
                              // Open details modal or navigate
                            }}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4 text-foreground" />
                          </button>
                          {transaction.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleVerify(transaction)}
                                className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                title={isCheckerApproval ? 'Approve as Checker' : 'Verify Payment'}
                              >
                                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                              </button>
                              <button
                                onClick={() => handleReject(transaction)}
                                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                title="Reject Payment"
                              >
                                <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.pagination.total)} of{' '}
              {data.pagination.total} transactions
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page >= data.pagination.totalPages}
                className="px-3 py-1 border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Verify Modal */}
      {showVerifyModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-foreground mb-4">
              {isCheckerApproval ? 'Approve as Checker' : 'Verify Payment'}
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Reference</p>
                <p className="font-mono text-foreground">{selectedTransaction.reference}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-semibold text-foreground">
                  ₵{selectedTransaction.amount.toLocaleString()}
                </p>
              </div>
              {hasMakerVerification && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Maker verified by: {metadata.makerVerification?.verifiedBy}
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    {metadata.makerVerification?.notes}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Notes</label>
                <textarea
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                  placeholder="Add verification notes..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowVerifyModal(false);
                  setVerificationNotes('');
                }}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifySubmit}
                disabled={verifyMutation.isPending || checkerApproveMutation.isPending}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {verifyMutation.isPending || checkerApproveMutation.isPending
                  ? 'Processing...'
                  : isCheckerApproval
                    ? 'Approve as Checker'
                    : 'Verify Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-foreground mb-4">Reject Payment</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Reference</p>
                <p className="font-mono text-foreground">{selectedTransaction.reference}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-semibold text-foreground">
                  ₵{selectedTransaction.amount.toLocaleString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={4}
                  placeholder="Please provide a reason for rejection..."
                  required
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={rejectMutation.isPending || !rejectionReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {rejectMutation.isPending ? 'Processing...' : 'Reject Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

