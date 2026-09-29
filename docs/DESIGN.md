# Learning Hub: bản thiết kế

> File này ghi lại các quyết định đã chốt trong buổi thảo luận thiết kế. Claude Code đọc file này **trước khi làm bất cứ việc gì**. Nếu thấy chỗ nào mâu thuẫn hoặc thiếu, hãy hỏi người dùng, không tự đoán.

## 1. Mục tiêu

Một hệ thống tự học hằng ngày, quản lý bằng GitHub và Claude Code:

1. Người dùng chọn một chủ đề. Claude tìm **syllabus chính thức** rồi dựng **lộ trình** (chương → ngày).
2. Mỗi ngày Claude sinh **một bài học kèm quiz**, bám theo lộ trình và syllabus.
3. Người dùng học trên **điện thoại** qua một web app tĩnh (GitHub Pages hoặc Cloudflare Pages).
4. Kết quả học quay về repo. Kiến thức tích luỹ thành một **knowledge lake** cá nhân, dùng chung giữa các khoá.

Người dùng: Long, người Việt, làm test automation (SAP ERP), đang học ISTQB, tiếng Anh giao tiếp, AI agent (LangChain/OpenAI). Thích nội dung **trực quan, tương tác, thực hành**. Nội dung giải thích viết bằng **tiếng Việt**, thuật ngữ giữ tiếng Anh.

## 2. Nguyên tắc bắt buộc

1. **Bám nguồn.** Mọi bài học chỉ dạy những gì có trong `sources/`. Mỗi bài và mỗi note knowledge phải ghi rõ mục syllabus (ví dụ mã mục tiêu học ISTQB `FL-4.2.2`). Không có nguồn thì không dạy, mà ghi vào mục "Cần xác minh".
2. **Markdown là nguồn gốc của knowledge và journal.** File trong `site/data/` là **bản dựng ra** bằng script, không sửa tay.
3. **Journal chỉ ghi thêm (append-only).** Không sửa lịch sử. Tiến độ và điểm số phải tính lại được từ `journal/attempts.jsonl`.
4. **Không phụ thuộc công cụ.** Knowledge là Markdown thuần, có YAML frontmatter và `[[wikilink]]`, đọc được bằng VS Code + Foam, Logseq, Obsidian (bản miễn phí) hoặc GitHub. Không dùng dịch vụ trả phí.
5. **Mỗi lệnh xong đều commit** với message rõ ràng, ví dụ `learn(istqb-ctfl): day 03 – boundary value analysis`.
6. **Không có backend** ở giai đoạn đầu. Tiến độ trên điện thoại quay về repo bằng cơ chế copy/dán (mục 6).

## 3. Kiến trúc dữ liệu: 3 lớp

```
1. SOURCES   (sources/)    nguồn chính thức: syllabus, trích tài liệu, link. Ít thay đổi.
      ▼
2. JOURNAL   (journal/)    nhật ký: đã học gì, khi nào, quiz đúng/sai. Chỉ ghi thêm.
      ▼   /done tách khái niệm
3. KNOWLEDGE (knowledge/)  mỗi khái niệm là 1 note, nối bằng [[link]], dùng chung mọi khoá.
```

Lộ trình và bài học (`courses/`) là **nội dung giảng dạy**, trỏ tới các note trong `knowledge/`.

## 4. Cấu trúc repo

