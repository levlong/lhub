---
name: new-course
description: Tạo một khoá học mới trong Learning Hub - tìm syllabus chính thức, hỏi lịch học, dựng roadmap. Dùng khi người dùng muốn bắt đầu học một chủ đề mới.
---

Đọc `docs/DESIGN.md` trước (đặc biệt mục 2 "Nguyên tắc bắt buộc" và mục 4 "Cấu trúc repo") nếu chưa đọc trong phiên này.

Tham số: `<chủ đề>` do người dùng cung cấp sau lệnh `/new-course`.

## Các bước

1. **Xác định `course-id`**: kebab-case tiếng Anh, ngắn gọn, suy ra từ chủ đề (ví dụ "ISTQB CTFL" → `istqb-ctfl`). Nếu `courses/<course-id>/` đã tồn tại, hỏi người dùng có muốn dùng id khác không.

2. **Tìm syllabus chính thức**: ưu tiên trang của tổ chức cấp chứng chỉ/chuẩn (ví dụ istqb.org cho ISTQB) hoặc tài liệu gốc người dùng cung cấp. Nếu không tìm được nguồn đáng tin cậy hoặc không có quyền truy cập mạng, **hỏi người dùng** cung cấp link hoặc dán nội dung — không tự bịa mục tiêu học (nguyên tắc 1: bám nguồn).
   Ghi vào `sources/<course-id>/syllabus.md`:
   - Frontmatter: `course`, `source_title`, `source_url`, `version`, `accessed` (ngày hôm nay).
   - Danh sách đầy đủ mục tiêu học, mỗi mục có **mã** (ví dụ `FL-4.2.2`) và mô tả ngắn.

3. **Hỏi người dùng** (dùng AskUserQuestion nếu có thể, gộp thành ít câu hỏi):
   - Ngày bắt đầu (mặc định: hôm nay).
   - Số phút học mỗi ngày.
   - Số ngày học mỗi tuần.
   - Hạn chót, nếu có (ví dụ ngày thi).

4. **Dựng `courses/<course-id>/roadmap.md`** theo schema mục 5.4 của DESIGN.md:
   - Chia toàn bộ mục tiêu học trong syllabus thành các ngày, lượng kiến thức mỗi ngày vừa với số phút/ngày đã chọn.
   - Cứ 6 ngày học thì chèn 1 ngày ôn tập (trạng thái `review`, chủ đề "Ôn tập" tổng hợp các mã syllabus của 6 ngày trước).
   - Nếu là khoá thi chứng chỉ (có hạn chót), dành tuần cuối cho ôn thi thử.
   - Mọi hàng đều bắt đầu ở trạng thái `todo`.
   - Frontmatter: `start_date`, `minutes_per_day`, `days_per_week` (khớp với `course.json`).

5. **Tạo `courses/<course-id>/course.json`** theo schema mục 5.2 phần đầu: `id`, `title`, `start_date`, `minutes_per_day`, `days_per_week`.

6. Chạy `node scripts/build.mjs` để xác nhận không lỗi (roadmap parse được).

7. **Commit + push lên nhánh `dep`** (nguyên tắc 5; xem README mục "Nhánh git" — nội dung khoá học đi thẳng vào `dep` để `/today` chạy tiếp trên đó được): `learn(<course-id>): thêm khoá học mới - roadmap N ngày`.

8. Trả lời ngắn gọn: tên khoá, tổng số ngày, ngày bắt đầu, ngày dự kiến hoàn thành. Gợi ý chạy `/today <course-id>` để sinh bài đầu tiên.
