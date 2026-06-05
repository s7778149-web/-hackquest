from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from io import BytesIO
from datetime import datetime

C_NAVY   = HexColor('#0d1b2a')
C_DARK   = HexColor('#1b263b')
C_GOLD   = HexColor('#e2a800')
C_LGOLD  = HexColor('#fff8e1')
C_RED    = HexColor('#c0392b')
C_LRED   = HexColor('#fdf2f2')
C_GREEN  = HexColor('#1a7a4a')
C_LGREEN = HexColor('#f0faf5')
C_BLUE   = HexColor('#1565c0')
C_LBLUE  = HexColor('#e8f0fe')
C_PURPLE = HexColor('#6a1b9a')
C_LPURP  = HexColor('#f5edfc')
C_GREY1  = HexColor('#f5f6fa')
C_BORDER = HexColor('#d0d4de')
C_TEXT   = HexColor('#1c1c2e')
C_MUTED  = HexColor('#6b7280')
C_WHITE  = HexColor('#ffffff')

W = A4[0] - 4*cm

def tc(score):
    if score >= 70: return C_RED
    if score >= 45: return C_GOLD
    return C_GREEN

def sc(skill):
    m = {
        'Script Kiddie': C_GREEN,
        'Intermediate': C_GOLD,
        'Advanced': HexColor('#d35400'),
        'Nation-State APT': C_RED
    }
    return m.get(skill, C_BLUE)

def hcell(text):
    return Paragraph(f'<b>{text}</b>',
        ParagraphStyle('_hc', fontName='Helvetica-Bold', fontSize=8,
                       textColor=C_WHITE, alignment=TA_CENTER,
                       leading=11, spaceAfter=0))

def divider(color=C_BORDER, thick=0.5):
    return HRFlowable(width='100%', thickness=thick,
                      color=color, spaceAfter=8, spaceBefore=8)

def section_title(text):
    return [
        Spacer(1, 4),
        Paragraph(text, ParagraphStyle('st',
            fontName='Helvetica-Bold', fontSize=13,
            textColor=C_NAVY, leading=18,
            spaceBefore=4, spaceAfter=4)),
        HRFlowable(width='100%', thickness=2,
                   color=C_GOLD, spaceAfter=10),
    ]

