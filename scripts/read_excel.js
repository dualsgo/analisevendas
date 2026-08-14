const xlsx = require('xlsx');
const path = require('path');

try {
  const filePath = path.join(__dirname, 'MAIS DIVERSÃO POR MENOS - CAMPANHA AGING.xlsx');
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet);
  
  console.log("FIRST 5 ROWS:", data.slice(0, 5));
  console.log("TOTAL ROWS:", data.length);
  
  // Extract codes, let's just log the keys of the first row to know what column name is the code
  if (data.length > 0) {
    console.log("COLUMNS:", Object.keys(data[0]));
  }
} catch (e) {
  console.error("ERROR:", e);
}
