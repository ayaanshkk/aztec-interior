// 1. CENTRALIZED BASE CONFIGURATION (LOCALHOST READY)

// Pick basePath normally
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

// 🚀 Backend URL (localhost for dev, production for deployed)
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

// All API calls now go to the backend (no Next.js API routes)
const API_ROOT = `${BACKEND_URL}/api`;

// ✅ EXPORT BACKEND_URL FOR USE IN COMPONENTS
export { BACKEND_URL, API_ROOT };

// 🔍 DEBUG LOG
if (typeof window !== "undefined") {
  console.log("🌐 API Configuration:", {
    BASE_PATH,
    API_ROOT,
    BACKEND_URL,
  });
}

// ✅ Helper function to redirect to login with basePath support
function redirectToLogin() {
  if (typeof window !== "undefined") {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    window.location.href = `${basePath}/login`;
  }
}

// ✅ REQUEST DEDUPLICATION: Prevent duplicate requests
const pendingRequests = new Map<string, Promise<any>>();

function deduplicateRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
  if (pendingRequests.has(key)) {
    console.log(`♻️ Reusing pending request: ${key}`);
    return pendingRequests.get(key)!;
  }

  const promise = requestFn().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

// ✅ INCREASED TIMEOUT: 30s for slow backend (handles cold starts)
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === "AbortError") {
      throw new Error(
        `Request timeout after ${timeout}ms - server is taking too long to respond`
      );
    }
    throw error;
  }
}

/**
 * Helper function for PUBLIC API calls (no authentication required)
 * Used for login/register
 */
export async function fetchPublic(path: string, options: RequestInit = {}) {
  const url = `${API_ROOT}${path.startsWith("/") ? "" : "/"}${path}`;

  console.log("📡 fetchPublic calling:", url);

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetchWithTimeout(url, {
    ...options,
    headers,
  });

  return response;
}

/**
 * Helper function to make authenticated API calls
 */
export async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token"); // Changed from "auth_token"

  const url = `${API_ROOT}${path.startsWith("/") ? "" : "/"}${path}`;

  console.log("📡 fetchWithAuth calling:", url);

  if (!token) {
    console.error("No auth token found");
    redirectToLogin();
    throw new Error("Not authenticated");
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  try {
    const response = await fetchWithTimeout(
      url,
      {
        ...options,
        headers,
      },
      30000
    );

    // Handle 401 - redirect to login
    if (response.status === 401) {
      console.warn("⚠️ Got 401 - token expired or invalid");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      redirectToLogin();
      throw new Error("Authentication expired");
    }

    return response;
  } catch (error: any) {
    if (error.name === "AbortError" || error.message.includes("timeout")) {
      console.error("⏱️ Request timeout - backend not responding");
      throw new Error(
        "Request timeout - the server is taking too long. Please try again."
      );
    }
    throw error;
  }
}

