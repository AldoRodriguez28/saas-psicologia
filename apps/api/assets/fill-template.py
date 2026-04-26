#!/usr/bin/env python3
"""
fill-template.py  —  Rellena los campos SDT de la plantilla de nota clínica.

Uso:
    python3 fill-template.py <template.docx> <output.docx> <campos_json>

Los campos JSON son un objeto plano  { "Exp": "PSI-2026-0001", "Nombre": "...", ... }
"""
import sys, json, zipfile, shutil, re, os, tempfile


def escape_xml(value: str) -> str:
    return (value
            .replace('&', '&amp;')
            .replace('<', '&lt;')
            .replace('>', '&gt;')
            .replace('"', '&quot;'))


def make_paragraph(text: str) -> str:
    """Genera un párrafo Word con el texto dado."""
    escaped = escape_xml(text)
    return (
        '<w:p>'
        '<w:pPr><w:jc w:val="both"/></w:pPr>'
        '<w:r>'
        '<w:rPr><w:rStyle w:val="BaseChar"/></w:rPr>'
        f'<w:t xml:space="preserve">{escaped}</w:t>'
        '</w:r>'
        '</w:p>'
    )


def fill_sdt_for_bookmark(xml: str, bookmark_name: str, value: str) -> str:
    """
    Reemplaza el contenido del SDT que sigue inmediatamente al bookmark dado.
    """
    bm_re = re.escape(bookmark_name)

    pattern = (
        rf'(<w:bookmarkStart[^>]*w:name="{bm_re}"[^/]*/>\s*)'
        rf'(<w:sdt>.*?<w:sdtContent>)'
        rf'(.*?)'
        rf'(</w:sdtContent>)'
    )

    new_content = make_paragraph(value)

    def replacer(m):
        return f'{m.group(1)}{m.group(2)}{new_content}{m.group(4)}'

    new_xml, count = re.subn(pattern, replacer, xml, count=1, flags=re.DOTALL)

    if count == 0:
        # Fallback: bookmark dentro de celda de tabla sin SDT envolvente
        tc_pattern = (
            rf'(<w:bookmarkStart[^>]*w:name="{bm_re}"/>\s*)'
            rf'(<w:tc>.*?<w:t[^>]*>)[^<]*(</w:t>.*?</w:tc>)'
        )
        new_xml, _ = re.subn(
            tc_pattern,
            lambda m: f'{m.group(1)}{m.group(2)}{escape_xml(value)}{m.group(3)}',
            new_xml, count=1, flags=re.DOTALL
        )

    return new_xml


def fill_repeating_section_plan(xml: str, value: str) -> str:
    """
    Reemplaza el repeatingSection SDT del plan terapéutico con texto libre.
    El SDT se identifica por <w15:repeatingSection/> dentro de su sdtPr.
    """
    # Encontrar el SDT con repeatingSection
    rs_idx = xml.find('<w15:repeatingSection/>')
    if rs_idx == -1:
        return xml

    # Retroceder al inicio del <w:sdt> padre
    sdt_start = xml.rfind('<w:sdt>', 0, rs_idx)
    if sdt_start == -1:
        return xml

    # Encontrar el </w:sdt> balanceado
    pos = sdt_start
    depth = 0
    sdt_end = -1
    while pos < len(xml):
        o = xml.find('<w:sdt>', pos)
        c = xml.find('</w:sdt>', pos)
        if o == -1:
            o = len(xml)
        if c == -1:
            break
        if o < c:
            depth += 1
            pos = o + 7
        else:
            depth -= 1
            pos = c + 8
            if depth == 0:
                sdt_end = pos
                break

    if sdt_end == -1:
        return xml

    # Reemplazar todo el SDT con un párrafo de texto libre
    new_paragraph = make_paragraph(value)
    return xml[:sdt_start] + new_paragraph + xml[sdt_end:]


def remove_showing_placeholder(xml: str, bookmark_name: str) -> str:
    """Elimina <w:showingPlcHdr/> del SDT asociado al bookmark."""
    bm_re = re.escape(bookmark_name)
    pattern = (
        rf'(w:name="{bm_re}".*?<w:sdtPr>.*?)'
        rf'<w:showingPlcHdr/>'
        rf'(.*?</w:sdtPr>)'
    )
    return re.sub(pattern, r'\1\2', xml, count=1, flags=re.DOTALL)


def main():
    if len(sys.argv) < 4:
        print("Uso: fill-template.py <template> <output> <json_campos>", file=sys.stderr)
        sys.exit(1)

    template_path = sys.argv[1]
    output_path   = sys.argv[2]
    fields        = json.loads(sys.argv[3])

    tmp = tempfile.mktemp(suffix='.docx')
    shutil.copy(template_path, tmp)

    with zipfile.ZipFile(tmp, 'r') as z:
        names = z.namelist()
        files = {n: z.read(n) for n in names}

    xml = files['word/document.xml'].decode('utf-8')

    # Llenar campos con bookmark
    for bookmark, value in fields.items():
        if bookmark == 'Plan':
            continue  # se maneja aparte
        if value:
            xml = remove_showing_placeholder(xml, bookmark)
            xml = fill_sdt_for_bookmark(xml, bookmark, str(value))

    # Llenar sección de plan terapéutico (repeatingSection sin bookmark)
    plan_value = fields.get('Plan', '')
    if plan_value:
        xml = fill_repeating_section_plan(xml, str(plan_value))

    files['word/document.xml'] = xml.encode('utf-8')

    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zout:
        for name in names:
            zout.writestr(name, files[name])

    os.unlink(tmp)
    print('OK')


if __name__ == '__main__':
    main()
