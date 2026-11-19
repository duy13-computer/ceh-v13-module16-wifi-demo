const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assess } = require('../audit.js');
const profiles = require('../profiles.js');

test('hồ sơ A, B, C giữ nguyên kết quả của báo cáo', () => {
  const expected = {
    A: [1, 6, ['improve', 'improve', 'improve', 'improve', 'pass', 'unknown']],
    B: [6, 6, ['pass', 'pass', 'pass', 'pass', 'pass', 'pass']],
    C: [2, 5, ['improve', 'pass', 'improve', 'na', 'pass', 'unknown']],
  };
  for (const [id, profile] of Object.entries(profiles)) {
    const { passed, applicable, results } = assess(profile);
    assert.deepEqual([passed, applicable, results.map((row) => row.status)], expected[id]);
  }
});

test('chỉ mạng khách được xác nhận đã tắt mới được loại khỏi mẫu số', () => {
  for (const guest of [null, { enabled: null, isolateLan: true }, { enabled: true, isolateLan: null }]) {
    const assessed = assess({ guest });
    assert.equal(assessed.applicable, 6);
    assert.equal(assessed.results[3].status, 'unknown');
  }
});

test('đánh giá trạng thái firmware theo bằng chứng, kể cả dữ liệu mâu thuẫn', () => {
  const record = profiles.B.firmware;
  function status(overrides) {
    return assess({ firmware: { ...record, ...overrides } }).results[5].status;
  }
  assert.equal(status({ model: ' ' }), 'unknown');
  assert.equal(status({ catalogVersion: 'MẪU-04' }), 'unknown');
  assert.equal(status({ maintenanceStatus: 'update-available' }), 'unknown');
  assert.equal(status({ catalogVersion: 'MẪU-04', maintenanceStatus: 'update-available' }), 'improve');
  assert.equal(status({ supportStatus: 'unsupported', maintenanceStatus: null }), 'improve');
});

test('bản sao mô phỏng có thể chỉnh mà hồ sơ mẫu vẫn nguyên vẹn', () => {
  const draft = structuredClone(profiles.A);
  draft.guest.isolateLan = true;
  draft.wps = false;
  assert.equal(assess(draft).passed, 3);
  assert.equal(assess(profiles.A).passed, 1);
});
