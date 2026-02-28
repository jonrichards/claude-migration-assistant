function installFallbacks() {
  function escapeHtml(input = '') {
    return String(input)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  if (typeof window.marked === 'undefined') {
    window.marked = {
      parse(input = '') {
        const doc = new DOMParser().parseFromString(String(input), 'text/html');
        return escapeHtml(doc.body.textContent || '');
      }
    };
  }

  if (typeof window.DOMPurify === 'undefined') {
    window.DOMPurify = {
      sanitize(input = '') {
        return escapeHtml(input);
      }
    };
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installFallbacks, { once: true });
} else {
  installFallbacks();
}
