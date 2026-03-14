import fs from "node:fs";
import fsPromises from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

import { centsToDecimal } from "../lib/money";

export type BillingPdfUserRow = {
  userId: string;
  userName: string;
  perFridge: { fridgeName: string; totalCents: number }[];
  eventBillsCents: number;
  manualChargesCents: number;
  carryoverCents: number;
  grandTotalCents: number;
};

export async function writeBillingPdf(params: {
  outDir: string;
  fileName: string;
  title: string;
  houseName: string;
  createdAtIso: string;
  rows: BillingPdfUserRow[];
}) {
  await fsPromises.mkdir(params.outDir, { recursive: true });
  const outPath = path.join(params.outDir, params.fileName);

  // This file lives outside `app/frontend/`, so normal Node resolution would not find deps that are
  // installed only in `app/frontend/node_modules`. Resolve from process.cwd() (which is the app root).
  // Also keep it dynamic so Next/Webpack doesn't try to bundle pdfkit.
  const requireFromCwd = createRequire(path.join(process.cwd(), "package.json"));
  const PDFDocument = requireFromCwd("pdfkit") as typeof import("pdfkit");

  const doc = new PDFDocument({ margin: 48 });
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  doc.fontSize(18).text("Drinks Billing", { align: "left" });
  doc.moveDown(0.25);
  doc.fontSize(12).fillColor("#111").text(`House: ${params.houseName}`);
  doc.text(`Title: ${params.title}`);
  doc.text(`Created: ${new Date(params.createdAtIso).toLocaleString()}`);

  doc.moveDown(1);

  const sorted = [...params.rows].sort((a, b) => a.userName.localeCompare(b.userName));
  for (const row of sorted) {
    doc.fontSize(13).fillColor("#000").text(row.userName);
    doc.moveDown(0.2);

    const perFridgeSorted = [...row.perFridge].sort((a, b) => a.fridgeName.localeCompare(b.fridgeName));
    for (const f of perFridgeSorted) {
      doc.fontSize(10).fillColor("#333").text(`- ${f.fridgeName}: ${centsToDecimal(f.totalCents)}`);
    }
    doc.fontSize(10).fillColor("#333").text(`- Event bills: ${centsToDecimal(row.eventBillsCents)}`);
    doc.fontSize(10).fillColor("#333").text(`- Manual charges: ${centsToDecimal(row.manualChargesCents)}`);
    doc.fontSize(10).fillColor("#333").text(`- Carryover: ${centsToDecimal(row.carryoverCents)}`);

    doc.moveDown(0.2);
    doc.fontSize(11).fillColor("#000").text(`Total: ${centsToDecimal(row.grandTotalCents)}`);
    doc.moveDown(0.8);

    if (doc.y > 720) doc.addPage();
  }

  doc.end();
  await new Promise<void>((resolve, reject) => {
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });

  return outPath;
}
