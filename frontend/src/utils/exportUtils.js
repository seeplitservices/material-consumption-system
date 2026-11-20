/**
 * Multi-Format Export Utilities: CSV, Excel (.xlsx format data), and Print-to-PDF
 */

export function exportToCSV(filename, headers, rows) {
  if (!rows || !rows.length) {
    alert('No data available to export.');
    return;
  }

  const csvRows = [];
  // Header row
  csvRows.push(headers.map(h => `"${(h.label || h.key).replace(/"/g, '""')}"`).join(','));

  // Data rows
  for (const row of rows) {
    const values = headers.map(h => {
      const val = row[h.key] !== undefined && row[h.key] !== null ? row[h.key] : '';
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvString = csvRows.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToExcel(filename, headers, rows) {
  // Generates XML-based Excel (.xls/.xlsx compatible spreadsheet format)
  if (!rows || !rows.length) {
    alert('No data available to export.');
    return;
  }

  let table = '<table border="1"><thead><tr>';
  headers.forEach(h => {
    table += `<th style="background-color:#0284c7;color:#ffffff;font-weight:bold;">${h.label || h.key}</th>`;
  });
  table += '</tr></thead><tbody>';

  rows.forEach(r => {
    table += '<tr>';
    headers.forEach(h => {
      const val = r[h.key] !== undefined && r[h.key] !== null ? r[h.key] : '';
      table += `<td>${val}</td>`;
    });
    table += '</tr>';
  });
  table += '</tbody></table>';

  const blob = new Blob([table], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printPDFReport(title, headers, rows, summaryMetrics = null) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Pop-up blocked. Please allow pop-ups to print PDF reports.');
    return;
  }

  let summaryHtml = '';
  if (summaryMetrics) {
    summaryHtml = `
      <div style="display:flex;gap:16px;margin-bottom:20px;padding:12px;background:#f1f5f9;border-radius:6px;">
        ${Object.entries(summaryMetrics).map(([k, v]) => `
          <div>
            <div style="font-size:11px;color:#64748b;text-transform:uppercase;">${k.replace(/_/g, ' ')}</div>
            <div style="font-size:16px;font-weight:bold;color:#0f172a;">${v}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  let rowsHtml = '';
  rows.forEach((r, idx) => {
    rowsHtml += `<tr style="background:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">`;
    headers.forEach(h => {
      const val = r[h.key] !== undefined && r[h.key] !== null ? r[h.key] : '';
      rowsHtml += `<td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;">${val}</td>`;
    });
    rowsHtml += '</tr>';
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; }
          h1 { font-size: 20px; margin: 0 0 4px 0; color: #0284c7; }
          .meta { font-size: 12px; color: #64748b; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; text-align: left; }
          th { background: #0f172a; color: #ffffff; font-size: 11px; text-transform: uppercase; padding: 8px 10px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="meta">Generated: ${new Date().toLocaleString()} | Source: Google Sheets Master Ledger</div>
        ${summaryHtml}
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h.label || h.key}</th>`).join('')}</tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
