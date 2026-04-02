const API_BASE_URL = "http://localhost:5149/api";

export async function fetchFromApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("cira_tech_token");
  
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("cira_tech_token");
      localStorage.removeItem("cira_tech_user");
      if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
        window.location.href = "/login";
      }
    }
    const errorText = await response.text();
    throw new Error(errorText || "API Request failed");
  }

  // Handle empty responses
  if (response.status === 204) return {} as T;

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => fetchFromApi<T>(endpoint, { method: "GET" }),
  post: <T>(endpoint: string, body: any) => fetchFromApi<T>(endpoint, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body: any) => fetchFromApi<T>(endpoint, { method: "PATCH", body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body: any) => fetchFromApi<T>(endpoint, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => fetchFromApi<T>(endpoint, { method: "DELETE" }),
};
