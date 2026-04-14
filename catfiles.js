#!/usr/bin/env node

/**
 * catfiles.js — Concatenate all project files into a single output file
 * Usage: node catfiles.js [root_dir] [output_file]
 * Config: .catignore (same syntax as .gitignore)
 */

const fs = require("fs");
const path = require("path");

// ─── Default ignore patterns (famous folders/files) ───────────────────────────
const DEFAULT_IGNORE = [
  ".pio",
  ".vscode",
  ".idea",
  ".gitignore",
  "node_modules",
  ".git",
  ".svn",
  ".hg",
  "dist",
  "build",
  ".next",
  ".nuxt",
  "out",
  "coverage",
  ".cache",
  ".parcel-cache",
  ".turbo",
  ".vercel",
  ".netlify",
  "__pycache__",
  ".pytest_cache",
  "venv",
  ".venv",
  "env",
  ".env.local",
  ".env.development.local",
  ".env.test.local",
  ".env.production.local",
  ".env",
  ".env.*",
  "*.log",
  "*.lock",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "*.min.js",
  "*.min.css",
  "*.map",
  "*.jpg",
  "*.jpeg",
  "*.png",
  "*.gif",
  "*.ico",
  "*.svg",
  "*.woff",
  "*.woff2",
  "*.ttf",
  "*.eot",
  "*.mp4",
  "*.mp3",
  "*.zip",
  "*.tar",
  "*.gz",
  "*.rar",
  "*.7z",
  "*.pdf",
  "*.exe",
  "*.dll",
  "*.so",
  "*.dylib",
  "*.bin",
  "catfiles.js", // ignore itself
  "catfiles_output.txt", // ignore default output
];

// ─── Parse .gitignore-style patterns ──────────────────────────────────────────
function parseIgnoreFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

// ─── Match a pattern against a relative path ──────────────────────────────────
function matchPattern(pattern, relPath) {
  const normalRel = relPath.replace(/\\/g, "/");
  const name = path.basename(relPath);

  // Negation patterns (we handle them at caller level)
  if (pattern.startsWith("!")) return false;

  // Strip leading slash for anchored patterns
  const anchored = pattern.startsWith("/");
  const pat = anchored ? pattern.slice(1) : pattern;

  // Convert glob to regex
  const toRegex = (p) => {
    let r = p
      .replace(/[.+^${}()|[\]\\]/g, "\\$&") // escape regex chars
      .replace(/\*\*/g, "§GLOBSTAR§") // ** placeholder
      .replace(/\*/g, "[^/]*") // * = anything except /
      .replace(/§GLOBSTAR§/g, ".*") // ** = anything
      .replace(/\?/g, "[^/]"); // ? = single char
    return r;
  };

  // Pattern with no slash (except trailing) matches basename
  const hasSlash = pat.includes("/") && !pat.endsWith("/");

  if (!hasSlash && !anchored) {
    // Match against name only
    const re = new RegExp(`^${toRegex(pat)}$`, "i");
    if (re.test(name)) return true;
    // Also try matching any path segment
    const parts = normalRel.split("/");
    return parts.some((p) => re.test(p));
  }

  // Match against full relative path
  const cleanPat = pat.endsWith("/") ? pat.slice(0, -1) : pat;
  const re = new RegExp(`^${toRegex(cleanPat)}(/.*)?$`, "i");
  if (re.test(normalRel)) return true;

  // Try matching from any depth if not anchored
  if (!anchored) {
    const re2 = new RegExp(`(^|/)${toRegex(cleanPat)}(/|$)`, "i");
    if (re2.test(normalRel)) return true;
  }

  return false;
}

// ─── Build ignore checker ──────────────────────────────────────────────────────
function buildIgnoreChecker(patterns) {
  const positives = patterns.filter((p) => !p.startsWith("!"));
  const negations = patterns
    .filter((p) => p.startsWith("!"))
    .map((p) => p.slice(1));

  return function isIgnored(relPath) {
    // If explicitly un-ignored, allow
    const unignored = negations.some((p) => matchPattern(p, relPath));
    if (unignored) return false;
    return positives.some((p) => matchPattern(p, relPath));
  };
}

// ─── Detect if a file is binary ───────────────────────────────────────────────
function isBinary(filePath) {
  try {
    const buf = Buffer.alloc(512);
    const fd = fs.openSync(filePath, "r");
    const bytesRead = fs.readSync(fd, buf, 0, 512, 0);
    fs.closeSync(fd);
    for (let i = 0; i < bytesRead; i++) {
      const b = buf[i];
      if (b === 0) return true; // null byte = binary
    }
    return false;
  } catch {
    return true;
  }
}

// ─── Recursive file walker ─────────────────────────────────────────────────────
function walkDir(dir, rootDir, isIgnored, results = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(rootDir, fullPath);

    if (isIgnored(relPath)) continue;

    if (entry.isDirectory()) {
      walkDir(fullPath, rootDir, isIgnored, results);
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }

  return results;
}

// ─── Main ──────────────────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const rootDir = path.resolve(args[0] || ".");
  const outputFile = path.resolve(args[1] || "catfiles_output.txt");

  console.log(`\n📁 Root    : ${rootDir}`);
  console.log(`📄 Output  : ${outputFile}\n`);

  if (!fs.existsSync(rootDir)) {
    console.error(`❌ Directory not found: ${rootDir}`);
    process.exit(1);
  }

  // Load patterns: defaults + .catignore + .gitignore
  const catignorePath = path.join(rootDir, ".catignore");
  const gitignorePath = path.join(rootDir, ".gitignore");

  const userPatterns = [
    ...parseIgnoreFile(catignorePath),
    ...parseIgnoreFile(gitignorePath),
  ];

  const allPatterns = [...DEFAULT_IGNORE, ...userPatterns];
  const isIgnored = buildIgnoreChecker(allPatterns);

  // Walk
  const files = walkDir(rootDir, rootDir, isIgnored);
  console.log(`🔍 Found ${files.length} files to process...\n`);

  // Build output
  const SEPARATOR = "=".repeat(55);
  const out = fs.createWriteStream(outputFile, { encoding: "utf8" });

  let included = 0;
  let skipped = 0;

  for (const filePath of files) {
    if (isBinary(filePath)) {
      console.log(
        `  ⏭  Skipped (binary) : ${path.relative(rootDir, filePath)}`,
      );
      skipped++;
      continue;
    }

    let content;
    try {
      content = fs.readFileSync(filePath, "utf8");
    } catch (err) {
      console.log(
        `  ⚠  Could not read   : ${path.relative(rootDir, filePath)}`,
      );
      skipped++;
      continue;
    }

    // Normalise path separators to forward slash for cross-platform readability
    const displayPath = filePath.replace(/\\/g, "/");

    out.write(`${displayPath}\n`);
    out.write(`${content}\n`);
    out.write(`\n${SEPARATOR}\n\n`);

    console.log(`  ✅ ${path.relative(rootDir, filePath)}`);
    included++;
  }

  out.end(() => {
    console.log(`\n✅ Done!`);
    console.log(`   Included : ${included} files`);
    console.log(`   Skipped  : ${skipped} files`);
    console.log(`   Output   : ${outputFile}\n`);
  });
}

main();
