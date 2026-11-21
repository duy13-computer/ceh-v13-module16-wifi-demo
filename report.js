(function () {
  'use strict';

  const { assess, interpretFirmware, validateConsistency } = typeof module !== 'undefined' && module.exports
    ? require('./audit.js') : globalThis.WifiAudit;

  const { buildTodo } = typeof module !== 'undefined' && module.exports
    ? require('./recommendations.js') : globalThis.WifiRecommendations;

  const { compareWithBaseline } = typeof module !== 'undefined' && module.exports
    ? require('./what-if.js') : globalThis.WifiWhatIf;

  function escapeHtml(value) {
    const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(value ?? '').replace(/[&<>"']/g, (character) => entities[character]);
  }

  function createReport(profile, draft, createdAt = new Date()) {
    const evaluation = assess(draft);
    const escape = escapeHtml;
    const comparison = compareWithBaseline(profile, draft);
    const baseline = assess(profile);
    const comparisonRows = evaluation.results.map(result => {
      const original = baseline.results.find(item => item.id === result.id);
      return '<tr><th scope="row">' + escape(result.id) + ' · ' + escape(result.title) + '</th>'
        + '<td>' + escape(original.observed) + '</td><td>' + escape(original.label) + '</td>'
        + '<td>' + escape(result.observed) + '</td><td>' + escape(result.label) + '</td></tr>';
    }).join('');
    const todos = buildTodo(draft);
    const recommendationHtml = todo => '<p><strong>Ưu tiên: ' + escape(todo.priority) + '</strong></p>'
      + '<p>Rủi ro: ' + escape(todo.risk) + '</p><p>Khắc phục: ' + escape(todo.action) + '</p>';
    const todoHtml = todos.length
      ? '<ol class="todo-list">' + todos.map(todo => '<li><h3>' + escape(todo.id) + ' · '
        + escape(todo.title) + '</h3>' + recommendationHtml(todo) + '</li>').join('') + '</ol>'
      : '<p>Không còn việc cần làm trong sáu tiêu chí.</p>';
    const warnings = validateConsistency(draft);
    const warningHtml = warnings.length
      ? '<ul>' + warnings.map((warning) => '<li>' + escape(warning.message) + '</li>').join('') + '</ul>'
      : '<p>Không có cảnh báo nhất quán.</p>';
    const timestamp = new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'full', timeStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh',
    }).format(createdAt);
    const dateParts = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Ho_Chi_Minh',
    }).formatToParts(createdAt);
    const datePart = (type) => dateParts.find((part) => part.type === type).value;
    const date = `${datePart('year')}-${datePart('month')}-${datePart('day')}`;
    const profileId = String(profile.id).replace(/[^a-zA-Z0-9_-]/g, '') || 'demo';
    const rows = evaluation.results.map((result) => {
      const todo = todos.find(item => item.id === result.id);
      return `
      <tr><th scope="row">${escape(result.id)} · ${escape(result.title)}</th>
        <td>${escape(result.observed)}</td>
        <td class="${result.status}">${escape(result.label)}</td>
        <td>${escape(result.reason)}${todo ? '<p>Ưu tiên: ' + escape(todo.priority) + '</p>' : ''}</td></tr>`;
    }).join('');
    const interpretation = interpretFirmware(draft.firmware);
    const firmware = draft.firmware
      ? '<dl>' + [...interpretation.details,
        ['Kết luận', interpretation.label], ['Lý do', interpretation.reason]]
        .map(([label, value]) => '<dt>' + escape(label) + '</dt><dd>' + escape(value) + '</dd>')
        .join('') + '</dl>'
      : '<p>Chưa có bằng chứng firmware trong cấu hình được xuất.</p>';
    const { pass, improve, unknown, na } = evaluation.counts;
    const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Báo cáo cấu hình Wi-Fi — Hồ sơ ${escape(profile.id)}</title>
  <style>
    * { box-sizing: border-box; }
    body { max-width: 1120px; margin: 32px auto; padding: 0 24px; color: #173333; font: 15px/1.6 system-ui, sans-serif; }
    h3 { font-size: 16px; margin-bottom: 6px; }
    .todo-list li + li { margin-top: 18px; }
    .todo-list p { margin: 5px 0; }
    h1 { margin-bottom: 8px; line-height: 1.2; } h2 { margin-top: 28px; font-size: 20px; }
    .eyebrow { color: #006d60; font-weight: 700; } .meta, footer { color: #435e5a; }
    .summary { padding: 18px 22px; border: 1px solid #b8d6cb; border-radius: 8px; background: #edf6f1; }
    .score { margin: 0; font-size: 32px; font-weight: 750; }
    .summary p:last-child { margin-bottom: 0; }
    .table-scroll { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { padding: 10px; border: 1px solid #cbd9d2; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
    thead { background: #edf4ef; } tbody th { width: 22%; }
    td.pass { color: #17634d; } td.improve { color: #85420e; } td.unknown { color: #254e73; }
    td.na { color: #465c54; } td:nth-child(3) { font-weight: 700; }
    dl { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: 8px 20px; }
    dt { font-weight: 650; } dd { margin: 0; overflow-wrap: anywhere; }
    footer { margin-top: 28px; border-top: 1px solid #cbd9d2; font-size: 13px; }
    @media screen and (prefers-color-scheme: dark) {
      :root { color-scheme: dark; background: #101c1c; }
      body { color: #e4efeb; }
      .eyebrow { color: #8ed9c2; } .meta, footer { color: #b8ccc5; }
      .summary, thead { background: #203c35; }
      .summary, th, td, footer { border-color: #91b7a9; }
      td.pass { color: #a4e5c7; } td.improve { color: #ffd19b; }
      td.unknown { color: #b4daf9; } td.na { color: #d6e3dc; }
    }
    @page { size: A4 landscape; margin: 14mm; }
    @media print {
      body { max-width: none; margin: 0; padding: 0; font-size: 11px; }
      th, td { padding: 7px; }
      .table-scroll { overflow: visible; }
      table { font-size: 10px; table-layout: fixed; break-inside: avoid; page-break-inside: avoid; }
      thead { display: table-header-group; } tfoot { display: table-footer-group; }
      tr, th, td { break-inside: avoid; page-break-inside: avoid; }
      header, .summary, .audit-section, .baseline-section, .evidence-section, .consistency-section,
      .todo-list li { break-inside: avoid; page-break-inside: avoid; }
      .todo-section { break-before: page; page-break-before: always; }
      h1, h2, h3 { break-after: avoid; page-break-after: avoid; }
      p { orphans: 3; widows: 3; } td p { margin: 3px 0 0; }
      h2 { margin-top: 18px; font-size: 15px; } h3 { font-size: 12px; }
      .print-hint { display: none; }
    }
  </style>
</head>
<body>
  <header>
    <p class="eyebrow">CEH AI v13 · Module 16 · Dữ liệu mô phỏng</p>
    <h1>Báo cáo đánh giá cấu hình Wi-Fi</h1>
    <p>Hồ sơ nguồn: ${escape(profile.id)} — ${escape(profile.title)}</p>
    <p class="meta">Thời điểm tạo: <time datetime="${escape(createdAt.toISOString())}">${escape(timestamp)}</time> (giờ Việt Nam, UTC+7).</p>
    <p>Đây là mô phỏng phục vụ giáo dục, không kết nối router thật.</p>
    <p>Kết quả ghi nhận các lựa chọn tại thời điểm xuất, bao gồm những thay đổi trên biểu mẫu.</p>
  </header>
  <main>
  <section class="summary" aria-label="Tổng hợp kết quả">
    <p class="score">${evaluation.passed}/${evaluation.applicable} tiêu chí đạt</p>
    <p>Đạt: ${pass} · Cần cải thiện: ${improve} · Chưa xác minh: ${unknown} · Không áp dụng: ${na}</p>
    <p>Mỗi tiêu chí áp dụng có cùng trọng số. Chưa xác minh vẫn tính vào mẫu số; không áp dụng được loại khỏi mẫu số.</p>
  </section>
  <section class="audit-section" aria-labelledby="audit-title">
  <h2 id="audit-title">Kết quả từng tiêu chí</h2>
  <div class="table-scroll"><table>
    <thead><tr><th scope="col">Tiêu chí</th><th scope="col">Cấu hình ghi nhận</th><th scope="col">Trạng thái</th><th scope="col">Nhận xét / việc cần làm</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>
  </section>
  <section class="baseline-section" aria-labelledby="baseline-title">
    <h2 id="baseline-title">So sánh với baseline</h2>
    <p>${escape(comparison.summary)}</p>
    ${comparison.denominatorNote ? '<p>' + escape(comparison.denominatorNote) + '</p>' : ''}
    <p>Đối chiếu với cấu hình gốc của hồ sơ nguồn, kể cả khi đã khôi phục bản nháp.</p>
    <div class="table-scroll"><table class="baseline-table">
      <thead><tr><th scope="col">Tiêu chí</th><th scope="col">Cấu hình gốc</th><th scope="col">Trạng thái gốc</th><th scope="col">Cấu hình hiện tại</th><th scope="col">Trạng thái hiện tại</th></tr></thead>
      <tbody>${comparisonRows}</tbody>
    </table></div>
  </section>
  <section class="todo-section" aria-labelledby="todo-title"><h2 id="todo-title">Việc cần làm</h2>${todoHtml}</section>
  <section class="evidence-section" aria-labelledby="evidence-title"><h2 id="evidence-title">Bằng chứng firmware mô phỏng</h2>${firmware}</section>
  <section class="consistency-section" aria-labelledby="consistency-title"><h2 id="consistency-title">Cảnh báo nhất quán</h2>
    <p>Cảnh báo không thay đổi điểm sáu tiêu chí.</p>${warningHtml}</section>
  </main>
  <footer>
    <p>Điểm thể hiện mức đáp ứng bảng kiểm của đề tài. Ứng dụng không quét mạng, truy cập router hoặc xác minh firmware thực tế. Kết quả không phải chứng nhận an toàn cho mạng đang vận hành.</p>
    <p class="print-hint">Dùng chức năng In của trình duyệt (Ctrl+P hoặc Cmd+P) để in báo cáo hoặc lưu thành PDF.</p>
  </footer>
</body>
</html>
`;
    return { html, filename: `bao-cao-wifi-${profileId}-${date}.html` };
  }

  const api = Object.freeze({ createReport });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globalThis.WifiReport = api;
})();
