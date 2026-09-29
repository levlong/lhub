#!/usr/bin/env node
// Reads courses/*, knowledge/*.md → writes site/data/*.json. No external dependencies.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const COURSES_DIR = path.join(ROOT, "courses");
const KNOWLEDGE_DIR = path.join(ROOT, "knowledge");
const SITE_DATA_DIR = path.join(ROOT, "site", "data");

class BuildError extends Error {}

function fail(msg) {
  throw new BuildError(msg);
}

function readJSON(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    fail(`Không đọc/parse được ${path.relative(ROOT, file)}: ${e.message}`);
  }
}

function parseScalar(raw) {
  const s = raw.trim();
  if (s === "null" || s === "") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (s.startsWith("[") && s.endsWith("]")) {
    const inner = s.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((v) => parseScalar(v.trim()));
  }
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

// Minimal YAML frontmatter parser: flat `key: value` pairs only, no nesting.
function parseFrontmatter(content, file) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) fail(`Thiếu YAML frontmatter trong ${path.relative(ROOT, file)}`);
  const [, fmRaw, body] = m;
  const data = {};
  for (const line of fmRaw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const idx = line.indexOf(":");
    if (idx === -1) fail(`Dòng frontmatter không hợp lệ trong ${path.relative(ROOT, file)}: "${line}"`);
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    data[key] = parseScalar(value);
  }
  return { data, body: body.trim() };
}

function requireFields(obj, fields, label) {
  for (const f of fields) {
    if (obj[f] === undefined) fail(`Thiếu field "${f}" trong ${label}`);
  }
}

function splitList(cell) {
  return cell.split(",").map((s) => s.trim()).filter(Boolean);
}

// Parses the "Ngày | Chương | Chủ đề | Mã syllabus | Khái niệm | Trạng thái" table (schema 5.4).
function parseRoadmap(content, file) {
  const label = path.relative(ROOT, file);
  const { body } = parseFrontmatter(content, file);
  const rows = body.split(/\r?\n/).filter((l) => l.trim().startsWith("|"));
  if (rows.length < 2) fail(`Không tìm thấy bảng roadmap trong ${label}`);
  const header = rows[0].split("|").map((c) => c.trim()).filter(Boolean);
  const expected = ["Ngày", "Chương", "Chủ đề", "Mã syllabus", "Khái niệm", "Trạng thái"];
  if (expected.some((h, i) => header[i] !== h)) fail(`Header bảng roadmap không đúng trong ${label} (cần: ${expected.join(" | ")})`);

  return rows.slice(2).map((line) => {
    const cells = line.split("|").map((c) => c.trim()).filter((_, i, a) => !(i === 0 && a[0] === "") && !(i === a.length - 1 && a[a.length - 1] === ""));
    const [day, chapter, topic, syllabus_refs, concepts, status] = cells;
    if (!["todo", "done", "review"].includes(status)) fail(`Trạng thái "${status}" không hợp lệ trong ${label} (chỉ nhận todo/done/review)`);
    return { day: /^\d+$/.test(day) ? Number(day) : day, chapter, topic, syllabus_refs: splitList(syllabus_refs), concepts: splitList(concepts), status };
  });
}

function extractWikilinks(body) {
  const links = new Set();
  for (const m of body.matchAll(/\[\[([a-z0-9-]+)\]\]/g)) links.add(m[1]);
  return [...links];
}

function buildKnowledge() {
  if (!existsSync(KNOWLEDGE_DIR)) return [];
  const files = readdirSync(KNOWLEDGE_DIR).filter((f) => f.endsWith(".md"));
  const notes = files.map((f) => {
    const file = path.join(KNOWLEDGE_DIR, f);
    const { data, body } = parseFrontmatter(readFileSync(file, "utf8"), file);
    requireFields(data, ["id", "title", "courses", "source", "status", "tags"], path.relative(ROOT, file));
    if (data.id !== f.replace(/\.md$/, "")) {
      fail(`id "${data.id}" không khớp tên file ${f}`);
    }
    return { ...data, body_md: body, links: extractWikilinks(body) };
  });

  const byId = new Map(notes.map((n) => [n.id, n]));
  for (const n of notes) {
    for (const target of n.links) {
      if (!byId.has(target)) fail(`[[${target}]]` + ` trong ${n.id}.md trỏ tới note không tồn tại`);
    }
  }
  for (const n of notes) n.backlinks = notes.filter((o) => o.links.includes(n.id)).map((o) => o.id);

  return notes.sort((a, b) => a.id.localeCompare(b.id));
}

