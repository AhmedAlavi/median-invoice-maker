import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import { uid, paginateItems } from ".";
import {
  A4_PAGE_WIDTH_PX,
  A4_PAGE_HEIGHT_PX,
  PAGE_VERTICAL_PADDING,
  FALLBACK_ROW_HEIGHT,
} from "../constants";
import CONFIG from "../config/defaults";
import type { Colors, LineItem, ThemeMode } from "../types";
import type { Agency, Client, InvoiceMeta } from "../types/invoiceForm";

export const exportPDF = async (
  colors: Colors,
  theme: ThemeMode,
  agency: Agency,
  client: Client,
  invoiceMeta: InvoiceMeta,
  notes: string,
  currencyFmt: (amount: number) => string,
  logoDataUrl: string | null,
  items: LineItem[],
  taxPct: number | string,
  discount: number | string
) => {
  // ----- 1) Figure out how many rows fit -----
  // We’ll quickly render one temporary page with a few rows to measure heights.
  const staging = document.getElementById("export-staging");
  if (!staging) return;

  // Minimal page with 6 rows to measure row height and available space
  const testItems: LineItem[] = Array.from({ length: 6 }).map((_, i) => ({
    id: uid(),
    description: `Measure row ${i + 1}`,
    qty: 1,
    price: 1000,
  }));

  const testPage = buildExportPageNode({
    colors,
    theme,
    agency,
    client,
    invoiceMeta,
    notes,
    currencyFmt,
    logoDataUrl,
    pageItems: testItems,
  });

  staging.appendChild(testPage);

  // Measure the table pieces
  const tableEl = testPage.querySelector("table") as HTMLTableElement | null;
  const theadEl = testPage.querySelector("thead") as HTMLElement | null;
  const rowEls = Array.from(
    testPage.querySelectorAll("tbody tr")
  ) as HTMLElement[];

  const headHeight = theadEl?.getBoundingClientRect().height || 0;
  const rowHeight =
    rowEls.length > 0
      ? rowEls[0].getBoundingClientRect().height
      : FALLBACK_ROW_HEIGHT;

  // More reliable: measure everything above the table.
  const tableTop = tableEl?.getBoundingClientRect().top || 0;
  const pageTop = testPage.getBoundingClientRect().top || 0;
  const usedTop = tableTop - pageTop;

  // Keep some bottom padding for footer/totals/notes
  const usableHeightFirst = A4_PAGE_HEIGHT_PX - usedTop - PAGE_VERTICAL_PADDING;
  const usableHeightOther = A4_PAGE_HEIGHT_PX - PAGE_VERTICAL_PADDING - 32; // no chips/intro usually, but keep safe pad

  // Rows we can fit (minus header height)
  const rowsPerFirstPage = Math.max(
    1,
    Math.floor((usableHeightFirst - headHeight - 16) / rowHeight)
  );
  const rowsPerOtherPages = Math.max(
    1,
    Math.floor((usableHeightOther - headHeight - 16) / rowHeight)
  );

  staging.removeChild(testPage);

  // ----- 2) Paginate items -----
  const pagesOfItems = paginateItems(
    items,
    rowsPerFirstPage,
    rowsPerOtherPages
  );

  // ----- 3) Build real pages -----
  const realPages: HTMLDivElement[] = pagesOfItems.map(
    (pageItems) =>
      buildExportPageNode({
        colors,
        theme,
        agency,
        client,
        invoiceMeta,
        notes, // notes appear later on last page; adding here doesn’t hurt but we’ll render totals later
        currencyFmt,
        logoDataUrl,
        pageItems,
      }) as HTMLDivElement
  );

  // Append totals/notes on the **last page only**
  const isMulti = realPages.length > 0;
  if (isMulti) {
    const lastPage = realPages[realPages.length - 1];

    // Totals block (mirrors preview)
    const totalsWrap = document.createElement("div");
    totalsWrap.style.display = "grid";
    totalsWrap.style.gridTemplateColumns = "1fr 1fr";
    totalsWrap.style.gap = "16px";
    totalsWrap.style.marginTop = "24px";
    totalsWrap.style.fontSize = "12px";

    const notesCol = document.createElement("div");
    const notesH = document.createElement("h4");
    notesH.textContent = "Notes";
    Object.assign(notesH.style, {
      fontSize: "12px",
      fontWeight: "700",
      letterSpacing: "1px",
      color: colors.subtext,
      margin: "0",
    });
    const notesP = document.createElement("p");
    notesP.textContent = notes;
    Object.assign(notesP.style, {
      marginTop: "8px",
      whiteSpace: "pre-wrap",
      lineHeight: "1.6",
      color: colors.subtext,
    });
    notesCol.appendChild(notesH);
    notesCol.appendChild(notesP);

    const totalsCol = document.createElement("div");
    totalsCol.style.marginLeft = "auto";
    totalsCol.style.width = "100%";
    totalsCol.style.maxWidth = "260px";
    totalsCol.style.fontSize = "13px";

    const mkRow = (label: string, value: string, strong?: boolean) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.alignItems = "center";
      row.style.marginTop = "6px";
      const l = document.createElement("div");
      l.textContent = label;
      l.style.color = colors.subtext;
      const v = document.createElement("div");
      v.textContent = value;
      v.style.color = colors.text;
      if (strong) v.style.fontWeight = "700";
      row.appendChild(l);
      row.appendChild(v);
      return row;
    };

    const subtotalVal = items.reduce(
      (s, it) => s + (it.qty || 0) * (it.price || 0),
      0
    );
    const taxVal = subtotalVal * (Number(taxPct) / 100);
    const totalVal = Math.max(
      0,
      subtotalVal + taxVal - (Number(discount) || 0)
    );

    totalsCol.appendChild(mkRow("Subtotal", currencyFmt(subtotalVal)));
    totalsCol.appendChild(mkRow(`Tax (${taxPct || 0}%)`, currencyFmt(taxVal)));
    totalsCol.appendChild(
      mkRow("Discount", `- ${currencyFmt(Number(discount) || 0)}`)
    );
    const sep = document.createElement("div");
    sep.style.borderTop = `1px solid ${colors.line}`;
    sep.style.marginTop = "8px";
    sep.style.paddingTop = "8px";
    totalsCol.appendChild(sep);
    totalsCol.appendChild(mkRow("Total", currencyFmt(totalVal), true));

    totalsWrap.appendChild(notesCol);
    totalsWrap.appendChild(totalsCol);
    lastPage.appendChild(totalsWrap);

    // Footer (bank + thanks)
    const footer = document.createElement("div");
    footer.style.display = "grid";
    footer.style.gridTemplateColumns = "1fr 1fr";
    footer.style.gap = "16px";
    footer.style.marginTop = "24px";
    footer.style.fontSize = "11px";
    footer.style.color = colors.subtext;

    const f1 = document.createElement("div");
    f1.innerHTML = `
        <div>Bank Name: ${CONFIG.bank_account.bank_name}</div>
        <div>Account Name: ${CONFIG.bank_account.account_name}</div>
        <div>Account Number: ${CONFIG.bank_account.account_number}</div>
        <div>Branch: ${CONFIG.bank_account.branch}</div>
        <div>SWIFT/BIC: ${CONFIG.bank_account.swift_bic}</div>
      `;
    const f2 = document.createElement("div");
    f2.style.textAlign = "right";
    f2.innerHTML = `
        <div>Thank you for your business.</div>
        <div>Questions? ${CONFIG.agency.email}</div>
      `;

    footer.appendChild(f1);
    footer.appendChild(f2);
    lastPage.appendChild(footer);
  }

  // Mount all pages in staging for html-to-image to read computed styles
  realPages.forEach((p) => staging.appendChild(p));

  // ----- 4) Render each page and build the PDF -----
  const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
  for (let i = 0; i < realPages.length; i++) {
    const node = realPages[i];

    // Render to PNG
    const dataUrl = await toPng(node, {
      cacheBust: true,
      backgroundColor: colors.bg,
      pixelRatio: 2, // crisp
      width: A4_PAGE_WIDTH_PX,
      height: A4_PAGE_HEIGHT_PX,
    });

    // Fit to PDF page
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgProps = pdf.getImageProperties(dataUrl);
    let imgW = pageWidth;
    let imgH = (imgProps.height * imgW) / imgProps.width;
    if (imgH > pageHeight) {
      imgH = pageHeight;
      imgW = (imgProps.width * imgH) / imgProps.height;
    }

    if (i > 0) pdf.addPage();
    pdf.addImage(
      dataUrl,
      "PNG",
      (pageWidth - imgW) / 2,
      (pageHeight - imgH) / 2,
      imgW,
      imgH
    );
  }

  // Cleanup
  realPages.forEach((p) => staging.removeChild(p));

  // Save
  pdf.save(`${invoiceMeta.number || "invoice"}.pdf`);
};

