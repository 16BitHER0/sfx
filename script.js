const DATA_URL = "commands.json";

const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");
const searchEl = document.getElementById("search");
const clearSearchEl = document.getElementById("clear-search");
const counterEl = document.getElementById("counter");
const controlsEl = document.querySelector(".controls");
const viewButtonEls = document.querySelectorAll(".view-button");

let items = [];
let copiedResetTimer = null;

let activeAudio = null;
let activeAudioButton = null;
let activeAudioProgressFrame = null;
let stickyCheckFrame = null;
let columnView = "1";

function setAudioProgress(button, progress) {
  button.style.setProperty("--audio-progress", `${progress}%`);
}

function stopAudioProgress() {
  if (activeAudioProgressFrame) {
    cancelAnimationFrame(activeAudioProgressFrame);
    activeAudioProgressFrame = null;
  }
}

function updateAudioProgress() {
  if (!activeAudio || !activeAudioButton) return;

  const progress = Number.isFinite(activeAudio.duration) && activeAudio.duration > 0
    ? (activeAudio.currentTime / activeAudio.duration) * 100
    : 0;

  setAudioProgress(activeAudioButton, progress);
  activeAudioProgressFrame = requestAnimationFrame(updateAudioProgress);
}

function updateStickySearchState() {
  stickyCheckFrame = null;
  const isStuck = controlsEl.getBoundingClientRect().top <= 0;
  controlsEl.classList.toggle("is-stuck", isStuck);
}

function queueStickySearchStateUpdate() {
  if (stickyCheckFrame) return;
  stickyCheckFrame = requestAnimationFrame(updateStickySearchState);
}

function applyColumnView(value) {
  columnView = value;

  listEl.classList.toggle("columns-1", value === "1");
  listEl.classList.toggle("columns-2", value === "2");

  for (const button of viewButtonEls) {
    button.setAttribute("aria-pressed", String(button.dataset.columns === value));
  }
}

function setColumnView(columns, options = {}) {
  const value = columns === "1" ? "1" : "2";

  if (value === columnView) return;

  if (options.animate && document.startViewTransition) {
    document.startViewTransition(() => applyColumnView(value));
  } else {
    applyColumnView(value);
  }

  localStorage.setItem("sfx-column-view", value);
}

function normalise(item) {
  const image =
    typeof item.image === "string"
      ? { src: item.image.trim(), alt: "" }
      : item.image?.src
        ? {
            src: String(item.image.src).trim(),
            alt: String(item.image.alt ?? "").trim()
          }
        : null;

  return {
    command: String(item.command ?? "").trim(),
    description: String(item.description ?? "").trim(),
    coins: Number.isFinite(Number(item.coins)) ? Number(item.coins) : 1000,
    image,
    audio: item.audio?.src
      ? {
          src: String(item.audio.src).trim()
        }
      : null
  };
}

function stopActiveAudio() {
  stopAudioProgress();

  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }

  if (activeAudioButton) {
    activeAudioButton.classList.remove("playing");
    activeAudioButton.setAttribute("aria-label", "Play audio");
    setAudioProgress(activeAudioButton, 0);
    activeAudioButton = null;
  }
}

function toggleAudio(src, button) {
  if (activeAudio && activeAudioButton === button && !activeAudio.paused) {
    stopActiveAudio();
    return;
  }

  stopActiveAudio();

  const audio = new Audio(src);
  audio.preload = "metadata";

  activeAudio = audio;
  activeAudioButton = button;

  button.classList.add("playing");
  button.setAttribute("aria-label", "Pause preview");
  setAudioProgress(button, 0);

  audio.addEventListener("ended", () => {
    stopActiveAudio();
  });

  audio.addEventListener("error", () => {
    console.error("Couldn't play:", src);
    stopActiveAudio();
  });

  audio.play().catch(err => {
    console.error("Audio couldn't be played:", err);
    stopActiveAudio();
  });

  updateAudioProgress();
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[c]));
}

async function loadData() {
  const res = await fetch(DATA_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Couldn't load commands.json");
  return res.json();
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();

    try {
      document.execCommand("copy");
      return true;
    } catch (err) {
      return false;
    } finally {
      document.body.removeChild(ta);
    }
  }
}

function setCopiedState(row, enabled) {
  row.classList.toggle("copied", enabled);
}

