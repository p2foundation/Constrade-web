// TreasuryDirect Ghana - API Client
// Connects frontend to backend API

import axios, { AxiosInstance, AxiosError } from 'axios';
import logger from './logger';
// Helper: safe base64 decode for JWT payloads
function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = typeof window !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Generate a unique correlation ID for tracking requests
function generateCorrelationId(): string {
  return `web-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Request interceptor - Add auth token and correlation ID
apiClient.interceptors.request.use(
  (config) => {
    const startTime = Date.now();
    const correlationId = generateCorrelationId();
    
    // Store start time and correlation ID as custom property
    (config as any).metadata = { startTime, correlationId };
    
    const token = localStorage.getItem('accessToken');
    config.headers = {
      ...(config.headers || {}),
      'X-Correlation-Id': correlationId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    } as any;
    
    logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
      method: config.method?.toUpperCase(),
      url: config.url,
      hasToken: !!token,
      correlationId,
    }, 'API_REQUEST');
    
    return config;
  },
  (error) => {
    logger.error('API Request Error', error, 'API_REQUEST');
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token refresh
apiClient.interceptors.response.use(
  (response) => {
    const duration = Date.now() - ((response.config as any).metadata?.startTime || 0);
    
    logger.api(
      response.config.method?.toUpperCase() || 'UNKNOWN',
      response.config.url || 'UNKNOWN',
      response.status,
      {
        duration: `${duration}ms`,
        dataSize: JSON.stringify(response.data).length,
      }
    );
    
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    const metadata = originalRequest?.metadata;
    const duration = Date.now() - (metadata?.startTime || 0);
    const correlationId = metadata?.correlationId || error.response?.headers['x-correlation-id'];

    logger.api(
      error.config?.method?.toUpperCase() || 'UNKNOWN',
      error.config?.url || 'UNKNOWN',
      error.response?.status,
      {
        duration: `${duration}ms`,
        error: error.message,
        response: error.response?.data,
        correlationId,
      },
      error
    );

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      logger.info('Attempting token refresh', {}, 'API_AUTH');

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          // Create a new axios instance without the auth interceptor to avoid circular calls
          const refreshClient = axios.create({
            baseURL: API_BASE_URL,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${refreshToken}`,
            },
            timeout: 30000,
          });

          const response = await refreshClient.post('/api/v1/auth/refresh', {});

          const { accessToken, refreshToken: newRefreshToken } = response.data;
          
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          logger.info('Token refresh successful', { newTokenLength: accessToken.length }, 'API_AUTH');

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        logger.error('Token refresh failed, clearing tokens and redirecting to login', refreshError, 'API_AUTH');
        
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userId');
        
        // Only redirect if not already on login page
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// AUTHENTICATION API
// ============================================================================

export interface RegisterDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  registrationNumber?: string;
  jobTitle?: string;
  department?: string;
  phone?: string;
  dateOfBirth?: string;
  ghanaCardNumber?: string;
  tinNumber?: string;
  bvnNumber?: string;
  accountType: 'INDIVIDUAL' | 'INSTITUTION' | 'CORPORATE' | 'CUSTODIAN';
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  message?: string; // Optional success message from register
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  organizationName?: string;
  registrationNumber?: string;
  jobTitle?: string;
  department?: string;
  ghanaCardNumber?: string;
  tinNumber?: string;
  bvnNumber?: string;
  role: string;
  accountType: string;
  status: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isKycVerified: boolean;
  createdAt: string;
}

