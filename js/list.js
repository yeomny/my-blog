// index.html: posts/index.json 로드 -> 목록 렌더 + 검색/태그 필터

let allPosts = [];
let activeTag = null;

async function loadPosts() {
  const res = await fetch("posts/index.json");
  const filenames = await res.json();

  const posts = await Promise.all(
    filenames.map(async (filename) => {
      const res = await fetch(`posts/${filename}`);
      const raw = await res.text();
      const { meta } = parseFrontmatter(raw);
      return { ...meta, filename };
    })
  );

  // 최신 날짜순 정렬
  posts.sort((a, b) => (a.date < b.date ? 1 : -1));
  return posts;
}

function renderPosts(posts) {
  const container = document.getElementById("post-list");
  const emptyState = document.getElementById("empty-state");

  if (posts.length === 0) {
    container.innerHTML = "";
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  container.innerHTML = posts
    .map(
      (post) => `
      <a class="post-card" href="post.html?slug=${encodeURIComponent(post.filename)}">
        <h2 class="post-card-title">${post.title || post.filename}</h2>
        <div class="post-card-meta">
          <time>${post.date || ""}</time>
          ${(post.tags || []).map((t) => `<span class="tag">${t}</span>`).join("")}
        </div>
        ${post.summary ? `<p class="post-card-summary">${post.summary}</p>` : ""}
      </a>
    `
    )
    .join("");
}

function renderTagFilters(posts) {
  const tagContainer = document.getElementById("tag-filters");
  const tagSet = new Set();
  posts.forEach((p) => (p.tags || []).forEach((t) => tagSet.add(t)));

  const tags = Array.from(tagSet).sort();
  tagContainer.innerHTML =
    `<button class="tag-btn${activeTag === null ? " active" : ""}" data-tag="">전체</button>` +
    tags
      .map(
        (t) =>
          `<button class="tag-btn${activeTag === t ? " active" : ""}" data-tag="${t}">${t}</button>`
      )
      .join("");

  tagContainer.querySelectorAll(".tag-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeTag = btn.dataset.tag || null;
      applyFilters();
      renderTagFilters(allPosts);
    });
  });
}

function applyFilters() {
  const query = document.getElementById("search-input").value.trim().toLowerCase();

  const filtered = allPosts.filter((post) => {
    const matchesQuery =
      !query ||
      (post.title || "").toLowerCase().includes(query) ||
      (post.summary || "").toLowerCase().includes(query);
    const matchesTag = !activeTag || (post.tags || []).includes(activeTag);
    return matchesQuery && matchesTag;
  });

  renderPosts(filtered);
}

async function init() {
  try {
    allPosts = await loadPosts();
    renderPosts(allPosts);
    renderTagFilters(allPosts);
    document.getElementById("search-input").addEventListener("input", applyFilters);
  } catch (err) {
    document.getElementById("post-list").innerHTML =
      `<p class="error">글 목록을 불러오지 못했습니다. 로컬 서버로 실행 중인지 확인해주세요.</p>`;
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", init);
