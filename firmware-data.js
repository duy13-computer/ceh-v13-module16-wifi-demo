(function () {
  'use strict';

  function scenarios(id) {
    const verified = Object.freeze({
      recordId: id + '-FW',
      model: 'TB-MẪU-' + id,
      hardwareVersion: 'MẪU-R1',
      currentVersion: 'MẪU-03',
      catalogVersion: 'MẪU-03',
      checkedAt: 'T0',
      source: 'Danh mục hỗ trợ giả định',
      supportStatus: 'supported',
      maintenanceStatus: 'up-to-date',
    });
    const outdated = Object.freeze({
      ...verified, recordId: id + '-FW-CŨ', currentVersion: 'MẪU-02',
      maintenanceStatus: 'update-available',
    });
    return Object.freeze({ missing: null, verified, outdated });
  }

  // Mỗi hồ sơ sở hữu các bản ghi mô phỏng riêng; không lấy hồ sơ B làm nguồn.
  const firmware = Object.freeze({ A: scenarios('A'), B: scenarios('B'), C: scenarios('C') });
  if (typeof module !== 'undefined' && module.exports) module.exports = firmware;
  else globalThis.WifiFirmware = firmware;
})();
