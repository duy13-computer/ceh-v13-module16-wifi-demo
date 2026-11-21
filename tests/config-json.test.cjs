const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateConfigFile, parseConfig, createConfigFile, MAX_FILE_BYTES } = require('../config-json.js');
const profiles = require('../profiles.js');
const { assess } = require('../audit.js');
const firmware = require('../firmware-data.js');

function configOf(profile) {
  const { mode, wps, pmf, guest, remoteAdmin, remoteAdminStrongAuth, firmwareScenario } = profile;
  return { mode, wps, pmf, guest, remoteAdmin, remoteAdminStrongAuth, firmwareScenario };
}
function sample() { return { schemaVersion: 1, profileId: 'A', config: configOf(profiles.A) }; }

test('JSON hợp lệ round-trip A/B/C giữ nguyên cấu hình và điểm mặc định', () => {
  for (const profile of Object.values(profiles)) {
    const { json, filename } = createConfigFile(profile.id, configOf(profile));
    const parsed = parseConfig(json);
    assert.deepEqual(parsed, { schemaVersion: 1, profileId: profile.id, config: configOf(profile) });
    assert.equal(filename, 'cau-hinh-wifi-' + profile.id + '.json');
    const { firmwareScenario, ...config } = parsed.config;
    assert.equal(assess({ ...config, firmware: firmware[profile.id][firmwareScenario] }).passed, assess(profile).passed);
  }
});

test('JSON hợp lệ nhận null và mọi kịch bản firmware trong danh sách cho phép', () => {
  for (const firmwareScenario of ['missing', 'verified', 'outdated']) {
    const data = sample();
    data.config = { mode: null, wps: null, pmf: null, guest: { enabled: null, isolateLan: null },
      remoteAdmin: null, remoteAdminStrongAuth: null, firmwareScenario };
    assert.deepEqual(parseConfig(JSON.stringify(data)), data);
  }
});

test('từ chối tệp hỏng, nội dung thực thi và cấu trúc không phải đối tượng', () => {
  for (const text of ['', '{', 'undefined', 'globalThis.hacked = true', '{"config":}']) {
    assert.throws(() => parseConfig(text), /Tệp JSON bị hỏng hoặc sai cú pháp/);
  }
  for (const text of ['null', '[]', '1', '"text"']) assert.throws(() => parseConfig(text), /phải là một đối tượng/);
});

test('từ chối thiếu bất kỳ trường bắt buộc ở mọi cấp', () => {
  for (const path of ['schemaVersion', 'profileId', 'config', 'config.mode', 'config.wps', 'config.pmf',
    'config.guest', 'config.guest.enabled', 'config.guest.isolateLan', 'config.remoteAdmin',
    'config.remoteAdminStrongAuth', 'config.firmwareScenario']) {
    const data = structuredClone(sample());
    const parts = path.split('.');
    const key = parts.pop();
    const target = parts.reduce((value, part) => value[part], data);
    delete target[key];
    assert.throws(() => validateConfigFile(data), /thiếu trường bắt buộc/);
  }
});

test('từ chối trường lạ tại gốc, config và guest, kể cả khóa gây ô nhiễm prototype', () => {
  for (const path of ['', 'config', 'config.guest']) {
    for (const key of ['extra', '__proto__', 'constructor']) {
      const data = JSON.parse(JSON.stringify(sample()));
      const target = path ? path.split('.').reduce((value, part) => value[part], data) : data;
      Object.defineProperty(target, key, { value: { polluted: true }, enumerable: true });
      assert.throws(() => parseConfig(JSON.stringify(data)), /trường không được phép/);
    }
  }
  assert.equal({}.polluted, undefined);
});

test('từ chối giá trị lạ, sai kiểu và ép kiểu boolean hoặc phiên bản', () => {
  const cases = [
    ['schemaVersion', '1'], ['schemaVersion', 2], ['profileId', '../B'], ['profileId', 'D'],
    ['config.mode', 'wep'], ['config.mode', 1], ['config.wps', 'false'], ['config.wps', 0],
    ['config.pmf', 'on'], ['config.guest.enabled', 'true'], ['config.guest.isolateLan', []],
    ['config.remoteAdmin', {}], ['config.remoteAdminStrongAuth', 'on'], ['config.firmwareScenario', 'B-FW'],
  ];
  for (const [path, value] of cases) {
    const data = structuredClone(sample());
    const parts = path.split('.');
    const key = parts.pop();
    parts.reduce((object, part) => object[part], data)[key] = value;
    assert.throws(() => validateConfigFile(data), /kiểu hoặc giá trị không hợp lệ/);
  }
  for (const value of [null, [], false]) {
    const data = sample(); data.config = value;
    assert.throws(() => validateConfigFile(data), /phải là một đối tượng/);
  }
});

test('giới hạn kích thước và nội dung đầu vào JSON', () => {
  assert.throws(() => parseConfig(' '.repeat(MAX_FILE_BYTES + 1)), /vượt giới hạn 64 KiB/);
  assert.throws(() => parseConfig(null), /Không đọc được nội dung/);
});

test('chuẩn hóa JSON trả về bản sao, không sửa hồ sơ gốc', () => {
  const data = sample();
  const parsed = validateConfigFile(data);
  parsed.config.guest.isolateLan = true;
  assert.equal(profiles.A.guest.isolateLan, false);
  assert.equal(data.config.guest.isolateLan, false);
});
