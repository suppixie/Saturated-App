import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, "..");
const sourcePath = path.join(projectDir, "data", "beverages.json");
const outputPath = path.join(
  projectDir,
  "supabase",
  "migrations",
  "20260730000000_import_final_catalogue.sql",
);

const catalogue = JSON.parse(await fs.readFile(sourcePath, "utf8"));

if (!Array.isArray(catalogue) || catalogue.length === 0) {
  throw new Error("data/beverages.json must contain at least one beverage.");
}

const ids = new Set();
for (const beverage of catalogue) {
  for (const field of ["id", "name", "category", "description"]) {
    if (typeof beverage[field] !== "string" || !beverage[field].trim()) {
      throw new Error(`Beverage is missing required field "${field}".`);
    }
  }
  if (ids.has(beverage.id)) {
    throw new Error(`Duplicate beverage id: ${beverage.id}`);
  }
  ids.add(beverage.id);
}

const databaseRows = catalogue.map(
  ({
    id,
    name,
    category,
    subtype,
    brand,
    origin,
    description,
    image_url,
    official_tags,
    flavour_source_url,
    origin_source_url,
    image_source_url,
    catalogue_source,
    catalogue_number,
    workbook_row,
    is_published,
  }) => ({
    id,
    name,
    category,
    subtype,
    brand,
    origin,
    description,
    image_url,
    official_tags,
    flavour_source_url,
    origin_source_url,
    image_source_url,
    catalogue_source,
    catalogue_number,
    workbook_row,
    is_published,
  }),
);

const json = JSON.stringify(databaseRows);
if (json.includes("$saturated_catalogue$")) {
  throw new Error("Catalogue data conflicts with the SQL dollar delimiter.");
}

const sql = `alter table public.beverages
  add column if not exists subtype text,
  add column if not exists flavour_source_url text,
  add column if not exists origin_source_url text,
  add column if not exists image_source_url text,
  add column if not exists catalogue_source text,
  add column if not exists catalogue_number integer,
  add column if not exists workbook_row integer;

create index if not exists beverages_category_idx
  on public.beverages (category);

create index if not exists beverages_name_lower_idx
  on public.beverages (lower(name));

with catalogue as (
  select *
  from jsonb_to_recordset(
    $saturated_catalogue$${json}$saturated_catalogue$::jsonb
  ) as item(
    id text,
    name text,
    category text,
    subtype text,
    brand text,
    origin text,
    description text,
    image_url text,
    official_tags text[],
    flavour_source_url text,
    origin_source_url text,
    image_source_url text,
    catalogue_source text,
    catalogue_number integer,
    workbook_row integer,
    is_published boolean
  )
)
insert into public.beverages (
  id,
  name,
  category,
  subtype,
  brand,
  origin,
  description,
  image_url,
  official_tags,
  flavour_source_url,
  origin_source_url,
  image_source_url,
  catalogue_source,
  catalogue_number,
  workbook_row,
  is_published
)
select
  id,
  name,
  category,
  subtype,
  brand,
  origin,
  description,
  image_url,
  official_tags,
  flavour_source_url,
  origin_source_url,
  image_source_url,
  catalogue_source,
  catalogue_number,
  workbook_row,
  is_published
from catalogue
on conflict (id) do update
set
  name = excluded.name,
  category = excluded.category,
  subtype = excluded.subtype,
  brand = excluded.brand,
  origin = excluded.origin,
  description = excluded.description,
  image_url = excluded.image_url,
  official_tags = excluded.official_tags,
  flavour_source_url = excluded.flavour_source_url,
  origin_source_url = excluded.origin_source_url,
  image_source_url = excluded.image_source_url,
  catalogue_source = excluded.catalogue_source,
  catalogue_number = excluded.catalogue_number,
  workbook_row = excluded.workbook_row,
  is_published = excluded.is_published,
  updated_at = timezone('utc', now());
`;

await fs.writeFile(outputPath, sql);
console.log(`Generated ${path.relative(projectDir, outputPath)}`);
console.log(`Beverages: ${databaseRows.length}`);