```
learning-hub/
├── CLAUDE.md                        # tóm tắt luật chơi, trỏ về docs/DESIGN.md
├── config.json                      # cấu hình dùng chung (tên nhánh git...) - xem mục 6
├── docs/
│   ├── DESIGN.md                    # file này
│   └── reference/think-in-english.html   # mẫu giao diện đã được duyệt
├── .claude/skills/
│   ├── new-course/SKILL.md
│   ├── today/SKILL.md
│   ├── done/SKILL.md
│   ├── review/SKILL.md
│   ├── synthesize-syllabus/SKILL.md
│   ├── status/SKILL.md
│   └── ask/SKILL.md
├── sources/<course-id>/
│   ├── syllabus.md                  # nguồn, version, URL, danh sách mục tiêu học
│   └── *.md                         # trích dẫn thêm (nếu cần)
├── courses/<course-id>/
│   ├── course.json                  # metadata khoá (schema mục 5.5)
│   ├── roadmap.md                   # chương → ngày, kèm mã syllabus
│   └── days/day-01.json ...         # bài học từng ngày (schema mục 5.2)
├── journal/
│   ├── YYYY-MM-DD.md                # nhật ký ngày
│   └── attempts.jsonl               # mỗi dòng là 1 lần làm quiz
├── knowledge/<concept-id>.md        # note khái niệm (schema mục 5.1)
├── scripts/
│   ├── lib/
│   │   ├── frontmatter.mjs          # parse/ghi frontmatter, giữ nguyên dòng không đụng tới
│   │   ├── schema.mjs               # validateDay, parseRoadmap, updateRoadmapStatus, quizzedConcepts
│   │   └── srs.mjs                  # toán ôn tập ngắt quãng (interval, ngày giờ VN, chọn note để ôn)
│   ├── build.mjs                    # courses/ + knowledge/ → site/data/*.json
│   ├── validate.mjs                 # validate 1 file hoặc cả repo (dùng bởi skills trước khi commit)
│   ├── next-day.mjs                 # /today: ngày kế tiếp, có ghi đè không, có nên đề xuất học lại
│   ├── record-attempt.mjs           # /done: toàn bộ sổ sách - chống trùng, SRS, journal, roadmap
│   └── select-review.mjs            # /review: chọn note đến hạn, cap theo quiz_size, gán 1 khoá/note
├── site/                            # web app tĩnh
│   ├── index.html
│   └── data/                        # BẢN DỰNG RA, không sửa tay (có thể .gitignore và build trong CI)
└── .github/workflows/deploy.yml     # build + deploy
```

Nguyên tắc phân công: **script lo sổ sách (parse, toán interval, cập nhật roadmap/trạng thái, chống trùng), Claude chỉ viết nội dung** (bài học, note kiến thức, diễn giải). Xem chi tiết từng script trong chính file `.mjs` (docstring đầu file) và trong `.claude/skills/*/SKILL.md`.

## 5. Định dạng file

### 5.1 Note knowledge: `knowledge/<concept-id>.md`

```markdown
---
id: boundary-value-analysis
title: Boundary Value Analysis
courses: [istqb-ctfl]
source: sources/istqb-ctfl/syllabus.md#FL-4.2.2
status: learning            # new | learning | mastered
learned: 2026-10-03
next_review: 2026-10-06
interval: 3                 # số ngày, dùng cho ôn tập ngắt quãng
mistakes: 1
tags: [test-design, black-box]
---
# Boundary Value Analysis

**Tóm tắt:** 3–5 dòng, tiếng Việt, dễ hiểu.

**Ví dụ:** ưu tiên ví dụ từ công việc thật (SAP: Sales Order, Warehouse, Production Order).

**Hay nhầm:** ...

**Liên quan:** [[equivalence-partitioning]] · [[test-design-techniques]]
```

- `id` = tên file, dạng kebab-case tiếng Anh.
- Nếu khái niệm đã tồn tại từ khoá khác thì **cập nhật note cũ** (thêm vào `courses`, bổ sung ví dụ), không tạo note trùng.

### 5.2 Bài học: `courses/<course-id>/days/day-NN.json`

```json
{
  "course": "istqb-ctfl",
  "day": 3,
  "date": "2026-10-03",
  "title": "Boundary Value Analysis",
  "chapter": "4. Test Analysis and Design",
  "syllabus_refs": ["FL-4.2.2"],
  "concepts": ["boundary-value-analysis"],
  "est_minutes": 20,
  "sections": [
    { "type": "text", "heading": "Ý chính", "body_md": "..." },
    { "type": "example", "heading": "Ví dụ SAP", "body_md": "..." },
    { "type": "compare", "heading": "Dễ nhầm", "items": [ { "wrong": "...", "right": "...", "why": "..." } ] },
    { "type": "diagram", "heading": "...", "mermaid": "flowchart LR ..." }
  ],
  "quiz": [
    {
      "id": "istqb-ctfl-d03-q1",
      "concept": "boundary-value-analysis",
      "prompt": "...",
      "options": ["đáp án đúng luôn ở vị trí 0", "...", "..."],
      "why": "giải thích ngắn",
      "ref": "FL-4.2.2"
    }
  ]
}
```

- Đáp án đúng **luôn là `options[0]`**, web app tự xáo trộn khi hiển thị.
- 4–6 câu quiz mỗi bài, mỗi câu gắn với 1 `concept`.
- Các `type` của section có thể mở rộng sau, nhưng web app phải hiển thị được mọi type đang dùng.

