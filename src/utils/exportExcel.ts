import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export type EnvironmentExportRow = {
  titulo: string;
  categoria: string;
  criticidade: string;
  observacao?: string;
  statusMobile: string;
  statusDesktop: string;
  evidencia?: string;
};

export type EnvironmentBugExportRow = {
  cenario: string;
  severidade: string;
  prioridade: string;
  resultadoAtual: string;
};

export type ScenarioExportRow = {
  titulo: string;
  categoria: string;
  automacao: string;
  criticidade: string;
  observacao?: string;
  bdd?: string;
};

export type ExportInfoRow = {
  label: string;
  value: string;
};

const COLORS = {
  headerBg: '1F3A5F',
  headerText: 'FFFFFF',
  border: '2B3B55',

  greenBg: '0E5A3A',
  greenText: 'D7FFE9',

  orangeBg: '7C2D12',
  orangeText: 'FFEDD5',

  redBg: '6B1F2A',
  redText: 'FFD6DC',

  yellowBg: '6B5A1F',
  yellowText: 'FFF2C7',

  grayBg: '3A3F4B',
  grayText: 'E6E6E6',
};

const normalize = (value: string) => (value ?? '').trim().toLowerCase();

const applyBorder = (cell: ExcelJS.Cell) => {
  cell.border = {
    top: { style: 'thin', color: { argb: COLORS.border } },
    left: { style: 'thin', color: { argb: COLORS.border } },
    bottom: { style: 'thin', color: { argb: COLORS.border } },
    right: { style: 'thin', color: { argb: COLORS.border } },
  };
};

const applyHeaderStyle = (cell: ExcelJS.Cell) => {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
  cell.font = { bold: true, color: { argb: COLORS.headerText } };
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
  applyBorder(cell);
};

const applyBaseCellStyle = (cell: ExcelJS.Cell) => {
  cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: false };
  applyBorder(cell);
};

const stylePill = (cell: ExcelJS.Cell, bg: string, fg: string) => {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
  cell.font = { bold: true, color: { argb: fg } };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  applyBorder(cell);
};

const statusStyle = (status: string) => {
  const normalized = normalize(status);
  if (normalized.includes('conclu') || normalized.includes('complete')) {
    return { bg: COLORS.greenBg, fg: COLORS.greenText };
  }
  if (normalized.includes('andamento') || normalized.includes('progress')) {
    return { bg: COLORS.yellowBg, fg: COLORS.yellowText };
  }
  if (
    normalized.includes('pend') ||
    normalized.includes('bloq') ||
    normalized.includes('erro') ||
    normalized.includes('block') ||
    normalized.includes('fail')
  ) {
    return { bg: COLORS.redBg, fg: COLORS.redText };
  }
  return { bg: COLORS.grayBg, fg: COLORS.grayText };
};

const criticidadeStyle = (criticality: string) => {
  const normalized = normalize(criticality);
  if (normalized.includes('baixa') || normalized.includes('low')) {
    return { bg: COLORS.greenBg, fg: COLORS.greenText };
  }
  if (
    normalized.includes('média') ||
    normalized.includes('media') ||
    normalized.includes('medium')
  ) {
    return { bg: COLORS.yellowBg, fg: COLORS.yellowText };
  }
  if (normalized.includes('alta') || normalized.includes('high')) {
    return { bg: COLORS.redBg, fg: COLORS.redText };
  }
  return { bg: COLORS.grayBg, fg: COLORS.grayText };
};

const severityStyle = (severity: string) => {
  const normalized = normalize(severity);
  if (normalized.includes('crit') || normalized.includes('critical')) {
    return { bg: COLORS.redBg, fg: COLORS.redText };
  }
  if (normalized.includes('alta') || normalized.includes('high')) {
    return { bg: COLORS.orangeBg, fg: COLORS.orangeText };
  }
  if (
    normalized.includes('média') ||
    normalized.includes('media') ||
    normalized.includes('medium')
  ) {
    return { bg: COLORS.yellowBg, fg: COLORS.yellowText };
  }
  if (normalized.includes('baixa') || normalized.includes('low')) {
    return { bg: COLORS.greenBg, fg: COLORS.greenText };
  }
  return { bg: COLORS.grayBg, fg: COLORS.grayText };
};

const calcColWidth = (values: Array<string | undefined>, min = 18, max = 90) => {
  const longest = values.reduce((maxValue, value) => {
    return Math.max(maxValue, String(value ?? '').length);
  }, 0);
  return Math.min(max, Math.max(min, Math.ceil(longest * 1.1)));
};

const calcRowHeightByWrap = (
  _rowValues: Array<string | undefined>,
  _colWidths: number[],
  base = 20,
) => base;

