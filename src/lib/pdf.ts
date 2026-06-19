import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Token } from "./types";

export const generateDayReport = (
  officeName: string,
  date: string,
  tokens: Token[],
  stats: { totalServed: number; avgWait: number; peakHour: string }
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.text(officeName, pageWidth / 2, 20, { align: "center" });
  doc.setFontSize(12);
  doc.text(`Daily Report - ${date}`, pageWidth / 2, 30, { align: "center" });

  doc.setFontSize(10);
  doc.text(`Total Served: ${stats.totalServed}`, 14, 45);
  doc.text(`Avg Wait Time: ${stats.avgWait} min`, 14, 52);
  doc.text(`Peak Hour: ${stats.peakHour}`, 14, 59);

  const tableData = tokens
    .filter((t) => t.status === "served")
    .map((t) => [
      t.number.toString(),
      t.name,
      t.issuedAt?.toDate?.().toLocaleTimeString() || "-",
      t.servedAt?.toDate?.().toLocaleTimeString() || "-",
      `${t.waitMinutes || 0} min`,
      t.rating ? `${t.rating}/5` : "-",
    ]);

  autoTable(doc, {
    startY: 70,
    head: [["Token", "Name", "Issued", "Served", "Wait", "Rating"]],
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [26, 86, 219] },
  });

  doc.save(`LineHai-Report-${date}.pdf`);
  return doc;
};
