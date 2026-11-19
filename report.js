(function () {
  'use strict';

  const { assess } = typeof module !== 'undefined' && module.exports
    ? require('./audit.js') : globalThis.WifiAudit;

  function escapeHtml(value) {
    const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(value ?? '').replace(/[&<>"']/g, (character) => entities[character]);
  }

  function createReport(profile, draft, createdAt = new Date()) {
    const evaluation = assess(draft);
    const escape = escapeHtml;
    const timestamp = new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'full', timeStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh',
    }).format(createdAt);
    const dateParts = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Ho_Chi_Minh',
    }).formatToParts(createdAt);
    const datePart = (type) => dateParts.find((part) => part.type === type).value;
    const date = `${datePart('year')}-${datePart('month')}-${datePart('day')}`;
    const profileId = String(profile.id).replace(/[^a-zA-Z0-9_-]/g, '') || 'demo';
    const rows = evaluation.results.map((result) => `
      <tr><th scope="row">${escape(result.id)} · ${escape(result.title)}</th>
        <td>${escape(result.observed)}</td>
        <td class="${result.status}">${escape(result.label)}</td>
        <td>${escape(result.reason)}</td></tr>`).join('');
    const firmwareLabels = {
      recordId: 'Mã bản ghi', model: 'Thiết bị', hardwareVersion: 'Phiên bản phần cứng',
      currentVersion: 'Phiên bản đang dùng', catalogVersion: 'Phiên bản đối chiếu',
      source: 'Nguồn đối chiếu', checkedAt: 'Mốc đối chiếu',
      supportStatus: 'Trạng thái hỗ trợ', maintenanceStatus: 'Trạng thái cập nhật',
    };
    const evidenceLabels = {
      supported: 'Còn hỗ trợ', unsupported: 'Hết hỗ trợ',
      'up-to-date': 'Đã cập nhật', 'update-available': 'Có bản cập nhật',
    };
    const firmware = draft.firmware
      ? `<dl>${Object.entries(firmwareLabels).map(([key, label]) => {
        const value = draft.firmware[key];
        const display = Object.hasOwn(evidenceLabels, value) ? evidenceLabels[value] : value;
        return `<dt>${escape(label)}</dt><dd>${escape(display || 'Chưa xác minh')}</dd>`;
      }).join('')}</dl>`
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
    @page { size: A4 landscape; margin: 14mm; }
    @media print {
      body { max-width: none; margin: 0; padding: 0; font-size: 11px; }
      table { font-size: 10px; } th, td { padding: 7px; }
      .table-scroll { overflow: visible; } tr, .summary { break-inside: avoid; }
      h2 { break-after: avoid; } .print-hint { display: none; }
    }
  </style>
</head>
<body>
  <header>
    <p class="eyebrow">CEH AI v13 · Module 16 · Dữ liệu mô phỏng</p>
    <h1>Báo cáo đánh giá cấu hình Wi-Fi</h1>
    <p>Dựa trên hồ sơ ${escape(profile.id)} — ${escape(profile.title)}</p>
    <p class="meta">Thời điểm xuất: ${escape(timestamp)} (giờ Việt Nam, UTC+7).</p>
    <p>Kết quả ghi nhận các lựa chọn tại thời điểm xuất, bao gồm những thay đổi trên biểu mẫu.</p>
  </header>
  <section class="summary" aria-label="Tổng hợp kết quả">
    <p class="score">${evaluation.passed}/${evaluation.applicable} tiêu chí đạt</p>
    <p>Đạt: ${pass} · Cần cải thiện: ${improve} · Chưa xác minh: ${unknown} · Không áp dụng: ${na}</p>
    <p>Mỗi tiêu chí áp dụng có cùng trọng số. Chưa xác minh vẫn tính vào mẫu số; không áp dụng được loại khỏi mẫu số.</p>
  </section>
  <h2>Kết quả từng tiêu chí</h2>
  <div class="table-scroll"><table>
    <thead><tr><th scope="col">Tiêu chí</th><th scope="col">Cấu hình ghi nhận</th><th scope="col">Trạng thái</th><th scope="col">Nhận xét / việc cần làm</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>
  <section aria-labelledby="evidence-title"><h2 id="evidence-title">Bằng chứng firmware mô phỏng</h2>${firmware}</section>
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
