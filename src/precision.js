// Speedly precision helpers. Bandwidth readings are derived ONLY from actual
// Cloudflare completed transfers (bps and duration in milliseconds).
const valid = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const i = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[i] : (sorted[i - 1] + sorted[i]) / 2;
}

export function estimateBandwidth(points, sustainedMs = 100) {
  const samples = (Array.isArray(points) ? points : []).filter(
    (p) => valid(p?.bps) && p.bps > 0 && valid(p?.duration) && p.duration >= 40
  );
  // Discard very short transfers whenever sustained transfers exist.
  const sustained = samples.filter((p) => p.duration >= sustainedMs);
  const chosen = sustained.length ? sustained : samples;
  const reading = median(chosen.map((p) => p.bps));
  const low = chosen.length ? Math.min(...chosen.map((p) => p.bps)) : null;
  const high = chosen.length ? Math.max(...chosen.map((p) => p.bps)) : null;
  const spreadPct = chosen.length >= 2 && reading > 0 ? ((high - low) / reading) * 100 : null;
  const evidence = !chosen.length ? 'Unavailable'
    : !sustained.length ? 'Short samples only'
    : chosen.length < 3 ? 'Limited samples'
    : spreadPct <= 15 ? 'Consistent samples'
    : spreadPct <= 35 ? 'Variable samples' : 'Highly variable samples';
  return {
    bps: reading, count: chosen.length,
    sustainedCount: sustained.length, spreadPct,
    evidence, provisional: !sustained.length && chosen.length > 0,
  };
}

// Keep numeric precision in state/history. Round ONLY for presentation.
export function toMbps(bps) {
  return valid(bps) ? bps / 1e6 : null;
}

export function formatSpeed(bps) {
  const value = toMbps(bps);
  if (value == null) return '—';
  return value.toFixed(value > 0 && value < 1 ? 3 : 2);
}

export function formatLatency(value) {
  if (!valid(value)) return '—';
  return value.toFixed(value > 0 && value < 1 ? 2 : 1);
}

export function precisionText(record, direction) {
  const count = record?.[direction === 'download' ? 'downValidSamples' : 'upValidSamples'];
  const evidence = record?.[direction === 'download' ? 'downEvidence' : 'upEvidence'];
  const spread = record?.[direction === 'download' ? 'downVariation' : 'upVariation'];
  if (!Number.isInteger(count)) return 'Previous result · sample quality unavailable';
  if (!count) return 'No reliable speed samples';
  const pct = valid(spread) ? ` · observed range ${spread.toFixed(1)}%` : '';
  return `${count} measured transfer${count === 1 ? '' : 's'} · ${evidence}${pct}`;
}