const applyColumnWidths = (
  worksheet: ExcelJS.Worksheet,
  columnsValues: Array<Array<string | undefined>>,
) => {
  const columnWidths = columnsValues.map((values) => calcColWidth(values));
  worksheet.columns.forEach((column, index) => {
    column.width = columnWidths[index];
  });
  return columnWidths;
};

const applyAutoRowHeights = (
  worksheet: ExcelJS.Worksheet,
  columnWidths: number[],
  startRow = 2,
) => {
  for (let rowIndex = startRow; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    const rowValues = worksheet.columns.map((column) =>
      String(row.getCell(column.number).value ?? ''),
    );
    row.height = calcRowHeightByWrap(rowValues, columnWidths);
  }
};

const buildInfoSheet = (
  workbook: ExcelJS.Workbook,
  sheetName: string,
  headerLabels: [string, string],
  rows: ExportInfoRow[],
) => {
  const worksheet = workbook.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });

  worksheet.columns = [
    { header: headerLabels[0], key: 'label' },
    { header: headerLabels[1], key: 'value' },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell((cell) => applyHeaderStyle(cell));

  rows.forEach((row) => worksheet.addRow(row));

  for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    row.eachCell((cell) => applyBaseCellStyle(cell));
  }

  const columnValues = [
    [headerLabels[0], ...rows.map((row) => row.label)],
    [headerLabels[1], ...rows.map((row) => row.value)],
  ];
  const columnWidths = applyColumnWidths(worksheet, columnValues);
  applyAutoRowHeights(worksheet, columnWidths);
};

export const exportEnvironmentExcel = async ({
  fileName,
  scenarioSheetName,
  environmentSheetName,
  bugSheetName,
  infoHeaderLabels,
  infoRows,
  scenarioRows,
  scenarioHeaderLabels,
  bugRows,
  bugHeaderLabels,
}: {
  fileName: string;
  scenarioSheetName: string;
  environmentSheetName: string;
  bugSheetName: string;
  infoHeaderLabels: [string, string];
  infoRows: ExportInfoRow[];
  scenarioRows: EnvironmentExportRow[];
  scenarioHeaderLabels: [string, string, string, string, string, string, string];
  bugRows: EnvironmentBugExportRow[];
  bugHeaderLabels: [string, string, string, string];
}) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(environmentSheetName);

  const totalColumns = 7;
  worksheet.columns = [
    { header: scenarioHeaderLabels[0], key: 'titulo' },
    { header: scenarioHeaderLabels[1], key: 'categoria' },
    { header: scenarioHeaderLabels[2], key: 'criticidade' },
    { header: scenarioHeaderLabels[3], key: 'observacao' },
    { header: scenarioHeaderLabels[4], key: 'statusMobile' },
    { header: scenarioHeaderLabels[5], key: 'statusDesktop' },
    { header: scenarioHeaderLabels[6], key: 'evidencia' },
  ];

  const addSectionTitle = (title: string) => {
    const row = worksheet.addRow([title]);
    worksheet.mergeCells(row.number, 1, row.number, totalColumns);
    const cell = row.getCell(1);
    applyHeaderStyle(cell);
    row.height = 22;
  };

  const infoHeaderRow = worksheet.addRow([infoHeaderLabels[0], infoHeaderLabels[1]]);
  infoHeaderRow.height = 22;
  applyHeaderStyle(infoHeaderRow.getCell(1));
  applyHeaderStyle(infoHeaderRow.getCell(2));

  infoRows.forEach((row) => {
    const infoRow = worksheet.addRow([row.label, row.value]);
    infoRow.eachCell((cell) => applyBaseCellStyle(cell));
  });

  worksheet.addRow([]);
  addSectionTitle(scenarioSheetName);

  const scenarioHeaderRow = worksheet.addRow(scenarioHeaderLabels);
  scenarioHeaderRow.height = 22;
  scenarioHeaderRow.eachCell((cell) => applyHeaderStyle(cell));

  scenarioRows.forEach((row) => {
    worksheet.addRow([
      row.titulo,
      row.categoria,
      row.criticidade,
      row.observacao ?? '',
      row.statusMobile,
      row.statusDesktop,
      row.evidencia ?? '',
    ]);
  });

  const scenarioStartRow = scenarioHeaderRow.number + 1;
  for (let rowIndex = scenarioStartRow; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    row.eachCell((cell) => applyBaseCellStyle(cell));

    const criticalityCell = row.getCell(3);
    const criticality = criticidadeStyle(String(criticalityCell.value ?? ''));
    stylePill(criticalityCell, criticality.bg, criticality.fg);

    const statusMobileCell = row.getCell(5);
    const statusMobile = statusStyle(String(statusMobileCell.value ?? ''));
    stylePill(statusMobileCell, statusMobile.bg, statusMobile.fg);

    const statusDesktopCell = row.getCell(6);
    const statusDesktop = statusStyle(String(statusDesktopCell.value ?? ''));
    stylePill(statusDesktopCell, statusDesktop.bg, statusDesktop.fg);
  }

  if (bugRows.length > 0) {
    worksheet.addRow([]);
    addSectionTitle(bugSheetName);

    const bugHeaderRow = worksheet.addRow(bugHeaderLabels);
    bugHeaderRow.height = 22;
    bugHeaderRow.eachCell((cell) => applyHeaderStyle(cell));

    bugRows.forEach((row) => {
      worksheet.addRow([row.cenario, row.severidade, row.prioridade, row.resultadoAtual]);
    });

    const bugStartRow = bugHeaderRow.number + 1;
    for (let rowIndex = bugStartRow; rowIndex <= worksheet.rowCount; rowIndex += 1) {
      const row = worksheet.getRow(rowIndex);
      row.eachCell((cell) => applyBaseCellStyle(cell));

      const severityCell = row.getCell(2);
      const severity = severityStyle(String(severityCell.value ?? ''));
      stylePill(severityCell, severity.bg, severity.fg);
    }
  }

  const columnValues = [
    [infoHeaderLabels[0], ...infoRows.map((row) => row.label), scenarioHeaderLabels[0]],
    [infoHeaderLabels[1], ...infoRows.map((row) => row.value), scenarioHeaderLabels[1]],
    [scenarioHeaderLabels[2], ...scenarioRows.map((row) => row.criticidade)],
    [scenarioHeaderLabels[3], ...scenarioRows.map((row) => row.observacao ?? '')],
    [scenarioHeaderLabels[4], ...scenarioRows.map((row) => row.statusMobile)],
    [scenarioHeaderLabels[5], ...scenarioRows.map((row) => row.statusDesktop)],
    [scenarioHeaderLabels[6], ...scenarioRows.map((row) => row.evidencia ?? '')],
  ];

  if (bugRows.length > 0) {
    columnValues[0].push(bugHeaderLabels[0], ...bugRows.map((row) => row.cenario));
    columnValues[1].push(bugHeaderLabels[1], ...bugRows.map((row) => row.severidade));
    columnValues[2].push(bugHeaderLabels[2], ...bugRows.map((row) => row.prioridade));
    columnValues[3].push(bugHeaderLabels[3], ...bugRows.map((row) => row.resultadoAtual));
  }

  const columnWidths = applyColumnWidths(worksheet, columnValues);
  applyAutoRowHeights(worksheet, columnWidths, 2);

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), fileName);
};

