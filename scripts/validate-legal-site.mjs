import { readFileSync } from "node:fs";

const config = readFileSync(
  new URL("../docs/assets/legal.js", import.meta.url),
  "utf8",
);
const placeholders = [
  "[LEGAL CONTROLLER NAME REQUIRED]",
  "[PUBLIC SUPPORT EMAIL REQUIRED]",
];
const unresolved = placeholders.filter((placeholder) =>
  config.includes(placeholder),
);
if (unresolved.length) {
  console.error(
    "Legal site cannot be published until controller name and contact email are set.",
  );
  process.exit(1);
}
console.log("Legal site contact details are configured.");
