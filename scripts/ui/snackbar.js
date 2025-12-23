/**
 * Snackbar utility for showing temporary notifications
 */

/**
 * Show a temporary notification message
 * @param {string} text - Message to display
 * @param {number} timeout - Duration in milliseconds
 */
export function showSnackbar(text, timeout = 1400) {
  const bar = document.getElementById('copied');
  if (!bar) return;
  bar.textContent = text;
  bar.classList.add('show');
  clearTimeout(bar._hideTimer);
  bar._hideTimer = setTimeout(() => bar.classList.remove('show'), timeout);
}