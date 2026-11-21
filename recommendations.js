(function () {
  'use strict';

  const { assess, STATUS } = typeof module !== 'undefined' && module.exports
    ? require('./audit.js') : globalThis.WifiAudit;
  const PRIORITIES = Object.freeze({ Cao: 0, 'Trung bình': 1, Thấp: 2 });
  const entry = (priority, risk, action) => Object.freeze({ priority, risk, action });
  const DATA = Object.freeze({
    C1: Object.freeze({
      improve: entry('Trung bình',
        'Chế độ hiện tại chưa đáp ứng mục tiêu WPA3 của bảng kiểm. Việc chuyển chế độ cần tính đến thiết bị cũ để tránh mất kết nối.',
        'Kiểm tra khả năng hỗ trợ của router và thiết bị; chọn WPA3-Personal khi tương thích. Nếu cần giữ WPA2 AES/CCMP, ghi rõ lý do và thời điểm xem lại.'),
      unknown: entry('Trung bình',
        'Chưa có dữ liệu để xác định chế độ bảo mật. Thiếu thông tin chưa đủ để kết luận mạng an toàn hay không an toàn.',
        'Đối chiếu mục bảo mật Wi-Fi trong giao diện quản trị được phép truy cập; ghi lại chế độ đang dùng rồi cập nhật hồ sơ mô phỏng.'),
    }),
    C2: Object.freeze({
      improve: entry('Cao',
        'WPS đang bật, duy trì thêm một cơ chế ghép nối cần được kiểm soát. Nếu không sử dụng, tính năng này làm tăng bề mặt cần bảo vệ.',
        'Trong mục WPS của router thuộc phạm vi quản trị, tắt WPS và lưu cấu hình; kiểm tra lại trạng thái sau khi áp dụng.'),
      unknown: entry('Trung bình',
        'Chưa xác định WPS có đang hoạt động hay không. Không thể xác nhận cơ chế ghép nối nhanh đã được tắt.',
        'Kiểm tra mục WPS trong giao diện quản trị và trạng thái sau khi lưu; khai báo Bật hoặc Tắt theo bằng chứng.'),
    }),
    C3: Object.freeze({
      improve: entry('Trung bình',
        'PMF chưa bắt buộc nên hồ sơ chưa bảo đảm yêu cầu bảo vệ khung quản lý của cấu hình mục tiêu.',
        'Kiểm tra hỗ trợ PMF của các thiết bị; chọn PMF bắt buộc khi tương thích và thử lại kết nối của các thiết bị được phép.'),
      unknown: entry('Trung bình',
        'Chưa rõ chế độ PMF nên mức bảo vệ khung quản lý chưa được xác nhận.',
        'Tra mục PMF hoặc Protected Management Frames trong cấu hình Wi-Fi; ghi nhận chế độ và khả năng hỗ trợ trước khi chọn bắt buộc.'),
    }),
    C4: Object.freeze({
      improve: entry('Cao',
        'Hồ sơ ghi mạng khách chưa cách ly khỏi LAN chính. Thiết bị khách có thể tiếp cận tài nguyên nội bộ ngoài nhu cầu sử dụng Internet.',
        'Nếu vẫn cần mạng khách, bật cách ly khỏi LAN hoặc tắt quyền truy cập intranet; kiểm tra bằng thiết bị khách được phép. Chỉ tắt mạng khách nếu thực sự không dùng.'),
      unknown: entry('Trung bình',
        'Chưa đủ thông tin về mạng khách hoặc chiều truy cập vào LAN. Chưa thể xác nhận ranh giới giữa khách và tài nguyên nội bộ.',
        'Xác nhận mạng khách bật hay tắt; nếu bật, kiểm tra lựa chọn cách ly khỏi LAN và ghi lại bằng chứng từ thiết bị được phép.'),
    }),
    C5: Object.freeze({
      improve: entry('Cao',
        'Quản trị từ Internet đang bật, mở thêm đường truy cập tới chức năng quản lý router. Cần giới hạn theo nhu cầu và cơ chế xác thực.',
        'Tắt quản trị từ Internet nếu không cần và kiểm tra cấu hình đã lưu. Nếu có nhu cầu, giới hạn nguồn truy cập, xác nhận xác thực mạnh và ghi rõ ngoại lệ.'),
      unknown: entry('Cao',
        'Chưa xác định có cho phép quản trị từ Internet hay không. Phạm vi truy cập tới chức năng quản lý chưa được xác minh.',
        'Kiểm tra mục Remote Management hoặc WAN Administration trong giao diện quản trị; ghi lại trạng thái và chỉ giữ bật khi có nhu cầu được phê duyệt.'),
    }),
    C6: Object.freeze({
      improve: entry('Cao',
        'Bằng chứng ghi nhận firmware cần xử lý hoặc thiết bị hết hỗ trợ. Các bản sửa lỗi phù hợp có thể chưa được áp dụng hoặc không còn được cung cấp.',
        'Đối chiếu đúng model và phần cứng trên nguồn chính thức; sao lưu cấu hình và cập nhật bản phù hợp theo hướng dẫn nhà sản xuất. Với thiết bị hết hỗ trợ, lập kế hoạch thay thế và ghi nhận lại bằng chứng.'),
      unknown: entry('Trung bình',
        'Thiếu hoặc mâu thuẫn bằng chứng firmware nên chưa thể xác nhận tình trạng cập nhật. Không suy ra đã cập nhật chỉ từ phiên bản khớp.',
        'Bổ sung model, phần cứng, phiên bản đang dùng và đối chiếu, nguồn, mốc kiểm tra, trạng thái hỗ trợ cùng maintenanceStatus. Trong demo, chọn bản ghi xác minh của chính hồ sơ; lựa chọn này không cập nhật router thật.'),
    }),
  });

  function buildTodo(config = {}) {
    return assess(config).results
      .filter(result => result.status === STATUS.IMPROVE || result.status === STATUS.UNKNOWN)
      .map(result => ({ id: result.id, title: result.title, status: result.status,
        label: result.label, ...DATA[result.id][result.status] }))
      .sort((a, b) => PRIORITIES[a.priority] - PRIORITIES[b.priority] || a.id.localeCompare(b.id));
  }

  const api = Object.freeze({ DATA, PRIORITIES, buildTodo });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globalThis.WifiRecommendations = api;
})();
