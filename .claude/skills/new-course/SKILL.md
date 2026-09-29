---
name: new-course
description: Tạo một khoá học mới trong Learning Hub - tìm syllabus chính thức, hỏi lịch học, dựng roadmap. Dùng khi người dùng muốn bắt đầu học một chủ đề mới.
---

Đọc `docs/DESIGN.md` trước (đặc biệt mục 2, mục 4, mục 5.5) nếu chưa đọc trong phiên này.

Tham số: `<chủ đề>` do người dùng cung cấp sau lệnh `/new-course`.

## Các bước

1. **Xác định `course-id`**: kebab-case tiếng Anh, ngắn gọn, suy ra từ chủ đề. Nếu `courses/<course-id>/` đã tồn tại, hỏi người dùng có muốn dùng id khác không.

2. **Xác định `course_type`** (mục 5.5 DESIGN.md): `certification` (có chuẩn/tổ chức cấp chứng chỉ, ví dụ ISTQB) hay `skill` (kỹ năng không có syllabus chính thức, ví dụ "tư duy tiếng Anh"). Nếu là `skill` và không có nguồn rõ ràng người dùng chỉ định, **gọi skill `/synthesize-syllabus <chủ đề>`** để dựng syllabus thay vì tự bịa.

3. **Tìm/dựng syllabus**:
   - `certification`: ưu tiên trang của tổ chức cấp chứng chỉ/chuẩn hoặc tài liệu gốc người dùng cung cấp. Không tìm được nguồn đáng tin cậy → hỏi người dùng cung cấp link/tài liệu, không tự bịa (nguyên tắc 1).
   - `skill`: dùng kết quả từ `/synthesize-syllabus`, hoặc nguồn người dùng chỉ định thẳng (ví dụ một file tham khảo đã duyệt).
   - Ghi vào `sources/<course-id>/syllabus.md`: frontmatter `course`, `source_title`, `source_url`, `version`, `accessed`. Danh sách mục tiêu học, mỗi mục có **mã** + **mô tả ngắn diễn giải lại bằng lời riêng** (không chép nguyên văn tài liệu có bản quyền — chỉ giữ mã mục, số hiệu, và tóm tắt ý, không copy nguyên đoạn dài).
   - Nếu nguồn có ghi **thời lượng gợi ý** cho từng mục/chương (nhiều syllabus chứng chỉ có, ví dụ "K2, 180 phút"), ghi lại số phút đó cạnh mã mục — dùng để chia ngày ở bước 5 thay vì chia đều.

4. **Hỏi người dùng** (dùng AskUserQuestion nếu có thể, gộp thành ít câu hỏi): ngày bắt đầu (mặc định hôm nay), số phút học mỗi ngày, số ngày học mỗi tuần, hạn chót (nếu có), ngôn ngữ giải thích (mặc định tiếng Việt), bối cảnh ví dụ ưu tiên (ví dụ "SAP ERP" cho ISTQB — mục 5.5 `example_context`).

5. **Kiểm tra khả thi nếu có hạn chót**: số ngày học khả dụng ≈ số tuần từ `start_date` đến `deadline` × `days_per_week`. Ước lượng số ngày cần dựa trên tổng thời lượng syllabus (dùng thời lượng gợi ý ở bước 3 nếu có, nếu không thì mỗi mục tiêu ước lượng 1 ngày) chia cho `minutes_per_day`. Nếu số ngày cần > số ngày khả dụng, báo người dùng ngay và hỏi: rút gọn phạm vi, tăng phút/ngày, tăng ngày/tuần, hay dời hạn chót — **đừng âm thầm dựng một roadmap không kịp**.

6. **Trước khi gán "Khái niệm" cho từng mục**, kiểm tra `knowledge/*.md` xem đã có note nào cùng nghĩa từ khoá khác chưa (đọc `site/data/knowledge.json` nếu mới build, hoặc quét tên file/tiêu đề). Nếu có, **dùng lại đúng id đó**, đừng tạo id gần giống rồi trùng khái niệm.

7. **Dựng `courses/<course-id>/roadmap.md`** theo schema mục 5.4: chia mục tiêu theo ngày (ưu tiên trọng số thời lượng nếu có ở bước 3), cứ 6 ngày học thì chèn 1 ngày `review`, tuần cuối dành ôn thi thử nếu là `certification` có hạn chót. Mọi hàng bắt đầu `todo`. Frontmatter `start_date`, `minutes_per_day`, `days_per_week` khớp `course.json`.

8. **Tạo `courses/<course-id>/course.json`** theo schema 5.5: `id`, `title`, `course_type`, `level_from`, `level_to` (nếu áp dụng, ví dụ CEFR B1→B2; để `null` nếu không có thang trình độ rõ ràng), `start_date`, `minutes_per_day`, `days_per_week`, `deadline` (hoặc `null`), `explanation_language`, `example_context`, `quiz_size` (mặc định theo gợi ý — xem `scripts/next-day.mjs`, có thể để trống và để script tự tính theo `minutes_per_day`).

9. Chạy `node scripts/validate.mjs courses/<course-id>/roadmap.md` rồi `node scripts/build.mjs` để xác nhận không lỗi.

10. **Commit + push lên nhánh `dep`**: `learn(<course-id>): thêm khoá học mới - roadmap N ngày`.

11. Trả lời ngắn gọn: tên khoá, tổng số ngày, ngày bắt đầu, ngày dự kiến hoàn thành (so với hạn chót nếu có). Gợi ý chạy `/today <course-id>`.
