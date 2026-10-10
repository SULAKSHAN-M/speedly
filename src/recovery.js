// Keep the original completed measurements and add actual upload samples
// from an upload-only retry. Stored throughput stays in bits per second.
export function mergeUploadRetry(initial, retry) {
  if (!retry) return initial;
  const hasUpload = Number.isFinite(retry.upload) && retry.upload > 0;
  return {
    ...initial,
    ...(hasUpload ? {
      upload: retry.upload,
      upPoints: retry.upPoints || [],
      upValidSamples: retry.upValidSamples,
      upVariation: retry.upVariation,
      upEvidence: retry.upEvidence,
      upProvisional: retry.upProvisional,
    } : {}),
    upBytes: (initial.upBytes || 0) + (retry.upBytes || 0),
  };
}

// The secondary loaded-latency HTTP request is not required for upload speed.
// This guard serves as a regression test and keeps the intent documented.
export function safeSpeedtestOptions(measurements) {
  return {
    autoStart: false,
    measurements,
    measureDownloadLoadedLatency: true,
    measureUploadLoadedLatency: false,
    loadedLatencyThrottle: 300,
    bandwidthMinRequestDuration: 100,
    bandwidthPercentile: 0.5,
    bandwidthFinishRequestDuration: 750,
    // Disabled: Cloudflare can abort a direction after one slow request, leaving
    // upload unmeasured. Speedly already has an overall user-selectable timer.
    bandwidthAbortRequestDuration: 0,
  };
}

export function uploadRetryPlan() {
  // Roughly 6.2 MB plus measurement/network overhead. Once only.
  return [
    { type: 'upload', bytes: 100_000, count: 2 },
    { type: 'upload', bytes: 1_000_000, count: 2 },
    { type: 'upload', bytes: 4_000_000, count: 1 },
  ];
}

// Explain network errors without showing a long internal measurement URL.
// Error reports are advice, not a claim that a particular provider is at fault.
export function explainMeasurementFailure(reason, phase = '') {
  const raw = String(reason?.message || reason || 'Unknown network error');
  const lower = raw.toLowerCase();
  if (/during=upload|during%3dupload/.test(lower)) {
    return 'An optional latency probe during upload failed. Try a new test; Speedly disables this probe for new measurements.';
  }
  if (/during=download|during%3ddownload/.test(lower)) {
    return 'A latency probe during download could not connect. Check extensions, firewall or VPN settings and try Quick mode.';
  }
  if (/__up|upload|post request/.test(lower) || phase === 'upload') {
    return 'Upload requests could not complete. Check your connection and allow HTTPS POST requests to speed.cloudflare.com, then retry.';
  }
  if (/network|failed to fetch|fetch failed|connection|load failed|timeout|aborted|cors/.test(lower)) {
    return 'A connection request failed. Check whether your network or browser extension blocks speed.cloudflare.com, then try Quick mode.';
  }
  return 'The measurement stopped unexpectedly. Try Quick mode or another connection.';
}
