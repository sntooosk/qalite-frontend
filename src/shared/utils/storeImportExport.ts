import type { StoreExportPayload, StoreScenario } from '../../domain/entities/store';

const textEncoder = new TextEncoder();

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const toColumnName = (index: number): string => {
  let dividend = index + 1;
  let columnName = '';

  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }

  return columnName;
};

const buildWorksheetXml = (rows: string[][]) => {
  const sheetData = rows
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 1}">${row
          .map(
            (cell, columnIndex) =>
              `<c r="${toColumnName(columnIndex)}${rowIndex + 1}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(
                cell,
              )}</t></is></c>`,
          )
          .join('')}</row>`,
    )
    .join('');

  const lastColumn = rows[0]?.length ? toColumnName(rows[0].length - 1) : 'A';
  const lastRow = rows.length || 1;

  return `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastColumn}${lastRow}" />
  <sheetData>${sheetData}</sheetData>
</worksheet>`;
};

const crc32Table = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let crc = i;
    for (let j = 0; j < 8; j += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    table[i] = crc >>> 0;
  }
  return table;
})();

const calculateCrc32 = (data: Uint8Array) => {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc = crc32Table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

interface ZipEntry {
  path: string;
  data: Uint8Array;
}

const buildZipFile = (entries: ZipEntry[]): Uint8Array => {
  const localFileRecords: Uint8Array[] = [];
  const centralDirectoryRecords: Uint8Array[] = [];
  let offset = 0;

  entries.forEach((entry, index) => {
    const fileName = textEncoder.encode(entry.path);
    const crc = calculateCrc32(entry.data);
    const localHeader = new ArrayBuffer(30);
    const localHeaderView = new DataView(localHeader);

    localHeaderView.setUint32(0, 0x04034b50, true);
    localHeaderView.setUint16(4, 20, true);
    localHeaderView.setUint16(6, 0, true);
    localHeaderView.setUint16(8, 0, true);
    localHeaderView.setUint16(10, 0, true);
    localHeaderView.setUint16(12, 0, true);
    localHeaderView.setUint32(14, crc, true);
    localHeaderView.setUint32(18, entry.data.length, true);
    localHeaderView.setUint32(22, entry.data.length, true);
    localHeaderView.setUint16(26, fileName.length, true);
    localHeaderView.setUint16(28, 0, true);

    const localRecord = new Uint8Array(30 + fileName.length + entry.data.length);
    localRecord.set(new Uint8Array(localHeader), 0);
    localRecord.set(fileName, 30);
    localRecord.set(entry.data, 30 + fileName.length);
    localFileRecords.push(localRecord);

    const centralHeader = new ArrayBuffer(46);
    const centralHeaderView = new DataView(centralHeader);
    centralHeaderView.setUint32(0, 0x02014b50, true);
    centralHeaderView.setUint16(4, 20, true);
    centralHeaderView.setUint16(6, 20, true);
    centralHeaderView.setUint16(8, 0, true);
    centralHeaderView.setUint16(10, 0, true);
    centralHeaderView.setUint16(12, 0, true);
    centralHeaderView.setUint16(14, 0, true);
    centralHeaderView.setUint32(16, crc, true);
    centralHeaderView.setUint32(20, entry.data.length, true);
    centralHeaderView.setUint32(24, entry.data.length, true);
    centralHeaderView.setUint16(28, fileName.length, true);
    centralHeaderView.setUint16(30, 0, true);
    centralHeaderView.setUint16(32, 0, true);
    centralHeaderView.setUint16(34, 0, true);
    centralHeaderView.setUint16(36, 0, true);
    centralHeaderView.setUint32(38, 0, true);
    centralHeaderView.setUint32(42, offset, true);

    const centralRecord = new Uint8Array(46 + fileName.length);
    centralRecord.set(new Uint8Array(centralHeader), 0);
    centralRecord.set(fileName, 46);
    centralDirectoryRecords.push(centralRecord);

    offset += localRecord.length;
    if (index === entries.length - 1) {
      return;
    }
  });

  const centralDirectorySize = centralDirectoryRecords.reduce(
    (size, record) => size + record.length,
    0,
  );
  const centralDirectoryOffset = offset;

  const endRecord = new ArrayBuffer(22);
  const endRecordView = new DataView(endRecord);
  endRecordView.setUint32(0, 0x06054b50, true);
  endRecordView.setUint16(4, 0, true);
  endRecordView.setUint16(6, 0, true);
  endRecordView.setUint16(8, entries.length, true);
  endRecordView.setUint16(10, entries.length, true);
  endRecordView.setUint32(12, centralDirectorySize, true);
  endRecordView.setUint32(16, centralDirectoryOffset, true);
  endRecordView.setUint16(20, 0, true);

  const totalSize = offset + centralDirectorySize + endRecord.byteLength;
  const zip = new Uint8Array(totalSize);
  let currentOffset = 0;

  localFileRecords.forEach((record) => {
    zip.set(record, currentOffset);
    currentOffset += record.length;
  });

  centralDirectoryRecords.forEach((record) => {
    zip.set(record, currentOffset);
    currentOffset += record.length;
  });

  zip.set(new Uint8Array(endRecord), currentOffset);

  return zip;
};

interface WorksheetDefinition {
  name: string;
  rows: string[][];
}

const buildWorkbookZip = (sheets: WorksheetDefinition[], createdAt: string): Uint8Array => {
  const sheetXmlEntries = sheets.map((sheet) => buildWorksheetXml(sheet.rows));

  const workbookXml = `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheets
      .map(
        (sheet, index) =>
          `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}" />`,
      )
      .join('')}
  </sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheets
    .map(
      (_sheet, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml" />`,
    )
    .join('')}