function buildExportPageNode({
  colors,
  theme,
  agency,
  client,
  invoiceMeta,
  // notes,
  currencyFmt,
  logoDataUrl,
  pageItems,
}: {
  colors: Colors;
  theme: ThemeMode;
  agency: Agency;
  client: Client;
  invoiceMeta: InvoiceMeta;
  notes: string;
  currencyFmt: (n: number) => string;
  logoDataUrl: string | null;
  pageItems: LineItem[];
}) {
  const page = document.createElement("div");
  page.style.width = `${A4_PAGE_WIDTH_PX}px`;
  page.style.height = `${A4_PAGE_HEIGHT_PX}px`;
  page.style.background = colors.bg;
  page.style.color = colors.text;
  page.style.boxShadow = colors.shadow;
  page.style.borderRadius = "16px";
  page.style.padding = "32px";
  page.style.boxSizing = "border-box";
  page.style.position = "relative";
  page.style.fontFamily =
    "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, 'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol','Noto Color Emoji'";

  // Top accent
  const topBar = document.createElement("div");
  topBar.style.position = "absolute";
  topBar.style.left = "0";
  topBar.style.right = "0";
  topBar.style.top = "0";
  topBar.style.height = "4px";
  topBar.style.background = `linear-gradient(90deg, ${colors.accentA}, ${colors.accentB})`;
  page.appendChild(topBar);

  // Bottom accent
  const bottomBar = document.createElement("div");
  bottomBar.style.position = "absolute";
  bottomBar.style.left = "0";
  bottomBar.style.right = "0";
  bottomBar.style.bottom = "0";
  bottomBar.style.height = "4px";
  bottomBar.style.background = `linear-gradient(90deg, ${colors.accentB}, ${colors.accentA})`;
  page.appendChild(bottomBar);

  // Header row
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "flex-start";

  const left = document.createElement("div");
  const title = document.createElement("div");
  title.textContent = "Invoice";
  Object.assign(title.style, {
    fontSize: "24px",
    fontWeight: "700",
    letterSpacing: "-0.2px",
  });

  const invNo = document.createElement("div");
  invNo.textContent = invoiceMeta.number;
  Object.assign(invNo.style, {
    marginTop: "4px",
    fontSize: "12px",
    color: colors.subtext,
  });

  const date = document.createElement("div");
  date.textContent = `Date: ${invoiceMeta.date || "—"}`;
  Object.assign(date.style, {
    marginTop: "4px",
    fontSize: "12px",
    color: colors.subtext,
  });

  left.appendChild(title);
  left.appendChild(invNo);
  left.appendChild(date);

  if (invoiceMeta.due) {
    const due = document.createElement("div");
    due.textContent = `Due: ${invoiceMeta.due}`;
    Object.assign(due.style, {
      marginTop: "4px",
      fontSize: "12px",
      color: colors.subtext,
    });
    left.appendChild(due);
  }

  const right = document.createElement("div");
  if (logoDataUrl) {
    const img = document.createElement("img");
    img.src = logoDataUrl;
    img.alt = "Logo";
    Object.assign(img.style, {
      height: "48px",
      width: "auto",
      objectFit: "contain",
    });
    right.appendChild(img);
  } else {
    const ph = document.createElement("div");
    ph.textContent = "LOGO";
    Object.assign(ph.style, {
      height: "48px",
      width: "48px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: `1px dashed ${colors.line}`,
      color: colors.subtext,
      fontSize: "10px",
    });
    right.appendChild(ph);
  }

  header.appendChild(left);
  header.appendChild(right);
  page.appendChild(header);

  // Chips (small)
  const chips = document.createElement("div");
  chips.style.display = "flex";
  chips.style.flexWrap = "wrap";
  chips.style.gap = "8px";
  chips.style.marginTop = "16px";
  CONFIG.ui.processChips.forEach((t) => {
    const chip = document.createElement("span");
    chip.textContent = t;
    Object.assign(chip.style, {
      fontSize: "11px",
      color: colors.text,
      background: theme === "dark" ? "#15171C" : "#F3F4F6",
      border: `1px solid ${colors.line}`,
      padding: "6px 10px",
      borderRadius: "9999px",
    });
    chips.appendChild(chip);
  });
  page.appendChild(chips);

  // From / Bill To
  const twoCols = document.createElement("div");
  twoCols.style.display = "grid";
  twoCols.style.gridTemplateColumns = "1fr 1fr";
  twoCols.style.gap = "16px";
  twoCols.style.marginTop = "24px";

  const from = document.createElement("div");
  const fromH = document.createElement("h3");
  fromH.textContent = "From";
  Object.assign(fromH.style, {
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "1px",
    color: colors.subtext,
    margin: "0 0 4px 0",
  });
  const fromName = document.createElement("div");
  fromName.textContent = agency.name;
  Object.assign(fromName.style, { fontSize: "14px", fontWeight: "600" });
  const fromAddr = document.createElement("div");
  fromAddr.textContent = agency.address;
  Object.assign(fromAddr.style, { fontSize: "12px", color: colors.subtext });
  const fromEP = document.createElement("div");
  fromEP.textContent = `${agency.email} · ${agency.phone}`;
  Object.assign(fromEP.style, { fontSize: "12px", color: colors.subtext });
  const fromWeb = document.createElement("div");
  fromWeb.textContent = agency.website;
  Object.assign(fromWeb.style, { fontSize: "12px", color: colors.subtext });
  from.appendChild(fromH);
  from.appendChild(fromName);
  from.appendChild(fromAddr);
  from.appendChild(fromEP);
  from.appendChild(fromWeb);

  const bill = document.createElement("div");
  const billH = document.createElement("h3");
  billH.textContent = "Bill To";
  Object.assign(billH.style, {
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "1px",
    color: colors.subtext,
    margin: "0 0 4px 0",
  });
  const billName = document.createElement("div");
  billName.textContent = client.name || "Client Name";
  Object.assign(billName.style, { fontSize: "14px", fontWeight: "600" });
  const billAddr = document.createElement("div");
  billAddr.textContent = client.address || "Address";
  Object.assign(billAddr.style, { fontSize: "12px", color: colors.subtext });
  const billEP = document.createElement("div");
  billEP.textContent = `${client.email || "email@example.com"} · ${
    client.phone || ""
  }`;
  Object.assign(billEP.style, { fontSize: "12px", color: colors.subtext });
  bill.appendChild(billH);
  bill.appendChild(billName);
  bill.appendChild(billAddr);
  bill.appendChild(billEP);

  twoCols.appendChild(from);
  twoCols.appendChild(bill);
  page.appendChild(twoCols);

  // ITEMS TABLE (always repeats header on new page)
  const tableWrap = document.createElement("div");
  tableWrap.style.marginTop = "24px";
  tableWrap.style.fontSize = "13px";

  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";

  const thead = document.createElement("thead");
  const trH = document.createElement("tr");
  trH.style.borderBottom = `1px solid ${colors.line}`;

  const th1 = document.createElement("th");
  th1.textContent = "Description";
  Object.assign(th1.style, {
    textAlign: "left",
    padding: "8px 0",
    color: colors.subtext,
    textTransform: "uppercase",
    letterSpacing: "1px",
  });

  const th2 = document.createElement("th");
  th2.textContent = "Qty";
  Object.assign(th2.style, {
    textAlign: "right",
    padding: "8px 0",
    color: colors.subtext,
    textTransform: "uppercase",
    letterSpacing: "1px",
  });

  const th3 = document.createElement("th");
  th3.textContent = "Unit";
  Object.assign(th3.style, {
    textAlign: "right",
    padding: "8px 0",
    color: colors.subtext,
    textTransform: "uppercase",
    letterSpacing: "1px",
  });

  const th4 = document.createElement("th");
  th4.textContent = "Amount";
  Object.assign(th4.style, {
    textAlign: "right",
    padding: "8px 0",
    color: colors.subtext,
    textTransform: "uppercase",
    letterSpacing: "1px",
  });

  trH.appendChild(th1);
  trH.appendChild(th2);
  trH.appendChild(th3);
  trH.appendChild(th4);
  thead.appendChild(trH);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  pageItems.forEach((it) => {
    const tr = document.createElement("tr");
    tr.style.borderBottom = `1px solid ${colors.lineSoft}`;

    const td1 = document.createElement("td");
    td1.textContent = it.description || "Item";
    Object.assign(td1.style, {
      padding: "8px 8px 8px 0",
      color: colors.text,
      fontWeight: "500",
    });

    const td2 = document.createElement("td");
    td2.textContent = String(it.qty || 0);
    Object.assign(td2.style, {
      textAlign: "right",
      padding: "8px 0",
      color: colors.subtext,
    });

    const td3 = document.createElement("td");
    td3.textContent = currencyFmt(it.price || 0);
    Object.assign(td3.style, {
      textAlign: "right",
      padding: "8px 0",
      color: colors.subtext,
    });

    const td4 = document.createElement("td");
    td4.textContent = currencyFmt((it.qty || 0) * (it.price || 0));
    Object.assign(td4.style, {
      textAlign: "right",
      padding: "8px 0",
      color: colors.text,
      fontWeight: "600",
    });

    tr.appendChild(td1);
    tr.appendChild(td2);
    tr.appendChild(td3);
    tr.appendChild(td4);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  page.appendChild(tableWrap);

  // Notes and total block only on the **last** page — caller can append totals later if needed.
  // We'll append totals externally when we build the *last* page.

  return page;
}
