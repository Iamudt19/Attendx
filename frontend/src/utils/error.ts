/**
 * Safely extracts a human-readable string error from any error response.
 * Completely eliminates React Minified Error #31 caused by rendering raw Pydantic/FastAPI validation objects.
 */
export function extractErrorMessage(err: any, fallback = 'An unexpected error occurred. Please try again.'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;

  // Handle Axios / Fetch response error payload
  const data = err.response?.data;
  if (data) {
    if (typeof data === 'string') return data;
    
    // Check detail property (standard FastAPI)
    const detail = data.detail;
    if (typeof detail === 'string') return detail;
    
    // Check Pydantic validation array: [{ type: "...", loc: [...], msg: "..." }]
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object' && item !== null) {
            const loc = Array.isArray(item.loc) ? item.loc.filter((l: any) => l !== 'body').join('.') : '';
            const msg = item.msg || item.message || '';
            return loc ? `${loc}: ${msg}` : msg;
          }
          return String(item);
        })
        .filter(Boolean);
      if (messages.length > 0) return messages.join(' | ');
    }

    if (typeof detail === 'object' && detail !== null) {
      return detail.msg || detail.message || JSON.stringify(detail);
    }

    if (data.message && typeof data.message === 'string') return data.message;
  }

  if (err.message && typeof err.message === 'string') {
    return err.message;
  }

  return fallback;
}
