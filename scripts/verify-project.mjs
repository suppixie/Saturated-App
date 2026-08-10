import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const pass = (message) => console.log(`PASS  ${message}`);
const fail = (message) => {
  failures.push(message);
  console.error(`FAIL  ${message}`);
};

const runNode = (args, label) => {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status === 0) pass(label);
  else {
    fail(label);
    if (result.stdout) console.error(result.stdout.trim());
    if (result.stderr) console.error(result.stderr.trim());
  }
};

runNode(["node_modules/typescript/bin/tsc", "--noEmit"], "TypeScript compiles");
runNode(["scripts/validate-legal-site.mjs"], "Legal pages are configured");

const beverages = JSON.parse(
  readFileSync(resolve(root, "data/beverages.json"), "utf8"),
);
const beverageIds = beverages.map((drink) => drink.id);
if (new Set(beverageIds).size === beverageIds.length)
  pass(`${beverages.length} beverage IDs are unique`);
else fail("Beverage IDs contain duplicates");

const requiredDrinkFields = [
  "id",
  "name",
  "category",
  "description",
  "official_tags",
  "is_published",
];
const incompleteDrinks = beverages.filter((drink) =>
  requiredDrinkFields.some((field) => drink[field] === undefined),
);
if (!incompleteDrinks.length) pass("Catalogue records include required fields");
else fail(`${incompleteDrinks.length} catalogue records are incomplete`);

const imageMap = readFileSync(
  resolve(root, "src/data/catalogueImages.ts"),
  "utf8",
);
const imagePaths = [...imageMap.matchAll(/require\("([^\"]+)"\)/g)].map(
  (match) => resolve(root, "src/data", match[1]),
);
const missingImages = imagePaths.filter((path) => !existsSync(path));
if (!missingImages.length)
  pass(`${imagePaths.length} mapped catalogue images exist`);
else fail(`${missingImages.length} mapped catalogue images are missing`);

const migrationNames = readdirSync(resolve(root, "supabase/migrations"))
  .filter((name) => name.endsWith(".sql"))
  .sort();
const migrationVersions = migrationNames.map((name) => name.split("_")[0]);
if (new Set(migrationVersions).size === migrationVersions.length)
  pass(`${migrationNames.length} migration versions are unique`);
else fail("Migration versions contain duplicates");
if (
  migrationNames.at(-1) ===
  "20260810030000_fix_moderator_logout_permissions.sql"
)
  pass("Signed-out permission fix is the latest migration");
else fail("Expected signed-out permission migration is not latest");

const normalize = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const matches = (query, value) => {
  const normalizedQuery = normalize(query);
  const searchable = normalize(value);
  if (normalizedQuery.replace(/[^a-z0-9]/g, "").length < 3) return false;
  return (
    searchable.includes(normalizedQuery) ||
    searchable
      .replace(/\s+/g, "")
      .includes(normalizedQuery.replace(/\s+/g, "")) ||
    normalizedQuery.split(/\s+/).every((word) => searchable.includes(word))
  );
};
const searchCases = [
  ["coca cola", "Coca-Cola", true],
  ["cocacola", "Coca-Cola", true],
  ["caffe", "Caffè Mocha", true],
  ["pina", "Piña Colada", true],
  ["co", "Coca-Cola", false],
];
if (
  searchCases.every(
    ([query, value, expected]) => matches(query, value) === expected,
  )
)
  pass(
    "Search normalization handles punctuation, accents, spacing, and minimum length",
  );
else fail("Search normalization regression detected");

if (failures.length) {
  console.error(`\n${failures.length} verification check(s) failed.`);
  process.exit(1);
}

console.log("\nSaturated project verification passed.");
