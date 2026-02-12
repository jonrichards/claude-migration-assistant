/**
 * Builds the output migration-package ZIP from processed data.
 */

import { formatConversationAsMarkdown, formatSummary } from './markdown-formatter.js';
import { categorizeByAge, buildConversationIndex } from './conversation-parser.js';
import { buildArtifactIndex } from './artifact-extractor.js';

export async function buildMigrationPackage(state) {
  if (!window.JSZip) {
    throw new Error('JSZip not loaded');
  }

  const zip = new JSZip();
  const root = zip.folder('migration-package');
  const { conversations, artifacts, contextDocument, memoryScript } = state.exportData;

  if (!conversations || conversations.length === 0) {
    throw new Error('No conversations to package');
  }

  // 1. Summary
  const summary = formatSummary(conversations, artifacts || [], contextDocument || '');
  root.file('summary.md', summary);

  // 2. Conversations
  const convsFolder = root.folder('conversations');
  const convIndex = buildConversationIndex(conversations);
  convsFolder.file('index.json', JSON.stringify(convIndex, null, 2));

  const { recent, archive } = categorizeByAge(conversations);

  const recentFolder = convsFolder.folder('recent');
  for (const conv of recent) {
    const md = formatConversationAsMarkdown(conv);
    const fileName = safeFileName(conv.name) + '.md';
    recentFolder.file(fileName, md);
  }

  const archiveFolder = convsFolder.folder('archive');
  for (const conv of archive) {
    const md = formatConversationAsMarkdown(conv);
    const fileName = safeFileName(conv.name) + '.md';
    archiveFolder.file(fileName, md);
  }

  // 3. Artifacts
  if (artifacts && artifacts.length > 0) {
    const artFolder = root.folder('artifacts');
    const artIndex = buildArtifactIndex(artifacts);
    artFolder.file('index.json', JSON.stringify(artIndex, null, 2));

    for (const art of artifacts) {
      artFolder.file(art.fileName, art.content);
    }
  }

  // 4. Context document
  if (contextDocument) {
    root.file('context-document.md', contextDocument);
  }

  // 5. Memory import script
  if (memoryScript) {
    root.file('memory-import-script.txt', memoryScript);
  }

  // Generate ZIP blob
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  return blob;
}

export function downloadBlob(blob, filename) {
  if (window.saveAs) {
    saveAs(blob, filename);
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function safeFileName(name) {
  return (name || 'untitled')
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60) || 'untitled';
}
