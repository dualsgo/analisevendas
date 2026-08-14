const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

try {
  const filePath = path.join(__dirname, 'MAIS DIVERSÃO POR MENOS - CAMPANHA AGING.xlsx');
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet);
  
  // Transform to just the necessary fields if needed, or all.
  const transformed = data.map(row => ({
    codigo: row['COD-PRODUTO'],
    descricao: row['DESCRIÇÃO'],
    categoria: row['CATEGORIA'],
    fornecedor: row['FORNECEDOR']
  }));

  const outDir = path.join(__dirname, 'src', 'data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'aging-campaign.json');
  fs.writeFileSync(outPath, JSON.stringify(transformed, null, 2), 'utf-8');
  console.log('Successfully wrote to', outPath);
} catch (e) {
  console.error("ERROR:", e);
}
