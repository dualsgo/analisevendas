
const delimiters = ["Email:", "E-mail:", "Telefone:", "ID PIX", ".::", ";", "ID:", "CPF:", "CNPJ:", "Endereço:", "Data:"];

function extractVendedor(infCpl) {
  if (!infCpl) return "VENDEDOR NÃO IDENTIFICADO";
  const vLabel = /Vendedor:|Vend:|Atendente:/i;
  const match = infCpl.match(vLabel);
  if (!match || match.index === undefined) return "VENDEDOR NÃO IDENTIFICADO";
  const startIdx = match.index + match[0].length;
  let candidate = infCpl.substring(startIdx).trim();
  
  let endIdx = candidate.length;
  for (const d of delimiters) {
    const dIdx = candidate.toUpperCase().indexOf(d.toUpperCase());
    if (dIdx !== -1 && dIdx < endIdx) endIdx = dIdx;
  }
  const multiSpace = candidate.match(/\s{2,}/);
  if (multiSpace && multiSpace.index !== undefined && multiSpace.index < endIdx) endIdx = multiSpace.index;
  return candidate.substring(0, endIdx).trim() || "VENDEDOR NÃO IDENTIFICADO";
}

const testCases = [
  "Vendedor: JOAO SILVA Email: joao@email.com",
  "Vend: MARIA SOUZA; ID: 123",
  "Atendente: PEDRO ALVES .:: Data: 10/10/2023",
  "Vendedor: CARLOS PEREIRA  12345", // Double space
  "Vendedor: ANA CLARA", // End of string
  "Note: Some other info", // No vendor
  "Vendedor:  MARCOS  ", // Extra spaces
  "Obs: Vendedor: LUCA Email: luca@email.com" // Embedded
];

testCases.forEach(tc => {
  console.log(`Input: "${tc}"\nResult: "${extractVendedor(tc)}"\n---`);
});
