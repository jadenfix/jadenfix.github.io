import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const root = resolve(import.meta.dirname, '..');
const demoDir = join(root, 'demo');
const rawDir = join(demoDir, 'raw');
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(`${command} failed (${result.status}): ${result.stderr ?? ''}`);
  }
  return result.stdout?.trim() ?? '';
};

const sha256 = async (path) =>
  createHash('sha256').update(await readFile(path)).digest('hex');

await mkdir(rawDir, { recursive: true });
run('npm', ['run', 'build']);

const sourceCommit = run('git', ['rev-parse', 'HEAD'], { capture: true });
const sourceTree = run('git', ['rev-parse', 'HEAD^{tree}'], { capture: true });
const tracked = run(
  'git',
  [
    'ls-files',
    'src',
    'public/404.html',
    'public/legacy-route.js',
    'index.html',
    'package.json',
    'package-lock.json',
    'vite.config.ts',
    'tailwind.config.js',
    'postcss.config.js',
  ],
  { capture: true },
)
  .split('\n')
  .filter(Boolean);
const sourceManifest = {
  sourceCommit,
  sourceTree,
  inputs: Object.fromEntries(
    tracked.map((path) => [
      path,
      run('git', ['rev-parse', `${sourceCommit}:${path}`], { capture: true }),
    ]),
  ),
};

await writeFile(
  join(demoDir, 'source-manifest.json'),
  `${JSON.stringify(sourceManifest, null, 2)}\n`,
);

const server = spawn('node', ['tests/e2e/static-server.mjs', 'dist', '4173'], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'inherit'],
});
await new Promise((resolveReady, reject) => {
  const timer = setTimeout(() => reject(new Error('production server did not start')), 10_000);
  server.stdout.once('data', () => {
    clearTimeout(timer);
    resolveReady();
  });
});

let browser;
try {
  browser = await chromium.launch({
    executablePath,
    args: executablePath ? ['--no-sandbox'] : [],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  let frame = 0;
  const captureFor = async (milliseconds) => {
    const frames = Math.round((milliseconds / 1000) * 6);
    for (let index = 0; index < frames; index += 1) {
      await page.screenshot({
        path: join(rawDir, `frame-${String(frame).padStart(4, '0')}.png`),
      });
      frame += 1;
      await page.waitForTimeout(1000 / 6);
    }
  };

  await page.goto('http://127.0.0.1:4173/projects');
  await page.getByRole('heading', { name: 'All Projects' }).waitFor();
  await captureFor(2200);

  const search = page.getByRole('textbox', { name: 'Search projects' });
  await search.fill('Financial C++');
  await page.getByText('Financial C++ Engine', { exact: true }).waitFor();
  await captureFor(2200);

  await search.fill('');
  await page.getByRole('button', { name: 'AI & Agents' }).click();
  await page.getByText('Roe AI Python SDK', { exact: true }).waitFor();
  await captureFor(2200);

  await page.getByRole('button', { name: 'All Projects' }).click();
  await page.getByRole('link', { name: 'About', exact: true }).click();
  await page.getByRole('heading', { name: 'About Me' }).waitFor();
  await captureFor(2200);

  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await page.getByRole('heading', { name: 'All Projects' }).waitFor();
  await captureFor(1800);

  await context.close();

  run('ffmpeg', [
    '-y',
    '-framerate', '6',
    '-i', join(rawDir, 'frame-%04d.png'),
    '-vf', 'scale=960:-2:flags=lanczos',
    '-an',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '21',
    '-g', '12',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    join(demoDir, 'portfolio-demo.mp4'),
  ]);
  run('ffmpeg', [
    '-y',
    '-i', join(demoDir, 'portfolio-demo.mp4'),
    '-vf',
    'fps=4,scale=560:-2:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=32:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle',
    '-loop', '0',
    join(demoDir, 'portfolio-demo.gif'),
  ]);
  run('ffmpeg', [
    '-y',
    '-ss', '2.0',
    '-i', join(demoDir, 'portfolio-demo.mp4'),
    '-frames:v', '1',
    join(demoDir, 'portfolio-demo-poster.png'),
  ]);

  const artifacts = {};
  for (const filename of [
    'portfolio-demo.mp4',
    'portfolio-demo.gif',
    'portfolio-demo-poster.png',
  ]) {
    artifacts[filename] = { sha256: await sha256(join(demoDir, filename)) };
  }
  const probe = JSON.parse(
    run(
      'ffprobe',
      [
        '-v', 'error',
        '-show_entries', 'format=duration:stream=codec_name,width,height,pix_fmt',
        '-of', 'json',
        join(demoDir, 'portfolio-demo.mp4'),
      ],
      { capture: true },
    ),
  );
  const receipt = {
    sourceCommit,
    sourceTree,
    capturedAt: new Date().toISOString(),
    scope: 'Actual production-build browser capture using checked-in portfolio data.',
    routeRecovery: '/projects -> /#/projects',
    interactions: [
      'opened the stale /projects deep link',
      'searched for Financial C++',
      'filtered AI & Agents',
      'navigated to About and back to Projects',
    ],
    viewport: { width: 1280, height: 720 },
    claimsExcluded: [
      'linked repositories were not exercised by this capture',
      'external project deployments were not exercised by this capture',
    ],
    probe,
    artifacts,
  };
  await writeFile(join(demoDir, 'capture.json'), `${JSON.stringify(receipt, null, 2)}\n`);
} finally {
  await browser?.close();
  server.kill('SIGTERM');
  if (!process.env.KEEP_DEMO_FRAMES) {
    for (const name of await readdir(rawDir)) {
      // Raw Playwright frames are intentionally disposable after transcoding.
      await unlink(join(rawDir, name));
    }
  }
}