export const authApi = {
  register: async (data: RegisterDto): Promise<TokenResponse> => {
    const response = await apiClient.post('/api/v1/auth/register', data);
    return response.data;
  },

  login: async (data: LoginDto): Promise<TokenResponse> => {
    console.log('🔐 [API] Login request starting...', {
      email: data.email,
      passwordLength: data.password?.length,
      baseURL: apiClient.defaults.baseURL,
      timestamp: new Date().toISOString()
    });
    
    try {
      const response = await apiClient.post('/api/v1/auth/login', data);
      console.log('✅ [API] Login response received:', {
        status: response.status,
        hasData: !!response.data,
        hasAccessToken: !!response.data?.accessToken,
        hasRefreshToken: !!response.data?.refreshToken,
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ [API] Login request failed:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          method: error.config?.method,
        }
      });
      throw error;
    }
  },

  getProfile: async (tokenOverride?: string): Promise<UserProfile> => {
    const response = await apiClient.get('/api/v1/auth/me', {
      headers: tokenOverride
        ? { Authorization: `Bearer ${tokenOverride}` }
        : undefined,
    });
    let data: any = response.data;

    // Some backends may return a string (e.g., 'OK' or JSON as string). Normalize it.
    if (typeof data === 'string') {
      try {
        // Check for empty string before parsing
        if (data.trim() === '') {
          throw new Error('Empty response from server');
        }
        data = JSON.parse(data);
      } catch (parseError) {
        // Not JSON; treat as invalid payload
        logger.error('Failed to parse profile response as JSON', { 
          data: data.substring(0, 100), 
          error: parseError 
        }, 'API');
        data = null;
      }
    }

    // Common API shapes: { data: {...} } or { user: {...} }
    if (data && typeof data === 'object') {
      if ('data' in data && data.data && typeof data.data === 'object') {
        data = data.data;
      } else if ('user' in data && data.user && typeof data.user === 'object') {
        data = data.user;
      }
    }

    // Basic validation to ensure we have a usable profile
    const validDirect = !!(data && typeof data === 'object' && (data as any).id && (data as any).email);
    if (validDirect) {
      return data as UserProfile;
    }

    // Fallback: derive minimal profile from access token if backend returns minimal/empty payloads
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const payload = accessToken ? decodeJwtPayload(accessToken) : null;
    if (payload) {
      const fallback: UserProfile = {
        id: payload.sub || payload.id || payload.userId || 'unknown',
        email: payload.email || payload.username || '',
        firstName: payload.firstName || '',
        lastName: payload.lastName || '',
        phone: payload.phone || '',
        role: payload.role || (Array.isArray(payload.roles) ? payload.roles[0] : 'USER'),
        accountType: payload.accountType || 'INDIVIDUAL',
        status: payload.status || 'ACTIVE',
        isEmailVerified: !!(payload.isEmailVerified ?? false),
        isPhoneVerified: !!(payload.isPhoneVerified ?? false),
        isKycVerified: !!(payload.isKycVerified ?? false),
        createdAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : new Date().toISOString(),
      };
      if (fallback.email) {
        logger.info('Using JWT-derived profile as fallback', { hasEmail: true }, 'API');
        return fallback;
      }
    }

    throw new Error('Invalid profile response from /api/v1/auth/me');
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/api/v1/auth/logout');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  refreshToken: async (): Promise<TokenResponse> => {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await apiClient.post('/api/v1/auth/refresh', {}, {
      headers: { Authorization: `Bearer ${refreshToken}` },
    });
    return response.data;
  },

  updateProfile: async (data: Partial<UserProfile>): Promise<UserProfile> => {
    const response = await apiClient.patch('/api/v1/auth/profile', data);
    return response.data;
  },
};

// ============================================================================
// SECURITIES API
// ============================================================================

export interface Security {
  id: string;
  isin: string;
  securityType: 'TREASURY_BILL' | 'TREASURY_BOND';
  issueDate: string;
  maturityDate: string;
  tenor: number;
  couponRate: number;
  currentYield: number;
  issueSize: number;
  name: string;
  symbol: string;
  currency: string;
  status: string;
  tenorDays: number;
}

