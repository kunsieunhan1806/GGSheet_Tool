# GGSheet Tool

Bộ công cụ Google Apps Script chạy trực tiếp trên Google Sheets. Repo hiện có hai ứng dụng độc lập:

- `Analyzer`: phân tích, thống kê và gợi ý bộ số Vietlott cho Mega 6/45 và Power 6/55.
- `OvulationTracker`: theo dõi chu kỳ kinh nguyệt, dự báo ngày rụng trứng và cửa sổ thụ thai.

Tất cả dữ liệu được lưu trong Google Sheet của bạn. Ứng dụng không cần server riêng, database riêng hay bước build frontend.

## Cấu Trúc Thư Mục

```text
GGSheet_Tool/
├── Analyzer/
│   ├── Code.gs
│   ├── Index.html
│   ├── JavaScript.html
│   └── Stylesheet.html
└── OvulationTracker/
    ├── Code.gs
    ├── Index.html
    ├── JavaScript.html
    └── Stylesheet.html
```

## Yêu Cầu

- Tài khoản Google.
- Một Google Sheet riêng cho mỗi ứng dụng bạn muốn chạy.
- Quyền truy cập Google Apps Script trong tài khoản Google đó.

## Cài Đặt Trên Google Apps Script

Làm các bước này riêng cho từng ứng dụng trong `Analyzer` hoặc `OvulationTracker`.

1. Tạo một Google Sheet mới.
2. Vào `Extensions` -> `Apps Script`.
3. Trong Apps Script, tạo các file tương ứng với thư mục ứng dụng:
   - `Code.gs`
   - `Index.html`
   - `JavaScript.html`
   - `Stylesheet.html`
4. Copy nội dung từng file trong repo vào đúng file trên Apps Script.
5. Lưu project.
6. Chạy thử một hàm server nếu Apps Script yêu cầu cấp quyền, sau đó chấp nhận authorization.
7. Vào `Deploy` -> `New deployment` -> chọn `Web app`.
8. Cấu hình:
   - `Execute as`: `Me`.
   - `Who has access`: chọn theo nhu cầu, thường là `Only myself` khi dùng cá nhân.
9. Bấm `Deploy` và mở URL web app được tạo.

## Analyzer

Ứng dụng `Analyzer` hỗ trợ nhập kết quả quay số, thống kê tần suất và tạo bộ số gợi ý cho:

- Mega 6/45.
- Power 6/55.

Tính năng chính:

- Lưu kết quả kỳ quay vào sheet `KetQua`.
- Thống kê tần suất, khoảng vắng xuất hiện và z-score theo cửa sổ 20 kỳ, 50 kỳ hoặc toàn bộ lịch sử.
- Gợi ý bộ số theo các chiến lược `balanced`, `hot`, `cold` và `random`.
- Lưu các bộ số đã tạo vào sheet `BoDaSoSanh`.
- Tự động so sánh bộ số đã lưu với kết quả thực tế khi bạn nhập kết quả kỳ quay.
- Tính tiền vé, tiền thưởng, lãi/lỗ và phân tích theo loại vé/phương pháp.
- Hỗ trợ copy cú pháp mua vé qua MoMo.

Sheet dữ liệu được tạo tự động nếu chưa tồn tại:

- `KetQua`: lưu ngày quay, loại vé, 6 số chính, số đặc biệt và ghi chú.
- `BoDaSoSanh`: lưu bộ số đã tạo, ngày so sánh, kết quả thực tế, số trùng, jackpot và giải thưởng.

Lưu ý: kết quả xổ số là ngẫu nhiên và độc lập. Công cụ này chỉ dùng để thống kê và giải trí, không đảm bảo dự đoán trúng thưởng.

## OvulationTracker

Ứng dụng `OvulationTracker` hỗ trợ ghi nhận chu kỳ kinh nguyệt và dự báo các mốc quan trọng.

Tính năng chính:

- Lưu lịch sử chu kỳ vào sheet `ChuKy`.
- Tính số ngày hành kinh và độ dài chu kỳ.
- Dự báo kỳ kinh tiếp theo theo mốc sớm nhất, khả năng cao và muộn nhất.
- Dự báo ngày rụng trứng và cửa sổ thụ thai.
- Có chế độ `Theo dõi` và `Thụ thai`.
- Hiển thị lịch nhỏ, biểu đồ chu kỳ và lịch sử bản ghi.
- Cảnh báo khi dữ liệu cho thấy chu kỳ không đều.

Lưu ý: các dự báo chỉ mang tính tham khảo, không thay thế tư vấn y khoa. Nếu chu kỳ bất thường kéo dài hoặc bạn cần theo dõi sức khỏe sinh sản chính xác, hãy tham khảo bác sĩ chuyên khoa.

## Cách Sử Dụng Nhanh

Với `Analyzer`:

1. Mở web app.
2. Chọn Mega 6/45 hoặc Power 6/55.
3. Nhập kết quả các kỳ quay đã có.
4. Chọn phương pháp gợi ý và số lượng bộ số.
5. Copy và lưu bộ số nếu muốn theo dõi hiệu quả.
6. Sau khi có kết quả thực tế, nhập kết quả để ứng dụng tự so sánh và cập nhật tab tài chính.

Với `OvulationTracker`:

1. Mở web app.
2. Nhập ngày bắt đầu và ngày kết thúc kỳ kinh.
3. Theo dõi dự báo kỳ kinh tiếp theo, ngày rụng trứng và cửa sổ thụ thai.
4. Tiếp tục cập nhật mỗi chu kỳ để dự báo có thêm dữ liệu lịch sử.

## Ghi Chú Phát Triển

- Backend nằm trong `Code.gs` và sử dụng API của Google Apps Script.
- Frontend là HTML/CSS/JavaScript thuần, được nhúng bằng `HtmlService`.
- Client gọi server thông qua `google.script.run`.
- Repo chưa có cấu hình `.clasp.json`, vì vậy hướng dẫn mặc định là copy thủ công vào Apps Script editor.

