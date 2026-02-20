
import { DetailedSaleRow, Item } from "./types";

// Faixas de desconto padrão Ri Happy para identificação de estratégia
const ADICIONAL_PERCENT_MIN = 0.08;
const ADICIONAL_PERCENT_MAX = 0.12;
const MOSTRUARIO_PERCENT_MIN = 0.045;
const MOSTRUARIO_PERCENT_MAX = 0.055;

function dec(s: string | null | undefined): number {
  if (!s) return 0;
  const cleanS = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const num = parseFloat(cleanS);
  return isNaN(num) ? 0 : num;
}

const delimiters = ["Email:", "E-mail:", "Telefone:", "ID PIX", ".::", ";", "ID:", "CPF:", "CNPJ:", "Endereço:", "Data:", "Op:", "Mat:"];

function extractVendedor(infCpl: string): string {
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
  const multiSpace = candidate.match(/\s{2,}/);
  if (multiSpace && multiSpace.index !== undefined && multiSpace.index < endIdx) endIdx = multiSpace.index;

  let result = candidate.substring(0, endIdx).trim();

  const trailingIdMatch = result.match(/\s+\d+$/);
  if (trailingIdMatch && trailingIdMatch.index) {
    result = result.substring(0, trailingIdMatch.index);
  }

  return result || "VENDEDOR NÃO IDENTIFICADO";
}