</Relationships>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
  <Default Extension="xml" ContentType="application/xml" />
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml" />
  ${sheets
    .map(
      (_sheet, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml" />`,
    )
    .join('')}
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml" />
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml" />
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml" />
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml" />
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml" />
</Relationships>`;

  const appXml = `<?xml version="1.0" encoding="UTF-8"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>QAlite</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs>
    <vt:vector size="2" baseType="variant">
      <vt:variant>
        <vt:lpstr>Worksheets</vt:lpstr>
      </vt:variant>
      <vt:variant>
        <vt:i4>${sheets.length}</vt:i4>
      </vt:variant>
    </vt:vector>
  </HeadingPairs>
  <TitlesOfParts>
    <vt:vector size="${sheets.length}" baseType="lpstr">
      ${sheets.map((sheet) => `<vt:lpstr>${escapeXml(sheet.name)}</vt:lpstr>`).join('')}
    </vt:vector>
  </TitlesOfParts>
</Properties>`;

  const coreXml = `<?xml version="1.0" encoding="UTF-8"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>QAlite</dc:creator>
  <cp:lastModifiedBy>QAlite</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:modified>
</cp:coreProperties>`;

  const entries: ZipEntry[] = [
    { path: '[Content_Types].xml', data: textEncoder.encode(contentTypesXml) },
    { path: '_rels/.rels', data: textEncoder.encode(rootRelsXml) },
    { path: 'docProps/app.xml', data: textEncoder.encode(appXml) },
    { path: 'docProps/core.xml', data: textEncoder.encode(coreXml) },
    { path: 'xl/workbook.xml', data: textEncoder.encode(workbookXml) },
    { path: 'xl/_rels/workbook.xml.rels', data: textEncoder.encode(workbookRelsXml) },
    ...sheetXmlEntries.map((content, index) => ({
      path: `xl/worksheets/sheet${index + 1}.xml`,
      data: textEncoder.encode(content),
    })),
  ];

  return buildZipFile(entries);
};

const downloadBlobFile = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const formatDateTime = (value: string) => new Date(value).toLocaleString('pt-BR');

const createWorkbookBlob = (sheets: WorksheetDefinition[], exportedAt: string) => {
  const workbookContent = buildWorkbookZip(sheets, exportedAt);
  const normalizedBuffer = new Uint8Array(workbookContent).buffer;
  return new Blob([normalizedBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
};

const buildScenarioSheets = (payload: StoreExportPayload): WorksheetDefinition[] => {
  const summaryRows: string[][] = [
    ['Loja', payload.store.name],
    ['Site', payload.store.site],
    ['Ambiente', payload.store.stage || 'Não informado'],
    ['Quantidade de cenários', `${payload.scenarios.length}`],
    ['Exportado em', formatDateTime(payload.exportedAt)],
  ];

  const scenarioRows: string[][] = [
    ['#', 'Título', 'Categoria', 'Automação', 'Criticidade', 'Observação', 'BDD'],
    ...payload.scenarios.map((scenario: StoreScenario, index: number) => [
      `${index + 1}`,
      scenario.title || '—',
      scenario.category || '—',
      scenario.automation || '—',
      scenario.criticality || '—',
      scenario.observation || '—',
      scenario.bdd || '—',
    ]),
  ];

  return [
    { name: 'Resumo', rows: summaryRows },
    { name: 'Cenários', rows: scenarioRows },
  ];
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const openScenarioPdf = (
  payload: StoreExportPayload,
  title: string,
  targetWindow?: Window | null,
) => {
  const printableWindow = targetWindow ?? window.open('', '_blank');

  if (!printableWindow) {
    throw new Error('Não foi possível abrir a visualização para exportar em PDF.');
  }

  const scenarioRows = payload.scenarios
    .map((scenario, index) => {
      const observation = scenario.observation?.trim() || '—';
      const bdd = scenario.bdd?.trim() || '—';

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(scenario.title || '—')}</td>
          <td>${escapeHtml(scenario.category || '—')}</td>
          <td>${escapeHtml(scenario.automation || '—')}</td>
          <td>${escapeHtml(scenario.criticality || '—')}</td>
          <td>${escapeHtml(observation)}</td>
          <td>${escapeHtml(bdd)}</td>
        </tr>
      `;
    })
    .join('');

  const content = `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 24px; }
          h1 { margin-bottom: 4px; }
          .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin: 16px 0; padding: 12px; background: #f5f7fb; border: 1px solid #e5e7eb; border-radius: 12px; }
          .summary-grid span { color: #6b7280; font-size: 12px; }
          .summary-grid strong { display: block; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #f9fafb; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <div class="summary-grid">
          <div>
            <span>Loja</span>
            <strong>${escapeHtml(payload.store.name)}</strong>
          </div>
          <div>
            <span>Site</span>
            <strong>${escapeHtml(payload.store.site || '—')}</strong>
          </div>
          <div>
            <span>Ambiente</span>
            <strong>${escapeHtml(payload.store.stage || 'Não informado')}</strong>
          </div>
          <div>
            <span>Quantidade de cenários</span>
            <strong>${payload.scenarios.length}</strong>
          </div>
          <div>
            <span>Exportado em</span>
            <strong>${escapeHtml(formatDateTime(payload.exportedAt))}</strong>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Título</th>
              <th>Categoria</th>
              <th>Automação</th>
              <th>Criticidade</th>
              <th>Observação</th>
              <th>BDD</th>
            </tr>
          </thead>
          <tbody>
            ${scenarioRows || `<tr><td colspan="7">Nenhum cenário cadastrado.</td></tr>`}
          </tbody>
        </table>
      </body>
    </html>
  `;

  printableWindow.document.open();
  printableWindow.document.write(content);
  printableWindow.document.close();
  printableWindow.focus();
  printableWindow.print();
};

export const downloadScenarioWorkbook = (payload: StoreExportPayload, fileName: string) => {
  const workbookBlob = createWorkbookBlob(
    buildScenarioSheets(payload),
    new Date(payload.exportedAt).toISOString(),
  );
  downloadBlobFile(workbookBlob, fileName);
};
