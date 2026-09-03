"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow, VinculoTroca, Item } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MessageCircle,
  Copy,
  Check,
  TrendingUp,
  Award,
  Smartphone,
  AlertTriangle,
  Zap,
  LayoutDashboard,
  Trophy,
  Users,
  Package,
  Layers,
  ShoppingBag,
  SlidersHorizontal,
  Search,
  Tag,
  CreditCard,
  Flame,
  ListOrdered
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format, parseISO, min, max, isSameDay } from "date-fns";
import { SLP_DDC_CODES, SLP_OUTROS_CODES, SLP_CODES } from "@/lib/xml-parser";

interface WhatsappReportsProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

export type ReportType = 'STORE_SUMMARY' | 'MODULAR_RANKING' | 'VENDOR_PERFORMANCE' | 'PICKUP_CONVERSION' | 'DAILY_CLOSING' | 'STRATEGIC';
export type ChannelMetricMode = 'AVULSO' | 'COMBINADO' | 'AMBOS';

export type ModularMetricKey = 
  | 'slpDdc' 
  | 'slpOutros' 
  | 'baralhos' 
  | 'sacolas' 
  | 'customItem' 
  | 'venda' 
  | 'pa' 
  | 'tkm' 
  | 'cupons' 
  | 'adicionais' 
  | 'conv'
  | 'ident';

export const MODULAR_METRICS: Record<ModularMetricKey, { label: string; emoji: string; shortLabel: string }> = {
  slpDdc: { label: "SLP DDC", emoji: "📦", shortLabel: "SLP DDC" },
  slpOutros: { label: "SLP (OUTROS)", emoji: "✨", shortLabel: "SLP Outros" },
  baralhos: { label: "BARALHOS", emoji: "🃏", shortLabel: "Baralhos" },
  sacolas: { label: "SACOLAS", emoji: "🛍️", shortLabel: "Sacolas" },
  customItem: { label: "ITEM ESPECÍFICO", emoji: "🏷️", shortLabel: "Item Foco" },
  venda: { label: "FATURAMENTO", emoji: "💰", shortLabel: "Faturamento" },
  pa: { label: "P.A.", emoji: "🎯", shortLabel: "P.A." },
  tkm: { label: "TKM", emoji: "💳", shortLabel: "TKM" },
  cupons: { label: "CUPONS", emoji: "🧾", shortLabel: "Cupons" },
  adicionais: { label: "ADICIONAIS PICKUP", emoji: "➕", shortLabel: "Adicionais" },
  conv: { label: "CONVERSÃO PICKUP", emoji: "📊", shortLabel: "Conversão" },
  ident: { label: "CADASTROS", emoji: "🆔", shortLabel: "Identificação" }
};

const BARALHO_CODES = ['5147797', '5147796', '5149977', '5149978'];
const SACOLA_CODES = ['5133676', '5113644'];

