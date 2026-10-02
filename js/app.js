import { herd, paddocks } from "./data.js";

const app = document.getElementById("app");
const statusLabel = {
  healthy: "Healthy",
  watch: "Watch",
  treatment: "Treatment",
};

let query = "";
let pastureFilter = "all";
let modal = null;

function route() {
  const hash = location.hash.replace(/^#/, "") || "/map";
  const parts = hash.split("/").filter(Boolean);
  if (parts[0] === "cow" && parts[1]) {
    return { name: "profile", id: parts[1], page: parts[2] || null };
  }
  if (parts[0] === "herd") return { name: "herd" };
  return { name: "map" };
}

function cows() {
  return herd.filter((cow) => {
    const hay = `${cow.name} ${cow.tag} ${cow.breed} ${cow.pasture}`.toLowerCase();
    const matchesQuery = hay.includes(query.toLowerCase());
    const matchesPasture = pastureFilter === "all" || cow.pastureId === pastureFilter;
    return matchesQuery && matchesPasture;
  });
}

function avatar(cow, large = false) {
  return `<div class="avatar ${cow.status}" style="${large ? "" : ""}">${cow.name[0]}</div>`;
}

function mapSvg(selectedId) {
  const labels = paddocks.map((p) => {
    const match = /M([\d.]+) ([\d.]+) H([\d.]+) V([\d.]+)/.exec(p.d);
    const x = match ? (Number(match[1]) + Number(match[3])) / 2 : 0;
    const y = match ? (Number(match[2]) + Number(match[4])) / 2 : 0;
    return `<text class="paddock-label" x="${x}" y="${y}">${p.name}</text>`;
  });

  const pins = herd
    .map((cow) => {
      const selected = cow.id === selectedId ? ` stroke-width="3"` : "";
      return `
        <g class="cow-pin ${cow.status} ${cow.status !== "healthy" ? "pulse" : ""}" data-cow="${cow.id}">
          <circle cx="${cow.x}" cy="${cow.y}" r="12"${selected}></circle>
          <text x="${cow.x}" y="${cow.y + 3}">${cow.tag.slice(-2)}</text>
        </g>`;
    })
    .join("");

  return `
    <svg class="map-svg" viewBox="0 0 400 520" role="img" aria-label="Ranch map">
      <rect width="400" height="520" fill="#46613c"></rect>
      ${paddocks
        .map(
          (p) =>
            `<path class="paddock ${pastureFilter === p.id ? "active" : ""}" data-pasture="${p.id}" d="${p.d}" fill="${p.fill}"></path>`
        )
        .join("")}
      <path class="creek-path" d="M40 350 C 90 370, 140 390, 200 380 S 320 350, 360 400"></path>
      <rect class="barn" x="48" y="58" width="46" height="32" rx="3"></rect>
      <polygon class="barn-roof" points="46,58 71,40 96,58"></polygon>
      ${labels.join("")}
      ${pins}
    </svg>`;
}

function herdList() {
  const list = cows();
  if (!list.length) return `<p class="empty">No cattle match that search.</p>`;
  return `<div class="herd-list">${list
    .map(
      (cow) => `
      <button class="cow-card" data-open="${cow.id}">
        ${avatar(cow)}
        <div>
          <h3>${cow.name}</h3>
          <div class="meta">#${cow.tag} · ${cow.breed} · ${cow.pasture}</div>
        </div>
        <span class="chip ${cow.status}">${statusLabel[cow.status]}</span>
      </button>`
    )
    .join("")}</div>`;
}

function filters() {
  const items = [{ id: "all", name: "All paddocks" }, ...paddocks];
  return `<div class="filter-row">${items
    .map(
      (p) =>
        `<button class="filter-chip ${pastureFilter === p.id ? "on" : ""}" data-filter="${p.id}">${p.name}</button>`
    )
    .join("")}</div>`;
}

function profile(cow) {
  return `
    <button class="back" data-back>← Map</button>
    <div class="profile-head">
      ${avatar(cow, true)}
      <div>
        <h2>${cow.name}</h2>
        <div class="meta">Tag #${cow.tag} · ${cow.sex} · ${cow.lastSeen}</div>
        <span class="chip ${cow.status}">${statusLabel[cow.status]}</span>
      </div>
    </div>
    <div class="stats">
      <div class="stat"><span>Breed</span><strong>${cow.breed}</strong></div>
      <div class="stat"><span>Age</span><strong>${cow.age}</strong></div>
      <div class="stat"><span>Weight</span><strong>${cow.weight}</strong></div>
      <div class="stat"><span>Pasture</span><strong>${cow.pasture}</strong></div>
    </div>
    <section class="diagnosis">
      <h3>${cow.diagnosis.title}</h3>
      <p>${cow.diagnosis.detail}</p>
      <div class="meta" style="margin-top:8px">${cow.diagnosis.date}</div>
    </section>
    <div class="actions">
      <button class="secondary" data-notes="${cow.id}">Notes</button>
      <button class="primary" data-treat="${cow.id}">Treatment</button>
    </div>
    <div class="section-title">Recent notes</div>
    <div class="timeline">
      ${cow.notes.map((n) => `<article><small>${n.date}</small><div>${n.text}</div></article>`).join("") || "<p class='empty'>No notes yet.</p>"}
    </div>
    <div class="section-title">Treatments</div>
    <div class="timeline">
      ${
        cow.treatments.length
          ? cow.treatments.map((t) => `<article><small>${t.date}</small><div>${t.name} · ${t.dose}</div></article>`).join("")
          : "<p class='empty'>No treatments on file.</p>"
      }
    </div>`;
}

function notesModal(cow) {
  return `
    <div class="modal">
      <button class="back" data-close-modal>← ${cow.name}</button>
      <h2>Notes</h2>
      <div class="timeline">
        ${cow.notes.map((n) => `<article><small>${n.date}</small><div>${n.text}</div></article>`).join("")}
      </div>
      <div class="field">
        <label for="note-text">New note</label>
        <textarea id="note-text" placeholder="What did you see?"></textarea>
      </div>
      <div class="modal-actions">
        <button class="primary" data-save-note="${cow.id}">Save note</button>
        <button class="secondary" data-close-modal>Cancel</button>
      </div>
    </div>`;
}

function treatmentModal(cow) {
  return `
    <div class="modal">
      <button class="back" data-close-modal>← ${cow.name}</button>
      <h2>Treatment</h2>
      <div class="field">
        <label for="rx-name">Medication / protocol</label>
        <input id="rx-name" placeholder="e.g. Today intramammary">
      </div>
      <div class="field">
        <label for="rx-dose">Dose</label>
        <input id="rx-dose" placeholder="e.g. 10 mL IM">
      </div>
      <div class="field">
        <label for="rx-date">Date</label>
        <input id="rx-date" type="date">
      </div>
      <div class="modal-actions">
        <button class="primary" data-save-rx="${cow.id}">Log treatment</button>
        <button class="secondary" data-close-modal>Cancel</button>
      </div>
    </div>`;
}

function chrome(active, body) {
  const alerts = herd.some((c) => c.status !== "healthy");
  return `
    <div class="app-shell">
      <header class="topbar">
        <a class="brand" href="#/map">
          <div class="brand-mark">✦</div>
          <h1>Cattle Compass<span>Cedar Creek Ranch</span></h1>
        </a>
        <div class="top-actions">
          <div class="desktop-nav">
            <a class="ghost ${active === "map" ? "active" : ""}" href="#/map">Map</a>
            <a class="ghost ${active === "herd" ? "active" : ""}" href="#/herd">Herd</a>
          </div>
          <a class="ghost" href="/archive.html">Versions</a>
        </div>
      </header>
      ${body}
      <nav class="bottom-nav">
        <button class="nav-btn ${active === "map" ? "active" : ""}" data-go="#/map">Map</button>
        <button class="nav-btn ${active === "herd" ? "active" : ""}" data-go="#/herd">Herd</button>
        <button class="nav-btn" data-alerts>Alerts${alerts ? '<span class="alert-dot"></span>' : ""}</button>
      </nav>
    </div>
    ${modal || ""}`;
}

function render() {
  const r = route();
  if (r.name === "herd") {
    app.innerHTML = chrome(
      "herd",
      `<main class="panel">
        <input class="search" placeholder="Search name, tag, breed" value="${query}">
        ${filters()}
        ${herdList()}
      </main>`
    );
    return;
  }

  const selected = r.name === "profile" ? herd.find((c) => c.id === r.id) : null;
  const sheet =
    r.name === "profile" && selected
      ? `<aside class="sheet"><div class="sheet-handle"></div>${profile(selected)}</aside>`
      : `<aside class="sheet"><div class="sheet-handle"></div>
          <input class="search" placeholder="Search the herd" value="${query}">
          ${filters()}
          ${herdList()}
        </aside>`;

  if (selected && r.page === "notes") modal = notesModal(selected);
  else if (selected && r.page === "treatment") modal = treatmentModal(selected);
  else modal = null;

  app.innerHTML = chrome(
    "map",
    `<div class="workspace">
      <main class="stage">
        <div class="map-wrap">${mapSvg(selected?.id)}</div>
      </main>
      ${sheet}
    </div>`
  );
}

app.addEventListener("click", (event) => {
  const go = event.target.closest("[data-go]");
  if (go) location.hash = go.dataset.go;

  if (event.target.closest("[data-alerts]")) {
    pastureFilter = "all";
    query = "";
    location.hash = "#/herd";
  }

  const open = event.target.closest("[data-open]");
  if (open) location.hash = `#/cow/${open.dataset.open}`;

  const pin = event.target.closest("[data-cow]");
  if (pin) location.hash = `#/cow/${pin.dataset.cow}`;

  const pasture = event.target.closest("[data-pasture]");
  if (pasture) {
    pastureFilter = pasture.dataset.pasture === pastureFilter ? "all" : pasture.dataset.pasture;
    render();
  }

  const filter = event.target.closest("[data-filter]");
  if (filter) {
    pastureFilter = filter.dataset.filter;
    render();
  }

  if (event.target.closest("[data-back]")) location.hash = "#/map";
  if (event.target.closest("[data-close-modal]")) {
    const r = route();
    location.hash = `#/cow/${r.id}`;
  }

  const notes = event.target.closest("[data-notes]");
  if (notes) location.hash = `#/cow/${notes.dataset.notes}/notes`;

  const treat = event.target.closest("[data-treat]");
  if (treat) location.hash = `#/cow/${treat.dataset.treat}/treatment`;

  const saveNote = event.target.closest("[data-save-note]");
  if (saveNote) {
    const cow = herd.find((c) => c.id === saveNote.dataset.saveNote);
    const text = document.getElementById("note-text").value.trim();
    if (text) {
      cow.notes.unshift({ date: "Today", text });
      location.hash = `#/cow/${cow.id}`;
    }
  }

  const saveRx = event.target.closest("[data-save-rx]");
  if (saveRx) {
    const cow = herd.find((c) => c.id === saveRx.dataset.saveRx);
    const name = document.getElementById("rx-name").value.trim();
    const dose = document.getElementById("rx-dose").value.trim() || "See notes";
    if (name) {
      cow.treatments.unshift({ date: "Today", name, dose });
      cow.status = "treatment";
      location.hash = `#/cow/${cow.id}`;
    }
  }
});

app.addEventListener("input", (event) => {
  if (event.target.classList.contains("search")) {
    query = event.target.value;
    const active = document.activeElement;
    const start = active.selectionStart;
    render();
    const again = app.querySelector(".search");
    if (again) {
      again.focus();
      again.setSelectionRange(start, start);
    }
  }
});

window.addEventListener("hashchange", render);
render();
