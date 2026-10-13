import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const demoDir = join(root, 'demo');
const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, `${command} failed: ${result.stderr}`);
  return result.stdout.trim();
};
const sha256 = async (path) =>
  createHash('sha256').update(await readFile(path)).digest('hex');

const receipt = JSON.parse(await readFile(join(demoDir, 'capture.json'), 'utf8'));
const manifest = JSON.parse(await readFile(join(demoDir, 'source-manifest.json'), 'utf8'));
assert.equal(receipt.sourceCommit, manifest.sourceCommit);
assert.equal(receipt.sourceTree, manifest.sourceTree);

for (const [path, expectedBlob] of Object.entries(manifest.inputs)) {
  assert.equal(run('git', ['rev-parse', `${manifest.sourceCommit}:${path}`]), expectedBlob);
  assert.equal(run('git', ['hash-object', path]), expectedBlob, `${path} changed after capture`);
}

for (const [filename, metadata] of Object.entries(receipt.artifacts)) {
  assert.equal(await sha256(join(demoDir, filename)), metadata.sha256, `${filename} digest`);
}

const video = JSON.parse(
  run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration:stream=codec_name,width,height,pix_fmt',
    '-of', 'json',
    join(demoDir, 'portfolio-demo.mp4'),
  ]),
);
assert.equal(video.streams[0].codec_name, 'h264');
assert.equal(video.streams[0].width, 960);
assert.equal(video.streams[0].height, 540);
assert.ok(Number(video.format.duration) >= 10);
run('ffmpeg', ['-v', 'error', '-i', join(demoDir, 'portfolio-demo.mp4'), '-f', 'null', '-']);
run('ffmpeg', ['-v', 'error', '-i', join(demoDir, 'portfolio-demo.gif'), '-f', 'null', '-']);

process.stdout.write(
  `Verified source ${manifest.sourceCommit}, ${Object.keys(manifest.inputs).length} inputs, and ${Object.keys(receipt.artifacts).length} media artifacts.\n`,
);
