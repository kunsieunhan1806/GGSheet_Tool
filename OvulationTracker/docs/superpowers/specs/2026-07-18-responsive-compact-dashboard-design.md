# Thiết kế Dashboard theo dõi chu kỳ cô đọng và responsive

**Ngày:** 2026-07-18

**Phạm vi:** `OvulationTracker/Index.html`, `OvulationTracker/Stylesheet.html`, `OvulationTracker/JavaScript.html`, `OvulationTracker/Code.gs`

## 1. Mục tiêu

Làm lại giao diện theo hướng **Dashboard cô đọng**, dễ đọc trên cả máy tính và điện thoại, trong khi giữ nguyên thuật toán dự báo và dữ liệu Google Sheets hiện có.

Kết quả cần đạt:

- Người dùng nhìn thấy trạng thái hôm nay và mốc tiếp theo ngay khi mở ứng dụng.
- Các mốc kỳ kinh, rụng trứng và cửa sổ thụ thai dễ quét, không lặp thông tin quá nhiều.
- Lịch tháng vẫn nằm trong luồng chính.
- Thống kê chuyên sâu và biểu đồ mặc định được thu gọn.
- Form nhập và lịch sử thuận tiện trên máy tính nhưng không làm màn hình điện thoại quá dài.
- Toàn bộ tiếng Việt hiển thị đúng UTF-8.

## 2. Ngoài phạm vi

- Không thay đổi công thức tính chu kỳ, rụng trứng, cửa sổ thụ thai, độ tin cậy hoặc lọc outlier.
- Không thay đổi cấu trúc sheet, tên sheet hoặc hợp đồng dữ liệu giữa Apps Script và trình duyệt.
- Không thêm thư viện, framework, API hoặc dịch vụ bên ngoài.
- Không thêm tính năng y khoa hoặc thu thập dữ liệu mới.

## 3. Hướng thiết kế đã chọn

Ba hướng đã được cân nhắc:

1. Chỉ làm mới CSS: rủi ro thấp nhưng không giải quyết được chiều dài và sự phân tán thông tin.
2. Tái cấu trúc Dashboard, giữ backend, thu gọn phân tích chi tiết: cân bằng tốt nhất giữa trải nghiệm và độ an toàn.
3. Viết lại toàn bộ UI: linh hoạt nhưng thay đổi quá lớn so với mục tiêu.

Chọn hướng 2. Giao diện dùng Dashboard cô đọng với một thẻ trạng thái nổi bật, các thẻ mốc nhỏ, lịch tháng và vùng phân tích có thể mở rộng.

## 4. Kiến trúc giao diện

### 4.1 Header

- Header thấp và nhẹ hơn giao diện hiện tại.
- Bên trái là biểu tượng, tên ứng dụng và một dòng mô tả ngắn.
- Bên phải là nút làm mới có nhãn truy cập rõ ràng.
- Bộ chuyển “Theo dõi / Thụ thai” đặt gần đầu Dashboard, không cạnh tranh với thương hiệu.

### 4.2 Dashboard dự báo

Thứ tự ưu tiên nội dung:

1. **Thẻ trạng thái hôm nay:** ngày thứ mấy của chu kỳ hoặc trạng thái cửa sổ thụ thai; mốc kế tiếp và đếm ngược là nội dung nổi bật nhất.
2. **Cụm mốc quan trọng:** kỳ kinh tiếp theo, rụng trứng và cửa sổ thụ thai. Mỗi mốc có một màu ngữ nghĩa riêng nhưng cùng hệ thống kiểu chữ và khoảng cách.
3. **Cảnh báo chu kỳ không đều:** chỉ xuất hiện khi cần; nội dung chính luôn nhìn thấy, phần tư vấn bổ sung ngắn gọn hơn.
4. **Lịch tháng:** nằm ngay sau các mốc chính, kèm chú giải gọn.
5. **Phân tích chi tiết:** dùng phần tử native `<details>` có thể điều khiển bằng bàn phím. Bên trong gồm độ tin cậy, min/median/max, ghi chú dự báo và biểu đồ chu kỳ.

