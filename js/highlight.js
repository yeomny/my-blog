// 경량 문법 강조 (정규식 기반, 외부 라이브러리 없음)

const KEYWORDS = {
  javascript: [
    "const", "let", "var", "function", "return", "if", "else", "for", "while",
    "do", "switch", "case", "break", "continue", "class", "extends", "new",
    "this", "import", "export", "default", "from", "async", "await", "try",
    "catch", "finally", "throw", "typeof", "instanceof", "null", "undefined",
    "true", "false", "of", "in", "static", "get", "set", "yield"
  ],
  python: [
    "def", "return", "if", "elif", "else", "for", "while", "break", "continue",
    "class", "import", "from", "as", "try", "except", "finally", "raise",
    "with", "lambda", "None", "True", "False", "and", "or", "not", "in", "is",
    "yield", "pass", "global", "nonlocal", "self"
  ],
  css: [
    "important", "inherit", "initial", "unset", "auto", "none", "solid",
    "flex", "grid", "block", "inline", "absolute", "relative", "fixed"
  ]
};
KEYWORDS.js = KEYWORDS.javascript;

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function highlightGeneric(code, keywords) {
  const escaped = escapeHtml(code);
  const tokenRe = /(\/\/.*$)|(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_]\w*\b)/gm;

  return escaped.replace(tokenRe, (match, lineComment, hashComment, str, num, word) => {
    if (lineComment || hashComment) return `<span class="tok-comment">${match}</span>`;
    if (str) return `<span class="tok-string">${match}</span>`;
    if (num) return `<span class="tok-number">${match}</span>`;
    if (word && keywords.includes(word)) return `<span class="tok-keyword">${match}</span>`;
    return match;
  });
}

function highlightHtml(code) {
  const escaped = escapeHtml(code);
  // 태그 전체와 속성을 감싸는 형태로 처리
  return escaped.replace(/(&lt;\/?[a-zA-Z][\w-]*)((?:\s+[\w-]+(?:=(?:&quot;.*?&quot;|&#39;.*?&#39;))?)*)(\s*\/?&gt;)/g,
    (match, tagStart, attrs, tagEnd) => {
      const highlightedAttrs = attrs.replace(/([\w-]+)(=)(&quot;.*?&quot;|&#39;.*?&#39;)/g,
        (m, name, eq, val) => `<span class="tok-attr">${name}</span>${eq}<span class="tok-string">${val}</span>`);
      return `<span class="tok-keyword">${tagStart}</span>${highlightedAttrs}<span class="tok-keyword">${tagEnd}</span>`;
    });
}

function highlightCode(code, lang) {
  const normalized = (lang || "").toLowerCase();

  if (normalized === "html" || normalized === "xml") {
    return highlightHtml(code);
  }

  if (normalized === "css") {
    return highlightGeneric(code, KEYWORDS.css);
  }

  if (KEYWORDS[normalized]) {
    return highlightGeneric(code, KEYWORDS[normalized]);
  }

  // 지원하지 않는 언어는 이스케이프만 하고 강조 없이 반환
  return escapeHtml(code);
}

window.highlightCode = highlightCode;
