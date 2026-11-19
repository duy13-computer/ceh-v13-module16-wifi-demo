(function () {
  'use strict';

  const { assess } = globalThis.WifiAudit;
  const profiles = globalThis.WifiProfiles;
  const byId = (id) => document.getElementById(id);
  const profileButtons = [...document.querySelectorAll('[data-profile]')];
  const fields = {
    mode: byId('mode'), wps: byId('wps'), pmf: byId('pmf'),
    guest: byId('guest-enabled'), isolation: byId('guest-isolation'),
    remoteAdmin: byId('remote-admin'), firmware: byId('firmware'),
  };
  const resetButton = byId('reset');
  const firmwareDetail = byId('firmware-detail');
  let activeProfile = profiles.A;
  let baselineState;

  function boolOption(value) {
    return value === null ? '' : value ? 'on' : 'off';
  }

  function readBool(control) {
    return control.value === '' ? null : control.value === 'on';
  }

  function firmwareForProfile() {
    if (fields.firmware.value === 'missing') return null;
    const { id } = activeProfile;
    const record = { ...profiles.B.firmware, recordId: `${id}-FW`, model: `TB-MẪU-${id}` };
    if (fields.firmware.value === 'outdated') {
      record.recordId += '-CŨ';
      record.currentVersion = 'MẪU-02';
      record.maintenanceStatus = 'update-available';
    }
    return record;
  }

  function readDraft() {
    return {
      mode: fields.mode.value || null,
      wps: readBool(fields.wps),
      pmf: fields.pmf.value || null,
      guest: { enabled: readBool(fields.guest), isolateLan: readBool(fields.isolation) },
      remoteAdmin: readBool(fields.remoteAdmin),
      firmware: firmwareForProfile(),
    };
  }

  function renderFirmware(record) {
    firmwareDetail.hidden = record === null;
    if (!record) {
      firmwareDetail.open = false;
      byId('firmware-record').replaceChildren();
      return;
    }
    const status = record.maintenanceStatus === 'update-available'
      ? 'Còn hỗ trợ. Danh mục mẫu có bản mới hơn.'
      : 'Còn hỗ trợ. Phiên bản khớp danh mục mẫu.';
    const entries = [
      ['Mã bản ghi', record.recordId],
      ['Thiết bị / phần cứng', `${record.model} / ${record.hardwareVersion}`],
      ['Phiên bản khai báo', record.currentVersion],
      ['Phiên bản đối chiếu', record.catalogVersion],
      ['Nguồn và mốc', `${record.source} · ${record.checkedAt}`],
      ['Tình trạng', status],
    ];
    const nodes = entries.flatMap(([label, value]) => {
      const term = document.createElement('dt');
      const detail = document.createElement('dd');
      term.textContent = label;
      detail.textContent = value;
      return [term, detail];
    });
    byId('firmware-record').replaceChildren(...nodes);
  }

  function render() {
    const draft = readDraft();
    const evaluation = assess(draft);
    fields.isolation.disabled = draft.guest.enabled !== true;
    resetButton.disabled = JSON.stringify(draft) === baselineState;

    for (const result of evaluation.results) {
      const badge = document.querySelector(`[data-status-for="${result.id}"]`);
      badge.textContent = result.label;
      badge.dataset.status = result.status;
      byId(`reason-${result.id}`).textContent = result.reason;
    }

    byId('score-profile').textContent = activeProfile.id;
    byId('passed').textContent = evaluation.passed;
    byId('applicable').textContent = evaluation.applicable;
    for (const [key, count] of Object.entries(evaluation.counts)) {
      byId(`count-${key}`).textContent = count;
    }
    const { pass, improve, unknown, na } = evaluation.counts;
    byId('announcement').textContent = `Hồ sơ ${activeProfile.id} đạt ${pass} trên ${evaluation.applicable} tiêu chí áp dụng. ${improve} cần cải thiện, ${unknown} chưa xác minh, ${na} không áp dụng.`;
    renderFirmware(draft.firmware);
  }

  function loadProfile(profile) {
    activeProfile = profile;
    for (const button of profileButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.profile === profile.id));
    }
    byId('profile-description').textContent = `Tình huống gốc. ${profile.description}`;
    fields.mode.value = profile.mode ?? '';
    fields.wps.value = boolOption(profile.wps);
    fields.pmf.value = profile.pmf ?? '';
    fields.guest.value = boolOption(profile.guest.enabled);
    fields.isolation.value = boolOption(profile.guest.isolateLan);
    fields.remoteAdmin.value = boolOption(profile.remoteAdmin);
    fields.firmware.querySelector('[value="verified"]').textContent = `Bản ghi ${profile.id}-FW mô phỏng`;
    fields.firmware.value = profile.firmware ? 'verified' : 'missing';
    firmwareDetail.open = false;
    baselineState = JSON.stringify(readDraft());
    render();
  }

  function addComparison() {
    const evaluations = Object.values(profiles).map(assess);
    const tbody = byId('comparison-table').tBodies[0];
    for (const [index, example] of evaluations[0].results.entries()) {
      const row = tbody.insertRow();
      const heading = document.createElement('th');
      heading.scope = 'row';
      heading.textContent = `${example.id} · ${example.title}`;
      row.append(heading);
      for (const evaluation of evaluations) {
        const result = evaluation.results[index];
        const cell = row.insertCell();
        cell.textContent = result.label;
        cell.dataset.status = result.status;
      }
    }
    const totals = byId('comparison-table').tFoot.insertRow();
    const heading = document.createElement('th');
    heading.scope = 'row';
    heading.textContent = 'Đạt / Áp dụng';
    totals.append(heading);
    for (const { passed, applicable } of evaluations) {
      totals.insertCell().textContent = `${passed}/${applicable}`;
    }
  }

  for (const button of profileButtons) {
    button.addEventListener('click', () => {
      if (button.dataset.profile !== activeProfile.id) loadProfile(profiles[button.dataset.profile]);
    });
  }
  byId('check-form').addEventListener('change', render);
  resetButton.addEventListener('click', () => {
    loadProfile(activeProfile);
    profileButtons.find((button) => button.dataset.profile === activeProfile.id).focus();
  });
  addComparison();
  loadProfile(activeProfile);
})();
