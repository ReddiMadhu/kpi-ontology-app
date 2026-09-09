// Backend Configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_VERSION = import.meta.env.VITE_API_VERSION || 'v1';

export const API_BASE_URL = `${API_URL}/api/${API_VERSION}`;

export const API_ENDPOINTS = {
  // KPI Endpoints
  kpis: {
    list: `${API_BASE_URL}/ontology/kpis`,
    getById: (id: string) => `${API_BASE_URL}/ontology/kpis/${id}`,
    create: `${API_BASE_URL}/ontology/kpis`,
    update: (id: string) => `${API_BASE_URL}/ontology/kpis/${id}`,
    delete: (id: string) => `${API_BASE_URL}/ontology/kpis/${id}`,
    search: `${API_BASE_URL}/ontology/kpis/search`,
  },
  // Taxonomy Endpoints
  taxonomy: {
    get: `${API_BASE_URL}/ontology/taxonomy`,
    sectors: `${API_BASE_URL}/ontology/sectors`,
    subdomains: `${API_BASE_URL}/ontology/subdomains`,
  },
};

// API Request Helper
export const apiCall = async (
  url: string,
  options?: RequestInit
): Promise<Response> => {
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  };

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return response;
  } catch (error) {
    console.error('API Call failed:', error);
    throw error;
  }
};
