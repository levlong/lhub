---
name: synthesize-syllabus
description: Dựng syllabus cho một chủ đề KHÔNG có chuẩn/chứng chỉ chính thức (course_type "skill"). Dùng khi /new-course gặp chủ đề dạng kỹ năng, hoặc khi người dùng gọi trực tiếp.
---

Đọc `docs/DESIGN.md` mục 2 (nguyên tắc "Bám nguồn") trước khi làm.

Tham số: `<chủ đề>`.

Khác với `/new-course` (dùng khi ĐÃ có chuẩn rõ ràng như ISTQB), skill này dùng khi **không có syllabus chính thức** — nhiệm vụ là tổng hợp một syllabus hợp lý từ nhiều nguồn cấp thấp hơn, minh bạch về độ tin cậy của từng mục, **không bao giờ bịa trích dẫn**.

## Thứ tự ưu tiên nguồn

Với mỗi mục tiêu học, tìm theo đúng thứ tự này, dừng lại ở tầng đầu tiên có nguồn đủ tốt:

1. **Chuẩn chính thức gần nhất** — dù chủ đề không phải chứng chỉ, có thể có chuẩn liên quan (ví dụ CEFR cho ngôn ngữ, OWASP cho bảo mật web).
2. **Hồ sơ năng lực theo cấp độ** (level profiles) — ví dụ CEFR can-do statements, khung năng lực nghề nghiệp (SFIA, O*NET).
3. **Sách tham khảo uy tín** — trích tên sách/tác giả + chương/mục, diễn giải lại bằng lời riêng, không chép nguyên văn.
4. **Nghiên cứu phương pháp luận** — bài nghiên cứu về cách dạy/học hiệu quả chủ đề này (ví dụ nghiên cứu second-language acquisition).
5. **`sources/<course-id>/mistakes.md`** (nếu người dùng đã có, ghi lại lỗi họ hay gặp) — nguồn cá nhân, ưu tiên thấp nhất, chỉ dùng để bổ sung góc nhìn thực tế.

**Không bao giờ bịa nguồn.** Nếu không tìm được nguồn nào đủ tốt cho một mục tiêu ở cả 5 tầng, vẫn giữ mục tiêu đó nhưng đánh dấu rõ **"Cần xác minh"** thay vì gán một trích dẫn không chắc chắn.

## Các bước

1. Tìm kiếm (WebSearch/WebFetch nếu có quyền) theo thứ tự ưu tiên ở trên cho toàn bộ phạm vi chủ đề. Ghi lại: nguồn dùng cho mỗi mục, tầng ưu tiên (1-5), URL/tên sách nếu có.

2. Tổ chức thành **5-7 module**, mỗi module có **3-6 mục tiêu học**. Mỗi mục tiêu có:
   - **Mã** (ví dụ `SKILL-2.3`).
   - Mô tả ngắn, diễn giải lại bằng lời riêng (không chép nguyên văn nguồn có bản quyền).
   - **Nguồn trích dẫn** kèm tầng ưu tiên đã dùng (hoặc "Cần xác minh" nếu không có).
   - **Cách kiểm tra** (assessment method): quiz trắc nghiệm, tự nói thành tiếng trước khi xem đáp án, làm bài tập thực hành, v.v.

3. Ghi vào `sources/<course-id>/syllabus.md` (cùng định dạng frontmatter như `/new-course` bước 3), thêm 1 mục **"Cần xác minh"** ở cuối liệt kê mọi mục tiêu không có nguồn chắc chắn.

4. Trả lời ngắn: bao nhiêu module, bao nhiêu mục tiêu, bao nhiêu mục "cần xác minh" (nếu có, nói rõ để người dùng biết trước khi học).

`/new-course` gọi skill này ở bước xác định syllabus khi `course_type: "skill"`, rồi tiếp tục dựng roadmap từ file `syllabus.md` vừa tạo.