function createAudioButton(item) {
  if (!item.audio) return "";

  return `
    <button
      class="audio-preview"
      type="button"
      aria-label="Play audio for ${escapeHtml(item.command)}"
      title="Audio preview"
    >
      <svg
        class="play-icon"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M8 5v14l11-7z"></path>
      </svg>

      <svg
        class="pause-icon"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M6 5h4v14H6zm8 0h4v14h-4z"></path>
      </svg>
    </button>
  `;
}

function createCoinsBadge(item) {
  return `
    <span class="coins" title="${escapeHtml(item.coins.toLocaleString("es-ES"))} coins">
      ${escapeHtml(item.coins.toLocaleString("es-ES"))}
      <span class="coins-unit" aria-hidden="true">PX</span>
    </span>
  `;
}

function createThumbnail(item) {
  const placeholder = `
    <img
      class="thumbnail-placeholder"
      src="avatar.gif"
      alt="Miniatura por defecto"
      loading="lazy"
    />
  `;

  if (!item.image) {
    return `<div class="thumbnail-frame">${placeholder}</div>`;
  }

  return `
    <div class="thumbnail-frame has-image">
      <img
        class="thumbnail"
        src="${escapeHtml(item.image.src)}"
        alt="${escapeHtml(item.image.alt || item.command)}"
        loading="lazy"
        onerror="this.parentElement.classList.add('thumbnail-missing')"
      />
      ${placeholder}
    </div>
  `;
}

function render(data) {
  listEl.innerHTML = "";
  let plural = "";
  if (data.length > 0) {
    if (data.length == 1) {
      plural = " command";
    } else {
      plural = " commands";
    }
  }
  counterEl.textContent = data.length ? data.length + plural : "";
  emptyEl.hidden = data.length !== 0;

  for (const [index, item] of data.entries()) {
    const row = document.createElement("article");
    row.className = "item";
    row.style.viewTransitionName = `sfx-item-${index}`;

    row.innerHTML = `
      ${createThumbnail(item)}

      <div class="item-content">
        <p class="command">${escapeHtml(item.command)}</p>
        <p class="description">${escapeHtml(item.description)}</p>
      </div>

      <div class="item-actions">
        ${createCoinsBadge(item)}
        ${createAudioButton(item)}

        <button
          class="copy-affordance"
          type="button"
          aria-label="Copy ${escapeHtml(item.command)}"
          title="Copy command"
        >
          <svg
            class="copy-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.25"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <rect x="9" y="9" width="13" height="13" rx="2"></rect>
            <path
              d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
            ></path>
          </svg>

          <svg
            class="check-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6L9 17l-5-5"></path>
          </svg>
        </button>
      </div>
    `;

    const audioButtonEl = row.querySelector(".audio-preview");
    const copyButtonEl = row.querySelector(".copy-affordance");

    if (audioButtonEl && item.audio) {
      audioButtonEl.addEventListener("click", () => {
        toggleAudio(item.audio.src, audioButtonEl);
      });
    }

    copyButtonEl.addEventListener("click", async () => {
      const ok = await copyToClipboard(item.command);
      if (!ok) return;

      if (copiedResetTimer) {
        clearTimeout(copiedResetTimer);
      }

      const prev = listEl.querySelector(".item.copied");

      if (prev && prev !== row) {
        setCopiedState(prev, false);
      }

      setCopiedState(row, true);

      copiedResetTimer = setTimeout(() => {
        setCopiedState(row, false);
      }, 1100);
    });

    listEl.appendChild(row);
  }
}

function applyFilter() {
  const term = searchEl.value.toLowerCase().trim();
  clearSearchEl.hidden = searchEl.value.length === 0;

  render(
    term
      ? items.filter(i =>
          i.command.toLowerCase().includes(term) ||
          i.description.toLowerCase().includes(term)
        )
      : items
  );
}

(async function init() {
  const raw = await loadData();
  items = raw.map(normalise).filter(i => i.command);
  setColumnView(localStorage.getItem("sfx-column-view") || "1");
  applyColumnView(columnView);
  render(items);
  searchEl.addEventListener("input", applyFilter);
  clearSearchEl.addEventListener("click", () => {
    searchEl.value = "";
    applyFilter();
    searchEl.focus();
  });
  for (const button of viewButtonEls) {
    button.addEventListener("click", () => {
      setColumnView(button.dataset.columns, { animate: true });
    });
  }
  window.addEventListener("scroll", queueStickySearchStateUpdate, { passive: true });
  window.addEventListener("resize", queueStickySearchStateUpdate);
  updateStickySearchState();
})().catch(err => {
  emptyEl.hidden = false;
  emptyEl.textContent = err.message;
});
