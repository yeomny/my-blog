// post.html: 개별 .md 로드 -> 파싱 -> 렌더

function getSlug() {
  const params = new URLSearchParams(window.location.search);
  return params.get("slug");
}

async function init() {
  const slug = getSlug();
  const container = document.getElementById("post-content");

  if (!slug) {
    container.innerHTML = `<p class="error">글을 찾을 수 없습니다.</p>`;
    return;
  }

  try {
    const res = await fetch(`posts/${slug}`);
    if (!res.ok) throw new Error("not found");
    const raw = await res.text();
    const { meta, html } = parsePost(raw);

    document.title = meta.title ? `${meta.title} · Blog` : "Blog";
    document.getElementById("post-title").textContent = meta.title || slug;
    document.getElementById("post-date").textContent = meta.date || "";
    document.getElementById("post-tags").innerHTML = (meta.tags || [])
      .map((t) => `<span class="tag">${t}</span>`)
      .join("");
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<p class="error">글을 불러오지 못했습니다.</p>`;
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", init);
