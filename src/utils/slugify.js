/**
 * URL slugs for stones, edits and applications.
 *
 * NFD-normalises first so accents survive as their base letter — without it
 * "Nero Marquiña" and "Crème Beige" lose characters outright, and two distinct
 * stones can collapse onto the same slug.
 */
function slugify(value, { maxLength = 120 } = {}) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}

/**
 * A slug that does not collide, given an async existence check.
 *
 * Prefers the lot number as the discriminator: "black-marquina-17467" means
 * something in a forwarded URL where "black-marquina-2" does not.
 */
async function uniqueSlug(base, exists, { discriminator } = {}) {
  const root = slugify(base) || "stone";

  const candidates = [root];
  if (discriminator) candidates.push(slugify(`${root}-${discriminator}`));

  for (const candidate of candidates) {
    if (!(await exists(candidate))) return candidate;
  }

  const withSuffix = candidates[candidates.length - 1];
  for (let n = 2; n < 500; n += 1) {
    const candidate = `${withSuffix}-${n}`;
    if (!(await exists(candidate))) return candidate;
  }
  // Failing loudly beats returning a slug that will throw on the unique index.
  throw new Error(`Could not find a free slug for "${base}"`);
}

export { slugify, uniqueSlug };
