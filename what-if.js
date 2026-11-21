(function () {
  'use strict';

  const { assess, STATUS } = typeof module !== 'undefined' && module.exports
    ? require('./audit.js') : globalThis.WifiAudit;
  const signed = value => value > 0 ? '+' + value : String(value);

  function compareWithBaseline(baseline = {}, current = {}) {
    const before = assess(baseline);
    const after = assess(current);
    const changes = after.results.flatMap(result => {
      const original = before.results.find(item => item.id === result.id);
      return original.status === result.status ? [] : [{ id: result.id, title: result.title,
        from: original.status, to: result.status, fromLabel: original.label, toLabel: result.label }];
    });
    const passedDelta = after.passed - before.passed;
    const applicableDelta = after.applicable - before.applicable;
    return {
      baseline: { passed: before.passed, applicable: before.applicable },
      current: { passed: after.passed, applicable: after.applicable },
      passedDelta, applicableDelta, changes,
      summary: signed(passedDelta) + ' so với hồ sơ gốc (số tiêu chí đạt). Gốc '
        + before.passed + '/' + before.applicable + '; hiện tại ' + after.passed + '/' + after.applicable + '.',
      denominatorNote: applicableDelta === 0 ? '' : 'Số tiêu chí áp dụng thay đổi từ '
        + before.applicable + ' thành ' + after.applicable
        + '. Chênh lệch số mục đạt cần được đọc cùng mẫu số; đây không phải thước đo độ an toàn thực tế.',
    };
  }

  // Một thay đổi là một trường biểu mẫu. Giữ trạng thái mạng khách đã xác nhận;
  // không coi việc khai báo tắt một mạng chưa xác minh là cách tăng điểm.
  function suggestShortestPath(config = {}) {
    const evaluation = assess(config);
    const changes = [];
    const add = (id, field, value, message, pending = false) => changes.push({ id, field, value, message, pending });
    if (evaluation.results[0].status !== STATUS.PASS) {
      add('C1', 'mode', 'wpa3-personal', 'C1: Chọn WPA3-Personal trong demo; khi triển khai, xác minh khả năng tương thích trước.');
    }
    if (evaluation.results[1].status !== STATUS.PASS) {
      add('C2', 'wps', false, 'C2: Tắt WPS.');
    }
    if (evaluation.results[2].status !== STATUS.PASS) {
      add('C3', 'pmf', 'required', 'C3: Đặt PMF thành bắt buộc trong demo; xác minh hỗ trợ trước khi áp dụng thực tế.');
    }
    if (config?.guest?.enabled === true && config.guest.isolateLan !== true) {
      add('C4', 'guest.isolateLan', true, 'C4: Bật cách ly mạng khách khỏi LAN chính, giữ mạng khách đang bật.');
    } else if (config?.guest?.enabled !== true && config?.guest?.enabled !== false) {
      add('C4', 'guest.enabled', null, 'C4: Xác minh mạng khách bật hay tắt trước; nếu bật, kiểm tra cách ly rồi yêu cầu gợi ý lại.', true);
    }
    if (evaluation.results[4].status !== STATUS.PASS) {
      add('C5', 'remoteAdmin', false, 'C5: Tắt quản trị từ Internet để đạt cấu hình mục tiêu của bảng kiểm.');
    }
    if (evaluation.results[5].status !== STATUS.PASS) {
      add('C6', 'firmwareScenario', 'verified', 'C6: Trong demo, chọn bản ghi firmware xác minh của chính hồ sơ. Thao tác này chỉ thay bằng chứng mô phỏng, không cập nhật router thật.');
    }
    return changes;
  }

  const api = Object.freeze({ compareWithBaseline, suggestShortestPath });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globalThis.WifiWhatIf = api;
})();
