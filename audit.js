(function () {
  'use strict';

  const STATUS = Object.freeze({
    PASS: 'pass',
    IMPROVE: 'improve',
    UNKNOWN: 'unknown',
    NA: 'na',
  });

  const LABELS = Object.freeze({
    [STATUS.PASS]: 'Đạt',
    [STATUS.IMPROVE]: 'Cần cải thiện',
    [STATUS.UNKNOWN]: 'Chưa xác minh',
    [STATUS.NA]: 'Không áp dụng',
  });

  const STATUS_ICONS = Object.freeze({ pass: '✓', improve: '!', unknown: '?', na: '—' });

  const MODE_LABELS = Object.freeze({
    'wpa3-personal': 'WPA3-Personal',
    'wpa2-wpa3-transition': 'WPA2/WPA3 chuyển tiếp',
    'wpa2-personal-aes': 'WPA2-Personal AES/CCMP',
  });

  const PMF_LABELS = Object.freeze({
    required: 'Bắt buộc',
    optional: 'Tùy chọn',
    disabled: 'Tắt',
  });

  const TITLES = Object.freeze({
    C1: 'Chế độ bảo mật',
    C2: 'WPS',
    C3: 'PMF',
    C4: 'Cách ly mạng khách khỏi LAN chính',
    C5: 'Quản trị từ xa qua Internet',
    C6: 'Bằng chứng xác minh firmware',
  });

  function row(id, status, observed, reason) {
    return { id, title: TITLES[id], status, label: LABELS[status], observed, reason };
  }

  function checkMode(mode) {
    if (typeof mode !== 'string' || !Object.hasOwn(MODE_LABELS, mode)) {
      return row('C1', STATUS.UNKNOWN, 'Chưa rõ', 'Cần có chế độ bảo mật đang dùng.');
    }
    if (mode === 'wpa3-personal') {
      return row('C1', STATUS.PASS, MODE_LABELS[mode], 'Khớp cấu hình mục tiêu của bài.');
    }
    return row('C1', STATUS.IMPROVE, MODE_LABELS[mode],
      'Cấu hình mục tiêu dùng WPA3-Personal. Nếu cần giữ thiết bị cũ, ghi lý do và mốc xem lại.');
  }

  function checkWps(wps) {
    if (wps === false) {
      return row('C2', STATUS.PASS, 'Tắt', 'Ghép nối nhanh qua WPS đã tắt trong hồ sơ.');
    }
    if (wps === true) {
      return row('C2', STATUS.IMPROVE, 'Bật', 'Kiểm tra nhu cầu sử dụng và tắt WPS nếu không cần.');
    }
    return row('C2', STATUS.UNKNOWN, 'Chưa rõ', 'Cần xác định WPS đang bật hay tắt.');
  }

  function checkPmf(pmf) {
    if (typeof pmf !== 'string' || !Object.hasOwn(PMF_LABELS, pmf)) {
      return row('C3', STATUS.UNKNOWN, 'Chưa rõ', 'Cần biết PMF có được đặt thành bắt buộc hay không.');
    }
    if (pmf === 'required') {
      return row('C3', STATUS.PASS, PMF_LABELS[pmf], 'Hồ sơ yêu cầu bảo vệ khung quản lý (PMF).');
    }
    return row('C3', STATUS.IMPROVE, PMF_LABELS[pmf],
      'Mục tiêu của bài là PMF bắt buộc. Kiểm tra khả năng tương thích trước khi chỉnh.');
  }

  function checkGuest(guest) {
    if (guest?.enabled === false) {
      return row('C4', STATUS.NA, 'Mạng khách tắt', 'Bỏ C4 khỏi số mục áp dụng khi mạng khách tắt.');
    }
    if (guest?.enabled !== true) {
      return row('C4', STATUS.UNKNOWN, 'Chưa rõ mạng khách', 'Cần xác định mạng khách đang bật hay tắt.');
    }
    if (guest.isolateLan === true) {
      return row('C4', STATUS.PASS, 'Mạng khách bật, cách ly bật', 'Hồ sơ ghi khách bị cách ly khỏi LAN chính.');
    }
    if (guest.isolateLan === false) {
      return row('C4', STATUS.IMPROVE, 'Mạng khách bật, cách ly tắt', 'Bật cách ly khách khỏi LAN chính nếu vẫn cần mạng khách.');
    }
    return row('C4', STATUS.UNKNOWN, 'Mạng khách bật, chưa rõ cách ly', 'Cần có bằng chứng về chiều truy cập từ mạng khách vào LAN chính.');
  }

  function checkRemoteAdmin(remoteAdmin, strongAuth) {
    if (remoteAdmin === false) {
      return row('C5', STATUS.PASS, 'Tắt, chỉ quản trị nội bộ', 'Hồ sơ ghi quản trị qua Internet đã tắt.');
    }
    if (remoteAdmin === true) {
      const authLabel = strongAuth === true ? 'Có' : strongAuth === false ? 'Không' : 'Chưa xác minh';
      return row('C5', STATUS.IMPROVE, 'Bật; xác thực mạnh: ' + authLabel, 'Xem lại nhu cầu và tắt quản trị qua Internet nếu không cần.');
    }
    return row('C5', STATUS.UNKNOWN, 'Chưa rõ', 'Cần xác định có bật quản trị qua Internet hay không.');
  }

  function hasText(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function interpretFirmware(record) {
    const evidenceLabels = {
      supportStatus: { supported: 'Còn hỗ trợ', unsupported: 'Hết hỗ trợ' },
      maintenanceStatus: { 'up-to-date': 'Đã cập nhật', 'update-available': 'Có bản cập nhật' },
    };
    const fieldLabels = {
      recordId: 'Mã bản ghi', model: 'Thiết bị', hardwareVersion: 'Phiên bản phần cứng',
      currentVersion: 'Phiên bản đang dùng', catalogVersion: 'Phiên bản đối chiếu',
      source: 'Nguồn đối chiếu', checkedAt: 'Mốc đối chiếu',
      supportStatus: 'Trạng thái hỗ trợ', maintenanceStatus: 'Trạng thái cập nhật',
    };
    function conclude(status, observed, reason) {
      const details = Object.entries(fieldLabels).map(([key, label]) => {
        const value = record?.[key];
        const labels = evidenceLabels[key];
        const display = labels
          ? (Object.hasOwn(labels, value) ? labels[value] : null) : value;
        return [label, hasText(display) ? display : LABELS[STATUS.UNKNOWN]];
      });
      return { ...row('C6', status, observed, reason), details };
    }
    const fields = ['recordId', 'model', 'hardwareVersion', 'currentVersion', 'source', 'checkedAt'];
    if (!record || !fields.every((field) => hasText(record[field]))) {
      return conclude(STATUS.UNKNOWN, 'Thiếu bằng chứng',
        'Cần bản ghi xác định thiết bị, phiên bản đang dùng, nguồn và mốc đối chiếu.');
    }

    const observed = `Bản ghi ${record.recordId} tại ${record.checkedAt}`;
    const maintenance = record.maintenanceStatus;
    if (!hasText(maintenance)) {
      return conclude(STATUS.UNKNOWN, observed, 'Chưa xác minh trạng thái cập nhật firmware.');
    }
    if (record.supportStatus === 'unsupported') {
      return conclude(STATUS.IMPROVE, observed, 'Bản ghi xác nhận thiết bị đã hết được hỗ trợ.');
    }
    if (record.supportStatus !== 'supported' || !hasText(record.catalogVersion)) {
      return conclude(STATUS.UNKNOWN, observed, 'Chưa đủ căn cứ về trạng thái hỗ trợ và phiên bản đối chiếu.');
    }

    const matches = record.currentVersion.trim() === record.catalogVersion.trim();
    if (matches && maintenance === 'up-to-date') {
      return conclude(STATUS.PASS, observed, 'Thiết bị còn hỗ trợ và phiên bản trùng với bản đối chiếu tại mốc ghi nhận.');
    }
    if (!matches && maintenance === 'update-available') {
      return conclude(STATUS.IMPROVE, observed, 'Bản ghi xác nhận có bản cập nhật phù hợp cho thiết bị.');
    }
    return conclude(STATUS.UNKNOWN, observed, 'Trạng thái cập nhật chưa được xác nhận hoặc dữ liệu đối chiếu mâu thuẫn.');
  }

  function validateConsistency(config = {}) {
    const warnings = [];
    if (config?.mode === 'wpa3-personal' && config?.pmf !== 'required') {
      warnings.push({ id: 'wpa3-pmf', message: 'WPA3-Personal được chọn nhưng PMF chưa được đặt thành bắt buộc. Kiểm tra lại tổ hợp cấu hình.' });
    }
    if (config?.wps === true && Object.hasOwn(MODE_LABELS, config?.mode)) {
      warnings.push({ id: 'wps-security', message: 'WPS đang bật cùng ' + MODE_LABELS[config.mode] + '. Tắt WPS để phù hợp cấu hình bảo mật mục tiêu.' });
    }
    if (config?.remoteAdmin === true && config?.remoteAdminStrongAuth !== true) {
      warnings.push({ id: 'remote-auth', message: 'Quản trị từ Internet đang bật nhưng xác thực mạnh chưa được xác nhận. Xác minh cơ chế xác thực hoặc tắt quản trị từ Internet.' });
    }
    return warnings;
  }

  function assess(profile = {}) {
    const results = [
      checkMode(profile?.mode),
      checkWps(profile?.wps),
      checkPmf(profile?.pmf),
      checkGuest(profile?.guest),
      checkRemoteAdmin(profile?.remoteAdmin, profile?.remoteAdminStrongAuth),
      interpretFirmware(profile?.firmware),
    ];
    const counts = { pass: 0, improve: 0, unknown: 0, na: 0 };
    for (const result of results) counts[result.status] += 1;
    return { results, counts, passed: counts.pass, applicable: results.length - counts.na };
  }

  const api = Object.freeze({ assess, interpretFirmware, validateConsistency, STATUS, LABELS, STATUS_ICONS, MODE_LABELS, PMF_LABELS });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globalThis.WifiAudit = api;
})();
