// Speedly's heuristic, NOT an ISP/Cloudflare certification or a guarantee
// that an individual game or application will perform at a given quality.
const clamp = (x, min = 0, max = 100) => Math.min(max, Math.max(min, x));
const normalized = (x) => typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : null;
export const gradeFor = (n) => n == null ? '—' : n >= 95 ? 'A+' : n >= 88 ? 'A' : n >= 80 ? 'B' : n >= 68 ? 'C' : n >= 53 ? 'D' : 'F';

export function bufferbloat(record) {
  const idle = normalized(record?.ping);
  if (idle === null) return { delta: null, grade: '—', rating: 'Not measured' };
  const loaded = [normalized(record.loadedPing), normalized(record.uploadLoadedPing)].filter((x) => x !== null);
  if (!loaded.length) return { delta: null, grade: '—', rating: 'Loaded latency unavailable' };
  // Bufferbloat proxy from HTTP loaded-vs-idle measurements, NOT a controlled waveform test.
  const delta = Math.max(0, Math.max(...loaded) - idle);
  const grade = delta <= 5 ? 'A+' : delta <= 15 ? 'A' : delta <= 30 ? 'B' : delta <= 60 ? 'C' : delta <= 120 ? 'D' : 'F';
  return { delta, grade, rating: delta <= 15 ? 'Excellent responsiveness' : delta <= 30 ? 'Good responsiveness' : delta <= 60 ? 'Noticeable delay under load' : 'Severe delay under load' };
}

function stability(record) {
  const points = (record?.downPoints || []).filter((n) => Number.isFinite(n) && n > 0);
  if (points.length < 3) return null;
  const mean = points.reduce((sum, n) => sum + n, 0) / points.length;
  const variance = points.reduce((sum, n) => sum + (n-mean)**2, 0) / points.length;
  const cv = Math.sqrt(variance) / mean;
  return { cv, score: clamp(100 - cv * 115), count: points.length };
}
const speedScore = (mbps) => clamp(100 * Math.log2(1 + mbps) / Math.log2(1 + 150));
const pingScore = (ms) => clamp(100 - Math.max(0, ms - 10) * .8);
const jitterScore = (ms) => clamp(100 - Math.max(0, ms - 2) * 4);
const bloatScore = (delta) => clamp(100 - Math.max(0, delta - 5) * 1.25);
const measure = (parts) => {
  const valid = parts.filter((p) => p.value != null);
  if (!valid.length) return null;
  const weight = valid.reduce((sum, p) => sum + p.weight, 0);
  return Math.round(valid.reduce((sum, p) => sum + p.value * p.weight, 0) / weight);
};

