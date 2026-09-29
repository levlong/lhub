---
name: today
description: Sinh bài học hôm nay cho một khoá trong Learning Hub, bám theo roadmap và syllabus. Dùng mỗi ngày khi người dùng muốn học bài mới.
---

Đọc `docs/DESIGN.md` mục 2, 5.2, 5.4, 5.5 nếu chưa đọc trong phiên này.

Tham số: `[course-id]` (tuỳ chọn, do người dùng cung cấp sau `/today`).

## Các bước

1. **Chọn khoá**: nếu không truyền `course-id`, đọc `courses/*/course.json` để liệt kê các khoá đang có. Nếu chỉ có 1 khoá thì dùng luôn; nếu nhiều hơn 1, hỏi người dùng chọn.

2. **Chạy script** để biết chính xác phải làm gì, không tự suy luận:
   ```
   node scripts/next-day.mjs <course-id>
   ```
   Kết quả JSON có: `nextRow` (hàng roadmap tiếp theo còn `todo`, hoặc `null`), `alreadyExists` + `existingFile`, `suggestRetry` (bài gần nhất dưới 60%, đã tự loại các lần làm bài ôn tập), `quizSizeHint` (số câu quiz nên dùng, tính theo `minutes_per_day`), `doneAllRoadmap`.

3. **Xử lý theo kết quả**:
   - `doneAllRoadmap: true` → báo người dùng đã hết roadmap, gợi ý `/review` hoặc `/new-course` cho khoá khác. Dừng lại.
   - `alreadyExists: true` → **không được ghi đè** file đó. Báo người dùng bài này đã có sẵn (`existingFile`), hỏi họ có muốn mở lại bài cũ hay có ý khác không. Dừng lại.
   - `suggestRetry` khác `null` → hỏi người dùng: học lại bài đó (không tạo bài mới) hay tiếp tục sang `nextRow`.
   - Ngược lại → viết bài cho `nextRow`.

4. **Đọc ngữ cảnh** trước khi viết bài:
   - `sources/<course-id>/syllabus.md` — lấy đúng nội dung của các mã trong `nextRow.syllabus_refs`.
   - Các note `knowledge/<concept-id>.md` tương ứng `nextRow.concepts`, nếu đã tồn tại (từ khoá này hoặc khoá khác) — để không dạy trùng và biết nối `[[wikilink]]` tới đâu.

5. **Viết `courses/<course-id>/days/day-NN.json`** theo schema mục 5.2 (`NN` = `nextRow.day` đệm 2 chữ số):
   - `syllabus_refs`, `concepts` khớp đúng `nextRow` — không thêm nội dung ngoài nguồn (nguyên tắc 1).
   - `sections`: ít nhất 1 mục `text` và 1 mục `example` (ưu tiên ví dụ thật từ bối cảnh người dùng — xem `example_context` trong `course.json` nếu có, mục 5.5 DESIGN.md). Thêm `compare` nếu chủ đề có lỗi hay nhầm lẫn.
   - `quiz`: số câu bám theo `quizSizeHint` (không cố định 4-6 nữa — bài ít phút thì ít câu hơn). Mỗi câu gắn 1 concept trong `nextRow.concepts`. **Đáp án đúng luôn đặt ở `options[0]`**.
   - Nếu `nextRow.status` là `review` (mốc ôn tập trong roadmap gốc, khác với bài ôn `/review` tự sinh), tổng hợp quiz từ các mã syllabus của các ngày trước thay vì dạy nội dung mới.

6. Chạy `node scripts/validate.mjs courses/<course-id>/days/day-NN.json` rồi `node scripts/build.mjs` để chắc chắn không lỗi. **Không** đổi trạng thái roadmap ở bước này — chỉ `/done` mới chuyển sang `done`.

7. **Commit + push lên nhánh `dep`**: `learn(<course-id>): day NN – <tiêu đề bài>`.

8. Trả lời ngắn: tên bài, ~số phút, nhắc mở web app để học trên điện thoại — vào tab "Hôm nay".
