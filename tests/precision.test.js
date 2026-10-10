import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateBandwidth,formatSpeed,formatLatency,median,precisionText} from '../src/precision.js';

test('median uses real measured bps, no optimistic max or 90th percentile',()=>{
  const result=estimateBandwidth([
    {bps:90e6,duration:240},{bps:100e6,duration:210},{bps:200e6,duration:150},
    {bps:900e6,duration:4},
  ]);
  assert.equal(result.bps,100e6);
  assert.equal(result.count,3);
  assert.equal(result.sustainedCount,3);
  assert.equal(result.provisional,false);
});
test('short requests excluded unless necessary, then show provisional evidence',()=>{
  const chosen=estimateBandwidth([{bps:40e6,duration:40},{bps:80e6,duration:50}]);
  assert.equal(chosen.bps,60e6);
  assert.equal(chosen.evidence,'Short samples only');
  assert.equal(chosen.provisional,true);
  assert.equal(estimateBandwidth([{bps:999e6,duration:9}]).bps,null);
});
test('unavailable bandwidth is not converted to zero or fabricated',()=>{
  assert.equal(estimateBandwidth([]).bps,null);
  assert.equal(estimateBandwidth([{bps:NaN,duration:200}]).bps,null);
  assert.equal(formatSpeed(null),'—');
  assert.equal(formatLatency(undefined),'—');
});
test('actual decimals are shown without altering stored numbers',()=>{
  assert.equal(formatSpeed(150_256_789),'150.26');
  assert.equal(formatSpeed(525_140),'0.525');
  assert.equal(formatSpeed(150_256_789),'150.26');
  assert.equal(formatLatency(20.356),'20.4');
  assert.equal(median([2,8,4,6]),5);
  assert.match(precisionText({downValidSamples:3,downEvidence:'Consistent samples',downVariation:8.12},'download'),/3 measured transfers/);
});

test('all displayed bandwidth values use Mbps, including defaults and small speeds',()=>{
  assert.equal(formatSpeed(8_000_000),'8.00');
  assert.equal(formatSpeed(150_256_789),'150.26');
  assert.equal(formatSpeed(525_140),'0.525');
});
