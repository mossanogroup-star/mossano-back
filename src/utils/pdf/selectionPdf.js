/**
 * A private selection as a PDF — Admin Scope §6, Website §9.
 *
 * Carries the same facts as the web page, absent ones included: a spec that
 * reads "On request" on the site reads "On request" here. Images are embedded
 * rather than linked, so the file survives being emailed.
 */
import PDFDocument from "pdfkit";
import { logger } from "../../config/logger.js";
import { storage } from "../storage/index.js";
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
    }) || media.url
  );
}

/**
 * ⚠ In pdfkit, letter-spacing is an option on `.text()`, not a chainable
 * document method. `doc.characterSpacing(4)` throws — it does not exist.
 */
function tracked(doc, text, spacing, options = {}) {
  doc.text(text, { characterSpacing: spacing, ...options });
}

function drawHeader(doc, selection) {
  doc.fillColor(INK).font("Helvetica").fontSize(16);
  tracked(doc, "MOSSANO MARMO", 4, { align: "left" });

  doc.moveDown(0.2).fillColor(MUTED).fontSize(8);
  tracked(doc, "CURATED NATURAL STONE. SOURCED GLOBALLY.", 1.5);

  doc.moveDown(1.4);
  doc
    .strokeColor(RULE)
    .lineWidth(0.5)
    .moveTo(PAGE_MARGIN, doc.y)
    .lineTo(doc.page.width - PAGE_MARGIN, doc.y)
    .stroke();
  doc.moveDown(1.4);

  doc.fillColor(INK).fontSize(22).font("Helvetica").text(selection.title);
  doc.moveDown(0.6);

  doc.fontSize(10).fillColor(MUTED);
  doc.text(`Prepared for: ${selection.customerName}`);
  if (selection.projectName) doc.text(`Project: ${selection.projectName}`);
  // `preparedOn`, not `createdAt` — the public DTO renames it, and reading the
  // document's field here produced "Invalid Date" on the page the customer sees.
  doc.text(
    `Prepared on: ${new Date(selection.preparedOn).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}`,
  );
  doc.text(`Reference: ${selection.reference}`);

  if (selection.introduction) {
    doc.moveDown(1).fillColor(INK).fontSize(10).text(selection.introduction, { width: 430 });
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

function drawFooter(doc, { whatsappNumber, email }) {
  const y = doc.page.height - 40;
  doc
    .fillColor(MUTED)
    .fontSize(7.5)
    .text(
      // Read from brand rather than written out, so the printed address cannot
      // drift from the one on the contact page.
      `MOSSANO MARMO  ·  ${brand.address.city}  ·  ${email}  ·  +${whatsappNumber}`,
      PAGE_MARGIN,
      y,
      { width: doc.page.width - PAGE_MARGIN * 2, align: "center" },
    );
}

/**
 * DTOs, not Mongo documents: the DTO is where the spec block was resolved, so
 * the PDF and the web page cannot disagree. Passing raw documents produced a
 * PDF of undefined fields — a document has no `specs` at all.
 *
 * @param {object} selection public selection DTO; `stones` carries stone DTOs
 *   in curated order, each with its `selectionNote`
 * @returns {Promise<Buffer>}
 */
async function buildSelectionPdf(selection, { whatsappNumber, email } = {}) {
  const items = selection.stones ?? [];

  // Fetched up front and in parallel: doing it inside the draw loop would
  // serialise a dozen network round-trips into the response time.
  const buffers = await Promise.all(
    items.map((stone) => fetchImage(printUrl(stone.primaryImage) ?? stone.primaryImageUrl)),
  );

  const doc = new PDFDocument({
    size: "A4",
    margin: PAGE_MARGIN,
    bufferPages: true,
  });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  const done = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  drawHeader(doc, selection);
  doc.moveDown(1.5);

  items.forEach((stone, i) => drawStone(doc, stone, buffers[i], i));

  if (!items.length) {
    doc.fillColor(MUTED).fontSize(10).text("No stones have been added to this selection yet.");
  }

  // bufferPages defers page flushing, so the footer can be stamped onto every
  // page after the count is known.
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    drawFooter(doc, { whatsappNumber, email });
  }

  doc.end();
  return done;
}

export { buildSelectionPdf };
