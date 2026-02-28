import { test, expect } from '@playwright/test';

test.describe('Conversation Parser', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('parseConversations handles valid array input', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { parseConversations } = await import('./js/processing/conversation-parser.js');
      return parseConversations([
        {
          uuid: 'test-1',
          name: 'Test Conversation',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T01:00:00Z',
          chat_messages: [
            { uuid: 'm1', sender: 'human', text: 'Hello', created_at: '2025-01-01T00:00:00Z' }
          ]
        }
      ]);
    });

    expect(result).toHaveLength(1);
    expect(result[0].uuid).toBe('test-1');
    expect(result[0].name).toBe('Test Conversation');
    expect(result[0].chat_messages).toHaveLength(1);
  });

  test('parseConversations throws on non-array input', async ({ page }) => {
    const error = await page.evaluate(async () => {
      const { parseConversations } = await import('./js/processing/conversation-parser.js');
      try {
        parseConversations('not an array');
        return null;
      } catch (e) {
        return e.message;
      }
    });

    expect(error).toContain('array');
  });

  test('parseConversations handles empty array', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { parseConversations } = await import('./js/processing/conversation-parser.js');
      return parseConversations([]);
    });

    expect(result).toHaveLength(0);
  });

  test('categorizeByAge splits conversations by date', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { categorizeByAge } = await import('./js/processing/conversation-parser.js');
      const now = new Date();
      const recent = new Date(now);
      recent.setDate(recent.getDate() - 30);
      const old = new Date(now);
      old.setDate(old.getDate() - 120);

      return categorizeByAge([
        { uuid: 'recent', updated_at: recent.toISOString() },
        { uuid: 'old', updated_at: old.toISOString() },
      ]);
    });

    expect(result.recent).toHaveLength(1);
    expect(result.recent[0].uuid).toBe('recent');
    expect(result.archive).toHaveLength(1);
    expect(result.archive[0].uuid).toBe('old');
  });
});

test.describe('Artifact Extractor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('extracts artifacts from tool_use content', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { extractArtifacts } = await import('./js/processing/artifact-extractor.js');
      return extractArtifacts([{
        uuid: 'conv-1',
        name: 'Test',
        chat_messages: [{
          sender: 'assistant',
          content: [
            {
              type: 'tool_use',
              name: 'artifacts',
              input: {
                id: 'art-1',
                type: 'application/vnd.ant.react',
                title: 'My Component',
                content: 'export default function App() { return <div>Hello</div>; }'
              }
            }
          ]
        }]
      }]);
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('art-1');
    expect(result[0].title).toBe('My Component');
  });

  test('returns empty array for conversations with no artifacts', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { extractArtifacts } = await import('./js/processing/artifact-extractor.js');
      return extractArtifacts([{
        uuid: 'conv-1',
        name: 'Test',
        chat_messages: [{
          sender: 'human',
          text: 'Hello world'
        }]
      }]);
    });

    expect(result).toHaveLength(0);
  });
});
