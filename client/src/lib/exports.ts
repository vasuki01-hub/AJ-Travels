import type { PortalSettings, TravelRecord } from "@shared/travel";

type CellValue = string | number | Date | null;

const money = (value: number, currency: string) => new Intl.NumberFormat("en-GB", {
  style: "currency", currency, maximumFractionDigits: 2,
}).format(Number(value || 0));

const dateLabel = (value: string | null | undefined) => {
  if (!value) return "";
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
};
const dateValue = (value: string | null | undefined): CellValue => {
  if (!value) return "";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return year && month && day ? new Date(year, month - 1, day, 12) : value;
};
const safeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "aj-tours";
const namedCustomFields = (record: TravelRecord, settings: PortalSettings) => Object.fromEntries(
  Object.entries(record.customFields ?? {}).map(([id, value]) => [settings.customFields.find(field => field.id === id)?.label ?? id, value]),
);
const excelMoneyFormat = (currency: string) => {
  const symbol = new Intl.NumberFormat("en-GB", { style: "currency", currency }).formatToParts(0).find(part => part.type === "currency")?.value ?? currency;
  return `"${symbol}"#,##0.00;[Red]("${symbol}"#,##0.00);"${symbol}"0.00`;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function configureTableSheet(sheet: import("exceljs").Worksheet, headers: string[], rows: CellValue[][], tableName: string, widths?: number[], currency = "GBP") {
  const titleEnd = Math.max(headers.length, 2);
  sheet.mergeCells(1, 1, 1, titleEnd);
  sheet.mergeCells(2, 1, 2, titleEnd);
  sheet.mergeCells(3, 1, 3, titleEnd);
  const title = sheet.getCell(1, 1);
  title.value = "AJ TOURS & TRAVEL";
  title.font = { name: "Arial", size: 18, bold: true, color: { argb: "FFFFFFFF" } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF174A83" } };
  title.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  sheet.getRow(1).height = 34;
  const subtitle = sheet.getCell(2, 1);
  subtitle.value = sheet.name;
  subtitle.font = { name: "Arial", size: 12, bold: true, color: { argb: "FF1677E8" } };
  subtitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF3FF" } };
  subtitle.alignment = { vertical: "middle", indent: 1 };
  sheet.getRow(2).height = 24;
  const info = sheet.getCell(3, 1);
  info.value = `Generated ${new Date().toLocaleString("en-GB")}  ·  ${rows.length} records`;
  info.font = { name: "Arial", size: 10, color: { argb: "FF53647A" } };
  info.alignment = { vertical: "middle", indent: 1 };
  sheet.getRow(3).height = 21;
  sheet.getRow(4).height = 8;

  sheet.addTable({
    name: tableName,
    ref: "A5",
    headerRow: true,
    totalsRow: false,
    style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: headers.map(name => ({ name, filterButton: true })),
    rows,
  });
  const dateColumns = new Set(["ENQUIRY DATE", "BOOKING DATE", "DEPARTURE DATE", "PAYMENT DATE"]);
  const moneyColumns = new Set([
    "NET FARE ADT", "NET FARE YOUTH", "NET FARE CHILD", "NET FARE INF",
    "TOTAL NET", "ADULT FARE TO CLIENT", "YOUTH FARE TO CLIENT",
    "CHILD FARE TO CLIENT", "INF FARE TO CLIENT", "TOTAL FARE TO CLIENT", "TOTAL FARE QUOTED",
    "TOTAL PROFIT", "PROFIT", "RECEIVED PAYMENT", "TOTAL QUOTED", "PAYMENTS RECEIVED",
  ]);
  sheet.columns = headers.map((header, index) => ({
    header,
    width: widths?.[index] ?? (header.includes("REMARK") ? 36 : header.includes("NAME") || header.includes("PASSENGER") ? 28 : header.includes("EMAIL") ? 30 : 18),
  }));
  const headerRow = sheet.getRow(5);
  headerRow.height = 30;
  headerRow.eachCell({ includeEmpty: true }, cell => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1677E8" } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = {
      top: { style: "medium", color: { argb: "FF0F5FC2" } },
      left: { style: "thin", color: { argb: "FFD3DFED" } },
      bottom: { style: "medium", color: { argb: "FF0F5FC2" } },
      right: { style: "thin", color: { argb: "FFD3DFED" } },
    };
  });
  for (let rowNumber = 6; rowNumber < rows.length + 6; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const rowValues = rows[rowNumber - 6] ?? [];
    const lineCount = rowValues.reduce<number>((maximum, value, index) => {
      const text = value instanceof Date ? "00 Nov 0000" : String(value ?? "");
      const width = Number(sheet.getColumn(index + 1).width ?? 18);
      return Math.max(maximum, Math.ceil(text.length / Math.max(12, Math.floor(width * 1.35))));
    }, 1);
    row.height = Math.min(72, Math.max(24, lineCount * 14));
    rowValues.forEach((value, index) => {
      if (dateColumns.has(headers[index]) && value instanceof Date) row.getCell(index + 1).value = value;
    });
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      const header = headers[columnNumber - 1];
      cell.font = { name: "Arial", size: 10, color: { argb: "FF24364B" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowNumber % 2 === 0 ? "FFF1F6FC" : "FFFFFFFF" } };
      cell.alignment = { vertical: "middle", horizontal: moneyColumns.has(header) ? "right" : "left", wrapText: true };
      if (dateColumns.has(header)) cell.numFmt = "dd mmm yyyy";
      if (moneyColumns.has(header)) cell.numFmt = excelMoneyFormat(currency);
      cell.border = {
        top: { style: "thin", color: { argb: "FFE0E7EF" } },
        left: { style: "thin", color: { argb: "FFE0E7EF" } },
        bottom: { style: "thin", color: { argb: "FFE0E7EF" } },
        right: { style: "thin", color: { argb: "FFE0E7EF" } },
      };
    });
  }
  sheet.views = [{ state: "frozen", ySplit: 5 }];
  sheet.autoFilter = { from: { row: 5, column: 1 }, to: { row: rows.length + 5, column: headers.length } };
  sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
  sheet.properties.tabColor = { argb: "FF1677E8" };
}

