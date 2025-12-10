
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    // Use live URL from environment variable if available
    if (baseUrl) {
      this.baseUrl = baseUrl;
    } else if (process.env.NEXT_PUBLIC_API_URL) {
      // Use live API URL (e.g., https://leadgaze.vercel.app)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL.endsWith('/')
        ? process.env.NEXT_PUBLIC_API_URL.slice(0, -1)
        : process.env.NEXT_PUBLIC_API_URL;
      this.baseUrl = `${apiUrl}/api`;
    } else {
      // Fallback to relative path
      this.baseUrl = "/api";
    }
  }

  private getAuthHeaders(): Record<string, string> {
   
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      try {
        const token = localStorage.getItem("auth_token");
        if (token) {
          return { Authorization: `Bearer ${token}` };
        }
      } catch (error) {
        console.warn("Failed to get auth token from localStorage:", error);
      }
    }
    return {};
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Ensure endpoint starts with /
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;

    const authHeaders = this.getAuthHeaders();

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...options.headers,
      },
      credentials: "include",
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      let errorData: any = {};
      let errorText = "";

      try {
       
        errorText = await response.text();
        console.error("Raw API Error Response:", {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorText,
        });

       
        if (errorText) {
          try {
            errorData = JSON.parse(errorText);
            console.error("Parsed API Error Response:", errorData);
          } catch (jsonError) {
            console.error("Failed to parse error response as JSON:", jsonError);
           
            if (
              errorText.trim().startsWith("<!DOCTYPE") ||
              errorText.trim().startsWith("<html")
            ) {
              console.error(
                "Received HTML instead of JSON. This suggests a routing or server error."
              );
              console.error(
                "HTML Response preview:",
                errorText.substring(0, 500)
              );
              errorData = {
                message: `Server returned HTML instead of JSON. Status: ${response.status}`,
                isHTMLResponse: true,
                htmlPreview: errorText.substring(0, 500),
              };
            } else {
             
              errorData = { message: errorText || `HTTP ${response.status}` };
            }
          }
        } else {
          errorData = {
            message: `HTTP ${response.status}: ${response.statusText}`,
          };
        }
      } catch (readError) {
        console.error("Failed to read error response:", readError);
        errorData = {
          message: `HTTP ${response.status}: Unable to read error response`,
        };
      }

     
      const errorMessage =
        errorData.error ||
        errorData.message ||
        `HTTP error! status: ${response.status}`;
      const errorDetails = errorData.received
        ? ` Received fields: ${errorData.received.join(", ")}`
        : "";
      const validValues = errorData.validValues
        ? ` Valid values: ${errorData.validValues.join(", ")}`
        : "";
      const helpMessage = errorData.help ? ` ${errorData.help}` : "";

      throw new Error(
        `${errorMessage}${helpMessage}${errorDetails}${validValues}`
      );
    }

    return response.json();
  }

 
  async get<T>(endpoint: string): Promise<T> {
    return this.request(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request(endpoint, { method: "DELETE" });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

 
  async getLeads(params?: Record<string, string>) {
    const query = params ? `?${new URLSearchParams(params)}` : "";
    return this.request(`/leads${query}`);
  }

  async getLead(id: string) {
    return this.request(`/leads/${id}`);
  }

  async createLead(data: any) {
    return this.request("/leads", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateLead(id: string, data: any) {
    return this.request(`/leads/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteLead(id: string) {
    return this.request(`/leads/${id}`, {
      method: "DELETE",
    });
  }

 
  async getDeals(params?: Record<string, string>) {
    const query = params ? `?${new URLSearchParams(params)}` : "";
    return this.request(`/deals${query}`);
  }

  async createDeal(data: any) {
    return this.request("/deals", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateDeal(id: string, data: any) {
    return this.request(`/deals/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

 
  async getTasks(params?: Record<string, string>) {
    const query = params ? `?${new URLSearchParams(params)}` : "";
    return this.request(`/tasks${query}`);
  }

  async createTask(data: any) {
    return this.request("/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateTask(id: string, data: any) {
    return this.request(`/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

 
  async getPipelineStages() {
    return this.request("/pipeline/stages");
  }

 
  async getDashboardStats(params?: Record<string, string>) {
    const query = params ? `?${new URLSearchParams(params)}` : "";
    return this.request(`/analytics/dashboard${query}`);
  }

  async getReports(type: string, params?: Record<string, string>) {
    const query = new URLSearchParams({ type, ...params });
    return this.request(`/analytics/reports?${query}`);
  }
}

export const apiClient = new ApiClient();
export default apiClient;
