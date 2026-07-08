"use client";

// Tiptap imports
import { generateHTML, generateText } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TextStyle from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";

// DOCX libraries (with aliases to avoid name conflicts)
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table as DocxTable,
  TableRow as DocxTableRow,
  TableCell as DocxTableCell,
  ShadingType,
  BorderStyle,
} from "docx";
import TurndownService from "turndown";
import { saveAs } from "file-saver";

export type DownloadFormat = "json" | "markdown" | "docx" | "pdf";

/**
 * Returns a `handleDownload` function that accepts a format and
 * downloads the given note body (raw JSON string) as that format.
 *
 * Usage:
 *   const { handleDownload } = useNoteDownload({ noteBody, noteTitle });
 *   handleDownload("pdf");
 */
export function useNoteDownload({
  noteBody,
  noteTitle,
}: {
  noteBody: string | undefined | null;
  noteTitle: string;
}) {
  const handleDownload = async (format: DownloadFormat) => {
    if (!noteBody) {
      alert("No content available to download.");
      return;
    }

    if (!noteTitle) {
      alert("No Title available for this note to download.");
      return;
    }
    let parsedBody: any;
    try {
      parsedBody = JSON.parse(noteBody);
    } catch (err) {
      console.error("Failed to parse note body:", err);
      alert("Cannot export: note content appears to be corrupted.");
      return;
    }

    const extensions = [
      StarterKit,
      TextStyle,
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: { class: "pb-6" },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { class: "rounded-lg border border-muted" },
      }),
      Link.configure({
        HTMLAttributes: {
          class:
            "text-blue-200 underline underline-offset-[3px] hover:text-blue-800 transition-colors cursor-pointer",
          target: "_blank",
          rel: "noopener noreferrer nofollow",
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: { class: "border-collapse table-auto w-full my-4" },
      }),
      TableRow.configure({
        HTMLAttributes: { class: "border-t border-border" },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class:
            "border border-border bg-muted font-semibold text-left p-3 min-w-[100px]",
        },
      }),
      TableCell,
    ];

    let content: Blob | string;
    let type!: string;
    let ext!: string;
    const filename = `${noteTitle || "note"}`;

    //  PDF Helper
    const createReadableExportElement = () => {
      const tempDiv = document.createElement("div");
      tempDiv.style.color = "#000000";
      tempDiv.style.backgroundColor = "#ffffff";
      tempDiv.style.padding = "0";
      tempDiv.style.fontFamily = "Arial, Helvetica, sans-serif";
      tempDiv.style.lineHeight = "1.8";
      tempDiv.style.fontSize = "16px";
      tempDiv.style.maxWidth = "100%";
      tempDiv.style.margin = "0";

      const style = document.createElement("style");
      style.textContent = `
      * { color: #000000 !important; background: #ffffff !important; box-sizing: border-box; }
      hr { display: none !important; }
      a { color: #0066cc !important; text-decoration: underline !important; }
      pre, code {
        background: #f8f9fa !important;
        color: #000000 !important;
        font-family: Consolas, Monaco, monospace !important;
        font-size: 0.95rem !important;
        padding: 1.2rem !important;
        border: 1px solid #ddd !important;
        border-radius: 6px !important;
        overflow-x: auto !important;
        margin: 1.6rem 0 !important;
        white-space: pre-wrap !important;
      }
      blockquote {
        border-left: 4px solid #ccc !important;
        margin: 1.5rem 0 !important;
        padding-left: 1rem !important;
        font-style: italic !important;
        color: #444 !important;
      }
      ul, ol {
        margin: 1rem 0 1.5rem 2rem !important;
        padding-left: 0 !important;
      }
      li { margin-bottom: 0.6rem !important; }
      table, th, td {
        border: 1px solid #444 !important;
        border-collapse: collapse !important;
        color: #000000 !important;
        padding: 8px !important;
      }
      th { background-color: #f0f0f0 !important; font-weight: bold !important; }
      img {
        display: block !important;
        max-width: 100% !important;
        height: auto !important;
      }
      img[alt*="could not be loaded"],
      img:not([src]),
      img[src=""] {
        display: none !important;
      }
    `;
      tempDiv.appendChild(style);

      const html = generateHTML(parsedBody, extensions);
      const htmlWithPlaceholder = html.replace(
        /<img[^>]*>/g,
        `<div style="background:#f0f0f0; padding:16px; text-align:start; border:1px solid #ccc; margin:1.5rem 0; font-style:italic; color:#555;">
        [Image could not be loaded]
      </div>`,
      );

      let styledHtml = htmlWithPlaceholder
        .replace(
          /<h1/g,
          '<h1 style="font-size:2.8rem; font-weight:700; margin:0 0 2rem 0; text-align:start; line-height:1.2;"',
        )
        .replace(
          /<h2/g,
          '<h2 style="font-size:2.2rem; font-weight:600; margin:3rem 0 1.2rem 0;"',
        )
        .replace(
          /<h3/g,
          '<h3 style="font-size:1.8rem; font-weight:600; margin:2.5rem 0 1rem 0;"',
        )
        .replace(
          /<h4/g,
          '<h4 style="font-size:1.5rem; font-weight:600; margin:2rem 0 0.8rem 0;"',
        )
        .replace(
          /<h5/g,
          '<h5 style="font-size:1.3rem; font-weight:600; margin:1.8rem 0 0.6rem 0;"',
        )
        .replace(
          /<h6/g,
          '<h6 style="font-size:1.1rem; font-weight:600; margin:1.8rem 0 0.6rem 0;"',
        );

      tempDiv.innerHTML = styledHtml;
      return tempDiv;
    };

    switch (format) {
      case "json":
        // Include the note title alongside the parsed body so the
        // exported JSON is self-describing, just like the PDF/DOCX/MD exports.
        content = JSON.stringify({ title: noteTitle, ...parsedBody }, null, 2);
        type = "application/json";
        ext = "json";
        break;

      case "markdown":
        try {
          const html = generateHTML(parsedBody, extensions);
          const turndown = new TurndownService();
          turndown
            .addRule("image", {
              filter: "img",
              replacement: (c: any, node: any) => {
                const src = (node as HTMLElement).getAttribute("src") || "";
                const alt = (node as HTMLElement).getAttribute("alt") || "";
                return `\n\n![${alt}](${src})\n\n`;
              },
            })
            .addRule("highlight", {
              filter: ["mark"],
              replacement: (c: any) => `==${c}==`,
            });
          // Prepend the title as an H1 so it shows up in the exported content,
          // not just the filename.
          content = `# ${noteTitle}\n\n${turndown.turndown(html)}`;
          type = "text/markdown";
          ext = "md";
        } catch (err) {
          console.warn("Markdown failed:", err);
          content = `${noteTitle}\n\n${generateText(parsedBody, extensions)}`;
          ext = "txt";
        }
        break;

      case "docx":
        try {
          const doc = new Document({
            sections: [
              {
                properties: {},
                children: [
                  // Title paragraph, mirroring the title heading rendered in the PDF export.
                  new Paragraph({
                    text: noteTitle,
                    heading: HeadingLevel.TITLE,
                  }),
                  ...parseTiptapToDocx(parsedBody.content || []),
                ],
              },
            ],
          });
          const blob = await Packer.toBlob(doc);
          saveAs(blob, `${filename}.docx`);
          return;
        } catch (err) {
          console.error("DOCX generation failed:", err);
          alert("DOCX export failed falling back to text.");
          content = `${noteTitle}\n\n${generateText(parsedBody, extensions)}`;
          type = "text/plain";
          ext = "txt";
        }
        break;

      case "pdf":
        try {
          const { default: jsPDF } = await import("jspdf");

          const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
          });

          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const margin = 20;
          const maxWidth = pageWidth - 2 * margin;
          const lineHeight = 7;
          let yPosition = margin;
          pdf.setFontSize(24);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(0, 0, 0);
          const titleLines = pdf.splitTextToSize(noteTitle, maxWidth);
          titleLines.forEach((line: string) => {
            pdf.text(line, margin, yPosition, { baseline: "top" });
            yPosition += 10;
          });
          yPosition += 6; // spacing after title
          const checkAndAddPage = (requiredSpace = lineHeight) => {
            if (yPosition + requiredSpace > pageHeight - margin) {
              pdf.addPage();
              yPosition = margin;
              return true;
            }
            return false;
          };

          const addTextWithWrap = (
            text: string,
            fontSize = 11,
            isBold = false,
          ) => {
            pdf.setFontSize(fontSize);
            pdf.setFont("helvetica", isBold ? "bold" : "normal");
            const lines = pdf.splitTextToSize(text, maxWidth);
            lines.forEach((line: string) => {
              checkAndAddPage();
              pdf.text(line, margin, yPosition, {
                maxWidth,
                align: "left",
                baseline: "top",
              });
              yPosition += lineHeight;
            });
          };

          const processNode = (node: any, level = 0) => {
            if (!node) return;
            pdf.setTextColor(0, 0, 0);

            switch (node.type) {
              case "heading": {
                checkAndAddPage(lineHeight * 1.5);
                const headingSizes = [18, 16, 14, 13, 12, 11];
                const size =
                  headingSizes[Math.min((node.attrs?.level || 1) - 1, 5)];
                yPosition += lineHeight * 0.7;
                const headingText =
                  node.content?.map((n: any) => n.text || "").join("") || "";
                pdf.setTextColor(0, 0, 0);
                addTextWithWrap(headingText, size, true);
                yPosition += lineHeight * 0.4;
                break;
              }

              case "paragraph": {
                checkAndAddPage();
                const paraText =
                  node.content?.map((n: any) => n.text || "").join("") || "";
                if (paraText.trim()) {
                  pdf.setTextColor(40, 40, 40);
                  addTextWithWrap(paraText, 11, false);
                }
                yPosition += lineHeight * 0.3;
                break;
              }

              case "bulletList":
              case "orderedList":
                node.content?.forEach((item: any, index: number) => {
                  checkAndAddPage();
                  const bullet =
                    node.type === "bulletList" ? "• " : `${index + 1}. `;
                  const itemText =
                    item.content?.[0]?.content
                      ?.map((n: any) => n.text || "")
                      .join("") || "";
                  pdf.setFontSize(11);
                  pdf.setFont("helvetica", "normal");
                  const lines = pdf.splitTextToSize(
                    bullet + itemText,
                    maxWidth - 10,
                  );
                  lines.forEach((line: string, idx: number) => {
                    checkAndAddPage();
                    pdf.text(
                      line,
                      idx === 0 ? margin + 5 : margin + 10,
                      yPosition,
                    );
                    yPosition += lineHeight;
                  });
                });
                yPosition += lineHeight * 0.3;
                break;

              case "codeBlock": {
                checkAndAddPage(lineHeight * 2);
                const codeText =
                  node.content?.map((n: any) => n.text || "").join("") || "";
                const codeLines = codeText.split("\n");
                pdf.setFontSize(6.5);
                pdf.setFont("courier", "normal");
                pdf.setTextColor(40, 40, 40);
                const codeLineHeight = 4.5;
                yPosition += lineHeight * 0.3;

                codeLines.forEach((line: string) => {
                  if (yPosition + codeLineHeight > pageHeight - margin) {
                    pdf.addPage();
                    yPosition = margin;
                  }
                  pdf.setFillColor(248, 249, 250);
                  pdf.rect(
                    margin - 2,
                    yPosition - 3.5,
                    maxWidth + 4,
                    codeLineHeight,
                    "F",
                  );
                  pdf.setTextColor(40, 40, 40);
                  let xPos = margin + 1;
                  const charWidth = 1.4;
                  for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char !== " ") pdf.text(char, xPos, yPosition);
                    xPos += charWidth;
                  }
                  yPosition += codeLineHeight;
                });

                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(11);
                pdf.setTextColor(0, 0, 0);
                yPosition += lineHeight * 0.5;
                break;
              }

              case "blockquote": {
                checkAndAddPage(lineHeight * 1.5);
                pdf.setDrawColor(200, 200, 200);
                pdf.setLineWidth(2);
                const quoteText =
                  node.content
                    ?.map(
                      (n: any) =>
                        n.content?.map((c: any) => c.text || "").join("") || "",
                    )
                    .join(" ") || "";
                const quoteStartY = yPosition;
                pdf.setFontSize(10);
                pdf.setFont("helvetica", "italic");
                const quoteLines = pdf.splitTextToSize(
                  quoteText,
                  maxWidth - 15,
                );
                quoteLines.forEach((line: string) => {
                  checkAndAddPage();
                  pdf.text(line, margin + 10, yPosition);
                  yPosition += lineHeight;
                });
                pdf.line(
                  margin + 2,
                  quoteStartY - 2,
                  margin + 2,
                  yPosition - lineHeight + 2,
                );
                yPosition += lineHeight * 0.3;
                break;
              }

              case "horizontalRule":
                checkAndAddPage(lineHeight);
                pdf.setDrawColor(150, 150, 150);
                pdf.setLineWidth(0.5);
                pdf.line(margin, yPosition, pageWidth - margin, yPosition);
                yPosition += lineHeight;
                break;

              case "table":
                checkAndAddPage(lineHeight * 3);
                yPosition += lineHeight * 0.5;
                node.content?.forEach((row: any) => {
                  const isHeader = row.content?.[0]?.type === "tableHeader";
                  checkAndAddPage(lineHeight * 1.5);
                  pdf.setFont("helvetica", isHeader ? "bold" : "normal");
                  const cellTexts =
                    row.content?.map(
                      (cell: any) =>
                        cell.content?.[0]?.content
                          ?.map((n: any) => n.text || "")
                          .join("") || "",
                    ) || [];
                  const cellWidth = maxWidth / cellTexts.length;
                  cellTexts.forEach((text: string, colIndex: number) => {
                    const xPos = margin + colIndex * cellWidth;
                    pdf.rect(xPos, yPosition - 5, cellWidth, lineHeight + 2);
                    pdf.setFontSize(9);
                    const shortText =
                      text.length > 30 ? text.substring(0, 27) + "..." : text;
                    pdf.text(shortText, xPos + 2, yPosition);
                  });
                  yPosition += lineHeight + 2;
                });
                yPosition += lineHeight * 0.5;
                break;

              case "text":
                break;

              default:
                if (node.content) {
                  node.content.forEach((child: any) =>
                    processNode(child, level + 1),
                  );
                }
            }
          };

          if (parsedBody.content) {
            parsedBody.content.forEach((node: any) => processNode(node));
          }

          const totalPages = pdf.getNumberOfPages();
          for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(100, 100, 100);
            pdf.text(
              `Page ${i} of ${totalPages}`,
              pageWidth / 2,
              pageHeight - 10,
              { align: "center" },
            );
          }

          pdf.setPage(1);
          pdf.setTextColor(0, 0, 0);
          pdf.save(`${filename}.pdf`);
          return;
        } catch (err) {
          console.error("PDF generation failed:", err);
          alert("PDF export failed try simpler content or check console.");
          return;
        }
    }

    // Fallback download
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return { handleDownload };

  // Parse Tiptap JSON → docx children
  function parseTiptapToDocx(nodes: any[]): (Paragraph | any)[] {
    const children: (Paragraph | any)[] = [];

    for (const node of nodes || []) {
      if (!node) continue;

      switch (node.type) {
        case "paragraph":
          children.push(
            new Paragraph({ children: parseTextWithMarks(node.content || []) }),
          );
          break;

        case "heading": {
          const level = node.attrs?.level || 1;
          children.push(
            new Paragraph({
              heading:
                HeadingLevel[`HEADING_${level}` as keyof typeof HeadingLevel],
              children: parseTextWithMarks(node.content || []),
            }),
          );
          break;
        }

        case "bulletList":
          children.push(...parseList(node.content || [], false));
          break;

        case "orderedList":
          children.push(...parseList(node.content || [], true));
          break;

        case "codeBlock": {
          const codeText = node.content?.[0]?.text || "";
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: codeText,
                  font: { name: "Consolas" },
                  size: 22,
                  shading: { fill: "f8f9fa", type: ShadingType.SOLID },
                }),
              ],
              spacing: { before: 200, after: 200 },
            }),
          );
          break;
        }

        case "blockquote":
          children.push(
            new Paragraph({
              children: parseTextWithMarks(node.content || []),
              indent: { left: 360 },
            }),
          );
          break;

        case "table": {
          const rows =
            node.content?.map((rowNode: any) => {
              const cells =
                rowNode.content?.map((cellNode: any) => {
                  return new DocxTableCell({
                    children: [
                      new Paragraph({
                        children: parseTextWithMarks(cellNode.content || []),
                      }),
                    ],
                  });
                }) || [];
              return new DocxTableRow({ children: cells });
            }) || [];

          children.push(
            new DocxTable({
              rows,
              width: { size: 100, type: "pct" },
            }),
          );
          break;
        }

        default:
          if (node.content) {
            children.push(...parseTiptapToDocx(node.content));
          }
          break;
      }
    }

    return children;
  }

  function parseTextWithMarks(textNodes: any[]): TextRun[] {
    const runs: TextRun[] = [];

    for (const node of textNodes || []) {
      if (node.type !== "text" || !node.text) continue;

      const options: any = { text: node.text, color: "000000" };

      if (node.marks) {
        for (const mark of node.marks) {
          switch (mark.type) {
            case "bold":
              options.bold = true;
              break;
            case "italic":
              options.italics = true;
              break;
            case "code":
              options.font = { name: "Consolas" };
              options.size = 22;
              options.shading = { fill: "f8f9fa", type: ShadingType.SOLID };
              break;
            case "highlight":
              options.shading = { fill: "ffff99", type: ShadingType.SOLID };
              break;
            case "link":
              if (mark.attrs?.href) {
                options.link = { href: mark.attrs.href };
              }
              break;
          }
        }
      }

      runs.push(new TextRun(options));
    }

    return runs;
  }

  function parseList(listItems: any[], isOrdered: boolean): Paragraph[] {
    const listItemsParsed: Paragraph[] = [];

    listItems.forEach((itemNode) => {
      if (itemNode.type === "listItem") {
        const itemChildren = parseTextWithMarks(
          itemNode.content?.[0]?.content || [],
        );

        listItemsParsed.push(
          new Paragraph({
            children: itemChildren,
            bullet: isOrdered ? undefined : { level: 0 },
            numbering: isOrdered
              ? { reference: "ordered", level: 0 }
              : undefined,
          }),
        );

        if (itemNode.content?.length > 1) {
          listItemsParsed.push(...parseTiptapToDocx(itemNode.content.slice(1)));
        }
      }
    });

    return listItemsParsed;
  }
}
