import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeUploadRetry, safeSpeedtestOptions, uploadRetryPlan, explainMeasurementFailure } from '../src/recovery.js';

test('optional during-upload latency probe is disabled for main and retry tests', () => {
  assert.equal(safeSpeedtestOptions([{type:'upload',bytes:100_000,count:1}]).measureUploadLoadedLatency,false);
  assert.deepEqual(uploadRetryPlan().map(v=>v.type),['upload','upload','upload']);
});

test('successful upload-only retry preserves initial download/latency while adding measured upload', () => {
  const initial={download:150e6,upload:null,ping:21,loadedPing:60,upBytes:500_000,upPoints:[],downPoints:[150]};
  const retry={upload:32e6,upBytes:2_000_000,upPoints:[4],upValidSamples:3,upEvidence:'Variable samples',upVariation:10,upProvisional:false};
  const result=mergeUploadRetry(initial,retry);
  assert.equal(result.download,150e6);
  assert.equal(result.ping,21);
  assert.equal(result.upload,32e6);
  assert.equal(result.upBytes,2_500_000);
  assert.deepEqual(result.upPoints,[4]);
});

test('failed upload retry cannot invent an upload result',()=>{
  const initial={download:80e6,upload:null,ping:15,upBytes:0,upPoints:[]};
  const result=mergeUploadRetry(initial,{upload:null,upBytes:40_000,upPoints:[]});
  assert.equal(result.upload,null);
  assert.equal(result.download,80e6);
  assert.equal(result.upBytes,40_000);
});

test('slow requests do not trigger a second hard stop before overall timer', () => {
  const opts=safeSpeedtestOptions([{type:'upload',bytes:100_000,count:1}]);
  assert.equal(opts.bandwidthAbortRequestDuration, 0);
  assert.equal(opts.autoStart, false);
  assert.equal(opts.measureDownloadLoadedLatency, true);
  assert.equal(opts.measureUploadLoadedLatency, false);
});

test('upload request errors have actionable explanations without leaking internal URLs', () => {
  const cause='Connection failed to https://speed.cloudflare.com/__up?bytes=200000';
  const message=explainMeasurementFailure(cause, 'upload');
  assert.match(message,/Upload requests/);
  assert.doesNotMatch(message,/__up/);
  assert.doesNotMatch(message,/https:/);
});

test('optional probe failures are explained separately from bandwidth',()=>{
  const msg=explainMeasurementFailure('Connection failed to https://speed.cloudflare.com/__down?during=upload&bytes=0');
  assert.match(msg,/optional latency probe/);
  assert.doesNotMatch(msg,/__down/);
});