### 5.3 Kết quả quiz: `journal/attempts.jsonl`

Mỗi dòng một JSON:

```json
{"ts":"2026-10-03T21:10:00+07:00","course":"istqb-ctfl","day":3,"score":4,"total":5,"wrong":[{"q":"istqb-ctfl-d03-q2","picked":"...","concept":"boundary-value-analysis"}]}
```

### 5.4 Lộ trình: `courses/<course-id>/roadmap.md`

Bảng Markdown: `Ngày | Chương | Chủ đề | Mã syllabus | Khái niệm | Trạng thái`. Trạng thái gồm `todo`, `done` và `review`. Có thêm frontmatter `start_date`, `minutes_per_day`, `days_per_week`.

### 5.5 Khoá học: `courses/<course-id>/course.json`

```json
{
  "id": "istqb-ctfl",
  "title": "ISTQB CTFL",
  "course_type": "certification",
  "level_from": null,
  "level_to": null,
  "start_date": "2026-09-29",
  "minutes_per_day": 15,
  "days_per_week": 6,
  "deadline": null,
  "explanation_language": "vi",
  "example_context": "SAP ERP (Sales Order, Warehouse, Production Order)",
  "quiz_size": null
}
```

- Chỉ `id`, `title`, `start_date`, `minutes_per_day`, `days_per_week` là **bắt buộc** (tương thích ngược với `course.json` tạo trước mục này — không cần sửa lại file cũ).
- `course_type`: `"certification"` (có chuẩn/tổ chức cấp chứng chỉ) hoặc `"skill"` (không có syllabus chính thức — `/new-course` gọi `/synthesize-syllabus`). Thiếu field này thì coi như `"certification"`.
- `level_from` / `level_to`: thang trình độ nếu có (ví dụ CEFR `"B1"` → `"B2"`), `null` nếu không áp dụng.
- `deadline`: `"YYYY-MM-DD"` hoặc `null`. Có deadline thì `/new-course` phải kiểm tra khả thi trước khi dựng roadmap (mục 6).
- `explanation_language`: ngôn ngữ giải thích nội dung, mặc định `"vi"` nếu thiếu.
- `example_context`: bối cảnh ưu tiên khi viết ví dụ (ví dụ "SAP ERP" cho người dùng làm test automation).
- `quiz_size`: số câu quiz mỗi bài. `null`/thiếu → script tự tính theo `minutes_per_day` (xem `scripts/next-day.mjs`, `scripts/select-review.mjs`).

## 6. Luồng hằng ngày và các skill

Tên nhánh git dùng trong toàn bộ luồng dưới đây (commit/push của mỗi skill) lấy từ `config.json` → `git.*`, không hardcode rải rác — đổi tên nhánh chỉ cần sửa 1 chỗ (trừ trigger trong `.github/workflows/deploy.yml`, là YAML tĩnh của GitHub Actions nên phải tự sửa riêng).

```
/synthesize-syllabus <chủ đề>   (khi course_type=skill, không có syllabus chính thức)
/new-course <chủ đề>            (1 lần/khoá)
/today                          → sinh bài hôm nay → commit + push → deploy → học trên điện thoại
/done <dán kết quả>             → ghi journal, cập nhật knowledge + roadmap → commit + push
/review                         → bài ôn từ các note đến hạn và các lỗi hay sai
/status                         → tiến độ từng khoá, note đến hạn, khái niệm yếu nhất
/ask <câu hỏi>                  → hỏi đáp trên knowledge lake
```

Các bước chi tiết nằm trong `.claude/skills/<tên>/SKILL.md` (đọc trước khi chạy nếu chưa đọc trong phiên). Tóm tắt vai trò từng skill và script nó gọi:

