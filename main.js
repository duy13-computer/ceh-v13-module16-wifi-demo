(function () {
  'use strict';

  const { assess, interpretFirmware, validateConsistency, STATUS_ICONS } = globalThis.WifiAudit;
  const { compareWithBaseline, suggestShortestPath } = globalThis.WifiWhatIf;
  const { buildTodo } = globalThis.WifiRecommendations;
  const { MAX_FILE_BYTES, parseConfig, createConfigFile } = globalThis.WifiConfigJson;
  const { createReport } = globalThis.WifiReport;
  const profiles = globalThis.WifiProfiles;
  const firmwareRecords = globalThis.WifiFirmware;
  const byId = (id) => document.getElementById(id);
  const profileButtons = [...document.querySelectorAll('[data-profile]')];
  const fields = {
    mode: byId('mode'), wps: byId('wps'), pmf: byId('pmf'),
    guest: byId('guest-enabled'), isolation: byId('guest-isolation'),
    remoteAdmin: byId('remote-admin'), remoteAuth: byId('remote-admin-strong-auth'), firmware: byId('firmware'),
  };
  const resetButton = byId('reset');
  const firmwareDetail = byId('firmware-detail');
  let activeProfile = profiles.A;
  let baselineState;
  let baselineConfig;
  let previousDraft = null;
  let importRequest = 0;
  const draftCache = new Map();
  const draftKey = (id) => 'wifi-audit:draft:v1:' + id;
  let storageUnavailable = false;

  function clearSavedDraft(id) {
    draftCache.set(id, null);
    try { localStorage.removeItem(draftKey(id)); }
    catch { storageUnavailable = true; }
  }

  function saveDraft() {
    const id = activeProfile.id;
    if (JSON.stringify(readDraft()) === baselineState) {
      clearSavedDraft(id);
      return;
    }
    const values = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value]));
    draftCache.set(id, values);
    try { localStorage.setItem(draftKey(id), JSON.stringify(values)); }
    catch { storageUnavailable = true; }
  }

  function savedDraft(id) {
    if (draftCache.has(id)) return draftCache.get(id);
    let json;
    try { json = localStorage.getItem(draftKey(id)); }
    catch { storageUnavailable = true; return null; }
    if (!json) return null;
    try {
      const values = JSON.parse(json);
      // Chỉ khôi phục các lựa chọn hiện có; không nhận firmware hoặc HTML từ bộ nhớ.
      if (!values || Array.isArray(values) || Object.keys(values).length !== Object.keys(fields).length) return null;
      for (const [key, field] of Object.entries(fields)) {
        if (!Object.hasOwn(values, key) || typeof values[key] !== 'string'
          || ![...field.options].some(option => option.value === values[key])) return null;
      }
      draftCache.set(id, values);
      return values;
    } catch { return null; }
  }

  function boolOption(value) {
    return value === null ? '' : value ? 'on' : 'off';
  }

  function readBool(control) {
    return control.value === '' ? null : control.value === 'on';
  }

  function readConfig() {
    return {
      mode: fields.mode.value || null,
      wps: readBool(fields.wps),
      pmf: fields.pmf.value || null,
      guest: { enabled: readBool(fields.guest), isolateLan: readBool(fields.isolation) },
      remoteAdmin: readBool(fields.remoteAdmin),
      remoteAdminStrongAuth: readBool(fields.remoteAuth),
      firmwareScenario: fields.firmware.value,
    };
  }

  function readDraft() {
    const { firmwareScenario, ...config } = readConfig();
    return { ...config, firmware: firmwareRecords[activeProfile.id][firmwareScenario] };
  }

  function applyConfig(config) {
    fields.mode.value = config.mode ?? '';
    fields.wps.value = boolOption(config.wps);
    fields.pmf.value = config.pmf ?? '';
    fields.guest.value = boolOption(config.guest.enabled);
    fields.isolation.value = boolOption(config.guest.isolateLan);
    fields.remoteAdmin.value = boolOption(config.remoteAdmin);
    fields.remoteAuth.value = boolOption(config.remoteAdminStrongAuth);
    fields.firmware.value = config.firmwareScenario;
  }

  function downloadFile(content, filename, type) {
    let url;
    let link;
    try {
      url = URL.createObjectURL(new Blob([content], { type }));
      link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
    } finally {
      link?.remove();
      if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  function readFileText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Không đọc được tệp JSON. Hãy chọn lại tệp.'));
      reader.onabort = () => reject(new Error('Đã hủy đọc tệp JSON.'));
      reader.readAsText(file, 'utf-8');
    });
  }

  function renderFirmware(record) {
    firmwareDetail.hidden = record === null;
    if (!record) {
      firmwareDetail.open = false;
      byId('firmware-record').replaceChildren();
      return;
    }
    const firmware = interpretFirmware(record);
    const entries = [...firmware.details,
      ['Kết luận', firmware.label], ['Lý do', firmware.reason]];
    const nodes = entries.flatMap(([label, value]) => {
      const term = document.createElement('dt');
      const detail = document.createElement('dd');
      term.textContent = label;
      detail.textContent = value;
      return [term, detail];
    });
    byId('firmware-record').replaceChildren(...nodes);
  }

  function renderRecommendations(draft) {
    const todos = buildTodo(draft);
    for (const id of ['C1', 'C2', 'C3', 'C4', 'C5', 'C6']) {
      const container = byId('recommendation-' + id);
      const todo = todos.find(item => item.id === id);
      container.hidden = !todo;
      container.replaceChildren();
      if (!todo) continue;
      for (const [label, value] of [['Ưu tiên', todo.priority], ['Rủi ro', todo.risk], ['Khắc phục', todo.action]]) {
        const paragraph = document.createElement('p');
        paragraph.textContent = label + ': ' + value;
        container.append(paragraph);
      }
    }
    const items = todos.map(todo => {
      const item = document.createElement('li');
      item.dataset.criterion = todo.id;
      const heading = document.createElement('strong');
      heading.textContent = todo.id + ' · ' + todo.title + ' — Ưu tiên: ' + todo.priority;
      const action = document.createElement('p');
      action.textContent = todo.action;
      item.append(heading, action);
      return item;
    });
    byId('todo-list').replaceChildren(...items);
    byId('todo-empty').hidden = todos.length !== 0;
  }

  function renderShortestPath(draft) {
    if (byId('shortest-path').hidden) return;
    const changes = suggestShortestPath(draft);
    byId('path-summary').textContent = changes.some(change => change.pending)
      ? 'Còn thông tin cần xác minh; chưa thể kết luận số thay đổi tối thiểu.'
      : changes.length ? 'Cần tối thiểu ' + changes.length + ' thay đổi trường để mọi tiêu chí áp dụng đạt trong mô phỏng.'
        : 'Đã đạt điểm tối đa trên các tiêu chí áp dụng. Không cần thay đổi.';
    byId('path-list').replaceChildren(...changes.map(change => {
      const item = document.createElement('li');
      item.textContent = change.message;
      return item;
    }));
  }

  function renderWhatIf(draft) {
    const comparison = compareWithBaseline(baselineConfig, draft);
    byId('score-delta').textContent = comparison.summary;
    byId('denominator-note').textContent = comparison.denominatorNote;
    byId('denominator-note').hidden = !comparison.denominatorNote;
    const changes = previousDraft ? compareWithBaseline(previousDraft, draft).changes : [];
    byId('last-status-change').textContent = previousDraft
      ? changes.length ? 'Vừa đổi trạng thái: ' + changes.map(change => change.id + ' · '
        + change.fromLabel + ' → ' + change.toLabel).join('; ') + '.'
        : 'Không có tiêu chí đổi trạng thái trong lần chỉnh vừa rồi.'
      : 'Thay đổi một trường để xem tiêu chí vừa đổi trạng thái.';
    for (const id of ['C1', 'C2', 'C3', 'C4', 'C5', 'C6']) {
      document.querySelector('[data-criterion="' + id + '"]').dataset.recentlyChanged = String(changes.some(change => change.id === id));
    }
    previousDraft = draft;
    renderShortestPath(draft);
  }

  function render() {
    byId('export-message').textContent = '';
    const draft = readDraft();
    const evaluation = assess(draft);
    fields.isolation.disabled = draft.guest.enabled !== true;
    fields.remoteAuth.disabled = draft.remoteAdmin !== true;
    const warnings = validateConsistency(draft);
    const warningContent = document.createElement(warnings.length ? 'ul' : 'p');
    if (warnings.length) {
      for (const warning of warnings) {
        const item = document.createElement('li');
        item.textContent = warning.message;
        warningContent.append(item);
      }
    } else {
      warningContent.textContent = 'Không có cảnh báo nhất quán.';
    }
    byId('consistency-warnings').replaceChildren(warningContent);
    const modified = JSON.stringify(draft) !== baselineState;
    resetButton.disabled = !modified;
    byId('profile-description').textContent = (modified ? 'Bản nháp đang chỉnh. ' : 'Tình huống gốc. ') + activeProfile.description;
    byId('draft-message').textContent = storageUnavailable
      ? 'Không truy cập được bộ nhớ trình duyệt. Bản nháp chỉ được giữ trong phiên đang mở.'
      : modified ? 'Đã lưu bản nháp riêng cho hồ sơ ' + activeProfile.id + ' trên trình duyệt này.'
        : 'Đang dùng hồ sơ gốc. Các thay đổi sẽ được lưu thành bản nháp riêng.';

    for (const result of evaluation.results) {
      const badge = document.querySelector(`[data-status-for="${result.id}"]`);
      const icon = document.createElement('span');
      icon.className = 'status-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = STATUS_ICONS[result.status];
      badge.replaceChildren(icon, document.createTextNode(result.label));
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
    renderRecommendations(draft);
    renderWhatIf(draft);
  }

  function loadProfile(profile, { restoreDraft = true } = {}) {
    activeProfile = profile;
    for (const button of profileButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.profile === profile.id));
    }
    byId('profile-description').textContent = `Tình huống gốc. ${profile.description}`;
    applyConfig(profile);
    fields.firmware.querySelector('[value="verified"]').textContent = `Bản ghi ${profile.id}-FW mô phỏng`;
    firmwareDetail.open = false;
    baselineConfig = readDraft();
    baselineState = JSON.stringify(baselineConfig);
    previousDraft = null;
    byId('shortest-path').hidden = true;
    byId('suggest-path').setAttribute('aria-expanded', 'false');
    const saved = restoreDraft ? savedDraft(profile.id) : null;
    if (saved) {
      for (const [key, field] of Object.entries(fields)) field.value = saved[key];
    }
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
        cell.textContent = STATUS_ICONS[result.status] + ' ' + result.label;
        cell.setAttribute('aria-label', result.label);
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
  for (const [index, button] of profileButtons.entries()) {
    button.addEventListener('keydown', event => {
      let target;
      if (event.key === 'ArrowRight') target = (index + 1) % profileButtons.length;
      else if (event.key === 'ArrowLeft') target = (index + profileButtons.length - 1) % profileButtons.length;
      else if (event.key === 'Home') target = 0;
      else if (event.key === 'End') target = profileButtons.length - 1;
      else return;
      event.preventDefault();
      profileButtons[target].click();
      profileButtons[target].focus();
    });
  }
  byId('check-form').addEventListener('change', () => {
    saveDraft();
    render();
  });
  byId('suggest-path').addEventListener('click', () => {
    const panel = byId('shortest-path');
    panel.hidden = !panel.hidden;
    byId('suggest-path').setAttribute('aria-expanded', String(!panel.hidden));
    renderShortestPath(readDraft());
  });
  byId('export-report').addEventListener('click', () => {
    const message = byId('export-message');
    try {
      const { html, filename } = createReport(activeProfile, readDraft());
      downloadFile(html, filename, 'text/html;charset=utf-8');
      message.textContent = 'Đã tạo báo cáo. Mở tệp HTML vừa tải để xem hoặc in thành PDF.';
    } catch {
      message.textContent = 'Chưa xuất được báo cáo. Hãy thử lại và kiểm tra quyền tải tệp của trình duyệt.';
    }
  });
  byId('export-config').addEventListener('click', () => {
    const message = byId('json-message');
    try {
      const { json, filename } = createConfigFile(activeProfile.id, readConfig());
      downloadFile(json, filename, 'application/json;charset=utf-8');
      message.textContent = 'Đã tạo tệp cấu hình JSON từ các lựa chọn hiện tại.';
    } catch {
      message.textContent = 'Chưa xuất được JSON. Hãy kiểm tra quyền tải tệp và thử lại.';
    }
  });
  byId('import-config').addEventListener('change', async () => {
    const control = byId('import-config');
    const file = control.files[0];
    const request = ++importRequest;
    if (!file) return;
    const message = byId('json-message');
    message.textContent = 'Đang đọc cấu hình JSON…';
    control.setAttribute('aria-invalid', 'false');
    try {
      if (file.size > MAX_FILE_BYTES) throw new Error('Tệp JSON vượt giới hạn 64 KiB.');
      const data = parseConfig(await readFileText(file));
      if (request !== importRequest) return;
      loadProfile(profiles[data.profileId], { restoreDraft: false });
      applyConfig(data.config);
      saveDraft();
      render();
      message.textContent = 'Đã nhập cấu hình JSON cho hồ sơ ' + data.profileId + '. Dữ liệu chỉ dùng trong mô phỏng.';
    } catch (error) {
      if (request !== importRequest) return;
      control.setAttribute('aria-invalid', 'true');
      message.textContent = error.message || 'Không nhập được cấu hình JSON.';
    } finally {
      if (request === importRequest) control.value = '';
    }
  });
  resetButton.addEventListener('click', () => {
    clearSavedDraft(activeProfile.id);
    loadProfile(activeProfile, { restoreDraft: false });
    profileButtons.find((button) => button.dataset.profile === activeProfile.id).focus();
  });
  addComparison();
  loadProfile(activeProfile);
})();