Các dải ngày sớm nhất, khả năng cao và muộn nhất vẫn được giữ nhưng trình bày gọn hơn. Mốc “khả năng cao” có độ nổi bật lớn nhất; hai biên còn lại dùng kiểu trung tính.

### 4.3 Form nhập và lịch sử

- Form giữ ba trường hiện có, gom trong một thẻ rõ ràng.
- Nút lưu là hành động chính; nút xóa form là hành động phụ.
- Thông báo thành công/lỗi hiển thị ngay trong thẻ form.
- Danh sách lịch sử dùng hàng cô đọng, ưu tiên ngày và số ngày; thông tin phụ xuống dòng khi màn hình hẹp.
- Nút xóa có nhãn truy cập và vẫn yêu cầu xác nhận.

## 5. Responsive

### Máy tính và cửa sổ Google Sheets

- Từ 768 px trở lên, nội dung dùng lưới hai cột.
- Dashboard chiếm khoảng hai phần ba chiều rộng.
- Cột phải chứa form nhập và toàn bộ lịch sử đã ghi; không tự ý cắt bớt bản ghi.
- Cột phải căn theo đầu Dashboard; phần lịch sử tiếp tục theo chiều dọc mà không tạo khoảng trống bất thường.
- Kích thước tối đa của ứng dụng tăng vừa phải để lịch và thẻ ngày không bị chật trong dialog 900×700 hoặc trình duyệt rộng hơn.

### Điện thoại

- Mỗi khu vực Dự báo, Nhập mới và Lịch sử là một màn hình riêng.
- Thanh điều hướng cố định phía dưới thay cho tab trên cùng, có khoảng đệm an toàn cho thiết bị có vùng home indicator.
- Header, thẻ, lịch và nút dùng kích thước chạm tối thiểu khoảng 44 px.
- Các dải ngày ba cột được phép chuyển sang bố cục phù hợp hơn ở màn hình rất hẹp, không tràn ngang.

## 6. Hệ thống hình ảnh

- Nền chính là trắng kem/hồng rất nhạt; bề mặt thẻ dùng trắng hoặc màu ngữ nghĩa có độ bão hòa thấp.
- Hồng là màu thương hiệu và kỳ kinh; tím dành cho rụng trứng; xanh ngọc dành cho cửa sổ thụ thai; cam dành cho cảnh báo hoặc dữ liệu cần chú ý.
- Giảm gradient, viền trái nhiều màu và bóng đổ mạnh. Chỉ thẻ trạng thái chính được phép có nền nhấn rõ.
- Dùng một thang khoảng cách và bán kính nhất quán qua CSS custom properties.
- Tăng tương phản chữ phụ, trạng thái focus và dark mode so với phiên bản hiện tại.
- Hiệu ứng chỉ gồm fade/translate nhẹ và phải tôn trọng `prefers-reduced-motion`.

## 7. Tương tác và trạng thái

- Chế độ “Theo dõi / Thụ thai” tiếp tục lưu bằng `localStorage` khi khả dụng.
- Mở/đóng phân tích chi tiết không làm mất dữ liệu hoặc gọi lại server.
- Khi tải hoặc lưu, overlay và trạng thái bận vẫn xuất hiện; nút gửi bị vô hiệu hóa cho tới khi yêu cầu kết thúc để tránh thao tác lặp.
- Khi không có dữ liệu, empty state hướng người dùng tới màn hình Nhập mới.
- Lỗi từ `google.script.run` được hiển thị tại khu vực phù hợp; overlay luôn được đóng kể cả khi render thất bại.
- Nội dung động và dữ liệu người dùng được gán bằng `textContent` hoặc tạo bằng DOM API; không ghép dữ liệu người dùng vào `innerHTML`.

## 8. Dữ liệu và backend

Luồng dữ liệu không đổi:

1. Trình duyệt gọi `getCycleData()`.
2. `Code.gs` đọc sheet, trả `{ records, forecast }`.
3. `JavaScript.html` lưu dữ liệu vào state và render Dashboard, lịch, biểu đồ, lịch sử.
4. Thêm hoặc xóa bản ghi gọi Apps Script hiện có, sau đó render lại dữ liệu trả về.

