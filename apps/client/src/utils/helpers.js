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
 * @returns {string} Formatted date (e.g., "12 Jan 2024")
 */
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format datetime to readable string
 * @param {string|Date} date - Datetime to format
 * @returns {string} Formatted datetime (e.g., "12 Jan 2024, 3:45 PM")
 */
export const formatDateTime = (date) => {
  return new Date(date).toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
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
