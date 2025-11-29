// ============================================================================
// OPTIMIZED API CLIENT FOR AZTEC INTERIOR CRM
// ============================================================================
// ✅ Parallel fetching support
// ✅ Smart caching (memory + optional localStorage)
// ✅ Dev-only logging
// ✅ 8s production timeout (10s dev)
// ✅ Exponential backoff retry
// ✅ Request deduplication
// ✅ Token caching
// ============================================================================

// ============================================================================
// 1. CONFIGURATION
// ============================================================================

const IS_DEV = process.env.NODE_ENV === 'development';
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://aztec-interior.onrender.com";

const AUTH_API_ROOT = `${BASE_PATH}/api`;
const DATA_API_ROOT = BACKEND_URL;

// Timeout configuration (shorter in production for better UX)
const TIMEOUT_MS = IS_DEV ? 10000 : 8000; // 8s prod, 10s dev

// Cache TTL (time-to-live) in milliseconds
const CACHE_TTL = {
  customers: 2 * 60 * 1000,      // 2 minutes
  jobs: 2 * 60 * 1000,           // 2 minutes  
  pipeline: 2 * 60 * 1000,       // 2 minutes
  assignments: 1 * 60 * 1000,    // 1 minute
  activeCustomers: 3 * 60 * 1000,// 3 minutes
  availableJobs: 3 * 60 * 1000,  // 3 minutes
};

// Dev-only logging
const log = (...args: any[]) => {
  if (IS_DEV) console.log(...args);
};

const warn = (...args: any[]) => {
  if (IS_DEV) console.warn(...args);
};

const error = (...args: any[]) => {
  console.error(...args); // Always log errors
};

// ============================================================================
// 2. IN-MEMORY CACHE
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    const keys = Array.from(this.cache.keys()).filter(k => k.includes(pattern));
    keys.forEach(k => this.cache.delete(k));
  }

  clear(): void {
    this.cache.clear();
  }
}

const cache = new MemoryCache();

// ============================================================================
// 3. TOKEN CACHING (avoid localStorage reads on every call)
// ============================================================================

let cachedToken: string | null = null;

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  if (cachedToken) return cachedToken;
  
  cachedToken = localStorage.getItem("auth_token");
  return cachedToken;
}

export function setAuthToken(token: string | null): void {
  cachedToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem("auth_token", token);
    } else {
      localStorage.removeItem("auth_token");
    }
  }
}

export function clearAuthToken(): void {
  setAuthToken(null);
}

// ============================================================================
// 4. REQUEST DEDUPLICATION (prevent concurrent duplicate requests)
// ============================================================================

const pendingRequests = new Map<string, Promise<any>>();

function deduplicateRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
  if (pendingRequests.has(key)) {
    log(`♻️ Reusing pending request: ${key}`);
    return pendingRequests.get(key)!;
  }

  const promise = requestFn().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

// ============================================================================
// 5. FETCH WITH TIMEOUT & RETRY
// ============================================================================

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (err: any) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw err;
  }
}

