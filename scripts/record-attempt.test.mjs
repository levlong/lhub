import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "record-attempt.mjs");

function setupFixture() {
  const root = mkdtempSync(path.join(tmpdir(), "lhub-record-attempt-"));
  mkdirSync(path.join(root, "courses", "demo", "days"), { recursive: true });
  mkdirSync(path.join(root, "knowledge"), { recursive: true });
  writeFileSync(
    path.join(root, "courses", "demo", "course.json"),
    JSON.stringify({ id: "demo", title: "Demo", start_date: "2026-09-29", minutes_per_day: 15, days_per_week: 6 })
  );
  writeFileSync(
    path.join(root, "courses", "demo", "roadmap.md"),
    [
      "---",
      "start_date: 2026-09-29",
      "minutes_per_day: 15",
      "days_per_week: 6",
      "---",
      "",
      "| Ngày | Chương | Chủ đề | Mã syllabus | Khái niệm | Trạng thái |",
      "|---|---|---|---|---|---|",
      "| 1 | 1. Demo | Demo Topic | DEMO-1 | x | todo |",
      "",
    ].join("\n")
  );
  writeFileSync(
    path.join(root, "courses", "demo", "days", "day-01.json"),
    JSON.stringify({
      course: "demo",
      day: 1,
      date: "2026-09-29",
      title: "Demo Topic",
      chapter: "1. Demo",
      syllabus_refs: ["DEMO-1"],
      concepts: ["x"],
      est_minutes: 15,
      sections: [{ type: "text", heading: "Ý chính", body_md: "..." }],
      quiz: [{ id: "demo-d01-q1", concept: "x", prompt: "?", options: ["a", "b"], why: "vì a", ref: "DEMO-1" }],
    })
  );
  return root;
}