function validateDay(day, file) {
  const label = path.relative(ROOT, file);
  requireFields(day, ["course", "day", "date", "title", "chapter", "syllabus_refs", "concepts", "est_minutes", "sections", "quiz"], label);
  if (!Array.isArray(day.sections) || day.sections.length === 0) fail(`"sections" rỗng trong ${label}`);
  if (!Array.isArray(day.quiz) || day.quiz.length === 0) fail(`"quiz" rỗng trong ${label}`);
  for (const q of day.quiz) {
    requireFields(q, ["id", "concept", "prompt", "options", "why", "ref"], `câu quiz trong ${label}`);
    if (!Array.isArray(q.options) || q.options.length < 2) fail(`quiz "${q.id}" trong ${label} cần ít nhất 2 lựa chọn`);
  }
}

function buildCourses(knowledgeIds) {
  if (!existsSync(COURSES_DIR)) return [];
  const courseIds = readdirSync(COURSES_DIR).filter((f) => existsSync(path.join(COURSES_DIR, f, "course.json")));
  const courses = [];

  for (const id of courseIds) {
    const courseDir = path.join(COURSES_DIR, id);
    const course = readJSON(path.join(courseDir, "course.json"));
    requireFields(course, ["id", "title", "start_date", "minutes_per_day", "days_per_week"], `courses/${id}/course.json`);
    if (course.id !== id) fail(`course.id "${course.id}" không khớp tên thư mục courses/${id}`);

    const roadmapFile = path.join(courseDir, "roadmap.md");
    const roadmap = existsSync(roadmapFile) ? parseRoadmap(readFileSync(roadmapFile, "utf8"), roadmapFile) : [];
    const statusByDay = new Map(roadmap.map((r) => [r.day, r.status]));

    const daysDir = path.join(courseDir, "days");
    const dayFiles = existsSync(daysDir) ? readdirSync(daysDir).filter((f) => f.endsWith(".json")).sort() : [];
    const outDir = path.join(SITE_DATA_DIR, id);
    mkdirSync(outDir, { recursive: true });

    const days = [];
    for (const f of dayFiles) {
      const file = path.join(daysDir, f);
      const day = readJSON(file);
      validateDay(day, file);
      if (day.course !== id) fail(`"course" trong ${path.relative(ROOT, file)} phải là "${id}"`);
      // Một concept có thể chưa có note: /today giới thiệu concept trước, /done mới tạo note.
      for (const c of day.concepts) {
        if (!knowledgeIds.has(c)) console.warn(`Cảnh báo: concept "${c}" trong ${path.relative(ROOT, file)} chưa có note trong knowledge/ (sẽ được /done tạo).`);
      }
      writeFileSync(path.join(outDir, f), JSON.stringify(day, null, 2));
      days.push({ day: day.day, file: f, date: day.date, title: day.title, est_minutes: day.est_minutes, status: statusByDay.get(day.day) ?? "todo" });
    }

    courses.push({ ...course, roadmap, days });
  }

  return courses.sort((a, b) => a.id.localeCompare(b.id));
}

function main() {
  if (existsSync(SITE_DATA_DIR)) rmSync(SITE_DATA_DIR, { recursive: true });
  mkdirSync(SITE_DATA_DIR, { recursive: true });

  const knowledge = buildKnowledge();
  const knowledgeIds = new Set(knowledge.map((n) => n.id));
  const courses = buildCourses(knowledgeIds);

  writeFileSync(path.join(SITE_DATA_DIR, "knowledge.json"), JSON.stringify(knowledge, null, 2));
  writeFileSync(path.join(SITE_DATA_DIR, "courses.json"), JSON.stringify(courses, null, 2));

  const dayCount = courses.reduce((n, c) => n + c.days.length, 0);
  console.log(`OK: ${courses.length} khoá, ${dayCount} bài, ${knowledge.length} note knowledge → site/data/`);
}

try {
  main();
} catch (e) {
  if (e instanceof BuildError) {
    console.error(`Build lỗi: ${e.message}`);
    process.exit(1);
  }
  throw e;
}
