// 프론트매터 분리 + 마크다운 -> HTML 변환 (외부 라이브러리 없이 직접 구현)

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  const meta = { title: "", date: "", tags: [], summary: "" };
  let body = raw;

  if (match) {
    body = raw.slice(match[0].length);
    const lines = match[1].split("\n");
    for (const line of lines) {
      const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
      if (!kv) continue;
      const key = kv[1].trim();
      let value = kv[2].trim();

      if (key === "tags") {
        const arrMatch = value.match(/^\[(.*)\]$/);
        if (arrMatch) {
          meta.tags = arrMatch[1]
            .split(",")
            .map((t) => t.trim().replace(/^["']|["']$/g, ""))
            .filter(Boolean);
        } else if (value) {
          meta.tags = [value.replace(/^["']|["']$/g, "")];
        }
      } else {
        value = value.replace(/^["']|["']$/g, "");
        meta[key] = value;
      }
    }
  }

  return { meta, body };
}

// 인라인 마크다운 (굵게, 기울임, 인라인 코드, 링크, 이미지) 처리
function renderInline(text) {
  let out = escapeHtml(text);

  // 이미지 ![alt](url)
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, alt, url, title) => {
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
    return `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}"${titleAttr}>`;
  });

  // 링크 [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, label, url, title) => {
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
    return `<a href="${escapeHtml(url)}"${titleAttr} target="_blank" rel="noopener noreferrer">${label}</a>`;
  });

  // 인라인 코드
  out = out.replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`);

  // 굵게+기울임
  out = out.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
  // 굵게
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // 기울임
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  return out;
}

function parseMarkdownBody(body) {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const html = [];

  let i = 0;
  let paragraphBuf = [];
  let listBuf = null; // { type: 'ul'|'ol', items: [] }

  function flushParagraph() {
    if (paragraphBuf.length) {
      html.push(`<p>${renderInline(paragraphBuf.join(" "))}</p>`);
      paragraphBuf = [];
    }
  }

  function flushList() {
    if (listBuf) {
      const tag = listBuf.type;
      const items = listBuf.items.map((it) => `<li>${renderInline(it)}</li>`).join("");
      html.push(`<${tag}>${items}</${tag}>`);
      listBuf = null;
    }
  }

  while (i < lines.length) {
    const line = lines[i];

    // 코드 블록
    const fenceMatch = line.match(/^```(\w*)\s*$/);
    if (fenceMatch) {
      flushParagraph();
      flushList();
      const lang = fenceMatch[1] || "";
      const codeLines = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // 닫는 ``` 건너뛰기
      const codeText = codeLines.join("\n");
      const highlighted = window.highlightCode
        ? window.highlightCode(codeText, lang)
        : escapeHtml(codeText);
      const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : "";
      html.push(`<pre><code${langClass} data-lang="${escapeHtml(lang)}">${highlighted}</code></pre>`);
      continue;
    }

    // 수평선
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line) && paragraphBuf.length === 0 && !listBuf) {
      flushParagraph();
      flushList();
      html.push("<hr>");
      i++;
      continue;
    }

    // 헤딩
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${renderInline(headingMatch[2].trim())}</h${level}>`);
      i++;
      continue;
    }

    // 인용문
    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      const quoteLines = [quoteMatch[1]];
      i++;
      while (i < lines.length) {
        const qm = lines[i].match(/^>\s?(.*)$/);
        if (!qm) break;
        quoteLines.push(qm[1]);
        i++;
      }
      html.push(`<blockquote><p>${renderInline(quoteLines.join(" "))}</p></blockquote>`);
      continue;
    }

    // 비순서 리스트
    const ulMatch = line.match(/^\s*[-*+]\s+(.*)$/);
    if (ulMatch) {
      flushParagraph();
      if (!listBuf || listBuf.type !== "ul") {
        flushList();
        listBuf = { type: "ul", items: [] };
      }
      listBuf.items.push(ulMatch[1]);
      i++;
      continue;
    }

    // 순서 리스트
    const olMatch = line.match(/^\s*\d+\.\s+(.*)$/);
    if (olMatch) {
      flushParagraph();
      if (!listBuf || listBuf.type !== "ol") {
        flushList();
        listBuf = { type: "ol", items: [] };
      }
      listBuf.items.push(olMatch[1]);
      i++;
      continue;
    }

    // 빈 줄
    if (/^\s*$/.test(line)) {
      flushParagraph();
      flushList();
      i++;
      continue;
    }

    // 일반 문단 텍스트
    paragraphBuf.push(line.trim());
    i++;
  }

  flushParagraph();
  flushList();

  return html.join("\n");
}

function parsePost(raw) {
  const { meta, body } = parseFrontmatter(raw);
  const html = parseMarkdownBody(body);
  return { meta, html };
}

window.parsePost = parsePost;
window.parseFrontmatter = parseFrontmatter;
