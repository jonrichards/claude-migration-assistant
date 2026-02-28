if (typeof window.marked === 'undefined') {
  window.marked = {
    parse(input = '') {
      return String(input);
    }
  };
}

if (typeof window.DOMPurify === 'undefined') {
  window.DOMPurify = {
    sanitize(input = '') {
      const doc = new DOMParser().parseFromString(String(input), 'text/html');
      return doc.body.textContent || '';
    }
  };
}
