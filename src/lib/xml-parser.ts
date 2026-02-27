
import { DetailedSaleRow, Item } from "./types";

// Parâmetros para detecção robusta de campanhas (Leve X Pague Y)
const NEAR_FREE_MAX = 0.10;
const RESIDUAL_MAX = 0.10;
const UNIT_BRUTO_MIN = 1.00;

// Parâmetros para detecção de Correção de Preço Errado (Psicológico)
const MIN_DESC_CENTS_MATERIAL = 100;
const STANDARD_PERCENTS = [0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.40, 0.50];

function dec(s: string | null | undefined): number {
  if (!s) return 0;
  const cleanS = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const num = parseFloat(cleanS);
  return isNaN(num) ? 0 : num;
}

const delimiters = ["Email:", "E-mail:", "Telefone:", "ID PIX", ".::", ";", "ID:", "CPF:", "CNPJ:", "Endereço:", "Data:", "Op:", "Mat:"];

function extractVendedor(infCpl: string): string {
  if (!infCpl) return "COLABORADOR NÃO IDENTIFICADO";
  const vLabel = /Vendedor:|Vend:|Atendente:|Op:|Operador:/i;
  const match = infCpl.match(vLabel);
  if (!match || match.index === undefined) return "COLABORADOR NÃO IDENTIFICADO";
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

  // CONSOLIDAÇÃO DE IDENTIDADES (CONFORME SOLICITADO)
  const normalized = result.toUpperCase().trim();
  if (normalized === "LIDIANE B" || normalized === "BARBOSA") return "BARBOSA";
  if (normalized === "LIDIANE" || normalized === "LIDI") return "LIDI";

  return result || "COLABORADOR NÃO IDENTIFICADO";
}

