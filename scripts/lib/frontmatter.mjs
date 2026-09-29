// Minimal YAML frontmatter parser/writer: flat `key: value` pairs only, no nesting.
// Line-preserving on write so untouched fields never get reformatted.

export function parseScalar(raw) {
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

export function formatScalar(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return `[${value.map(formatScalar).join(", ")}]`;
  const s = String(value);
  if (s === "" || /[:\[\]{}#]/.test(s)) return JSON.stringify(s);
  return s;
}

// Parses "---\nkey: value\n...\n---\n<body>" preserving each frontmatter line's
// raw (un-parsed) text, so a targeted setField() only touches the lines it changes.
export function parseFrontmatterDoc(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error("Thiếu YAML frontmatter (không tìm thấy khối --- ... ---)");
  const [, fmRaw, body] = m;
  const lines = [];
  for (const line of fmRaw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const idx = line.indexOf(":");
    if (idx === -1) throw new Error(`Dòng frontmatter không hợp lệ: "${line}"`);
    lines.push({ key: line.slice(0, idx).trim(), raw: line.slice(idx + 1).trim() });
  }
  return { lines, body: body.replace(/\s+$/, "") };
}

export function getField(doc, key) {
  const line = doc.lines.find((l) => l.key === key);
  return line ? parseScalar(line.raw) : undefined;
}

export function setField(doc, key, value) {
  const raw = formatScalar(value);
  const line = doc.lines.find((l) => l.key === key);
  if (line) line.raw = raw;
  else doc.lines.push({ key, raw });
}

export function toObject(doc) {
  const obj = {};
  for (const l of doc.lines) obj[l.key] = parseScalar(l.raw);
  return obj;
}

export function serializeFrontmatterDoc(doc) {
  const fm = doc.lines.map((l) => `${l.key}: ${l.raw}`).join("\n");
  return `---\n${fm}\n---\n${doc.body}\n`;
}
