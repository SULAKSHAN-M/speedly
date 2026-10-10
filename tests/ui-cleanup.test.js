import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toMbps, formatSpeed } from '../src/precision.js';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const report = readFileSync(new URL('../src/report.js', import.meta.url), 'utf8');

test('Mbps renders bandwidth, including history, CSV, and PDF report', () => {
  assert.equal(toMbps(150_256_789), 150.256789);
  assert.equal(formatSpeed(150_256_789), '150.26');
  assert.equal(formatSpeed(525_140), '0.525');
  assert.match(app, /unit: 'Mbps'/);
  assert.match(app, /Download Mbps','Upload Mbps/);
  assert.match(report, /BANDWIDTH SAMPLES \(Mbps\)/);
  assert.doesNotMatch(app, /MB\/s/);
  assert.doesNotMatch(report, /MB\/s/);
});

test('header does not duplicate the test banner', () => {
  assert.doesNotMatch(app, /LIVE NETWORK TESTING/);
  assert.match(app, /INTERNET PERFORMANCE TEST · LIVE/);
  assert.match(app, /hero-eyebrow--active/);
});

test('completion message is not repeated in progress caption', () => {
  assert.match(app, /\(status === 'idle' \|\| status === 'running'\) && !selectedRecord && <p className="progress-caption">/);
  assert.match(app, /const heroValue = isLiveUpload \? metrics.upload : shown.download/);
});
