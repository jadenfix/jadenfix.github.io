// Markdown documents shipped with the site: notes in src/posts, paper pages in
// src/papers. Each starts with a small `key: value` frontmatter block.

export type Doc = { slug: string; title: string; date: string; summary: string; read: string; status: string; body: string };

function parse(path: string, raw: string): Doc {
  const slug = path.split('/').pop()!.replace(/\.md$/, '');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const meta: Record<string, string> = {};
  if (m) {
    for (const line of m[1].split('\n')) {
      const i = line.indexOf(':');
      if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    }
  }
  return {
    slug,
    title: meta.title ?? slug,
    date: meta.date ?? '',
    summary: meta.summary ?? '',
    read: meta.read ?? '',
    status: meta.status ?? '',
    body: (m ? m[2] : raw).trim(),
  };
}

const load = (files: Record<string, string>) =>
  Object.entries(files)
    .map(([p, r]) => parse(p, r))
    .sort((a, b) => b.date.localeCompare(a.date));

export const posts = load(import.meta.glob('./posts/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>);
export const paperDocs = load(import.meta.glob('./papers/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>);

export function formatDate(d: string) {
  if (!d) return '';
  const [y, mo, da] = d.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, da)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).toLowerCase();
}
