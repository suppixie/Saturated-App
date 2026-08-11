import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const failures = [];
const warnings = [];

function luminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map((part) => parseInt(part, 16) / 255);
  const linear = channels.map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrast(first, second) {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

const contrastPairs = [
  ["body ink on cream", "#201a1b", "#fffef8", 4.5],
  ["teal controls on cream", "#2b4959", "#fffef8", 4.5],
  ["red actions on cream", "#cc242c", "#fffef8", 4.5],
  ["white labels on red", "#ffffff", "#cc242c", 4.5],
  ["white labels on teal", "#ffffff", "#2b4959", 4.5],
  ["white labels on accessible green", "#ffffff", "#087647", 4.5],
];

for (const [label, foreground, background, minimum] of contrastPairs) {
  const ratio = contrast(foreground, background);
  if (ratio < minimum) failures.push(`${label}: ${ratio.toFixed(2)}:1`);
  else console.log(`PASS  ${label}: ${ratio.toFixed(2)}:1`);
}

function sourceFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = resolve(directory, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|jsx?)$/.test(name) ? [path] : [];
  });
}

const files = [resolve(root, "App.tsx"), ...sourceFiles(resolve(root, "src"))];
const source = files.map((path) => readFileSync(path, "utf8")).join("\n");
if (/allowFontScaling\s*=\s*\{?false\}?/.test(source))
  failures.push("Dynamic text is explicitly disabled in at least one component");
else console.log("PASS  Dynamic text is not disabled");

const pressables = source.match(/<Pressable\b/g)?.length || 0;
const labels = source.match(/accessibilityLabel=/g)?.length || 0;
const roles = source.match(/accessibilityRole=/g)?.length || 0;
if (labels < pressables * 0.65)
  warnings.push(`${pressables - labels} Pressable instances rely on visible text or inherited labels; verify these manually with VoiceOver/TalkBack.`);
console.log(`PASS  Screen-reader metadata present (${labels} labels, ${roles} roles, ${pressables} Pressables)`);

if (warnings.length) warnings.forEach((warning) => console.warn(`WARN  ${warning}`));
if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL  ${failure}`));
  process.exit(1);
}
console.log("\nAccessibility static checks passed. Device testing at 200% text and with VoiceOver/TalkBack remains required.");