export function WhatsappReports({ data, vinculos }: WhatsappReportsProps) {
  const [reportType, setReportType] = useState<ReportType>('MODULAR_RANKING');
  const [useEmojis, setUseEmojis] = useState(true);
  const [copied, setCopied] = useState(false);

  // TKM & PA: Modo Avulso (Presencial), Combinado (+ Pickups) ou Ambos
  const [channelMode, setChannelMode] = useState<ChannelMetricMode>('AVULSO');
  // Descontar sacolas no cálculo de PA (PA limpo)
  const [excludeBagsFromPA, setExcludeBagsFromPA] = useState(false);

  // Configuração do Ranking Modular
  const [selectedModularMetric, setSelectedModularMetric] = useState<ModularMetricKey>('slpDdc');
  const [isMultiRanking, setIsMultiRanking] = useState(false);
  const [selectedMultiMetrics, setSelectedMultiMetrics] = useState<ModularMetricKey[]>(['slpDdc', 'baralhos']);
  const [hideZeros, setHideZeros] = useState(true);
  const [useShortNames, setUseShortNames] = useState(true);
  const [showMedals, setShowMedals] = useState(false);
  const [rankingLimit, setRankingLimit] = useState<number>(0); // 0 = todos

  // Seleção de itens a considerar nas parciais gerais
  const [includeSlpDdc, setIncludeSlpDdc] = useState(true);
  const [includeSlpOutros, setIncludeSlpOutros] = useState(true);
  const [includeBaralhos, setIncludeBaralhos] = useState(true);
  const [includeSacolas, setIncludeSacolas] = useState(true);
  const [includeCustomItem, setIncludeCustomItem] = useState(false);
  const [customItemCode, setCustomItemCode] = useState("");
  const [includeItemDetailsInVendors, setIncludeItemDetailsInVendors] = useState(true);

  const { toast } = useToast();

  const formatBRL = (val?: number | string | null) => 
    (Number(val) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Funções auxiliares para identificação de categorias de itens
  const isSlpDdc = (it: { cProd: string; xProd?: string }) => {
    if (SLP_DDC_CODES.includes(it.cProd)) return true;
    const p = (it.xProd || "").toUpperCase();
    return p.includes("SLP DDC") || (p.includes("SLP") && p.includes("DDC"));
  };

  const isSlpOutros = (it: { cProd: string; xProd?: string }) => {
    if (isSlpDdc(it)) return false;
    if (SLP_OUTROS_CODES.includes(it.cProd)) return true;
    const p = (it.xProd || "").toUpperCase();
    return p.includes("SLP") && !p.includes("DDC");
  };

  const isBaralho = (it: { cProd: string; xProd?: string }) => {
    if (BARALHO_CODES.includes(it.cProd)) return true;
    const p = (it.xProd || "").toUpperCase();
    return p.includes("BARALHO") || p.includes("ACAO SOCIAL") || p.includes("AÇÃO SOCIAL") || p.includes("DOACAO") || p.includes("DOAÇÃO") || p.includes("ALMANAQUE");
  };

  const isSacola = (it: { cProd: string; xProd?: string }) => {
    if (SACOLA_CODES.includes(it.cProd)) return true;
    const p = (it.xProd || "").toUpperCase();
    return p.includes("SACOLA");
  };

  // Processar códigos personalizados digitados
  const targetCustomCodes = useMemo(() => {
    return customItemCode
      .split(/[,;\s]+/)
      .map(c => c.trim().toUpperCase())
      .filter(Boolean);
  }, [customItemCode]);

  const isCustom = (it: { cProd: string; xProd?: string }) => {
    if ((!includeCustomItem && selectedModularMetric !== 'customItem' && !selectedMultiMetrics.includes('customItem')) || targetCustomCodes.length === 0) return false;
    return targetCustomCodes.includes(it.cProd.trim().toUpperCase());
  };

  // Informações do item personalizado (nome extraído das notas fiscais)
  const customItemInfo = useMemo(() => {
    if (targetCustomCodes.length === 0) return null;
    let foundName = "";
    for (const sale of data) {
      const match = sale.itens?.find(i => targetCustomCodes.includes(i.cProd.trim().toUpperCase()));
      if (match) {
        foundName = match.xProd;
        break;
      }
    }
    return {
      codes: targetCustomCodes,
      name: foundName || `Item ${targetCustomCodes.join(", ")}`
    };
  }, [data, targetCustomCodes]);

  // Lista dos produtos mais vendidos para preenchimento rápido
  const topProductsList = useMemo(() => {
    const map = new Map<string, { cProd: string; xProd: string; qCom: number }>();
    data.filter(r => r.tpNF === 1 && !r.is_cancelada).forEach(r => {
      r.itens?.forEach(it => {
        const existing = map.get(it.cProd);
        if (existing) {
          existing.qCom += it.qCom || 0;
        } else {
          map.set(it.cProd, { cProd: it.cProd, xProd: it.xProd || `Item ${it.cProd}`, qCom: it.qCom || 0 });
        }
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.qCom - a.qCom)
      .slice(0, 15);
  }, [data]);

  // Cálculos de métricas consolidadas (Avulso e Combinado) e parciais
  const metrics = useMemo(() => {
    const saidas = data.filter(r => r.tpNF === 1 && !r.is_devolucao && !r.is_cancelada);
    
    // Filtros Disjuntos
    const online = saidas.filter(r => r.canal === "RETIRADA_ONLINE");
    // Loja Física (Presencial + Adicional): exclui online e trocas
    const fisicaEAdicional = saidas.filter(r => r.canal !== "RETIRADA_ONLINE" && r.canal !== "TROCA" && !r.is_troca);
    
    // Cálculos Loja Física (Avulso / Presencial)
    const vLoja = fisicaEAdicional.reduce((acc, r) => acc + (parseFloat(r.vNF) || 0), 0);
    const cLoja = fisicaEAdicional.length;
    const iLoja = fisicaEAdicional.reduce((acc, r) => acc + (parseFloat(r.itens_qtd) || (r.itens?.reduce((s, it) => s + (it.qCom || 0), 0) || 0)), 0);
    const idenLoja = fisicaEAdicional.filter(r => r.cpf_cnpj_dest && r.cpf_cnpj_dest.trim() !== "").length;

    // Cálculos Retiradas Online
    const vOnline = online.reduce((acc, r) => acc + (parseFloat(r.vNF) || 0), 0);
    const cOnline = online.length;
    const iOnline = online.reduce((acc, r) => acc + (parseFloat(r.itens_qtd) || (r.itens?.reduce((s, it) => s + (it.qCom || 0), 0) || 0)), 0);

    // Cálculos Combinados (Físico + Retiradas Online)
    const vComb = vLoja + vOnline;
    const cComb = cLoja + cOnline;
    const iComb = iLoja + iOnline;

    // Métricas de Adicional para Conversão
    const adicionaisTotal = fisicaEAdicional.filter(r => r.canal === "RETIRADA_ADICIONAL" || r.is_adicional || r.is_adicional_suspeito);
    const cAdicional = adicionaisTotal.length;
    const convPickup = online.length > 0 ? (cAdicional / online.length) * 100 : 0;

    // Mapeamento de Pickups por CPF para atribuição inteligente aos colaboradores
    const onlinePerCustomer = new Map<string, { count: number; value: number; items: number; keys: string[] }>();
    online.forEach(p => {
      if (p.cpf_cnpj_dest) {
        const cpf = p.cpf_cnpj_dest.trim();
        const pVal = parseFloat(p.vNF) || 0;
        const pItens = parseFloat(p.itens_qtd) || (p.itens?.reduce((s, it) => s + (it.qCom || 0), 0) || 0);
        if (!onlinePerCustomer.has(cpf)) {
          onlinePerCustomer.set(cpf, { count: 0, value: 0, items: 0, keys: [] });
        }
        const record = onlinePerCustomer.get(cpf)!;
        record.count += 1;
        record.value += pVal;
        record.items += pItens;
        record.keys.push(p.chave);
      }
    });

    // Contadores de itens da Loja (ou Total)
    let totalSlpDdc = 0;
    let totalSlpOutros = 0;
    let totalBaralhos = 0;
    let totalSacolas = 0;
    let totalCustom = 0;

    // Processar itens de todas as saídas físicas
    fisicaEAdicional.forEach(r => {
      r.itens?.forEach(it => {
        const qty = Number(it.qCom) || 0;
        if (isSlpDdc(it)) totalSlpDdc += qty;
        else if (isSlpOutros(it)) totalSlpOutros += qty;

        if (isBaralho(it)) totalBaralhos += qty;
        if (isSacola(it)) totalSacolas += qty;

        if (isCustom(it)) totalCustom += qty;
      });
    });

    // Métricas por Colaborador
    const collaborators: Record<string, any> = {};
    const collabCustomers = new Map<string, Set<string>>();

    fisicaEAdicional.forEach(r => {
      const name = (r.vendedor || "COLABORADOR").toUpperCase();
      if (!collaborators[name]) {
        collaborators[name] = { 
          venda: 0, 
          cupons: 0, 
          itens: 0, 
          ident: 0, 
          adicionais: 0, 
          pickups: 0,
          pickupVenda: 0,
          pickupItens: 0,
          slpDdc: 0,
          slpOutros: 0,
          baralhos: 0,
          sacolas: 0,
          custom: 0,
          explicitPickupKeys: new Set<string>() 
        };
      }
      
      const vNF = parseFloat(r.vNF) || 0;
      const qtdItens = parseFloat(r.itens_qtd) || (r.itens?.reduce((s, it) => s + (it.qCom || 0), 0) || 0);

      collaborators[name].venda += vNF;
      collaborators[name].cupons += 1;
      collaborators[name].itens += qtdItens;
      
      if (r.cpf_cnpj_dest && r.cpf_cnpj_dest.trim() !== "") {
        collaborators[name].ident += 1;
        if (!collabCustomers.has(name)) collabCustomers.set(name, new Set());
        collabCustomers.get(name)!.add(r.cpf_cnpj_dest.trim());
      }
      
      if (r.is_adicional || r.is_adicional_suspeito || r.canal === "RETIRADA_ADICIONAL") {
        collaborators[name].adicionais += 1;
        if (r.chave_retirada_associada) {
          collaborators[name].explicitPickupKeys.add(r.chave_retirada_associada);
        }
      }

      // Parciais de itens do colaborador
      r.itens?.forEach(it => {
        const qty = Number(it.qCom) || 0;
        if (isSlpDdc(it)) collaborators[name].slpDdc += qty;
        else if (isSlpOutros(it)) collaborators[name].slpOutros += qty;

        if (isBaralho(it)) collaborators[name].baralhos += qty;
        if (isSacola(it)) collaborators[name].sacolas += qty;

        if (isCustom(it)) collaborators[name].custom += qty;
      });
    });

    // Atribuir Pickups aos Colaboradores
    Object.keys(collaborators).forEach(name => {
      const uniquePickupsHandled = new Set<string>(collaborators[name].explicitPickupKeys);
      let customerPickupVenda = 0;
      let customerPickupItens = 0;
      
      const customerCPFs = collabCustomers.get(name);
      if (customerCPFs) {
        customerCPFs.forEach(cpf => {
          const rec = onlinePerCustomer.get(cpf);
          if (rec) {
            rec.keys.forEach(k => {
              if (!uniquePickupsHandled.has(k)) {
                uniquePickupsHandled.add(k);
                customerPickupVenda += rec.value;
                customerPickupItens += rec.items;
              }
            });
          }
        });
      }
      
      collaborators[name].pickups = uniquePickupsHandled.size;
      collaborators[name].pickupVenda = customerPickupVenda;
      collaborators[name].pickupItens = customerPickupItens;
    });

    // Ajuste de PA se sacolas estiverem descontadas
    const iLojaPA = excludeBagsFromPA ? Math.max(0, iLoja - totalSacolas) : iLoja;
    const iCombPA = excludeBagsFromPA ? Math.max(0, iComb - totalSacolas) : iComb;

    const paAvulso = cLoja > 0 ? iLojaPA / cLoja : 0;
    const tkmAvulso = cLoja > 0 ? vLoja / cLoja : 0;

    const paComb = cComb > 0 ? iCombPA / cComb : paAvulso;
    const tkmComb = cComb > 0 ? vComb / cComb : tkmAvulso;

    const vendorPerformanceList = Object.entries(collaborators)
      .map(([name, v]) => {
        const itensAvulsoPA = excludeBagsFromPA ? Math.max(0, v.itens - v.sacolas) : v.itens;
        const itensCombPA = excludeBagsFromPA ? Math.max(0, (v.itens + v.pickupItens) - v.sacolas) : (v.itens + v.pickupItens);

        const vCuponsComb = v.cupons + v.pickups;
        const vVendaComb = v.venda + v.pickupVenda;

        const paAv = v.cupons > 0 ? itensAvulsoPA / v.cupons : 0;
        const tkmAv = v.cupons > 0 ? v.venda / v.cupons : 0;

        const paCb = vCuponsComb > 0 ? itensCombPA / vCuponsComb : paAv;
        const tkmCb = vCuponsComb > 0 ? vVendaComb / vCuponsComb : tkmAv;

        return {
          name,
          vendaAvulso: v.venda,
          vendaCombinado: vVendaComb,
          cuponsAvulso: v.cupons,
          cuponsCombinado: vCuponsComb,
          paAvulso: paAv,
          paCombinado: paCb,
          tkmAvulso: tkmAv,
          tkmCombinado: tkmCb,
          ident: v.cupons > 0 ? (v.ident / v.cupons) * 100 : 0,
          adicionais: v.adicionais,
          pickups: v.pickups,
          conv: v.pickups > 0 ? (v.adicionais / v.pickups) * 100 : 0,
          slpDdc: v.slpDdc,
          slpOutros: v.slpOutros,
          baralhos: v.baralhos,
          sacolas: v.sacolas,
          custom: v.custom
        };
      })
      .sort((a, b) => b.vendaAvulso - a.vendaAvulso);

    return {
      vLoja,
      vComb,
      cLoja,
      cComb,
      iLoja,
      iComb,
      paAvulso,
      paComb,
      tkmAvulso,
      tkmComb,
      cadastros: cLoja > 0 ? (idenLoja / cLoja) * 100 : 0,
      retiradas: online.length,
      adicionais: cAdicional,
      convPickup,
      trocas: vinculos.length,
      totalSlpDdc,
      totalSlpOutros,
      totalBaralhos,
      totalSacolas,
      totalCustom,
      vendorPerformanceList
    };
  }, [data, vinculos, excludeBagsFromPA, includeCustomItem, targetCustomCodes, selectedModularMetric, selectedMultiMetrics]);

  // Formatação dos blocos de texto para WhatsApp
  const reportContent = useMemo(() => {
    const e = (emoji: string) => useEmojis ? emoji + " " : "";
    
    const dates = data.map(r => parseISO(r.dhEmi)).filter(d => !isNaN(d.getTime()));
    let dateStr = "";
    if (dates.length > 0) {
      const minDate = min(dates);
      const maxDate = max(dates);
      dateStr = isSameDay(minDate, maxDate) ? format(minDate, "dd/MM") : `${format(minDate, "dd/MM")} a ${format(maxDate, "dd/MM")}`;
    } else {
      dateStr = format(new Date(), "dd/MM");
    }

    const formatVendorName = (fullName: string) => {
      if (!useShortNames) return fullName.toUpperCase();
      const parts = fullName.trim().split(/\s+/);
      return (parts[0] || fullName).toUpperCase();
    };

    // Gerador de Bloco Modular Individual
    const buildSingleModularRanking = (metricKey: ModularMetricKey) => {
      const meta = MODULAR_METRICS[metricKey];
      let title = meta.label;
      if (metricKey === 'customItem') {
        title = customItemInfo?.name 
          ? `${customItemInfo.name.toUpperCase()}` 
          : targetCustomCodes.length > 0 ? `ITEM ${targetCustomCodes.join("/")}` : "ITEM ESPECÍFICO";
      }

      // Mapear cada colaborador para o valor numérico e valor formatado
      const list = metrics.vendorPerformanceList.map(v => {
        let numericVal = 0;
        let formattedVal = "";

        switch (metricKey) {
          case 'slpDdc':
            numericVal = v.slpDdc;
            formattedVal = String(v.slpDdc);
            break;
          case 'slpOutros':
            numericVal = v.slpOutros;
            formattedVal = String(v.slpOutros);
            break;
          case 'baralhos':
            numericVal = v.baralhos;
            formattedVal = String(v.baralhos);
            break;
          case 'sacolas':
            numericVal = v.sacolas;
            formattedVal = String(v.sacolas);
            break;
          case 'customItem':
            numericVal = v.custom;
            formattedVal = String(v.custom);
            break;
          case 'venda':
            numericVal = channelMode === 'COMBINADO' ? v.vendaCombinado : v.vendaAvulso;
            formattedVal = formatBRL(numericVal);
            break;
          case 'pa':
            numericVal = channelMode === 'COMBINADO' ? v.paCombinado : v.paAvulso;
            formattedVal = numericVal.toFixed(2);
            break;
          case 'tkm':
            numericVal = channelMode === 'COMBINADO' ? v.tkmCombinado : v.tkmAvulso;
            formattedVal = formatBRL(numericVal);
            break;
          case 'cupons':
            numericVal = channelMode === 'COMBINADO' ? v.cuponsCombinado : v.cuponsAvulso;
            formattedVal = String(numericVal);
            break;
          case 'adicionais':
            numericVal = v.adicionais;
            formattedVal = String(v.adicionais);
            break;
          case 'conv':
            numericVal = v.conv;
            formattedVal = `${v.conv.toFixed(0)}%`;
            break;
          case 'ident':
            numericVal = v.ident;
            formattedVal = `${v.ident.toFixed(0)}%`;
            break;
        }

        return {
          name: formatVendorName(v.name),
          val: numericVal,
          formattedVal
        };
      });

      // Ordenar decrescente
      list.sort((a, b) => b.val - a.val);

      // Filtrar zerados se solicitado
      let filtered = hideZeros ? list.filter(item => item.val > 0) : list;

      // Limitar posições se solicitado
      if (rankingLimit > 0) {
        filtered = filtered.slice(0, rankingLimit);
      }

      const iconPrefix = useEmojis ? `${meta.emoji} ` : "";
      const header = `${iconPrefix}*${title} – ${dateStr}*`;
      
      if (filtered.length === 0) {
        return `${header}\n_Sem pontuação no período_`;
      }

      const lines = filtered.map((item, idx) => {
        const medal = showMedals && idx === 0 ? "🥇 " : showMedals && idx === 1 ? "🥈 " : showMedals && idx === 2 ? "🥉 " : "";
        return `${medal}*${item.name}*: ${item.formattedVal}`;
      });

      return `${header}\n${lines.join("\n")}`;
    };

    // Gerar texto de PA e TKM conforme modo selecionado
    const getPAText = (paAv: number, paCb: number, prefix = "PA:") => {
      const suffix = excludeBagsFromPA ? " (s/ sac)" : "";
      if (channelMode === 'AVULSO') return `${prefix} ${paAv.toFixed(2)}${suffix}`;
      if (channelMode === 'COMBINADO') return `${prefix} ${paCb.toFixed(2)}${suffix} (Comb.)`;
      return `${prefix} ${paAv.toFixed(2)} (Av) | ${paCb.toFixed(2)} (Comb)${suffix}`;
    };

    const getTKMText = (tkmAv: number, tkmCb: number, prefix = "TKM:") => {
      if (channelMode === 'AVULSO') return `${prefix} ${formatBRL(tkmAv)}`;
      if (channelMode === 'COMBINADO') return `${prefix} ${formatBRL(tkmCb)} (Comb.)`;
      return `${prefix} ${formatBRL(tkmAv)} (Av) | ${formatBRL(tkmComb)} (Comb)`;
    };

    const getVendaText = (vAv: number, vCb: number) => {
      if (channelMode === 'AVULSO') return formatBRL(vAv);
      if (channelMode === 'COMBINADO') return `${formatBRL(vCb)} (Comb.)`;
      return `${formatBRL(vAv)} (Av) | ${formatBRL(vCb)} (Comb)`;
    };

    // Montar bloco de parciais de itens / campanhas
    const buildItemPartialsText = (title = "Parciais de Campanhas & Itens:") => {
      const lines: string[] = [];
      if (includeSlpDdc) lines.push(`• SLP DDC: ${metrics.totalSlpDdc} un`);
      if (includeSlpOutros) lines.push(`• SLP (Outros): ${metrics.totalSlpOutros} un`);
      if (includeBaralhos) lines.push(`• Baralhos: ${metrics.totalBaralhos} un`);
      if (includeSacolas) lines.push(`• Sacolas: ${metrics.totalSacolas} un`);
      if (includeCustomItem && targetCustomCodes.length > 0) {
        const label = customItemInfo?.name ? `[${targetCustomCodes.join("/")}] ${customItemInfo.name}` : `Item ${targetCustomCodes.join("/")}`;
        lines.push(`• ${label}: ${metrics.totalCustom} un`);
      }

      if (lines.length === 0) return "";
      return `\n${e("📦")}*${title}*\n` + lines.join("\n") + "\n";
    };

    switch (reportType) {
      case 'MODULAR_RANKING': {
        if (isMultiRanking) {
          if (selectedMultiMetrics.length === 0) {
            return `_Selecione ao menos um ranking modular para exibir._`;
          }
          return selectedMultiMetrics
            .map(m => buildSingleModularRanking(m))
            .join("\n\n");
        } else {
          return buildSingleModularRanking(selectedModularMetric);
        }
      }

      case 'STORE_SUMMARY': {
        const itemBlock = buildItemPartialsText("Parciais de Campanhas & Itens:");
        const channelNote = channelMode === 'AVULSO' 
          ? `_(Faturamento e métricas presenciais + adicionais)_`
          : channelMode === 'COMBINADO'
          ? `_(Faturamento e métricas combinando loja física e retiradas online)_`
          : `_(Métricas exibidas em: Avulso / Combinado com Pickups)_`;

        return `${e("📊")}*Resultado Unidade – ${dateStr}*\n\n` +
          `${e("💰")}*Venda:* ${getVendaText(metrics.vLoja, metrics.vComb)}\n` +
          `${e("🎯")}*${getPAText(metrics.paAvulso, metrics.paComb, "PA:")}* | ${e("💳")}*${getTKMText(metrics.tkmAvulso, metrics.tkmComb, "TKM:")}*\n` +
          `${e("🆔")}*Ident:* ${metrics.cadastros.toFixed(1)}% | ${e("🔄")}*Trocas:* ${metrics.trocas}\n` +
          `${e("🚚")}*Pks:* ${metrics.retiradas} | ${e("➕")}*Adic:* ${metrics.adicionais} (${metrics.convPickup.toFixed(1)}%)` +
          itemBlock + "\n" +
          channelNote;
      }

      case 'VENDOR_PERFORMANCE': {
        let perfText = `${e("👤")}*Performance Colaboradores – ${dateStr}*\n\n`;
        
        metrics.vendorPerformanceList.forEach((v) => {
          perfText += `*${v.name}*\n` +
            `${e("💰")}${getVendaText(v.vendaAvulso, v.vendaCombinado)}\n` +
            `${e("🎯")}${getPAText(v.paAvulso, v.paCombinado, "PA:")} | ${e("💳")}${getTKMText(v.tkmAvulso, v.tkmCombinado, "TKM:")}\n` +
            `${e("🆔")}Ident: ${v.ident.toFixed(0)}% | ${e("🚚")}${v.pickups} Pks | ${e("➕")}${v.adicionais} Adic (${v.conv.toFixed(0)}%)\n`;

          if (includeItemDetailsInVendors) {
            const vItems: string[] = [];
            if (includeSlpDdc && v.slpDdc > 0) vItems.push(`SLP DDC: ${v.slpDdc}`);
            if (includeSlpOutros && v.slpOutros > 0) vItems.push(`SLP Outros: ${v.slpOutros}`);
            if (includeBaralhos && v.baralhos > 0) vItems.push(`Baralhos: ${v.baralhos}`);
            if (includeSacolas && v.sacolas > 0) vItems.push(`Sacolas: ${v.sacolas}`);
            if (includeCustomItem && v.custom > 0) vItems.push(`Item Foco: ${v.custom}`);

            if (vItems.length > 0) {
              perfText += `${e("📦")}${vItems.join(" | ")}\n`;
            }
          }

          perfText += "------------------------\n";
        });
        return perfText;
      }

      case 'PICKUP_CONVERSION': {
        return `${e("🚚")}*Relatório Pickup – ${dateStr}*\n\n` +
          `${e("📦")}*Retiradas Totais:* ${metrics.retiradas}\n` +
          `${e("➕")}*Com Adicional:* ${metrics.adicionais}\n` +
          `${e("📊")}*Conversão Geral:* ${metrics.convPickup.toFixed(1)}%\n\n` +
          (includeSacolas ? `${e("🛍️")}*Sacolas Totais:* ${metrics.totalSacolas} un\n` : "") +
          (includeSlpDdc ? `${e("✨")}*SLP DDC:* ${metrics.totalSlpDdc} un\n` : "") +
          (includeBaralhos ? `${e("🃏")}*Baralhos:* ${metrics.totalBaralhos} un\n` : "");
      }

      case 'DAILY_CLOSING': {
        const itemBlock = buildItemPartialsText("Campanhas & Itens do Dia:");
        const highlights: Record<string, string[]> = {};

        const bestPA = [...metrics.vendorPerformanceList].sort((a, b) => b.paAvulso - a.paAvulso)[0];
        const bestTKM = [...metrics.vendorPerformanceList].sort((a, b) => b.tkmAvulso - a.tkmAvulso)[0];
        const bestIdent = [...metrics.vendorPerformanceList].sort((a, b) => b.ident - a.ident)[0];
        const bestAdic = [...metrics.vendorPerformanceList].sort((a, b) => b.adicionais - a.adicionais)[0];
        const bestSlpDdc = includeSlpDdc ? [...metrics.vendorPerformanceList].sort((a, b) => b.slpDdc - a.slpDdc)[0] : null;
        const bestBaralhos = includeBaralhos ? [...metrics.vendorPerformanceList].sort((a, b) => b.baralhos - a.baralhos)[0] : null;

        if (bestPA && bestPA.paAvulso > 0) {
          if (!highlights[bestPA.name]) highlights[bestPA.name] = [];
          highlights[bestPA.name].push(`PA (${bestPA.paAvulso.toFixed(2)})`);
        }
        if (bestTKM && bestTKM.tkmAvulso > 0) {
          if (!highlights[bestTKM.name]) highlights[bestTKM.name] = [];
          highlights[bestTKM.name].push(`TKM (${formatBRL(bestTKM.tkmAvulso)})`);
        }
        if (bestIdent && bestIdent.ident > 0) {
          if (!highlights[bestIdent.name]) highlights[bestIdent.name] = [];
          highlights[bestIdent.name].push(`Ident (${bestIdent.ident.toFixed(0)}%)`);
        }
        if (bestAdic && bestAdic.adicionais > 0) {
          if (!highlights[bestAdic.name]) highlights[bestAdic.name] = [];
          highlights[bestAdic.name].push(`Adicionais (${bestAdic.adicionais})`);
        }
        if (bestSlpDdc && bestSlpDdc.slpDdc > 0) {
          if (!highlights[bestSlpDdc.name]) highlights[bestSlpDdc.name] = [];
          highlights[bestSlpDdc.name].push(`SLP DDC (${bestSlpDdc.slpDdc} un)`);
        }
        if (bestBaralhos && bestBaralhos.baralhos > 0) {
          if (!highlights[bestBaralhos.name]) highlights[bestBaralhos.name] = [];
          highlights[bestBaralhos.name].push(`Baralhos (${bestBaralhos.baralhos} un)`);
        }

        let highlightsText = "";
        Object.entries(highlights).forEach(([name, kpis]) => {
          highlightsText += `${e("⭐")}*${name}:* ${kpis.join(", ")}\n`;
        });

        return `${e("📅")}*Fechamento – ${dateStr}*\n\n` +
          `${e("💰")}*Venda:* ${getVendaText(metrics.vLoja, metrics.vComb)}\n` +
          `${e("🎯")}*${getPAText(metrics.paAvulso, metrics.paComb, "PA:")}*\n` +
          `${e("💳")}*${getTKMText(metrics.tkmAvulso, metrics.tkmComb, "TKM:")}*\n` +
          `${e("🆔")}*Ident:* ${metrics.cadastros.toFixed(1)}%\n` +
          itemBlock + "\n" +
          `${e("🏆")}*DESTAQUES DO DIA:*\n` +
          (highlightsText || "Equipe engajada no resultado!");
      }

      case 'STRATEGIC': {
        const itemBlock = buildItemPartialsText("Desempenho de Foco:");
        const paTarget = metrics.paAvulso >= 2.0 ? e("✅") : e("🛑");
        const identTarget = metrics.cadastros >= 85 ? e("✅") : e("🛑");
        const convTarget = metrics.convPickup >= 15 ? e("✅") : e("🛑");

        return `${e("📈")}*Gestão Estratégica – ${dateStr}*\n\n` +
          `*Status da Unidade:*\n` +
          `${paTarget} ${getPAText(metrics.paAvulso, metrics.paComb, "PA:")}\n` +
          `${identTarget} Ident: ${metrics.cadastros.toFixed(1)}%\n` +
          `${convTarget} Conv Pickup: ${metrics.convPickup.toFixed(1)}%\n` +
          itemBlock;
      }

      default:
        return "";
    }
  }, [
    reportType, 
    metrics, 
    useEmojis, 
    data, 
    channelMode, 
    excludeBagsFromPA,
    selectedModularMetric,
    isMultiRanking,
    selectedMultiMetrics,
    hideZeros,
    useShortNames,
    showMedals,
    rankingLimit,
    includeSlpDdc,
    includeSlpOutros,
    includeBaralhos,
    includeSacolas,
    includeCustomItem,
    targetCustomCodes,
    customItemInfo,
    includeItemDetailsInVendors
  ]);

  const handleCopy = () => {
    navigator.clipboard.writeText(reportContent);
    setCopied(true);
    toast({
      title: "Ranking Copiado!",
      description: "O texto formatado está pronto para colar no WhatsApp.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectQuickProduct = (code: string) => {
    setCustomItemCode(code);
    setIncludeCustomItem(true);
  };

  const toggleMultiMetric = (key: ModularMetricKey) => {
    setSelectedMultiMetrics(prev => {
      if (prev.includes(key)) {
        return prev.filter(k => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Coluna de Configuração (5 colunas no desktop) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="ri-card shadow-sm overflow-hidden">
            <CardHeader className="bg-emerald-50/70 border-b border-emerald-100 p-4">
              <CardTitle className="text-sm font-black text-emerald-800 uppercase flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-emerald-600" /> Configurar Relatório WhatsApp
                </span>
                <Badge className="bg-emerald-500 text-white font-black text-[9px] uppercase">
                  Modular
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
              
              {/* Tipo de Relatório */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Tipo de Mensagem</Label>
                <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                  <SelectTrigger className="rounded-xl h-11 border-slate-200 font-bold text-xs uppercase">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MODULAR_RANKING" className="text-xs font-bold text-emerald-700">
                      🏆 Ranking Modular (Compacto por Métrica)
                    </SelectItem>
                    <SelectItem value="STORE_SUMMARY" className="text-xs">
                      📊 Parcial da Unidade (Consolidado Geral)
                    </SelectItem>
                    <SelectItem value="VENDOR_PERFORMANCE" className="text-xs">
                      👤 Performance Colaboradores (Detalhada)
                    </SelectItem>
                    <SelectItem value="DAILY_CLOSING" className="text-xs">
                      📅 Fechamento do Dia c/ Destaques
                    </SelectItem>
                    <SelectItem value="PICKUP_CONVERSION" className="text-xs">
                      🚚 Relatório Pickup & Conversão
                    </SelectItem>
                    <SelectItem value="STRATEGIC" className="text-xs">
                      📈 Gestão Estratégica & Metas
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* BLOCO DO RANKING MODULAR (Quando ativo) */}
              {reportType === 'MODULAR_RANKING' && (
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ListOrdered className="w-4 h-4 text-emerald-700" />
                      <Label className="text-xs font-black uppercase text-emerald-900">
                        Configurar Ranking Modular
                      </Label>
                    </div>
                    <Badge className="bg-emerald-600 text-white font-black text-[9px] uppercase">
                      Formato WhatsApp
                    </Badge>
                  </div>

                  {/* Alternar entre Ranking Único ou Múltiplos Rankings */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold text-slate-700 cursor-pointer">
                        Múltiplos Rankings no Mesmo Texto
                      </Label>
                      <p className="text-[10px] text-slate-400">Gera blocos empilhados (ex: SLP DDC + Baralhos)</p>
                    </div>
                    <Switch checked={isMultiRanking} onCheckedChange={setIsMultiRanking} />
                  </div>

                  {!isMultiRanking ? (
                    /* Seletor de Métrica Única */
                    <div className="space-y-2 pt-1">
                      <Label className="text-[10px] font-black uppercase text-slate-500">
                        Qual ranking você deseja enviar?
                      </Label>
                      <Select 
                        value={selectedModularMetric} 
                        onValueChange={(v) => setSelectedModularMetric(v as ModularMetricKey)}
                      >
                        <SelectTrigger className="rounded-xl h-11 border-slate-200 font-black text-xs uppercase bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="slpDdc" className="text-xs font-bold text-orange-600">
                            📦 SLP DDC (5149138)
                          </SelectItem>
                          <SelectItem value="slpOutros" className="text-xs font-bold text-orange-600">
                            ✨ SLP (Outros Códigos)
                          </SelectItem>
                          <SelectItem value="baralhos" className="text-xs font-bold text-blue-600">
                            🃏 Baralhos / Ação Social
                          </SelectItem>
                          <SelectItem value="sacolas" className="text-xs font-bold text-slate-700">
                            🛍️ Sacolas
                          </SelectItem>
                          <SelectItem value="customItem" className="text-xs font-bold text-purple-700">
                            🏷️ Item Específico por Código
                          </SelectItem>
                          <SelectItem value="venda" className="text-xs font-bold text-emerald-700">
                            💰 Faturamento (R$)
                          </SelectItem>
                          <SelectItem value="pa" className="text-xs font-bold text-amber-700">
                            🎯 P.A. (Peças/Cupom)
                          </SelectItem>
                          <SelectItem value="tkm" className="text-xs font-bold text-indigo-700">
                            💳 TKM (Ticket Médio)
                          </SelectItem>
                          <SelectItem value="cupons" className="text-xs font-bold text-slate-700">
                            🧾 Quantidade de Cupons
                          </SelectItem>
                          <SelectItem value="adicionais" className="text-xs font-bold text-emerald-700">
                            ➕ Adicionais de Retirada
                          </SelectItem>
                          <SelectItem value="ident" className="text-xs font-bold text-slate-700">
                            🆔 Identificação (% Cadastros)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    /* Seleção Múltipla de Métricas */
                    <div className="space-y-2 pt-1">
                      <Label className="text-[10px] font-black uppercase text-slate-500">
                        Selecione os rankings para incluir:
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(MODULAR_METRICS).map(([k, meta]) => {
                          const key = k as ModularMetricKey;
                          const isSelected = selectedMultiMetrics.includes(key);
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => toggleMultiMetric(key)}
                              className={cn(
                                "p-2 rounded-xl text-left text-xs font-bold flex items-center gap-2 border transition-all",
                                isSelected
                                  ? "bg-white border-emerald-500 text-emerald-800 shadow-2xs font-black"
                                  : "bg-slate-50/80 border-slate-200 text-slate-500 hover:bg-white"
                              )}
                            >
                              <div className={cn(
                                "w-4 h-4 rounded-md flex items-center justify-center border text-[10px]",
                                isSelected ? "bg-emerald-500 text-white border-emerald-600" : "border-slate-300 bg-white"
                              )}>
                                {isSelected && "✓"}
                              </div>
                              <span className="truncate">{meta.emoji} {meta.shortLabel}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Se item customizado estiver ativo ou selecionado */}
                  {(selectedModularMetric === 'customItem' || (isMultiRanking && selectedMultiMetrics.includes('customItem'))) && (
                    <div className="p-3 bg-white rounded-xl border border-purple-200 space-y-2">
                      <Label className="text-[10px] font-black uppercase text-purple-900 flex items-center gap-1">
                        <Tag className="w-3 h-3 text-purple-600" /> Código do Produto para o Ranking
                      </Label>
                      <Input
                        placeholder="Ex: 5147812"
                        value={customItemCode}
                        onChange={(e) => setCustomItemCode(e.target.value)}
                        className="text-xs h-9 font-mono font-bold border-purple-200"
                      />
                      {customItemInfo && targetCustomCodes.length > 0 && (
                        <p className="text-[10px] text-purple-800 font-bold bg-purple-50 p-2 rounded-lg">
                          {customItemInfo.name} • Total vendido: {metrics.totalCustom} un
                        </p>
                      )}
                      {topProductsList.length > 0 && (
                        <div className="pt-1">
                          <span className="text-[9px] font-bold text-slate-400 block mb-1">
                            Atalho rápido nos mais vendidos:
                          </span>
                          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                            {topProductsList.slice(0, 6).map(prod => (
                              <button
                                key={prod.cProd}
                                type="button"
                                onClick={() => setCustomItemCode(prod.cProd)}
                                className={cn(
                                  "text-[9px] px-2 py-0.5 rounded-md font-bold uppercase border transition-colors",
                                  targetCustomCodes.includes(prod.cProd)
                                    ? "bg-purple-600 text-white border-purple-700"
                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-purple-50"
                                )}
                              >
                                {prod.cProd} • {prod.xProd.slice(0, 12)}...
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Filtros e Ajustes Finos do Ranking */}
                  <div className="pt-2 border-t border-emerald-200/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="hide-zeros" className="text-xs font-bold text-slate-700 cursor-pointer">
                          Ocultar Colaboradores Zerados
                        </Label>
                        <p className="text-[9px] text-slate-400">Exibe somente quem pontuou na métrica</p>
                      </div>
                      <Switch id="hide-zeros" checked={hideZeros} onCheckedChange={setHideZeros} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="short-names" className="text-xs font-bold text-slate-700 cursor-pointer">
                          Nome Curto (Primeiro Nome)
                        </Label>
                        <p className="text-[9px] text-slate-400">Ex: *RENATA*: 23 em vez de nome completo</p>
                      </div>
                      <Switch id="short-names" checked={useShortNames} onCheckedChange={setUseShortNames} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="medals" className="text-xs font-bold text-slate-700 cursor-pointer">
                          Exibir Medalhas (🥇, 🥈, 🥉)
                        </Label>
                        <p className="text-[9px] text-slate-400">Destaque visual para os primeiros lugares</p>
                      </div>
                      <Switch id="medals" checked={showMedals} onCheckedChange={setShowMedals} />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <Label className="text-xs font-bold text-slate-700">Limite de Posições</Label>
                      <Select 
                        value={String(rankingLimit)} 
                        onValueChange={(v) => setRankingLimit(Number(v))}
                      >
                        <SelectTrigger className="rounded-lg h-8 w-32 border-slate-200 font-bold text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0" className="text-xs">Todos</SelectItem>
                          <SelectItem value="3" className="text-xs">Top 3</SelectItem>
                          <SelectItem value="5" className="text-xs">Top 5</SelectItem>
                          <SelectItem value="10" className="text-xs">Top 10</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Bloco TKM & PA (Avulso ou Combinado) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-orange-500" />
                    <Label className="text-xs font-black uppercase text-slate-700">TKM e P.A. (Canal)</Label>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-bold text-orange-600 border-orange-200 bg-orange-50">
                    {channelMode}
                  </Badge>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  Selecione se o TKM e PA devem refletir apenas o faturamento presencial (avulso) ou combinado com Pickups.
                </p>

                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setChannelMode('AVULSO')}
                    className={cn(
                      "py-2 px-1 text-[10px] font-black uppercase rounded-xl transition-all text-center border",
                      channelMode === 'AVULSO'
                        ? "bg-orange-500 text-white border-orange-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    Avulso
                    <span className="block text-[8px] font-normal opacity-80">(Presencial)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannelMode('COMBINADO')}
                    className={cn(
                      "py-2 px-1 text-[10px] font-black uppercase rounded-xl transition-all text-center border",
                      channelMode === 'COMBINADO'
                        ? "bg-orange-500 text-white border-orange-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    Combinado
                    <span className="block text-[8px] font-normal opacity-80">(+ Pickups)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannelMode('AMBOS')}
                    className={cn(
                      "py-2 px-1 text-[10px] font-black uppercase rounded-xl transition-all text-center border",
                      channelMode === 'AMBOS'
                        ? "bg-orange-500 text-white border-orange-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    Ambos
                    <span className="block text-[8px] font-normal opacity-80">(Avulso + Comb)</span>
                  </button>
                </div>

                {/* Expurgo de Sacolas do PA */}
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="bags-switch" className="text-[11px] font-bold text-slate-700 cursor-pointer">
                      Descontar Sacolas do P.A.
                    </Label>
                    <p className="text-[9px] text-slate-400">Calcula peças/cupom puras (sem embalagens)</p>
                  </div>
                  <Switch 
                    id="bags-switch"
                    checked={excludeBagsFromPA} 
                    onCheckedChange={setExcludeBagsFromPA} 
                  />
                </div>
              </div>

              {/* Bloco de Parciais Gerais (Quando não estiver no Ranking Modular) */}
              {reportType !== 'MODULAR_RANKING' && (
                <div className="p-4 bg-orange-50/40 rounded-2xl border border-orange-200/80 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-orange-600" />
                      <Label className="text-xs font-black uppercase text-slate-700">Parciais de Campanhas</Label>
                    </div>
                    <span className="text-[9px] font-bold text-orange-700 uppercase">Considerar</span>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="slp-ddc" checked={includeSlpDdc} onCheckedChange={(c) => setIncludeSlpDdc(!!c)} />
                        <Label htmlFor="slp-ddc" className="text-xs font-black text-slate-700 cursor-pointer">
                          SLP DDC (5149138)
                        </Label>
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-black text-orange-600 bg-orange-50">
                        {metrics.totalSlpDdc} un
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="slp-outros" checked={includeSlpOutros} onCheckedChange={(c) => setIncludeSlpOutros(!!c)} />
                        <Label htmlFor="slp-outros" className="text-xs font-black text-slate-700 cursor-pointer">
                          SLP (Outros Códigos)
                        </Label>
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-black text-orange-600 bg-orange-50">
                        {metrics.totalSlpOutros} un
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="baralhos" checked={includeBaralhos} onCheckedChange={(c) => setIncludeBaralhos(!!c)} />
                        <Label htmlFor="baralhos" className="text-xs font-black text-slate-700 cursor-pointer">
                          Baralhos / Ação Social
                        </Label>
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-black text-blue-600 bg-blue-50">
                        {metrics.totalBaralhos} un
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="sacolas" checked={includeSacolas} onCheckedChange={(c) => setIncludeSacolas(!!c)} />
                        <Label htmlFor="sacolas" className="text-xs font-black text-slate-700 cursor-pointer">
                          Sacolas
                        </Label>
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-black text-slate-700 bg-slate-100">
                        {metrics.totalSacolas} un
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Opções Gerais */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-black text-slate-700">Usar Emojis</Label>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Mensagem formatada para WhatsApp</p>
                  </div>
                  <Switch checked={useEmojis} onCheckedChange={setUseEmojis} />
                </div>
              </div>

              {/* Botão Copiar */}
              <Button 
                onClick={handleCopy}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl py-6 mt-2 gap-2 shadow-lg shadow-emerald-500/20 text-sm"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copied ? "COPIADO COM SUCESSO!" : "COPIAR FORMATO WHATSAPP"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Coluna de Pré-visualização WhatsApp (7 colunas no desktop) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                Pré-visualização WhatsApp
              </h3>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-black text-[9px] uppercase">
                {reportType === 'MODULAR_RANKING' ? 'Formato Modular' : channelMode}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="text-xs font-black text-emerald-700 border-emerald-200 hover:bg-emerald-50 h-8 gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              Copiar
            </Button>
          </div>

          {/* WhatsApp Screen Frame */}
          <div className="bg-[#E5DDD5] rounded-[2rem] p-4 md:p-8 shadow-inner min-h-[560px] relative overflow-hidden flex flex-col justify-start">
            <div 
              className="absolute inset-0 opacity-[0.06] pointer-events-none" 
              style={{ 
                backgroundImage: "radial-gradient(#128C7E 1px, transparent 1px)", 
                backgroundSize: '16px 16px' 
              }} 
            />

            {/* Header simulando topo do WhatsApp */}
            <div className="relative max-w-md mx-auto w-full bg-emerald-800 text-white px-4 py-2.5 rounded-t-2xl flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-black text-xs text-white">
                  RH
                </div>
                <div>
                  <span className="text-xs font-black block leading-tight">Grupo da Loja • Ri Happy</span>
                  <span className="text-[9px] text-emerald-200 font-medium">online</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Badge className="bg-emerald-700/80 text-[8px] font-mono text-emerald-100 border-none">
                  {format(new Date(), "HH:mm")}
                </Badge>
              </div>
            </div>
            
            {/* Balão de mensagem WhatsApp */}
            <div className="relative max-w-md mx-auto w-full">
              <div className="bg-white rounded-b-2xl p-5 shadow-sm border-l-4 border-emerald-500 animate-in slide-in-from-left-4 duration-300">
                <pre className="whitespace-pre-wrap font-sans text-xs md:text-sm text-slate-800 leading-relaxed select-all">
                  {reportContent}
                </pre>
                
                <div className="flex items-center justify-between mt-4 pt-2 border-t border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">
                    Formato compacto pronto para o grupo
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-bold">{format(new Date(), "HH:mm")}</span>
                    <span className="text-emerald-500 font-bold text-xs">✓✓</span>
                  </div>
                </div>
              </div>

              {/* Botão de Cópia Direta */}
              <div className="mt-4 flex justify-center">
                <Button 
                  onClick={handleCopy}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-full px-6 py-2 shadow-lg shadow-emerald-600/30 text-xs gap-2"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copiado com Sucesso!" : "Copiar Este Texto"}
                </Button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
