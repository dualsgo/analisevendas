"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  Cell, 
  AreaChart, 
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from "recharts";
import { 
  UserCheck, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Clock, 
  Calendar as CalendarIcon, 
  ShoppingBag, 
  Sparkles, 
  ArrowRightLeft, 
  DollarSign, 
  Users, 
  Lightbulb,
  CheckCircle2, 
  Package,
  Layers,
  Heart,
  Tag,
  Target,
  Boxes,
  Copy,
  Download,
  Check,
  FileText,
  Utensils,
  Scale,
  Award,
  AlertTriangle,
  AlertCircle,
  Upload,
  Info,
  ShieldCheck,
  Zap,
  CalendarCheck
} from "lucide-react";
import { parseISO, getHours, getDay } from "date-fns";
import { cn } from "@/lib/utils";
import agingDataRaw from "@/data/aging-campaign.json";
import { 
  parseEscalaJson, 
  loadSavedEscalaStore, 
  saveEscalaStore, 
  getPosicaoForColaboradorAndDate,
  EscalaStore,
  PositionGoalConfig,
  DEFAULT_POSITION_METAS,
  POSITION_NAMES,
  loadSavedPositionMetas
} from "@/lib/escalaProcessor";
import { 
  computeTeamDispersionAnalysis, 
  TeamDispersionStats, 
  CollaboratorExtendedStats,
  SLP_CODES,
  SOCIAL_CODES,
  BARALHO_CODES,
  SACOLA_CODES,
  LANCHINHO_CODES,
  AGING_CODES
} from "@/lib/advanced-collaborator-analytics";
import { CollaboratorTeamDispersion } from "./CollaboratorTeamDispersion";
import { CollaboratorHeadToHead } from "./CollaboratorHeadToHead";

interface CollaboratorXRayProps {
  data: DetailedSaleRow[];
  vinculos?: VinculoTroca[];
}

