const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assess } = require('../audit.js');
const { compareWithBaseline, suggestShortestPath } = require('../what-if.js');
const profiles = require('../profiles.js');
const firmware = require('../firmware-data.js');

function apply(config, changes) {
  const draft = structuredClone(config);
  for (const change of changes) {
    assert.equal(change.pending, false);
    if (change.field === 'firmwareScenario') {
      draft.firmware = firmware[config.id || 'A'][change.value];
    } else if (change.field === 'guest.isolateLan') {
      draft.guest.isolateLan = change.value;
    } else draft[change.field] = change.value;
  }
  return draft;
}

test('so baseline A ghi nhận +2 và đúng C2/C4 đổi trạng thái', () => {
  const draft = structuredClone(profiles.A);
  draft.wps = false;
  draft.guest.isolateLan = true;
  const comparison = compareWithBaseline(profiles.A, draft);
  assert.equal(comparison.passedDelta, 2);
  assert.equal(comparison.applicableDelta, 0);
  assert.equal(comparison.denominatorNote, '');
  assert.match(comparison.summary, /\+2 so với hồ sơ gốc/);
  assert.deepEqual(comparison.changes.map(c => [c.id, c.from, c.to]), [['C2', 'improve', 'pass'], ['C4', 'improve', 'pass']]);
});

test('giảm điểm so baseline B được thể hiện bằng số âm', () => {
  const result = compareWithBaseline(profiles.B, { ...profiles.B, pmf: 'disabled' });
  assert.equal(result.passedDelta, -1);
  assert.match(result.summary, /-1 so với hồ sơ gốc/);
  assert.deepEqual(result.changes.map(c => c.id), ['C3']);
});

test('mẫu số thay đổi được nêu riêng, không coi là tăng số tiêu chí đạt', () => {
  const draft = { ...profiles.A, guest: { enabled: false, isolateLan: false } };
  const comparison = compareWithBaseline(profiles.A, draft);
  assert.equal(comparison.passedDelta, 0);
  assert.equal(comparison.applicableDelta, -1);
  assert.deepEqual(comparison.current, { passed: 1, applicable: 5 });
  assert.match(comparison.denominatorNote, /từ 6 thành 5/);
  assert.equal(comparison.changes[0].to, 'na');
});

test('thay dữ liệu nhưng giữ trạng thái không tạo chuyển trạng thái giả', () => {
  const before = { ...profiles.B, remoteAdmin: true, remoteAdminStrongAuth: false };
  const after = { ...before, remoteAdminStrongAuth: true };
  assert.deepEqual(compareWithBaseline(before, after).changes, []);
  assert.deepEqual(compareWithBaseline(null, null).changes, []);
});

test('A có đúng 5 thay đổi cần thiết; bỏ bất kỳ thay đổi nào đều chưa đạt tối đa', () => {
  const changes = suggestShortestPath(profiles.A);
  assert.deepEqual(changes.map(c => c.field), ['mode', 'wps', 'pmf', 'guest.isolateLan', 'firmwareScenario']);
  const target = assess(apply(profiles.A, changes));
  assert.equal(target.passed, 6);
  assert.equal(target.applicable, 6);
  for (let index = 0; index < changes.length; index++) {
    const incomplete = assess(apply(profiles.A, changes.filter((_, i) => i !== index)));
    assert.ok(incomplete.passed < incomplete.applicable);
  }
});

test('B đã tối đa nên đường gợi ý rỗng', () => {
  assert.deepEqual(suggestShortestPath(profiles.B), []);
});

test('C giữ mạng khách tắt và chỉ cần 3 thay đổi để đạt 5/5', () => {
  const changes = suggestShortestPath(profiles.C);
  assert.equal(changes.length, 3);
  assert.equal(changes.some(change => change.id === 'C4'), false);
  const target = apply(profiles.C, changes);
  assert.equal(target.guest.enabled, false);
  assert.equal(assess(target).passed, 5);
  assert.equal(assess(target).applicable, 5);
});

test('mạng khách chưa rõ cần xác minh trước, không gợi ý khai báo tắt để giảm mẫu số', () => {
  for (const guest of [null, {}, { enabled: null, isolateLan: true }]) {
    const changes = suggestShortestPath({ guest });
    const pending = changes.find(c => c.id === 'C4');
    assert.equal(pending.pending, true);
    assert.equal(pending.field, 'guest.enabled');
    assert.equal(pending.value, null);
    assert.match(pending.message, /Xác minh/);
  }
});

test('đường gợi ý đạt tối đa cho các lựa chọn biểu mẫu khi trạng thái mạng khách đã rõ', () => {
  for (const mode of ['wpa3-personal', 'wpa2-wpa3-transition', 'wpa2-personal-aes', null])
    for (const wps of [true, false, null])
      for (const pmf of ['required', 'optional', 'disabled', null])
        for (const guest of [{ enabled: true, isolateLan: true }, { enabled: true, isolateLan: false },
          { enabled: true, isolateLan: null }, { enabled: false, isolateLan: null }])
          for (const remoteAdmin of [true, false, null])
            for (const record of Object.values(firmware.A)) {
              const config = { mode, wps, pmf, guest, remoteAdmin, firmware: record };
              const target = assess(apply(config, suggestShortestPath(config)));
              assert.equal(target.passed, target.applicable);
            }
});

test('what-if không sửa hồ sơ và dữ liệu firmware gốc', () => {
  const before = JSON.stringify(profiles);
  compareWithBaseline(profiles.A, profiles.B);
  suggestShortestPath(profiles.A);
  assert.equal(JSON.stringify(profiles), before);
});