function run(root, json) {
  return execFileSync(process.execPath, [SCRIPT, "--root", root, json], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function runExpectFail(root, json) {
  try {
    execFileSync(process.execPath, [SCRIPT, "--root", root, json], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    throw new Error("expected non-zero exit");
  } catch (e) {
    return e;
  }
}

test("báo thiếu note knowledge và không ghi gì cả khi note chưa tồn tại", () => {
  const root = setupFixture();
  const attempt = JSON.stringify({ ts: "2026-09-29T15:00:00Z", course: "demo", day: 1, score: 1, total: 1, wrong: [] });
  const err = runExpectFail(root, attempt);
  assert.equal(err.status, 1);
  const out = JSON.parse(err.stderr);
  assert.equal(out.ok, false);
  assert.deepEqual(out.missingConcepts, ["x"]);
  assert.ok(!existsSync(path.join(root, "journal", "attempts.jsonl")), "không được ghi attempts.jsonl khi thiếu note");
  rmSync(root, { recursive: true, force: true });
});

test("cập nhật đúng khi trả lời đúng, ghi journal + roadmap done", () => {
  const root = setupFixture();
  writeFileSync(
    path.join(root, "knowledge", "x.md"),
    ["---", "id: x", "title: X", "courses: [demo]", "source: sources/demo/syllabus.md#DEMO-1", "status: new", "learned: null", "next_review: null", "interval: 0", "mistakes: 0", "tags: [demo]", "---", "# X", "", "Tóm tắt."].join("\n")
  );
  const attempt = { ts: "2026-09-29T15:00:00Z", course: "demo", day: 1, score: 1, total: 1, wrong: [] };
  const out = JSON.parse(run(root, JSON.stringify(attempt)));
  assert.equal(out.ok, true);
  assert.equal(out.duplicate, false);
  assert.equal(out.roadmapUpdated, true);
  assert.deepEqual(out.updatedConcepts, [{ concept: "x", correct: true, interval: 1, status: "learning", next_review: "2026-09-30" }]);

  const noteAfter = readFileSync(path.join(root, "knowledge", "x.md"), "utf8");
  assert.match(noteAfter, /interval: 1/);
  assert.match(noteAfter, /status: learning/);
  assert.match(noteAfter, /next_review: 2026-09-30/);
  assert.match(noteAfter, /# X/); // body giữ nguyên

  const attemptsLog = readFileSync(path.join(root, "journal", "attempts.jsonl"), "utf8").trim().split("\n");
  assert.equal(attemptsLog.length, 1);

  const roadmapAfter = readFileSync(path.join(root, "courses", "demo", "roadmap.md"), "utf8");
  assert.match(roadmapAfter, /\| 1 \|[^|]*\|[^|]*\|[^|]*\|[^|]*\| done \|/);

  assert.ok(existsSync(path.join(root, "journal", "2026-09-29.md")));
  rmSync(root, { recursive: true, force: true });
});

test("dán trùng (cùng ts) thì bỏ qua, không cập nhật thêm lần nữa", () => {
  const root = setupFixture();
  writeFileSync(
    path.join(root, "knowledge", "x.md"),
    ["---", "id: x", "title: X", "courses: [demo]", "source: sources/demo/syllabus.md#DEMO-1", "status: new", "learned: null", "next_review: null", "interval: 0", "mistakes: 0", "tags: [demo]", "---", "# X"].join("\n")
  );
  const attempt = JSON.stringify({ ts: "2026-09-29T15:00:00Z", course: "demo", day: 1, score: 1, total: 1, wrong: [] });
  run(root, attempt);
  const second = JSON.parse(run(root, attempt));
  assert.equal(second.duplicate, true);

  const attemptsLog = readFileSync(path.join(root, "journal", "attempts.jsonl"), "utf8").trim().split("\n");
  assert.equal(attemptsLog.length, 1, "không được append lần 2");
  const noteAfter = readFileSync(path.join(root, "knowledge", "x.md"), "utf8");
  assert.match(noteAfter, /interval: 1/, "interval không được nhảy tiếp lần 2");
  rmSync(root, { recursive: true, force: true });
});

test("trả lời sai -> reset interval về 1, tăng mistakes", () => {
  const root = setupFixture();
  writeFileSync(
    path.join(root, "knowledge", "x.md"),
    ["---", "id: x", "title: X", "courses: [demo]", "source: sources/demo/syllabus.md#DEMO-1", "status: learning", "learned: 2026-08-01", "next_review: 2026-09-29", "interval: 7", "mistakes: 0", "tags: [demo]", "---", "# X"].join("\n")
  );
  const attempt = JSON.stringify({ ts: "2026-09-29T15:00:00Z", course: "demo", day: 1, score: 0, total: 1, wrong: [{ q: "demo-d01-q1", picked: "b", concept: "x" }] });
  const out = JSON.parse(run(root, attempt));
  assert.deepEqual(out.updatedConcepts, [{ concept: "x", correct: false, interval: 1, status: "learning", next_review: "2026-09-30" }]);
  const noteAfter = readFileSync(path.join(root, "knowledge", "x.md"), "utf8");
  assert.match(noteAfter, /mistakes: 1/);
  rmSync(root, { recursive: true, force: true });
});

test("ngày ôn tập tự sinh (review-YYYY-MM-DD) không đụng vào roadmap", () => {
  const root = setupFixture();
  writeFileSync(
    path.join(root, "knowledge", "x.md"),
    ["---", "id: x", "title: X", "courses: [demo]", "source: sources/demo/syllabus.md#DEMO-1", "status: learning", "learned: 2026-08-01", "next_review: 2026-09-29", "interval: 7", "mistakes: 0", "tags: [demo]", "---", "# X"].join("\n")
  );
  writeFileSync(
    path.join(root, "courses", "demo", "days", "review-2026-09-29.json"),
    JSON.stringify({
      course: "demo",
      day: "review-2026-09-29",
      date: "2026-09-29",
      title: "Ôn tập",
      chapter: "Ôn tập",
      syllabus_refs: ["DEMO-1"],
      concepts: ["x"],
      est_minutes: 10,
      sections: [{ type: "text", heading: "Ý chính", body_md: "..." }],
      quiz: [{ id: "demo-review-q1", concept: "x", prompt: "?", options: ["a", "b"], why: "vì a", ref: "DEMO-1" }],
    })
  );
  const roadmapBefore = readFileSync(path.join(root, "courses", "demo", "roadmap.md"), "utf8");
  const attempt = JSON.stringify({ ts: "2026-09-29T15:00:00Z", course: "demo", day: "review-2026-09-29", score: 1, total: 1, wrong: [] });
  const out = JSON.parse(run(root, attempt));
  assert.equal(out.roadmapUpdated, false);
  const roadmapAfter = readFileSync(path.join(root, "courses", "demo", "roadmap.md"), "utf8");
  assert.equal(roadmapAfter, roadmapBefore, "roadmap phải giữ nguyên byte-identical");
  rmSync(root, { recursive: true, force: true });
});