export const exportScenarioExcel = async ({
  fileName,
  scenarioSheetName,
  infoSheetName,
  infoHeaderLabels,
  infoRows,
  scenarioRows,
  scenarioHeaderLabels,
}: {
  fileName: string;
  scenarioSheetName: string;
  infoSheetName: string;
  infoHeaderLabels: [string, string];
  infoRows: ExportInfoRow[];
  scenarioRows: ScenarioExportRow[];
  scenarioHeaderLabels: [string, string, string, string, string, string];
}) => {
  const workbook = new ExcelJS.Workbook();

  buildInfoSheet(workbook, infoSheetName, infoHeaderLabels, infoRows);

  const worksheet = workbook.addWorksheet(scenarioSheetName, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  worksheet.columns = [
    { header: scenarioHeaderLabels[0], key: 'titulo' },
    { header: scenarioHeaderLabels[1], key: 'categoria' },
    { header: scenarioHeaderLabels[2], key: 'automacao' },
    { header: scenarioHeaderLabels[3], key: 'criticidade' },
    { header: scenarioHeaderLabels[4], key: 'observacao' },
    { header: scenarioHeaderLabels[5], key: 'bdd' },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell((cell) => applyHeaderStyle(cell));

  scenarioRows.forEach((row) => worksheet.addRow(row));

  for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    row.eachCell((cell) => applyBaseCellStyle(cell));

    const criticalityCell = row.getCell(4);
    const criticality = criticidadeStyle(String(criticalityCell.value ?? ''));
    stylePill(criticalityCell, criticality.bg, criticality.fg);
  }

  const columnValues = [
    [worksheet.getColumn(1).header as string, ...scenarioRows.map((row) => row.titulo)],
    [worksheet.getColumn(2).header as string, ...scenarioRows.map((row) => row.categoria)],
    [worksheet.getColumn(3).header as string, ...scenarioRows.map((row) => row.automacao)],
    [worksheet.getColumn(4).header as string, ...scenarioRows.map((row) => row.criticidade)],
    [worksheet.getColumn(5).header as string, ...scenarioRows.map((row) => row.observacao ?? '')],
    [worksheet.getColumn(6).header as string, ...scenarioRows.map((row) => row.bdd ?? '')],
  ];
  const columnWidths = applyColumnWidths(worksheet, columnValues);
  applyAutoRowHeights(worksheet, columnWidths);

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), fileName);
};
