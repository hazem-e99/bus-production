import { API_CONFIG } from './env';

// API Configuration
export const getApiConfig = () => {
  return {
    BASE_URL: API_CONFIG.GLOBAL_BASE_URL,
    AUTH: API_CONFIG.AUTH,
    buildUrl: (endpoint: string) => {
      // Enforce global backend only
      if (endpoint.startsWith('/api') || endpoint.startsWith('./') || endpoint.startsWith('http://localhost') || endpoint.startsWith('https://localhost')) {
        throw new Error('Local or relative API endpoints are not allowed. Use global backend endpoints only.');
      }
      // For global endpoints, prepend the base URL
      return `${API_CONFIG.GLOBAL_BASE_URL}${endpoint}`;
    },
  };
};

// Export the configuration directly
export const API_CONFIG_INSTANCE = getApiConfig();

// Re-export the constants for backward compatibility
export { API_CONFIG } from './env';
