import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const sourcePath = path.join(projectRoot, "app-config.json");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

const wwwIndexPath = path.join(projectRoot, "www", "index.html");

/** ZMP cần đường dẫn kiểu `assets/...` (không `./` đầu). */
function normalizeAssetPath(href) {
  return String(href)
    .trim()
    .replace(/^\.\//, "")
    .replace(/^\//, "");
}

/**
 * Vite ghi chunk entry vào www/index.html — đồng bộ sang listCSS / listSyncJS.
 *
 * QUAN TRỌNG: `zmp deploy` đọc **`app-config.json` ở thư mục gốc** trước
 * (`readAppConfig` trong zmp-cli-core), chỉ khi lỗi mới đọc `www/app-config.json`.
 * Nếu file gốc để listCSS/listSyncJS rỗng → lỗi "No asset defined" dù www đã đúng.
 */
function readAssetListsFromWwwIndex() {
  if (!fs.existsSync(wwwIndexPath)) {
    return null;
  }
  const html = fs.readFileSync(wwwIndexPath, "utf8");
  const listCSS = [];
  for (const m of html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)) {
    const href = m[0].match(/href=["']([^"']+)["']/i);
    if (href) listCSS.push(normalizeAssetPath(href[1]));
  }
  const listSyncJS = [];
  for (const m of html.matchAll(/<script[^>]+type=["']module["'][^>]*>/gi)) {
    const src = m[0].match(/src=["']([^"']+)["']/i);
    if (src) listSyncJS.push(normalizeAssetPath(src[1]));
  }
  if (listCSS.length === 0 || listSyncJS.length === 0) {
    return null;
  }
  return { listCSS, listSyncJS };
}

const fromHtml = readAssetListsFromWwwIndex();

if (fromHtml) {
  // ok
} else if (fs.existsSync(wwwIndexPath)) {
  console.error(
    "[sync-app-config] Có www/index.html nhưng không đọc được stylesheet hoặc script module — kiểm tra build.",
  );
  process.exit(1);
}

const targets = [
  sourcePath,
  path.join(projectRoot, "www", "app-config.json"),
  path.join(projectRoot, "src", "www", "app-config.json"),
];

for (const target of targets) {
  if (!fs.existsSync(target) && target !== sourcePath) continue;

  let current = {};
  try {
    current = JSON.parse(fs.readFileSync(target, "utf8"));
  } catch {
    current = {};
  }

  const merged = {
    ...current,
    app: source.app,
    pages: source.pages,
    ...(fromHtml
      ? {
          listCSS: fromHtml.listCSS,
          listSyncJS: fromHtml.listSyncJS,
          listAsyncJS: Array.isArray(current.listAsyncJS) ? current.listAsyncJS : [],
        }
      : {
          listCSS: source.listCSS?.length ? source.listCSS : (current.listCSS ?? []),
          listSyncJS: source.listSyncJS?.length ? source.listSyncJS : (current.listSyncJS ?? []),
          listAsyncJS: current.listAsyncJS ?? [],
        }),
  };

  if (!merged.listCSS?.length || !merged.listSyncJS?.length) {
    console.error(
      `[sync-app-config] ${path.relative(projectRoot, target)}: thiếu listCSS hoặc listSyncJS sau khi ghép.`,
    );
    process.exit(1);
  }

  fs.writeFileSync(target, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  console.log(`[sync-app-config] Updated ${path.relative(projectRoot, target)}`);
}