def generate_report(attackers: list, stats: dict) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=1.8*cm, bottomMargin=2*cm,
        title='HoneyTrap AI — Security Report',
    )

    story = []
    now = datetime.now()

    total     = stats.get('total_attackers', len(attackers))
    high      = sum(1 for a in attackers if (a.get('threat_score') or 0) >= 70)
    countries = len(set(a.get('country','?') for a in attackers))
    avg       = sum((a.get('threat_score') or 50) for a in attackers) / max(len(attackers), 1)

    # ── BANNER ───────────────────────────────────────
    banner = Table([[
        Paragraph(
            '<font name="Helvetica-Bold" size="22" color="#e2a800">HoneyTrap AI</font><br/>'
            '<font name="Helvetica" size="9" color="#8899aa">'
            'SECURITY INTELLIGENCE REPORT  —  CONFIDENTIAL</font>',
            ParagraphStyle('_', fontName='Helvetica',
                           fontSize=22, leading=32, spaceAfter=0)),
        Paragraph(
            f'<font name="Helvetica" size="8" color="#8899aa">Report Date</font><br/>'
            f'<font name="Helvetica-Bold" size="11" color="#ffffff">'
            f'{now.strftime("%d %B %Y")}</font><br/>'
            f'<font name="Helvetica" size="8" color="#8899aa">'
            f'{now.strftime("%H:%M UTC")}</font>',
            ParagraphStyle('_', fontName='Helvetica', fontSize=11,
                           leading=16, alignment=TA_RIGHT, spaceAfter=0)),
    ]], colWidths=[12.5*cm, 5.6*cm])
    banner.setStyle(TableStyle([
        ('BACKGROUND',    (0,0),(-1,-1), C_NAVY),
        ('TOPPADDING',    (0,0),(-1,-1), 18),
        ('BOTTOMPADDING', (0,0),(-1,-1), 18),
        ('LEFTPADDING',   (0,0),(-1,-1), 18),
        ('RIGHTPADDING',  (0,0),(-1,-1), 18),
        ('VALIGN',        (0,0),(-1,-1), 'MIDDLE'),
        ('LINEBELOW',     (0,0),(-1,-1), 3, C_GOLD),
    ]))
    story.append(banner)
    story.append(Spacer(1, 18))

    # ── STAT BOXES ───────────────────────────────────
    def stat_box(value, label, color):
        return Paragraph(
            f'<font name="Helvetica-Bold" size="28" color="{color.hexval()}">'
            f'{value}</font><br/>'
            f'<font name="Helvetica" size="7" color="#9099aa">{label}</font>',
            ParagraphStyle('_', fontName='Helvetica', fontSize=28,
                           leading=36, alignment=TA_CENTER, spaceAfter=0))

    boxes = Table([[
        stat_box(total,         'TOTAL ATTACKERS',  C_RED),
        stat_box(high,          'HIGH THREAT (70+)', C_RED),
        stat_box(countries,     'COUNTRIES',         C_GREEN),
        stat_box(f'{avg:.0f}',  'AVG THREAT SCORE',  C_GOLD),
    ]], colWidths=[W/4]*4)
    boxes.setStyle(TableStyle([
        ('BACKGROUND',    (0,0),(-1,-1), C_DARK),
        ('TOPPADDING',    (0,0),(-1,-1), 16),
        ('BOTTOMPADDING', (0,0),(-1,-1), 16),
        ('LEFTPADDING',   (0,0),(-1,-1), 8),
        ('RIGHTPADDING',  (0,0),(-1,-1), 8),
        ('ALIGN',         (0,0),(-1,-1), 'CENTER'),
        ('VALIGN',        (0,0),(-1,-1), 'MIDDLE'),
        ('LINEAFTER',     (0,0),(2,-1),  0.5, HexColor('#2a3a50')),
    ]))
    story.append(boxes)
    story.append(Spacer(1, 14))

    story.append(Paragraph(
        f'This report summarises <b>{total}</b> attack attempts captured by the HoneyTrap AI '
        f'honeypot network. <b>{high}</b> attacks were classified as high threat (score 70+), '
        f'originating from <b>{countries}</b> unique countries. Average threat score: '
        f'<b>{avg:.1f}/100</b>. All sessions were automatically captured and profiled using AI.',
        ParagraphStyle('body', fontName='Helvetica', fontSize=10, leading=16,
                       textColor=C_TEXT, alignment=TA_JUSTIFY, spaceAfter=0)
    ))
    story.append(Spacer(1, 18))

    # ── ATTACKER TABLE ───────────────────────────────
    story += section_title('Captured Attacker Profiles')

    if attackers:
        rows = [[
            hcell('#'), hcell('IP ADDRESS'), hcell('COUNTRY'),
            hcell('PROTO'), hcell('SKILL LEVEL'),
            hcell('SCORE'), hcell('DATE')
        ]]

        for i, a in enumerate(attackers[:30]):
            score = a.get('threat_score') or 50
            skill = a.get('skill_level') or 'Unknown'
            date  = str(a.get('created_at',''))[:10]

            rows.append([
                Paragraph(f'<font size="9" color="#9099aa">{i+1}</font>',
                    ParagraphStyle('_', fontName='Helvetica', fontSize=9,
                                   alignment=TA_CENTER, leading=13, spaceAfter=0)),
                Paragraph(f'<font name="Courier-Bold" size="9">'
                          f'{a.get("ip_address","?")}</font>',
                    ParagraphStyle('_', fontName='Courier-Bold', fontSize=9,
                                   leading=13, spaceAfter=0)),
                Paragraph(f'<font size="9">'
                          f'{(a.get("country") or "Unknown")[:20]}</font>',
                    ParagraphStyle('_', fontName='Helvetica', fontSize=9,
                                   leading=13, spaceAfter=0)),
                Paragraph(f'<font size="9" color="#1565c0"><b>'
                          f'{a.get("protocol","SSH")}</b></font>',
                    ParagraphStyle('_', fontName='Helvetica-Bold', fontSize=9,
                                   alignment=TA_CENTER, leading=13, spaceAfter=0)),
                Paragraph(f'<font size="8" color="{sc(skill).hexval()}">'
                          f'<b>{skill[:14]}</b></font>',
                    ParagraphStyle('_', fontName='Helvetica-Bold', fontSize=8,
                                   leading=12, spaceAfter=0)),
                Paragraph(f'<font size="12" color="{tc(score).hexval()}">'
                          f'<b>{score:.0f}</b></font>',
                    ParagraphStyle('_', fontName='Helvetica-Bold', fontSize=12,
                                   alignment=TA_CENTER, leading=16, spaceAfter=0)),
                Paragraph(f'<font size="8" color="#9099aa">{date}</font>',
                    ParagraphStyle('_', fontName='Helvetica', fontSize=8,
                                   alignment=TA_CENTER, leading=12, spaceAfter=0)),
            ])

        t = Table(rows,
                  colWidths=[0.8*cm, 3.6*cm, 3.4*cm,
                             1.6*cm, 3.4*cm, 1.4*cm, 2*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND',     (0,0), (-1,0),  C_NAVY),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [C_GREY1, C_WHITE]),
            ('GRID',           (0,0), (-1,-1), 0.25, C_BORDER),
            ('TOPPADDING',     (0,0), (-1,-1), 8),
            ('BOTTOMPADDING',  (0,0), (-1,-1), 8),
            ('LEFTPADDING',    (0,0), (-1,-1), 6),
            ('RIGHTPADDING',   (0,0), (-1,-1), 6),
            ('VALIGN',         (0,0), (-1,-1), 'MIDDLE'),
            ('LINEBELOW',      (0,0), (-1,0),  2, C_GOLD),
            ('LINEBELOW',      (0,-1),(-1,-1), 1.5, C_GOLD),
        ]))
        story.append(t)
    else:
        story.append(Paragraph('No attackers captured yet.',
            ParagraphStyle('_', fontName='Helvetica',
                           fontSize=10, leading=15)))

    story.append(PageBreak())

    # ── AI ANALYSIS ──────────────────────────────────
    story += section_title('AI-Generated Attacker Analysis')

    for i, a in enumerate(attackers[:10]):
        score      = a.get('threat_score') or 50
        skill      = a.get('skill_level') or 'Unknown'
        motivation = a.get('motivation') or 'Unknown'
        tools      = a.get('tools_used') or 'Unknown'
        ai_text    = a.get('ai_summary') or 'No AI analysis available.'
        bg = C_LRED   if score>=70 else C_LGOLD  if score>=45 else C_LGREEN
        bc = C_RED    if score>=70 else C_GOLD   if score>=45 else C_GREEN

        card_hdr = Table([[
            Paragraph(
                f'<font name="Helvetica-Bold" size="12" color="#0d1b2a">'
                f'Attacker #{i+1}  —  {a.get("ip_address","?")}</font><br/>'
                f'<font name="Helvetica" size="9" color="#6b7280">'
                f'{a.get("country","Unknown")}  ·  '
                f'{a.get("protocol","SSH")}:{a.get("port",2222)}  ·  {skill}</font>',
                ParagraphStyle('_', fontName='Helvetica', fontSize=12,
                               leading=18, spaceAfter=0)),
            Paragraph(
                f'<font name="Helvetica-Bold" size="22" '
                f'color="{tc(score).hexval()}">{score:.0f}</font><br/>'
                f'<font name="Helvetica" size="7" color="#9099aa">THREAT SCORE</font>',
                ParagraphStyle('_', fontName='Helvetica', fontSize=22,
                               leading=28, alignment=TA_RIGHT, spaceAfter=0)),
        ]], colWidths=[13.5*cm, 2.6*cm])
        card_hdr.setStyle(TableStyle([
            ('BACKGROUND',    (0,0),(-1,-1), bg),
            ('TOPPADDING',    (0,0),(-1,-1), 10),
            ('BOTTOMPADDING', (0,0),(-1,-1), 10),
            ('LEFTPADDING',   (0,0),(-1,-1), 14),
            ('RIGHTPADDING',  (0,0),(-1,-1), 14),
            ('VALIGN',        (0,0),(-1,-1), 'MIDDLE'),
            ('LINEBEFORE',    (0,0),(0,-1),  4, bc),
        ]))

        det_tbl = Table([[
            Paragraph(
                f'<font size="8" color="#9099aa">MOTIVATION</font><br/>'
                f'<font size="9"><b>{motivation}</b></font>',
                ParagraphStyle('_', fontName='Helvetica', fontSize=9,
                               leading=14, spaceAfter=0)),
            Paragraph(
                f'<font size="8" color="#9099aa">SKILL LEVEL</font><br/>'
                f'<font size="9" color="{sc(skill).hexval()}"><b>{skill}</b></font>',
                ParagraphStyle('_', fontName='Helvetica', fontSize=9,
                               leading=14, spaceAfter=0)),
            Paragraph(
                f'<font size="8" color="#9099aa">TOOLS USED</font><br/>'
                f'<font size="9"><b>{tools[:30]}</b></font>',
                ParagraphStyle('_', fontName='Helvetica', fontSize=9,
                               leading=14, spaceAfter=0)),
        ]], colWidths=[W/3]*3)
        det_tbl.setStyle(TableStyle([
            ('BACKGROUND',    (0,0),(-1,-1), C_GREY1),
            ('TOPPADDING',    (0,0),(-1,-1), 8),
            ('BOTTOMPADDING', (0,0),(-1,-1), 8),
            ('LEFTPADDING',   (0,0),(-1,-1), 14),
            ('RIGHTPADDING',  (0,0),(-1,-1), 14),
            ('VALIGN',        (0,0),(-1,-1), 'MIDDLE'),
            ('LINEAFTER',     (0,0),(1,-1),  0.5, C_BORDER),
        ]))

        ai_tbl = Table([[
            Paragraph(
                f'<font name="Helvetica-Bold" size="8" '
                f'color="{C_PURPLE.hexval()}">AI ANALYSIS:  </font>'
                f'<font name="Helvetica" size="9" color="#333333">{ai_text}</font>',
                ParagraphStyle('_', fontName='Helvetica', fontSize=9,
                               leading=15, spaceAfter=0))
        ]], colWidths=[W])
        ai_tbl.setStyle(TableStyle([
            ('BACKGROUND',    (0,0),(-1,-1), C_LPURP),
            ('TOPPADDING',    (0,0),(-1,-1), 10),
            ('BOTTOMPADDING', (0,0),(-1,-1), 10),
            ('LEFTPADDING',   (0,0),(-1,-1), 14),
            ('RIGHTPADDING',  (0,0),(-1,-1), 14),
            ('LINEBEFORE',    (0,0),(0,-1),  3, C_PURPLE),
            ('LINEBELOW',     (0,0),(-1,-1), 0.5, C_BORDER),
        ]))

        story.append(KeepTogether([
            card_hdr, det_tbl, ai_tbl, Spacer(1,10)
        ]))

    story.append(PageBreak())

    # ── RECOMMENDATIONS ──────────────────────────────
    story += section_title('Security Recommendations')

    recs = [
        ('IMMEDIATE',
         f'Block all {high} high-threat IP addresses identified in this report.',
         C_RED, C_LRED),
        ('IMMEDIATE',
         'Disable password SSH auth. Use key-based authentication only.',
         C_RED, C_LRED),
        ('SHORT-TERM',
         'Implement rate limiting and fail2ban on all public-facing services.',
         C_GOLD, C_LGOLD),
        ('SHORT-TERM',
         'Audit and patch all exposed web admin panels against SQL injection.',
         C_GOLD, C_LGOLD),
        ('LONG-TERM',
         'Expand honeypot coverage to MySQL (3306) and RDP (3389) ports.',
         C_GREEN, C_LGREEN),
        ('LONG-TERM',
         'Enable automated IP blocking for IPs with 3+ failed auth attempts.',
         C_GREEN, C_LGREEN),
        ('ONGOING',
         'Schedule weekly AI analysis runs to keep attacker profiles current.',
         C_BLUE, C_LBLUE),
        ('ONGOING',
         'Archive monthly PDF reports as compliance docs (GDPR / ISO 27001).',
         C_BLUE, C_LBLUE),
    ]

    for priority, text, col, bg in recs:
        row = Table([[
            Paragraph(
                f'<font name="Helvetica-Bold" size="8" '
                f'color="{col.hexval()}">{priority}</font><br/>'
                f'<font name="Helvetica" size="9" color="#333333">{text}</font>',
                ParagraphStyle('_', fontName='Helvetica', fontSize=9,
                               leading=14, spaceAfter=0)),
        ]], colWidths=[W])
        row.setStyle(TableStyle([
            ('BACKGROUND',    (0,0),(-1,-1), bg),
            ('TOPPADDING',    (0,0),(-1,-1), 9),
            ('BOTTOMPADDING', (0,0),(-1,-1), 9),
            ('LEFTPADDING',   (0,0),(-1,-1), 14),
            ('RIGHTPADDING',  (0,0),(-1,-1), 14),
            ('VALIGN',        (0,0),(-1,-1), 'MIDDLE'),
            ('LINEBELOW',     (0,0),(-1,-1), 0.5, C_BORDER),
            ('LINEBEFORE',    (0,0),(0,-1),  4, col),
        ]))
        story.append(row)

    story.append(Spacer(1, 24))

    # ── FOOTER ───────────────────────────────────────
    footer = Table([[
        Paragraph(
            '<font name="Helvetica-Bold" size="9" color="#e2a800">'
            'HoneyTrap AI Platform</font>',
            ParagraphStyle('_', fontName='Helvetica-Bold', fontSize=9,
                           leading=13, spaceAfter=0)),
        Paragraph(
            f'<font name="Helvetica" size="8" color="#8899aa">'
            f'Generated: {now.strftime("%d/%m/%Y at %H:%M UTC")}</font>',
            ParagraphStyle('_', fontName='Helvetica', fontSize=8,
                           alignment=TA_CENTER, leading=12, spaceAfter=0)),
        Paragraph(
            '<font name="Helvetica" size="8" color="#8899aa">'
            'CONFIDENTIAL — Authorized Use Only</font>',
            ParagraphStyle('_', fontName='Helvetica', fontSize=8,
                           alignment=TA_RIGHT, leading=12, spaceAfter=0)),
    ]], colWidths=[W/3]*3)
    footer.setStyle(TableStyle([
        ('BACKGROUND',    (0,0),(-1,-1), C_NAVY),
        ('TOPPADDING',    (0,0),(-1,-1), 14),
        ('BOTTOMPADDING', (0,0),(-1,-1), 14),
        ('LEFTPADDING',   (0,0),(-1,-1), 14),
        ('RIGHTPADDING',  (0,0),(-1,-1), 14),
        ('VALIGN',        (0,0),(-1,-1), 'MIDDLE'),
        ('LINEABOVE',     (0,0),(-1,-1), 2.5, C_GOLD),
    ]))
    story.append(footer)

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()