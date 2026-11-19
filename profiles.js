(function () {
  'use strict';

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
      firmware: null,
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
      firmware: Object.freeze({
        recordId: 'B-FW',
        model: 'TB-MẪU-B',
        hardwareVersion: 'MẪU-R1',
        currentVersion: 'MẪU-03',
        catalogVersion: 'MẪU-03',
        checkedAt: 'T0',
        source: 'Danh mục hỗ trợ giả định',
        supportStatus: 'supported',
        maintenanceStatus: 'up-to-date',
      }),
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
      firmware: null,
    }),
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = profiles;
  else globalThis.WifiProfiles = profiles;
})();