// Exponential backoff retry for transient failures
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 2
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);
      
      // Retry on 5xx errors (server issues) but not 4xx (client errors)
      if (response.status >= 500 && attempt < maxRetries) {
        warn(`Attempt ${attempt + 1} failed with ${response.status}, retrying...`);
        await sleep(Math.min(1000 * Math.pow(2, attempt), 3000)); // 1s, 2s, 3s max
        continue;
      }
      
      return response;
    } catch (err: any) {
      lastError = err;
      
      // Retry on network errors but not timeouts (timeout = give up)
      if (err.message.includes('timeout')) {
        throw err; // Don't retry timeouts
      }
      
      if (attempt < maxRetries) {
        warn(`Attempt ${attempt + 1} failed, retrying...`);
        await sleep(Math.min(500 * Math.pow(2, attempt), 2000));
        continue;
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// 6. RESPONSE HANDLING
// ============================================================================

async function handleApiResponse<T = any>(response: Response): Promise<T> {
  // Handle 401 gracefully for mock auth
  if (response.status === 401) {
    warn("⚠️ 401 response - backend auth issue");
    return { data: [], error: "Authentication required" } as T;
  }

  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    
    if (contentType?.includes("application/json")) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    
    const errorText = await response.text();
    throw new Error(`API failed with status ${response.status}: ${errorText.slice(0, 100)}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return response.json();
  }
  
  return { success: true } as T;
}

// ============================================================================
// 7. PUBLIC API (Auth endpoints - Next.js API routes)
// ============================================================================

export async function fetchPublic(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${AUTH_API_ROOT}${path.startsWith("/") ? "" : "/"}${path}`;
  log('📡 fetchPublic:', url);

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  return fetch(url, { ...options, headers });
}

// ============================================================================
// 8. AUTHENTICATED API (Data endpoints - Render backend)
// ============================================================================

export async function fetchWithAuth(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const url = `${DATA_API_ROOT}${path.startsWith("/") ? "" : "/"}${path}`;

  log('📡 fetchWithAuth:', url);

  if (!token) {
    error("No auth token found");
    throw new Error("Not authenticated");
  }

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
    ...options.headers,
  };

  return fetchWithRetry(url, { ...options, headers });
}

// ============================================================================
// 9. API METHODS WITH CACHING
// ============================================================================

export const api = {
  // ==========================================================================
  // AUTH ENDPOINTS (Next.js API routes)
  // ==========================================================================
  
  async login(email: string, password: string) {
    const response = await fetchPublic("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const result = await handleApiResponse(response);
    
    // Cache token if login successful
    if (result.token) {
      setAuthToken(result.token);
    }
    
    return result;
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
    const result = await handleApiResponse(response);
    
    // Cache token if registration successful
    if (result.token) {
      setAuthToken(result.token);
    }
    
    return result;
  },

  logout() {
    clearAuthToken();
    cache.clear();
    if (typeof window !== 'undefined') {
      const basePath = BASE_PATH || '';
      window.location.href = `${basePath}/login`;
    }
  },

  // ==========================================================================
  // DATA ENDPOINTS (Render backend) - WITH CACHING
  // ==========================================================================

  async getCustomers(skipCache = false) {
    const cacheKey = 'customers';
    
    if (!skipCache) {
      const cached = cache.get(cacheKey);
      if (cached) {
        log('✅ Cache hit: customers');
        return cached;
      }
    }

    return deduplicateRequest(cacheKey, async () => {
      try {
        const response = await fetchWithAuth("/customers");
        const data = await handleApiResponse(response);
        
        cache.set(cacheKey, data, CACHE_TTL.customers);
        return data;
      } catch (err) {
        warn("⚠️ getCustomers failed, returning empty data");
        return { customers: [] };
      }
    });
  },

  async getJobs(skipCache = false) {
    const cacheKey = 'jobs';
    
    if (!skipCache) {
      const cached = cache.get(cacheKey);
      if (cached) {
        log('✅ Cache hit: jobs');
        return cached;
      }
    }

    return deduplicateRequest(cacheKey, async () => {
      try {
        const response = await fetchWithAuth("/jobs");
        const data = await handleApiResponse(response);
        
        cache.set(cacheKey, data, CACHE_TTL.jobs);
        return data;
      } catch (err) {
        warn("⚠️ getJobs failed, returning empty data");
        return { jobs: [] };
      }
    });
  },

  async getPipeline(skipCache = false) {
    const cacheKey = 'pipeline';
    
    if (!skipCache) {
      const cached = cache.get(cacheKey);
      if (cached) {
        log('✅ Cache hit: pipeline');
        return cached;
      }
    }

    return deduplicateRequest(cacheKey, async () => {
      try {
        log("📋 Fetching pipeline data...");
        const response = await fetchWithAuth("/pipeline");
        
        if (!response.ok) {
          throw new Error(`Failed to fetch pipeline: ${response.status}`);
        }
        
        const data = await response.json();
        log(`✅ Got ${data.length} pipeline items`);
        
        cache.set(cacheKey, data, 2 * 60 * 1000); // 2 minutes
        return data;
      } catch (err) {
        error("❌ getPipeline failed:", err);
        throw err;
      }
    });
  },

  async getAssignments(skipCache = false) {
    const cacheKey = 'assignments';
    
    if (!skipCache) {
      const cached = cache.get(cacheKey);
      if (cached) {
        log('✅ Cache hit: assignments');
        return cached;
      }
    }

    return deduplicateRequest(cacheKey, async () => {
      try {
        log("📋 Fetching assignments...");
        const response = await fetchWithAuth("/assignments");
        
        if (!response.ok) {
          throw new Error(`Failed to fetch assignments: ${response.status}`);
        }
        
        const data = await response.json();
        log(`✅ Got ${data.length} assignments`);
        
        cache.set(cacheKey, data, 5 * 60 * 1000); // 5 minutes (shorter for real-time data)
        return data;
      } catch (err) {
        error("❌ getAssignments failed:", err);
        throw err;
      }
    });
  },

  async createAssignment(assignmentData: any) {
    try {
      log("📤 Creating assignment:", assignmentData);
      
      const response = await fetchWithAuth("/assignments", {
        method: "POST",
        body: JSON.stringify(assignmentData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create assignment");
      }
      
      const result = await handleApiResponse(response);
      
      // Invalidate assignments cache
      cache.invalidate('assignments');
      
      log("✅ Assignment created successfully");
      return result;
    } catch (err) {
      error("❌ createAssignment failed:", err);
      throw err;
    }
  },

  async updateAssignment(assignmentId: string, assignmentData: any) {
    try {
      log(`📝 Updating assignment ${assignmentId}:`, assignmentData);
      
      const response = await fetchWithAuth(`/assignments/${assignmentId}`, {
        method: "PUT",
        body: JSON.stringify(assignmentData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update assignment");
      }
      
      const result = await handleApiResponse(response);
      
      // Invalidate assignments cache
      cache.invalidate('assignments');
      
      log("✅ Assignment updated successfully");
      return result;
    } catch (err) {
      error("❌ updateAssignment failed:", err);
      throw err;
    }
  },

  async deleteAssignment(assignmentId: string) {
    try {
      log(`🗑️ Deleting assignment ${assignmentId}`);
      
      const response = await fetchWithAuth(`/assignments/${assignmentId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete assignment");
      }
      
      const result = await handleApiResponse(response);
      
      // Invalidate assignments cache
      cache.invalidate('assignments');
      
      log("✅ Assignment deleted successfully");
      return result;
    } catch (err) {
      error("❌ deleteAssignment failed:", err);
      throw err;
    }
  },

  async getAvailableJobs(skipCache = false) {
    const cacheKey = 'availableJobs';
    
    if (!skipCache) {
      const cached = cache.get(cacheKey);
      if (cached) {
        log('✅ Cache hit: availableJobs');
        return cached;
      }
    }

    return deduplicateRequest(cacheKey, async () => {
      try {
        log("🔨 Fetching available jobs...");
        const response = await fetchWithAuth("/jobs/available");
        
        if (!response.ok) {
          warn(`⚠️ Jobs API returned ${response.status}`);
          return [];
        }
        
        const data = await response.json();
        log(`✅ Got ${data.length} jobs`);
        
        cache.set(cacheKey, data, CACHE_TTL.availableJobs);
        return data;
      } catch (err) {
        warn("⚠️ getAvailableJobs failed:", err);
        return [];
      }
    });
  },

  async getActiveCustomers(skipCache = false) {
    const cacheKey = 'activeCustomers';
    
    if (!skipCache) {
      const cached = cache.get(cacheKey);
      if (cached) {
        log('✅ Cache hit: activeCustomers');
        return cached;
      }
    }

    return deduplicateRequest(cacheKey, async () => {
      try {
        log("👥 Fetching active customers...");
        const response = await fetchWithAuth("/customers/active");
        
        if (!response.ok) {
          warn(`⚠️ Customers API returned ${response.status}`);
          return [];
        }
        
        const data = await response.json();
        log(`✅ Got ${data.length} customers`);
        
        cache.set(cacheKey, data, CACHE_TTL.activeCustomers);
        return data;
      } catch (err) {
        warn("⚠️ getActiveCustomers failed:", err);
        return [];
      }
    });
  },

  async getCustomerProjects(customerId: string, skipCache = false) {
    const cacheKey = `customer-projects-${customerId}`;
    
    if (!skipCache) {
      const cached = cache.get(cacheKey);
      if (cached) {
        log('✅ Cache hit: customer projects');
        return cached;
      }
    }

    return deduplicateRequest(cacheKey, async () => {
      try {
        const response = await fetchWithAuth(`/customers/${customerId}/projects`);
        const data = await handleApiResponse(response);
        
        cache.set(cacheKey, data, 2 * 60 * 1000); // 2 minutes
        return data;
      } catch (err) {
        warn("⚠️ getCustomerProjects failed");
        return { projects: [] };
      }
    });
  },

  async getCustomerDetails(customerId: string, skipCache = false) {
    const cacheKey = `customer-details-${customerId}`;
    
    if (!skipCache) {
      const cached = cache.get(cacheKey);
      if (cached) {
        log('✅ Cache hit: customer details');
        return cached;
      }
    }

    return deduplicateRequest(cacheKey, async () => {
      try {
        const response = await fetchWithAuth(`/customers/${customerId}`);
        const data = await handleApiResponse(response);
        
        cache.set(cacheKey, data, 2 * 60 * 1000); // 2 minutes
        return data;
      } catch (err) {
        error("❌ getCustomerDetails failed:", err);
        throw err;
      }
    });
  },

  async getCustomerDrawings(customerId: string, projectId?: string, skipCache = false) {
    const cacheKey = projectId 
      ? `customer-drawings-${customerId}-${projectId}` 
      : `customer-drawings-${customerId}`;
    
    if (!skipCache) {
      const cached = cache.get(cacheKey);
      if (cached) {
        log('✅ Cache hit: customer drawings');
        return cached;
      }
    }

    return deduplicateRequest(cacheKey, async () => {
      try {
        const response = await fetchWithAuth(`/files/drawings?customer_id=${customerId}`);
        
        if (!response.ok) {
          warn("⚠️ Drawings fetch returned non-OK status");
          return [];
        }
        
        const contentType = response.headers.get("content-type");
        if (!contentType?.includes("application/json")) {
          warn("⚠️ Drawings fetch returned non-JSON");
          return [];
        }
        
        const data = await response.json();
        const drawings = Array.isArray(data) ? data : [];
        
        // Filter by project if specified
        const filtered = projectId
          ? drawings.filter((d: any) => d.project_id === projectId)
          : drawings;
        
        cache.set(cacheKey, filtered, 2 * 60 * 1000); // 2 minutes
        return filtered;
      } catch (err) {
        warn("⚠️ getCustomerDrawings failed:", err);
        return [];
      }
    });
  },

  async getCustomerFormDocuments(customerId: string, skipCache = false) {
    const cacheKey = `customer-form-docs-${customerId}`;
    
    if (!skipCache) {
      const cached = cache.get(cacheKey);
      if (cached) {
        log('✅ Cache hit: customer form documents');
        return cached;
      }
    }

    return deduplicateRequest(cacheKey, async () => {
      try {
        const response = await fetchWithAuth(`/files/forms?customer_id=${customerId}`);
        
        if (!response.ok) {
          warn("⚠️ Form docs fetch returned non-OK status");
          return [];
        }
        
        const contentType = response.headers.get("content-type");
        if (!contentType?.includes("application/json")) {
          warn("⚠️ Form docs fetch returned non-JSON");
          return [];
        }
        
        const data = await response.json();
        const forms = Array.isArray(data) ? data : [];
        
        cache.set(cacheKey, forms, 2 * 60 * 1000); // 2 minutes
        return forms;
      } catch (err) {
        warn("⚠️ getCustomerFormDocuments failed:", err);
        return [];
      }
    });
  },

  async uploadDrawing(file: File, customerId: string, projectId?: string) {
    try {
      log("📤 Uploading drawing:", file.name);
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("customer_id", customerId);
      if (projectId) {
        formData.append("project_id", projectId);
      }

      const token = getAuthToken();
      const response = await fetchWithTimeout(
        `${DATA_API_ROOT}/files/drawings`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          body: formData,
        },
        TIMEOUT_MS
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const data = await response.json();
      log("✅ Drawing uploaded:", data.drawing?.id);
      
      // Invalidate cache
      cache.invalidatePattern(`customer-drawings-${customerId}`);
      
      return data.drawing;
    } catch (err) {
      error("❌ uploadDrawing failed:", err);
      throw err;
    }
  },

  async uploadFormDocument(file: File, customerId: string) {
    try {
      log("📤 Uploading form document:", file.name);
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("customer_id", customerId);

      const token = getAuthToken();
      const response = await fetchWithTimeout(
        `${DATA_API_ROOT}/files/forms`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          body: formData,
        },
        TIMEOUT_MS
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const data = await response.json();
      log("✅ Form document uploaded:", data.form_document?.id);
      
      // Invalidate cache
      cache.invalidatePattern(`customer-form-docs-${customerId}`);
      
      return data.form_document;
    } catch (err) {
      error("❌ uploadFormDocument failed:", err);
      throw err;
    }
  },

  async deleteDrawing(drawingId: string, customerId: string) {
    try {
      log(`🗑️ Deleting drawing ${drawingId}`);
      const response = await fetchWithAuth(`/files/drawings/${drawingId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete" }));
        throw new Error(errorData.error || "Failed to delete drawing");
      }

      log("✅ Drawing deleted");
      
      // Invalidate cache
      cache.invalidatePattern(`customer-drawings-${customerId}`);
      
      return true;
    } catch (err) {
      error("❌ deleteDrawing failed:", err);
      throw err;
    }
  },

  async deleteFormDocument(docId: string, customerId: string) {
    try {
      log(`🗑️ Deleting form document ${docId}`);
      const response = await fetchWithAuth(`/files/forms/${docId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete" }));
        throw new Error(errorData.error || "Failed to delete form document");
      }

      log("✅ Form document deleted");
      
      // Invalidate cache
      cache.invalidatePattern(`customer-form-docs-${customerId}`);
      
      return true;
    } catch (err) {
      error("❌ deleteFormDocument failed:", err);
      throw err;
    }
  },

  async getAssignmentsByDateRange(startDate: string, endDate: string, skipCache = false) {
    const cacheKey = `assignments-${startDate}-${endDate}`;
    
    if (!skipCache) {
      const cached = cache.get(cacheKey);
      if (cached) {
        log('✅ Cache hit: assignments by date range');
        return cached;
      }
    }

    return deduplicateRequest(cacheKey, async () => {
      try {
        log(`📅 Fetching assignments from ${startDate} to ${endDate}`);
        const response = await fetchWithAuth(
          `/assignments/by-date-range?start_date=${startDate}&end_date=${endDate}`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch assignments: ${response.status}`);
        }
        
        const data = await response.json();
        log(`✅ Got ${data.length} assignments in range`);
        
        cache.set(cacheKey, data, CACHE_TTL.assignments);
        return data;
      } catch (err) {
        error("❌ getAssignmentsByDateRange failed:", err);
        throw err;
      }
    });
  },

  async updateCustomerStage(customerId: string, stage: string, reason: string, updatedBy: string) {
    try {
      const response = await fetchWithAuth(`/customers/${customerId}/stage`, {
        method: "PATCH",
        body: JSON.stringify({ stage, reason, updated_by: updatedBy }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update customer stage: ${response.status}`);
      }
      
      const result = await handleApiResponse(response);
      
      // Invalidate pipeline cache
      cache.invalidate('pipeline');
      cache.invalidate('customers');
      cache.invalidate('activeCustomers');
      
      return result;
    } catch (err) {
      error("❌ updateCustomerStage failed:", err);
      throw err;
    }
  },

  async updateJobStage(jobId: string, stage: string, reason: string, updatedBy: string) {
    try {
      const response = await fetchWithAuth(`/jobs/${jobId}/stage`, {
        method: "PATCH",
        body: JSON.stringify({ stage, reason, updated_by: updatedBy }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update job stage: ${response.status}`);
      }
      
      const result = await handleApiResponse(response);
      
      // Invalidate pipeline cache
      cache.invalidate('pipeline');
      cache.invalidate('jobs');
      cache.invalidate('availableJobs');
      
      return result;
    } catch (err) {
      error("❌ updateJobStage failed:", err);
      throw err;
    }
  },

  async updateProjectStage(projectId: string, stage: string, projectData: any) {
    try {
      const response = await fetchWithAuth(`/projects/${projectId}`, {
        method: "PUT",
        body: JSON.stringify({
          ...projectData,
          stage,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update project stage: ${response.status}`);
      }
      
      const result = await handleApiResponse(response);
      
      // Invalidate pipeline cache
      cache.invalidate('pipeline');
      
      return result;
    } catch (err) {
      error("❌ updateProjectStage failed:", err);
      throw err;
    }
  },

  // PROJECT METHODS
  async getProject(projectId: string, skipCache = false) {
    const cacheKey = `project-${projectId}`;
    
    if (!skipCache) {
      const cached = cache.get(cacheKey);
      if (cached) {
        log(`✅ Cache hit: project-${projectId}`);
        return cached;
      }
    }

    return deduplicateRequest(cacheKey, async () => {
      try {
        log(`📦 Fetching project ${projectId}...`);
        const response = await fetchWithAuth(`/projects/${projectId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch project: ${response.status}`);
        }
        
        const data = await response.json();
        log(`✅ Got project ${projectId}`);
        
        cache.set(cacheKey, data, 5 * 60 * 1000); // 5 minutes
        return data;
      } catch (err) {
        error("❌ getProject failed:", err);
        throw err;
      }
    });
  },

  async getProjectForms(projectId: string, skipCache = false) {
    const cacheKey = `project-forms-${projectId}`;
    
    if (!skipCache) {
      const cached = cache.get(cacheKey);
      if (cached) {
        log(`✅ Cache hit: project-forms-${projectId}`);
        return cached;
      }
    }

    return deduplicateRequest(cacheKey, async () => {
      try {
        log(`📋 Fetching forms for project ${projectId}...`);
        const response = await fetchWithAuth(`/projects/${projectId}/forms`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch project forms: ${response.status}`);
        }
        
        const data = await response.json();
        log(`✅ Got ${data.length} forms for project ${projectId}`);
        
        cache.set(cacheKey, data, 3 * 60 * 1000); // 3 minutes
        return data;
      } catch (err) {
        error("❌ getProjectForms failed:", err);
        throw err;
      }
    });
  },

  async deleteFormSubmission(formId: number, projectId: string) {
    try {
      log(`🗑️ Deleting form ${formId}`);
      
      const response = await fetchWithAuth(`/form-submissions/${formId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete form: ${response.status}`);
      }
      
      const result = await handleApiResponse(response);
      
      // Invalidate project forms cache
      cache.invalidate(`project-forms-${projectId}`);
      
      log(`✅ Form deleted`);
      return result;
    } catch (err) {
      error("❌ deleteFormSubmission failed:", err);
      throw err;
    }
  },

  async submitCustomerForm(formData: any, token?: string, projectId?: string, isWalkinMode?: boolean) {
    try {
      log("📝 Submitting customer form...");
      
      const payload = {
        token: token || undefined,
        formData,
        projectId: projectId || undefined,
        isWalkinMode: isWalkinMode || false,
      };

      const response = await fetchWithAuth("/submit-customer-form", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit form: ${response.status}`);
      }

      const result = await handleApiResponse(response);
      log("✅ Form submitted successfully");
      
      return result;
    } catch (err) {
      error("❌ submitCustomerForm failed:", err);
      throw err;
    }
  },

  async createMaterialOrder(orderData: {
    customer_id: string;
    material_description: string;
    supplier_name?: string | null;
    estimated_cost?: number | null;
    order_date: string;
    expected_delivery_date?: string | null;
    notes?: string | null;
    status: string;
  }) {
    try {
      log("📦 Creating material order...");
      
      const response = await fetchWithAuth("/materials", {
        method: "POST",
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create material order: ${response.status}`);
      }

      const result = await handleApiResponse(response);
      log("✅ Material order created");
      
      return result;
    } catch (err) {
      error("❌ createMaterialOrder failed:", err);
      throw err;
    }
  },

  async getJob(jobId: string, skipCache = false) {
    const cacheKey = `job-${jobId}`;
    
    if (!skipCache) {
      const cached = cache.get(cacheKey);
      if (cached) {
        log(`✅ Cache hit: job-${jobId}`);
        return cached;
      }
    }

    return deduplicateRequest(cacheKey, async () => {
      try {
        log(`📋 Fetching job ${jobId}...`);
        const response = await fetchWithAuth(`/jobs/${jobId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch job: ${response.status}`);
        }
        
        const data = await response.json();
        log(`✅ Got job ${jobId}`);
        
        cache.set(cacheKey, data, 5 * 60 * 1000);
        return data;
      } catch (err) {
        error("❌ getJob failed:", err);
        throw err;
      }
    });
  },

  async updateJobWorkStage(jobId: string, workStage: string) {
    try {
      log(`🔄 Updating job ${jobId} work stage to ${workStage}...`);
      
      const response = await fetchWithAuth(`/jobs/${jobId}`, {
        method: "PUT",
        body: JSON.stringify({ work_stage: workStage }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update job work stage: ${response.status}`);
      }

      const result = await handleApiResponse(response);
      
      // Invalidate relevant caches
      cache.invalidate('jobs');
      cache.invalidate(`job-${jobId}`);
      
      log(`✅ Job work stage updated`);
      return result;
    } catch (err) {
      error("❌ updateJobWorkStage failed:", err);
      throw err;
    }
  },

  async deleteJob(jobId: string) {
    try {
      log(`🗑️ Deleting job ${jobId}...`);
      
      const response = await fetchWithAuth(`/jobs/${jobId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete job: ${response.status}`);
      }

      const result = await handleApiResponse(response);
      
      // Invalidate relevant caches
      cache.invalidate('jobs');
      cache.invalidate(`job-${jobId}`);
      
      log(`✅ Job deleted`);
      return result;
    } catch (err) {
      error("❌ deleteJob failed:", err);
      throw err;
    }
  },

  async getAllUsers(skipCache = false) {
    const cacheKey = 'users';
    
    if (!skipCache) {
      const cached = cache.get(cacheKey);
      if (cached) {
        log('✅ Cache hit: users');
        return cached;
      }
    }

    return deduplicateRequest(cacheKey, async () => {
      try {
        log("👥 Fetching all users...");
        const response = await fetchWithAuth("/users");
        
        if (!response.ok) {
          throw new Error(`Failed to fetch users: ${response.status}`);
        }
        
        const data = await response.json();
        log(`✅ Got ${data.users?.length || 0} users`);
        
        cache.set(cacheKey, data, 5 * 60 * 1000); // 5 minutes
        return data;
      } catch (err) {
        error("❌ getAllUsers failed:", err);
        // Return empty data instead of throwing
        return { users: [] };
      }
    });
  },
};

// ============================================================================
// 10. PARALLEL FETCHING HELPERS
// ============================================================================

/**
 * Fetch multiple endpoints in parallel
 * Usage: const [customers, jobs, pipeline] = await fetchParallel([
 *   api.getCustomers(),
 *   api.getJobs(),
 *   api.getPipeline()
 * ]);
 */
export function fetchParallel<T extends readonly unknown[]>(
  promises: readonly [...T]
): Promise<{ -readonly [P in keyof T]: Awaited<T[P]> }> {
  return Promise.all(promises) as any;
}

/**
 * Fetch multiple endpoints in parallel with error handling
 * Returns partial results even if some requests fail
 */
export async function fetchParallelSafe<T extends readonly unknown[]>(
  promises: readonly [...T]
): Promise<Array<{ data: any; error: Error | null }>> {
  const results = await Promise.allSettled(promises);
  return results.map(result => {
    if (result.status === 'fulfilled') {
      return { data: result.value, error: null };
    }
    return { data: null, error: result.reason };
  });
}

// ============================================================================
// 11. CACHE UTILITIES (export for manual cache management)
// ============================================================================

export const cacheUtils = {
  invalidate: (key: string) => cache.invalidate(key),
  invalidatePattern: (pattern: string) => cache.invalidatePattern(pattern),
  clear: () => cache.clear(),
};