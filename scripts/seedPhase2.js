/**
 * Seeds the Phase-2 content that came off the client's previous site
 * (mossanomarmo.com), which the feedback document names as the source for both
 * the Clients page and the Projects page.
 *
 *   npm run seed:phase2              dry run — prints what it would do
 *   npm run seed:phase2 -- --write   creates records and uploads imagery
 *
 * Idempotent: everything is matched by name or slug and skipped if it exists,
 * so a partial run can simply be repeated.
 *
 * ⚠️ It seeds the seven client categories and only those clients whose identity
 * is actually verifiable. The old site's logo grid carries 53 images, but they
 * are named "Untitled_design_99.png" and every one has the alt text "Massano
 * Marmo" — there is no way to know which company most of them belong to. Naming
 * them from guesswork would put invented client names on a page whose entire job
 * is credibility, so the rest are left for the team to add through the CRM, which
 * is what Phase-2 §"Important" asks for anyway.
 */
import mongoose from "mongoose";
import { env } from "../src/config/env.js";
import { connectDb } from "../src/config/db.js";
import { logger } from "../src/config/logger.js";
import { ClientCategoryModel, ClientModel } from "../src/modules/client/client.model.js";
import { ApplicationModel } from "../src/modules/application/application.model.js";
import { MediaModel } from "../src/modules/media/media.model.js";
import { storage } from "../src/utils/storage/index.js";
import { slugify, uniqueSlug } from "../src/utils/slugify.js";

const WRITE = process.argv.includes("--write");
const OLD_SITE = "https://mossanomarmo.com";

/** The old site's own headings, in its own order. */
const CATEGORIES = [
  "Architects & Interior Designers",
  "Builders & Developers",
  "Food Chains",
  "Banks",
  "Government",
  "Hotels",
  "Automobiles",
];

/**
 * Only the logos whose company is unambiguous from the file itself. Everything
 * else on that page is an unnamed image — see the warning above.
 */
const CLIENTS = [
  { name: "Yes Bank", category: "Banks", file: "Yes_Bank_Logo-01_16abc.png" },
  {
    name: "Kotak Mahindra Bank",
    category: "Banks",
    file: "kotak-mahindra-bank-logo-vector_logoshape_efb09.png",
  },
  { name: "Haldiram's", category: "Food Chains", file: "halidram-logo_3931f.jpg" },
  { name: "Taj Hotels", category: "Hotels", file: "Taj_Hotels_logo.svg_9de73.png" },
  { name: "BMW", category: "Automobiles", file: "BMW.svg_7c433.png" },
  { name: "Audi", category: "Automobiles", file: "audi-logo-png_seeklogo-13450_8c2eb.png" },
  {
    name: "Mercedes-Benz",
    category: "Automobiles",
    file: "mercedes-benz-logo-png_seeklogo-190348_1a5dd.png",
  },
  { name: "Lexus", category: "Automobiles", file: "lexus-logo-black-and-white_7e685.png" },
];

/**
 * The fourteen projects listed on the old site, with its figures.
 *
 * Where the site and the 2026 brochure disagree — Piramal House and Omkar 1973 —
 * the site wins: it is the newer of the two and the client pointed at it.
 *
 * `application` is required by the model and is the room, not the sector. Hotels
 * get hotel-lobby; the rest are flooring, which is what a bulk marble supply to
 * a tower actually is. The team can refine either from the admin.
 */
const PROJECTS = [
  {
    name: "Salsette 27",
    sector: "residential",
    areaSqFt: 450000,
    description: "Large-scale luxury residential tower.",
    file: "Screenshot_2025-12-02_at_5.48.40_PM_394df.png",
  },
  {
    name: "Navi Mumbai International Airport",
    sector: "infrastructure",
    areaSqFt: 200000,
    description: "Airport infrastructure.",
    file: "Navi-Mumbai-International-Airport_85b38.jpg",
  },
  {
    name: "Lokhandwala Minerva",
    sector: "residential",
    areaSqFt: 200000,
    description: "High-rise residential tower.",
    file: "JLL_Mumbai_Minerva_6668_EXT_1_e9198.webp",
  },
  {
    name: "Lodha World One",
    sector: "residential",
    areaSqFt: 175000,
    description: "Luxury residential tower.",
    file: "3ae425186bb340d2abb271880e12f90d.large_77577.webp",
  },
  {
    name: "Exquisite by Oberoi Realty",
    sector: "residential",
    areaSqFt: 150000,
    description: "Residential development.",
    file: "Untitled_design_-_2025-09-12T132555.917_ee233.png",
  },
  {
    name: "Marquis Beach Resort",
    sector: "hospitality",
    application: "hotel-lobby",
    areaSqFt: 100000,
    description: "Hospitality resort.",
    file: "Marquis_Beach_Resort_5765b.png",
  },
  {
    name: "Omkar 1973",
    sector: "residential",
    areaSqFt: 80000,
    description: "Premium residential tower.",
    file: "2_28e5a.webp",
  },
  {
    name: "Rustomjee Crown",
    sector: "residential",
    areaSqFt: 75000,
    description: "Luxury residential complex.",
    file: "Crown-ins_bccd6.jpg",
  },
  {
    name: "Vadi Lake Mulshi",
    sector: "residential",
    areaSqFt: 60000,
    description: "Luxury villa development.",
    file: "4444_ae638.png",
  },
  {
    name: "Piramal House",
    sector: "residential",
    areaSqFt: 50000,
    description: "Premium residential.",
    file: "Isha-Ambani-house-photos_85ba4.jpg",
  },
  {
    name: "Applaud 38",
    sector: "residential",
    areaSqFt: 25000,
    description: "Residential complex.",
    file: "Screenshot_2025-12-03_at_5.42.57_PM_5446d.png",
  },
  {
    name: "Bamboo Hotels by Prestige Group",
    sector: "hospitality",
    application: "hotel-lobby",
    areaSqFt: 25000,
    description: "Hospitality.",
    file: "1400__1519912295_1373721_1500_1125_45307.jpg",
  },
  {
    name: "Le Méridien Paro, Riverfront",
    sector: "hospitality",
    application: "hotel-lobby",
    areaSqFt: 10000,
    description: "Hospitality.",
    file: "Le_meridien_Riverfront-scaled_a9009.jpg",
  },
  {
    name: "Mumbai Coastal Road",
    sector: "infrastructure",
    // No square footage on the old site — it quotes the run, not an area.
    description: "Transport infrastructure. 2 km of imported 60 mm granite.",
    file: "495966285_696870342750770_4462791372550337863_n_95d6b.jpg",
  },
];

