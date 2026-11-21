(function () {
  'use strict';

  const firmware = typeof module !== 'undefined' && module.exports
    ? require('./firmware-data.js') : globalThis.WifiFirmware;

  const profiles = Object.freeze({
    A: Object.freeze({
      id: 'A',
      title: 'Cấu hình ban đầu',
      description: 'Mạng khách đang bật. Quan sát đường truy cập của khách và xác định những thông tin còn thiếu.',
      mode: 'wpa2-wpa3-transition',
      wps: true,
      pmf: 'optional',
      guest: Object.freeze({ enabled: true, isolateLan: false }),
      remoteAdmin: false,
      remoteAdminStrongAuth: null,
      firmwareScenario: 'missing',
      firmware: firmware.A.missing,
    }),
    B: Object.freeze({
      id: 'B',
      title: 'Cấu hình mục tiêu',
      description: 'Các thiết bị cần sử dụng đã được giả định tương thích WPA3. Hồ sơ có bản ghi firmware mô phỏng B-FW.',
      mode: 'wpa3-personal',
      wps: false,
      pmf: 'required',
      guest: Object.freeze({ enabled: true, isolateLan: true }),
      remoteAdmin: false,
      remoteAdminStrongAuth: null,
      firmwareScenario: 'verified',
      firmware: firmware.B.verified,
    }),
    C: Object.freeze({
      id: 'C',
      title: 'Phương án tương thích',
      description: 'Một thiết bị cũ vẫn cần dùng Wi-Fi. Mạng khách đang tắt trong hồ sơ này.',
      mode: 'wpa2-personal-aes',
      wps: false,
      pmf: 'optional',
      guest: Object.freeze({ enabled: false, isolateLan: null }),
      remoteAdmin: false,
      remoteAdminStrongAuth: null,
      firmwareScenario: 'missing',
      firmware: firmware.C.missing,
    }),
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = profiles;
  else globalThis.WifiProfiles = profiles;
})();
