const DEFAULT_API_BASE_URL = 'http://localhost:7126/api';

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const API_BASE_URL = stripTrailingSlash(
  process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL,
);

const BACKEND_ORIGIN = stripTrailingSlash(
  process.env.NEXT_PUBLIC_BACKEND_ORIGIN || API_BASE_URL.replace(/\/api$/, ''),
);

export const getApiBaseUrl = (): string => API_BASE_URL;

export const getBackendOrigin = (): string => BACKEND_ORIGIN;

export const toBackendAssetUrl = (imagePath: string | undefined): string => {
  if (!imagePath) return '';

  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  if (imagePath.startsWith('/')) {
    if (imagePath.startsWith('/uploads')) {
      return `${BACKEND_ORIGIN}${imagePath}`;
    }
    return `${API_BASE_URL}${imagePath}`;
  }

  return `${BACKEND_ORIGIN}/uploads/${imagePath}`;
};

export const toProxiedBackendAssetUrl = (imagePath: string | undefined): string => {
  const absoluteUrl = toBackendAssetUrl(imagePath);
  if (!absoluteUrl) return '';
  return `/api/image-proxy?url=${encodeURIComponent(absoluteUrl)}`;
};

export const getTrackingSocketUrl = (): string => `${BACKEND_ORIGIN}/tracking`;