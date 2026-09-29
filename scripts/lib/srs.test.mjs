import { test } from "node:test";
import assert from "node:assert/strict";
import { nextInterval, tsToVNDate, addDaysISO, applySrs, selectReviewNotes, SEQUENCE } from "./srs.mjs";

test("nextInterval đi đúng chuỗi 1-3-7-14-30", () => {
  assert.equal(nextInterval(0), 1);
  assert.equal(nextInterval(undefined), 1);
  assert.equal(nextInterval(1), 3);
  assert.equal(nextInterval(3), 7);
  assert.equal(nextInterval(7), 14);
  assert.equal(nextInterval(14), 30);
});

test("nextInterval giữ nguyên 30 khi đã ở đỉnh hoặc lệch chuỗi", () => {
  assert.equal(nextInterval(30), 30);
  assert.equal(nextInterval(40), 30);
});

test("nextInterval lấy giá trị kế tiếp ngay cả khi current không khớp chuỗi (vd 5)", () => {
  assert.equal(nextInterval(5), 7);
});

test("tsToVNDate cộng đúng 7 tiếng (Asia/Ho_Chi_Minh, không DST)", () => {
  // 15:45 UTC = 22:45 VN, vẫn cùng ngày.
  assert.equal(tsToVNDate("2026-09-29T15:45:09.208Z"), "2026-09-29");
  // 18:00 UTC = 01:00 VN hôm sau -> sang ngày mới.
  assert.equal(tsToVNDate("2026-09-29T18:00:00Z"), "2026-09-30");
  // Ngay trước nửa đêm VN (16:59 UTC = 23:59 VN) vẫn là ngày cũ.
  assert.equal(tsToVNDate("2026-09-29T16:59:00Z"), "2026-09-29");
});

test("addDaysISO cộng ngày đúng qua ranh giới tháng", () => {
  assert.equal(addDaysISO("2026-09-29", 1), "2026-09-30");
  assert.equal(addDaysISO("2026-09-29", 5), "2026-10-04");
});

test("applySrs: trả lời đúng lần đầu -> interval 1, learning", () => {
  const r = applySrs({ interval: 0, mistakes: 0, learned: null }, true, "2026-09-29");
  assert.equal(r.interval, 1);
  assert.equal(r.status, "learning");
  assert.equal(r.next_review, "2026-09-30");
  assert.equal(r.learned, "2026-09-29");
});

test("applySrs: trả lời đúng liên tiếp tới 30 ngày -> mastered", () => {
  const r = applySrs({ interval: 14, mistakes: 0, learned: "2026-08-01" }, true, "2026-09-29");
  assert.equal(r.interval, 30);
  assert.equal(r.status, "mastered");
  assert.equal(r.next_review, "2026-10-29");
  assert.equal(r.learned, "2026-08-01"); // giữ nguyên ngày học đầu tiên
});

test("applySrs: trả lời sai -> reset về 1, tăng mistakes, kể cả khi đang mastered", () => {
  const r = applySrs({ interval: 30, mistakes: 2, learned: "2026-08-01" }, false, "2026-09-29");
  assert.equal(r.interval, 1);
  assert.equal(r.status, "learning");
  assert.equal(r.mistakes, 3);
  assert.equal(r.next_review, "2026-09-30");
});

test("selectReviewNotes: chỉ lấy note đến hạn, ưu tiên mistakes cao, cap theo quizSize", () => {
  const notes = [
    { id: "a", courses: ["c1"], next_review: "2026-09-28", mistakes: 1 },
    { id: "b", courses: ["c1"], next_review: "2026-09-29", mistakes: 5 },
    { id: "c", courses: ["c1"], next_review: "2026-10-05", mistakes: 9 }, // chưa đến hạn
    { id: "d", courses: ["c2"], next_review: "2026-09-20", mistakes: 3 },
  ];
  const result = selectReviewNotes(notes, { courseId: "c1", quizSize: 1, todayVNDate: "2026-09-29" });
  assert.deepEqual(result.map((n) => n.id), ["b"]); // b có mistakes cao nhất trong c1, còn đến hạn
});

test("selectReviewNotes: không giới hạn course khi courseId rỗng", () => {
  const notes = [
    { id: "a", courses: ["c1"], next_review: "2026-09-28", mistakes: 1 },
    { id: "d", courses: ["c2"], next_review: "2026-09-20", mistakes: 3 },
  ];
  const result = selectReviewNotes(notes, { courseId: null, quizSize: 10, todayVNDate: "2026-09-29" });
  assert.deepEqual(result.map((n) => n.id).sort(), ["a", "d"]);
});