export async function createTravelWorkbook(records: TravelRecord[], settings: PortalSettings): Promise<import("exceljs").Workbook> {
  const ExcelJS = (await import("exceljs")).default;
  const book = new ExcelJS.Workbook();
  book.creator = settings.agencyName;
  book.subject = "Travel enquiry and booking records";
  book.title = `${settings.agencyName} travel operations report`;
  book.created = new Date();
  book.modified = new Date();
  const customLabels = [...new Set(records.flatMap(record => Object.keys(namedCustomFields(record, settings))))];
  const headers = [
    "SR. NO.", "RECORD TYPE", "STATUS", "PAYMENT STATUS", "SOURCE ENQUIRY", "ENQUIRY DATE", "BOOKING DATE", "DEPARTURE DATE",
    "SYSTEM PNR", "AIRLINE PNR", "CUSTOMER NAME", "PASSENGER NAMES", "TICKET NUMBER",
    "CONTACT NO.", "EMAIL", "ORIGIN", "DESTINATION", "ADULT COUNT", "NET FARE ADT",
    "YOUTH COUNT", "NET FARE YOUTH", "CHILD COUNT", "NET FARE CHILD", "INFANT COUNT", "NET FARE INF", "TOTAL NET",
    "ADULT FARE TO CLIENT", "YOUTH FARE TO CLIENT", "CHILD FARE TO CLIENT", "INF FARE TO CLIENT",
    "TOTAL FARE QUOTED", "PROFIT", "RECEIVED PAYMENT", "PAYMENT DATE", "PAYMENT METHOD",
    "ISSUED FROM", "REMARKS", ...customLabels.map(label => `CUSTOM: ${label}`),
  ];
  const recordRows: CellValue[][] = records.map((record, index) => {
    const custom = namedCustomFields(record, settings);
    return [
      index + 1,
      record.recordType === "booking" ? "Booking" : "Enquiry",
      record.status,
      record.recordType === "booking" ? record.paymentStatus.replace("_", " ") : "",
      record.sourceEnquiryId ?? "",
      dateValue(record.enquiryDate), dateValue(record.bookingDate), dateValue(record.departureDate),
      record.systemPnr, record.airlinePnr, record.customerName, record.passengers, record.ticketNumber,
      record.contactNo, record.email, record.origin, record.destination,
      record.adultCount, record.netFareAdult, record.youthCount, record.netFareYouth, record.childCount, record.netFareChild, record.infantCount, record.netFareInfant, record.totalNet,
      record.clientFareAdult, record.clientFareYouth, record.clientFareChild, record.clientFareInfant,
      record.totalFareQuoted, record.profit, record.receivedPayment, dateValue(record.paymentDate),
      record.paymentMode, record.issuedFrom, record.remarks,
      ...customLabels.map(label => custom[label] ?? ""),
    ];
  });
  const recordsSheet = book.addWorksheet("Travel Records");
  configureTableSheet(recordsSheet, headers, recordRows, "TravelRecords", undefined, settings.currency);

  const bookings = records.filter(record => record.recordType === "booking");
  const fareHeaders = [
    "SR. NO.", "CUSTOMER NAME", "SYSTEM PNR", "ADULT COUNT", "NET FARE ADT", "YOUTH COUNT", "NET FARE YOUTH", "CHILD COUNT", "NET FARE CHILD",
    "INFANT COUNT", "NET FARE INF", "TOTAL NET", "ADULT FARE TO CLIENT", "YOUTH FARE TO CLIENT",
    "CHILD FARE TO CLIENT", "INF FARE TO CLIENT", "TOTAL FARE TO CLIENT", "TOTAL PROFIT",
    "RECEIVED PAYMENT", "PAYMENT STATUS", "PAYMENT METHOD", "ISSUED FROM",
  ];
  const fareRows: CellValue[][] = bookings.map((record, index) => [
    index + 1, record.customerName, record.systemPnr, record.adultCount, record.netFareAdult, record.youthCount, record.netFareYouth,
    record.childCount, record.netFareChild, record.infantCount, record.netFareInfant, record.totalNet, record.clientFareAdult,
    record.clientFareYouth, record.clientFareChild, record.clientFareInfant, record.totalFareQuoted,
    record.profit, record.receivedPayment, record.paymentStatus.replace("_", " "), record.paymentMode, record.issuedFrom,
  ]);
  const faresSheet = book.addWorksheet("Fare Breakdown");
  configureTableSheet(faresSheet, fareHeaders, fareRows, "FareBreakdown", undefined, settings.currency);

  const billableBookings = bookings.filter(record => record.status !== "cancelled");
  const summaryRows: CellValue[][] = [
    ["Agency", settings.agencyName],
    ["Generated", new Date().toLocaleString("en-GB")],
    ["Records in export", records.length],
    ["Enquiries", records.filter(record => record.recordType === "enquiry").length],
    ["Bookings", bookings.length],
    ["Active bookings (cancelled excluded)", billableBookings.length],
    ["Total quoted", billableBookings.reduce((sum, record) => sum + Number(record.totalFareQuoted || 0), 0)],
    ["Payments received", billableBookings.reduce((sum, record) => sum + Number(record.receivedPayment || 0), 0)],
    ["Profit", billableBookings.reduce((sum, record) => sum + Number(record.profit || 0), 0)],
    ["Currency", settings.currency],
  ];
  const summarySheet = book.addWorksheet("Report Summary");
  configureTableSheet(summarySheet, ["METRIC", "VALUE"], summaryRows, "ReportSummary", [34, 38], settings.currency);
  for (let rowNumber = 6; rowNumber < summaryRows.length + 6; rowNumber += 1) {
    const metric = summaryRows[rowNumber - 6][0];
    if (typeof metric === "string" && ["Total quoted", "Payments received", "Profit"].includes(metric)) {
      summarySheet.getCell(rowNumber, 2).numFmt = excelMoneyFormat(settings.currency);
    }
  }
  [recordsSheet, faresSheet, summarySheet].forEach(sheet => {
    sheet.eachRow(row => row.eachCell({ includeEmpty: true }, cell => {
      if (cell.font?.name !== "Arial") cell.font = { ...cell.font, name: "Arial" };
    }));
  });
  return book;
}