export const securitiesApi = {
  getAll: async (type?: string): Promise<Security[]> => {
    try {
      const response = await apiClient.get('/api/v1/securities', {
        params: { type },
      });
      return response.data;
    } catch (error) {
      // Return mock data for development
      logger.warn('Failed to fetch securities, using mock data', { error, type }, 'API');
      
      const mockSecurities: Security[] = [
        {
          id: "1",
          isin: "GH0010134567",
          securityType: "TREASURY_BILL",
          issueDate: "2024-01-15",
          maturityDate: "2024-04-15",
          tenor: 91,
          couponRate: 0,
          currentYield: 28.5,
          issueSize: 500000000,
          name: "91-Day Treasury Bill",
          symbol: "GHTB91D",
          currency: "GHS",
          status: "ACTIVE",
          tenorDays: 91,
        },
        {
          id: "2",
          isin: "GH0010134568",
          securityType: "TREASURY_BILL",
          issueDate: "2024-01-15",
          maturityDate: "2024-07-15",
          tenor: 182,
          couponRate: 0,
          currentYield: 29.2,
          issueSize: 750000000,
          name: "182-Day Treasury Bill",
          symbol: "GHTB182D",
          currency: "GHS",
          status: "ACTIVE",
          tenorDays: 182,
        },
        {
          id: "3",
          isin: "GH0010134569",
          securityType: "TREASURY_BOND",
          issueDate: "2024-01-15",
          maturityDate: "2029-01-15",
          tenor: 1825,
          couponRate: 18.5,
          currentYield: 19.1,
          issueSize: 1000000000,
          name: "5-Year Treasury Bond",
          symbol: "GHTB5Y",
          currency: "GHS",
          status: "ACTIVE",
          tenorDays: 1825,
        },
      ];

      if (type && type !== 'ALL') {
        return mockSecurities.filter(s => s.securityType === type);
      }

      return mockSecurities;
    }
  },

  getById: async (id: string): Promise<Security> => {
    try {
      const response = await apiClient.get(`/api/v1/securities/${id}`);
      return response.data;
    } catch (error) {
      logger.warn('Failed to fetch security, using mock data', { error, id }, 'API');
      
      // Return mock data for development
      const mockSecurity: Security = {
        id: id,
        isin: "GH0010134567",
        securityType: "TREASURY_BILL",
        issueDate: "2024-01-15",
        maturityDate: "2024-04-15",
        tenor: 91,
        couponRate: 0,
        currentYield: 28.5,
        issueSize: 500000000,
        name: "91-Day Treasury Bill",
        symbol: "GHTB91D",
        currency: "GHS",
        status: "ACTIVE",
        tenorDays: 91,
      };

      return mockSecurity;
    }
  },
};

// Convenience exports for backward compatibility
export const getSecurities = securitiesApi.getAll;

// ============================================================================
// AUCTIONS API
// ============================================================================

export interface Auction {
  id: string;
  auctionId?: string;
  security: {
    id: string;
    name: string;
    code: string;
    type: 'TREASURY_BILL' | 'TREASURY_BOND' | string;
    issueDate: string;
    maturityDate: string;
    couponRate?: number;
    faceValue: number;
    minDenomination: number;
    isin?: string;
    prospectusUrl?: string;
  };
  auctionDate: string;
  auctionType?: string;
  settlementDate: string;
  status: 'UPCOMING' | 'OPEN' | 'CLOSED' | 'SETTLED' | string;
  totalBids: number;
  totalAmount: number;
  minBidAmount: number;
  maxBidAmount?: number;
  cutoffYield?: number;
  submissionDeadline?: string;
  biddingOpenDate?: string;
  biddingCloseDate?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  results?: {
    averageYield: number;
    bidToCoverRatio: number;
    totalBids: number;
    marginalPrice: number;
    publishedDate: string;
  };
  userBid?: {
    id: string;
    bidReference: string;
    quantity: number;
    price?: number;
    yield?: number;
    status: string;
    submittedAt: string;
  };
}

export interface SubmitBidDto {
  bidType: 'COMPETITIVE' | 'NON_COMPETITIVE';
  amount: number;
  yield?: number;
  clientRef?: string;
}

export interface Bid {
  id: string;
  auctionId: string;
  type: 'COMPETITIVE' | 'NON_COMPETITIVE' | string;
  amount: number;
  yield?: number;
  status: string;
  allocatedAmount?: number;
  allocatedYield?: number;
  createdAt: string;
  updatedAt: string;
  auction?: Auction & {
    auctionId?: string;
  };
}

