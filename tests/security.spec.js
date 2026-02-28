import { test, expect } from '@playwright/test';

test.describe('Security', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('CSP meta tag is present', async ({ page }) => {
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toContain("script-src 'self'");
    // Verify script-src doesn't allow unsafe-inline or unsafe-eval
    const scriptSrc = csp.split(';').find(d => d.trim().startsWith('script-src'));
    expect(scriptSrc).not.toContain('unsafe-inline');
    expect(scriptSrc).not.toContain('unsafe-eval');
  });

  test('CDN scripts have SRI integrity attributes', async ({ page }) => {
    const scripts = page.locator('script[src*="cdn"], script[src*="unpkg"]');
    const count = await scripts.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const script = scripts.nth(i);
      const integrity = await script.getAttribute('integrity');
      expect(integrity, `Script ${i} missing integrity attribute`).toBeTruthy();
      expect(integrity).toMatch(/^sha384-/);
      const crossorigin = await script.getAttribute('crossorigin');
      expect(crossorigin, `Script ${i} missing crossorigin attribute`).toBe('anonymous');
    }
  });

  test('DOMPurify is loaded', async ({ page }) => {
    // Wait for deferred scripts to load
    await page.waitForFunction(() => typeof DOMPurify !== 'undefined', null, { timeout: 5000 });
    const hasDOMPurify = await page.evaluate(() => typeof DOMPurify !== 'undefined');
    expect(hasDOMPurify).toBe(true);
  });

  test('markdown sanitization blocks XSS payloads', async ({ page }) => {
    // Wait for all dependencies to load
    await page.waitForFunction(() =>
      typeof DOMPurify !== 'undefined' && typeof marked !== 'undefined',
      null, { timeout: 5000 }
    );

    const payloads = [
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>',
      '<a href="javascript:alert(1)">click</a>',
      '<div onmouseover="alert(1)">hover</div>',
      '<script>alert(1)</script>',
      '<iframe src="javascript:alert(1)"></iframe>',
    ];

    for (const payload of payloads) {
      const result = await page.evaluate((p) => {
        const raw = marked.parse(p);
        return DOMPurify.sanitize(raw);
      }, payload);

      expect(result, `Payload not sanitized: ${payload}`).not.toContain('onerror');
      expect(result).not.toContain('onload');
      expect(result).not.toContain('onmouseover');
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('<script');
      expect(result).not.toContain('<iframe');
    }
  });

  test('escapeHtml escapes all dangerous characters', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { escapeHtml } = await import('./js/utils.js');
      return escapeHtml(`<script>alert("it's & dangerous")</script>`);
    });

    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).not.toContain('"');
    expect(result).not.toContain("'");
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
    expect(result).toContain('&quot;');
    expect(result).toContain('&#39;');
  });
});