const DAYS_NAME = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function CollaboratorXRay({ data = [], vinculos = [] }: CollaboratorXRayProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"INDIVIDUAL" | "DISPERSION" | "HEAD_TO_HEAD">("INDIVIDUAL");
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [copiedJSON, setCopiedJSON] = useState(false);
  const [escalaStore, setEscalaStore] = useState<EscalaStore | null>(null);
  const [customMetas, setCustomMetas] = useState<PositionGoalConfig>(DEFAULT_POSITION_METAS);
  const [isUploadingEscala, setIsUploadingEscala] = useState(false);
  const [escalaUploadError, setEscalaUploadError] = useState<string | null>(null);

  // Carregar escala e metas salvas no mount
  React.useEffect(() => {
    const savedEscala = loadSavedEscalaStore();
    if (savedEscala) {
      setEscalaStore(savedEscala);
    }
    const savedMetas = loadSavedPositionMetas();
    if (savedMetas) {
      setCustomMetas(savedMetas);
    }
  }, []);

  const handleEscalaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingEscala(true);
    setEscalaUploadError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const { escalas, exportedAt } = parseEscalaJson(content);

        const newStore: EscalaStore = {
          exportedAt,
          importedAt: new Date().toISOString(),
          filename: file.name,
          escalas,
          aliases: escalaStore?.aliases || {}
        };

        saveEscalaStore(newStore);
        setEscalaStore(newStore);
      } catch (err: any) {
        console.error(err);
        setEscalaUploadError(err.message || "Erro ao ler arquivo de escala.");
      } finally {
        setIsUploadingEscala(false);
      }
    };
    reader.onerror = () => {
      setEscalaUploadError("Erro ao carregar o arquivo.");
      setIsUploadingEscala(false);
    };
    reader.readAsText(file);
  };

  // Vendas válidas ativas de saída
  const activeSales = useMemo(() => {
    return data.filter(s => s.tpNF === 1 && !s.is_cancelada);
  }, [data]);

  // Lista de todos os colaboradores ativos com estatísticas resumidas
  const vendorSummaryList = useMemo(() => {
    const map = new Map<string, { name: string; venda: number; cupons: number; itens: number }>();
    
    activeSales.forEach(s => {
      const v = s.vendedor?.trim() || "NÃO IDENTIFICADO";
      const val = parseFloat(s.vNF) || 0;
      const itens = parseFloat(s.itens_qtd) || 0;
      
      const current = map.get(v) || { name: v, venda: 0, cupons: 0, itens: 0 };
      current.venda += val;
      current.cupons += 1;
      current.itens += itens;
      map.set(v, current);
    });

    return Array.from(map.values())
      .filter(v => v.name !== "NÃO IDENTIFICADO")
      .sort((a, b) => b.venda - a.venda);
  }, [activeSales]);

  // Seleção padrão do primeiro vendedor se nenhum estiver selecionado
  React.useEffect(() => {
    if (!selectedVendor && vendorSummaryList.length > 0) {
      setSelectedVendor(vendorSummaryList[0].name);
    }
  }, [vendorSummaryList, selectedVendor]);

  // Análise Estatística Avançada da Equipe (Dispersão, Z-Scores, J-Score)
  const dispersionStats = useMemo(() => {
    return computeTeamDispersionAnalysis(activeSales, vinculos, escalaStore, customMetas);
  }, [activeSales, vinculos, escalaStore, customMetas]);

  // Estatísticas Estendidas do Colaborador Selecionado
  const currentExtendedStats = useMemo(() => {
    return dispersionStats.collaborators.find(c => c.name === selectedVendor) || null;
  }, [dispersionStats, selectedVendor]);

  // Dados do Radar 6D Individual (Colaborador vs Média 50%)
  const individualRadarData = useMemo(() => {
    if (!currentExtendedStats) return [];
    return [
      { subject: "Produtividade / Dia", Colaborador: currentExtendedStats.radarDimensions.produtividade, fullMark: 100 },
      { subject: "Profundidade (PA)", Colaborador: currentExtendedStats.radarDimensions.profundidadeCesta, fullMark: 100 },
      { subject: "Ticket Médio", Colaborador: currentExtendedStats.radarDimensions.ticketMedio, fullMark: 100 },
      { subject: "Campanhas (SLP/Soc)", Colaborador: currentExtendedStats.radarDimensions.campanhas, fullMark: 100 },
      { subject: "Fidelidade (CPF)", Colaborador: currentExtendedStats.radarDimensions.fidelidade, fullMark: 100 },
      { subject: "Margem & Trocas", Colaborador: currentExtendedStats.radarDimensions.preservacaoMargem, fullMark: 100 },
    ];
  }, [currentExtendedStats]);

  // Métricas Globais da Loja (Benchmarking)
  const storeMetrics = useMemo(() => {
    const totalVenda = activeSales.reduce((acc, s) => acc + (parseFloat(s.vNF) || 0), 0);
    const totalCupons = activeSales.length;
    const totalItens = activeSales.reduce((acc, s) => acc + (parseFloat(s.itens_qtd) || 0), 0);
    const totalCPF = activeSales.filter(s => s.cpf_cnpj_dest && s.cpf_cnpj_dest.trim() !== "").length;
    const totalDesconto = activeSales.reduce((acc, s) => acc + (parseFloat(s.desconto_total) || 0), 0);

    let storeSlpQty = 0;
    let storeSlpValor = 0;
    let storeSlpCupons = 0;

    let storeSocialQty = 0;
    let storeSocialValor = 0;
    let storeSocialCupons = 0;

    let storeSacolaQty = 0;
    let storeSacolaValor = 0;

    let storeBaralhoQty = 0;
    let storeBaralhoValor = 0;

    let storeLanchinhoQty = 0;
    let storeLanchinhoValor = 0;

    let storeAgingQty = 0;
    let storeAgingValor = 0;
    let storeAgingCupons = 0;

    let storeRetiradasCount = 0;
    let storeRetiradasValor = 0;

    let storeAdicionaisCount = 0;
    let storeAdicionaisValor = 0;

    activeSales.forEach(s => {
      let hasSlp = false;
      let hasSocial = false;
      let hasAging = false;

      if (s.canal === "RETIRADA_ONLINE" || s.is_retirada_online) {
        storeRetiradasCount++;
        storeRetiradasValor += parseFloat(s.vNF) || 0;
      }
      if (s.is_adicional || s.canal === "RETIRADA_ADICIONAL") {
        storeAdicionaisCount++;
        storeAdicionaisValor += parseFloat(s.vNF) || 0;
      }

      s.itens?.forEach(item => {
        const c = item.cProd;
        const q = item.qCom || 0;
        const v = (item.vProd || 0) - (item.vDesc || 0);

        if (SLP_CODES.includes(c)) {
          storeSlpQty += q;
          storeSlpValor += v;
          hasSlp = true;
        }

        const isSac = SACOLA_CODES.includes(c);
        const isBar = BARALHO_CODES.includes(c);
        const isLan = LANCHINHO_CODES.includes(c);
        const isSocOther = SOCIAL_CODES.includes(c);

        if (isSac || isBar || isLan || isSocOther) {
          storeSocialQty += q;
          storeSocialValor += v;
          hasSocial = true;

          if (isSac) {
            storeSacolaQty += q;
            storeSacolaValor += v;
          }
          if (isBar) {
            storeBaralhoQty += q;
            storeBaralhoValor += v;
          }
          if (isLan) {
            storeLanchinhoQty += q;
            storeLanchinhoValor += v;
          }
        }

        if (AGING_CODES.has(c)) {
          storeAgingQty += q;
          storeAgingValor += v;
          hasAging = true;
        }
      });

      if (hasSlp) storeSlpCupons++;
      if (hasSocial) storeSocialCupons++;
      if (hasAging) storeAgingCupons++;
    });

    const storeSlpPenetracao = totalCupons > 0 ? (storeSlpCupons / totalCupons) * 100 : 0;
    const storeSocialPenetracao = totalCupons > 0 ? (storeSocialCupons / totalCupons) * 100 : 0;
    const storeAgingPenetracao = totalCupons > 0 ? (storeAgingCupons / totalCupons) * 100 : 0;

    const numVendors = vendorSummaryList.length || 1;
    const topVendor = vendorSummaryList[0] || { name: "N/A", venda: 0, cupons: 0, itens: 0 };

    const topVendorSales = activeSales.filter(s => (s.vendedor?.trim() || "") === topVendor.name);
    const topVendorCPF = topVendorSales.filter(s => s.cpf_cnpj_dest && s.cpf_cnpj_dest.trim() !== "").length;

    return {
      totalVenda,
      totalCupons,
      totalItens,
      avgVendaPerVendor: totalVenda / numVendors,
      avgCuponsPerVendor: totalCupons / numVendors,
      tkmLoja: totalCupons > 0 ? totalVenda / totalCupons : 0,
      paLoja: totalCupons > 0 ? totalItens / totalCupons : 0,
      cpfRateLoja: totalCupons > 0 ? (totalCPF / totalCupons) * 100 : 0,
      descontoRateLoja: totalVenda > 0 ? (totalDesconto / (totalVenda + totalDesconto)) * 100 : 0,
      
      // Métricas Estratégicas Globais da Loja
      storeSlpQty,
      storeSlpValor,
      storeSlpCupons,
      storeSlpPenetracao,

      storeSocialQty,
      storeSocialValor,
      storeSocialCupons,
      storeSocialPenetracao,

      storeSacolaQty,
      storeSacolaValor,

      storeBaralhoQty,
      storeBaralhoValor,

      storeAgingQty,
      storeAgingValor,
      storeAgingCupons,
      storeAgingPenetracao,

      storeRetiradasCount,
      storeRetiradasValor,

      storeAdicionaisCount,
      storeAdicionaisValor,

      // Top performer metrics
      topVendorName: topVendor.name,
      topVendorTkm: topVendor.cupons > 0 ? topVendor.venda / topVendor.cupons : 0,
      topVendorPa: topVendor.cupons > 0 ? topVendor.itens / topVendor.cupons : 0,
      topVendorCpfRate: topVendor.cupons > 0 ? (topVendorCPF / topVendor.cupons) * 100 : 0,
    };
  }, [activeSales, vendorSummaryList]);

  // Vendas do Colaborador Selecionado
  const vendorSales = useMemo(() => {
    if (!selectedVendor) return [];
    return activeSales.filter(s => (s.vendedor?.trim() || "") === selectedVendor);
  }, [activeSales, selectedVendor]);

  // Vínculos de Troca do Colaborador Selecionado
  const vendorVinculos = useMemo(() => {
    if (!selectedVendor || !vinculos) return [];
    return vinculos.filter(v => (v.vendedor?.trim() || "") === selectedVendor);
  }, [vinculos, selectedVendor]);

  // Métricas Consolidadas do Colaborador Selecionado
  const vendorMetrics = useMemo(() => {
    if (vendorSales.length === 0) {
      return {
        vendaTotal: 0,
        cuponsTotal: 0,
        itensTotal: 0,
        tkm: 0,
        pa: 0,
        cpfRate: 0,
        descontoTotal: 0,
        descontoPercent: 0,
        vendasComDescontoCount: 0,
        shareLoja: 0,
        trocasCount: 0,
        trocasValorDiferenca: 0,
        trocasPositivasCount: 0,
        trocasSecasCount: 0,
        trocasScoreMedio: 0,
        precoMedioItem: 0,

        // Métricas Estratégicas Zeradas
        slpQty: 0,
        slpValor: 0,
        slpCuponsCount: 0,
        slpPenetracaoRate: 0,
        socialQty: 0,
        socialValor: 0,
        socialCuponsCount: 0,
        socialPenetracaoRate: 0,
        sacolaQty: 0,
        sacolaValor: 0,
        baralhoQty: 0,
        baralhoValor: 0,
        lanchinhoQty: 0,
        lanchinhoValor: 0,
        agingQty: 0,
        agingValor: 0,
        agingCuponsCount: 0,
        agingPenetracaoRate: 0,
        retiradasCount: 0,
        retiradasValor: 0,
        adicionaisCount: 0,
        adicionaisValor: 0
      };
    }

    const vendaTotal = vendorSales.reduce((acc, s) => acc + (parseFloat(s.vNF) || 0), 0);
    const cuponsTotal = vendorSales.length;
    const itensTotal = vendorSales.reduce((acc, s) => acc + (parseFloat(s.itens_qtd) || 0), 0);
    const cpfCount = vendorSales.filter(s => s.cpf_cnpj_dest && s.cpf_cnpj_dest.trim() !== "").length;
    
    const descontoTotal = vendorSales.reduce((acc, s) => acc + (parseFloat(s.desconto_total) || 0), 0);
    const vendasComDescontoCount = vendorSales.filter(s => (parseFloat(s.desconto_total) || 0) > 0.05).length;
    
    const tkm = cuponsTotal > 0 ? vendaTotal / cuponsTotal : 0;
    const pa = cuponsTotal > 0 ? itensTotal / cuponsTotal : 0;
    const cpfRate = cuponsTotal > 0 ? (cpfCount / cuponsTotal) * 100 : 0;
    const descontoPercent = (vendaTotal + descontoTotal) > 0 ? (descontoTotal / (vendaTotal + descontoTotal)) * 100 : 0;
    const shareLoja = storeMetrics.totalVenda > 0 ? (vendaTotal / storeMetrics.totalVenda) * 100 : 0;
    const precoMedioItem = itensTotal > 0 ? vendaTotal / itensTotal : 0;

    // Métricas Estratégicas e Campanhas
    let slpQty = 0;
    let slpValor = 0;
    let slpCuponsCount = 0;

    let socialQty = 0;
    let socialValor = 0;
    let socialCuponsCount = 0;

    let sacolaQty = 0;
    let sacolaValor = 0;

    let baralhoQty = 0;
    let baralhoValor = 0;

    let lanchinhoQty = 0;
    let lanchinhoValor = 0;

    let agingQty = 0;
    let agingValor = 0;
    let agingCuponsCount = 0;

    let retiradasCount = 0;
    let retiradasValor = 0;

    let adicionaisCount = 0;
    let adicionaisValor = 0;

    vendorSales.forEach(s => {
      let hasSlp = false;
      let hasSocial = false;
      let hasAging = false;

      if (s.canal === "RETIRADA_ONLINE" || s.is_retirada_online) {
        retiradasCount++;
        retiradasValor += parseFloat(s.vNF) || 0;
      }
      if (s.is_adicional || s.canal === "RETIRADA_ADICIONAL") {
        adicionaisCount++;
        adicionaisValor += parseFloat(s.vNF) || 0;
      }

      s.itens?.forEach(item => {
        const c = item.cProd;
        const q = item.qCom || 0;
        const v = (item.vProd || 0) - (item.vDesc || 0);

        if (SLP_CODES.includes(c)) {
          slpQty += q;
          slpValor += v;
          hasSlp = true;
        }

        const isSac = SACOLA_CODES.includes(c);
        const isBar = BARALHO_CODES.includes(c);
        const isLan = LANCHINHO_CODES.includes(c);
        const isSocOther = SOCIAL_CODES.includes(c);

        if (isSac || isBar || isLan || isSocOther) {
          socialQty += q;
          socialValor += v;
          hasSocial = true;

          if (isSac) {
            sacolaQty += q;
            sacolaValor += v;
          }
          if (isBar) {
            baralhoQty += q;
            baralhoValor += v;
          }
          if (isLan) {
            lanchinhoQty += q;
            lanchinhoValor += v;
          }
        }

        if (AGING_CODES.has(c)) {
          agingQty += q;
          agingValor += v;
          hasAging = true;
        }
      });

      if (hasSlp) slpCuponsCount++;
      if (hasSocial) socialCuponsCount++;
      if (hasAging) agingCuponsCount++;
    });

    const slpPenetracaoRate = cuponsTotal > 0 ? (slpCuponsCount / cuponsTotal) * 100 : 0;
    const socialPenetracaoRate = cuponsTotal > 0 ? (socialCuponsCount / cuponsTotal) * 100 : 0;
    const agingPenetracaoRate = cuponsTotal > 0 ? (agingCuponsCount / cuponsTotal) * 100 : 0;

    // Dados de Troca
    const trocasCount = vendorVinculos.length;
    const trocasValorDiferenca = vendorVinculos.reduce((acc, v) => acc + v.valor_diferenca, 0);
    const trocasPositivasCount = vendorVinculos.filter(v => v.valor_diferenca > 0.05).length;
    const trocasSecasCount = vendorVinculos.filter(v => v.valor_diferenca <= 0.05).length;
    const trocasScoreMedio = trocasCount > 0 
      ? vendorVinculos.reduce((acc, v) => acc + (v.score_qualidade || 0), 0) / trocasCount 
      : 0;

    return {
      vendaTotal,
      cuponsTotal,
      itensTotal,
      tkm,
      pa,
      cpfRate,
      descontoTotal,
      descontoPercent,
      vendasComDescontoCount,
      shareLoja,
      trocasCount,
      trocasValorDiferenca,
      trocasPositivasCount,
      trocasSecasCount,
      trocasScoreMedio,
      precoMedioItem,

      // Métricas Estratégicas
      slpQty,
      slpValor,
      slpCuponsCount,
      slpPenetracaoRate,

      socialQty,
      socialValor,
      socialCuponsCount,
      socialPenetracaoRate,

      sacolaQty,
      sacolaValor,

      baralhoQty,
      baralhoValor,

      lanchinhoQty,
      lanchinhoValor,

      agingQty,
      agingValor,
      agingCuponsCount,
      agingPenetracaoRate,

      retiradasCount,
      retiradasValor,

      adicionaisCount,
      adicionaisValor
    };
  }, [vendorSales, vendorVinculos, storeMetrics.totalVenda]);

  // Métricas Táticas de Escala & Meta Ponderada Individual
  const vendorTacticalMetrics = useMemo(() => {
    const byPosition: Record<string, {
      posKey: string;
      posName: string;
      cupons: number;
      itens: number;
      venda: number;
      metaPos: number;
      pecasEsperadas: number;
      paPos: number;
      atingimentoPosPct: number;
      daysWorked: Set<string>;
    }> = {};

    let totalPecasEsperadas = 0;
    const allDaysWorked = new Set<string>();

    vendorSales.forEach(sale => {
      const saleDate = sale.dhEmi ? sale.dhEmi.split("T")[0] : "";
      if (saleDate) allDaysWorked.add(saleDate);

      let posKey = "DEFAULT";
      if (escalaStore && escalaStore.escalas.length > 0 && saleDate) {
        const foundPos = getPosicaoForColaboradorAndDate(
          escalaStore.escalas,
          selectedVendor,
          saleDate,
          escalaStore.aliases
        );
        if (foundPos) {
          if (foundPos.startsWith("P1")) posKey = "P1";
          else if (foundPos.startsWith("P2")) posKey = "P2";
          else if (foundPos.startsWith("P3")) posKey = "P3";
          else if (foundPos.startsWith("DIG")) posKey = "DIG";
          else posKey = foundPos;
        }
      }

      const metaPos = customMetas[posKey as keyof PositionGoalConfig] ?? customMetas.DEFAULT;
      const cupons = 1;
      const itens = parseFloat(sale.itens_qtd || "0");
      const venda = parseFloat(sale.vNF || "0");

      if (!byPosition[posKey]) {
        byPosition[posKey] = {
          posKey,
          posName: POSITION_NAMES[posKey] || posKey,
          cupons: 0,
          itens: 0,
          venda: 0,
          metaPos,
          pecasEsperadas: 0,
          paPos: 0,
          atingimentoPosPct: 0,
          daysWorked: new Set<string>()
        };
      }

      byPosition[posKey].cupons += cupons;
      byPosition[posKey].itens += itens;
      byPosition[posKey].venda += venda;
      if (saleDate) byPosition[posKey].daysWorked.add(saleDate);
    });

    const positionsList = Object.values(byPosition).map(p => {
      p.pecasEsperadas = p.cupons * p.metaPos;
      totalPecasEsperadas += p.pecasEsperadas;
      p.paPos = p.cupons > 0 ? p.itens / p.cupons : 0;
      p.atingimentoPosPct = p.metaPos > 0 ? (p.paPos / p.metaPos) * 100 : 0;
      return p;
    });

    // Ordenar por volume de cupons decrescente
    positionsList.sort((a, b) => b.cupons - a.cupons);

    // Identificar melhor e pior posição pelo PA realizado
    const positionsByPA = [...positionsList].filter(p => p.cupons > 0).sort((a, b) => b.paPos - a.paPos);
    const bestPosition = positionsByPA.length > 0 ? positionsByPA[0] : null;
    const worstPosition = positionsByPA.length > 1 ? positionsByPA[positionsByPA.length - 1] : null;

    const cuponsTotal = vendorMetrics.cuponsTotal;
    const itensTotal = vendorMetrics.itensTotal;
    const paRealizado = vendorMetrics.pa;

    const metaPonderadaPA = cuponsTotal > 0 ? totalPecasEsperadas / cuponsTotal : customMetas.DEFAULT;
    const atingimentoPonderadoPct = metaPonderadaPA > 0 ? (paRealizado / metaPonderadaPA) * 100 : 0;
    const diffPA = paRealizado - metaPonderadaPA;
    const saldoPecas = itensTotal - totalPecasEsperadas;

    const metaFixaLoja = 1.75;
    const isBateuPonderada = paRealizado >= metaPonderadaPA;
    const isBateuFixa = paRealizado >= metaFixaLoja;

    let justicaHighlight: "JUSTIÇA_POSITIVA" | "ALERTA_AJUSTE" | "SUPERAÇÃO_TOTAL" | "ABAIXO" = "ABAIXO";
    if (isBateuPonderada && isBateuFixa) {
      justicaHighlight = "SUPERAÇÃO_TOTAL";
    } else if (isBateuPonderada && !isBateuFixa) {
      justicaHighlight = "JUSTIÇA_POSITIVA";
    } else if (!isBateuPonderada && isBateuFixa) {
      justicaHighlight = "ALERTA_AJUSTE";
    } else {
      justicaHighlight = "ABAIXO";
    }

    // Posição com maior predominância de tempo/cupons
    const primaryPosition = positionsList.length > 0 ? positionsList[0] : null;

    return {
      hasEscalaData: Boolean(escalaStore && escalaStore.escalas.length > 0),
      positionsList,
      bestPosition,
      worstPosition,
      primaryPosition,
      totalPecasEsperadas,
      metaPonderadaPA,
      atingimentoPonderadoPct,
      diffPA,
      saldoPecas,
      metaFixaLoja,
      isBateuPonderada,
      isBateuFixa,
      justicaHighlight,
      totalDiasTrabalhados: allDaysWorked.size,
      escalaFilename: escalaStore?.filename
    };
  }, [vendorSales, escalaStore, customMetas, selectedVendor, vendorMetrics]);

  // Distribuição de Cesta de Compras (Cupons por número de itens)
  const basketBreakdown = useMemo(() => {
    let count1 = 0; // Mono-item
    let count2 = 0; // 2 Itens
    let count34 = 0; // 3-4 Itens
    let count5plus = 0; // 5+ Itens

    vendorSales.forEach(s => {
      const q = parseFloat(s.itens_qtd) || 0;
      if (q <= 1) count1++;
      else if (q === 2) count2++;
      else if (q >= 3 && q <= 4) count34++;
      else count5plus++;
    });

    const total = vendorSales.length || 1;

    return [
      { name: "1 Item (Mono-item)", count: count1, percent: (count1 / total) * 100, color: "#f43f5e", tip: "Oportunidade imediata de venda sugestiva" },
      { name: "2 Itens", count: count2, percent: (count2 / total) * 100, color: "#f59e0b", tip: "Conversão básica de adicional efetuada" },
      { name: "3 a 4 Itens", count: count34, percent: (count34 / total) * 100, color: "#3b82f6", tip: "Boa profundidade de cesta" },
      { name: "5+ Itens (Super Cestas)", count: count5plus, percent: (count5plus / total) * 100, color: "#10b981", tip: "Excelente recomendação e cross-selling" },
    ];
  }, [vendorSales]);

  // Análise por Horário do Dia (08h às 22h)
  const hourlyData = useMemo(() => {
    const hoursMap: Record<number, { hour: string; faturamento: number; cupons: number; itens: number }> = {};
    for (let h = 8; h <= 21; h++) {
      hoursMap[h] = { hour: `${h.toString().padStart(2, '0')}h`, faturamento: 0, cupons: 0, itens: 0 };
    }

    vendorSales.forEach(s => {
      if (!s.dhEmi) return;
      try {
        const d = parseISO(s.dhEmi);
        const h = getHours(d);
        if (hoursMap[h]) {
          hoursMap[h].faturamento += parseFloat(s.vNF) || 0;
          hoursMap[h].cupons += 1;
          hoursMap[h].itens += parseFloat(s.itens_qtd) || 0;
        }
      } catch (e) {}
    });

    return Object.values(hoursMap);
  }, [vendorSales]);

  // Hora de Ouro & Hora de Maior PA
  const peakHoursInfo = useMemo(() => {
    let topHourFat = hourlyData[0];
    let topHourPA = hourlyData[0];
    let maxFat = -1;
    let maxPA = -1;

    hourlyData.forEach(h => {
      if (h.faturamento > maxFat) {
        maxFat = h.faturamento;
        topHourFat = h;
      }
      const pa = h.cupons > 0 ? h.itens / h.cupons : 0;
      if (pa > maxPA && h.cupons >= 2) {
        maxPA = pa;
        topHourPA = h;
      }
    });

    return {
      goldHour: topHourFat ? topHourFat.hour : "N/A",
      goldHourFat: maxFat > 0 ? maxFat : 0,
      bestPaHour: topHourPA ? topHourPA.hour : "N/A",
      bestPaValue: maxPA > 0 ? maxPA : 0,
    };
  }, [hourlyData]);

  // Análise por Dia da Semana
  const weeklyData = useMemo(() => {
    const daysArr = DAYS_SHORT.map((day, idx) => ({
      day,
      fullName: DAYS_NAME[idx],
      faturamento: 0,
      cupons: 0,
      itens: 0,
    }));

    vendorSales.forEach(s => {
      if (!s.dhEmi) return;
      try {
        const d = parseISO(s.dhEmi);
        const dayIdx = getDay(d);
        if (daysArr[dayIdx]) {
          daysArr[dayIdx].faturamento += parseFloat(s.vNF) || 0;
          daysArr[dayIdx].cupons += 1;
          daysArr[dayIdx].itens += parseFloat(s.itens_qtd) || 0;
        }
      } catch (e) {}
    });

    return daysArr;
  }, [vendorSales]);

  // Top 5 Produtos mais vendidos pelo colaborador
  const topProducts = useMemo(() => {
    const itemsMap = new Map<string, { code: string; name: string; qtd: number; valor: number }>();
    
    vendorSales.forEach(s => {
      s.itens?.forEach(item => {
        if (!item.cProd) return;
        const code = item.cProd;
        const name = item.xProd || "Produto sem descrição";
        const q = item.qCom || 1;
        const v = item.vProd || 0;

        const curr = itemsMap.get(code) || { code, name, qtd: 0, valor: 0 };
        curr.qtd += q;
        curr.valor += v;
        itemsMap.set(code, curr);
      });
    });

    return Array.from(itemsMap.values())
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, [vendorSales]);

  // Projeção Financeira de Oportunidade (Ganho em R$) com Meta Ponderada Justa
  const financialProjections = useMemo(() => {
    const { cuponsTotal, tkm, pa, precoMedioItem } = vendorMetrics;
    const { tkmLoja, paLoja, topVendorTkm } = storeMetrics;
    const { saldoPecas, metaPonderadaPA } = vendorTacticalMetrics;

    // 1. Ganho se o TKM atingisse a Média da Loja
    const deltaTkmLoja = Math.max(0, tkmLoja - tkm);
    const ganhoTkmLoja = deltaTkmLoja * cuponsTotal;

    // 2. Ganho se o TKM atingisse o Top Performer
    const deltaTkmTop = Math.max(0, topVendorTkm - tkm);
    const ganhoTkmTop = deltaTkmTop * cuponsTotal;

    // 3. Peças e Faturamento Adicional se o PA atingisse a Média da Loja
    const deltaPaLoja = Math.max(0, paLoja - pa);
    const pecasAdicionaisLoja = deltaPaLoja * cuponsTotal;
    const ganhoPaLoja = pecasAdicionaisLoja * precoMedioItem;

    // 4. Oportunidade Direta da Meta Ponderada Justa (se estiver com saldo de peças negativo)
    const pecasNecessariasPonderada = saldoPecas < 0 ? Math.abs(saldoPecas) : 0;
    const ganhoMetaPonderada = pecasNecessariasPonderada * precoMedioItem;

    // 5. Ganho convertendo 30% dos cupons mono-item (1 item) para 2 itens
    const monoItemCount = basketBreakdown[0].count;
    const monoConvertedCount = Math.round(monoItemCount * 0.3);
    const ganhoConversaoMono = monoConvertedCount * precoMedioItem;

    // Potencial Total de Ganho Combinado Realista
    const potencialTotal = Math.max(ganhoTkmLoja, ganhoMetaPonderada, ganhoPaLoja) + ganhoConversaoMono;

    return {
      ganhoTkmLoja,
      ganhoTkmTop,
      pecasAdicionaisLoja: Math.round(pecasAdicionaisLoja),
      ganhoPaLoja,
      pecasNecessariasPonderada: Math.round(pecasNecessariasPonderada),
      ganhoMetaPonderada,
      monoConvertedCount,
      ganhoConversaoMono,
      potencialTotal
    };
  }, [vendorMetrics, storeMetrics, vendorTacticalMetrics, basketBreakdown]);

  // Perfil Comportamental Diagnóstico Adaptado à Escala & Justiça
  const behavioralDiagnosis = useMemo(() => {
    const { 
      tkm, pa, cpfRate, descontoPercent, trocasCount, trocasPositivasCount,
      slpQty, slpPenetracaoRate, socialQty, socialPenetracaoRate,
      agingQty, agingValor, retiradasCount, adicionaisCount, adicionaisValor
    } = vendorMetrics;
    const { tkmLoja, paLoja, cpfRateLoja, storeSlpPenetracao, storeSocialPenetracao } = storeMetrics;
    const { 
      justicaHighlight, 
      metaPonderadaPA, 
      isBateuPonderada, 
      bestPosition, 
      worstPosition, 
      primaryPosition,
      hasEscalaData 
    } = vendorTacticalMetrics;
    const monoPercent = basketBreakdown[0].percent;

    let perfilTitle = "Atendente Padrão";
    let perfilDesc = "Desempenho equilibrado na média geral da equipe.";
    let badgeColor = "bg-blue-50 text-blue-700 border-blue-200";

    if (justicaHighlight === "JUSTIÇA_POSITIVA") {
      perfilTitle = "Alta Eficiência em Escala Dinâmica";
      perfilDesc = `Bateu a meta ponderada justa (${pa.toFixed(2)} PA vs Meta ${metaPonderadaPA.toFixed(2)}) atuando com resiliência em postos de alto giro como ${primaryPosition?.posName || "Caixa/Porta"}.`;
      badgeColor = "bg-emerald-50 text-emerald-800 border-emerald-300";
    } else if (justicaHighlight === "SUPERAÇÃO_TOTAL" && pa >= 1.85) {
      perfilTitle = "Destaque Geral & Mestre de Cesta";
      perfilDesc = "Superou com folga tanto a meta ponderada da escala quanto o padrão geral da loja.";
      badgeColor = "bg-indigo-50 text-indigo-800 border-indigo-300";
    } else if (slpPenetracaoRate >= storeSlpPenetracao * 1.3 && slpQty >= 5) {
      perfilTitle = "Campeão de Venda Sugestiva (SLP)";
      perfilDesc = "Excelente engajamento e conversão de itens SLP no balcão e checkout.";
      badgeColor = "bg-orange-50 text-orange-700 border-orange-200";
    } else if (pa >= paLoja * 1.15 && monoPercent < 35) {
      perfilTitle = "Especialista em Cross-Selling";
      perfilDesc = "Excelente capacidade de vender itens adicionais e montar cestas completas.";
      badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
    } else if (tkm >= tkmLoja * 1.2) {
      perfilTitle = "Fechador de Alto Valor";
      perfilDesc = "Foco em produtos de ticket elevado e vendas de maior margem.";
      badgeColor = "bg-purple-50 text-purple-700 border-purple-200";
    } else if (monoPercent >= 55) {
      perfilTitle = "Atendente de Transação Única";
      perfilDesc = "Alto índice de cupons de 1 item. Necessita de estímulo para venda sugestiva.";
      badgeColor = "bg-rose-50 text-rose-700 border-rose-200";
    } else if (trocasCount > 5 && (trocasPositivasCount / trocasCount) >= 0.6) {
      perfilTitle = "Campeão de Upsell em Trocas";
      perfilDesc = "Transforma trocas simples em oportunidade de vendas adicionais de valor.";
      badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
    }

    // Ações recomendadas de treinamento com DADOS REAIS de Escala, SLP e campanhas
    const recommendations: string[] = [];

    // Recomendação de Escala e Justiça
    if (hasEscalaData) {
      if (justicaHighlight === "JUSTIÇA_POSITIVA") {
        recommendations.push(
          `Reconhecer o mérito tático: O colaborador atingiu a meta ponderada da escala (${pa.toFixed(2)} vs ${metaPonderadaPA.toFixed(2)} PA), demonstrando excelente aproveitamento nos postos de conversão rápida.`
        );
      } else if (justicaHighlight === "ALERTA_AJUSTE") {
        recommendations.push(
          `Ajuste de Salão: O colaborador atuou em postos com meta mais elevada (ex: P3 Salão), mas fechou com PA abaixo da meta ponderada esperada (${pa.toFixed(2)} vs ${metaPonderadaPA.toFixed(2)} PA). Reforçar técnicas de consultoria e agregação no salão.`
        );
      }

      if (bestPosition && bestPosition.cupons >= 3) {
        recommendations.push(
          `Ponto Forte Tático: O colaborador rende mais na posição ${bestPosition.posName} com PA de ${bestPosition.paPos.toFixed(2)} (${bestPosition.atingimentoPosPct.toFixed(0)}% da meta do posto). Priorizar alocação estratégica nessa função em dias de alto fluxo.`
        );
      }

      if (worstPosition && worstPosition.atingimentoPosPct < 95 && worstPosition.cupons >= 3) {
        recommendations.push(
          `Oportunidade de Desenvolvimento: Trabalhar abordagem específica para a posição ${worstPosition.posName} (PA atual: ${worstPosition.paPos.toFixed(2)} vs Meta ${worstPosition.metaPos.toFixed(2)}).`
        );
      }
    }

    // Recomendação SLP com dados empíricos
    if (slpQty === 0) {
      recommendations.push(
        `Oferecer treinamento prático em Venda Sugestiva (SLP) para reduzir cupons de 1 item: o colaborador não possui nenhuma venda de SLP registrada (Média da Loja: ${storeSlpPenetracao.toFixed(1)}% dos cupons).`
      );
    } else if (slpPenetracaoRate < storeSlpPenetracao) {
      recommendations.push(
        `Reforçar a abordagem de Venda Sugestiva (SLP): o colaborador realizou ${slpQty} venda(s) de SLP (${slpPenetracaoRate.toFixed(1)}% dos cupons vs Média da Loja: ${storeSlpPenetracao.toFixed(1)}%).`
      );
    } else if (monoPercent > 40) {
      recommendations.push(
        `Incentivar oferta de SLP no momento da cobrança para converter cupons de 1 item (SLP atual: ${slpQty} itens em ${slpPenetracaoRate.toFixed(1)}% dos cupons).`
      );
    }

    // Recomendação Ação Social
    if (socialPenetracaoRate < storeSocialPenetracao * 0.7) {
      recommendations.push(
        `Estimular oferta de produtos de Ação Social no balcão: realizou ${socialQty} item(ns) (${socialPenetracaoRate.toFixed(1)}% dos cupons vs Média da Loja: ${storeSocialPenetracao.toFixed(1)}%).`
      );
    }

    // Destaque/Recomendação Aging
    if (agingQty > 0) {
      recommendations.push(
        `Manter o foco em produtos da Campanha Aging: ${agingQty} item(ns) desmobilizado(s), resgatando R$ ${agingValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em estoque antigo.`
      );
    }

    // Retiradas & Adicionais
    if (retiradasCount > 0 && adicionaisCount === 0) {
      recommendations.push(
        `Treinar técnica de adicional em retiradas online: atendeu ${retiradasCount} retirada(s) mas não gerou nenhum pedido adicional de balcão.`
      );
    } else if (adicionaisCount > 0) {
      recommendations.push(
        `Ótima conversão em vendas adicionais omnichannel: gerou ${adicionaisCount} pedido(s) adicional(is) totalizando R$ ${adicionaisValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
      );
    }

    if (cpfRate < cpfRateLoja) {
      recommendations.push(`Reforçar a abordagem no caixa para aumentar o cadastro de CPF (Atual: ${cpfRate.toFixed(1)}% vs Média: ${cpfRateLoja.toFixed(1)}%).`);
    }
    if (descontoPercent > storeMetrics.descontoRateLoja * 1.3) {
      recommendations.push("Monitorar concessão excessiva de descontos e orientar sobre valor percebido.");
    }

    if (recommendations.length === 0) {
      recommendations.push("Manter o excelente padrão de atendimento e servir como referência para a equipe.");
    }

    return {
      perfilTitle,
      perfilDesc,
      badgeColor,
      recommendations
    };
  }, [vendorMetrics, storeMetrics, vendorTacticalMetrics, basketBreakdown]);

  // Gerador de Prompt Formatado em Markdown para IA (ChatGPT / Gemini / Claude) com Meta Ponderada e Dispersão
  const generateAIPromptText = () => {
    const { 
      metaPonderadaPA, 
      atingimentoPonderadoPct, 
      diffPA, 
      saldoPecas, 
      isBateuPonderada, 
      justicaHighlight, 
      positionsList, 
      bestPosition, 
      worstPosition,
      hasEscalaData
    } = vendorTacticalMetrics;

    return `PROMPT PARA GERAÇÃO DE FEEDBACK DE DESEMPENHO (IA) - AVALIAÇÃO JUSTA POR META PONDERADA & DISPERSÃO
=======================================================================================================
Você é um Gestor de Vendas especialista em varejo focado em gestão humanizada e justa. 
Utilize os dados empíricos de vendas, a **Meta Ponderada por Escala** e o **Mapeamento de Dispersão (J-Score)** apresentados abaixo para redigir um feedback individualizado, construtivo, motivador e focado em metas para o colaborador: **${selectedVendor}**.

---
### 1. RESUMO GERAL & SCORE DE JUSTIÇA (J-SCORE)
- **Colaborador:** ${selectedVendor}
- **J-Score de Justiça:** ${currentExtendedStats ? `${currentExtendedStats.jScore} / 100` : 'N/A'} (Média da Equipe: ${dispersionStats.teamMeans.jScore} pts)
- **Quadrante de Dispersão:** ${currentExtendedStats ? `${currentExtendedStats.quadrantName} - "${currentExtendedStats.quadrantDesc}"` : 'N/A'}
- **Faturamento Total:** ${vendorMetrics.vendaTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (Média Diária: ${currentExtendedStats ? currentExtendedStats.vendaPorDia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'N/A'}/dia)
- **Participação na Loja (Share):** ${vendorMetrics.shareLoja.toFixed(1)}% (Média por Vendedor: ${storeMetrics.avgVendaPerVendor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
- **Total de Atendimentos (Cupons):** ${vendorMetrics.cuponsTotal} cupons (${currentExtendedStats ? currentExtendedStats.cuponsPorDia.toFixed(1) : 'N/A'} cupons/dia)
- **Total de Peças Vendidas:** ${vendorMetrics.itensTotal} unidades (${currentExtendedStats?.diasTrabalhados || 1} dias trabalhados)

---
### 2. AVALIAÇÃO JUSTA: META PONDERADA POR ESCALA (CRITÉRIO PRINCIPAL)
- **PA Realizado:** ${vendorMetrics.pa.toFixed(2)} peças/cupom
- **Meta Ponderada Individual (P.A.):** ${metaPonderadaPA.toFixed(2)} PA
- **Atingimento da Meta Ponderada:** ${atingimentoPonderadoPct.toFixed(1)}% (${isBateuPonderada ? '✅ META ATINGIDA' : '❌ ABAIXO DA META'})
- **Saldo de Peças (Esperadas vs Realizadas):** ${saldoPecas >= 0 ? `+${saldoPecas.toFixed(1)} peças (Superávit)` : `${saldoPecas.toFixed(1)} peças (Déficit)`}
- **Veredito de Justiça Avaliativa:** ${
  justicaHighlight === 'JUSTIÇA_POSITIVA' 
    ? 'JUSTIÇA POSITIVA: O colaborador bateu a meta ponderada justa calculada para a sua escala de trabalho (ex: atuou mais em postos de giro rápido como Caixa/Porta), embora estivesse numericamente abaixo da média fixa rígida de 1,75.'
    : justicaHighlight === 'SUPERAÇÃO_TOTAL'
    ? 'SUPERAÇÃO TOTAL: Superou tanto a meta ponderada da escala quanto o padrão geral da loja.'
    : justicaHighlight === 'ALERTA_AJUSTE'
    ? 'ALERTA DE OPORTUNIDADE: Atuou em postos de maior potencial de PA (Salão), mas ficou abaixo da meta ponderada esperada para essas posições.'
    : 'ABAIXO DA META: Não atingiu a meta ponderada correspondente aos postos escalados.'
}
${hasEscalaData ? `
- **Composição da Atuação por Posto Tático:**
${positionsList.map(p => `  * ${p.posName}: ${p.cupons} cupons (${vendorMetrics.cuponsTotal > 0 ? ((p.cupons / vendorMetrics.cuponsTotal) * 100).toFixed(0) : 0}% da atuação) | PA: ${p.paPos.toFixed(2)} vs Meta ${p.metaPos.toFixed(2)} (Atingimento: ${p.atingimentoPosPct.toFixed(0)}%)`).join('\n')}
- **Posto onde Mais Rende:** ${bestPosition ? `${bestPosition.posName} (PA ${bestPosition.paPos.toFixed(2)} - ${bestPosition.atingimentoPosPct.toFixed(0)}% da meta)` : 'N/A'}
- **Posto de Oportunidade:** ${worstPosition ? `${worstPosition.posName} (PA ${worstPosition.paPos.toFixed(2)} - ${worstPosition.atingimentoPosPct.toFixed(0)}% da meta)` : 'N/A'}
` : '- *Nota: Escala de trabalho não vinculada. Foi aplicada a meta padrão de 1.75 PA.*'}

---
### 3. ANÁLISE DE OUTLIERS E DESVIOS PADRÃO (Z-SCORE)
${currentExtendedStats?.outliers && currentExtendedStats.outliers.length > 0 ? currentExtendedStats.outliers.map(o => `- **${o.type === 'positive' ? '⭐ DESTAQUE POSITIVO' : '⚠️ GARGALO CRÍTICO'}:** ${o.label} (Z = ${o.zScore > 0 ? `+${o.zScore}` : o.zScore}σ) - ${o.explanation}`).join('\n') : '- *Colaborador dentro do padrão médio da equipe em todas as dimensões avaliadas.*'}

---
### 4. INDICADORES CHAVE COMPLEMENTARES (KPIs)
- **Ticket Médio (TKM):** ${vendorMetrics.tkm.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (Média Loja: ${storeMetrics.tkmLoja.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
- **Taxa de Captura de CPF:** ${vendorMetrics.cpfRate.toFixed(1)}% (Média Loja: ${storeMetrics.cpfRateLoja.toFixed(1)}%)
- **Concessão de Desconto:** R$ ${vendorMetrics.descontoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${vendorMetrics.descontoPercent.toFixed(1)}% das vendas | Média Loja: ${storeMetrics.descontoRateLoja.toFixed(1)}%)
- **Preço Médio por Item:** ${vendorMetrics.precoMedioItem.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}

---
### 5. CAMPANHAS E PRODUTOS ESTRATÉGICOS
- **Venda Sugestiva (SLP):** ${vendorMetrics.slpQty} itens | ${vendorMetrics.slpValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (Penetração: ${vendorMetrics.slpPenetracaoRate.toFixed(1)}% dos cupons vs Loja: ${storeMetrics.storeSlpPenetracao.toFixed(1)}%)
- **Ação Social (Total):** ${vendorMetrics.socialQty} itens | ${vendorMetrics.socialValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (Penetração: ${vendorMetrics.socialPenetracaoRate.toFixed(1)}% dos cupons vs Loja: ${storeMetrics.storeSocialPenetracao.toFixed(1)}%)
  * Detalhamento Ação Social: Sacolas: ${vendorMetrics.sacolaQty} un | Baralhos: ${vendorMetrics.baralhoQty} un | Lanchinho: ${vendorMetrics.lanchinhoQty} un
- **Campanha Aging (Estoque Antigo):** ${vendorMetrics.agingQty} un desmobilizada(s) | R$ ${vendorMetrics.agingValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} resgatado(s) (${vendorMetrics.agingCuponsCount} cupons)
- **Omnichannel:** ${vendorMetrics.retiradasCount} retiradas online atendidas | ${vendorMetrics.adicionaisCount} vendas adicionais geradas (R$ ${vendorMetrics.adicionaisValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})

---
### 6. TAMANHO E PROFUNDIDADE DA CESTA
${basketBreakdown.map(b => `- **${b.name}:** ${b.count} cupons (${b.percent.toFixed(1)}%)`).join('\n')}

---
### 7. QUALIDADE E UPSELL EM TROCAS
- **Total de Trocas Atendidas:** ${vendorMetrics.trocasCount}
- **Diferença de Valor Gerada:** R$ ${vendorMetrics.trocasValorDiferenca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- **Trocas com Upsell (Positivas):** ${vendorMetrics.trocasPositivasCount} (${vendorMetrics.trocasCount > 0 ? ((vendorMetrics.trocasPositivasCount / vendorMetrics.trocasCount) * 100).toFixed(0) : 0}%)
- **Score de Qualidade em Trocas:** ${vendorMetrics.trocasScoreMedio > 0 ? vendorMetrics.trocasScoreMedio.toFixed(1) + '/100' : 'N/A'}

---
### 8. RITMIA E TOP PRODUTOS
- **Hora de Ouro (Pico de Venda):** ${peakHoursInfo.goldHour} (R$ ${peakHoursInfo.goldHourFat.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
- **Hora de Maior PA:** ${peakHoursInfo.bestPaHour} (PA: ${peakHoursInfo.bestPaValue.toFixed(2)})
- **Top 5 Produtos Vendidos:**
${topProducts.map((p, i) => `  ${i + 1}. [Cód ${p.code}] ${p.name} - ${p.qtd} un (R$ ${p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`).join('\n')}

---
### 9. POTENCIAL FINANCEIRO DE CRESCIMENTO (GANHO ADICIONAL)
- **Potencial Total Combinado:** + R$ ${financialProjections.potencialTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- **Equiparação ao TKM Médio da Loja:** + R$ ${financialProjections.ganhoTkmLoja.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- **Atingimento da Meta Ponderada Justa:** ${financialProjections.ganhoMetaPonderada > 0 ? `+ R$ ${financialProjections.ganhoMetaPonderada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (+ ${financialProjections.pecasNecessariasPonderada} peças)` : 'Meta já superada!'}
- **Conversão de 30% dos Cupons Mono-item em 2 itens:** + R$ ${financialProjections.ganhoConversaoMono.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${financialProjections.monoConvertedCount} cupons)

---
### 10. DIAGNÓSTICO E RECOMENDAÇÕES PRÁTICAS
- **Perfil Calculado:** ${behavioralDiagnosis.perfilTitle} - "${behavioralDiagnosis.perfilDesc}"
- **Plano de Ação Recomendado:**
${behavioralDiagnosis.recommendations.map(r => `- ${r}`).join('\n')}
`;
  };

  // Gerador de Payload JSON Estruturado com Meta Ponderada e Dispersão
  const generateJSONPayload = () => {
    return JSON.stringify({
      colaborador: selectedVendor,
      dataExportacao: new Date().toISOString(),
      scoreJustica: currentExtendedStats ? {
        jScore: currentExtendedStats.jScore,
        quadrante: currentExtendedStats.quadrantKey,
        nomeQuadrante: currentExtendedStats.quadrantName,
        descricaoQuadrante: currentExtendedStats.quadrantDesc,
        vendaPorDia: currentExtendedStats.vendaPorDia,
        cuponsPorDia: currentExtendedStats.cuponsPorDia,
        diasTrabalhados: currentExtendedStats.diasTrabalhados,
        zScores: currentExtendedStats.zScores,
        outliers: currentExtendedStats.outliers,
        radarDimensions: currentExtendedStats.radarDimensions
      } : null,
      avaliacaoPonderadaPorEscala: {
        temEscalaVinculada: vendorTacticalMetrics.hasEscalaData,
        arquivoEscala: vendorTacticalMetrics.escalaFilename || null,
        paRealizado: Number(vendorMetrics.pa.toFixed(2)),
        metaPonderadaPA: Number(vendorTacticalMetrics.metaPonderadaPA.toFixed(2)),
        atingimentoPonderadoPercent: Number(vendorTacticalMetrics.atingimentoPonderadoPct.toFixed(2)),
        saldoPecas: Number(vendorTacticalMetrics.saldoPecas.toFixed(1)),
        isBateuPonderada: vendorTacticalMetrics.isBateuPonderada,
        justicaHighlight: vendorTacticalMetrics.justicaHighlight,
        postosTrabalhados: vendorTacticalMetrics.positionsList.map(p => ({
          posicao: p.posKey,
          nomePosicao: p.posName,
          cupons: p.cupons,
          itens: p.itens,
          venda: p.venda,
          metaPosicao: p.metaPos,
          paRealizado: Number(p.paPos.toFixed(2)),
          atingimentoPercent: Number(p.atingimentoPosPct.toFixed(2)),
          diasTrabalhados: p.daysWorked.size
        })),
        ondeMaisRende: vendorTacticalMetrics.bestPosition ? {
          posicao: vendorTacticalMetrics.bestPosition.posKey,
          nome: vendorTacticalMetrics.bestPosition.posName,
          pa: Number(vendorTacticalMetrics.bestPosition.paPos.toFixed(2)),
          atingimentoPercent: Number(vendorTacticalMetrics.bestPosition.atingimentoPosPct.toFixed(2))
        } : null,
        pontoAtencao: vendorTacticalMetrics.worstPosition ? {
          posicao: vendorTacticalMetrics.worstPosition.posKey,
          nome: vendorTacticalMetrics.worstPosition.posName,
          pa: Number(vendorTacticalMetrics.worstPosition.paPos.toFixed(2)),
          atingimentoPercent: Number(vendorTacticalMetrics.worstPosition.atingimentoPosPct.toFixed(2))
        } : null,
      },
      metricasGerais: {
        vendaTotal: vendorMetrics.vendaTotal,
        cuponsTotal: vendorMetrics.cuponsTotal,
        itensTotal: vendorMetrics.itensTotal,
        shareLojaPercent: Number(vendorMetrics.shareLoja.toFixed(2)),
        tkm: Number(vendorMetrics.tkm.toFixed(2)),
        pa: Number(vendorMetrics.pa.toFixed(2)),
        cpfRatePercent: Number(vendorMetrics.cpfRate.toFixed(2)),
        descontoTotal: vendorMetrics.descontoTotal,
        descontoPercent: Number(vendorMetrics.descontoPercent.toFixed(2)),
        precoMedioItem: Number(vendorMetrics.precoMedioItem.toFixed(2)),
      },
      benchmarksLoja: {
        vendaMediaColaborador: storeMetrics.avgVendaPerVendor,
        tkmLoja: storeMetrics.tkmLoja,
        paLoja: storeMetrics.paLoja,
        cpfRateLojaPercent: storeMetrics.cpfRateLoja,
        topVendorName: storeMetrics.topVendorName,
        topVendorTkm: storeMetrics.topVendorTkm,
        topVendorPa: storeMetrics.topVendorPa,
      },
      campanhasEstrategicas: {
        slp: {
          quantidade: vendorMetrics.slpQty,
          valor: vendorMetrics.slpValor,
          penetracaoPercent: Number(vendorMetrics.slpPenetracaoRate.toFixed(2)),
          penetracaoLojaPercent: Number(storeMetrics.storeSlpPenetracao.toFixed(2))
        },
        acaoSocial: {
          totalQuantidade: vendorMetrics.socialQty,
          totalValor: vendorMetrics.socialValor,
          penetracaoPercent: Number(vendorMetrics.socialPenetracaoRate.toFixed(2)),
          penetracaoLojaPercent: Number(storeMetrics.storeSocialPenetracao.toFixed(2)),
          breakdown: {
            sacolas: { quantidade: vendorMetrics.sacolaQty, valor: vendorMetrics.sacolaValor },
            baralhos: { quantidade: vendorMetrics.baralhoQty, valor: vendorMetrics.baralhoValor },
            lanchinho: { quantidade: vendorMetrics.lanchinhoQty, valor: vendorMetrics.lanchinhoValor },
          }
        },
        aging: {
          quantidade: vendorMetrics.agingQty,
          valor: vendorMetrics.agingValor,
          cupons: vendorMetrics.agingCuponsCount,
          penetracaoPercent: Number(vendorMetrics.agingPenetracaoRate.toFixed(2))
        },
        omnichannel: {
          retiradasOnline: vendorMetrics.retiradasCount,
          vendasAdicionaisCount: vendorMetrics.adicionaisCount,
          vendasAdicionaisValor: vendorMetrics.adicionaisValor,
        }
      },
      distribuicaoCesta: basketBreakdown,
      qualidadeTrocas: {
        trocasCount: vendorMetrics.trocasCount,
        valorDiferenca: vendorMetrics.trocasValorDiferenca,
        trocasPositivasCount: vendorMetrics.trocasPositivasCount,
        scoreMedio: vendorMetrics.trocasScoreMedio
      },
      projeçãoPotencialFinanceiro: financialProjections,
      horariosERitmia: {
        horaDeOuro: peakHoursInfo.goldHour,
        faturamentoHoraDeOuro: peakHoursInfo.goldHourFat,
        melhorPaHora: peakHoursInfo.bestPaHour,
        melhorPaValor: peakHoursInfo.bestPaValue
      },
      topProdutos: topProducts,
      diagnosticoComportamental: {
        perfil: behavioralDiagnosis.perfilTitle,
        descricao: behavioralDiagnosis.perfilDesc,
        recomendacoes: behavioralDiagnosis.recommendations
      }
    }, null, 2);
  };

  const handleCopyAIPrompt = () => {
    const text = generateAIPromptText();
    navigator.clipboard.writeText(text);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2500);
  };

  const handleDownloadJSON = () => {
    const jsonStr = generateJSONPayload();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `raiox_${(selectedVendor || "colaborador").replace(/\s+/g, "_").toLowerCase()}_analise.json`;
    a.click();
    URL.revokeObjectURL(url);
    setCopiedJSON(true);
    setTimeout(() => setCopiedJSON(false), 2500);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* SELETOR SUPERIOR DE COLABORADOR & STATUS DE ESCALA */}
      <Card className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-none shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
        <CardContent className="p-6 md:p-8 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider border border-indigo-500/30">
                  <UserCheck className="w-4 h-4 text-indigo-400" />
                  Diagnóstico Individual 360°
                </div>

                {vendorTacticalMetrics.hasEscalaData ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Escala Vinculada ({escalaStore?.escalas.length} reg.)</span>
                  </div>
                ) : (
                  <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 cursor-pointer hover:bg-amber-500/30 transition-colors">
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isUploadingEscala ? "Vinculando..." : "Vincular Escala RH"}</span>
                    <input type="file" accept=".json" className="hidden" onChange={handleEscalaUpload} />
                  </label>
                )}
              </div>

              <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-white tracking-tight">
                Raio-X do Colaborador
              </h2>
              <p className="text-slate-300 text-xs md:text-sm max-w-xl font-medium">
                Avaliação individual justa por postos táticos de escala (P1, P2, P3, DIG), ritmia horária, profundidade de cesta e potencial financeiro.
              </p>
            </div>

            {/* SELETOR COM BUSCA E BOTÕES DE EXPORTAÇÃO */}
            <div className="w-full lg:w-auto space-y-3 flex flex-col items-start lg:items-end">
              <div className="w-full lg:w-80 space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Colaborador Selecionado:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={selectedVendor}
                    onChange={(e) => setSelectedVendor(e.target.value)}
                    className="w-full bg-slate-800/90 text-white border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                  >
                    {vendorSummaryList.map(v => (
                      <option key={v.name} value={v.name}>
                        {v.name} • {v.venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({v.cupons} cupons)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* BOTÕES DE EXPORTAÇÃO */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={handleCopyAIPrompt}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 h-9"
                >
                  {copiedMarkdown ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-indigo-200" />
                      <span>Copiar Resumo para IA (Feedback)</span>
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleDownloadJSON}
                  size="sm"
                  variant="outline"
                  className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 h-9"
                >
                  {copiedJSON ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Baixado!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 text-slate-300" />
                      <span>Baixar JSON</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NAVEGAÇÃO DE ABAS DO RAIO-X */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3 overflow-x-auto">
        <Button
          onClick={() => setActiveTab("INDIVIDUAL")}
          variant="ghost"
          className={cn(
            "text-xs md:text-sm font-extrabold rounded-2xl h-11 px-5 transition-all flex items-center gap-2 shrink-0",
            activeTab === "INDIVIDUAL"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
              : "bg-white/80 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
          )}
        >
          <UserCheck className="w-4 h-4" />
          <span>Raio-X Individual 360° ({selectedVendor})</span>
        </Button>

        <Button
          onClick={() => setActiveTab("DISPERSION")}
          variant="ghost"
          className={cn(
            "text-xs md:text-sm font-extrabold rounded-2xl h-11 px-5 transition-all flex items-center gap-2 shrink-0",
            activeTab === "DISPERSION"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
              : "bg-white/80 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
          )}
        >
          <Scale className="w-4 h-4" />
          <span>Dispersão & Equipe (4 Quadrantes)</span>
          <Badge className="ml-1 bg-indigo-500/20 text-indigo-700 font-extrabold text-[10px]">
            {dispersionStats.collaborators.length}
          </Badge>
        </Button>

        <Button
          onClick={() => setActiveTab("HEAD_TO_HEAD")}
          variant="ghost"
          className={cn(
            "text-xs md:text-sm font-extrabold rounded-2xl h-11 px-5 transition-all flex items-center gap-2 shrink-0",
            activeTab === "HEAD_TO_HEAD"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
              : "bg-white/80 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
          )}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Comparativo Head-to-Head</span>
        </Button>
      </div>

      {/* ABA 2: DISPERSÃO E MATRIZ DE EQUIPE */}
      {activeTab === "DISPERSION" && (
        <CollaboratorTeamDispersion
          dispersionStats={dispersionStats}
          selectedVendor={selectedVendor}
          onSelectVendor={(vendor) => {
            setSelectedVendor(vendor);
            setActiveTab("INDIVIDUAL");
          }}
        />
      )}

      {/* ABA 3: COMPARATIVO HEAD-TO-HEAD */}
      {activeTab === "HEAD_TO_HEAD" && (
        <CollaboratorHeadToHead
          dispersionStats={dispersionStats}
          selectedVendorA={selectedVendor}
          onSelectVendorA={(vendor) => setSelectedVendor(vendor)}
        />
      )}

      {/* ABA 1: RAIO-X INDIVIDUAL 360° */}
      {activeTab === "INDIVIDUAL" && (
        <div className="space-y-6">
          {/* BANNER DE OUTLIERS E SCORE DE JUSTIÇA (SE HOUVER) */}
          {currentExtendedStats && currentExtendedStats.outliers.length > 0 && (
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wide text-indigo-950 flex items-center gap-2">
                    <span>Posicionamento Estatístico da Equipe:</span>
                    <Badge className={cn("font-bold text-[10px] border", currentExtendedStats.quadrantBadgeClass)}>
                      {currentExtendedStats.quadrantName}
                    </Badge>
                  </h4>
                  <p className="text-xs text-indigo-800 mt-0.5">
                    J-Score Justo: <strong className="font-black text-indigo-950">{currentExtendedStats.jScore}/100</strong> • 
                    Média Diária: <strong className="font-bold">{currentExtendedStats.vendaPorDia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/dia</strong> ({currentExtendedStats.cuponsPorDia.toFixed(1)} cup./dia)
                  </p>
                </div>
              </div>

              {/* BADGES DE OUTLIERS DETECTADOS */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {currentExtendedStats.outliers.map((o, idx) => (
                  <Badge 
                    key={idx} 
                    className={cn(
                      "font-bold text-[10px] flex items-center gap-1 py-1 px-2.5 shadow-2xs",
                      o.type === "positive" 
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300" 
                        : "bg-rose-100 text-rose-800 border-rose-300"
                    )}
                    title={o.explanation}
                  >
                    {o.type === "positive" ? "⭐" : "⚠️"} {o.label} ({o.zScore > 0 ? `+${o.zScore}` : o.zScore}σ)
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* HEADER DE INDICADORES DO COLABORADOR COM COMPARATIVO (BENCHMARKING) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: VENDA TOTAL & SHARE */}
            <Card className="bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs hover:shadow-md transition-all">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Faturamento Total</span>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-headline font-extrabold text-slate-900">
                    {vendorMetrics.vendaTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1">
                    <span>Participação na Loja:</span>
                    <span className="font-bold text-indigo-600">{vendorMetrics.shareLoja.toFixed(1)}%</span>
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium flex items-center justify-between">
                  <span>Média da Loja:</span>
                  <span className="font-bold text-slate-700">{storeMetrics.avgVendaPerVendor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              </CardContent>
            </Card>

            {/* KPI 2: TICKET MÉDIO (TKM) VS LOJA E LÍDER */}
            <Card className="bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs hover:shadow-md transition-all">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ticket Médio (TKM)</span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-headline font-extrabold text-slate-900">
                      {vendorMetrics.tkm.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </h3>
                    {vendorMetrics.tkm >= storeMetrics.tkmLoja ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                        + {(((vendorMetrics.tkm - storeMetrics.tkmLoja) / (storeMetrics.tkmLoja || 1)) * 100).toFixed(0)}% vs Média
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                        {(((vendorMetrics.tkm - storeMetrics.tkmLoja) / (storeMetrics.tkmLoja || 1)) * 100).toFixed(0)}% vs Média
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-500 mt-1">
                    {vendorMetrics.cuponsTotal} atendimentos realizados
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium flex items-center justify-between">
                  <span>Líder da Loja:</span>
                  <span className="font-bold text-slate-700">{storeMetrics.topVendorTkm.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              </CardContent>
            </Card>

            {/* KPI 3: PEÇAS POR ATENDIMENTO (PA) & META PONDERADA JUSTA */}
            <Card className="bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs hover:shadow-md transition-all">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">PA & Meta Ponderada</span>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Scale className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-headline font-extrabold text-slate-900">
                      {vendorMetrics.pa.toFixed(2)}
                    </h3>
                    <span className="text-xs font-bold text-slate-400">
                      / Meta {vendorTacticalMetrics.metaPonderadaPA.toFixed(2)}
                    </span>
                    {vendorTacticalMetrics.justicaHighlight === "JUSTIÇA_POSITIVA" && (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-extrabold inline-flex items-center gap-0.5" title="Bateu a meta ponderada da escala!">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        Meta Atingida!
                      </Badge>
                    )}
                    {vendorTacticalMetrics.justicaHighlight === "SUPERAÇÃO_TOTAL" && (
                      <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 text-[10px] font-extrabold inline-flex items-center gap-0.5">
                        <Award className="w-3 h-3 text-indigo-600" />
                        Superou Tudo
                      </Badge>
                    )}
                    {vendorTacticalMetrics.justicaHighlight === "ALERTA_AJUSTE" && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-extrabold inline-flex items-center gap-0.5" title="Abaixo do potencial esperado para os postos trabalhados">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        Abaixo Posto
                      </Badge>
                    )}
                    {vendorTacticalMetrics.justicaHighlight === "ABAIXO" && (
                      <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-extrabold inline-flex items-center gap-0.5">
                        <TrendingDown className="w-3 h-3 text-rose-600" />
                        {vendorTacticalMetrics.atingimentoPonderadoPct.toFixed(0)}% Meta
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mt-1">
                    <span>Atingimento da Escala:</span>
                    <span className={cn("font-extrabold", vendorTacticalMetrics.isBateuPonderada ? "text-emerald-600" : "text-rose-600")}>
                      {vendorTacticalMetrics.atingimentoPonderadoPct.toFixed(1)}% ({vendorTacticalMetrics.saldoPecas >= 0 ? `+${vendorTacticalMetrics.saldoPecas.toFixed(1)}` : vendorTacticalMetrics.saldoPecas.toFixed(1)} un)
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium flex items-center justify-between">
                  <span>Média Fixa Loja:</span>
                  <span className="font-bold text-slate-700">{storeMetrics.paLoja.toFixed(2)} PA</span>
                </div>
              </CardContent>
            </Card>

            {/* KPI 4: CAPTURA DE CPF & FIDELIDADE */}
            <Card className="bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs hover:shadow-md transition-all">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Captura de CPF</span>
                  <div className="p-2 bg-violet-50 text-violet-600 rounded-xl">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-headline font-extrabold text-slate-900">
                      {vendorMetrics.cpfRate.toFixed(1)}%
                    </h3>
                    {vendorMetrics.cpfRate >= storeMetrics.cpfRateLoja ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold inline-flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-emerald-600" />
                        Acima Média
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold inline-flex items-center gap-1">
                        <TrendingDown className="w-3 h-3 text-rose-600" />
                        Abaixo Média
                      </Badge>
                    )}
                  </div>
                  <Progress value={vendorMetrics.cpfRate} className="h-2 mt-2 bg-slate-100" />
                </div>
                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium flex items-center justify-between">
                  <span>Média da Loja:</span>
                  <span className="font-bold text-slate-700">{storeMetrics.cpfRateLoja.toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SEÇÃO PRINCIPAL DE JUSTIÇA: DESEMPENHO TÁTICO POR POSTO / ESCALA */}
          <Card className="bg-gradient-to-br from-indigo-950/90 via-slate-900 to-slate-950 text-white border-none shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-[90px] pointer-events-none" />
            <CardHeader className="p-6 md:p-8 pb-4 relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider border border-indigo-500/30">
                    <Scale className="w-3.5 h-3.5 text-indigo-400" />
                    Avaliação Ponderada por Posto Tático
                  </div>
                  <CardTitle className="text-xl md:text-2xl font-headline font-extrabold text-white flex items-center gap-2.5">
                    Desempenho Tático por Escala ({selectedVendor})
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm text-slate-300 font-medium max-w-2xl">
                    Avaliamos cada colaborador com base na sua rotina real nos postos de trabalho (Caixa, Porta, Salão e Retirada), garantindo justiça e mérito real.
                  </CardDescription>
                </div>

                {/* STATUS DO ARQUIVO DE ESCALA */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-xl">
                    <CalendarCheck className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status da Escala</span>
                    <p className="text-xs font-bold text-white">
                      {vendorTacticalMetrics.hasEscalaData 
                        ? `${escalaStore?.escalas.length} escalas processadas` 
                        : "Escala Padrão Aplicada"}
                    </p>
                    <span className="text-[10px] text-indigo-300 block">
                      {vendorTacticalMetrics.totalDiasTrabalhados} dia(s) com vendas
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 md:p-8 pt-2 space-y-6 relative z-10">
              {/* VEREDITO PEDAGÓGICO DE JUSTIÇA AVALIATIVA */}
              <div className={cn(
                "p-5 rounded-2xl border backdrop-blur-md transition-all",
                vendorTacticalMetrics.justicaHighlight === "JUSTIÇA_POSITIVA" && "bg-emerald-950/40 border-emerald-500/40 text-emerald-200",
                vendorTacticalMetrics.justicaHighlight === "SUPERAÇÃO_TOTAL" && "bg-indigo-950/40 border-indigo-500/40 text-indigo-200",
                vendorTacticalMetrics.justicaHighlight === "ALERTA_AJUSTE" && "bg-amber-950/40 border-amber-500/40 text-amber-200",
                vendorTacticalMetrics.justicaHighlight === "ABAIXO" && "bg-rose-950/40 border-rose-500/40 text-rose-200"
              )}>
                <div className="flex items-start gap-3.5">
                  <div className={cn(
                    "p-2 rounded-xl shrink-0 mt-0.5",
                    vendorTacticalMetrics.justicaHighlight === "JUSTIÇA_POSITIVA" && "bg-emerald-500/20 text-emerald-300",
                    vendorTacticalMetrics.justicaHighlight === "SUPERAÇÃO_TOTAL" && "bg-indigo-500/20 text-indigo-300",
                    vendorTacticalMetrics.justicaHighlight === "ALERTA_AJUSTE" && "bg-amber-500/20 text-amber-300",
                    vendorTacticalMetrics.justicaHighlight === "ABAIXO" && "bg-rose-500/20 text-rose-300"
                  )}>
                    {vendorTacticalMetrics.isBateuPonderada ? (
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-extrabold uppercase tracking-wide text-white">
                        {vendorTacticalMetrics.justicaHighlight === "JUSTIÇA_POSITIVA" && "⚖️ Veredito Justo: Meta Atingida pela Escala"}
                        {vendorTacticalMetrics.justicaHighlight === "SUPERAÇÃO_TOTAL" && "🏆 Superação Global: Acima de Todas as Metas"}
                        {vendorTacticalMetrics.justicaHighlight === "ALERTA_AJUSTE" && "⚠️ Oportunidade de Salão: Abaixo do Potencial do Posto"}
                        {vendorTacticalMetrics.justicaHighlight === "ABAIXO" && "📉 Abaixo da Meta Ponderada Justa"}
                      </h4>
                      <Badge className="bg-white/20 text-white font-bold text-[10px] border-none px-2 py-0.5">
                        Meta Justa: {vendorTacticalMetrics.metaPonderadaPA.toFixed(2)} PA • Realizado: {vendorMetrics.pa.toFixed(2)} PA
                      </Badge>
                    </div>
                    <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-normal">
                      {vendorTacticalMetrics.justicaHighlight === "JUSTIÇA_POSITIVA" && (
                        <>
                          O colaborador atuou predominantemente em postos de conversão rápida e alto giro ({vendorTacticalMetrics.primaryPosition?.posName || "Caixa/Porta"}). 
                          Seu PA de <strong className="text-white font-extrabold">{vendorMetrics.pa.toFixed(2)}</strong> superou a meta ponderada justa de <strong className="text-white font-extrabold">{vendorTacticalMetrics.metaPonderadaPA.toFixed(2)} PA</strong>, 
                          gerando um saldo positivo de <strong className="text-emerald-300 font-extrabold">+{vendorTacticalMetrics.saldoPecas.toFixed(1)} peças</strong>. 
                          Julgá-lo pela meta fixa genérica de 1.75 seria injusto e desmotivador!
                        </>
                      )}
                      {vendorTacticalMetrics.justicaHighlight === "SUPERAÇÃO_TOTAL" && (
                        <>
                          Excelente desempenho global! O colaborador atingiu <strong className="text-white font-extrabold">{vendorMetrics.pa.toFixed(2)} PA</strong>, 
                          superando tanto a meta ponderada da sua escala (<strong className="text-white font-extrabold">{vendorTacticalMetrics.metaPonderadaPA.toFixed(2)} PA</strong>) 
                          quanto a média geral da loja, entregando um saldo de <strong className="text-emerald-300 font-extrabold">+{vendorTacticalMetrics.saldoPecas.toFixed(1)} peças</strong>.
                        </>
                      )}
                      {vendorTacticalMetrics.justicaHighlight === "ALERTA_AJUSTE" && (
                        <>
                          O colaborador atuou em postos que exigem maior agregação e consultoria (ex: Salão), mas seu PA realizado de <strong className="text-white font-extrabold">{vendorMetrics.pa.toFixed(2)}</strong> ficou abaixo da meta ponderada esperada para suas posições (<strong className="text-white font-extrabold">{vendorTacticalMetrics.metaPonderadaPA.toFixed(2)} PA</strong>), 
                          com déficit de <strong className="text-amber-300 font-extrabold">{vendorTacticalMetrics.saldoPecas.toFixed(1)} peças</strong>.
                        </>
                      )}
                      {vendorTacticalMetrics.justicaHighlight === "ABAIXO" && (
                        <>
                          O colaborador realizou <strong className="text-white font-extrabold">{vendorMetrics.pa.toFixed(2)} PA</strong> frente à meta ponderada de <strong className="text-white font-extrabold">{vendorTacticalMetrics.metaPonderadaPA.toFixed(2)} PA</strong> ({vendorTacticalMetrics.atingimentoPonderadoPct.toFixed(1)}% de atingimento), 
                          com déficit de <strong className="text-rose-300 font-extrabold">{vendorTacticalMetrics.saldoPecas.toFixed(1)} peças</strong> nos {vendorMetrics.cuponsTotal} atendimentos.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* GRID DE POSTOS TÁTICOS TRABALHADOS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    Detalhamento dos Postos Escalados
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {vendorTacticalMetrics.positionsList.length} posto(s) registrado(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {vendorTacticalMetrics.positionsList.map(pos => {
                    const isBest = vendorTacticalMetrics.bestPosition?.posKey === pos.posKey && pos.cupons >= 2;
                    const isWorst = vendorTacticalMetrics.worstPosition?.posKey === pos.posKey && pos.cupons >= 2 && pos.atingimentoPosPct < 100;
                    const shareCupons = vendorMetrics.cuponsTotal > 0 ? (pos.cupons / vendorMetrics.cuponsTotal) * 100 : 0;

                    return (
                      <div key={pos.posKey} className="bg-white/5 hover:bg-white/10 rounded-2xl p-4 border border-white/10 space-y-3 transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <Badge className="bg-indigo-500/30 text-indigo-200 border-indigo-400/30 font-bold text-xs">
                              {pos.posName}
                            </Badge>
                            {isBest && (
                              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[9px] font-extrabold flex items-center gap-0.5">
                                ⭐ Onde Mais Rende
                              </Badge>
                            )}
                            {isWorst && (
                              <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-[9px] font-extrabold flex items-center gap-0.5">
                                ⚠️ Ponto Atenção
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-baseline justify-between">
                              <span className="text-[11px] font-semibold text-slate-400">PA Realizado:</span>
                              <span className={cn("text-lg font-headline font-black", pos.paPos >= pos.metaPos ? "text-emerald-400" : "text-rose-400")}>
                                {pos.paPos.toFixed(2)} <span className="text-xs text-slate-400 font-medium">/ {pos.metaPos.toFixed(2)}</span>
                              </span>
                            </div>
                            <Progress value={Math.min(100, pos.atingimentoPosPct)} className="h-1.5 bg-white/10" />
                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                              <span>Atingimento:</span>
                              <span className="font-bold text-slate-200">{pos.atingimentoPosPct.toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2.5 border-t border-white/10 space-y-1 text-[11px]">
                          <div className="flex items-center justify-between text-slate-300">
                            <span>Cupons ({shareCupons.toFixed(0)}% da rotina):</span>
                            <span className="font-bold text-white">{pos.cupons} un</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-300">
                            <span>Faturamento no Posto:</span>
                            <span className="font-bold text-indigo-300">{pos.venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-400 text-[10px]">
                            <span>Dias no Posto:</span>
                            <span className="font-medium text-slate-200">{pos.daysWorked.size} dia(s)</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* RADAR 6D DE HABILIDADES MULTIDIMENSIONAIS DO COLABORADOR */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-6 bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-headline font-bold text-slate-900 flex items-center gap-2">
                      <Scale className="w-5 h-5 text-indigo-600" />
                      Radar de Habilidades 6D ({selectedVendor})
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Mapeamento das 6 dimensões normalizadas de desempenho.
                    </CardDescription>
                  </div>
                  {currentExtendedStats && (
                    <Badge className={cn("text-[10px] font-bold border", currentExtendedStats.quadrantBadgeClass)}>
                      {currentExtendedStats.quadrantName}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={individualRadarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 700, fill: "#475569" }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                      <Radar name={selectedVendor} dataKey="Colaborador" stroke="#6366f1" fill="#6366f1" fillOpacity={0.45} strokeWidth={2} />
                      <RechartsTooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* DIAGNÓSTICO COMPORTAMENTAL & RECOMENDAÇÕES */}
            <Card className="lg:col-span-6 bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-headline font-bold text-slate-900 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-indigo-600" />
                  Diagnóstico & Recomendações
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Plano direcionado com base na rotina e no J-Score.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-indigo-800 tracking-wider">Perfil Calculado:</span>
                    <Badge className={cn("font-bold text-xs px-2.5 py-0.5", behavioralDiagnosis.badgeColor)}>
                      {behavioralDiagnosis.perfilTitle}
                    </Badge>
                  </div>
                  <p className="text-xs font-semibold text-indigo-900 leading-relaxed pt-1">
                    {behavioralDiagnosis.perfilDesc}
                  </p>
                </div>

                <div className="space-y-2">
                  <h5 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Plano de Ação Recomendado:
                  </h5>
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {behavioralDiagnosis.recommendations.map((rec, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs font-medium text-slate-700 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* BLOCO DE GANHO DE OPORTUNIDADE FINANCEIRA PROJETADA */}
          <Card className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white border-none shadow-lg overflow-hidden">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold uppercase tracking-wider border border-emerald-500/30">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    Potencial Financeiro Destravável
                  </div>
                  <h3 className="text-xl md:text-2xl font-headline font-extrabold text-white">
                    Projeção de Faturamento Adicional
                  </h3>
                  <p className="text-xs md:text-sm text-slate-300 font-medium leading-relaxed">
                    Estimativa financeira calculada com base na meta ponderada justa da escala de {selectedVendor}, equiparação de TKM e conversão de mono-itens.
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-right min-w-[280px]">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 block mb-1">
                    Ganho Potencial Combinado
                  </span>
                  <div className="text-3xl md:text-4xl font-headline font-extrabold text-emerald-400">
                    + {financialProjections.potencialTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <span className="text-[11px] font-medium text-slate-300 block mt-1">
                    Com a mesma quantidade de clientes atendidos
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Se TKM atingisse a Média da Loja:</span>
                  <p className="text-lg font-bold text-white">
                    + {financialProjections.ganhoTkmLoja.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    (Diferença de TKM: R$ {Math.max(0, storeMetrics.tkmLoja - vendorMetrics.tkm).toFixed(2)})
                  </span>
                </div>

                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Meta Ponderada da Escala:</span>
                  <p className="text-lg font-bold text-white">
                    {financialProjections.ganhoMetaPonderada > 0 ? (
                      `+ ${financialProjections.ganhoMetaPonderada.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                    ) : (
                      "Meta Já Atingida! 🎉"
                    )}
                  </p>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {financialProjections.ganhoMetaPonderada > 0 
                      ? `(+ ${financialProjections.pecasNecessariasPonderada} peças para a meta justa)`
                      : `(Saldo positivo: +${vendorTacticalMetrics.saldoPecas.toFixed(1)} peças)`}
                  </span>
                </div>

                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Convertendo 30% dos Cupons 1 Item:</span>
                  <p className="text-lg font-bold text-white">
                    + {financialProjections.ganhoConversaoMono.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    ({financialProjections.monoConvertedCount} atendimentos de 1 item transformados em 2 itens)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO DE CAMPANHAS E PRODUTOS ESTRATÉGICOS */}
          <Card className="bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg font-headline font-bold text-slate-900 flex items-center gap-2">
                    <Target className="w-5 h-5 text-orange-600" />
                    Engajamento em Campanhas & Produtos Estratégicos
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Desempenho detalhado do colaborador ({selectedVendor}) na venda de produtos de incentivo, campanhas e checkout.
                  </CardDescription>
                </div>
                <Badge className="bg-orange-100 text-orange-800 border-orange-200 font-extrabold text-xs w-fit">
                  Auditoria de Ofertas & Venda Sugestiva
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* CARD 1: SLP (VENDA SUGESTIVA) */}
                <div className="p-4 rounded-2xl bg-orange-50/80 border border-orange-200/80 space-y-2.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-orange-900 uppercase tracking-wider flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-orange-600" />
                      SLP (Sugestiva)
                    </span>
                    <Badge className={cn("text-[9px] font-black border-none px-1.5 h-5 flex items-center gap-0.5", vendorMetrics.slpPenetracaoRate >= storeMetrics.storeSlpPenetracao ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")}>
                      {vendorMetrics.slpPenetracaoRate >= storeMetrics.storeSlpPenetracao ? (
                        <><TrendingUp className="w-2.5 h-2.5 text-emerald-700" /> Acima Média</>
                      ) : (
                        <><TrendingDown className="w-2.5 h-2.5 text-rose-700" /> Abaixo Média</>
                      )}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-2xl font-headline font-extrabold text-slate-900">
                      {vendorMetrics.slpQty} <span className="text-xs font-semibold text-slate-500">itens</span>
                    </div>
                    <p className="text-xs font-bold text-orange-700 mt-0.5">
                      {vendorMetrics.slpValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-orange-200/60 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 font-semibold">Penetração Cupons:</span>
                      <span className="font-extrabold text-slate-900">{vendorMetrics.slpPenetracaoRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Média da Loja:</span>
                      <span className="font-bold text-slate-700">{storeMetrics.storeSlpPenetracao.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* CARD 2: AÇÃO SOCIAL (SACOLAS, BARALHOS, LANCHINHO) */}
                <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200/80 space-y-2.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-rose-600" />
                      Ação Social Total
                    </span>
                    <Badge className={cn("text-[9px] font-black border-none px-1.5 h-5 flex items-center gap-0.5", vendorMetrics.socialPenetracaoRate >= storeMetrics.storeSocialPenetracao ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")}>
                      {vendorMetrics.socialPenetracaoRate >= storeMetrics.storeSocialPenetracao ? (
                        <><TrendingUp className="w-2.5 h-2.5 text-emerald-700" /> Acima Média</>
                      ) : (
                        <><TrendingDown className="w-2.5 h-2.5 text-rose-700" /> Abaixo Média</>
                      )}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-2xl font-headline font-extrabold text-slate-900">
                      {vendorMetrics.socialQty} <span className="text-xs font-semibold text-slate-500">itens</span>
                    </div>
                    <p className="text-xs font-bold text-rose-700 mt-0.5">
                      {vendorMetrics.socialValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>

                  {/* DETALHAMENTO DAS CATEGORIAS SOCIAL */}
                  <div className="space-y-1 py-1.5 border-t border-rose-200/60 text-[11px]">
                    <div className="flex items-center justify-between font-medium text-slate-700">
                      <span className="text-slate-600">Sacolas:</span>
                      <span className="font-bold text-slate-900">{vendorMetrics.sacolaQty} un ({vendorMetrics.sacolaValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</span>
                    </div>
                    <div className="flex items-center justify-between font-medium text-slate-700">
                      <span className="text-slate-600">Baralhos:</span>
                      <span className="font-bold text-slate-900">{vendorMetrics.baralhoQty} un ({vendorMetrics.baralhoValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</span>
                    </div>
                    <div className="flex items-center justify-between font-medium text-slate-700">
                      <span className="text-slate-600">Lanchinho:</span>
                      <span className="font-bold text-slate-900">{vendorMetrics.lanchinhoQty} un ({vendorMetrics.lanchinhoValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-rose-200/60 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 font-semibold">Penetração Cupons:</span>
                      <span className="font-extrabold text-slate-900">{vendorMetrics.socialPenetracaoRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Média da Loja:</span>
                      <span className="font-bold text-slate-700">{storeMetrics.storeSocialPenetracao.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* CARD 3: ITENS AGING */}
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-2.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Boxes className="w-3.5 h-3.5 text-amber-600" />
                      Itens Aging
                    </span>
                    <Badge className={cn("text-[9px] font-black border-none px-1.5 h-5 flex items-center gap-0.5", vendorMetrics.agingQty > 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")}>
                      {vendorMetrics.agingQty > 0 ? (
                        <><TrendingUp className="w-2.5 h-2.5 text-emerald-700" /> Desmobilizando</>
                      ) : (
                        <><TrendingDown className="w-2.5 h-2.5 text-rose-700" /> Sem Vendas</>
                      )}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-2xl font-headline font-extrabold text-slate-900">
                      {vendorMetrics.agingQty} <span className="text-xs font-semibold text-slate-500">unidades</span>
                    </div>
                    <p className="text-xs font-bold text-amber-700 mt-0.5">
                      {vendorMetrics.agingValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-amber-200/60 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 font-semibold">Presença Cupons:</span>
                      <span className="font-extrabold text-slate-900">{vendorMetrics.agingCuponsCount} cupons ({vendorMetrics.agingPenetracaoRate.toFixed(1)}%)</span>
                    </div>
                  </div>
                </div>

                {/* CARD 4: RETIRADAS & PEDIDOS ADICIONAIS */}
                <div className="p-4 rounded-2xl bg-teal-50/80 border border-teal-200/80 space-y-2.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-teal-600" />
                      Omnichannel
                    </span>
                    <Badge className={cn("text-[9px] font-black border-none px-1.5 h-5 flex items-center gap-0.5", vendorMetrics.adicionaisCount > 0 ? "bg-emerald-100 text-emerald-800" : vendorMetrics.retiradasCount > 0 ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-600")}>
                      {vendorMetrics.adicionaisCount > 0 ? (
                        <><TrendingUp className="w-2.5 h-2.5 text-emerald-700" /> Conversão Ativa</>
                      ) : vendorMetrics.retiradasCount > 0 ? (
                        <><TrendingDown className="w-2.5 h-2.5 text-rose-700" /> Sem Adicional</>
                      ) : (
                        "Sem Pickup"
                      )}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span>Retiradas:</span>
                      <span>{vendorMetrics.retiradasCount} cupons</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span>Adicionais:</span>
                      <span className="text-teal-700">{vendorMetrics.adicionaisCount} ({vendorMetrics.adicionaisValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-teal-200/60 text-[10px] text-slate-500 font-semibold flex items-center justify-between">
                    <span>Taxa Adicional/Pickup:</span>
                    <span className="font-extrabold text-teal-800">
                      {vendorMetrics.retiradasCount > 0 ? `${((vendorMetrics.adicionaisCount / vendorMetrics.retiradasCount) * 100).toFixed(0)}%` : "N/A"}
                    </span>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 1: DISTRIBUIÇÃO DA CESTA DE COMPRAS & QUALIDADE DE TROCAS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* DISTRIBUIÇÃO DE ITENS POR CUPOM (MONO-ITEM VS SUPER CESTAS) */}
            <Card className="lg:col-span-7 bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs">
              <CardHeader>
                <CardTitle className="text-lg font-headline font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  Distribuição do Tamanho de Cesta (Cupons por Qtd de Itens)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Análise de profundidade de atendimento do colaborador e penetração de vendas adicionais.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {basketBreakdown.map((item, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 block truncate">{item.name}</span>
                      <div className="text-xl font-headline font-extrabold text-slate-900">
                        {item.count} <span className="text-xs font-semibold text-slate-400">({item.percent.toFixed(1)}%)</span>
                      </div>
                      <Progress value={item.percent} className="h-1.5 bg-slate-200" />
                    </div>
                  ))}
                </div>

                {/* GRÁFICO RECHARTS DE BARRA DE CESTA */}
                <div className="h-56 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={basketBreakdown} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                      <XAxis type="number" tickFormatter={(v) => `${v}%`} />
                      <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fontWeight: 600 }} />
                      <RechartsTooltip 
                        formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Proporção']}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                      />
                      <Bar dataKey="percent" radius={[0, 8, 8, 0]} barSize={24}>
                        {basketBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* ANÁLISE DETALHADA E QUALIDADE DE TROCAS */}
            <Card className="lg:col-span-5 bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs">
              <CardHeader>
                <CardTitle className="text-lg font-headline font-bold text-slate-900 flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-amber-600" />
                  Qualidade & Desempenho em Trocas
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Métricas de conversão de trocas em vendas adicionais (Upsell).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase text-amber-800 tracking-wider">Total de Trocas</span>
                    <h4 className="text-2xl font-headline font-extrabold text-amber-900 mt-0.5">
                      {vendorMetrics.trocasCount} trocas
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold uppercase text-amber-800 tracking-wider">Diferença Gerada (R$)</span>
                    <h4 className={cn("text-xl font-headline font-extrabold mt-0.5", vendorMetrics.trocasValorDiferenca >= 0 ? "text-emerald-700" : "text-rose-700")}>
                      {vendorMetrics.trocasValorDiferenca.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </h4>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      Trocas com Diferença Positiva (Upsell):
                    </span>
                    <span className="font-extrabold text-slate-900">
                      {vendorMetrics.trocasPositivasCount} ({vendorMetrics.trocasCount > 0 ? ((vendorMetrics.trocasPositivasCount / vendorMetrics.trocasCount) * 100).toFixed(0) : 0}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                      Trocas Secas (Sem Ganho Adicional):
                    </span>
                    <span className="font-extrabold text-slate-900">
                      {vendorMetrics.trocasSecasCount} ({vendorMetrics.trocasCount > 0 ? ((vendorMetrics.trocasSecasCount / vendorMetrics.trocasCount) * 100).toFixed(0) : 0}%)
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600">Score de Qualidade das Trocas:</span>
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold">
                      {vendorMetrics.trocasScoreMedio > 0 ? `${vendorMetrics.trocasScoreMedio.toFixed(1)} / 100` : "Sem trocas registradas"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SEÇÃO 2: RITMIA TEMPORAL (HORÁRIOS E DIAS MAIS PRODUTIVOS) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* GRÁFICO POR HORA DO DIA */}
            <Card className="lg:col-span-8 bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-headline font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    Vendas por Horário do Dia (08h às 21h)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Curva de produtividade horária do colaborador selecionado.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Hora de Ouro (Maior Venda):</span>
                    <span className="font-extrabold text-indigo-700">{peakHoursInfo.goldHour} ({peakHoursInfo.goldHourFat.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hourlyData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="hour" tick={{ fontSize: 11, fontWeight: 600 }} />
                      <YAxis tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 11 }} />
                      <RechartsTooltip 
                        formatter={(val: any) => [`R$ ${Number(val).toFixed(2)}`, 'Faturamento']}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                      />
                      <Area type="monotone" dataKey="faturamento" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorFaturamento)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* VENDAS POR DIA DA SEMANA */}
            <Card className="lg:col-span-4 bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs">
              <CardHeader>
                <CardTitle className="text-lg font-headline font-bold text-slate-900 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-indigo-600" />
                  Desempenho por Dia da Semana
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Distribuição semanal de faturamento.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <XAxis dataKey="day" tick={{ fontSize: 11, fontWeight: 600 }} />
                      <YAxis tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 10 }} />
                      <RechartsTooltip 
                        formatter={(val: any) => [`R$ ${Number(val).toFixed(2)}`, 'Faturamento']}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                      />
                      <Bar dataKey="faturamento" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SEÇÃO 3: TOP PRODUTOS MAIS VENDIDOS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* TOP 5 PRODUTOS DO COLABORADOR */}
            <Card className="lg:col-span-12 bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs">
              <CardHeader>
                <CardTitle className="text-lg font-headline font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-violet-600" />
                  Top 5 Produtos Mais Vendidos pelo Colaborador
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Itens com maior representatividade nas vendas individuais de {selectedVendor}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {topProducts.map((p, idx) => (
                    <div key={p.code} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2 hover:bg-slate-100/80 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="w-6 h-6 rounded-md bg-violet-100 text-violet-700 font-headline font-extrabold flex items-center justify-center text-xs">
                          #{idx + 1}
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold">Cód: {p.code}</span>
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-800 line-clamp-2 min-h-[32px]">{p.name}</h5>
                        <span className="text-[11px] font-semibold text-slate-500">{p.qtd} unidades</span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-200/60 text-right">
                        <span className="text-xs font-extrabold text-slate-900">
                          {p.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {topProducts.length === 0 && (
                    <p className="text-xs font-semibold text-slate-400 text-center py-6 col-span-full">
                      Nenhum produto registrado no período.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
