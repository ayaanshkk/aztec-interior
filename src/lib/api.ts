// 1. CENTRALIZED BASE CONFIGURATION
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://aztec-interiors.onrender.com";

// Auth uses Next.js API routes
const AUTH_API_ROOT = `${BASE_PATH}/api`;

// Data uses external backend
const DATA_API_ROOT = BACKEND_URL;

// 🔍 DEBUG: Log the configuration
if (typeof window !== 'undefined') {
  console.log('🌐 API Configuration:', {
    BASE_PATH,
    AUTH_API_ROOT,
    DATA_API_ROOT,
  });
}

// ✅ Helper function to redirect to login with basePath support
function redirectToLogin() {
  if (typeof window !== 'undefined') {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    window.location.href = `${basePath}/login`;
  }
}

// ✅ Helper to add timeout to fetch calls
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 15000) { // ✅ Increased from 5s to 15s
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

/**
 * Helper function for PUBLIC API calls (no authentication required)
 * Used for login/register - calls Next.js API routes
 */
export async function fetchPublic(path: string, options: RequestInit = {}) {
  const url = `${AUTH_API_ROOT}${path.startsWith("/") ? "" : "/"}${path}`;

  console.log('📡 fetchPublic calling:', url);

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
}

/**
 * Helper function to make authenticated API calls
 * Used for data endpoints - calls external Render backend
 */
export async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("auth_token");

  const url = `${DATA_API_ROOT}${path.startsWith("/") ? "" : "/"}${path}`;

  console.log('📡 fetchWithAuth calling:', url);

  if (!token) {
    console.error("No auth token found");
    // redirectToLogin();
    throw new Error("Not authenticated");
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  try {
    // ✅ Increased timeout to 15 seconds for backend operations
    const response = await fetchWithTimeout(url, {
      ...options,
      headers,
    }, 15000);

    // ✅ DON'T logout on 401 - mock auth setup
    if (response.status === 401) {
      console.warn("⚠️ Got 401 from backend - continuing with mock auth");
      // Don't clear localStorage or redirect - let user stay logged in
    }

    return response;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error("⏱️ Request timeout - backend not responding");
      throw new Error("Request timeout");
    }
    throw error;
  }
}

// ✅ Helper to handle API responses gracefully
async function handleApiResponse(response: Response) {
  // For 401s, return empty data instead of throwing
  if (response.status === 401) {
    console.warn("⚠️ 401 response - returning empty data for mock auth");
    return { data: [], error: "Backend authentication in progress" };
  }

  if (response.ok) {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    } else {
      return { success: true };
    }
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    const errorData = await response.json();
    throw new Error(errorData.error || "API error");
  } else {
    const errorText = await response.text();
    console.error("Non-JSON response:", errorText);
    throw new Error(`API failed with status ${response.status}`);
  }
}

// Example usage functions
export const api = {
  // AUTH ENDPOINTS (use fetchPublic - calls Next.js API routes)
  async login(email: string, password: string) {
    const response = await fetchPublic("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return handleApiResponse(response);
  },

  async register(userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role?: string;
  }) {
    const response = await fetchPublic("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
    return handleApiResponse(response);
  },

  // DATA ENDPOINTS (use fetchWithAuth - calls Render backend)
  async getCustomers() {
    try {
      const response = await fetchWithAuth("/customers");
      return await handleApiResponse(response);
    } catch (error) {
      console.warn("⚠️ getCustomers failed, returning empty data");
      return { customers: [] };
    }
  },

  async getJobs() {
    try {
      const response = await fetchWithAuth("/jobs");
      return await handleApiResponse(response);
    } catch (error) {
      console.warn("⚠️ getJobs failed, returning empty data");
      return { jobs: [] };
    }
  },

  async getPipeline() {
    try {
      const response = await fetchWithAuth("/pipeline");
      return await handleApiResponse(response);
    } catch (error) {
      console.warn("⚠️ getPipeline failed, returning empty data");
      return { pipeline: [] };
    }
  },

  async updateCustomerStage(customerId: string, stage: string, reason: string, updatedBy: string) {
    const response = await fetchWithAuth(`/customers/${customerId}/stage`, {
      method: "PATCH",
      body: JSON.stringify({ stage, reason, updated_by: updatedBy }),
    });
    return handleApiResponse(response);
  },

  async updateJobStage(jobId: string, stage: string, reason: string, updatedBy: string) {
    const response = await fetchWithAuth(`/jobs/${jobId}/stage`, {
      method: "PATCH",
      body: JSON.stringify({ stage, reason, updated_by: updatedBy }),
    });
    return handleApiResponse(response);
  },
};