package com.skillbridge.service;

import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.canvas.draw.SolidLine;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.HorizontalAlignment;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
public class PdfService {

    // ── Navy corporate palette (matches the SkillBridge brand) ──
    private static final DeviceRgb NAVY       = new DeviceRgb(18, 49, 96);    // #123160
    private static final DeviceRgb NAVY_DEEP  = new DeviceRgb(10, 35, 71);    // #0A2347
    private static final DeviceRgb TEXT_DARK  = new DeviceRgb(28, 32, 38);
    private static final DeviceRgb TEXT_BODY  = new DeviceRgb(60, 64, 70);
    private static final DeviceRgb TEXT_MUTED = new DeviceRgb(120, 128, 138);
    private static final DeviceRgb RULE_GRAY  = new DeviceRgb(214, 220, 228);
    private static final DeviceRgb PANEL_BG    = new DeviceRgb(247, 249, 252);
    private static final DeviceRgb ACCENT_TEAL = new DeviceRgb(15, 118, 110);  // remote badge

    private static final float LEFT = 52f;
    private static final float RIGHT = 52f;

    public byte[] generateOfferLetter(
            String seekerName,
            String seekerEmail,
            String jobTitle,
            String companyName,
            String companyWebsite,
            String employerName,
            double minSalary,
            double maxSalary,
            String jobType,
            boolean remote,
            String employerNote
    ) {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(out);
            PdfDocument pdf = new PdfDocument(writer);
            Document doc = new Document(pdf, PageSize.A4);
            doc.setMargins(0, 0, 0, 0);

            PdfFont regular = PdfFontFactory.createFont(StandardFonts.HELVETICA);
            PdfFont bold    = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
            PdfFont italic  = PdfFontFactory.createFont(StandardFonts.HELVETICA_OBLIQUE);

            String today = LocalDate.now().format(DateTimeFormatter.ofPattern("MMMM d, yyyy"));
            String offerId = "OFF-" + LocalDate.now().getYear() + "-"
                    + String.format("%04d", Math.abs(seekerName.hashCode() % 9000 + 1000));
            String initial = (companyName != null && !companyName.trim().isEmpty())
                    ? companyName.trim().substring(0, 1).toUpperCase() : "C";

            // ══════════════ LETTERHEAD ══════════════
            Table head = new Table(UnitValue.createPercentArray(new float[]{62, 38}))
                    .setWidth(UnitValue.createPercentValue(100))
                    .setMarginTop(38).setMarginLeft(LEFT).setMarginRight(RIGHT);

            // left: logo badge + company
            Cell brand = new Cell().setBorder(Border.NO_BORDER).setPadding(0);
            Table brandRow = new Table(UnitValue.createPercentArray(new float[]{20, 80}))
                    .setWidth(UnitValue.createPercentValue(100));
            Cell logo = new Cell().setBorder(Border.NO_BORDER)
                    .setBackgroundColor(NAVY).setHeight(44).setWidth(44)
                    .setTextAlignment(TextAlignment.CENTER).setVerticalAlignment(VerticalAlignment.MIDDLE);
            logo.add(new Paragraph(initial).setFont(bold).setFontSize(21).setFontColor(ColorConstants.WHITE));
            brandRow.addCell(logo);
            Cell brandText = new Cell().setBorder(Border.NO_BORDER)
                    .setVerticalAlignment(VerticalAlignment.MIDDLE).setPaddingLeft(12);
            brandText.add(new Paragraph(companyName != null ? companyName : "Company")
                    .setFont(bold).setFontSize(15).setFontColor(NAVY_DEEP).setMarginBottom(1));
            String sub = (companyWebsite != null && !companyWebsite.isEmpty())
                    ? companyWebsite : "Remote-First";
            brandText.add(new Paragraph(sub).setFont(regular).setFontSize(8.5f).setFontColor(TEXT_MUTED));
            brandRow.addCell(brandText);
            brand.add(brandRow);
            head.addCell(brand);

            // right: document label
            Cell lbl = new Cell().setBorder(Border.NO_BORDER)
                    .setTextAlignment(TextAlignment.RIGHT).setVerticalAlignment(VerticalAlignment.MIDDLE);
            lbl.add(new Paragraph("REMOTE OFFER LETTER")
                    .setFont(bold).setFontSize(10).setFontColor(NAVY).setCharacterSpacing(1f));
            head.addCell(lbl);
            doc.add(head);

            doc.add(new LineSeparator(new SolidLine(1.4f)).setStrokeColor(NAVY)
                    .setMarginTop(10).setMarginLeft(LEFT).setMarginRight(RIGHT).setMarginBottom(2));
            doc.add(new LineSeparator(new SolidLine(0.4f)).setStrokeColor(RULE_GRAY)
                    .setMarginTop(2).setMarginLeft(LEFT).setMarginRight(RIGHT).setMarginBottom(20));

            // ── ref + date ──
            Table meta = new Table(UnitValue.createPercentArray(new float[]{50, 50}))
                    .setWidth(UnitValue.createPercentValue(100))
                    .setMarginLeft(LEFT).setMarginRight(RIGHT).setMarginBottom(18);
            Cell ref = new Cell().setBorder(Border.NO_BORDER);
            ref.add(new Paragraph("Offer ID: " + offerId).setFont(regular).setFontSize(9).setFontColor(TEXT_MUTED));
            meta.addCell(ref);
            Cell dt = new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT);
            dt.add(new Paragraph("Date: " + today).setFont(regular).setFontSize(9).setFontColor(TEXT_MUTED));
            meta.addCell(dt);
            doc.add(meta);