function getMedian(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
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
        dhEmi: "", vendedor: "", tpNF: 1, finNFe: 1, natOp: "CANCELAMENTO", indPres: 0,
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
    const indPres = parseInt(getElement(ide, "indPres")?.textContent || "0");

    const dest = getElement(infNFe, "dest");
    const cpf_cnpj = dest ? (getElement(dest, "CPF")?.textContent || getElement(dest, "CNPJ")?.textContent || "") : "";
    const nome_dest = dest ? (getElement(dest, "xNome")?.textContent || "") : "";
    const enderDest = dest ? getElement(dest, "enderDest") : null;
    const cep_dest = enderDest ? (getElement(enderDest, "CEP")?.textContent || "").replace(/\D/g, "") : "";
    const xLgr_dest = enderDest ? (getElement(enderDest, "xLgr")?.textContent || "") : "";
    const nro_dest = enderDest ? (getElement(enderDest, "nro")?.textContent || "") : "";
    const uf_dest = enderDest ? (getElement(enderDest, "UF")?.textContent || "") : "";

    const isNomeMinusculo = /[a-z]/.test(nome_dest);

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
    let nearFreeCount = 0;
    let residualCount = 0;
    const unitPricesBruto: number[] = [];
    let totalDescontoNota = 0;
    let hasSymbolicItem = false;

    getElements(infNFe, "det").forEach(det => {
      const prod = getElement(det, "prod");
      if (prod) {
        const cProd = getElement(prod, "cProd")?.textContent || "";
        const vProd = dec(getElement(prod, "vProd")?.textContent);
        const vDesc = dec(getElement(prod, "vDesc")?.textContent);
        const qCom = dec(getElement(prod, "qCom")?.textContent);
        
        const unitBruto = vProd / qCom;
        const unitFinal = (vProd - vDesc) / qCom;
        const unitDesc = vDesc / qCom;

        if (unitBruto <= 0.10 && vDesc === 0) hasSymbolicItem = true;

        if (unitBruto >= UNIT_BRUTO_MIN) {
          unitPricesBruto.push(unitBruto);
          totalDescontoNota += vDesc;

          if (unitFinal > 0 && unitFinal <= NEAR_FREE_MAX) nearFreeCount++;
          if (unitDesc > 0 && unitDesc <= RESIDUAL_MAX) residualCount++;
          else if (unitFinal > 0 && unitFinal <= RESIDUAL_MAX && unitDesc > 0) residualCount++;
        }

        itemsList.push({
          cProd,
          xProd: getElement(prod, "xProd")?.textContent || "",
          qCom,
          vProd,
          vDesc,
          is_campanha: false
        });
      }
    });

    const precoBase = getMedian(unitPricesBruto);
    let isCampanhaNota = false;

    if (precoBase > 0) {
      const isCampanhaCandidato = (nearFreeCount >= 1) && (residualCount >= 1 || nearFreeCount >= 2);
      const k = Math.round(totalDescontoNota / precoBase);
      const tol = Math.max(0.05, 0.10 * k);
      const coerente = k >= 1 && Math.abs(totalDescontoNota - k * precoBase) <= tol;
      isCampanhaNota = isCampanhaCandidato && coerente;
    }

    if (isCampanhaNota) {
      itemsList.forEach(item => { item.is_campanha = true; });
    }

    let temSuspeitaPrecoErrado = false;
    if (!isCampanhaNota) {
      itemsList.forEach(item => {
        if (item.vDesc <= 0) return;

        const unitBruto = item.vProd / item.qCom;
        const unitLiq = (item.vProd - item.vDesc) / item.qCom;
        const unitDesc = item.vDesc / item.qCom;
        const unitLiqCents = Math.round(unitLiq * 100);
        const lastDigit = unitLiqCents % 10;
        const isPsychEnding = [1, 5, 9].includes(lastDigit);
        const unitDescCents = Math.round(unitDesc * 100);
        const hasMaterialDiscount = unitDescCents >= MIN_DESC_CENTS_MATERIAL;
        const percDesc = item.vProd > 0 ? item.vDesc / item.vProd : 0;
        const isStandardPercent = STANDARD_PERCENTS.some(p => Math.abs(percDesc - p) <= 0.01);
        const isRiHappyStandard = (percDesc >= 0.08 && percDesc <= 0.12) || (percDesc >= 0.045 && percDesc <= 0.055);

        if (isPsychEnding && hasMaterialDiscount && !isStandardPercent && !isRiHappyStandard) {
          item.is_preco_errado = true;
          item.evidencia_preco_errado = `Final ${lastDigit} com desconto manual de R$ ${unitDesc.toFixed(2)}`;
          temSuspeitaPrecoErrado = true;
        }
      });
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

    // --- LOGICA DE CLASSIFICAÇÃO UNIFICADA ---
    const isEnderecoLoja = 
      cep_dest === "21211007" && 
      nro_dest === "909" && 
      uf_dest === "RJ" && 
      /VICENTE\s+DE\s+CARVALHO/i.test(xLgr_dest);

    const temDinheiro = pagamentosDet.some(p => p.tPag === "01");
    const hasTextualPickupEvidence = /RETIRADA|PICKUP|PEDIDO|SITE|ECOMM|MAGENTO/i.test(infCpl);

    // BLOQUEIOS DE BALCÃO
    const isBalcaoBlocked = 
      hasSymbolicItem || 
      temDinheiro || 
      vTrocoPag > 0 || 
      (tpIntegraValue !== "2" && !hasTextualPickupEvidence);

    const isRetiradaOnline = isEnderecoLoja && !isBalcaoBlocked;

    const vTrocaCredito = pagamentosDet.filter(p => p.tPag === "05").reduce((acc, p) => acc + p.vPag, 0);
    const isTroca = vTrocaCredito > 0;
    const dif_troca = vNFValue - vTrocaCredito;

    const valorTotalProds = itemsList.reduce((acc, it) => acc + it.vProd, 0);
    const descontoTotal = itemsList.reduce((acc, it) => acc + it.vDesc, 0);
    const percentualDesconto = valorTotalProds > 0 ? (descontoTotal / valorTotalProds) : 0;

    let tipoDescontoFinal = "PADRÃO";
    if (isCampanhaNota) tipoDescontoFinal = "CAMPANHA";
    else if (temSuspeitaPrecoErrado) tipoDescontoFinal = "AJUSTE DE PREÇO";
    else if (percentualDesconto >= 0.08 && percentualDesconto <= 0.12) tipoDescontoFinal = "ADICIONAL";
    else if (percentualDesconto >= 0.045 && percentualDesconto <= 0.055) tipoDescontoFinal = "MOSTRUÁRIO";

    return {
      chave, nf, serie: getElement(ide, "serie")?.textContent || "", modelo: getElement(ide, "mod")?.textContent || "", dhEmi, vendedor,
      tpNF, finNFe, natOp, indPres,
      canal: isTroca ? "TROCA" : (isRetiradaOnline ? "RETIRADA_ONLINE" : "LOJA_FISICA"),
      subcanal: "", canal_consolidado: isTroca ? "TROCA" : (isRetiradaOnline ? "RETIRADA_ONLINE" : "VENDA_LOJA"),
      is_adicional: false, is_adicional_suspeito: false, motivo_adicional: "NAO_ADICIONAL",
      vNF: vNFValue.toFixed(2), itens_qtd: itemsList.reduce((acc, it) => acc + it.qCom, 0).toString(),
      desconto_total: descontoTotal.toFixed(2), percentual_desconto: percentualDesconto.toFixed(4),
      is_troca: isTroca, vTroca: vTrocaCredito.toFixed(2), dif_troca: dif_troca.toFixed(2),
      is_devolucao: tpNF === 0 && (finNFe === 4 || natOp.toLowerCase().includes("devolucao")),
      refNFe: refNFes, refNFe_normalizadas: refNFes.map(r => r.replace(/\D/g, "")),
      is_retirada_online: isRetiradaOnline, vTroco: vTrocoPag.toFixed(2), is_presencial_por_troco: !isRetiradaOnline, tpIntegra: tpIntegraValue,
      tem_desconto: descontoTotal > 0, tipo_desconto: tipoDescontoFinal,
      status_auditoria: isCampanhaNota ? "CAMPANHA IDENTIFICADA" : (temSuspeitaPrecoErrado ? "SUSPEITA DE AJUSTE MANUAL" : (descontoTotal > 0 ? "DESCONTO APLICADO" : "SEM DESCONTO")),
      cep_dest, cep_loja, is_cep_diferente_da_loja: !!cep_dest && cep_dest !== cep_loja,
      is_endereco_real: !!cep_dest, cpf_cnpj_dest: cpf_cnpj, nome_dest, endereco_dest: "", tem_destinatario: !!cpf_cnpj,
      itens: itemsList,
      is_cancelada: false,
      emitente: { xNome: xNomeEmit, cnpj: cnpjEmit, ie: ieEmit, endereco: enderEmitFull },
      protocolo: protocoloData,
      pagamentos_detalhe: pagamentosDet,
      infCpl,
      pickup_match_fields: isEnderecoLoja ? 5 : 0,
      is_nome_minusculo: isNomeMinusculo,
      has_symbolic_item: hasSymbolicItem,
      tem_suspeita_preco_errado: temSuspeitaPrecoErrado
    };
  } catch (e) {
    return null;
  }
}