export async function downloadExcel(records: TravelRecord[], settings: PortalSettings) {
  const book = await createTravelWorkbook(records, settings);
  const buffer = await book.xlsx.writeBuffer();
  downloadBlob(
    new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${safeName(settings.agencyName)}-travel-report-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}

export async function createTravelPdf(records: TravelRecord[], settings: PortalSettings): Promise<import("jspdf").jsPDF> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const bookings = records.filter(record => record.recordType === "booking");
  const activeBookings = bookings.filter(record => record.status !== "cancelled");
  const quoted = activeBookings.reduce((sum, record) => sum + Number(record.totalFareQuoted || 0), 0);
  const received = activeBookings.reduce((sum, record) => sum + Number(record.receivedPayment || 0), 0);
  const profit = activeBookings.reduce((sum, record) => sum + Number(record.profit || 0), 0);
  const color = {
    navy: [23, 74, 131] as [number, number, number],
    blue: [22, 119, 232] as [number, number, number],
    ink: [35, 53, 76] as [number, number, number],
    muted: [103, 119, 140] as [number, number, number],
    line: [207, 219, 233] as [number, number, number],
    stripe: [241, 246, 252] as [number, number, number],
  };
  const drawHeader = (subtitle: string) => {
    doc.setFillColor(...color.navy);
    doc.rect(0, 0, pageWidth, 34, "F");
    doc.setFillColor(...color.blue);
    doc.roundedRect(9, 7, 13, 13, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("AJ", 12, 15.5);
    doc.setFontSize(16);
    doc.text(settings.agencyName, 27, 14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(205, 224, 245);
    doc.setFontSize(9);
    doc.text(subtitle, 27, 23);
    doc.text(`Generated ${new Date().toLocaleString("en-GB")}`, pageWidth - 10, 14, { align: "right" });
  };
  const tableTheme = {
    theme: "grid" as const,
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 2.5,
      textColor: color.ink,
      lineColor: color.line,
      lineWidth: 0.22,
      valign: "middle" as const,
      overflow: "linebreak" as const,
    },
    headStyles: {
      fillColor: color.blue,
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: "bold" as const,
      fontSize: 9,
      cellPadding: 2.8,
    },
    alternateRowStyles: { fillColor: color.stripe },
    margin: { left: 10, right: 10, bottom: 13 },
  };

  drawHeader("Travel operations report · enquiries and bookings");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...color.ink);
  doc.text("Travel operations overview", 10, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...color.muted);
  doc.text(`${records.length} total records · ${records.filter(record => record.recordType === "enquiry").length} enquiries · ${bookings.length} bookings · all record details follow`, 10, 50);

  const kpis = [
    ["TOTAL RECORDS", String(records.length)],
    ["ENQUIRIES", String(records.filter(record => record.recordType === "enquiry").length)],
    ["ACTIVE BOOKINGS", String(activeBookings.length)],
    ["TOTAL QUOTED", money(quoted, settings.currency)],
    ["RECEIVED", money(received, settings.currency)],
    ["PROFIT", money(profit, settings.currency)],
  ];
  const cardGap = 3;
  const cardWidth = (pageWidth - 20 - cardGap * (kpis.length - 1)) / kpis.length;
  kpis.forEach(([label, value], index) => {
    const x = 10 + index * (cardWidth + cardGap);
    doc.setFillColor(...(index % 2 === 0 ? color.stripe : [239, 248, 246] as [number, number, number]));
    doc.setDrawColor(...color.line);
    doc.roundedRect(x, 55, cardWidth, 17, 1.4, 1.4, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.4);
    doc.setTextColor(...color.muted);
    doc.text(label, x + 3, 61);
    doc.setFontSize(9.2);
    doc.setTextColor(...color.ink);
    doc.text(value, x + 3, 68);
  });

  const overviewRows = records.map((record, index) => [
    String(index + 1),
    dateLabel(record.recordType === "enquiry" ? record.enquiryDate : record.bookingDate) || "—",
    `${record.recordType === "booking" ? "Booking" : "Enquiry"}\n${record.status}`,
    [record.customerName, record.passengers].filter(Boolean).join("\n") || "—",
    [record.contactNo, record.email].filter(Boolean).join("\n") || "—",
    [record.origin, record.destination].filter(Boolean).join(" to ") || "—",
    money(record.totalFareQuoted, settings.currency),
    money(record.receivedPayment, settings.currency),
    money(record.profit, settings.currency),
  ]);
  autoTable(doc, {
    ...tableTheme,
    head: [["SR. NO.", "RECORD DATE", "TYPE / STATUS", "CUSTOMER / PASSENGERS", "CONTACT", "JOURNEY", "TOTAL QUOTED", "RECEIVED", "PROFIT"]],
    body: overviewRows,
    tableWidth: 252,
    startY: 78,
    margin: { ...tableTheme.margin, left: 22.5, right: 22.5, top: 42 },
    columnStyles: {
      0: { cellWidth: 14, halign: "center" }, 1: { cellWidth: 20 }, 2: { cellWidth: 24 }, 3: { cellWidth: 40 }, 4: { cellWidth: 28 },
      5: { cellWidth: 35 }, 6: { cellWidth: 34, halign: "right" }, 7: { cellWidth: 30, halign: "right" }, 8: { cellWidth: 27, halign: "right" },
    },
    didDrawPage: data => { if (data.pageNumber > 1) drawHeader("Travel operations report · continued"); },
  });

  records.forEach((record, index) => {
    doc.addPage();
    drawHeader(`${record.recordType === "booking" ? "BOOKING" : "ENQUIRY"} · SR. NO. ${index + 1} · RECORD #${record.id}`);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...color.ink);
    doc.text(record.customerName || "Travel record", 10, 44);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...color.muted);
    doc.text(`${record.recordType === "booking" ? "Booking" : "Enquiry"} · ${record.status} · record ${record.id}`, 10, 50);

    const fields: [string, string][] = [
      ["Source enquiry", record.sourceEnquiryId ? `#${record.sourceEnquiryId}` : "—"],
      ["Enquiry date", dateLabel(record.enquiryDate) || "—"],
      ["Booking date", dateLabel(record.bookingDate) || "—"],
      ["Departure date", dateLabel(record.departureDate) || "—"],
      ["Customer name", record.customerName || "—"],
      ["Passenger names", record.passengers || "—"],
      ["Contact number", record.contactNo || "—"],
      ["Email", record.email || "—"],
      ["Origin", record.origin || "—"],
      ["Destination", record.destination || "—"],
      ["System PNR", record.systemPnr || "—"],
      ["Airline PNR", record.airlinePnr || "—"],
      ["Ticket number", record.ticketNumber || "—"],
      ["Adult passengers", String(record.adultCount)],
      ["Net · adult (each)", money(record.netFareAdult, settings.currency)],
      ["Youth passengers", String(record.youthCount)],
      ["Net · youth (each)", money(record.netFareYouth, settings.currency)],
      ["Child passengers", String(record.childCount)],
      ["Net · child (each)", money(record.netFareChild, settings.currency)],
      ["Infant passengers", String(record.infantCount)],
      ["Net · infant (each)", money(record.netFareInfant, settings.currency)],
      ["Total net fare", money(record.totalNet, settings.currency)],
      ["Quoted · adult (each)", money(record.clientFareAdult, settings.currency)],
      ["Quoted · youth (each)", money(record.clientFareYouth, settings.currency)],
      ["Quoted · child (each)", money(record.clientFareChild, settings.currency)],
      ["Quoted · infant (each)", money(record.clientFareInfant, settings.currency)],
      ["Total fare quoted", money(record.totalFareQuoted, settings.currency)],
      ["Received payment", money(record.receivedPayment, settings.currency)],
      ["Payment status", record.paymentStatus.replace("_", " ")],
      ["Payment date", dateLabel(record.paymentDate) || "—"],
      ["Payment method", record.paymentMode || "—"],
      ["Profit", money(record.profit, settings.currency)],
      ["Issued from", record.issuedFrom || "—"],
      ["Remarks", record.remarks || "—"],
      ...Object.entries(namedCustomFields(record, settings)).map(([label, value]) => [`Custom · ${label}`, String(value || "—")] as [string, string]),
    ];
    const pairedFields: string[][] = [];
    for (let index = 0; index < fields.length; index += 2) {
      const first = fields[index];
      const second = fields[index + 1] ?? ["", ""];
      pairedFields.push([first[0], first[1], second[0], second[1]]);
    }
    autoTable(doc, {
      ...tableTheme,
      head: [["FIELD", "DETAIL", "FIELD", "DETAIL"]],
      body: pairedFields,
      tableWidth: 248,
      startY: 55,
      margin: { ...tableTheme.margin, left: 24.5, right: 24.5, top: 54 },
      styles: { ...tableTheme.styles, fontSize: 9.2, cellPadding: 1.7, minCellHeight: 6.4 },
      headStyles: { ...tableTheme.headStyles, fontSize: 9.2 },
      columnStyles: { 0: { cellWidth: 40, fontStyle: "bold" }, 1: { cellWidth: 84 }, 2: { cellWidth: 40, fontStyle: "bold" }, 3: { cellWidth: 84 } },
      didDrawPage: data => {
        if (data.pageNumber > 1) {
          drawHeader(`RECORD #${record.id} · continued`);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(...color.ink);
          doc.text(`${record.customerName} · continued details`, 10, 44);
        }
      },
    });
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...color.muted);
    doc.setDrawColor(...color.line);
    doc.line(10, pageHeight - 11, pageWidth - 10, pageHeight - 11);
    doc.text(`${settings.agencyName} · Confidential employee report`, 10, pageHeight - 6);
    doc.text(`${page} / ${pageCount}`, pageWidth - 10, pageHeight - 6, { align: "right" });
  }
  return doc;
}

export async function downloadPdf(records: TravelRecord[], settings: PortalSettings) {
  const doc = await createTravelPdf(records, settings);
  doc.save(`${safeName(settings.agencyName)}-travel-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