// ✅ Helper to handle API responses gracefully
async function handleApiResponse(response: Response) {
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

// API methods
export const api = {
  // ============================================
  // AUTH ENDPOINTS (username/password)
  // ============================================
  async login(username: string, password: string) {
    const response = await fetchPublic("/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    return handleApiResponse(response);
  },

  async register(inviteData: { token: string; password: string }) {
    const response = await fetchPublic("/register", {
      method: "POST",
      body: JSON.stringify(inviteData),
    });
    return handleApiResponse(response);
  },

  async getCurrentUser() {
    const response = await fetchWithAuth("/me");
    return handleApiResponse(response);
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const response = await fetchWithAuth("/change-password", {
      method: "POST",
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
    return handleApiResponse(response);
  },

  // ============================================
  // CUSTOMER ENDPOINTS
  // ============================================
  async getCustomers() {
    return deduplicateRequest("getCustomers", async () => {
      const response = await fetchWithAuth("/customers");
      return handleApiResponse(response);
    });
  },

  async getCustomer(customerId: string) {
    const response = await fetchWithAuth(`/customers/${customerId}`);
    return handleApiResponse(response);
  },

  async createCustomer(customerData: any) {
    const response = await fetchWithAuth("/customers", {
      method: "POST",
      body: JSON.stringify(customerData),
    });
    return handleApiResponse(response);
  },

  async updateCustomer(customerId: string, customerData: any) {
    const response = await fetchWithAuth(`/customers/${customerId}`, {
      method: "PUT",
      body: JSON.stringify(customerData),
    });
    return handleApiResponse(response);
  },

  async deleteCustomer(customerId: string) {
    const response = await fetchWithAuth(`/customers/${customerId}`, {
      method: "DELETE",
    });
    return handleApiResponse(response);
  },

  // ============================================
  // PROJECT ENDPOINTS
  // ============================================
  async getProjects() {
    return deduplicateRequest("getProjects", async () => {
      const response = await fetchWithAuth("/projects");
      return handleApiResponse(response);
    });
  },

  async getProject(projectId: number) {
    const response = await fetchWithAuth(`/projects/${projectId}`);
    return handleApiResponse(response);
  },

  async createProject(projectData: any) {
    const response = await fetchWithAuth("/projects", {
      method: "POST",
      body: JSON.stringify(projectData),
    });
    return handleApiResponse(response);
  },

  async updateProject(projectId: number, projectData: any) {
    const response = await fetchWithAuth(`/projects/${projectId}`, {
      method: "PUT",
      body: JSON.stringify(projectData),
    });
    return handleApiResponse(response);
  },

  async updateProjectStage(projectId: number, stageId: number) {
    const response = await fetchWithAuth(`/projects/${projectId}/stage`, {
      method: "PATCH",
      body: JSON.stringify({ stage_id: stageId }),
    });
    return handleApiResponse(response);
  },

  // ============================================
  // MATERIALS ENDPOINTS
  // ============================================
  async getMaterials(filters?: { client_id?: number; status?: string }) {
    const params = new URLSearchParams();
    if (filters?.client_id) params.append("client_id", filters.client_id.toString());
    if (filters?.status) params.append("status", filters.status);
    
    const queryString = params.toString() ? `?${params.toString()}` : "";
    const response = await fetchWithAuth(`/materials${queryString}`);
    return handleApiResponse(response);
  },

  async createMaterial(materialData: any) {
    const response = await fetchWithAuth("/materials", {
      method: "POST",
      body: JSON.stringify(materialData),
    });
    return handleApiResponse(response);
  },

  async updateMaterial(materialId: number, materialData: any) {
    const response = await fetchWithAuth(`/materials/${materialId}`, {
      method: "PATCH",
      body: JSON.stringify(materialData),
    });
    return handleApiResponse(response);
  },

  // ============================================
  // NOTIFICATIONS ENDPOINTS
  // ============================================
  async getNotifications() {
    return deduplicateRequest("getNotifications", async () => {
      const response = await fetchWithAuth("/notifications");
      return handleApiResponse(response);
    });
  },

  async markNotificationRead(notificationId: number) {
    const response = await fetchWithAuth(`/notifications/${notificationId}/read`, {
      method: "PATCH",
    });
    return handleApiResponse(response);
  },

  async markAllNotificationsRead() {
    const response = await fetchWithAuth("/notifications/mark-all-read", {
      method: "PATCH",
    });
    return handleApiResponse(response);
  },

  // ============================================
  // QUOTATIONS ENDPOINTS
  // ============================================
  async getQuotations(filters?: { client_id?: number; project_id?: number }) {
    const params = new URLSearchParams();
    if (filters?.client_id) params.append("client_id", filters.client_id.toString());
    if (filters?.project_id) params.append("project_id", filters.project_id.toString());
    
    const queryString = params.toString() ? `?${params.toString()}` : "";
    const response = await fetchWithAuth(`/quotations${queryString}`);
    return handleApiResponse(response);
  },

  async generateQuotationFromChecklist(formSubmissionId: number) {
    const response = await fetchWithAuth(
      `/quotations/generate-from-checklist/${formSubmissionId}`,
      { method: "POST" }
    );
    return handleApiResponse(response);
  },

  // ============================================
  // CALENDAR ENDPOINTS (calendar_routes.py)
  // ============================================

  /**
   * Get all tasks for calendar view with date range filtering
   * Backend: calendar_routes.py → get_calendar_tasks()
   */
  async getCalendarTasks(params?: {
    start_date?: string;
    end_date?: string;
    assigned_to_employee_id?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append("start_date", params.start_date);
    if (params?.end_date) queryParams.append("end_date", params.end_date);
    if (params?.assigned_to_employee_id) {
      queryParams.append("assigned_to_employee_id", params.assigned_to_employee_id.toString());
    }

    const queryString = queryParams.toString();
    const response = await fetchWithAuth(`/calendar/tasks${queryString ? `?${queryString}` : ""}`);
    return handleApiResponse(response);
  },

  /**
   * Move a task to a new date (for drag and drop)
   * Backend: calendar_routes.py → move_calendar_task()
   */
  async moveCalendarTask(taskId: string, startDate: string, endDate?: string) {
    const response = await fetchWithAuth(`/calendar/tasks/${taskId}/move`, {
      method: "PATCH",
      body: JSON.stringify({
        start_date: startDate,
        end_date: endDate || startDate,
      }),
    });
    return handleApiResponse(response);
  },

  /**
   * Get all calendar events (tasks + other events)
   * Backend: calendar_routes.py → get_calendar_events()
   */
  async getCalendarEvents(params?: {
    start_date?: string;
    end_date?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append("start_date", params.start_date);
    if (params?.end_date) queryParams.append("end_date", params.end_date);

    const queryString = queryParams.toString();
    const response = await fetchWithAuth(`/calendar/events${queryString ? `?${queryString}` : ""}`);
    return handleApiResponse(response);
  },

  /**
   * Get team availability for a date range
   * Backend: calendar_routes.py → get_team_availability()
   */
  async getTeamAvailability(startDate: string, endDate: string) {
    const queryParams = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });

    const response = await fetchWithAuth(`/calendar/availability?${queryParams.toString()}`);
    return handleApiResponse(response);
  },

  // ============================================
  // TASKS ENDPOINTS (tasks_routes.py)
  // ============================================

  /**
   * Get all tasks
   * Backend: tasks_routes.py → handle_tasks() GET
   */
  async getTasks() {
    return deduplicateRequest("getTasks", async () => {
      const response = await fetchWithAuth("/tasks");
      return handleApiResponse(response);
    });
  },

  /**
   * Create a new task
   * Backend: tasks_routes.py → handle_tasks() POST
   */
  async createTask(taskData: {
    type?: string;
    title: string;
    start_date?: string;
    end_date?: string;
    date?: string;
    customer_name?: string;
    assigned_to_employee_id?: number;
    team_member?: string;
    project_id?: string;
    client_id?: number;
    job_type?: string;
    start_time?: string;
    end_time?: string;
    estimated_hours?: number;
    notes?: string;
    priority?: string;
    status?: string;
    opportunity_id?: string;
    work_stage?: string;
  }) {
    const response = await fetchWithAuth("/tasks", {
      method: "POST",
      body: JSON.stringify(taskData),
    });
    return handleApiResponse(response);
  },

  /**
   * Get a single task by ID
   * Backend: tasks_routes.py → handle_single_task() GET
   */
  async getTask(taskId: string) {
    const response = await fetchWithAuth(`/tasks/${taskId}`);
    return handleApiResponse(response);
  },

  /**
   * Update a task
   * Backend: tasks_routes.py → handle_single_task() PUT
   */
  async updateTask(taskId: string, taskData: Partial<{
    type: string;
    title: string;
    start_date: string;
    end_date: string;
    date: string;
    customer_name: string;
    assigned_to_employee_id: number;
    team_member: string;
    project_id: string;
    client_id: number;
    job_type: string;
    start_time: string;
    end_time: string;
    estimated_hours: number;
    notes: string;
    priority: string;
    status: string;
    opportunity_id: string;
    work_stage: string;
  }>) {
    const response = await fetchWithAuth(`/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(taskData),
    });
    return handleApiResponse(response);
  },

  /**
   * Delete a task
   * Backend: tasks_routes.py → handle_single_task() DELETE
   */
  async deleteTask(taskId: string) {
    const response = await fetchWithAuth(`/tasks/${taskId}`, {
      method: "DELETE",
    });
    return handleApiResponse(response);
  },

  /**
   * Get tasks within a date range
   * Backend: tasks_routes.py → get_tasks_by_date_range()
   */
  async getTasksByDateRange(startDate: string, endDate: string) {
    const queryParams = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });

    const response = await fetchWithAuth(`/tasks/by-date-range?${queryParams.toString()}`);
    return handleApiResponse(response);
  },

  /**
   * Get projects ready to be scheduled
   * Backend: tasks_routes.py → get_available_jobs()
   */
  async getAvailableJobs() {
    const response = await fetchWithAuth("/jobs/available");
    return handleApiResponse(response);
  },

  /**
   * Get active clients for tasks
   * Backend: tasks_routes.py → get_active_customers()
   */
  async getActiveCustomers() {
    const response = await fetchWithAuth("/customers/active");
    return handleApiResponse(response);
  },

  /**
   * Get all job work stages with metadata
   * Backend: tasks_routes.py → get_job_work_stages()
   */
  async getJobWorkStages() {
    const response = await fetchWithAuth("/jobs/work-stages");
    return handleApiResponse(response);
  },

  // ============================================
  // LEGACY ASSIGNMENTS ENDPOINTS (backward compatibility)
  // Now mapped to /tasks endpoints
  // ============================================
  async getAssignments() {
    return this.getTasks();
  },

  async createAssignment(assignmentData: any) {
    return this.createTask(assignmentData);
  },

  async updateAssignment(assignmentId: string, assignmentData: any) {
    return this.updateTask(assignmentId, assignmentData);
  },

  async deleteAssignment(assignmentId: string) {
    return this.deleteTask(assignmentId);
  },

  // ============================================
  // ACTION ITEMS ENDPOINTS (action_items_routes.py)
  // ============================================
  async getActionItems() {
    const response = await fetchWithAuth("/action-items");
    return handleApiResponse(response);
  },
 
  async createActionItem(data: {
    client_id: string;
    stage?: string;
    priority?: string;
    notes?: string;
  }) {
    const response = await fetchWithAuth("/action-items", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return handleApiResponse(response);
  },

  async completeActionItem(actionId: string, notes?: string) {
    const response = await fetchWithAuth(`/action-items/${actionId}/complete`, {
      method: "PATCH",
      body: JSON.stringify({ notes: notes || '' }),
    });
    return handleApiResponse(response);
  },
 
  async updateActionItem(actionId: string, data: {
    priority?: string;
    notes?: string;
    stage?: string;
  }) {
    const response = await fetchWithAuth(`/action-items/${actionId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return handleApiResponse(response);
  },
 
  async deleteActionItem(actionId: string) {
    const response = await fetchWithAuth(`/action-items/${actionId}`, {
      method: "DELETE",
    });
    return handleApiResponse(response);
  },

  // ============================================
  // PRICELIST ENDPOINTS
  // ============================================
  async getPricelist(filters?: { category?: string; search?: string }) {
    const params = new URLSearchParams();
    if (filters?.category && filters.category !== 'all') {
      params.append("category", filters.category);
    }
    if (filters?.search) {
      params.append("search", filters.search);
    }
    
    const queryString = params.toString() ? `?${params.toString()}` : "";
    const response = await fetchWithAuth(`/pricelist${queryString}`);
    return handleApiResponse(response);
  },
 
  async getPricelistCategories() {
    return deduplicateRequest("getPricelistCategories", async () => {
      const response = await fetchWithAuth("/pricelist/categories");
      return handleApiResponse(response);
    });
  },
 
  async createPricelistItem(itemData: {
    category: string;
    item_name: string;
    description?: string;
    base_price: number;
    unit?: string;
    dimension_based?: boolean;
    dimension_formula?: string;
  }) {
    const response = await fetchWithAuth("/pricelist", {
      method: "POST",
      body: JSON.stringify(itemData),
    });
    return handleApiResponse(response);
  },
 
  async updatePricelistItem(pricelistId: number, itemData: any) {
    const response = await fetchWithAuth(`/pricelist/${pricelistId}`, {
      method: "PUT",
      body: JSON.stringify(itemData),
    });
    return handleApiResponse(response);
  },
 
  async deletePricelistItem(pricelistId: number) {
    const response = await fetchWithAuth(`/pricelist/${pricelistId}`, {
      method: "DELETE",
    });
    return handleApiResponse(response);
  },
 
  async searchPricelist(searchData: {
    search_term: string;
    category?: string;
    dimensions?: Record<string, number>;
  }) {
    const response = await fetchWithAuth("/pricelist/search", {
      method: "POST",
      body: JSON.stringify(searchData),
    });
    return handleApiResponse(response);
  },
 
  async bulkUploadPricelist(file: File, category: string) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);
 
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No auth token found");
      redirectToLogin();
      throw new Error("Not authenticated");
    }
 
    const url = `${API_ROOT}/pricelist/bulk-upload`;
    
    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            // Don't set Content-Type - browser will set it with boundary for FormData
          },
          body: formData,
        },
        60000 // 60s timeout for file upload
      );
 
      if (response.status === 401) {
        console.warn("⚠️ Got 401 - token expired or invalid");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        redirectToLogin();
        throw new Error("Authentication expired");
      }
 
      return handleApiResponse(response);
    } catch (error: any) {
      if (error.name === "AbortError" || error.message.includes("timeout")) {
        throw new Error(
          "Upload timeout - the file is taking too long to process. Please try again."
        );
      }
      throw error;
    }
  },
 
  async exportPricelist(category?: string) {
    const params = new URLSearchParams();
    if (category && category !== 'all') {
      params.append("category", category);
    }
    
    const queryString = params.toString() ? `?${params.toString()}` : "";
    const token = localStorage.getItem("token");
    
    if (!token) {
      console.error("No auth token found");
      redirectToLogin();
      throw new Error("Not authenticated");
    }
 
    const url = `${API_ROOT}/pricelist/export${queryString}`;
    
    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      30000
    );
 
    if (!response.ok) {
      throw new Error("Failed to export pricelist");
    }
 
    // Return blob for file download
    return response.blob();
  },
};