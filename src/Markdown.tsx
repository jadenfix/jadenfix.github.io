import { Fragment, Suspense, type ComponentType, type ReactNode } from 'react';
import { DemoNote } from './ui';

// Renders the Markdown subset the notes and paper pages use: headings,
// paragraphs, emphasis, code, links, lists, quotes, tables and images. No HTML
// passes through. A line `::demo[folder/Name]` places a live demo from
// src/demos, framed like every other demo on the site; optional `how:` and
// `reveals:` lines right after it become its demo note. A name that isn't in
// `demos` renders nothing.

function inline(text: string, key = 0): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let k = key;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith('**')) out.push(<strong key={k++} className="font-medium text-bone">{t.slice(2, -2)}</strong>);
    else if (t.startsWith('`')) out.push(<code key={k++} className="bg-panel px-1 py-px text-[0.92em] text-phos">{t.slice(1, -1)}</code>);
    else if (t.startsWith('[')) {
      const [, label, href] = t.match(/\[([^\]]+)\]\(([^)]+)\)/)!;
      const ext = /^https?:/.test(href) || /\.pdf$/.test(href);
      out.push(
        <a key={k++} href={href} className="link-u text-bone" {...(ext ? { target: '_blank', rel: 'noreferrer' } : {})}>
          {label}
        </a>,
      );
    } else out.push(<em key={k++} className="font-serif text-[1.12em] italic text-bone">{t.slice(1, -1)}</em>);
    last = m.index! + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source, compact = false, demos }: { source: string; compact?: boolean; demos?: Record<string, ComponentType> }) {
  const blocks: ReactNode[] = [];
  const lines = source.replace(/\r/g, '').split('\n');
  const p = compact ? 'text-[14px] leading-[1.9] text-dim' : 'text-[14.5px] leading-[1.95] text-dim';
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith('```')) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]);
      i++;
      blocks.push(
        <pre key={k++} className="overflow-x-auto border border-line bg-panel px-4 py-3 text-[12.5px] leading-[1.75] text-bone">
          {buf.join('\n')}
        </pre>,
      );
      continue;
    }
    const dm = line.match(/^::demo\[([^\]]+)\]\s*$/);
    if (dm) {
      i++;
      const note: Record<string, string> = {};
      while (i < lines.length) {
        const m = lines[i].match(/^(how|reveals):\s*(.+)$/);
        if (!m) break;
        note[m[1]] = m[2];
        i++;
      }
      const Comp = Object.hasOwn(demos ?? {}, dm[1]) ? demos![dm[1]] : undefined;
      if (Comp)
        blocks.push(
          <div key={k++}>
            {note.how && note.reveals && <DemoNote how={note.how} reveals={note.reveals} />}
            <div className="screen">
              <Suspense fallback={<div className="flex h-[320px] items-center justify-center text-[11px] text-faint">loading…</div>}>
                <Comp />
              </Suspense>
            </div>
          </div>,
        );
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push(<h2 key={k++} className="display pt-6 text-[30px] leading-tight">{inline(line.slice(3))}</h2>);
      i++;
      continue;
    }
    const img = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (img) {
      blocks.push(
        <figure key={k++} className="border border-line bg-black">
          <img src={img[2]} alt={img[1]} className="w-full" loading="lazy" />
        </figure>,
      );
      i++;
      continue;
    }
    if (line.startsWith('> ')) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) buf.push(lines[i++].slice(2));
      blocks.push(
        <blockquote key={k++} className="border-l border-phos/60 pl-5 font-serif text-[22px] italic leading-snug text-bone">
          {inline(buf.join(' '))}
        </blockquote>,
      );
      continue;
    }
    if (line.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        const cells = lines[i++].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        if (!cells.every((c) => /^:?-+:?$/.test(c))) rows.push(cells);
      }
      const [head, ...body] = rows;
      // numbers line up on the right, words on the left
      const num = head.map((_, c) => body.length > 0 && body.every((r) => !r[c] || /^[−\-+]?\$?[\d.,]+[%xk]?$/.test(r[c])));
      const td = (c: number) => `px-3 py-1.5 ${num[c] ? 'text-right tabular-nums' : 'text-left'}`;
      blocks.push(
        <div key={k++} className="overflow-x-auto border border-line">
          <table className="w-full border-collapse text-[12.5px] leading-[1.6]">
            <thead>
              <tr className="border-b border-line bg-panel text-faint">
                {head.map((h, c) => (
                  <th key={c} className={`font-normal ${td(c)}`}>{inline(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, j) => (
                <tr key={j} className="border-b border-line/50 text-dim last:border-0">
                  {r.map((cell, c) => (
                    <td key={c} className={`${td(c)} ${c === 0 ? 'text-bone' : ''}`}>{inline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^- /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^- /.test(lines[i])) items.push(lines[i++].slice(2));
      blocks.push(
        <ul key={k++} className={`space-y-2 ${p}`}>
          {items.map((it, j) => (
            <li key={j} className="flex gap-3">
              <span className="text-phos">·</span>
              <span>{inline(it)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(## |```|> |- |!\[|\||::)/.test(lines[i])) buf.push(lines[i++]);
    blocks.push(
      <p key={k++} className={p}>
        {buf.map((b, j) => (
          <Fragment key={j}>
            {j > 0 && ' '}
            {inline(b, j * 100)}
          </Fragment>
        ))}
      </p>,
    );
  }
  return <div className="space-y-6">{blocks}</div>;
}
