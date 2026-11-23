export interface ExportTableImageOptions {
  container: HTMLElement;
  fileName: string;
  title?: string;
  subtitle?: string;
}

interface ParsedCell {
  text: string;
  isHighlighted: boolean;
  isBold: boolean;
}

interface ParsedRow {
  isTotal: boolean;
  playerNumber: string;
  playerName: string;
  cells: ParsedCell[];
}

const drawRoundedRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

export const exportStatTableAsImage = async ({
  container,
  fileName,
  title,
  subtitle,
}: ExportTableImageOptions): Promise<void> => {
  if ((document as any).fonts?.ready) {
    try {
      await (document as any).fonts.ready;
    } catch {
      // Ignore font readiness failures and continue with fallback fonts
    }
  }

  const table = container.querySelector('table');
  if (!table) {
    throw new Error('Keine Statistiktabelle zum Exportieren gefunden.');
  }

  const headingEl = container.querySelector('h3');
  const resolvedTitle = title || headingEl?.textContent?.trim() || 'Statistiken';

  const headerCells = Array.from(table.querySelectorAll('thead tr th'));
  const headers = headerCells.map((th) => th.textContent?.trim() || '');
  if (headers.length === 0) {
    throw new Error('Tabellenkopf konnte nicht gelesen werden.');
  }

  const bodyRows = Array.from(table.querySelectorAll('tbody tr'));
  const parsedRows: ParsedRow[] = bodyRows.map((tr) => {
    const tds = Array.from(tr.querySelectorAll('td'));
    const firstTd = tds[0];
    const firstText = firstTd?.textContent?.trim() || '';
    const isTotal =
      firstText.toUpperCase() === 'TOTAL' || tr.className.includes('bg-gray-700');

    let playerNumber = '';
    let playerName = firstText;

    if (!isTotal && firstTd) {
      const numberEl = firstTd.querySelector('[data-export-role="player-number"]');
      const nameEl = firstTd.querySelector('[data-export-role="player-name"]');
      if (nameEl) {
        playerNumber = numberEl?.textContent?.trim() || '';
        playerName = nameEl.textContent?.trim() || '';
      } else {
        const spans = Array.from(firstTd.querySelectorAll('span'));
        if (spans.length >= 2) {
          playerNumber = spans[0].textContent?.trim() || '';
          playerName = spans[1].textContent?.trim() || '';
        } else if (spans.length === 1) {
          playerName = spans[0].textContent?.trim() || '';
        }
      }
    }

    const cells: ParsedCell[] = tds.slice(1).map((td) => ({
      text: td.textContent?.trim() || '',
      isHighlighted: td.className.includes('text-orange-400'),
      isBold: td.className.includes('font-bold'),
    }));

    return {
      isTotal,
      playerNumber,
      playerName,
      cells,
    };
  });

  const measureCanvas = document.createElement('canvas');
  const mCtx = measureCanvas.getContext('2d');
  if (!mCtx) {
    throw new Error('Canvas-Kontext konnte nicht initialisiert werden.');
  }

  const fontFamily = 'Roboto, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const monoFontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

  const titleFont = `700 21px ${fontFamily}`;
  const subtitleFont = `500 13px ${fontFamily}`;
  const headerFont = `600 13px ${fontFamily}`;
  const nameFont = `500 14px ${fontFamily}`;
  const numberFont = `500 12px ${monoFontFamily}`;
  const statFont = `400 14px ${fontFamily}`;
  const boldStatFont = `700 14px ${fontFamily}`;

  const colCount = headers.length;
  const colWidths = new Array<number>(colCount).fill(52);

  // Measure column 0 (Spieler)
  mCtx.font = headerFont;
  let maxCol0Width = mCtx.measureText(headers[0] || 'Spieler').width;
  const hasAnyNumber = parsedRows.some((r) => !r.isTotal && r.playerNumber !== '');
  const numberSlotWidth = hasAnyNumber ? 30 : 0;

  for (const row of parsedRows) {
    if (row.isTotal) {
      mCtx.font = boldStatFont;
      maxCol0Width = Math.max(maxCol0Width, mCtx.measureText(row.playerName || 'TOTAL').width);
    } else {
      mCtx.font = nameFont;
      const nameW = mCtx.measureText(row.playerName).width;
      let numW = 0;
      if (row.playerNumber) {
        mCtx.font = numberFont;
        numW = Math.max(22, mCtx.measureText(row.playerNumber).width + 10);
      } else {
        numW = numberSlotWidth;
      }
      maxCol0Width = Math.max(maxCol0Width, numW + nameW);
    }
  }
  colWidths[0] = Math.max(190, Math.ceil(maxCol0Width + 32));

  // Measure stat columns (1..colCount-1)
  for (let c = 1; c < colCount; c++) {
    mCtx.font = headerFont;
    let maxW = mCtx.measureText(headers[c]).width;
    mCtx.font = boldStatFont;
    for (const row of parsedRows) {
      const cell = row.cells[c - 1];
      if (cell) {
        maxW = Math.max(maxW, mCtx.measureText(cell.text).width);
      }
    }
    colWidths[c] = Math.max(50, Math.ceil(maxW + 22));
  }

  const outerPadding = 24;
  const headerBlockHeight = subtitle ? 58 : 38;
  const headerRowHeight = 44;
  const bodyRowHeight = 44;
  const totalRowHeight = 46;

  let tableWidth = colWidths.reduce((sum, w) => sum + w, 0);

  mCtx.font = titleFont;
  const titleW = mCtx.measureText(resolvedTitle).width;
  let subtitleW = 0;
  if (subtitle) {
    mCtx.font = subtitleFont;
    subtitleW = mCtx.measureText(subtitle).width;
  }
  const minWidthForHeading = Math.ceil(Math.max(titleW, subtitleW) + 8);
  if (minWidthForHeading > tableWidth) {
    colWidths[0] += minWidthForHeading - tableWidth;
    tableWidth = minWidthForHeading;
  }

  const normalRows = parsedRows.filter((r) => !r.isTotal);
  const totalRow = parsedRows.find((r) => r.isTotal);
  const tableHeight =
    headerRowHeight +
    normalRows.length * bodyRowHeight +
    (totalRow ? totalRowHeight : 0);

  const canvasWidth = outerPadding * 2 + tableWidth;
  const canvasHeight = outerPadding * 2 + headerBlockHeight + tableHeight;
  const scale = 2;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth * scale;
  canvas.height = canvasHeight * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas-Kontext konnte nicht erstellt werden.');
  }

  ctx.scale(scale, scale);

  // Outer card background (#1f2937 = Tailwind gray-800)
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Title & optional subtitle
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = titleFont;
  ctx.fillStyle = '#f9fafb';
  ctx.fillText(resolvedTitle, outerPadding, outerPadding + 13);

  if (subtitle) {
    ctx.font = subtitleFont;
    ctx.fillStyle = '#9ca3af';
    ctx.fillText(subtitle, outerPadding, outerPadding + 37);
  }

  const tableX = outerPadding;
  const tableY = outerPadding + headerBlockHeight;

  // Clip to rounded table rectangle
  ctx.save();
  drawRoundedRectPath(ctx, tableX, tableY, tableWidth, tableHeight, 8);
  ctx.clip();

  // Table base background
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(tableX, tableY, tableWidth, tableHeight);

  // Draw Header Row (#374151 = Tailwind gray-700)
  ctx.fillStyle = '#374151';
  ctx.fillRect(tableX, tableY, tableWidth, headerRowHeight);

  ctx.font = headerFont;
  ctx.fillStyle = '#d1d5db';
  ctx.textBaseline = 'middle';

  let curX = tableX;
  for (let c = 0; c < colCount; c++) {
    const colW = colWidths[c];
    const centerY = tableY + headerRowHeight / 2;
    if (c === 0) {
      ctx.textAlign = 'left';
      ctx.fillText(headers[c], curX + 14, centerY);
      // Column separator after Spieler
      ctx.fillStyle = '#4b5563';
      ctx.fillRect(curX + colW - 1, tableY, 1, headerRowHeight);
      ctx.fillStyle = '#d1d5db';
    } else {
      ctx.textAlign = 'center';
      ctx.fillText(headers[c], curX + colW / 2, centerY);
    }
    curX += colW;
  }

  // Draw Player Rows
  let curY = tableY + headerRowHeight;
  normalRows.forEach((row, idx) => {
    const rowBg = idx % 2 === 1 ? '#232f3e' : '#1f2937';
    ctx.fillStyle = rowBg;
    ctx.fillRect(tableX, curY, tableWidth, bodyRowHeight);

    const centerY = curY + bodyRowHeight / 2;
    let x = tableX;

    // Column 0: Player number + Player name
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const textStartX = x + 14;
    if (row.playerNumber) {
      ctx.font = numberFont;
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(row.playerNumber, textStartX, centerY);
      ctx.font = nameFont;
      ctx.fillStyle = '#f3f4f6';
      ctx.fillText(row.playerName, textStartX + numberSlotWidth, centerY);
    } else {
      ctx.font = nameFont;
      ctx.fillStyle = '#f3f4f6';
      ctx.fillText(row.playerName, textStartX + numberSlotWidth, centerY);
    }

    // Vertical divider after name column
    ctx.fillStyle = '#374151';
    ctx.fillRect(x + colWidths[0] - 1, curY, 1, bodyRowHeight);

    x += colWidths[0];

    // Stat columns
    for (let c = 1; c < colCount; c++) {
      const colW = colWidths[c];
      const cell = row.cells[c - 1];
      if (cell) {
        if (c === 2 && !cell.isHighlighted) {
          // Subtle tint on Points column like bg-gray-800/30
          ctx.fillStyle = 'rgba(17, 24, 39, 0.22)';
          ctx.fillRect(x, curY, colW, bodyRowHeight);
        }
        ctx.font = cell.isHighlighted || cell.isBold ? boldStatFont : statFont;
        ctx.fillStyle = cell.isHighlighted ? '#fb923c' : '#f3f4f6';
        ctx.textAlign = 'center';
        ctx.fillText(cell.text, x + colW / 2, centerY);
      }
      x += colW;
    }

    // Bottom row border
    ctx.fillStyle = '#374151';
    ctx.fillRect(tableX, curY + bodyRowHeight - 1, tableWidth, 1);

    curY += bodyRowHeight;
  });

  // Draw TOTAL Row
  if (totalRow) {
    ctx.fillStyle = '#374151';
    ctx.fillRect(tableX, curY, tableWidth, totalRowHeight);

    // Top thicker border
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(tableX, curY, tableWidth, 2);

    const centerY = curY + totalRowHeight / 2 + 1;
    let x = tableX;

    ctx.font = boldStatFont;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(totalRow.playerName || 'TOTAL', x + 14, centerY);

    ctx.fillStyle = '#4b5563';
    ctx.fillRect(x + colWidths[0] - 1, curY, 1, totalRowHeight);

    x += colWidths[0];

    for (let c = 1; c < colCount; c++) {
      const colW = colWidths[c];
      const cell = totalRow.cells[c - 1];
      if (cell) {
        ctx.font = boldStatFont;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(cell.text, x + colW / 2, centerY);
      }
      x += colW;
    }
  }

  ctx.restore();

  // Outer rounded border around table
  drawRoundedRectPath(ctx, tableX + 0.5, tableY + 0.5, tableWidth - 1, tableHeight - 1, 8);
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const link = document.createElement('a');
  link.download = fileName;
  link.href = canvas.toDataURL('image/png');
  link.click();
};
