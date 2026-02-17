
const delimiters = ["Email:", "E-mail:", "Telefone:", "ID PIX", ".::", ";", "ID:", "CPF:", "CNPJ:", "Endereço:", "Data:", "Op:", "Mat:"];

function extractVendedor(infCpl) {
  if (!infCpl) return "VENDEDOR NÃO IDENTIFICADO";
  const vLabel = /Vendedor:|Vend:|Atendente:|Op:|Operador:/i;
  const match = infCpl.match(vLabel);
  if (!match || match.index === undefined) return "VENDEDOR NÃO IDENTIFICADO";
  const startIdx = match.index + match[0].length;
  let candidate = infCpl.substring(startIdx).trim();
  
  let endIdx = candidate.length;
  for (const d of delimiters) {
    const dIdx = candidate.toUpperCase().indexOf(d.toUpperCase());
    if (dIdx !== -1 && dIdx < endIdx) endIdx = dIdx;
  }
  
  // Regex for "Name ID" pattern (Name followed by numbers at the end)
  // But be careful not to cut off "Address 123" if that was the name (unlikely for a person)
  
  const multiSpace = candidate.match(/\s{2,}/);
  if (multiSpace && multiSpace.index !== undefined && multiSpace.index < endIdx) endIdx = multiSpace.index;
  
  let result = candidate.substring(0, endIdx).trim();
  
  // Heuristic: if results ends with digits, and there is a space before them, maybe it's an ID
  // e.g. "JOAO SILVA 12345" -> "JOAO SILVA"
  const trailingIdMatch = result.match(/\s+\d+$/);
  if (trailingIdMatch && trailingIdMatch.index) {
     result = result.substring(0, trailingIdMatch.index);
  }

  return result || "VENDEDOR NÃO IDENTIFICADO";
}

const testCases = [
  "Vendedor: JOAO SILVA 12345", // Single space, trailing ID
  "Vendedor: MARIA 123", 
  "Op: PEDRO",
  "Operador: ANA",
  "Vendedor: 123 - CARLOS", // ID at start? logic currently takes everything after ":"
  "Vend: LUCAS Email: ...",
  "Vendedor: JULIA"
];

testCases.forEach(tc => {
  console.log(`Input: "${tc}"\nResult: "${extractVendedor(tc)}"\n---`);
});
