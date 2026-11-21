(function () {
  'use strict';

  const { MODE_LABELS, PMF_LABELS } = typeof module !== 'undefined' && module.exports
    ? require('./audit.js') : globalThis.WifiAudit;
  const firmware = typeof module !== 'undefined' && module.exports
    ? require('./firmware-data.js') : globalThis.WifiFirmware;
  const MAX_FILE_BYTES = 64 * 1024;

  function exactKeys(value, keys, location) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(location + ' phải là một đối tượng JSON.');
    }
    for (const key of Object.keys(value)) {
      if (!keys.includes(key)) throw new Error(location + ' chứa trường không được phép: ' + key + '.');
    }
    for (const key of keys) {
      if (!Object.hasOwn(value, key)) throw new Error(location + ' thiếu trường bắt buộc: ' + key + '.');
    }
  }

  function oneOf(value, allowed, location) {
    if (!allowed.includes(value)) throw new Error(location + ' có kiểu hoặc giá trị không hợp lệ.');
    return value;
  }

  function validateConfigFile(data) {
    exactKeys(data, ['schemaVersion', 'profileId', 'config'], 'Tệp');
    oneOf(data.schemaVersion, [1], 'schemaVersion');
    oneOf(data.profileId, Object.keys(firmware), 'profileId');
    const config = data.config;
    exactKeys(config, ['mode', 'wps', 'pmf', 'guest', 'remoteAdmin', 'remoteAdminStrongAuth', 'firmwareScenario'], 'config');
    exactKeys(config.guest, ['enabled', 'isolateLan'], 'config.guest');
    const boolean = (value, field) => oneOf(value, [true, false, null], 'config.' + field);
    return {
      schemaVersion: 1, profileId: data.profileId,
      config: {
        mode: oneOf(config.mode, [...Object.keys(MODE_LABELS), null], 'config.mode'),
        wps: boolean(config.wps, 'wps'),
        pmf: oneOf(config.pmf, [...Object.keys(PMF_LABELS), null], 'config.pmf'),
        guest: { enabled: boolean(config.guest.enabled, 'guest.enabled'),
          isolateLan: boolean(config.guest.isolateLan, 'guest.isolateLan') },
        remoteAdmin: boolean(config.remoteAdmin, 'remoteAdmin'),
        remoteAdminStrongAuth: boolean(config.remoteAdminStrongAuth, 'remoteAdminStrongAuth'),
        firmwareScenario: oneOf(config.firmwareScenario, Object.keys(firmware[data.profileId]), 'config.firmwareScenario'),
      },
    };
  }

  function parseConfig(text) {
    if (typeof text !== 'string') throw new Error('Không đọc được nội dung tệp JSON.');
    if (text.length > MAX_FILE_BYTES) throw new Error('Tệp JSON vượt giới hạn 64 KiB.');
    let data;
    try { data = JSON.parse(text); }
    catch { throw new Error('Tệp JSON bị hỏng hoặc sai cú pháp.'); }
    return validateConfigFile(data);
  }

  function createConfigFile(profileId, config) {
    const data = validateConfigFile({ schemaVersion: 1, profileId, config });
    return { json: JSON.stringify(data, null, 2) + '\n', filename: 'cau-hinh-wifi-' + data.profileId + '.json' };
  }

  const api = Object.freeze({ MAX_FILE_BYTES, validateConfigFile, parseConfig, createConfigFile });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globalThis.WifiConfigJson = api;
})();
