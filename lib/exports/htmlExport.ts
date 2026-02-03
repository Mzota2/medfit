"use client";

import { toPng } from "html-to-image";
import jsPDF from "jspdf";

export type ExportFormat = "pdf" | "image";

export interface ExportOptions {
  format: ExportFormat;
  fileName: string; // without extension
  // Optional: scale factor for better quality
  scale?: number;
}

/**
 * Capture a DOM element and download it as PNG image or PDF.
 * This is designed for receipts and admin reports.
 */
export async function exportHtmlElement(
  element: HTMLElement | null,
  options: ExportOptions
): Promise<void> {
  if (!element) {
    console.error("exportHtmlElement: element is null");
    return;
  }

  const { format, fileName, scale = 2 } = options;

  try {
    // First generate a high-quality PNG via html-to-image
    const dataUrl = await toPng(element, {
      cacheBust: true,
      pixelRatio: scale,
      quality: 1,
      backgroundColor: getComputedStyle(document.documentElement).getPropertyValue(
        "--background"
      )
        ? undefined
        : "#ffffff",
    });

    if (format === "image") {
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${fileName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // PDF export: fit image to A4 while preserving aspect ratio
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Load image to measure dimensions
    const img = new Image();
    img.src = dataUrl;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (err) => reject(err);
    });

    const imgWidthPx = img.width;
    const imgHeightPx = img.height;
    const imgAspect = imgWidthPx / imgHeightPx;
    const pageAspect = pageWidth / pageHeight;

    let renderWidth = pageWidth;
    let renderHeight = pageHeight;

    if (imgAspect > pageAspect) {
      // Image is wider relative to height
      renderWidth = pageWidth;
      renderHeight = pageWidth / imgAspect;
    } else {
      // Image is taller relative to width
      renderHeight = pageHeight;
      renderWidth = pageHeight * imgAspect;
    }

    const x = (pageWidth - renderWidth) / 2;
    const y = (pageHeight - renderHeight) / 2;

    pdf.addImage(dataUrl, "PNG", x, y, renderWidth, renderHeight, undefined, "FAST");
    pdf.save(`${fileName}.pdf`);
  } catch (error) {
    console.error("Error exporting HTML element:", error);
  }
}
