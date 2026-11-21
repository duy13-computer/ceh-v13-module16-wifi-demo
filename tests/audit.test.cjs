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
  assert.equal(status({ supportStatus: 'unsupported', maintenanceStatus: 'up-to-date' }), 'improve');
});

test('bản sao mô phỏng có thể chỉnh mà hồ sơ mẫu vẫn nguyên vẹn', () => {
  const draft = structuredClone(profiles.A);
  draft.guest.isolateLan = true;
  draft.wps = false;
  assert.equal(assess(draft).passed, 3);
  assert.equal(assess(profiles.A).passed, 1);
});


test('thiếu trạng thái cập nhật không được đạt C6 dù phiên bản khớp', () => {
  const { interpretFirmware } = require('../audit.js');
  for (const maintenanceStatus of [undefined, null, '', '   ']) {
    const record = { ...profiles.B.firmware, maintenanceStatus };
    const interpreted = interpretFirmware(record);
    assert.equal(interpreted.status, 'unknown');
    assert.equal(interpreted.label, 'Chưa xác minh');
    assert.equal(interpretFirmware({ ...record, supportStatus: 'unsupported' }).status, 'unknown');
    assert.equal(assess({ ...profiles.B, firmware: record }).passed, 5);
    assert.equal(assess({ firmware: record }).results[5].reason, interpreted.reason);
  }
});


test('từng hồ sơ dùng bản ghi firmware riêng và dữ liệu được đóng băng', () => {
  const firmware = require('../firmware-data.js');
  assert.ok(Object.isFrozen(firmware));
  for (const id of ['A', 'B', 'C']) {
    assert.ok(Object.isFrozen(firmware[id]));
    assert.equal(profiles[id].firmware, firmware[id][profiles[id].firmwareScenario]);
    assert.equal(firmware[id].missing, null);
    for (const scenario of ['verified', 'outdated']) {
      const record = firmware[id][scenario];
      assert.ok(Object.isFrozen(record));
      assert.equal(record.model, 'TB-MẪU-' + id);
      assert.equal(record.recordId, id + '-FW' + (scenario === 'outdated' ? '-CŨ' : ''));
      assert.equal(assess({ firmware: record }).results[5].status,
        scenario === 'verified' ? 'pass' : 'improve');
    }
  }
  assert.notEqual(firmware.A.verified, firmware.B.verified);
  assert.notEqual(firmware.C.verified, firmware.B.verified);
});


test('cảnh báo WPA3 khi PMF tắt, tùy chọn hoặc chưa rõ', () => {
  const { validateConsistency } = require('../audit.js');
  for (const pmf of ['disabled', 'optional', null, undefined]) {
    assert.deepEqual(validateConsistency({ mode: 'wpa3-personal', pmf }).map(w => w.id), ['wpa3-pmf']);
  }
  assert.deepEqual(validateConsistency({ mode: 'wpa3-personal', pmf: 'required' }), []);
  assert.deepEqual(validateConsistency({ mode: 'wpa2-personal-aes', pmf: 'optional' }), []);
});

test('cảnh báo WPS bật cùng các chế độ bảo mật được hỗ trợ', () => {
  const { validateConsistency, MODE_LABELS } = require('../audit.js');
  for (const mode of Object.keys(MODE_LABELS)) {
    assert.deepEqual(validateConsistency({ mode, pmf: 'required', wps: true }).map(w => w.id), ['wps-security']);
    assert.deepEqual(validateConsistency({ mode, pmf: 'required', wps: false }), []);
  }
  assert.deepEqual(validateConsistency({ wps: true }), []);
});

test('cảnh báo quản trị Internet khi thiếu xác nhận xác thực mạnh', () => {
  const { validateConsistency } = require('../audit.js');
  for (const remoteAdminStrongAuth of [false, null, undefined]) {
    assert.deepEqual(validateConsistency({ remoteAdmin: true, remoteAdminStrongAuth }).map(w => w.id), ['remote-auth']);
  }
  assert.deepEqual(validateConsistency({ remoteAdmin: true, remoteAdminStrongAuth: true }), []);
  assert.deepEqual(validateConsistency({ remoteAdmin: false }), []);
});

test('cảnh báo không thay đổi điểm và xử lý cấu hình trống', () => {
  const { validateConsistency } = require('../audit.js');
  const draft = { ...profiles.B, pmf: 'disabled', wps: true, remoteAdmin: true };
  const before = assess(draft);
  assert.equal(validateConsistency(draft).length, 3);
  assert.deepEqual(assess(draft), before);
  assert.deepEqual(validateConsistency(), []);
  assert.deepEqual(validateConsistency(null), []);
});


test('diễn giải firmware chỉ dịch trường trạng thái, giữ nguyên dữ liệu bằng chứng', () => {
  const { interpretFirmware } = require('../audit.js');
  const interpreted = interpretFirmware({ ...profiles.B.firmware,
    source: 'supported', model: 'up-to-date', maintenanceStatus: 'supported',
  });
  const details = Object.fromEntries(interpreted.details);
  assert.equal(details['Nguồn đối chiếu'], 'supported');
  assert.equal(details['Thiết bị'], 'up-to-date');
  assert.equal(details['Trạng thái cập nhật'], 'Chưa xác minh');
  assert.equal(interpreted.status, 'unknown');
});
