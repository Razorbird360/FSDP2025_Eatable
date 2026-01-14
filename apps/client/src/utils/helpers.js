/**
 * Format price in cents to SGD
 * @param {number} cents - Price in cents
 * @returns {string} Formatted price (e.g., "$5.50")
 */
export const formatPrice = (cents) => {
  const dollars = cents / 100;
  return `$${dollars.toFixed(2)}`;
};

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @param {string} [timeZone] - Optional IANA timezone (e.g., "Asia/Singapore")
 * @returns {string} Formatted date (e.g., "12 Jan 2024")
 */
export const formatDate = (date, timeZone) => {
  const options = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };

  if (timeZone) {
    options.timeZone = timeZone;
  }

  return new Date(date).toLocaleDateString('en-SG', options);
};

/**
 * Format datetime to readable string
 * @param {string|Date} date - Datetime to format
 * @param {string} [timeZone] - Optional IANA timezone (e.g., "Asia/Singapore")
 * @returns {string} Formatted datetime (e.g., "12 Jan 2024, 3:45 PM")
 */
export const formatDateTime = (date, timeZone) => {
  const options = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  if (timeZone) {
    options.timeZone = timeZone;
  }

  return new Date(date).toLocaleDateString('en-SG', options);
};

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text with ellipsis
 */
export const truncateText = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Format a date to relative time (e.g., "2 min ago", "1h ago")
 * @param {string|Date} date - Date to format
 * @returns {string} Relative time string
 */
export const formatTimeAgo = (date) => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};