export function analyzeQuality(record) {
  const down = normalized(record?.download);
  const up = normalized(record?.upload);
  const ping = normalized(record?.ping);
  const jitter = normalized(record?.jitter);
  const bloat = bufferbloat(record);
  const stable = stability(record);
  const downMb = down == null ? null : down / 1e6;
  const upMb = up == null ? null : up / 1e6;
  const parts = [
    { value: downMb == null ? null : speedScore(downMb), weight: 22 },
    { value: upMb == null ? null : speedScore(upMb * 1.4), weight: 13 },
    { value: ping == null ? null : pingScore(ping), weight: 25 },
    { value: jitter == null ? null : jitterScore(jitter), weight: 15 },
    { value: bloat.delta == null ? null : bloatScore(bloat.delta), weight: 15 },
    { value: stable?.score ?? null, weight: 10 },
  ];
  // Never present a confident overall grade without the essential readings.
  const score = downMb != null && ping != null ? measure(parts) : null;
  const primaryCount = [down, up, ping, jitter, bloat.delta, stable].filter(v => v != null).length;
  const sampleCount = (record?.downPoints?.length || 0) + (record?.upPoints?.length || 0);
  const confidence = record?.partial ? 'Partial test' : record?.downProvisional || record?.upProvisional ? 'Short transfer evidence' : primaryCount < 4 || sampleCount < 4 ? 'Low evidence'
    : sampleCount >= 10 && primaryCount === 6 ? 'Higher sample coverage' : 'Moderate evidence';

  const applications = [
    { key: 'gaming', name: 'Gaming', score: ping != null ? measure([
      { value: pingScore(ping), weight: 40 }, { value: jitter == null ? null : jitterScore(jitter), weight: 25 },
      { value: bloat.delta == null ? null : bloatScore(bloat.delta), weight: 25 },
      { value: downMb == null ? null : speedScore(downMb * 4), weight: 10 },
    ]) : null, important: 'Low ping, jitter and loaded latency' },
    { key: 'streaming', name: 'Streaming', score: downMb != null ? measure([
      { value: speedScore(downMb * 2), weight: 72 },
      { value: stable?.score ?? null, weight: 18 },
      { value: bloat.delta == null ? null : bloatScore(bloat.delta), weight: 10 },
    ]) : null, important: 'Download speed and consistency' },
    { key: 'calls', name: 'Video calls', score: upMb != null && ping != null ? measure([
      { value: speedScore(upMb * 5), weight: 29 },
      { value: downMb == null ? null : speedScore(downMb * 3), weight: 15 },
      { value: pingScore(ping), weight: 23 },
      { value: jitter == null ? null : jitterScore(jitter), weight: 21 },
      { value: bloat.delta == null ? null : bloatScore(bloat.delta), weight: 12 },
    ]) : null, important: 'Upload, latency and jitter' },
    { key: 'browsing', name: 'Browsing', score: downMb != null && ping != null ? measure([
      { value: speedScore(downMb * 5), weight: 55 },
      { value: pingScore(ping), weight: 35 },
      { value: bloat.delta == null ? null : bloatScore(bloat.delta), weight: 10 },
    ]) : null, important: 'Response time and download speed' },
  ].map((app) => ({ ...app, grade: gradeFor(app.score), label: app.score == null ? 'Insufficient data' : app.score >= 85 ? 'Excellent' : app.score >= 70 ? 'Good' : app.score >= 55 ? 'Fair' : 'Poor' }));
  return { score, grade: gradeFor(score), confidence, primaryCount, sampleCount, bufferbloat: bloat, stable, applications };
}

// Higher transfer sizes yield more reliable samples on fast connections.
// Low-budget or slow-network tests can stop after smaller real transfers.
// Quick favors completion; Standard and Extended favor sustained samples.
export const TEST_PROFILES = {
  quick: { label: 'Quick', description: 'Lower data usage; high-speed results may use short samples.', samples: [
    { bytes: 100_000, count: 2 }, { bytes: 1_000_000, count: 2 }, { bytes: 8_000_000, count: 1 },
  ] },
  standard: { label: 'Standard', description: 'Better sampling over longer transfers; roughly 90 MB with a 100 MB budget.', samples: [
    { bytes: 100_000, count: 2 }, { bytes: 1_000_000, count: 2 }, { bytes: 4_000_000, count: 2 },
    { bytes: 10_000_000, count: 2 }, { bytes: 14_000_000, count: 1 },
  ] },
  extended: { label: 'Extended', description: 'Highest sample coverage; best with a 250 MB budget and stable internet.', samples: [
    { bytes: 200_000, count: 3 }, { bytes: 2_000_000, count: 3 },
    { bytes: 8_000_000, count: 3 }, { bytes: 20_000_000, count: 3 },
  ] },
};

export function buildMeasurements(mode = 'standard', budgetMb = 100) {
  const profile = TEST_PROFILES[mode] || TEST_PROFILES.standard;
  const budget = Number.isFinite(Number(budgetMb)) && Number(budgetMb) > 0 ? Number(budgetMb) * 1e6 : 100e6;
  const quota = budget * .47; // per direction, reserve 6% of data budget
  const pairs = { download: [], upload: [] };
  for (const direction of ['download','upload']) {
    let used = 0;
    for (const item of profile.samples) {
      const count = Math.min(item.count, Math.max(0, Math.floor((quota - used) / item.bytes)));
      if (count > 0) {
        pairs[direction].push({ type: direction, bytes: item.bytes, count });
        used += item.bytes * count;
      }
    }
  }
  // One orderly sequence. Each test completes latency, then download, then
  // upload. The Cloudflare engine may skip later ramp steps automatically.
  return [
    { type:'latency', numPackets: mode === 'quick' ? 7 : mode === 'extended' ? 20 : 12 },
    ...pairs.download, ...pairs.upload,
  ];
}
export function plannedBytes(measurements) {
  return measurements.reduce((sum, m) => sum + (m.bytes || 0) * (m.count || 0), 0);
}
export function measurementCount(measurements) {
  return measurements.reduce((sum, m) => sum + (m.type === 'latency' ? m.numPackets : m.count), 0);
}

