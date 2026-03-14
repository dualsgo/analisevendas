
import { DetailedSaleRow, Item } from "./types";

// LISTA OFICIAL DE CÓDIGOS SLP (Super Lançamento Premiado)
const SLP_CODES = [
  '5135238', '5135269', '5135270', '5135273', '5146458', '5146469', '5146470', '5146471',
  '5146472', '5146473', '5146474', '5146475', '5146476', '5146501', '5146504', '5146505',
  '5141894', '5141895', '5141896', '5141897', '5141898', '5141899', '5141900', '5141902',
  '5141903', '5141904', '5141905', '5141907', '5141909', '5141910', '5141911', '5141912',
  '5141913', '5141914', '5141915', '5141916', '5141917', '5141920', '5141949', '5141978',
  '5140469', '5140475', '5140476', '5140477', '5140478', '5140479', '5146477', '5146478',
  '5146502', '5146503'
];

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

  let result = candidate.substring(0, endIdx).trim().toUpperCase();

  const trailingIdMatch = result.match(/\s+\d+$/);
  if (trailingIdMatch && trailingIdMatch.index) {
    result = result.substring(0, trailingIdMatch.index).trim();
  }

  if (result === "LIDIANE B" || result === "BARBOSA") return "BARBOSA";
  if (result === "LIDIANE" || result === "LIDI") return "LIDI";

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

        const unitDesc = item.vDesc / item.qCom;
        const unitLiq = (item.vProd - item.vDesc) / item.qCom;
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
    const vendedorRaw = extractVendedor(infCpl);

    // --- LOGICA DE CLASSIFICAÇÃO UNIFICADA ---
    const isOperacaoInternet = indPres === 2 || indPres === 3 || indPres === 9;
    
    // O CEP de destino pode ser o da própria loja ou conter o nome do local (para retrocompatibilidade)
    const isEnderecoLoja = (!!cep_dest && cep_dest === cep_loja) || 
      (cep_dest === "21211007" && /VICENTE\s+DE\s+CARVALHO/i.test(xLgr_dest));

    // Identificação de pagamento digital pelo site pela tag (Sem varredura textural)
    // tpIntegra = 2 (Não Integrado com TEF físico da loja), tPag = 99 (Outros), 90 (Sem pagamento)
    const temPagamentoSite = pagamentosDet.some(p => p.tpIntegra === "2" || p.tPag === "99" || p.tPag === "90");
    const temDinheiro = pagamentosDet.some(p => p.tPag === "01");

    // BLOQUEIOS DE BALCÃO
    const isBalcaoBlocked =
      hasSymbolicItem ||
      temDinheiro ||
      vTrocoPag > 0;

    // Exclusivamente via Tags do XML: Destino na Loja AND (Operação de Internet OR Pagamento de Site)
    const isRetiradaOnline = isEnderecoLoja && (isOperacaoInternet || temPagamentoSite) && !isBalcaoBlocked;

    const vTrocaCredito = pagamentosDet.filter(p => p.tPag === "05").reduce((acc, p) => acc + p.vPag, 0);
    const isTroca = vTrocaCredito > 0;
    const dif_troca = vNFValue - vTrocaCredito;

    const valorTotalProds = itemsList.reduce((acc, it) => acc + it.vProd, 0);
    const descontoTotal = itemsList.reduce((acc, it) => acc + it.vDesc, 0);
    const percentualDesconto = valorTotalProds > 0 ? (descontoTotal / valorTotalProds) : 0;

    // --- LÓGICA DE CAMPANHA SLP (9,99) ---
    const hasSlpDiscount = itemsList.some(it => SLP_CODES.includes(it.cProd) && it.vDesc > 0);
    const hasNonSlpDiscount = itemsList.some(it => !SLP_CODES.includes(it.cProd) && it.vDesc > 0);

    let tipoDescontoFinal = "PADRÃO";
    let statusAuditoriaFinal = temSuspeitaPrecoErrado ? "SUSPEITA DE AJUSTE MANUAL" : (descontoTotal > 0 ? "DESCONTO APLICADO" : "SEM DESCONTO");

    let isDescontoEstrategico = false;
    if (hasSlpDiscount) {
      if (hasNonSlpDiscount) {
        tipoDescontoFinal = "CAMPANHA + ALERTA";
        statusAuditoriaFinal = "CAMPANHA SLP + OUTRO DESCONTO DETECTADO";
      } else {
        tipoDescontoFinal = "CAMPANHA";
        statusAuditoriaFinal = "CAMPANHA SLP IDENTIFICADA";
      }
    } else if (isCampanhaNota) {
      tipoDescontoFinal = "CAMPANHA";
      statusAuditoriaFinal = "CAMPANHA IDENTIFICADA";
    } else if (temSuspeitaPrecoErrado) {
      tipoDescontoFinal = "AJUSTE DE PREÇO";
      statusAuditoriaFinal = "SUSPEITA DE AJUSTE MANUAL";
    } else if (percentualDesconto >= 0.08 && percentualDesconto <= 0.12) {
      tipoDescontoFinal = "ADICIONAL";
      statusAuditoriaFinal = "DESCONTO ESTRATÉGICO (10%)";
      isDescontoEstrategico = true;
    } else if (percentualDesconto >= 0.045 && percentualDesconto <= 0.055) {
      tipoDescontoFinal = "MOSTRUÁRIO";
    }

    return {
      chave, nf, serie: getElement(ide, "serie")?.textContent || "", modelo: getElement(ide, "mod")?.textContent || "", dhEmi, vendedor: vendedorRaw,
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
      status_auditoria: statusAuditoriaFinal,
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
