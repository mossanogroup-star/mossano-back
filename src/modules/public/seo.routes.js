/**
 * robots.txt and sitemap.xml.
 *
 * Mounted at the root rather than under /api, because that is where crawlers
 * look for them and nowhere else.
 *
 * These matter more here than on most sites. The brief's premise is that
 * architects find stone through search, Instagram and forwarded WhatsApp links,
 * and the whole storefront is server-rendered so that a crawler sees real
 * content. Without a sitemap, that work only pays off for pages a crawler
 * happens to stumble into — a stone page four filters deep may never be found.
 */
import { Router } from "express";
import { env } from "../../config/env.js";
import { stoneRepository } from "../stone/stone.repository.js";
import { editRepository } from "../edit/edit.repository.js";
import { applicationRepository } from "../application/application.repository.js";
import { LOOKS, APPLICATIONS } from "../stone/stone.constants.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

/** XML text nodes: a stone named "Nero & Bianco" would break the document. */
function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

router.get("/robots.txt", (_req, res) => {
  const lines = [
    "User-agent: *",
    "Allow: /",
    "",
    "# The admin panel has nothing to index and sits behind a login.",
    "Disallow: /admin",
    "",
    "# Private selections are addressed by an unguessable token and are prepared",
    "# for one customer. A crawler that indexed one would publish their shortlist.",
    "Disallow: /selection/",
    "",
    "# Device-local, so there is nothing here for a crawler to see.",
    "Disallow: /favourites",
    "",
    `Sitemap: ${env.PUBLIC_BASE_URL}/sitemap.xml`,
    "",
  ];
  res.type("text/plain").send(lines.join("\n"));
});

router.get(
  "/sitemap.xml",
  asyncHandler(async (_req, res) => {
    const base = env.PUBLIC_BASE_URL;

    const [stones, edits, projects] = await Promise.all([
      stoneRepository.allPublishedSlugs(),
      editRepository.allPublishedSlugs(),
      applicationRepository.allPublishedSlugs(),
    ]);

    const entries = [
      { loc: `${base}/`, changefreq: "weekly", priority: "1.0" },
      { loc: `${base}/new-edit`, changefreq: "monthly", priority: "0.9" },
      { loc: `${base}/shop`, changefreq: "weekly", priority: "0.9" },
      { loc: `${base}/look`, changefreq: "monthly", priority: "0.7" },
      { loc: `${base}/application`, changefreq: "monthly", priority: "0.7" },
      { loc: `${base}/projects`, changefreq: "monthly", priority: "0.7" },
      { loc: `${base}/clients`, changefreq: "monthly", priority: "0.6" },
      {
        loc: `${base}/private-sourcing`,
        changefreq: "yearly",
        priority: "0.8",
      },
      { loc: `${base}/about`, changefreq: "yearly", priority: "0.5" },
      { loc: `${base}/contact`, changefreq: "yearly", priority: "0.5" },

      // Taxonomies are fixed by the requirement document, so every one is a
      // real page even when it currently holds nothing.
      ...LOOKS.map((l) => ({
        loc: `${base}/look/${l.slug}`,
        changefreq: "weekly",
        priority: "0.6",
      })),
      ...APPLICATIONS.map((a) => ({
        loc: `${base}/application/${a.slug}`,
        changefreq: "weekly",
        priority: "0.6",
      })),

      // A stone page is the destination the whole site funnels towards, and the
      // one that gets forwarded. lastmod matters: availability changes, and a
      // crawler should come back for it.
      ...stones.map((s) => ({
        loc: `${base}/stone/${s.slug}`,
        lastmod: s.updatedAt,
        changefreq: "weekly",
        priority: "0.8",
      })),
      ...edits.map((e) => ({
        loc: `${base}/new-edit/${e.slug}`,
        lastmod: e.updatedAt,
        changefreq: "monthly",
        priority: "0.7",
      })),
      ...projects.map((p) => ({
        loc: `${base}/application/projects/${p.slug}`,
        lastmod: p.updatedAt,
        changefreq: "monthly",
        priority: "0.6",
      })),
    ];

    // Favourites and private selections are deliberately absent — both are
    // noindex, and one of them is somebody's private shortlist.
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...entries.map(urlEntry),
      "</urlset>",
      "",
    ].join("\n");

    res.type("application/xml").send(xml);
  }),
);

export default router;
