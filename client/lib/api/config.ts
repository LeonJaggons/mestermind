// Get API URL from environment variable or use default
const getApiBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  // In browser environment, if page is HTTPS, ensure API URL is also HTTPS
  if (typeof window !== 'undefined') {
    const isHttps = window.location.protocol === 'https:';
    if (isHttps && envUrl.startsWith('http://')) {
      // Convert HTTP to HTTPS for production
      return envUrl.replace('http://', 'https://');
    }
  }
  
  return envUrl;
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Ensures a URL uses HTTPS when the current page is loaded over HTTPS.
 * This prevents mixed content errors in production.
 */
export const ensureHttps = (url: string): string => {
  if (typeof window !== 'undefined') {
    const isHttps = window.location.protocol === 'https:';
    if (isHttps && url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    }
  }
  return url;
};
