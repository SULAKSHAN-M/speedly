import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeQuality, bufferbloat, buildMeasurements, plannedBytes, measurementCount, deviceSummary, parseImportedHistory } from '../src/diagnostics.js';

test('no speed samples means no invented quality score', () => {
  const result=analyzeQuality({download:null,upload:null,ping:null,downPoints:[],upPoints:[]});
  assert.equal(result.score,null);
  assert.equal(result.grade,'—');
  assert.equal(result.applications.find(a=>a.key==='gaming').score,null);
});
test('high performing connection grades higher than poor connection', () => {
  const high=analyzeQuality({download:150e6,upload:45e6,ping:15,jitter:2,loadedPing:19,uploadLoadedPing:23,downPoints:[80,92,90,95,93,91,92],upPoints:[30,40,42,44]});
  const low=analyzeQuality({download:1e6,upload:0.1e6,ping:170,jitter:38,loadedPing:320,uploadLoadedPing:420,downPoints:[.2,1,.5,1.1],upPoints:[.01,.1]});
  assert.ok(high.score>low.score);assert.ok(high.applications.find(a=>a.key==='gaming').score>low.applications.find(a=>a.key==='gaming').score);
});
test('bufferbloat returns delta and requires actual loaded reading', () => {
  assert.equal(bufferbloat({ping:20,loadedPing:65,uploadLoadedPing:75}).delta,55);
  assert.equal(bufferbloat({ping:20}).grade,'—');
});
test('all test profiles respect planned byte quota and run download then upload', () => {
  for (const budget of [25,50,100,250,500]) for (const mode of ['quick','standard','extended']) {
    const m=buildMeasurements(mode,budget);
    assert.ok(plannedBytes(m)<=budget*1e6);
    assert.ok(measurementCount(m)>0);
    assert.ok(m.some(x=>x.type==='upload'));
    assert.ok(m.some(x=>x.type==='download'));
    assert.equal(m[0].type,'latency');
    assert.equal(m[1].type,'download');
    const uploadAt = m.findIndex(x=>x.type==='upload');
    assert.ok(uploadAt > 1);
    assert.ok(m.slice(1,uploadAt).every(x=>x.type==='download'));
    assert.ok(m.slice(uploadAt).every(x=>x.type==='upload'));
  }
});
test('import rejects malformed records and sanitizes nested history', () => {
  assert.throws(()=>parseImportedHistory({hello:'invalid'}));
  assert.throws(()=>parseImportedHistory([{timestamp:'invalid'}]));
  const parsed=parseImportedHistory([{timestamp:'2026-10-10T10:00:00Z',download:25e6,downPoints:[10,15,20],extra:'ignore',deviceLabel:'Phone'}]);
  assert.equal(parsed[0].download,25e6); assert.equal(parsed[0].extra,undefined); assert.equal(parsed[0].deviceLabel,'Phone');
});
test('device comparisons group by label AND connection',()=>{
  const summary=deviceSummary([
    {deviceLabel:'Phone',networkType:'Wi-Fi',download:30e6,upload:15e6,ping:20},
    {deviceLabel:'Phone',networkType:'Wi-Fi',download:60e6,upload:25e6,ping:30},
    {deviceLabel:'Phone',networkType:'Mobile data',download:40e6,upload:10e6,ping:40},
  ]);
  assert.equal(summary.length,2);
  assert.equal(summary.find(x=>x.network==='Wi-Fi').down,45);
});

test('v4.2 standard profile uses longer real transfers for high bandwidth', () => {
  const standard = buildMeasurements('standard', 100);
  assert.ok(standard.some(step => step.bytes >= 10_000_000));
  assert.ok(plannedBytes(standard) < 100e6, 'default Standard respects the 100MB budget');
  assert.equal(standard.at(1).type, 'download');
  assert.equal(standard.at(-1).type, 'upload');
  const quick = buildMeasurements('quick', 25);
  assert.ok(plannedBytes(quick) < plannedBytes(standard));
  assert.ok(quick.some(step => step.type === 'upload' && step.bytes >= 1_000_000));
});