export function deviceSummary(history) {
  const byDevice = new Map();
  for (const record of history) {
    if (record?.download == null && record?.upload == null) continue;
    const key = `${record.deviceLabel || 'Unlabeled device'}|${record.networkType || 'Unknown network'}`;
    if (!byDevice.has(key)) byDevice.set(key, { label: record.deviceLabel || 'Unlabeled device', network: record.networkType || 'Unknown network', count: 0, downloads: [], uploads: [], pings: [], dates: [] });
    const entry = byDevice.get(key);
    entry.count += 1;
    if (normalized(record.download) != null) entry.downloads.push(record.download / 1e6);
    if (normalized(record.upload) != null) entry.uploads.push(record.upload / 1e6);
    if (normalized(record.ping) != null) entry.pings.push(record.ping);
    if (record.timestamp) entry.dates.push(record.timestamp);
  }
  const avg = (list) => list.length ? list.reduce((a,b) => a+b,0) / list.length : null;
  return [...byDevice.values()].map((r) => ({ label:r.label, network:r.network, count:r.count, down:avg(r.downloads), up:avg(r.uploads), ping:avg(r.pings), last: r.dates.sort().at(-1) || '' })).sort((a,b) => b.count-a.count);
}

export function parseImportedHistory(value, maxHistory = 100) {
  if (!Array.isArray(value)) throw new Error('Invalid backup: expected an array of test records.');
  const rows = value.slice(0,maxHistory);
  if (value.length > 2000) throw new Error('Import too large (limit 2,000 records).');
  return rows.map((r, i) => {
    if (!r || typeof r !== 'object' || !Number.isFinite(Date.parse(r.timestamp))) throw new Error(`Invalid timestamp in record ${i + 1}`);
    return {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `import-${Date.now()}-${i}`,
      timestamp: new Date(r.timestamp).toISOString(),
      ...Object.fromEntries(['download','upload','ping','loadedPing','uploadLoadedPing','jitter','downBytes','upBytes','durationMs'].map(k => [k, normalized(r[k])])),
      downPoints: Array.isArray(r.downPoints) ? r.downPoints.slice(0,300).map(normalized).filter(x=>x!=null) : [],
      upPoints: Array.isArray(r.upPoints) ? r.upPoints.slice(0,300).map(normalized).filter(x=>x!=null) : [],
      deviceLabel: String(r.deviceLabel || 'Imported device').slice(0,48),
      networkType: String(r.networkType || 'Unknown').slice(0,32),
      browser: String(r.browser || '').slice(0,48),
      devicePlatform: String(r.devicePlatform || '').slice(0,48),
      profile: ['quick','standard','extended'].includes(r.profile) ? r.profile : 'standard',
      partial: Boolean(r.partial),
      downValidSamples: Number.isInteger(r.downValidSamples) && r.downValidSamples >= 0 ? r.downValidSamples : null,
      upValidSamples: Number.isInteger(r.upValidSamples) && r.upValidSamples >= 0 ? r.upValidSamples : null,
      downEvidence: typeof r.downEvidence === 'string' ? r.downEvidence.slice(0,40) : '',
      upEvidence: typeof r.upEvidence === 'string' ? r.upEvidence.slice(0,40) : '',
      downVariation: normalized(r.downVariation), upVariation: normalized(r.upVariation),
      downProvisional: Boolean(r.downProvisional), upProvisional: Boolean(r.upProvisional),
    };
  });
}
