---
name: today
description: Sinh bài học hôm nay cho một khoá trong Learning Hub, bám theo roadmap và syllabus. Dùng mỗi ngày khi người dùng muốn học bài mới.
---

Đọc `docs/DESIGN.md` mục 2, 5.2, 5.4 nếu chưa đọc trong phiên này.

Tham số: `[course-id]` (tuỳ chọn, do người dùng cung cấp sau `/today`).

## Các bước

1. **Chọn khoá**: nếu không truyền `course-id`, đọc `courses/*/course.json` để liệt kê các khoá đang có. Nếu chỉ có 1 khoá thì dùng luôn; nếu nhiều hơn 1, hỏi người dùng chọn.

2. **Xác định ngày tiếp theo**: đọc `courses/<course-id>/roadmap.md`. Tìm hàng có trạng thái `todo` đầu tiên theo thứ tự ngày (bỏ qua các hàng đã `done`).
   - Đọc `journal/attempts.jsonl`, lọc các dòng của khoá này, lấy attempt gần nhất. Nếu `score/total < 0.6`, **hỏi người dùng**: học lại bài đó (không tạo bài mới) hay tiếp tục sang bài kế tiếp.
   - Nếu không còn hàng `todo` nào, báo cho người dùng là đã hết roadmap và dừng lại (gợi ý `/review` hoặc `/new-course` cho khoá khác).

3. **Đọc ngữ cảnh** trước khi viết bài:
   - `sources/<course-id>/syllabus.md` — lấy đúng nội dung của các mã syllabus trong hàng roadmap đang làm.
   - Các note `knowledge/<concept-id>.md` tương ứng với cột "Khái niệm" của hàng đó, nếu đã tồn tại (từ khoá này hoặc khoá khác) — để không dạy trùng những gì đã có và để biết nối `[[wikilink]]` tới đâu.

4. **Viết `courses/<course-id>/days/day-NN.json`** theo schema mục 5.2 (`NN` là số ngày, đệm 2 chữ số, ví dụ `day-03.json`):
   - `syllabus_refs` phải khớp đúng mã trong roadmap/syllabus — không thêm nội dung ngoài nguồn (nguyên tắc 1).
   - `concepts` khớp cột "Khái niệm" trong roadmap.
   - `sections`: ít nhất 1 mục `text` (ý chính) và 1 mục `example` (ưu tiên ví dụ từ công việc thật của người dùng — xem mục 1 DESIGN.md: SAP Sales Order/Warehouse/Production Order nếu là ISTQB; ngữ cảnh giao tiếp hằng ngày nếu là tiếng Anh). Thêm `compare` nếu chủ đề có các lỗi hay nhầm lẫn.
   - `quiz`: 4-6 câu, mỗi câu gắn 1 `concept`. **Đáp án đúng luôn đặt ở `options[0]`** — web app tự xáo trộn lúc hiển thị.
   - Nếu là ngày `review` (trạng thái trong roadmap là `review`), tổng hợp quiz từ các mã syllabus của các ngày trước đó thay vì dạy nội dung mới.

5. Chạy `node scripts/build.mjs` để xác nhận không lỗi. **Không** đổi trạng thái hàng roadmap ở bước này — trạng thái chỉ chuyển sang `done` khi người dùng nộp kết quả qua `/done`.

6. **Commit + push lên nhánh `dep`** (xem README mục "Nhánh git"): `learn(<course-id>): day NN – <tiêu đề bài>`.

7. Trả lời ngắn: tên bài, ~số phút, nhắc mở web app (`site/index.html` hoặc link GitHub Pages đã deploy) để học trên điện thoại — vào tab "Hôm nay".
