// Pure, DOM-free logic (exported for unit tests) ---------------------------

export function pickTodayDay(course) {
  const pending = (course.days || []).filter((d) => d.status !== "done").slice().sort((a, b) => a.day - b.day);
  return pending[0] || null;
}

export function dueReviewNotes(knowledge, todayISO) {
  return knowledge
    .filter((n) => n.next_review && n.next_review <= todayISO)
    .slice()
    .sort((a, b) => b.mistakes - a.mistakes || a.next_review.localeCompare(b.next_review));
}

export function shuffle(arr, rand = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildAttemptLine({ course, day, score, total, wrong }, now = new Date()) {
  return JSON.stringify({ ts: now.toISOString(), course, day, score, total, wrong });
}

export function filterKnowledge(knowledge, { query = "", course = "", status = "" } = {}) {
  const q = query.trim().toLowerCase();
  return knowledge.filter((n) => {
    if (course && !n.courses.includes(course)) return false;
    if (status && n.status !== status) return false;
    if (q && !(n.id.includes(q) || n.title.toLowerCase().includes(q) || n.tags.some((t) => t.toLowerCase().includes(q)))) return false;
    return true;
  });
}

export function findDayEntry(course, dayNum) {
  return (course.days || []).find((d) => String(d.day) === String(dayNum)) || null;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// Very small subset of Markdown: **bold**, `code`, [[wikilink]], blank-line paragraphs.
export function renderInlineMd(text, titleById = new Map()) {
  const paragraphs = text.trim().split(/\n\s*\n/);
  return paragraphs
    .map((p) => {
      let h = escapeHtml(p);
      h = h.replace(/\[\[([a-z0-9-]+)\]\]/g, (_, id) => {
        const title = titleById.get(id) || id;
        return `<a href="#knowledge/${id}">${escapeHtml(title)}</a>`;
      });
      h = h.replace(/`([^`]+)`/g, "<code>$1</code>");
      h = h.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      return `<p>${h.replace(/\n/g, "<br>")}</p>`;
    })
    .join("");
}

export function todayISO(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

// App bootstrap (DOM-dependent) ---------------------------------------------

if (typeof document !== "undefined") {
  const store = {
    get(k, d) {
      try {
        const v = localStorage.getItem(k);
        return v ? JSON.parse(v) : d;
      } catch {
        return d;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, JSON.stringify(v));
      } catch {
        /* ignore quota / privacy-mode errors */
      }
    },
  };

  const state = { courses: [], knowledge: [], quiz: null };

  function knowledgeTitleMap() {
    return new Map(state.knowledge.map((n) => [n.id, n.title]));
  }

  function parseHash() {
    const h = location.hash.replace(/^#/, "");
    const [view, ...rest] = h.split("/");
    return { view: view || "today", params: rest };
  }

  async function loadData() {
    const [courses, knowledge] = await Promise.all([
      fetch("data/courses.json").then((r) => r.json()),
      fetch("data/knowledge.json").then((r) => r.json()),
    ]);
    state.courses = courses;
    state.knowledge = knowledge;
  }

  function renderToday() {
    if (!state.courses.length) return `<p class="empty">Chưa có khoá học nào. Chạy <code>/new-course</code> để bắt đầu.</p>`;
    return state.courses
      .map((c) => {
        const next = pickTodayDay(c);
        if (!next) {
          return `<div class="card"><h3>${escapeHtml(c.title)}</h3><p class="muted">Đã xong hết bài hiện có. Chạy <code>/today</code> để sinh bài mới.</p></div>`;
        }
        return `<div class="card">
          <h3>${escapeHtml(c.title)}</h3>
          <p class="muted">Ngày ${next.day} · ${escapeHtml(next.title)} · ~${next.est_minutes} phút</p>
          <a class="btn" href="#lesson/${c.id}/${next.day}">Bắt đầu →</a>
        </div>`;
      })
      .join("");
  }

  function renderRoadmap() {
    if (!state.courses.length) return `<p class="empty">Chưa có khoá học nào.</p>`;
    return state.courses
      .map((c) => {
        const rows = (c.roadmap || [])
          .map((r) => {
            const entry = findDayEntry(c, r.day);
            const clickable = entry != null;
            const attrs = clickable ? `class="clickable" data-href="#lesson/${c.id}/${r.day}" tabindex="0" role="button"` : "";
            return `<tr ${attrs}>
              <td>${escapeHtml(String(r.day))}</td>
              <td>${escapeHtml(r.topic)}</td>
              <td>${r.syllabus_refs.map(escapeHtml).join(", ")}</td>
              <td><span class="badge ${r.status}">${r.status}</span></td>
            </tr>`;
          })
          .join("");
        return `<h3>${escapeHtml(c.title)}</h3>
          <div class="plan-wrap"><table class="plan">
            <thead><tr><th>Ngày</th><th>Chủ đề</th><th>Mã syllabus</th><th>Trạng thái</th></tr></thead>
            <tbody>${rows || `<tr><td colspan="4" class="empty">Chưa có roadmap.</td></tr>`}</tbody>
          </table></div>`;
      })
      .join("");
  }

  function renderKnowledgeList() {
    const q = document.getElementById("kn-search")?.value || "";
    const course = document.getElementById("kn-course")?.value || "";
    const status = document.getElementById("kn-status")?.value || "";
    const list = filterKnowledge(state.knowledge, { query: q, course, status });
    const box = document.getElementById("kn-list");
    if (!box) return;
    box.innerHTML = list.length
      ? list
          .map(
            (n) => `<div class="card">
              <h3><a href="#knowledge/${n.id}">${escapeHtml(n.title)}</a> <span class="badge ${n.status}">${n.status}</span></h3>
              <p class="muted">${n.tags.map(escapeHtml).join(" · ")}</p>
            </div>`
          )
          .join("")
      : `<p class="empty">Không tìm thấy note nào.</p>`;
  }

  function renderKnowledgeIndex() {
    const courseOpts = [...new Set(state.knowledge.flatMap((n) => n.courses))];
    return `<input class="search" id="kn-search" type="search" placeholder="Tìm theo tên, id, tag...">
      <div class="filters">
        <select class="tab" id="kn-course"><option value="">Mọi khoá</option>${courseOpts.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("")}</select>
        <select class="tab" id="kn-status"><option value="">Mọi trạng thái</option><option value="new">new</option><option value="learning">learning</option><option value="mastered">mastered</option></select>
      </div>
      <div id="kn-list"></div>`;
  }

  function renderKnowledgeNote(id) {
    const n = state.knowledge.find((x) => x.id === id);
    if (!n) return `<p class="empty">Không tìm thấy note "${escapeHtml(id)}".</p>`;
    const titleById = knowledgeTitleMap();
    return `<a class="btn ghost" href="#knowledge">← Danh sách knowledge</a>
      <h2>${escapeHtml(n.title)} <span class="badge ${n.status}">${n.status}</span></h2>
      <p class="muted">Nguồn: ${escapeHtml(n.source)} · Khoá: ${n.courses.map(escapeHtml).join(", ")}</p>
      ${renderInlineMd(n.body_md.replace(/^#[^\n]*\n/, ""), titleById)}
      ${n.backlinks.length ? `<p class="backlinks">Được nhắc tới bởi: ${n.backlinks.map((b) => `<a href="#knowledge/${b}">${escapeHtml(titleById.get(b) || b)}</a>`).join(", ")}</p>` : ""}`;
  }

  function renderReview() {
    const due = dueReviewNotes(state.knowledge, todayISO());
    if (!due.length) return `<p class="empty">Không có note nào đến hạn ôn hôm nay.</p>`;
    return `<p class="muted">Chạy <code>/review</code> để sinh bài ôn tập cho các note dưới đây.</p>` +
      due
        .map(
          (n) => `<div class="card">
            <h3><a href="#knowledge/${n.id}">${escapeHtml(n.title)}</a></h3>
            <p class="muted">Đến hạn: ${escapeHtml(n.next_review)} · Đã sai: ${n.mistakes} lần</p>
          </div>`
        )
        .join("");
  }

  function sectionHTML(s, titleById) {
    if (s.type === "text" || s.type === "example") {
      return `<h3>${escapeHtml(s.heading)}</h3>${renderInlineMd(s.body_md, titleById)}`;
    }
    if (s.type === "compare") {
      return `<h3>${escapeHtml(s.heading)}</h3><div class="card">${s.items
        .map((it) => `<div class="compare-item"><div class="wrong">${escapeHtml(it.wrong)}</div><div class="right">${escapeHtml(it.right)}</div><div class="why">${escapeHtml(it.why)}</div></div>`)
        .join("")}</div>`;
    }
    if (s.type === "diagram") {
      return `<h3>${escapeHtml(s.heading)}</h3><pre class="card">${escapeHtml(s.mermaid)}</pre>`;
    }
    return "";
  }

  async function renderLesson(courseId, dayNum) {
    const course = state.courses.find((c) => c.id === courseId);
    const entry = course && findDayEntry(course, dayNum);
    if (!entry) return `<p class="empty">Không tìm thấy bài học.</p>`;
    const day = await fetch(`data/${courseId}/${entry.file}`).then((r) => r.json());
    const titleById = knowledgeTitleMap();
    state.quiz = { course: courseId, day: day.day, i: 0, score: 0, picked: null, wrong: [], qs: day.quiz.map((q) => ({ ...q, order: shuffle(q.options.map((_, k) => k)) })) };
    const sections = day.sections.map((s) => sectionHTML(s, titleById)).join("");
    return `<p class="kicker muted">${escapeHtml(course.title)} · Ngày ${day.day}</p>
      <h2>${escapeHtml(day.title)}</h2>
      ${sections}
      <h3>Kiểm tra nhanh</h3>
      <div class="quiz" id="quiz"></div>`;
  }

  function renderQuizStep() {
    const box = document.getElementById("quiz");
    const quiz = state.quiz;
    if (!box || !quiz) return;
    const n = quiz.qs.length;
    if (quiz.i >= n) {
      const line = buildAttemptLine({ course: quiz.course, day: quiz.day, score: quiz.score, total: n, wrong: quiz.wrong });
      box.innerHTML = `<div class="result">
        <div class="score">${quiz.score}/${n}</div>
        <p class="muted">Copy kết quả rồi dán vào <code>/done</code> để lưu tiến độ.</p>
        <div class="actions"><button class="btn" type="button" id="copy-result">Copy kết quả</button></div>
        <div class="copy-box" id="copy-box" hidden><textarea readonly rows="3">${escapeHtml(line)}</textarea></div>
      </div>`;
      document.getElementById("copy-result").addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(line);
          document.getElementById("copy-result").textContent = "Đã copy!";
        } catch {
          const cb = document.getElementById("copy-box");
          cb.hidden = false;
          cb.querySelector("textarea").select();
        }
      });
      return;
    }
    const q = quiz.qs[quiz.i];
    const answered = quiz.picked != null;
    const opts = q.order
      .map((k) => {
        let cls = "opt";
        if (answered && k === 0) cls += " correct";
        if (answered && k === quiz.picked && k !== 0) cls += " picked-wrong";
        return `<button class="${cls}" type="button" data-opt="${k}" ${answered ? "disabled" : ""}>${escapeHtml(q.options[k])}</button>`;
      })
      .join("");
    const fb = answered
      ? `<div class="feedback"><span class="verdict ${quiz.picked === 0 ? "ok" : "no"}">${quiz.picked === 0 ? "Chính xác." : "Chưa đúng."}</span> ${escapeHtml(q.why)}</div>
         <div class="actions"><button class="btn" type="button" id="quiz-next">${quiz.i + 1 < n ? "Câu tiếp theo" : "Xem kết quả"}</button></div>`
      : "";
    box.innerHTML = `<div class="qmeta"><span>Câu ${quiz.i + 1} / ${n}</span><span>Đúng: ${quiz.score}</span></div>
      <div class="bar"><i style="width:${(quiz.i / n) * 100}%"></i></div>
      <p class="qprompt">${escapeHtml(q.prompt)}</p>
      <div class="opts">${opts}</div>${fb}`;

    box.querySelectorAll("[data-opt]").forEach((btn) =>
      btn.addEventListener("click", () => {
        quiz.picked = Number(btn.dataset.opt);
        if (quiz.picked === 0) quiz.score++;
        else quiz.wrong.push({ q: q.id, picked: q.options[quiz.picked], concept: q.concept });
        renderQuizStep();
      })
    );
    document.getElementById("quiz-next")?.addEventListener("click", () => {
      quiz.i++;
      quiz.picked = null;
      renderQuizStep();
    });
  }

  async function render() {
    const { view, params } = parseHash();
    store.set("lh-view", location.hash);
    const main = document.getElementById("view");
    document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-current", String(t.getAttribute("href") === `#${view}`)));

    if (view === "today") main.innerHTML = renderToday();
    else if (view === "roadmap") main.innerHTML = renderRoadmap();
    else if (view === "knowledge" && params[0]) main.innerHTML = renderKnowledgeNote(params[0]);
    else if (view === "knowledge") {
      main.innerHTML = renderKnowledgeIndex();
      renderKnowledgeList();
      document.getElementById("kn-search").addEventListener("input", renderKnowledgeList);
      document.getElementById("kn-course").addEventListener("change", renderKnowledgeList);
      document.getElementById("kn-status").addEventListener("change", renderKnowledgeList);
    } else if (view === "review") main.innerHTML = renderReview();
    else if (view === "lesson") {
      main.innerHTML = await renderLesson(params[0], params[1]);
      renderQuizStep();
    } else main.innerHTML = `<p class="empty">Không tìm thấy trang.</p>`;

    main.querySelectorAll("tr.clickable").forEach((tr) => {
      const go = () => (location.hash = tr.dataset.href);
      tr.addEventListener("click", go);
      tr.addEventListener("keydown", (e) => e.key === "Enter" && go());
    });
  }

  window.addEventListener("hashchange", render);
  loadData().then(() => {
    if (!location.hash) location.hash = store.get("lh-view", "#today");
    render();
  });
}