export function parseXml(xmlString: string): DetailedSaleRow | null {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");

    if (xmlDoc.getElementsByTagName("procEventoNFe").length > 0 || xmlDoc.getElementsByTagName("retCancNFe").length > 0) {
      return {
        is_cancelada: true,
        chave: (xmlDoc.getElementsByTagName("chNFe")[0]?.textContent || "DESC"),
        nf: "CANCELADA",
        dhEmi: "", vendedor: "", tpNF: 1, finNFe: 1, natOp: "CANCELAMENTO",
        canal: "CANCELADA", subcanal: "", canal_consolidado: "CANCELADA",
        is_adicional: false, is_adicional_suspeito: false, motivo_adicional: "",
        vNF: "0.00", itens_qtd: "0", desconto_total: "0.00", percentual_desconto: "0.00",
        is_troca: false, vTroca: "0.00", dif_troca: "0.00", is_devolucao: false,
        refNFe: [], refNFe_normalizadas: [], is_retirada_online: false, vTroco: "0.00",
        is_presencial_por_troco: false, tpIntegra: "", tem_desconto: false, tipo_desconto: "",
        status_auditoria: "", cep_dest: "", cep_loja: "", is_cep_diferente_da_loja: false,
        is_endereco_real: false, cpf_cnpj_dest: "", nome_dest: "", endereco_dest: "",
        tem_destinatario: false, itens: [], serie: "", modelo: "", pickup_match_fields: 0
      };
    }

    if (!xmlDoc.documentElement || xmlDoc.getElementsByTagName("parsererror").length > 0) return null;

    const root = xmlDoc.documentElement;
    const ns = root.getAttribute("xmlns") || "";
    const getElement = (p: Element | Document | null, n: string): Element | null => {
      if (!p) return null;
      const parent = p instanceof Document ? p.documentElement : p;
      return (ns ? parent.getElementsByTagNameNS(ns, n) : parent.getElementsByTagName(n))[0] || null;
    };
    const getElements = (p: Element | Document | null, n: string): Element[] => {
      if (!p) return [];
      const parent = p instanceof Document ? p.documentElement : p;
      return Array.from(ns ? parent.getElementsByTagNameNS(ns, n) : parent.getElementsByTagName(n));
    };

    const infNFe = getElement(xmlDoc, "infNFe");
    if (!infNFe) return null;
    const ide = getElement(infNFe, "ide");
    if (!ide) return null;

    const chave = infNFe.getAttribute("Id")?.replace("NFe", "") || "";
    const nf = getElement(ide, "nNF")?.textContent || "";
    const tpNF = parseInt(getElement(ide, "tpNF")?.textContent || "1");
    const finNFe = parseInt(getElement(ide, "finNFe")?.textContent || "1");
    const natOp = getElement(ide, "natOp")?.textContent || "";
    const dhEmi = getElement(ide, "dhEmi")?.textContent || "";

    const dest = getElement(infNFe, "dest");
    const cpf_cnpj = dest ? (getElement(dest, "CPF")?.textContent || getElement(dest, "CNPJ")?.textContent || "") : "";
    const nome_dest = dest ? (getElement(dest, "xNome")?.textContent || "") : "";
    const enderDest = dest ? getElement(dest, "enderDest") : null;
    const cep_dest = enderDest ? (getElement(enderDest, "CEP")?.textContent || "").replace(/\D/g, "") : "";

    const emit = getElement(infNFe, "emit");
    const enderEmit = emit ? getElement(emit, "enderEmit") : null;
    const cep_loja = enderEmit ? (getElement(enderEmit, "CEP")?.textContent || "").replace(/\D/g, "") : "";

    const xNomeEmit = emit ? getElement(emit, "xNome")?.textContent || "" : "";
    const cnpjEmit = emit ? getElement(emit, "CNPJ")?.textContent || "" : "";
    const ieEmit = emit ? getElement(emit, "IE")?.textContent || "" : "";
    const enderEmitFull = enderEmit ? `${getElement(enderEmit, "xLgr")?.textContent}, ${getElement(enderEmit, "nro")?.textContent} - ${getElement(enderEmit, "xBairro")?.textContent}` : "";

    const total = getElement(infNFe, "total");
    const icmsTot = total ? getElement(total, "ICMSTot") : null;
    const vNFValue = icmsTot ? dec(getElement(icmsTot, "vNF")?.textContent) : 0;

    const itemsList: Item[] = [];
    
    // REGRAS ROBUSTAS DE CAMPANHA (LEVE X PAGUE Y)
    const LIMITE_QUASE_GRATIS = 0.10; // Itens saindo por até 10 centavos
    const LIMITE_RESIDUO = 0.10;      // Descontos de até 10 centavos (arredondamento)
    const UNIT_BRUTO_MIN = 1.00;      // Ignora produtos que já custam menos de 1 real originalmente
    
    let nearFreeCount = 0;
    let residualCount = 0;
    const itemsForValidation: Array<{ unitBruto: number, vDesc: number, qCom: number }> = [];

    getElements(infNFe, "det").forEach(det => {
      const prod = getElement(det, "prod");
      if (prod) {
        const vProd = dec(getElement(prod, "vProd")?.textContent);
        const vDesc = dec(getElement(prod, "vDesc")?.textContent);
        const qCom = dec(getElement(prod, "qCom")?.textContent);
        
        const unitBruto = vProd / qCom;
        const unitPriceFinal = (vProd - vDesc) / qCom;
        const unitDiscount = vDesc / qCom;

        if (unitBruto > UNIT_BRUTO_MIN) {
          // Sinal A: Item quase grátis (ex: saiu por 0,01 ou 0,02 ou 0,05)
          const isNearFree = unitPriceFinal <= LIMITE_QUASE_GRATIS;
          
          // Sinal C: Item com resíduo de ajuste (ex: desconto de 0,01 ou preço final de 0,03)
          const isResidual = (unitDiscount > 0 && unitDiscount <= LIMITE_RESIDUO) || 
                            (unitPriceFinal > 0 && unitPriceFinal <= LIMITE_RESIDUO);
          
          if (isNearFree) nearFreeCount++;
          if (isResidual) residualCount++;
        }

        itemsForValidation.push({ unitBruto, vDesc, qCom });

        itemsList.push({
          cProd: getElement(prod, "cProd")?.textContent || "",
          xProd: getElement(prod, "xProd")?.textContent || "",
          qCom,
          vProd,
          vDesc,
          is_campanha: false
        });
      }
    });

    // VALIDAÇÃO AGREGADA DE CAMPANHA
    let isCampanhaNota = false;
    
    // Regra de decisão inicial baseada em sinais combinados
    // Campanha típica: pelo menos 1 item grátis E (algum ajuste residual OU mais de 1 item grátis)
    const isCandidate = nearFreeCount >= 1 && (residualCount >= 1 || nearFreeCount >= 2);

    if (isCandidate) {
      // Clusterização: Agrupar itens por faixa de preço bruto aproximado (tolerância de R$ 0.50)
      const sortedByPrice = [...itemsForValidation].sort((a, b) => a.unitBruto - b.unitBruto);
      const groups: Array<typeof itemsForValidation> = [];
      
      if (sortedByPrice.length > 0) {
        let currentGroup = [sortedByPrice[0]];
        for (let i = 1; i < sortedByPrice.length; i++) {
          if (Math.abs(sortedByPrice[i].unitBruto - sortedByPrice[i-1].unitBruto) <= 0.50) {
            currentGroup.push(sortedByPrice[i]);
          } else {
            groups.push(currentGroup);
            currentGroup = [sortedByPrice[i]];
          }
        }
        groups.push(currentGroup);
      }

      // Validação do Múltiplo Inteiro: Verifica se o desconto total do grupo equivale a "k" itens grátis
      for (const group of groups) {
        const groupTotalDesc = group.reduce((acc, it) => acc + it.vDesc, 0);
        // Preço típico do grupo (média)
        const groupAvgPrice = group.reduce((acc, it) => acc + it.unitBruto, 0) / group.length;
        
        if (groupAvgPrice > UNIT_BRUTO_MIN) {
          const k = Math.round(groupTotalDesc / groupAvgPrice);
          const tol = Math.max(0.10, k * 0.25); // Tolerância para diluição entre itens no ERP
          
          if (k >= 1 && Math.abs(groupTotalDesc - k * groupAvgPrice) <= tol) {
            isCampanhaNota = true;
            break;
          }
        }
      }
    }

    if (isCampanhaNota) {
      itemsList.forEach(item => { item.is_campanha = true; });
    }

    const pagamentosDet: Array<{ tPag: string, vPag: number, tpIntegra?: string }> = [];
    let vTrocoPag = 0;
    let tpIntegraValue = "";
    const pag = getElement(infNFe, "pag");
    if (pag) {
      vTrocoPag = dec(getElement(pag, "vTroco")?.textContent);
      getElements(pag, "detPag").forEach(detPag => {
        const tPag = getElement(detPag, "tPag")?.textContent || "";
        const vPag = dec(getElement(detPag, "vPag")?.textContent);
        const card = getElement(detPag, "card");
        const tpInt = card ? getElement(card, "tpIntegra")?.textContent || "" : undefined;
        pagamentosDet.push({ tPag, vPag, tpIntegra: tpInt });
        if (tpInt) tpIntegraValue = tpInt;
      });
    }

    const protNFe = getElement(xmlDoc, "protNFe");
    const infProt = protNFe ? getElement(protNFe, "infProt") : null;
    const protocoloData = infProt ? {
      nProt: getElement(infProt, "nProt")?.textContent || "",
      dhRecbto: getElement(infProt, "dhRecbto")?.textContent || "",
      cStat: getElement(infProt, "cStat")?.textContent || "",
      xMotivo: getElement(infProt, "xMotivo")?.textContent || ""
    } : undefined;

    const refNFes: string[] = [];
    getElements(ide, "NFref").forEach(ref => {
      const r = getElement(ref, "refNFe")?.textContent;
      if (r) refNFes.push(r);
    });

    const infAdic = getElement(infNFe, "infAdic");
    const infCpl = infAdic ? (getElement(infAdic, "infCpl")?.textContent || "") : "";
    const vendedor = extractVendedor(infCpl);

    let pickup_score = 0;
    if (tpIntegraValue === "2") pickup_score++;
    if (vTrocoPag === 0) pickup_score++;
    if (pagamentosDet.every(p => p.tPag !== "01")) pickup_score++;
    if (/[a-z]/.test(nome_dest)) pickup_score++;
    if (vendedor === "VENDEDOR NÃO IDENTIFICADO" || /SITE|ECOMM|INT|POS/i.test(vendedor)) pickup_score++;

    const isRetiradaOnline = pickup_score >= 3;
    const vTrocaCredito = pagamentosDet.filter(p => p.tPag === "05").reduce((acc, p) => acc + p.vPag, 0);
    const isTroca = vTrocaCredito > 0;
    const difTroca = vNFValue - vTrocaCredito;

    const valorTotalProds = itemsList.reduce((acc, it) => acc + it.vProd, 0);
    const descontoTotal = itemsList.reduce((acc, it) => acc + it.vDesc, 0);
    const percentualDesconto = valorTotalProds > 0 ? (descontoTotal / valorTotalProds) : 0;

    const isAdicionalDoc = percentualDesconto >= ADICIONAL_PERCENT_MIN && percentualDesconto <= ADICIONAL_PERCENT_MAX;
    const isMostruario = percentualDesconto >= MOSTRUARIO_PERCENT_MIN && percentualDesconto <= MOSTRUARIO_PERCENT_MAX;

    const isDevolucao = tpNF === 0 && (finNFe === 4 || natOp.toLowerCase().includes("devolucao"));

    let tipoDescontoFinal = "PADRÃO";
    if (isCampanhaNota) tipoDescontoFinal = "CAMPANHA";
    else if (isAdicionalDoc) tipoDescontoFinal = "ADICIONAL";
    else if (isMostruario) tipoDescontoFinal = "MOSTRUÁRIO";

    return {
      chave, nf, serie: getElement(ide, "serie")?.textContent || "", modelo: getElement(ide, "mod")?.textContent || "", dhEmi, vendedor,
      tpNF, finNFe, natOp,
      canal: isTroca ? "TROCA" : (isRetiradaOnline ? "RETIRADA_ONLINE" : "LOJA_FISICA"),
      subcanal: "", canal_consolidado: isTroca ? "TROCA" : (isRetiradaOnline ? "RETIRADA_ONLINE" : "VENDA_LOJA"),
      is_adicional: isAdicionalDoc && !isCampanhaNota, is_adicional_suspeito: false, motivo_adicional: isAdicionalDoc ? "DESCONTO PADRÃO ADICIONAL" : "",
      vNF: vNFValue.toFixed(2), itens_qtd: itemsList.reduce((acc, it) => acc + it.qCom, 0).toString(),
      desconto_total: descontoTotal.toFixed(2), percentual_desconto: percentualDesconto.toFixed(4),
      is_troca: isTroca, vTroca: vTrocaCredito.toFixed(2), dif_troca: difTroca.toFixed(2),
      is_devolucao: isDevolucao, refNFe: refNFes, refNFe_normalizadas: refNFes.map(r => r.replace(/\D/g, "")),
      is_retirada_online: isRetiradaOnline, vTroco: vTrocoPag.toFixed(2), is_presencial_por_troco: !isRetiradaOnline, tpIntegra: tpIntegraValue,
      tem_desconto: descontoTotal > 0, tipo_desconto: tipoDescontoFinal,
      status_auditoria: isCampanhaNota ? "CAMPANHA IDENTIFICADA" : (isAdicionalDoc ? "AGUARDANDO VÍNCULO" : (descontoTotal > 0 ? "DESCONTO APLICADO" : "SEM DESCONTO")),
      cep_dest, cep_loja, is_cep_diferente_da_loja: !!cep_dest && cep_dest !== cep_loja,
      is_endereco_real: !!cep_dest, cpf_cnpj_dest: cpf_cnpj, nome_dest, endereco_dest: "", tem_destinatario: !!cpf_cnpj,
      itens: itemsList,
      is_cancelada: false,
      emitente: { xNome: xNomeEmit, cnpj: cnpjEmit, ie: ieEmit, endereco: enderEmitFull },
      protocolo: protocoloData,
      pagamentos_detalhe: pagamentosDet,
      infCpl,
      pickup_match_fields: pickup_score
    };
  } catch (e) {
    return null;
  }
}
