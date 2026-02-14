// 1. CENTRALIZED BASE CONFIGURATION (SMART URL DETECTION)

// Pick basePath normally
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

// 🚀 SMART BACKEND URL DETECTION
// Priority:
// 1. NEXT_PUBLIC_BACKEND_URL (manual override for any environment)
// 2. In development (NODE_ENV === 'development') → use localhost
// 3. In production → use production URL
const getBackendUrl = () => {
  // Manual override takes highest priority
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  }
  
  // Auto-detect based on environment
  const isDevelopment = process.env.NODE_ENV === "development";
  
  if (isDevelopment) {
    // Development mode → use localhost
    return "http://localhost:5000";
  } else {
    // Production mode → use production URL
    return "https://aztec-interior.onrender.com";
  }
};

const BACKEND_URL = getBackendUrl();

// Auth uses Next.js API routes (your frontend)
const AUTH_API_ROOT = `${BASE_PATH}/api`;

// Data uses backend API
const DATA_API_ROOT = BACKEND_URL;

// 🔍 DEBUG LOG
if (typeof window !== "undefined") {
  console.log("🌐 API Configuration:", {
    NODE_ENV: process.env.NODE_ENV,
    BASE_PATH,
    AUTH_API_ROOT,
    DATA_API_ROOT,
    BACKEND_URL,
  });
}

// ✅ Helper function to redirect to login with basePath support
function redirectToLogin() {
  if (typeof window !== 'undefined') {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    window.location.href = `${basePath}/login`;
  }
}

// ✅ REQUEST DEDUPLICATION: Prevent duplicate requests
const pendingRequests = new Map<string, Promise<any>>();

function deduplicateRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
  // If request is already pending, return existing promise
  if (pendingRequests.has(key)) {
    console.log(`♻️ Reusing pending request: ${key}`);
    return pendingRequests.get(key)!;
  }

  // Create new request
  const promise = requestFn().finally(() => {
    // Clean up after request completes
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

// ✅ INCREASED TIMEOUT: 30s for slow Render backend (handles cold starts)
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms - server is taking too long to respond`);
    }
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
 * Used for data endpoints - calls external backend (auto-detects URL)
 */
export async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("auth_token");

  const url = `${DATA_API_ROOT}${path.startsWith("/") ? "" : "/"}${path}`;

  console.log('📡 fetchWithAuth calling:', url);

  if (!token) {
    console.error("No auth token found");
    throw new Error("Not authenticated");
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  try {
    // ✅ Increased timeout to 30s for Render cold starts
    const response = await fetchWithTimeout(url, {
      ...options,
      headers,
    }, 30000);

    // ✅ DON'T logout on 401 - mock auth setup
    if (response.status === 401) {
      console.warn("⚠️ Got 401 from backend - continuing with mock auth");
    }

    return response;
  } catch (error: any) {
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      console.error("⏱️ Request timeout - backend not responding (likely cold start)");
      throw new Error("Request timeout - the server is taking too long. Please try again.");
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

  // DATA ENDPOINTS (use fetchWithAuth - calls backend with auto URL detection)
  async getCustomers() {
    return deduplicateRequest('getCustomers', async () => {
      try {
        const response = await fetchWithAuth("/customers");
        return await handleApiResponse(response);
      } catch (error) {
        console.warn("⚠️ getCustomers failed, returning empty data");
        return { customers: [] };
      }
    });
  },

  async getJobs() {
    return deduplicateRequest('getJobs', async () => {
      try {
        const response = await fetchWithAuth("/jobs");
        return await handleApiResponse(response);
      } catch (error) {
        console.warn("⚠️ getJobs failed, returning empty data");
        return { jobs: [] };
      }
    });
  },

  async getPipeline() {
    return deduplicateRequest('getPipeline', async () => {
      try {
        const response = await fetchWithAuth("/pipeline");
        return await handleApiResponse(response);
      } catch (error) {
        console.warn("⚠️ getPipeline failed, returning empty data");
        return { pipeline: [] };
      }
    });
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

  // ✅ ASSIGNMENT ENDPOINTS (Schedule Page) - WITH DEDUPLICATION
  async getAssignments() {
    return deduplicateRequest('getAssignments', async () => {
      try {
        console.log("📋 Fetching assignments...");
        const response = await fetchWithAuth("/assignments");
        
        if (!response.ok) {
          console.error(`❌ Assignments API returned ${response.status}`);
          throw new Error(`Failed to fetch assignments: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`✅ Got ${data.length} assignments`);
        return data;
      } catch (error) {
        console.error("❌ getAssignments failed:", error);
        throw error;
      }
    });
  },

  async getAvailableJobs() {
    return deduplicateRequest('getAvailableJobs', async () => {
      try {
        console.log("🔨 Fetching available jobs...");
        const response = await fetchWithAuth("/jobs/available");
        
        if (!response.ok) {
          console.warn(`⚠️ Jobs API returned ${response.status}`);
          return []; // Return empty array instead of throwing
        }
        
        const data = await response.json();
        console.log(`✅ Got ${data.length} jobs`);
        return data;
      } catch (error) {
        console.warn("⚠️ getAvailableJobs failed (non-critical):", error);
        return []; // Return empty array for graceful degradation
      }
    });
  },

  async getActiveCustomers() {
    return deduplicateRequest('getActiveCustomers', async () => {
      try {
        console.log("👥 Fetching active customers...");
        const response = await fetchWithAuth("/customers/active");
        
        if (!response.ok) {
          console.warn(`⚠️ Customers API returned ${response.status}`);
          return []; // Return empty array instead of throwing
        }
        
        const data = await response.json();
        console.log(`✅ Got ${data.length} customers`);
        return data;
      } catch (error) {
        console.warn("⚠️ getActiveCustomers failed (non-critical):", error);
        return []; // Return empty array for graceful degradation
      }
    });
  },

  async createAssignment(assignmentData: any) {
    try {
      console.log("📝 Creating assignment:", assignmentData);
      console.log("⏳ This may take up to 30 seconds if the server is waking up...");
      
      const response = await fetchWithAuth("/assignments", {
        method: "POST",
        body: JSON.stringify(assignmentData),
      });
      
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to create assignment: ${response.status}`);
        } else {
          const errorText = await response.text();
          console.error("Non-JSON error response:", errorText);
          throw new Error(`Server error: ${response.status}. Please try again.`);
        }
      }
      
      const result = await response.json();
      console.log("✅ Assignment created:", result.assignment?.id || result.id);
      return result.assignment || result;
    } catch (error: any) {
      console.error("❌ createAssignment failed:", error);
      if (error.message.includes('timeout')) {
        throw new Error('The server is taking too long to respond. This might be because the server is waking up. Please try again in a moment.');
      }
      throw error;
    }
  },

  async updateAssignment(assignmentId: string, assignmentData: any) {
    try {
      console.log(`📝 Updating assignment ${assignmentId}:`, assignmentData);
      const response = await fetchWithAuth(`/assignments/${assignmentId}`, {
        method: "PUT",
        body: JSON.stringify(assignmentData),
      });
      
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update assignment");
        } else {
          throw new Error(`Server error: ${response.status}`);
        }
      }
      
      const result = await response.json();
      console.log("✅ Assignment updated:", result.assignment?.id || result.id);
      return result.assignment || result;
    } catch (error) {
      console.error("❌ updateAssignment failed:", error);
      throw error;
    }
  },

  async deleteAssignment(assignmentId: string) {
    try {
      console.log(`🗑️ Deleting assignment ${assignmentId}`);
      const response = await fetchWithAuth(`/assignments/${assignmentId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete assignment");
        } else {
          throw new Error(`Server error: ${response.status}`);
        }
      }
      
      console.log("✅ Assignment deleted");
      return true;
    } catch (error) {
      console.error("❌ deleteAssignment failed:", error);
      throw error;
    }
  },

  async getAssignmentsByDateRange(startDate: string, endDate: string) {
    return deduplicateRequest(`getAssignmentsByDateRange-${startDate}-${endDate}`, async () => {
      try {
        console.log(`📅 Fetching assignments from ${startDate} to ${endDate}`);
        const response = await fetchWithAuth(
          `/assignments/by-date-range?start_date=${startDate}&end_date=${endDate}`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch assignments by date range: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`✅ Got ${data.length} assignments in range`);
        return data;
      } catch (error) {
        console.error("❌ getAssignmentsByDateRange failed:", error);
        throw error;
      }
    });
  },
};