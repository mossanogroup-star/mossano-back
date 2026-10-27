/**
 * A private selection as a PDF — Admin Scope §6, Website §9.
 *
 * Carries the same facts as the web page, absent ones included: a spec that
 * reads "On request" on the site reads "On request" here. Images are embedded
 * rather than linked, so the file survives being emailed.
 */
import PDFDocument from "pdfkit";
import { logger } from "../../config/logger.js";
import { storage, deliveryType } from "../storage/index.js";
import { brand } from "../../config/brand.js";

const PAGE_MARGIN = 48;
const INK = "#1a1613";
const MUTED = "#7a716a";
const RULE = "#ddd6cd";
const BRASS = "#9d7c34";

/**
 * Fetch a slab image as something pdfkit can embed.
 *
 * ⚠ pdfkit takes JPEG and PNG only, and every image here is WebP. Passing the
 * bytes straight to `doc.image()` throws "Unknown image format" and the PDF
 * comes out with no photography and no error — so anything else is transcoded.
 * A failure returns null and the caller draws a placeholder.
 */
async function fetchImage(url, { timeoutMs = 8000 } = {}) {
  if (!url) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      logger.warn({ url, status: res.status }, "Slab image could not be fetched for the PDF");
      return null;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const type = res.headers.get("content-type") ?? "";
    if (type.includes("jpeg") || type.includes("jpg") || type.includes("png")) return buffer;

    const { default: sharp } = await import("sharp");
    return await sharp(buffer).jpeg({ quality: 82 }).toBuffer();
  } catch (err) {
    logger.warn({ err: err.message, url }, "Could not prepare an image for the selection PDF");
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * A page-sized rendition, not the original: twelve slabs at full resolution is
 * a 40 MB attachment that bounces, where 900px still prints sharp.
 */
function printUrl(media) {
  if (!media) return null;
  return (
    storage.derive(media.storageKey, media.resourceType ?? "image", {
      width: 900,
      type: deliveryType(media.url),
    }) || media.url
  );
}

/** "9619176132" → "+91 96191 76132", the way the brochure prints it. */
const formatPhone = (n) => `+91 ${n.slice(0, 5)} ${n.slice(5)}`;

/**
 * Client request (27 Oct 2026) — the company name and number were only in a
 * 7.5pt line at the foot of the page. They now head every page, letterhead
 * style, so whoever the PDF is forwarded to sees who to call first.
 */
function drawLetterhead(doc) {
  const width = doc.page.width - PAGE_MARGIN * 2;
  const top = 34;

  doc.font("Helvetica-Bold").fontSize(17).fillColor(INK);
  doc.text(brand.name, PAGE_MARGIN, top, { characterSpacing: 3, lineBreak: false });
  doc.font("Helvetica").fontSize(7.5).fillColor(MUTED);
  doc.text(brand.tagline.toUpperCase(), PAGE_MARGIN, top + 23, {
    characterSpacing: 1.5,
    lineBreak: false,
  });

  doc.font("Helvetica-Bold").fontSize(10).fillColor(INK);
  doc.text(brand.phones.map(formatPhone).join("   |   "), PAGE_MARGIN, top, {
    width,
    align: "right",
    lineBreak: false,
  });
  doc.font("Helvetica").fontSize(8.5).fillColor(MUTED);
  doc.text(`${brand.email}   ·   ${brand.canonicalDomain}`, PAGE_MARGIN, top + 15, {
    width,
    align: "right",
    lineBreak: false,
  });
  doc.text(`${brand.address.city}, ${brand.address.country}`, PAGE_MARGIN, top + 27, {
    width,
    align: "right",
    lineBreak: false,
  });

  doc
    .strokeColor(BRASS)
    .lineWidth(1)
    .moveTo(PAGE_MARGIN, top + 46)
    .lineTo(doc.page.width - PAGE_MARGIN, top + 46)
    .stroke();
}

/**
 * The title and who the document is for. Client request (27 Oct 2026) — the
 * customer's details were a line of grey text, or "—" on a shortlist; they
 * now sit in their own panel at the top of the first page.
 */
function drawIntro(doc, selection) {
  doc.font("Helvetica").fillColor(INK).fontSize(22);
  doc.text(selection.title, PAGE_MARGIN, doc.page.margins.top, {
    width: doc.page.width - PAGE_MARGIN * 2,
  });
  doc.moveDown(0.8);

  const details = [
    ["Project", selection.projectName],
    ["Phone", selection.customerPhone],
    ["Email", selection.customerEmail],
  ].filter(([, value]) => value);

  const preparedOn = new Date(selection.preparedOn).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const facts = [
    ["Prepared on", preparedOn],
    ["Reference", selection.reference],
  ].filter(([, value]) => value);

  const width = doc.page.width - PAGE_MARGIN * 2;
  const top = doc.y;
  const height = Math.max(62 + details.length * 15, 20 + facts.length * 30) + 6;
  const leftX = PAGE_MARGIN + 18;
  const rightX = PAGE_MARGIN + width * 0.64;

  doc.rect(PAGE_MARGIN, top, width, height).fillColor("#f6f1ea").fill();
  doc.rect(PAGE_MARGIN, top, 3, height).fillColor(BRASS).fill();

  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(BRASS);
  doc.text("PREPARED FOR", leftX, top + 16, { characterSpacing: 1.5, lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(16).fillColor(INK);
  doc.text(selection.customerName || "—", leftX, top + 30, { width: rightX - leftX - 16 });

  let y = top + 56;
  for (const [label, value] of details) {
    doc.font("Helvetica").fontSize(9.5).fillColor(MUTED);
    doc.text(`${label}:`, leftX, y, { width: 50, lineBreak: false });
    doc.fillColor(INK).text(value, leftX + 52, y, { width: rightX - leftX - 68, lineBreak: false });
    y += 15;
  }

  y = top + 16;
  for (const [label, value] of facts) {
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(BRASS);
    doc.text(label.toUpperCase(), rightX, y, { characterSpacing: 1.5, lineBreak: false });
    doc.font("Helvetica").fontSize(10).fillColor(INK);
    doc.text(value, rightX, y + 12, { width: PAGE_MARGIN + width - rightX - 12, lineBreak: false });
    y += 30;
  }

  doc.x = PAGE_MARGIN;
  doc.y = top + height + 16;
  doc.font("Helvetica");

  if (selection.introduction) {
    doc
      .fillColor(INK)
      .fontSize(10)
      .text(selection.introduction, PAGE_MARGIN, doc.y, { width: 430 });
  }
}

function drawStone(doc, stone, imageBuffer, index) {
  const note = stone.selectionNote;
  // A stone entry is roughly 300pt tall; start a page when it will not fit,
  // so an entry is never split across the fold.
  if (doc.y > doc.page.height - 320) doc.addPage();

  const top = doc.y;
  const imageWidth = 220;
  const textX = PAGE_MARGIN + imageWidth + 24;
  const textWidth = doc.page.width - PAGE_MARGIN - textX;

  let drewImage = false;
  if (imageBuffer) {
    try {
      doc.image(imageBuffer, PAGE_MARGIN, top, {
        fit: [imageWidth, 165],
        align: "center",
      });
      drewImage = true;
    } catch (err) {
      logger.warn({ err: err.message }, "pdfkit could not decode a slab image");
    }
  }

  // Drawn whenever there is no image *or* the embed failed — otherwise a
  // decode error leaves a blank rectangle with the specs floating beside it.
  if (!drewImage) {
    doc
      .rect(PAGE_MARGIN, top, imageWidth, 165)
      .fillColor("#f2ede6")
      .fill()
      .fillColor(MUTED)
      .fontSize(8)
      .text("Image on request", PAGE_MARGIN, top + 78, {
        width: imageWidth,
        align: "center",
      });
  }

  // Positioned explicitly: the image occupies the left column, so the text
  // starts at its own x rather than flowing underneath the picture.
  doc.fillColor(BRASS).fontSize(8);
  doc.text(`${String(index + 1).padStart(2, "0")}  ·  ${stone.mossanoCode}`, textX, top, {
    width: textWidth,
    characterSpacing: 1.2,
  });

  doc
    .moveDown(0.4)
    .fillColor(INK)
    .fontSize(15)
    .text(stone.name, textX, doc.y, { width: textWidth });

  doc.moveDown(0.3).fontSize(9).fillColor(MUTED);
  doc.text(`${stone.availabilityLabel}${stone.verifiedLabel ? ` · ${stone.verifiedLabel}` : ""}`, {
    width: textWidth,
  });

  doc.moveDown(0.7);
  // The same spec block the stone page renders, "On request" included — the
  // DTO already resolved it, so the two cannot disagree.
  for (const spec of stone.specs ?? []) {
    const y = doc.y;
    doc.fillColor(MUTED).fontSize(8.5).text(spec.label, textX, y, { width: 96 });
    doc
      .fillColor(INK)
      .fontSize(8.5)
      .text(spec.value, textX + 100, y, { width: textWidth - 100 });
  }

  if (note) {
    doc.moveDown(0.6).fillColor(INK).fontSize(9).text(note, textX, doc.y, {
      width: textWidth,
      oblique: true,
    });
  }

  doc.y = Math.max(doc.y, top + 175);
  doc.moveDown(1);
  doc
    .strokeColor(RULE)
    .lineWidth(0.5)
    .moveTo(PAGE_MARGIN, doc.y)
    .lineTo(doc.page.width - PAGE_MARGIN, doc.y)
    .stroke();
  doc.moveDown(1);
}

/**
 * Every page, with the page count. The bottom margin is lifted while it is
 * drawn: text below it would otherwise make pdfkit start a new, blank page.
 */
function drawFooter(doc, page, pageCount) {
  const bottom = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;

  const width = doc.page.width - PAGE_MARGIN * 2;
  const y = doc.page.height - 46;
  doc
    .strokeColor(RULE)
    .lineWidth(0.5)
    .moveTo(PAGE_MARGIN, y - 10)
    .lineTo(doc.page.width - PAGE_MARGIN, y - 10)
    .stroke();

  // Read from brand rather than written out, so the printed address cannot
  // drift from the one on the contact page.
  const { line1, city, postalCode } = brand.address;
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(INK);
  doc.text(
    `${brand.name}   ·   ${brand.phones.map(formatPhone).join("  /  ")}   ·   ${brand.email}`,
    PAGE_MARGIN,
    y,
    {
      width,
      align: "center",
      lineBreak: false,
    },
  );
  doc.font("Helvetica").fontSize(7.5).fillColor(MUTED);
  doc.text(`${line1}, ${city} ${postalCode}   ·   ${brand.canonicalDomain}`, PAGE_MARGIN, y + 13, {
    width,
    align: "center",
    lineBreak: false,
  });
  doc.text(`Page ${page} of ${pageCount}`, PAGE_MARGIN, y + 13, {
    width,
    align: "right",
    lineBreak: false,
  });

  doc.page.margins.bottom = bottom;
}

/**
 * DTOs, not Mongo documents: the DTO is where the spec block was resolved, so
 * the PDF and the web page cannot disagree. Passing raw documents produced a
 * PDF of undefined fields — a document has no `specs` at all.
 *
 * @param {object} selection public selection DTO; `stones` carries stone DTOs
 *   in curated order, each with its `selectionNote`. `customerPhone` and
 *   `customerEmail` are added by the caller — the public DTO leaves them out.
 * @returns {Promise<Buffer>}
 */
async function buildSelectionPdf(selection) {
  const items = selection.stones ?? [];

  // Fetched up front and in parallel: doing it inside the draw loop would
  // serialise a dozen network round-trips into the response time.
  const buffers = await Promise.all(
    items.map((stone) => fetchImage(printUrl(stone.primaryImage) ?? stone.primaryImageUrl)),
  );

  // The top and bottom margins leave room for the letterhead and footer
  // stamped onto every page at the end.
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 104, bottom: 72, left: PAGE_MARGIN, right: PAGE_MARGIN },
    bufferPages: true,
  });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  const done = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  drawIntro(doc, selection);
  doc.moveDown(1);

  items.forEach((stone, i) => drawStone(doc, stone, buffers[i], i));

  if (!items.length) {
    doc.fillColor(MUTED).fontSize(10).text("No stones have been added to this selection yet.");
  }

  // bufferPages defers page flushing, so the letterhead and footer can be
  // stamped onto every page after the count is known.
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    drawLetterhead(doc);
    drawFooter(doc, i - range.start + 1, range.count);
  }

  doc.end();
  return done;
}

export { buildSelectionPdf };