`Code.gs` chỉ thay đổi ở những điểm liên quan trực tiếp tới giao diện:

- Chuẩn hóa chuỗi tiếng Việt bị lỗi mã hóa.
- Sửa tên template/include khớp chính xác với `Index.html` và `Stylesheet.html`.
- Không sửa logic tính toán hoặc tên hàm được client gọi.

## 9. Phân chia thay đổi theo file

### `Index.html`

- Sắp xếp lại markup theo cấu trúc Dashboard mới.
- Thêm vùng phân tích mở rộng và điều hướng mobile.
- Chuẩn hóa semantic HTML, ARIA, tiêu đề, nhãn nút và tiếng Việt.
- Giữ các ID dữ liệu cần thiết hoặc cập nhật đồng bộ với JavaScript.

### `Stylesheet.html`

- Viết lại design tokens, lưới responsive, thẻ, điều hướng, trạng thái và dark mode.
- Bổ sung breakpoint cho màn hình hẹp và máy tính.
- Bổ sung focus-visible, reduced motion và safe-area cho điều hướng mobile.

### `JavaScript.html`

- Cập nhật selector và render theo markup mới.
- Giữ nguyên state, lời gọi Apps Script và logic ngày tháng.
- Bổ sung điều hướng mobile, trạng thái mở rộng và ARIA cần thiết.
- Chuẩn hóa toàn bộ chuỗi tiếng Việt.

### `Code.gs`

- Giữ nguyên thuật toán và API.
- Chuẩn hóa tiếng Việt và sửa casing tên template/include.

## 10. Khả năng truy cập

- Tất cả nút chỉ có biểu tượng phải có `aria-label` và `title` phù hợp.
- Tab/điều hướng phản ánh trạng thái hiện tại bằng ARIA.
- Focus bàn phím rõ trên nút, input, tab và phần tử mở rộng.
- Màu sắc không phải tín hiệu duy nhất; nhãn văn bản vẫn mô tả từng loại ngày.
- Thông báo trạng thái form dùng vùng live phù hợp.
- Thứ tự DOM phải hợp lý ngay cả khi CSS đổi vị trí trên màn hình lớn.

## 11. Kiểm thử và xác nhận

### Kiểm tra tĩnh

- JavaScript phía client và Apps Script không có lỗi cú pháp.
- Mọi selector/ID mà JavaScript dùng đều tồn tại trong HTML.
- Tên `Index`, `Stylesheet` và `JavaScript` khớp chính xác trong các lệnh include/template.
- Không còn chuỗi mojibake phổ biến như `Ã`, `Ä`, `Æ`, `â€` hoặc ký tự emoji bị hỏng trong bốn file.

### Kiểm tra hành vi

- Tải dữ liệu thành công, lỗi và trường hợp không có dữ liệu đều có giao diện đúng.
- Chuyển chế độ Theo dõi/Thụ thai cập nhật thẻ chính và thứ tự ưu tiên.
- Chuyển màn hình mobile, mở phân tích, đổi tháng lịch, lưu form và xóa bản ghi hoạt động.
- Overlay luôn đóng sau thành công hoặc thất bại.

### Kiểm tra trực quan

- Kiểm tra ít nhất ở chiều rộng điện thoại khoảng 390 px, dialog 900×700 và desktop rộng.
- Không có nội dung tràn ngang, nút chồng nhau hoặc văn bản bị cắt.
- Light mode và dark mode đều đọc rõ.
- Nội dung chính xuất hiện trong phần đầu màn hình và phân tích chi tiết mặc định đóng.

## 12. Tiêu chí hoàn thành

- Giao diện khớp hướng Dashboard cô đọng đã duyệt.
- Responsive tốt trên máy tính và điện thoại.
- Phân tích chi tiết mặc định thu gọn nhưng vẫn truy cập đầy đủ.
- Chức năng thêm, xóa, làm mới, đổi chế độ, lịch và dự báo không bị mất.
- Thuật toán backend và cấu trúc sheet không thay đổi.
- Tiếng Việt hiển thị đúng trong toàn bộ bốn file.
- Các kiểm tra tĩnh, hành vi và trực quan nêu trên đạt yêu cầu.
