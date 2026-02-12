
export function exportToCsv(filename: string, rows: any[], headers: string[]) {
  const csvContent = [
    headers.join(";"),
    ...rows.map(row => headers.map(header => {
      const val = row[header];
      return typeof val === 'string' && val.includes(';') ? `"${val}"` : val;
    }).join(";"))
  ].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