- **`/new-course`** — tìm/dựng syllabus (gọi `/synthesize-syllabus` nếu `course_type: skill`), kiểm tra khả thi nếu có `deadline`, tái dùng id `knowledge/` có sẵn, dựng `roadmap.md` + `course.json` (schema 5.5).
- **`/today`** — gọi `scripts/next-day.mjs` để biết ngày kế tiếp, có sẵn file chưa (không ghi đè), có nên đề xuất học lại (bỏ qua các lần làm bài ôn), quiz size theo `minutes_per_day`. Claude chỉ viết nội dung bài học.
- **`/done`** — gọi `scripts/record-attempt.mjs`: chống dán trùng (cùng `ts`+`course`+`day`), chỉ cập nhật SRS cho concept có câu quiz thật sự, tính ngày theo giờ Asia/Ho_Chi_Minh, bỏ qua roadmap cho ngày `review-*`. Script dừng và liệt kê rõ nếu thiếu note — Claude viết nội dung note đó rồi chạy lại.
- **`/review`** — gọi `scripts/select-review.mjs`: chọn note đến hạn, cap theo `quiz_size`, mỗi note chỉ gán vào đúng 1 khoá (tránh hỏi trùng), không ghi đè bài ôn cùng ngày. Kết quả ôn cũng xử lý qua `/done`.
- **`/status`** — tiến độ từng khoá (bao nhiêu % roadmap `done`), note nào đến hạn ôn, khái niệm nào `mistakes` cao nhất.
- **`/ask <câu hỏi>`** — khi người dùng hỏi "mình đã học gì về X", tìm trong `knowledge/` và `journal/` trước, trả lời kèm tên note làm nguồn. Chỉ bổ sung kiến thức ngoài khi người dùng yêu cầu, và nói rõ đó là kiến thức ngoài.

## 7. Web app (`site/`)

- **Tĩnh hoàn toàn**: HTML/CSS/JS thuần, hoặc 1 thư viện nhỏ qua CDN nếu thật cần. Ưu tiên điện thoại (khoảng 400px), hỗ trợ light/dark, thêm được vào màn hình chính (manifest + icon).
- **Phong cách giao diện**: theo `docs/reference/think-in-english.html` (thẻ sai/đúng với vạch highlighter, quiz từng câu, nút nghe phát âm cho câu tiếng Anh, chế độ "Tự kiểm tra").
- **Các trang:**
  1. **Hôm nay**: bài mới nhất chưa hoàn thành của từng khoá.
  2. **Lộ trình**: tiến độ theo chương, bấm vào để mở bài cũ.
  3. **Knowledge**: tìm kiếm, lọc theo khoá/tag/trạng thái, xem note có backlink.
  4. **Ôn tập**: các note đến hạn ôn.
- **Nút "Copy kết quả"** sau mỗi quiz: copy đúng 1 dòng JSON (mục 5.3) để dán vào `/done`. Có fallback chọn text khi clipboard bị chặn.
- `localStorage` chỉ dùng cho tiện ích tạm thời (bài đang làm dở, tab đang mở), không phải nơi lưu tiến độ chính thức.

## 8. Deploy

- GitHub Actions: `node scripts/build.mjs` rồi deploy `site/`.
- **Lưu ý:** GitHub Pages miễn phí chỉ cho **repo public**. Nếu repo **private** thì dùng **Cloudflare Pages** (miễn phí, hỗ trợ repo private). Người dùng sẽ chọn khi setup.

## 9. Kế hoạch build theo giai đoạn

| Giai đoạn | Nội dung | Xong khi |
|---|---|---|
| **1. Khung** | Cấu trúc thư mục, `CLAUDE.md`, schema, `scripts/build.mjs`, 1 bài mẫu + 2 note mẫu | `node scripts/build.mjs` chạy được, `site/data/` đúng schema |
| **2. Web app** | 4 trang, quiz, nút Copy kết quả, PWA | Mở trên điện thoại đọc được bài mẫu và làm được quiz |
| **3. Skills** | 4 skill trong `.claude/skills/` | Chạy thử `/new-course` → `/today` → `/done` trọn một vòng |
| **4. Deploy** | Workflow + hướng dẫn bật Pages | Push lên là web app tự cập nhật |
| **5. Khoá thật** | Chạy `/new-course` cho khoá đầu tiên | Có lộ trình và bài ngày 1 |

Sau mỗi giai đoạn: dừng lại, tóm tắt cho người dùng, chờ đồng ý rồi mới làm tiếp.

## 10. Để sau (chưa làm)

- Web app tự commit kết quả qua GitHub API (cần token quyền hạn chế).
- Scheduled task tự chạy `/today` mỗi sáng.
- Dùng `knowledge/` làm dữ liệu RAG cho AI agent (LangChain), vừa là tính năng vừa là bài tập.
- Backend đồng bộ (Cloudflare Workers / Supabase).

## 11. Câu hỏi còn mở (hỏi người dùng)

- Khoá học đầu tiên là gì?
- Repo public hay private? (quyết định dùng GitHub Pages hay Cloudflare Pages)
- Tên repo (mặc định `learning-hub`).
