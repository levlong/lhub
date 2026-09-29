#!/usr/bin/env node
// Reads courses/*, knowledge/*.md → writes site/data/*.json. No external dependencies.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatterDoc, toObject } from "./lib/frontmatter.mjs";
import { requireFields, validateDay, parseRoadmap } from "./lib/schema.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const COURSES_DIR = path.join(ROOT, "courses");
const KNOWLEDGE_DIR = path.join(ROOT, "knowledge");
const SITE_DATA_DIR = path.join(ROOT, "site", "data");

class BuildError extends Error {}

function fail(msg) {
  throw new BuildError(msg);
}

function rel(file) {
  return path.relative(ROOT, file);
}

function readJSON(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    fail(`Không đọc/parse được ${rel(file)}: ${e.message}`);
  }
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
    let doc;
    try {
      doc = parseFrontmatterDoc(readFileSync(file, "utf8"));
    } catch (e) {
      fail(`${rel(file)}: ${e.message}`);
    }
    const data = toObject(doc);
    try {
      requireFields(data, ["id", "title", "courses", "source", "status", "tags"], rel(file));
    } catch (e) {
      fail(e.message);
    }
    if (data.id !== f.replace(/\.md$/, "")) fail(`id "${data.id}" không khớp tên file ${f}`);
    return { ...data, body_md: doc.body, links: extractWikilinks(doc.body) };
  });

  const byId = new Map(notes.map((n) => [n.id, n]));
  for (const n of notes) {
    for (const target of n.links) {
      if (!byId.has(target)) fail(`[[${target}]] trong ${n.id}.md trỏ tới note không tồn tại`);
    }
  }
  for (const n of notes) n.backlinks = notes.filter((o) => o.links.includes(n.id)).map((o) => o.id);

  return notes.sort((a, b) => a.id.localeCompare(b.id));
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
    let roadmap = [];
    if (existsSync(roadmapFile)) {
      try {
        roadmap = parseRoadmap(readFileSync(roadmapFile, "utf8"), rel(roadmapFile)).rows;
      } catch (e) {
        fail(e.message);
      }
    }
    const statusByDay = new Map(roadmap.map((r) => [r.day, r.status]));

    const daysDir = path.join(courseDir, "days");
    const dayFiles = existsSync(daysDir) ? readdirSync(daysDir).filter((f) => f.endsWith(".json")).sort() : [];
    const outDir = path.join(SITE_DATA_DIR, id);
    mkdirSync(outDir, { recursive: true });

    const days = [];
    for (const f of dayFiles) {
      const file = path.join(daysDir, f);
      const day = readJSON(file);
      try {
        validateDay(day, rel(file));
      } catch (e) {
        fail(e.message);
      }
      if (day.course !== id) fail(`"course" trong ${rel(file)} phải là "${id}"`);
      // Một concept có thể chưa có note: /today giới thiệu concept trước, /done mới tạo note.
      for (const c of day.concepts) {
        if (!knowledgeIds.has(c)) console.warn(`Cảnh báo: concept "${c}" trong ${rel(file)} chưa có note trong knowledge/ (sẽ được /done tạo).`);
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
