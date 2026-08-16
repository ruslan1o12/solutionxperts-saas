import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/server";

type LineItem = { desc: string; qty: string; price: string };

export async function generateInvoicePdf(quoteId: string) {
  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("*, customers(name, contact, address)")
    .eq("id", quoteId)
    .single();

  if (!quote) throw new Error("Invoice not found.");

  const { data: business } = await supabase
    .from("business_settings")
    .select("*")
    .eq("id", 1)
    .single();

  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // US Letter
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.106, 0.263, 0.196); // #1B4332
  const signal = rgb(0.239, 0.545, 0.298); // #3D8B4C
  const gray = rgb(0.42, 0.42, 0.4);
  const line = rgb(0.86, 0.9, 0.85);

  let y = 742;
  const marginX = 50;

  // Logo
  try {
    let logoBytes: Buffer | Uint8Array;
    const { data: theme } = await supabase.from("theme_settings").select("logo_url").eq("id", 1).single();
    if (theme?.logo_url) {
      const res = await fetch(theme.logo_url);
      logoBytes = new Uint8Array(await res.arrayBuffer());
    } else {
      const logoPath = path.join(process.cwd(), "public", "icon-192.png");
      logoBytes = fs.readFileSync(logoPath);
    }
    const logoImage = theme?.logo_url
      ? await doc.embedPng(logoBytes).catch(() => doc.embedJpg(logoBytes))
      : await doc.embedPng(logoBytes);
    const logoDim = logoImage.scale(40 / logoImage.width);
    page.drawImage(logoImage, { x: marginX, y: y - 40, width: logoDim.width, height: logoDim.height });
  } catch {
    // logo optional — invoice still generates without it
  }

  const businessName = business?.legal_name || "SolutionXperts Property Improvement";
  page.drawText(businessName, { x: marginX + 50, y: y - 10, size: 14, font: bold, color: ink });
  const businessLines = [
    business?.address,
    [business?.phone, business?.email].filter(Boolean).join(" · "),
    business?.tax_number ? `Tax #: ${business.tax_number}` : null,
    business?.business_number ? `Business #: ${business.business_number}` : null,
  ].filter(Boolean) as string[];
  let by = y - 26;
  businessLines.forEach((l) => {
    page.drawText(l, { x: marginX + 50, y: by, size: 8.5, font, color: gray });
    by -= 11;
  });

  // Title + invoice meta
  page.drawText("INVOICE", { x: 400, y: y - 10, size: 20, font: bold, color: ink });
  const invoiceNo = `INV-${quote.id.slice(0, 8).toUpperCase()}`;
  page.drawText(invoiceNo, { x: 400, y: y - 30, size: 9, font, color: gray });
  page.drawText(`Date: ${new Date(quote.created_at).toLocaleDateString()}`, {
    x: 400,
    y: y - 43,
    size: 9,
    font,
    color: gray,
  });
  if (quote.due_date) {
    page.drawText(`Due: ${quote.due_date}`, { x: 400, y: y - 56, size: 9, font, color: gray });
  }
  const statusColor = quote.status === "Paid" ? signal : rgb(0.7, 0.37, 0.04);
  page.drawText(quote.status.toUpperCase(), { x: 400, y: y - 71, size: 10, font: bold, color: statusColor });

  y -= 100;
  page.drawLine({ start: { x: marginX, y }, end: { x: 562, y }, thickness: 1, color: line });
  y -= 20;

  // Bill to
  page.drawText("BILL TO", { x: marginX, y, size: 8, font: bold, color: gray });
  y -= 14;
  const customer = quote.customers as { name: string; contact: string; address: string } | null;
  page.drawText(customer?.name || "Customer", { x: marginX, y, size: 11, font: bold, color: ink });
  y -= 14;
  if (customer?.address) {
    page.drawText(customer.address, { x: marginX, y, size: 9.5, font, color: gray });
    y -= 12;
  }
  if (customer?.contact) {
    page.drawText(customer.contact, { x: marginX, y, size: 9.5, font, color: gray });
    y -= 12;
  }

  y -= 20;

  // Line items table header
  const col = { desc: marginX, qty: 380, price: 440, total: 500 };
  page.drawRectangle({ x: marginX, y: y - 4, width: 512, height: 20, color: rgb(0.957, 0.969, 0.949) });
  page.drawText("Description", { x: col.desc + 4, y: y + 2, size: 8.5, font: bold, color: ink });
  page.drawText("Qty", { x: col.qty, y: y + 2, size: 8.5, font: bold, color: ink });
  page.drawText("Price", { x: col.price, y: y + 2, size: 8.5, font: bold, color: ink });
  page.drawText("Total", { x: col.total, y: y + 2, size: 8.5, font: bold, color: ink });
  y -= 24;

  const items = (quote.line_items as LineItem[]) || [];
  for (const item of items) {
    const qty = Number(item.qty) || 0;
    const price = Number(item.price) || 0;
    const lineTotal = qty * price;

    const desc = item.desc.length > 55 ? item.desc.slice(0, 52) + "..." : item.desc;
    page.drawText(desc, { x: col.desc + 4, y, size: 9.5, font, color: ink });
    page.drawText(String(qty), { x: col.qty, y, size: 9.5, font, color: gray });
    page.drawText(`$${price.toFixed(2)}`, { x: col.price, y, size: 9.5, font, color: gray });
    page.drawText(`$${lineTotal.toFixed(2)}`, { x: col.total, y, size: 9.5, font, color: ink });
    y -= 18;

    if (y < 150) break; // simple single-page cap
  }

  y -= 6;
  page.drawLine({ start: { x: marginX, y }, end: { x: 562, y }, thickness: 1, color: line });
  y -= 20;

  const subtotal = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
  const taxAmount = subtotal * (Number(quote.tax_rate || 0) / 100);

  const totalsX = 420;
  page.drawText("Subtotal", { x: totalsX, y, size: 9.5, font, color: gray });
  page.drawText(`$${subtotal.toFixed(2)}`, { x: 520, y, size: 9.5, font, color: ink });
  y -= 16;
  page.drawText(`Tax (${quote.tax_rate || 0}%)`, { x: totalsX, y, size: 9.5, font, color: gray });
  page.drawText(`$${taxAmount.toFixed(2)}`, { x: 520, y, size: 9.5, font, color: ink });
  y -= 20;
  page.drawLine({ start: { x: totalsX, y: y + 12 }, end: { x: 562, y: y + 12 }, thickness: 1, color: line });
  page.drawText("Total", { x: totalsX, y, size: 12, font: bold, color: ink });
  page.drawText(`$${Number(quote.total).toFixed(2)}`, { x: 505, y, size: 12, font: bold, color: signal });

  // Footer
  page.drawText(
    business?.email || business?.phone
      ? `Questions? Contact ${[business?.phone, business?.email].filter(Boolean).join(" or ")}`
      : "Thank you for your business.",
    { x: marginX, y: 60, size: 8.5, font, color: gray }
  );

  const pdfBytes = await doc.save();
  return {
    bytes: pdfBytes,
    filename: `${invoiceNo}-${(customer?.name || "customer").replace(/[^a-z0-9]/gi, "-")}.pdf`,
    quote,
    customer,
    business,
  };
}
