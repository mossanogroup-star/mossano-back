/**
 * Regenerates src/config/countries.generated.js from the flag files.
 *
 * Nothing about countries is typed by hand anywhere in this codebase. The
 * `flag-icons` package is the source of truth for *which* codes exist — the
 * same package the storefront renders its flag images from — and Node's own
 * Intl.DisplayNames supplies the name for each. So a country cannot end up in
 * the dropdown without a flag, or carry a name that disagrees with the
 * browser's.
 *
 * The package is a devDependency of mossano-front, not of this service: the
 * output below is committed, so a deploy never runs this. Run it locally, with
 * both repos side by side, after bumping flag-icons:
 *
 *   npm run gen:countries
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACK_ROOT = path.resolve(HERE, "..");
/**
 * The package first, the rendered folder second. The folder is gitignored and
 * may not exist on a fresh clone; the package is where the truth lives either
 * way. FLAGS_DIR overrides both.
 */
const CANDIDATES = [
  process.env.FLAGS_DIR,
  "../mossano-front/node_modules/flag-icons/flags/4x3",
  "../mossano-front/public/flags",
]
  .filter(Boolean)
  .map((dir) => path.resolve(BACK_ROOT, dir));

const FLAGS_DIR = CANDIDATES.find((dir) => fs.existsSync(dir));

if (!FLAGS_DIR) {
  throw new Error(
    `No flag source found. Install mossano-front's dependencies, or set FLAGS_DIR. Tried:\n  ${CANDIDATES.join("\n  ")}`,
  );
}
const OUT = path.join(BACK_ROOT, "src/config/countries.generated.js");

const displayNames = new Intl.DisplayNames(["en"], { type: "region" });

const countries = fs
  .readdirSync(FLAGS_DIR)
  .filter((file) => file.endsWith(".svg") || file.endsWith(".webp"))
  .map((file) => file.replace(/\.(svg|webp)$/, ""))
  .filter((code) => /^[a-z]{2}$/.test(code))
  .map((code) => {
    const upper = code.toUpperCase();
    const label = displayNames.of(upper);
    // Intl echoes the code back when it knows no such region — that is a
    // subdivision or a private-use flag, not a country.
    return label && label !== upper ? { code, label } : null;
  })
  .filter(Boolean)
  .sort((a, b) => a.label.localeCompare(b.label, "en"));

if (countries.length < 100) {
  throw new Error(`Only ${countries.length} countries resolved — the flags folder looks wrong.`);
}

const body = `/**
 * GENERATED FILE — do not edit.
 *
 * Written by scripts/generateCountries.js from the flag-icons package, with
 * names from Intl.DisplayNames. Every country here has an image at
 * /flags/<code>.webp — rendered from the same package by the storefront's
 * \`npm run flags\` — which is what lets the site build that URL with no lookup
 * table anywhere.
 *
 * Regenerate with: npm run gen:countries
 */
const COUNTRIES = ${JSON.stringify(countries, null, 2)};

const COUNTRY_CODES = COUNTRIES.map((c) => c.code);

const countryLabel = (code) => COUNTRIES.find((c) => c.code === code)?.label ?? null;

export { COUNTRIES, COUNTRY_CODES, countryLabel };
`;

fs.writeFileSync(OUT, body);
console.log(`Wrote ${countries.length} countries to ${path.relative(BACK_ROOT, OUT)}`);