            // ── salutation + intro ──
            doc.add(new Paragraph("Dear " + firstName(seekerName) + ",")
                    .setFont(regular).setFontSize(10.5f).setFontColor(TEXT_BODY)
                    .setMarginLeft(LEFT).setMarginRight(RIGHT).setMarginBottom(10));
            doc.add(new Paragraph("We are delighted to offer you the position of " + jobTitle + " at "
                    + companyName + ". "
                    + (remote ? "This remote role reflects our commitment to flexible, high-impact work. " : "")
                    + "The details of your offer are set out below.")
                    .setFont(regular).setFontSize(10.5f).setFontColor(TEXT_BODY).setMultipliedLeading(1.5f)
                    .setMarginLeft(LEFT).setMarginRight(RIGHT).setMarginBottom(18)
                    .setTextAlignment(TextAlignment.JUSTIFIED));

            // ══════════════ OFFER DETAILS GRID ══════════════
            doc.add(new Paragraph("OFFER DETAILS")
                    .setFont(bold).setFontSize(9).setFontColor(NAVY).setCharacterSpacing(1.2f)
                    .setMarginLeft(LEFT).setMarginRight(RIGHT).setMarginBottom(8));

            Table grid = new Table(UnitValue.createPercentArray(new float[]{50, 50}))
                    .setWidth(UnitValue.createPercentValue(100))
                    .setMarginLeft(LEFT).setMarginRight(RIGHT).setMarginBottom(6);

            grid.addCell(gridCell("JOB TITLE", jobTitle, bold, regular, true));
            grid.addCell(gridCell("EMPLOYMENT TYPE",
                    jobType != null ? jobType.replace("_", " ") : "Full Time", bold, regular, false));
            grid.addCell(gridCell("BASE SALARY",
                    minSalary > 0 ? "Rs. " + fmtSalary(minSalary) + " - " + fmtSalary(maxSalary) + " / year"
                                  : "To be discussed", bold, regular, true));
            grid.addCell(gridCell("WORK MODE",
                    remote ? "Fully Remote - Work from anywhere" : "On-site", bold, regular, false));
            grid.addCell(gridCell("REPORTING TO",
                    employerName != null ? employerName : companyName, bold, regular, false));
            grid.addCell(gridCell("START DATE", "To be mutually agreed", bold, regular, false));
            doc.add(grid);

            // remote banner
            if (remote) {
                Table rb = new Table(UnitValue.createPercentArray(new float[]{100}))
                        .setWidth(UnitValue.createPercentValue(100))
                        .setMarginLeft(LEFT).setMarginRight(RIGHT).setMarginBottom(18);
                Cell rc = new Cell().setBorder(Border.NO_BORDER).setBackgroundColor(ACCENT_TEAL)
                        .setPadding(10).setPaddingLeft(14);
                rc.add(new Paragraph("Fully Remote  -  Work from anywhere  -  Async-first")
                        .setFont(bold).setFontSize(9.5f).setFontColor(ColorConstants.WHITE));
                rb.addCell(rc);
                doc.add(rb);
            } else {
                doc.add(new Paragraph(" ").setMarginBottom(6));
            }

            // ══════════════ KEY TERMS ══════════════
            doc.add(new Paragraph("KEY TERMS")
                    .setFont(bold).setFontSize(9).setFontColor(NAVY).setCharacterSpacing(1.2f)
                    .setMarginLeft(LEFT).setMarginRight(RIGHT).setMarginBottom(8));
            String[] terms = {
                    "Employment is contingent upon successful background check and reference verification.",
                    "You will report to " + (employerName != null ? employerName : "your hiring manager")
                            + ". Performance reviews occur periodically.",
                    "This offer is confidential and intended solely for the named recipient.",
                    "The Company reserves the right to modify terms prior to acceptance.",
                    "Please review and respond to this offer within 3 business days from the date above.",
            };
            for (String t : terms) {
                doc.add(new Paragraph("•   " + t)
                        .setFont(regular).setFontSize(9).setFontColor(TEXT_BODY).setMultipliedLeading(1.4f)
                        .setMarginLeft(LEFT).setMarginRight(RIGHT).setMarginBottom(4));
            }

