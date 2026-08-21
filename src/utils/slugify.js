/**
 * URL slugs for stones, edits and applications.
 *
 * Stone names carry accents ("Nero Marquiña", "Crème Beige"), so the string is
 * normalised to decomposed form and the combining marks stripped — otherwise
 * the accented characters would be dropped outright and two different stones
 * could collapse onto the same slug.
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
 * Suffixes with the lot number when there is one — "black-marquina-17467" is
 * more useful in a shared URL than "black-marquina-2" — and falls back to a
 * counter otherwise.
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
  // 500 collisions on one name is not a real catalogue state; failing loudly
  // beats returning something that will throw on the unique index instead.
  throw new Error(`Could not find a free slug for "${base}"`);
}

export { slugify, uniqueSlug };