export const auctionsApi = {
  getAll: async (params?: {
    status?: string;
    securityType?: string;
    page?: number;
    limit?: number;
  }): Promise<Auction[]> => {
    const response = await apiClient.get('/api/v1/auctions', { params });
    return response.data?.auctions ?? response.data;
  },

  getOpen: async (): Promise<Auction[]> => {
    const response = await apiClient.get('/api/v1/auctions/open');
    return response.data;
  },

  getById: async (id: string): Promise<Auction> => {
    const response = await apiClient.get(`/api/v1/auctions/${id}`);
    return response.data;
  },

  submitBid: async (auctionId: string, data: SubmitBidDto): Promise<any> => {
    // Map frontend DTO to backend CreateBidDto
    const payload = {
      auctionId,
      type: data.bidType,
      amount: data.amount,
      yield: data.yield,
    };
    const response = await apiClient.post('/api/v1/auctions/bid', payload);
    return response.data;
  },

  getMyBids: async (params?: {
    auctionId?: string;
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<any[]> => {
    const response = await apiClient.get('/api/v1/auctions/my-bids', { params });
    const data = response.data;
    if (Array.isArray(data?.bids)) {
      return data.bids;
    }
    return data;
  },

  getResults: async (auctionId: string): Promise<any> => {
    // Results are exposed via BoG controller
    const response = await apiClient.get(`/api/v1/bog/auctions/${auctionId}/results`);
    return response.data;
  },

  getMySettlements: async (): Promise<any[]> => {
    const response = await apiClient.get('/api/v1/auctions/my-settlements');
    return response.data;
  },
};

// ============================================================================
// PORTFOLIO API
// ============================================================================

export interface Portfolio {
  totalValue: number;
  totalCost: number;
  unrealizedPnL: number;
  realizedPnL: number;
  returnYTD: number;
  holdings: Holding[];
}

export interface Holding {
  securityId: string;
  isin: string;
  quantity: number;
  averageCost: number;
  currentValue: number;
  unrealizedPnL: number;
  maturityDate: string;
}

export interface PerformanceMetrics {
  returnPct: number;
  sharpeRatio: number;
  duration: number;
  yield: number;
  var95: number;
}

export interface Transaction {
  id: string;
  type: string;
  securityId: string;
  amount: number;
  price: number;
  date: string;
}

export const portfolioApi = {
  get: async (): Promise<Portfolio> => {
    const response = await apiClient.get('/api/v1/portfolio');
    return response.data;
  },

  getHoldings: async (): Promise<Holding[]> => {
    const response = await apiClient.get('/api/v1/portfolio/holdings');
    return response.data;
  },

  getPerformance: async (period?: string): Promise<PerformanceMetrics> => {
    const response = await apiClient.get('/api/v1/portfolio/performance', {
      params: { period },
    });
    return response.data;
  },

  getTransactions: async (from?: string, to?: string): Promise<Transaction[]> => {
    const response = await apiClient.get('/api/v1/portfolio/transactions', {
      params: { from, to },
    });
    return response.data;
  },
};

// ============================================================================
// KYC API
// ============================================================================

export interface KYCDocument {
  id: string;
  documentType: string;
  status: string;
  uploadedAt: string;
  reviewedAt?: string;
}

export const kycApi = {
  submit: async (kycData: any): Promise<{ success: boolean; message: string; kycStatus: string }> => {
    const response = await apiClient.post('/api/v1/kyc/submit', kycData);
    return response.data;
  },

  uploadDocument: async (documentType: string, file: File): Promise<KYCDocument> => {
    const formData = new FormData();
    formData.append('documentType', documentType);
    formData.append('file', file);

    const response = await apiClient.post('/api/v1/kyc/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getDocuments: async (): Promise<KYCDocument[]> => {
    const response = await apiClient.get('/api/v1/kyc/documents');
    return response.data;
  },

  getKycData: async (): Promise<any> => {
    const response = await apiClient.get('/api/v1/kyc/data');
    return response.data;
  },
};

// ============================================================================
// PAYMENTS API
// ============================================================================

export interface InitiatePaymentDto {
  amount: number;
  paymentMethod: 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CARD';
  bankAccountId?: string;
  metadata?: any;
}

export interface PaymentResponse {
  paymentId: string;
  reference: string;
  status: string;
  paymentUrl?: string;
}

// ============================================================================
// PAYMENT VERIFICATION API
// ============================================================================

export interface PaymentVerification {
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'DISPUTED';
  verificationMethod?: 'MANUAL' | 'AUTOMATIC' | 'RECONCILIATION';
  paymentEvidence?: {
    type: 'RECEIPT' | 'SCREENSHOT' | 'BANK_STATEMENT' | 'OTHER';
    description?: string;
    fileUrl?: string;
    uploadedAt: string;
  };
  verification?: {
    verifiedBy?: string;
    verifiedAt: string;
    method: string;
    notes?: string;
    verificationData?: any;
  };
  makerVerification?: {
    verifiedBy: string;
    verifiedAt: string;
    notes?: string;
  };
  rejection?: {
    rejectedBy: string;
    rejectedAt: string;
    reason: string;
  };
  requiresChecker?: boolean;
}

export interface PaymentTransaction {
  id: string;
  userId: string;
  type: string;
  amount: number;
  reference: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  description?: string;
  metadata?: any;
  createdAt: string;
  processedAt?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  bid?: any;
  auction?: any;
  bankAccount?: any;
}

export const paymentVerificationApi = {
  uploadEvidence: async (data: {
    reference: string;
    evidenceType: 'RECEIPT' | 'SCREENSHOT' | 'BANK_STATEMENT' | 'OTHER';
    description?: string;
    fileUrl?: string;
  }): Promise<{ transaction: PaymentTransaction; message: string }> => {
    const response = await apiClient.post('/api/v1/payments/verification/evidence/upload', data);
    return response.data;
  },

  verifyManually: async (data: {
    reference: string;
    method: 'MANUAL';
    verifiedBy?: string;
    notes?: string;
    verificationData?: any;
    requiresChecker?: boolean;
  }): Promise<{ transaction: PaymentTransaction; message: string; requiresChecker?: boolean }> => {
    const response = await apiClient.post('/api/v1/payments/verification/verify/manual', data);
    return response.data;
  },

  approveAsChecker: async (data: {
    reference: string;
    method: 'MANUAL';
    notes?: string;
    verificationData?: any;
  }): Promise<{ transaction: PaymentTransaction; message: string }> => {
    const response = await apiClient.post('/api/v1/payments/verification/verify/checker', data);
    return response.data;
  },

  rejectPayment: async (data: {
    reference: string;
    reason: string;
  }): Promise<PaymentTransaction> => {
    const response = await apiClient.post('/api/v1/payments/verification/reject', data);
    return response.data;
  },

  getPendingVerifications: async (params?: {
    status?: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'DISPUTED';
    method?: 'MANUAL' | 'AUTOMATIC' | 'RECONCILIATION';
    page?: number;
    limit?: number;
  }): Promise<{
    transactions: PaymentTransaction[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> => {
    const response = await apiClient.get('/api/v1/payments/verification/pending', { params });
    return response.data;
  },

  getVerificationDetails: async (reference: string): Promise<{
    transaction: PaymentTransaction;
    verificationStatus: string;
    verificationMethod?: string;
    paymentEvidence?: any;
    verification?: any;
    makerVerification?: any;
    rejection?: any;
    requiresChecker: boolean;
  }> => {
    const response = await apiClient.get(`/api/v1/payments/verification/details/${reference}`);
    return response.data;
  },
};

export const paymentsApi = {
  initiate: async (data: InitiatePaymentDto): Promise<PaymentResponse> => {
    const response = await apiClient.post('/api/v1/payments/initiate', data);
    return response.data;
  },

  getStatus: async (paymentId: string): Promise<any> => {
    const response = await apiClient.get(`/api/v1/payments/${paymentId}/status`);
    return response.data;
  },

  getMethods: async (): Promise<any[]> => {
    const response = await apiClient.get('/api/v1/payments/methods');
    return response.data;
  },
};

// ============================================================================
// CONTRACTS API
// ============================================================================

export interface UserContract {
  id: string;
  contractNumber: string;
  contractType: string;
  entityType: string;
  entityId: string;
  pdfUrl?: string;
  pdfGenerated: boolean;
  emailSent: boolean;
  emailSentAt?: string;
  generatedAt: string;
  createdAt: string;
  contractData?: Record<string, any>;
  relatedEntity?: {
    type: string;
    security: string;
    amount: number;
    side?: 'BUY' | 'SELL';
  };
}

export const contractsApi = {
  // Get all user contracts
  getAll: async (page: number = 1, limit: number = 20): Promise<{
    contracts: UserContract[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> => {
    const response = await apiClient.get('/api/v1/contracts', { params: { page, limit } });
    return response.data;
  },

  // Get contract by ID
  getById: async (contractId: string): Promise<UserContract> => {
    const response = await apiClient.get(`/api/v1/contracts/${contractId}`);
    return response.data;
  },

  // Download contract PDF
  downloadPDF: async (contractId: string): Promise<Blob> => {
    const response = await apiClient.get(`/api/v1/contracts/${contractId}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
  }).format(amount);
};

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-GH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (date: string): string => {
  return new Date(date).toLocaleString('en-GH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const calculateDaysToMaturity = (maturityDate: string): number => {
  const now = new Date();
  const maturity = new Date(maturityDate);
  const diff = maturity.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export { API_BASE_URL };

export default apiClient;