            // employer note
            if (employerNote != null && !employerNote.isEmpty()) {
                Table note = new Table(UnitValue.createPercentArray(new float[]{100}))
                        .setWidth(UnitValue.createPercentValue(100))
                        .setMarginTop(14).setMarginLeft(LEFT).setMarginRight(RIGHT);
                Cell nc = new Cell().setBorderLeft(new SolidBorder(NAVY, 3))
                        .setBorderTop(Border.NO_BORDER).setBorderRight(Border.NO_BORDER).setBorderBottom(Border.NO_BORDER)
                        .setBackgroundColor(PANEL_BG).setPadding(12).setPaddingLeft(14);
                nc.add(new Paragraph("A note from " + (employerName != null ? employerName : companyName))
                        .setFont(bold).setFontSize(9).setFontColor(NAVY).setMarginBottom(4));
                nc.add(new Paragraph(employerNote).setFont(italic).setFontSize(9.5f).setFontColor(TEXT_DARK));
                note.addCell(nc);
                doc.add(note);
            }

            // ══════════════ SIGNATURES ══════════════
            Table sig = new Table(UnitValue.createPercentArray(new float[]{50, 50}))
                    .setWidth(UnitValue.createPercentValue(100))
                    .setMarginTop(34).setMarginLeft(LEFT).setMarginRight(RIGHT);

            Cell cand = new Cell().setBorder(Border.NO_BORDER).setPadding(0);
            cand.add(new Paragraph("CANDIDATE SIGNATURE")
                    .setFont(bold).setFontSize(8).setFontColor(TEXT_MUTED).setCharacterSpacing(0.5f).setMarginBottom(28));
            cand.add(new LineSeparator(new SolidLine(0.8f)).setStrokeColor(TEXT_DARK).setWidth(150).setMarginBottom(5));
            cand.add(new Paragraph(seekerName).setFont(bold).setFontSize(10).setFontColor(TEXT_DARK).setMarginBottom(1));
            cand.add(new Paragraph("Full name & date").setFont(regular).setFontSize(8).setFontColor(TEXT_MUTED));
            sig.addCell(cand);

            Cell comp = new Cell().setBorder(Border.NO_BORDER).setPadding(0).setTextAlignment(TextAlignment.RIGHT);
            comp.add(new Paragraph("FOR " + (companyName != null ? companyName.toUpperCase() : "COMPANY"))
                    .setFont(bold).setFontSize(8).setFontColor(TEXT_MUTED).setCharacterSpacing(0.5f).setMarginBottom(28));
            comp.add(new LineSeparator(new SolidLine(0.8f)).setStrokeColor(TEXT_DARK).setWidth(150)
                    .setMarginBottom(5).setHorizontalAlignment(HorizontalAlignment.RIGHT));
            comp.add(new Paragraph(employerName != null ? employerName : "Authorised Signatory")
                    .setFont(bold).setFontSize(10).setFontColor(TEXT_DARK).setMarginBottom(1));
            comp.add(new Paragraph("Hiring Manager").setFont(regular).setFontSize(8).setFontColor(TEXT_MUTED));
            sig.addCell(comp);
            doc.add(sig);

            // footer
            doc.add(new LineSeparator(new SolidLine(0.4f)).setStrokeColor(RULE_GRAY)
                    .setMarginTop(34).setMarginLeft(LEFT).setMarginRight(RIGHT).setMarginBottom(8));
            doc.add(new Paragraph("This document is confidential and intended solely for the named recipient. "
                    + companyName + " reserves the right to modify terms prior to acceptance.")
                    .setFont(regular).setFontSize(7.5f).setFontColor(TEXT_MUTED).setTextAlignment(TextAlignment.CENTER)
                    .setMarginLeft(LEFT).setMarginRight(RIGHT).setMarginBottom(2));
            doc.add(new Paragraph("Offer ID: " + offerId + "   |   Generated via SkillBridge   |   " + today)
                    .setFont(regular).setFontSize(7.5f).setFontColor(TEXT_MUTED).setTextAlignment(TextAlignment.CENTER)
                    .setMarginLeft(LEFT).setMarginRight(RIGHT));

            doc.close();
            return out.toByteArray();

        } catch (Exception e) {
            log.error("Failed to generate offer letter PDF: {}", e.getMessage());
            return new byte[0];
        }
    }

    // A single labelled cell in the offer-details grid
    private Cell gridCell(String label, String value, PdfFont bold, PdfFont regular, boolean tint) {
        Cell c = new Cell().setBorder(new SolidBorder(RULE_GRAY, 0.5f))
                .setPadding(11).setPaddingLeft(14)
                .setBackgroundColor(tint ? PANEL_BG : new DeviceRgb(255, 255, 255));
        c.add(new Paragraph(label).setFont(bold).setFontSize(7.5f)
                .setFontColor(TEXT_MUTED).setCharacterSpacing(0.5f).setMarginBottom(3));
        c.add(new Paragraph(value != null ? value : "-").setFont(bold).setFontSize(10.5f).setFontColor(NAVY_DEEP));
        return c;
    }

    private String firstName(String full) {
        if (full == null || full.trim().isEmpty()) return "Candidate";
        return full.trim().split("\\s+")[0];
    }

    private String fmtSalary(double salary) {
        if (salary >= 100000) return String.format("%.1fL", salary / 100000);
        return String.format("%.0f", salary);
    }
}