/** Downloads one asset from the old site and stores it through the provider. */
async function importImage(file, { kind, alt }) {
  const url = `${OLD_SITE}/assets/images/${file}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} fetching ${file}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const stored = await storage.upload(buffer, {
    filename: file,
    mimeType: res.headers.get("content-type") || "image/png",
    folder: kind === "logo" ? "clients" : "applications",
  });

  return MediaModel.create({
    filename: file,
    mimeType: stored.mimeType ?? "image/png",
    kind: kind === "logo" ? "general" : "application",
    alt,
    // A logo is line art on a flat ground; the hero trim would eat it, and
    // nothing else consumes this flag for these records.
    trimSafe: false,
    ...stored,
  });
}

async function seedCategories() {
  const bySlug = new Map();
  for (const [i, name] of CATEGORIES.entries()) {
    const slug = slugify(name);
    let doc = await ClientCategoryModel.findOne({ slug });
    if (doc) {
      bySlug.set(name, doc);
      console.log(`  = category ${name}`);
      continue;
    }
    if (!WRITE) {
      console.log(`  + category ${name}`);
      continue;
    }
    doc = await ClientCategoryModel.create({ name, slug, sortOrder: i });
    bySlug.set(name, doc);
    console.log(`  + category ${name}`);
  }
  return bySlug;
}

async function seedClients(categories) {
  for (const [i, entry] of CLIENTS.entries()) {
    const existing = await ClientModel.findOne({ name: entry.name, isDeleted: false });
    if (existing) {
      console.log(`  = client ${entry.name}`);
      continue;
    }
    if (!WRITE) {
      console.log(`  + client ${entry.name}  (${entry.category})`);
      continue;
    }

    const category = categories.get(entry.category);
    if (!category) {
      console.log(`  ! client ${entry.name} — category missing, skipped`);
      continue;
    }

    try {
      const logo = await importImage(entry.file, { kind: "logo", alt: entry.name });
      await ClientModel.create({
        name: entry.name,
        category: category._id,
        logo: logo._id,
        sortOrder: i,
      });
      console.log(`  + client ${entry.name}`);
    } catch (err) {
      console.log(`  ! client ${entry.name} — ${err.message}`);
    }
  }
}

async function seedProjects() {
  for (const entry of PROJECTS) {
    const existing = await ApplicationModel.findOne({
      projectName: entry.name,
      isDeleted: false,
    });
    if (existing) {
      console.log(`  = project ${entry.name}`);
      continue;
    }
    if (!WRITE) {
      console.log(
        `  + project ${entry.name}  (${entry.sector}${
          entry.areaSqFt ? `, ${entry.areaSqFt.toLocaleString("en-IN")} sq ft` : ""
        })`,
      );
      continue;
    }

    try {
      const cover = await importImage(entry.file, {
        kind: "application",
        alt: `${entry.name} — MOSSANO stone`,
      });

      const slug = await uniqueSlug(entry.name, (s) =>
        ApplicationModel.exists({ slug: s.toLowerCase() }),
      );

      await ApplicationModel.create({
        title: entry.name,
        projectName: entry.name,
        slug,
        application: entry.application ?? "flooring",
        sector: entry.sector,
        areaSqFt: entry.areaSqFt,
        description: entry.description,
        coverImage: cover._id,
        images: [cover._id],
        isPublished: true,
      });
      console.log(`  + project ${entry.name}`);
    } catch (err) {
      console.log(`  ! project ${entry.name} — ${err.message}`);
    }
  }
}

async function main() {
  await connectDb();
  logger.info({ db: env.MONGODB_URI.split("/").pop() }, "seed:phase2");

  console.log(`\nPhase-2 seed — ${WRITE ? "WRITING" : "dry run, pass --write to apply"}\n`);

  console.log("Client categories");
  const categories = await seedCategories();

  console.log("\nClients (only the verifiable ones — see the file header)");
  await seedClients(categories);

  console.log("\nLandmark projects");
  await seedProjects();

  console.log(
    `\n${WRITE ? "Done." : "Nothing written."} ` +
      `The remaining ${53 - CLIENTS.length} logos on the old site are unnamed; ` +
      `add those through the admin.\n`,
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  logger.error({ err }, "seed:phase2 failed");
  process.exit(1);
});
