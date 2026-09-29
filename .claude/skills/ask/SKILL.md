---
name: ask
description: Hỏi đáp dựa trên những gì đã học (knowledge/ và journal/), không phải hỏi chung chung. Dùng khi người dùng hỏi kiểu "mình đã học gì về X", "mình hay sai chỗ nào về Y".
---

Tham số: `<câu hỏi>`.

## Các bước

1. **Tìm trong `knowledge/*.md` trước** (hoặc `site/data/knowledge.json` nếu mới build): note nào có `title`/`tags`/nội dung liên quan tới câu hỏi.

2. Nếu câu hỏi liên quan tới lịch sử học (ví dụ "mình học X ngày nào", "hôm đó mình sai gì"), tìm thêm trong `journal/*.md` và `journal/attempts.jsonl`.

3. **Trả lời dựa trên những gì tìm được**, luôn **nêu tên note/ngày journal làm nguồn** (ví dụ "theo note `boundary-value-analysis`..."). Nếu có nhiều note liên quan, tổng hợp lại thay vì chỉ trích 1 note.

4. Nếu không tìm thấy gì trong `knowledge/`/`journal/` liên quan tới câu hỏi, nói rõ điều đó, rồi hỏi người dùng có muốn nghe câu trả lời từ kiến thức chung (ngoài knowledge lake) không. Nếu trả lời bằng kiến thức ngoài, **nói rõ đó là kiến thức ngoài**, không lẫn với nội dung đã học.
