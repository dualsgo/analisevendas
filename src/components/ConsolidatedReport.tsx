"use client";

import React, { useMemo, useState, useRef, useCallback } from "react";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import { AnalysisHelp } from "./AnalysisHelp";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useSidebar } from "@/components/ui/sidebar";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  Printer, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  Target,
  Smartphone,
  Zap,
  ArrowRightLeft,
  FileText,
  Heart,
  Star,
  CheckCircle2,
  XCircle,
  Info,
  Filter,
  Search,
  ChevronRight,
  Bike,
  AlertTriangle,
  AlertCircle,
  Lightbulb,
  Settings2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ConsolidatedReportProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

export interface PositionGoal {
  key: string;
  name: string;
  weight: string;
  paMeta: number;
  tkmMeta: number;
  cpfMeta: number; // Meta de Cadastros (% de cupons com CPF)
}

const DEFAULT_POSITION_GOALS: Record<string, PositionGoal> = {
  "P2": { key: "P2", name: "P2 — Porta", weight: "5%", paMeta: 1.60, tkmMeta: 140.00, cpfMeta: 80.0 },
  "P1": { key: "P1", name: "P1 — Caixa", weight: "25%", paMeta: 1.64, tkmMeta: 138.00, cpfMeta: 85.0 },
  "P3": { key: "P3", name: "P3 — Salão", weight: "70%", paMeta: 1.80, tkmMeta: 155.00, cpfMeta: 85.0 },
  "DIG": { key: "DIG", name: "Digital / Retirada", weight: "-", paMeta: 1.75, tkmMeta: 150.00, cpfMeta: 85.0 },
  "LOJA": { key: "LOJA", name: "LOJA (Consolidado)", weight: "100%", paMeta: 1.75, tkmMeta: 150.00, cpfMeta: 85.0 },
  "NONE": { key: "NONE", name: "Sem Vendas", weight: "-", paMeta: 1.75, tkmMeta: 150.00, cpfMeta: 85.0 }
};

export type AlertLevel = 'VERDE' | 'AMARELO' | 'ALERTA' | 'ALERTA_EXTREMO';

export interface AttainmentInfo {
  level: AlertLevel;
  label: string;
  shortLabel: string;
  pct: number;
  badgeClass: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  icon: 'check' | 'info' | 'alert' | 'x';
}

export function getAttainmentLevel(real: number, meta: number): AttainmentInfo {
  if (!meta || meta <= 0) {
    return {
      level: 'VERDE',
      label: 'Sem Meta',
      shortLabel: 'N/A',
      pct: 100,
      badgeClass: 'bg-slate-100 text-slate-700',
      textClass: 'text-slate-700',
      bgClass: 'bg-slate-50',
      borderClass: 'border-slate-200',
      icon: 'check'
    };
  }

  const pct = (real / meta) * 100;

  if (pct >= 100) {
    return {
      level: 'VERDE',
      label: 'Atingido (≥ 100%)',
      shortLabel: 'ATINGIDO',
      pct,
      badgeClass: 'bg-emerald-500 text-white font-black',
      textClass: 'text-emerald-700 font-extrabold',
      bgClass: 'bg-emerald-50/50',
      borderClass: 'border-emerald-200',
      icon: 'check'
    };
  } else if (pct >= 90) {
    return {
      level: 'AMARELO',
      label: 'Na Trave (90% a 99,9%)',
      shortLabel: 'NA TRAVE',
      pct,
      badgeClass: 'bg-amber-400 text-slate-950 font-black',
      textClass: 'text-amber-700 font-extrabold',
      bgClass: 'bg-amber-50/50',
      borderClass: 'border-amber-200',
      icon: 'info'
    };
  } else if (pct >= 75) {
    return {
      level: 'ALERTA',
      label: 'Atenção (75% a 89,9%)',
      shortLabel: 'ATENÇÃO',
      pct,
      badgeClass: 'bg-orange-500 text-white font-black',
      textClass: 'text-orange-600 font-black',
      bgClass: 'bg-orange-50/50',
      borderClass: 'border-orange-200',
      icon: 'alert'
    };
  } else {
    return {
      level: 'ALERTA_EXTREMO',
      label: 'Crítico (< 75%)',
      shortLabel: 'CRÍTICO',
      pct,
      badgeClass: 'bg-rose-600 text-white font-black',
      textClass: 'text-rose-600 font-black',
      bgClass: 'bg-rose-50/50',
      borderClass: 'border-rose-200',
      icon: 'x'
    };
  }
}

const POSITIONS = {
  "P1": { label: "🟥 P1 Caixa", color: "bg-rose-100 text-rose-800", rowColor: "bg-rose-50/50 hover:bg-rose-100/50" },
  "P2": { label: "🟨 P2 Porta", color: "bg-amber-100 text-amber-800", rowColor: "bg-amber-50/50 hover:bg-amber-100/50" },
  "P3": { label: "🟩 P3 Salão", color: "bg-emerald-100 text-emerald-800", rowColor: "bg-emerald-50/50 hover:bg-emerald-100/50" },
  "DIG": { label: "🟦 Digital/Ret", color: "bg-sky-100 text-sky-800", rowColor: "bg-sky-50/50 hover:bg-sky-100/50" },
  "NONE": { label: "➖ Sem Vendas", color: "bg-slate-100 text-slate-500", rowColor: "bg-slate-50/50 hover:bg-slate-100/50" }
};

function getAutoPositionKey(v: any) {
  if (v.filtered.cupons === 0) return "NONE";

  const pa = v.filtered.itens / v.filtered.cupons;
  const isDigital = v.pickupsAtendidas > 0 && (v.pickupsAtendidas / v.filtered.cupons) > 0.3;
  
  if (isDigital) return "DIG";

  // Alto volume de cupons e PA baixo = Caixa
  if (v.filtered.cupons >= 30 && pa < 1.68) return "P1";

  // PA Alto (>= 2.2) = Salão (Consultivo)
  if (pa >= 2.2) return "P3";
  
  // PA Médio = Porta (Pista)
  return "P2";
}



const SLP_CODES = ['5135238', '5135269', '5135270', '5135273', '5146458', '5146469', '5146470', '5146471', '5146472', '5146473', '5146474', '5146475', '5146476', '5146501', '5146504', '5146505', '5141894', '5141895', '5141896', '5141897', '5141898', '5141899', '5141900', '5141902', '5141903', '5141904', '5141905', '5141907', '5141909', '5141910', '5141911', '5141912', '5141913', '5141914', '5141915', '5141916', '5141917', '5141920', '5141949', '5141978', '5140469', '5140475', '5140476', '5140477', '5140478', '5140479', '5146477', '5146478', '5146502', '5146503'];
const SOCIAL_CODES = ['5057181', '5055875', '5135601', '5129270', '5129271', '5129247', '5129262', '5122642', '5122641', '5135612', '5122639', '5122638', '5133676', '5113644', '5113641', '5113642', '5113643', '5129267', '5129255', '5143422', '5139528', '5143423', '5145833', '5139527', '5147797', '5147796', '5145834', '5079753', '5079752', '5106673', '5106671', '5106674', '5106672', '5088519', '5097336', '5097335', '5011918', '5136558'];
const BARALHO_CODES = ['5147797', '5147796', '5149977', '5149978'];
const SACOLA_CODES = ['5133676', '5113644'];

export function ConsolidatedReport({ data, vinculos }: ConsolidatedReportProps) {
  const [includePickups, setIncludePickups] = useState(false);
  const [includeExchanges, setIncludeExchanges] = useState(false);
  const [includeDelivery, setIncludeDelivery] = useState(false);
  const [includeFigurinhas, setIncludeFigurinhas] = useState(true);
  const [includeAlbuns, setIncludeAlbuns] = useState(true);
  const [includeBaralhos, setIncludeBaralhos] = useState(true);
  const [includeSLP, setIncludeSLP] = useState(true);
  const [includeSacolas, setIncludeSacolas] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedColab, setSelectedColab] = useState<any>(null);
  const [manualPositions, setManualPositions] = useState<Record<string, string>>({});
  const [positionGoals, setPositionGoals] = useState<Record<string, PositionGoal>>(DEFAULT_POSITION_GOALS);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'venda',
    direction: 'desc'
  });
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";



  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatNum = (val: number, precision = 2) => val.toLocaleString('pt-BR', { minimumFractionDigits: precision, maximumFractionDigits: precision });

  const reportData = useMemo(() => {
    const vendors: Record<string, any> = {};
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);

    const vendorNames = Array.from(new Set(activeSales.map(s => s.vendedor || "OUTROS")));

    vendorNames.forEach(name => {
      vendors[name] = {
        name,
        group: "",
        real: { venda: 0, cupons: 0, itens: 0, ident: 0 },
        filtered: { venda: 0, cupons: 0, itens: 0, ident: 0 },
        pickupsAtendidas: 0,
        adicionaisFeitos: 0,
        slpQty: 0,
        baralhoQty: 0,
        sacolaQty: 0
      };
    });

    const isBaralho = (it: any) => {
      if (BARALHO_CODES.includes(it.cProd)) return true;
      const p = it.xProd.toUpperCase();
      return p.includes("BARALHO") || p.includes("ACAO SOCIAL") || p.includes("DOACAO") || p.includes("ALMANAQUE");
    };
    
    const isSacola = (it: any) => {
      if (SACOLA_CODES.includes(it.cProd)) return true;
      const p = it.xProd.toUpperCase();
      return p.includes("SACOLA");
    };

    activeSales.forEach(s => {
      const v = s.vendedor || "OUTROS";
      if (!vendors[v]) return;

      const isFisica = s.canal === "LOJA_FISICA" || s.canal === "RETIRADA_ADICIONAL" || s.is_adicional || s.is_adicional_suspeito;
      const isOnline = s.canal === "RETIRADA_ONLINE";
      const isDelivery = s.canal === "DELIVERY";

      if (isOnline) {
        vendors[v].pickupsAtendidas += 1;
      }
      if (s.is_adicional || s.is_adicional_suspeito || s.canal === "RETIRADA_ADICIONAL") {
        vendors[v].adicionaisFeitos += 1;
      }

      s.itens.forEach(it => {
        if (SLP_CODES.includes(it.cProd)) vendors[v].slpQty += it.qCom;
        if (SOCIAL_CODES.includes(it.cProd) || isBaralho(it) || isSacola(it)) {
          if (isBaralho(it)) vendors[v].baralhoQty += it.qCom;
          else if (isSacola(it)) vendors[v].sacolaQty += it.qCom;
          else vendors[v].baralhoQty += it.qCom; // Fallback for codes
        }
      });

      const shouldProcess = isFisica || (isOnline && includePickups) || (isDelivery && includeDelivery);
      
      if (shouldProcess) {
        let saleRealVenda = parseFloat(s.vNF);
        let saleRealItens = parseFloat(s.itens_qtd);
        let isIdentified = s.cpf_cnpj_dest && s.cpf_cnpj_dest.trim() !== "" ? 1 : 0;
        
        let saleFilteredVenda = 0;
        let saleFilteredItens = 0;
        let validItemsCount = 0;

        s.itens.forEach(it => {
          const isFig = ["5147790", "5147791", "5149187"].includes(it.cProd);
          const isAlb = it.cProd === "5147812";
          const isBar = isBaralho(it);
          const isSac = isSacola(it);
          const isSlpItem = SLP_CODES.includes(it.cProd);

          let includeItem = true;
          if (isFig && !includeFigurinhas) includeItem = false;
          if (isAlb && !includeAlbuns) includeItem = false;
          if (isBar && !includeBaralhos) includeItem = false;
          if (isSac && !includeSacolas) includeItem = false;
          if (isSlpItem && !includeSLP) includeItem = false;

          if (includeItem) {
              saleFilteredVenda += it.vProd;
              saleFilteredItens += it.qCom;
              validItemsCount++;
          }
        });
        
        if (validItemsCount === 0) {
          saleFilteredVenda = 0;
          saleFilteredItens = 0;
        } else if (validItemsCount === s.itens.length) {
          saleFilteredVenda = saleRealVenda;
          saleFilteredItens = saleRealItens;
        } else {
          const totalVProd = s.itens.reduce((acc, it) => acc + it.vProd, 0);
          const ratio = totalVProd > 0 ? saleRealVenda / totalVProd : 1;
          saleFilteredVenda = saleFilteredVenda * ratio;
        }

        let saleFilteredCupons = validItemsCount > 0 ? 1 : 0;
        let saleFilteredIdent = validItemsCount > 0 ? isIdentified : 0;

        vendors[v].real.venda += saleRealVenda;
        vendors[v].real.cupons += 1;
        vendors[v].real.itens += saleRealItens;
        vendors[v].real.ident += isIdentified;

        vendors[v].filtered.venda += saleFilteredVenda;
        vendors[v].filtered.cupons += saleFilteredCupons;
        vendors[v].filtered.itens += saleFilteredItens;
        vendors[v].filtered.ident += saleFilteredIdent;
      }
    });

    if (includeExchanges) {
      vinculos.forEach(vinc => {
        const v = vinc.vendedor || "OUTROS";
        if (vendors[v]) {
          vendors[v].real.venda += vinc.valor_diferenca;
          vendors[v].real.itens += vinc.diferenca_itens;
          vendors[v].filtered.venda += vinc.valor_diferenca;
          vendors[v].filtered.itens += vinc.diferenca_itens;
          vendors[v].real.cupons += 1;
          vendors[v].filtered.cupons += 1;
          if (vinc.cpf_cliente) {
            vendors[v].real.ident += 1;
            vendors[v].filtered.ident += 1;
          }
        }
      });
    }

    const totalCupons = Object.values(vendors).reduce((acc, v: any) => acc + v.filtered.cupons, 0);
    const activeVendors = Object.values(vendors).filter((v: any) => v.filtered.cupons > 0).length;
    const avgCupons = activeVendors > 0 ? totalCupons / activeVendors : 0;

    const results = Object.values(vendors).map((v: any) => {
      const realPA = v.real.cupons > 0 ? v.real.itens / v.real.cupons : 0;
      const realTKM = v.real.cupons > 0 ? v.real.venda / v.real.cupons : 0;
      const realIdent = v.real.cupons > 0 ? (v.real.ident / v.real.cupons) * 100 : 0;

      const filteredPA = v.filtered.cupons > 0 ? v.filtered.itens / v.filtered.cupons : 0;
      const filteredTKM = v.filtered.cupons > 0 ? v.filtered.venda / v.filtered.cupons : 0;
      const filteredPM = v.filtered.itens > 0 ? v.filtered.venda / v.filtered.itens : 0;
      const filteredIdent = v.filtered.cupons > 0 ? Math.min((v.filtered.ident / v.filtered.cupons) * 100, 100) : 0;
      const conv = v.pickupsAtendidas > 0 ? (v.adicionaisFeitos / v.pickupsAtendidas) * 100 : 0;

      const autoPosKey = getAutoPositionKey(v);
      const finalPosKey = manualPositions[v.name] || autoPosKey;
      const posInfo = POSITIONS[finalPosKey as keyof typeof POSITIONS] || POSITIONS["NONE"];

      const posMeta = positionGoals[finalPosKey] || positionGoals["LOJA"];
      const posPaMeta = posMeta.paMeta;
      const posTkmMeta = posMeta.tkmMeta;
      const posPmMeta = posPaMeta > 0 ? (posTkmMeta / posPaMeta) : 0;
      const posCpfMeta = posMeta.cpfMeta || 85.0;

      const paAtt = getAttainmentLevel(filteredPA, posPaMeta);
      const tkmAtt = getAttainmentLevel(filteredTKM, posTkmMeta);
      const pmAtt = getAttainmentLevel(filteredPM, posPmMeta);
      const cpfAtt = getAttainmentLevel(filteredIdent, posCpfMeta);

      const avgAttPct = (paAtt.pct + tkmAtt.pct + pmAtt.pct + cpfAtt.pct) / 4;
      const overallAtt = getAttainmentLevel(avgAttPct, 100);

      const isPaMetaReached = paAtt.level === 'VERDE';
      const isTkmMetaReached = tkmAtt.level === 'VERDE';
      const isPmMetaReached = pmAtt.level === 'VERDE';
      const isCpfMetaReached = cpfAtt.level === 'VERDE';

      const isMetaReached = isPaMetaReached && isTkmMetaReached && isPmMetaReached && isCpfMetaReached;
      const metaStatus = overallAtt.level === 'VERDE' ? "DENTRO" : (overallAtt.level === 'AMARELO' ? "PARCIAL" : (overallAtt.level === 'ALERTA' ? "ALERTA" : "EXTREMO"));

      return {
        ...v,
        autoPosKey,
        finalPosKey,
        posMeta,
        posPaMeta,
        posTkmMeta,
        posPmMeta,
        posCpfMeta,
        paAtt,
        tkmAtt,
        pmAtt,
        cpfAtt,
        overallAtt,
        isPaMetaReached,
        isTkmMetaReached,
        isPmMetaReached,
        isCpfMetaReached,
        isMetaReached,
        metaStatus,
        group: posInfo.label,
        groupColor: posInfo.rowColor,
        current: { venda: v.filtered.venda, cupons: v.filtered.cupons, itens: v.filtered.itens },
        realMetrics: {
          pa: realPA,
          tkm: realTKM,
          ident: realIdent
        },
        metrics: {
          pa: filteredPA,
          tkm: filteredTKM,
          pm: filteredPM,
          ident: filteredIdent,
          conv: conv
        },
        deltas: {
          venda: v.filtered.venda - v.real.venda,
          pa: filteredPA - realPA,
          tkm: filteredTKM - realTKM,
          ident: filteredIdent - realIdent
        }
      };
    });

    const groupStats: Record<string, any> = {};
    const groupNames = Array.from(new Set(results.map(r => r.group)));
    
    groupNames.forEach(g => {
      const groupRows = results.filter(r => r.group === g);
      groupStats[g] = {
        pa: groupRows.reduce((acc, r) => acc + r.metrics.pa, 0) / groupRows.length,
        tkm: groupRows.reduce((acc, r) => acc + r.metrics.tkm, 0) / groupRows.length,
        ident: groupRows.reduce((acc, r) => acc + r.metrics.ident, 0) / groupRows.length,
      };
    });

    return results
      .filter(r => 
        (selectedGroup === "all" || r.group === selectedGroup)
      )
      .map(r => ({
        ...r,
        groupAverages: groupStats[r.group]
      })).sort((a, b) => {
        let aVal = 0;
        let bVal = 0;
        
        switch(sortConfig.key) {
          case 'status': aVal = a.isMetaReached ? 2 : (a.isPaMetaReached || a.isTkmMetaReached ? 1 : 0); bVal = b.isMetaReached ? 2 : (b.isPaMetaReached || b.isTkmMetaReached ? 1 : 0); break;
          case 'venda': aVal = a.current.venda; bVal = b.current.venda; break;
          case 'pa': aVal = a.metrics.pa; bVal = b.metrics.pa; break;
          case 'tkm': aVal = a.metrics.tkm; bVal = b.metrics.tkm; break;
          case 'ident': aVal = a.metrics.ident; bVal = b.metrics.ident; break;
          case 'pm': aVal = a.metrics.pm; bVal = b.metrics.pm; break;
          case 'cupons': aVal = a.current.cupons; bVal = b.current.cupons; break;
          case 'itens': aVal = a.current.itens; bVal = b.current.itens; break;
          case 'conv': aVal = a.metrics.conv; bVal = b.metrics.conv; break;
          case 'pickups': aVal = a.pickupsAtendidas; bVal = b.pickupsAtendidas; break;
          case 'adicionais': aVal = a.adicionaisFeitos; bVal = b.adicionaisFeitos; break;
          default: aVal = a.current.venda; bVal = b.current.venda;
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [data, vinculos, includePickups, includeExchanges, includeDelivery, includeFigurinhas, includeAlbuns, includeBaralhos, includeSLP, includeSacolas, selectedGroup, sortConfig, manualPositions, positionGoals]);

  const totals = useMemo(() => {
    const sum = reportData.reduce((acc, v) => ({
      venda: acc.venda + v.current.venda,
      cupons: acc.cupons + v.current.cupons,
      itens: acc.itens + v.current.itens,
      pickups: acc.pickups + v.pickupsAtendidas,
      adicionais: acc.adicionais + v.adicionaisFeitos,
      ident: acc.ident + v.filtered.ident,
      slp: acc.slp + v.slpQty,
      baralhos: acc.baralhos + v.baralhoQty,
      sacolas: acc.sacolas + v.sacolaQty
    }), { venda: 0, cupons: 0, itens: 0, pickups: 0, adicionais: 0, ident: 0, slp: 0, baralhos: 0, sacolas: 0 });

    return {
      ...sum,
      pa: sum.cupons > 0 ? sum.itens / sum.cupons : 0,
      tkm: sum.cupons > 0 ? sum.venda / sum.cupons : 0,
      pm: sum.itens > 0 ? sum.venda / sum.itens : 0,
      ident_perc: sum.cupons > 0 ? (Math.min(sum.ident / sum.cupons, 1)) * 100 : 0,
      conv: sum.pickups > 0 ? (sum.adicionais / sum.pickups) * 100 : 0
    };
  }, [reportData]);

  const summaryMetaStats = useMemo(() => {
    const active = reportData.filter(r => r.current.cupons > 0);
    const withinMeta = active.filter(r => r.isMetaReached).length;
    const total = active.length;
    const pct = total > 0 ? (withinMeta / total) * 100 : 0;
    return { withinMeta, total, pct };
  }, [reportData]);

  const insights = useMemo(() => {
    const alerts: string[] = [];
    const highlights: string[] = [];
    const recommendations: string[] = [];

    const totalPickups = totals.pickups;
    const totalCupons = totals.cupons;

    const p1Members = reportData.filter(r => r.finalPosKey === "P1");
    const p2Members = reportData.filter(r => r.finalPosKey === "P2");
    const p3Members = reportData.filter(r => r.finalPosKey === "P3");

    const p1Cupons = p1Members.reduce((a, c) => a + c.current.cupons, 0);
    const p2Cupons = p2Members.reduce((a, c) => a + c.current.cupons, 0);
    const p3Cupons = p3Members.reduce((a, c) => a + c.current.cupons, 0);

    const p1CuponsShare = totalCupons > 0 ? (p1Cupons / totalCupons) * 100 : 0;
    const p2CuponsShare = totalCupons > 0 ? (p2Cupons / totalCupons) * 100 : 0;
    const p3CuponsShare = totalCupons > 0 ? (p3Cupons / totalCupons) * 100 : 0;

    const p1Pickups = p1Members.reduce((a, c) => a + c.pickupsAtendidas, 0);
    const p2Pickups = p2Members.reduce((a, c) => a + c.pickupsAtendidas, 0);
    const p3Pickups = p3Members.reduce((a, c) => a + c.pickupsAtendidas, 0);

    const p1PickupShare = totalPickups > 0 ? (p1Pickups / totalPickups) * 100 : 0;
    const p2PickupShare = totalPickups > 0 ? (p2Pickups / totalPickups) * 100 : 0;
    const p3PickupShare = totalPickups > 0 ? (p3Pickups / totalPickups) * 100 : 0;

    const p1Adic = p1Members.reduce((a, c) => a + c.adicionaisFeitos, 0);
    const p3Adic = p3Members.reduce((a, c) => a + c.adicionaisFeitos, 0);

    const p1Conv = p1Pickups > 0 ? (p1Adic / p1Pickups) * 100 : 0;
    const p3Conv = p3Pickups > 0 ? (p3Adic / p3Pickups) * 100 : 0;

    // 1. RETIRADAS CONCENTRATION
    if (p2Pickups > 0) {
      alerts.push(`Alta concentração de retiradas no P2 Porta: ${p2Pickups} retiradas atendidas (${p2PickupShare.toFixed(1)}% do total), acima da média proposta (meta: 0 retiradas na porta).`);
      recommendations.push(`Instruir o P2 Porta a encaminhar clientes de retiradas online imediatamente para o balcão do Salão (P3).`);
    }

    if (p1PickupShare > 30) {
      alerts.push(`Alta concentração de retiradas no P1 Caixa: ${p1PickupShare.toFixed(1)}% das retiradas da loja (acima da meta proposta de no máximo 30%).`);
      recommendations.push(`Redirecionar a entrega de produtos de retirada online do Caixa para a equipe de atendimento no Salão (P3).`);
    }

    if (p3PickupShare <= 70 && totalPickups > 0) {
      alerts.push(`Baixa concentração de retiradas no P3 Salão: Apenas ${p3PickupShare.toFixed(1)}% das retiradas (meta proposta é > 70%).`);
    } else if (p3PickupShare > 70 && totalPickups > 0) {
      highlights.push(`Excelente foco no Salão: P3 Salão responde por ${p3PickupShare.toFixed(1)}% de todas as retiradas (Meta > 70% atingida com sucesso!).`);
    }

    // 2. CUPON SHARE CONCENTRATION
    if (p2CuponsShare > 10) {
      alerts.push(`Sobrecarga no P2 Porta: Retendo ${p2CuponsShare.toFixed(1)}% dos cupons totais da loja (referência esperada é 5%).`);
    } else if (p2CuponsShare <= 5 && p2Members.length > 0) {
      highlights.push(`Fluxo de Porta P2 equilibrado: ${p2CuponsShare.toFixed(1)}% dos cupons retidos na porta (dentro da meta de 5%).`);
    }

    if (p1CuponsShare > 30) {
      alerts.push(`Acúmulo de cupons no P1 Caixa: ${p1CuponsShare.toFixed(1)}% dos cupons da loja (referência esperada é 25%).`);
    }

    // 3. CONVERSÃO DE ADICIONAIS
    if (p3Conv >= 30 && p3Pickups > 0) {
      highlights.push(`Alta Eficiência no Salão: P3 Salão alcançou ${p3Conv.toFixed(1)}% de conversão de adicionais em retiradas (meta ≥ 30%).`);
    } else if (p3Conv < 22 && p3Pickups > 0) {
      alerts.push(`Baixa Conversão de Adicionais no Salão: P3 Salão está em ${p3Conv.toFixed(1)}% (abaixo da faixa crítica de 22%).`);
      recommendations.push(`Capacitar a equipe do Salão para ofertar produtos complementares na entrega de cada retirada.`);
    }

    // 4. PERFORMERS & META STATS
    const colaboradoresNaMeta = reportData.filter(r => r.isMetaReached);
    const percentNaMeta = reportData.length > 0 ? (colaboradoresNaMeta.length / reportData.length) * 100 : 0;

    if (percentNaMeta >= 70) {
      highlights.push(`Desempenho Geral do Time: ${colaboradoresNaMeta.length} de ${reportData.length} colaboradores (${percentNaMeta.toFixed(0)}%) atingiram as metas individuais da posição.`);
    } else {
      alerts.push(`Apenas ${colaboradoresNaMeta.length} de ${reportData.length} colaboradores (${percentNaMeta.toFixed(0)}%) atingiram PA e TKM da sua posição.`);
    }

    // Top Vendedor
    if (reportData.length > 0) {
      const sorted = [...reportData].sort((a, b) => b.current.venda - a.current.venda);
      const top = sorted[0];
      highlights.push(`Destaque de Vendas: ${top.name} (${POSITIONS[top.finalPosKey as keyof typeof POSITIONS]?.label || top.finalPosKey}) lidera com ${formatBRL(top.current.venda)} em vendas (PA ${formatNum(top.metrics.pa)}).`);
    }

    // Top Conversão
    const vendorsWithPickups = reportData.filter(r => r.pickupsAtendidas > 0);
    if (vendorsWithPickups.length > 0) {
      const topConv = [...vendorsWithPickups].sort((a, b) => b.metrics.conv - a.metrics.conv)[0];
      if (topConv.metrics.conv >= 30) {
        highlights.push(`Campeão de Venda Adicional: ${topConv.name} registrou ${formatNum(topConv.metrics.conv, 1)}% de conversão (${topConv.adicionaisFeitos} adicionais em ${topConv.pickupsAtendidas} retiradas).`);
      }
    }

    return { alerts, highlights, recommendations };
  }, [reportData, totals]);

  return (
    <div className={cn(
      "space-y-6 animate-in fade-in duration-500 pb-20 print:p-0 print:pb-0 print:space-y-0",
      isCollapsed ? "text-mode-large" : ""
    )}>
      {/* HEADER EXECUTIVO */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col xl:flex-row items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3 w-full xl:w-auto">
          <div className="bg-slate-900 p-2.5 rounded-xl text-white shadow-md"><FileText className="w-5 h-5" /></div>
          <div>
            <h1 className={cn("font-black uppercase tracking-tight text-slate-800", isCollapsed ? "text-xl" : "text-lg")}>Performance Unificada</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">Visão Geral do Time</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex-1 justify-end w-full xl:w-auto">
          
          <div className="flex flex-col gap-1 border-r border-slate-200 pr-4">
            <span className="text-[8px] font-black uppercase text-slate-400">Canais Extras</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge onClick={() => setIncludePickups(!includePickups)} className={cn("cursor-pointer font-black text-[9px] uppercase transition-colors shadow-none", includePickups ? "bg-sky-100 text-sky-700 hover:bg-sky-200" : "bg-white text-slate-400 border-dashed border hover:bg-slate-100")}><Smartphone className="w-3 h-3 mr-1"/> Retiradas</Badge>
              <Badge onClick={() => setIncludeExchanges(!includeExchanges)} className={cn("cursor-pointer font-black text-[9px] uppercase transition-colors shadow-none", includeExchanges ? "bg-purple-100 text-purple-700 hover:bg-purple-200" : "bg-white text-slate-400 border-dashed border hover:bg-slate-100")}><ArrowRightLeft className="w-3 h-3 mr-1"/> Trocas</Badge>
              <Badge onClick={() => setIncludeDelivery(!includeDelivery)} className={cn("cursor-pointer font-black text-[9px] uppercase transition-colors shadow-none", includeDelivery ? "bg-rose-100 text-rose-700 hover:bg-rose-200" : "bg-white text-slate-400 border-dashed border hover:bg-slate-100")}><Bike className="w-3 h-3 mr-1"/> Delivery</Badge>
            </div>
          </div>

          <div className="flex flex-col gap-1 hidden lg:flex">
            <span className="text-[8px] font-black uppercase text-slate-400">Considerar Itens</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge onClick={() => setIncludeFigurinhas(!includeFigurinhas)} className={cn("cursor-pointer font-black text-[9px] uppercase transition-colors shadow-none", includeFigurinhas ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-white text-slate-400 border-dashed border hover:bg-slate-100")}>Figurinhas</Badge>
              <Badge onClick={() => setIncludeAlbuns(!includeAlbuns)} className={cn("cursor-pointer font-black text-[9px] uppercase transition-colors shadow-none", includeAlbuns ? "bg-sky-100 text-sky-700 hover:bg-sky-200" : "bg-white text-slate-400 border-dashed border hover:bg-slate-100")}>Álbuns</Badge>
              <Badge onClick={() => setIncludeBaralhos(!includeBaralhos)} className={cn("cursor-pointer font-black text-[9px] uppercase transition-colors shadow-none", includeBaralhos ? "bg-rose-100 text-rose-700 hover:bg-rose-200" : "bg-white text-slate-400 border-dashed border hover:bg-slate-100")}>Baralhos</Badge>
              <Badge onClick={() => setIncludeSLP(!includeSLP)} className={cn("cursor-pointer font-black text-[9px] uppercase transition-colors shadow-none", includeSLP ? "bg-orange-100 text-orange-700 hover:bg-orange-200" : "bg-white text-slate-400 border-dashed border hover:bg-slate-100")}>SLP</Badge>
              <Badge onClick={() => setIncludeSacolas(!includeSacolas)} className={cn("cursor-pointer font-black text-[9px] uppercase transition-colors shadow-none", includeSacolas ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-white text-slate-400 border-dashed border hover:bg-slate-100")}>Sacolas</Badge>
            </div>
          </div>
          
        </div>
      </div>

      {/* CABEÇALHO PARA IMPRESSÃO */}
      <div className="hidden print:flex justify-between items-end border-b-2 border-black pb-1 mb-2">
        <div className="space-y-0.5">
          <h1 className="text-sm font-black uppercase leading-none">Ri Happy | Performance Consolidada</h1>
          <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">
            Visão: {selectedGroup === "all" ? "UNIDADE COMPLETA" : selectedGroup.toUpperCase()} • Físico {includePickups && "+ Retiradas"} {includeExchanges && "+ Trocas"} {includeDelivery && "+ Delivery"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[8px] font-black uppercase">{new Date().toLocaleDateString('pt-BR')} - {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          <p className="text-[7px] font-bold text-slate-400">DOCUMENTO DE AUDITORIA INTERNA</p>
        </div>
      </div>

      <div 
        className="space-y-8 rounded-[2rem] bg-slate-50 p-8 border border-slate-100"
      >

      {/* QUADRO DE METAS POR POSIÇÃO */}
      <Card className="ri-card bg-slate-900 text-white p-5 md:p-6 rounded-2xl border border-slate-800 shadow-xl print:bg-white print:text-black print:border print:border-black">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5 border-b border-slate-800 pb-4 print:border-black">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/20 text-indigo-400 p-2.5 rounded-xl border border-indigo-500/30 print:hidden">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-black uppercase tracking-tight text-white print:text-black">
                  Quadro de Metas por Posição
                </h2>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 print:hidden">
                  Verificação Ativa
                </Badge>
              </div>
              <p className="text-[11px] font-medium text-slate-400 print:text-slate-600">
                Avaliação de desempenho individual vinculada às metas da função (PA, TKM, Preço Médio e CPF).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="bg-slate-800 hover:bg-slate-700 text-white border-slate-700 font-bold text-xs gap-1.5 print:hidden shadow-sm">
                  <Settings2 className="w-4 h-4 text-indigo-400" />
                  <span>Configurar Metas</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl bg-slate-900 text-white border-slate-800">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base font-black uppercase tracking-tight text-white">
                    <Target className="w-5 h-5 text-indigo-400" />
                    Configuração de Metas por Função
                  </DialogTitle>
                  <DialogDescription className="text-slate-400 text-xs">
                    Defina as metas operacionais por posição. A <strong className="text-indigo-300">Meta de Preço Médio</strong> é calculada automaticamente dividindo o Ticket Médio (TKM) pelo PA.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-3 max-h-[60vh] overflow-y-auto pr-1">
                  {["P1", "P2", "P3", "DIG", "LOJA"].map(pKey => {
                    const posInfo = POSITIONS[pKey as keyof typeof POSITIONS] || { label: pKey };
                    const currentGoal = positionGoals[pKey] || DEFAULT_POSITION_GOALS[pKey] || DEFAULT_POSITION_GOALS["LOJA"];
                    const calculatedPM = currentGoal.paMeta > 0 ? (currentGoal.tkmMeta / currentGoal.paMeta) : 0;

                    return (
                      <div key={pKey} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs uppercase text-indigo-300 flex items-center gap-1.5">
                            {posInfo.label}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            PM Meta: <strong className="text-indigo-400">{formatBRL(calculatedPM)}</strong>
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400">PA Meta</label>
                            <Input 
                              type="number" 
                              step="0.01" 
                              value={currentGoal.paMeta}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setPositionGoals(prev => ({
                                  ...prev,
                                  [pKey]: { ...currentGoal, paMeta: val }
                                }));
                              }}
                              className="bg-slate-900 border-slate-700 text-white text-xs h-8 font-bold"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400">TKM Meta (R$)</label>
                            <Input 
                              type="number" 
                              step="1" 
                              value={currentGoal.tkmMeta}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setPositionGoals(prev => ({
                                  ...prev,
                                  [pKey]: { ...currentGoal, tkmMeta: val }
                                }));
                              }}
                              className="bg-slate-900 border-slate-700 text-white text-xs h-8 font-bold"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400">CPF Meta (%)</label>
                            <Input 
                              type="number" 
                              step="1" 
                              value={currentGoal.cpfMeta || 85}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setPositionGoals(prev => ({
                                  ...prev,
                                  [pKey]: { ...currentGoal, cpfMeta: val }
                                }));
                              }}
                              className="bg-slate-900 border-slate-700 text-white text-xs h-8 font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <DialogFooter className="flex items-center justify-between sm:justify-between border-t border-slate-800 pt-3">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setPositionGoals(DEFAULT_POSITION_GOALS)}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    Restaurar Padrões
                  </Button>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-4">
                      Salvar Metas
                    </Button>
                  </DialogTrigger>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="flex items-center gap-3 bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800 print:hidden">
              <div className="text-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Atingimento Time</span>
                <span className="text-sm font-black text-emerald-400">{summaryMetaStats.withinMeta} / {summaryMetaStats.total} na Meta</span>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div className="text-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Taxa Sucesso</span>
                <span className={cn("text-sm font-black", summaryMetaStats.pct >= 70 ? "text-emerald-400" : summaryMetaStats.pct >= 50 ? "text-amber-400" : "text-rose-400")}>
                  {summaryMetaStats.pct.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            { key: "P2", label: "P2 — Porta", color: "from-amber-500/10 to-amber-950/20 border-amber-500/30 text-amber-300", badgeColor: "bg-amber-400 text-slate-950" },
            { key: "P1", label: "P1 — Caixa", color: "from-rose-500/10 to-rose-950/20 border-rose-500/30 text-rose-300", badgeColor: "bg-rose-500 text-white" },
            { key: "P3", label: "P3 — Salão", color: "from-emerald-500/10 to-emerald-950/20 border-emerald-500/30 text-emerald-300", badgeColor: "bg-emerald-500 text-white" },
            { key: "LOJA", label: "LOJA (Consolidado)", color: "from-indigo-500/10 to-indigo-950/20 border-indigo-500/30 text-indigo-300", badgeColor: "bg-indigo-500 text-white" }
          ].map(item => {
            const g = positionGoals[item.key] || DEFAULT_POSITION_GOALS[item.key] || DEFAULT_POSITION_GOALS["LOJA"];
            const posMembers = item.key === "LOJA" ? reportData : reportData.filter(r => r.finalPosKey === item.key);
            const withinCount = posMembers.filter(r => r.isMetaReached).length;
            
            const posCupons = posMembers.reduce((acc, v) => acc + v.current.cupons, 0);
            const posSharePct = totals.cupons > 0 ? (posCupons / totals.cupons) * 100 : 0;
            const expectedWeightNum = parseFloat(g.weight.replace('%', '')) || 100;

            const posPickups = posMembers.reduce((acc, v) => acc + v.pickupsAtendidas, 0);
            const posPickupSharePct = totals.pickups > 0 ? (posPickups / totals.pickups) * 100 : 0;
            const posAdicionais = posMembers.reduce((acc, v) => acc + v.adicionaisFeitos, 0);
            const posConvPct = posPickups > 0 ? (posAdicionais / posPickups) * 100 : 0;

            let shareColorClass = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
            let shareBadgeLabel = "Ideal (Verde)";
            let shareStatusBadgeBg = "bg-emerald-500 text-white";

            if (item.key !== "LOJA") {
              if (posSharePct <= expectedWeightNum) {
                shareColorClass = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
                shareBadgeLabel = "Até Meta (Verde)";
                shareStatusBadgeBg = "bg-emerald-500 text-white font-black";
              } else if (posSharePct <= expectedWeightNum + 5) {
                shareColorClass = "text-amber-400 border-amber-500/30 bg-amber-500/10";
                shareBadgeLabel = "Pouco Acima (Amarelo)";
                shareStatusBadgeBg = "bg-amber-500 text-slate-950 font-black";
              } else {
                shareColorClass = "text-rose-400 border-rose-500/30 bg-rose-500/10";
                shareBadgeLabel = "Muito Acima (Vermelho)";
                shareStatusBadgeBg = "bg-rose-500 text-white font-black";
              }
            }

            let pickupStatusBadge = "0 Retiradas";
            let pickupBadgeBg = "bg-emerald-500 text-white font-black";

            if (item.key === "P3") {
              if (posPickupSharePct > 70) {
                pickupStatusBadge = `${posPickupSharePct.toFixed(0)}% (>70% Verde)`;
                pickupBadgeBg = "bg-emerald-500 text-white font-black";
              } else {
                pickupStatusBadge = `${posPickupSharePct.toFixed(0)}% (≤70% Vermelho)`;
                pickupBadgeBg = "bg-rose-500 text-white font-black";
              }
            } else if (item.key === "P1") {
              if (posPickupSharePct <= 30) {
                pickupStatusBadge = `${posPickupSharePct.toFixed(0)}% (≤30% Verde)`;
                pickupBadgeBg = "bg-emerald-500 text-white font-black";
              } else {
                pickupStatusBadge = `${posPickupSharePct.toFixed(0)}% (>30% Vermelho)`;
                pickupBadgeBg = "bg-rose-500 text-white font-black";
              }
            } else if (item.key === "P2") {
              if (posPickups === 0) {
                pickupStatusBadge = "0 Ret. (Verde)";
                pickupBadgeBg = "bg-emerald-500 text-white font-black";
              } else {
                pickupStatusBadge = `${posPickups} Ret. (>0 Vermelho)`;
                pickupBadgeBg = "bg-rose-500 text-white font-black";
              }
            } else {
              pickupStatusBadge = `${posPickups} Tot. (100%)`;
              pickupBadgeBg = "bg-indigo-500 text-white font-black";
            }

            let convStatusBadge = "Sem Retiradas";
            let convBadgeBg = "bg-slate-800 text-slate-400";
            if (posPickups > 0) {
              if (posConvPct >= 30) {
                convStatusBadge = `${posConvPct.toFixed(1)}% (≥30% Verde)`;
                convBadgeBg = "bg-emerald-500 text-white font-black";
              } else if (posConvPct >= 22) {
                convStatusBadge = `${posConvPct.toFixed(1)}% (22-30% Amarelo)`;
                convBadgeBg = "bg-amber-500 text-slate-950 font-black";
              } else {
                convStatusBadge = `${posConvPct.toFixed(1)}% (<22% Vermelho)`;
                convBadgeBg = "bg-rose-500 text-white font-black";
              }
            }

            const pmMetaValue = g.paMeta > 0 ? (g.tkmMeta / g.paMeta) : 0;

            return (
              <div key={item.key} className={cn("bg-slate-950/70 p-4 rounded-xl border flex flex-col justify-between space-y-3 relative overflow-hidden print:bg-slate-100 print:text-black print:border-black", item.color)}>
                <div className="flex items-center justify-between gap-1">
                  <span className={cn("px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider", item.badgeColor)}>
                    {item.label}
                  </span>
                  {item.key !== "LOJA" && (
                    <Badge className={cn("text-[9px] font-black uppercase px-2 py-0.5 border-none", shareStatusBadgeBg)}>
                      {shareBadgeLabel}
                    </Badge>
                  )}
                </div>

                {/* PESO NOS CUPONS (REAL VS ESPERADO) */}
                <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 space-y-1 print:bg-white print:border-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block print:text-slate-600">Peso Cupons (Real)</span>
                    <span className="text-[9px] font-black text-slate-400">Ref: {g.weight}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white print:text-black">
                      {posSharePct.toFixed(1)}% <span className="text-[9px] font-medium text-slate-400">da loja</span>
                    </span>
                    {item.key !== "LOJA" && (
                      <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded border", shareColorClass)}>
                        {posSharePct <= expectedWeightNum ? `≤ ${expectedWeightNum}%` : `+${(posSharePct - expectedWeightNum).toFixed(1)}%`}
                      </span>
                    )}
                  </div>
                </div>

                {/* METAS DA POSIÇÃO (PA, TKM, PM, CPF) */}
                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800 print:bg-white print:border-slate-300">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block print:text-slate-600">PA Meta</span>
                    <span className="text-xs font-black text-white print:text-black">{formatNum(g.paMeta)}</span>
                  </div>
                  <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800 print:bg-white print:border-slate-300">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block print:text-slate-600">TKM Meta</span>
                    <span className="text-xs font-black text-white print:text-black">{formatBRL(g.tkmMeta)}</span>
                  </div>
                  <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800 print:bg-white print:border-slate-300">
                    <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest block print:text-slate-600">P.M. Meta</span>
                    <span className="text-xs font-black text-indigo-300 print:text-black">{formatBRL(pmMetaValue)}</span>
                  </div>
                  <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800 print:bg-white print:border-slate-300">
                    <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest block print:text-slate-600">CPF Meta</span>
                    <span className="text-xs font-black text-emerald-300 print:text-black">{(g.cpfMeta || 85).toFixed(0)}%</span>
                  </div>
                </div>

                {/* RETIRADAS & CONVERSÃO DO GRUPO */}
                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800 space-y-0.5 print:bg-white print:border-slate-300">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block print:text-slate-600">Retiradas</span>
                    <Badge className={cn("text-[8px] font-black uppercase px-1 py-0.5 border-none truncate w-full justify-center", pickupBadgeBg)}>
                      {pickupStatusBadge}
                    </Badge>
                  </div>
                  <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800 space-y-0.5 print:bg-white print:border-slate-300">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block print:text-slate-600">Conversão</span>
                    <Badge className={cn("text-[8px] font-black uppercase px-1 py-0.5 border-none truncate w-full justify-center", convBadgeBg)}>
                      {convStatusBadge}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-bold pt-1 border-t border-slate-800 text-slate-300 print:border-slate-300 print:text-black">
                  <span>Colaboradores:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-400 font-black print:text-emerald-700">{withinCount} na meta</span>
                    <span className="text-slate-500">/</span>
                    <span>{posMembers.length} tot.</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* LEGENDA DE VERIFICAÇÃO DE CORES E NÍVEIS DE ALERTA */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col gap-2 text-xs print:border-black">
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-300 print:text-black">
            <span className="text-slate-400 font-black uppercase tracking-wider">Status de Atingimento:</span>
            <div className="flex items-center gap-1">
              <Badge className="bg-emerald-500 text-white font-black text-[9px] px-2 py-0.5 border-none gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>ATINGIDO (≥ 100%)</span>
              </Badge>
              <span className="text-slate-400 font-normal">Alvo Atingido</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge className="bg-amber-400 text-slate-950 font-black text-[9px] px-2 py-0.5 border-none gap-1">
                <Info className="w-3 h-3" />
                <span>NA TRAVE (90% a 99,99%)</span>
              </Badge>
              <span className="text-slate-400 font-normal">Próximo da Meta</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge className="bg-orange-500 text-white font-black text-[9px] px-2 py-0.5 border-none gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>ATENÇÃO (75% a 89,99%)</span>
              </Badge>
              <span className="text-slate-400 font-normal">Abaixo da Meta</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge className="bg-rose-600 text-white font-black text-[9px] px-2 py-0.5 border-none gap-1">
                <XCircle className="w-3 h-3" />
                <span>CRÍTICO (&lt; 75%)</span>
              </Badge>
              <span className="text-slate-400 font-normal">Desempenho Crítico</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-300 pt-1.5 border-t border-slate-800/60 print:text-black">
            <span className="text-slate-400 font-black uppercase tracking-wider">Indicador Conversão:</span>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span className="text-emerald-400 font-bold">Verde (≥ 30%)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span className="text-amber-400 font-bold">Amarelo (22% a 29,99%)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              <span className="text-rose-400 font-bold">Vermelho (&lt; 22%)</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-300 pt-1.5 border-t border-slate-800/60 print:text-black">
            <span className="text-slate-400 font-black uppercase tracking-wider">Indicador Retiradas:</span>
            <div className="flex items-center gap-1">
              <span className="text-emerald-400 font-bold">P3 Salão:</span>
              <span className="text-slate-300 font-normal">🟢 &gt; 70% das retiradas | 🔴 ≤ 70%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-emerald-400 font-bold">P1 Caixa:</span>
              <span className="text-slate-300 font-normal">🟢 ≤ 30% das retiradas | 🔴 &gt; 30%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-emerald-400 font-bold">P2 Porta / Outras:</span>
              <span className="text-slate-300 font-normal">🟢 0 retiradas | 🔴 &gt; 0 retiradas</span>
            </div>
          </div>
        </div>
      </Card>

      {/* TABELA CONSOLIDADA */}
      <Card className="ri-card overflow-hidden print:shadow-none print:border print:border-black print:w-full print:rounded-none">
        <Table className="border border-slate-200 print:table-fixed print:border-collapse">
          <TableHeader className="bg-slate-900 print:bg-slate-200">
            <TableRow className="hover:bg-slate-900 border-none h-11 print:h-7 print:border-b print:border-black divide-x divide-slate-700 print:divide-black">
              <TableHead className="text-white print:text-black font-black uppercase text-[9px] text-center align-middle print:w-[12%] w-32 md:w-36 whitespace-nowrap">Colaborador</TableHead>
              <SortableHead label="Status Meta" sortKey="status" currentSort={sortConfig} onSort={setSortConfig} className="text-center align-middle print:w-[8%]" />
              <SortableHead label="Venda (% Total)" sortKey="venda" currentSort={sortConfig} onSort={setSortConfig} className="text-center align-middle print:w-[9%]" />
              <SortableHead label="Cupons (% Total)" sortKey="cupons" currentSort={sortConfig} onSort={setSortConfig} className="text-center align-middle print:w-[6%]" />
              <SortableHead label="Itens" sortKey="itens" currentSort={sortConfig} onSort={setSortConfig} className="text-center align-middle print:w-[5%]" />
              <SortableHead label="PA (Meta)" sortKey="pa" currentSort={sortConfig} onSort={setSortConfig} className="text-center align-middle print:w-[8%]" />
              <SortableHead label="Ticket Méd. (Meta)" sortKey="tkm" currentSort={sortConfig} onSort={setSortConfig} className="text-center align-middle print:w-[9%]" />
              <SortableHead label="Preço Méd. (Meta)" sortKey="pm" currentSort={sortConfig} onSort={setSortConfig} className="text-center align-middle print:w-[8%]" />
              <SortableHead label="CPF / Cadastros (Meta)" sortKey="ident" currentSort={sortConfig} onSort={setSortConfig} className="text-center align-middle print:w-[7%]" />
              <TableHead className="text-white print:text-black font-black uppercase text-[9px] text-center align-middle print:w-[4%]">SLP</TableHead>
              <TableHead className="text-white print:text-black font-black uppercase text-[9px] text-center align-middle print:w-[4%]">BAR</TableHead>
              <TableHead className="text-white print:text-black font-black uppercase text-[9px] text-center align-middle print:w-[4%]">SAC</TableHead>
              <SortableHead label="Retiradas" sortKey="pickups" currentSort={sortConfig} onSort={setSortConfig} className="text-center align-middle print:w-[5%]" />
              <SortableHead label="Adicionais" sortKey="adicionais" currentSort={sortConfig} onSort={setSortConfig} className="text-center align-middle print:w-[5%]" />
              <SortableHead label="Conversão" sortKey="conv" currentSort={sortConfig} onSort={setSortConfig} className="text-center align-middle print:w-[6%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {["P3", "P2", "P1", "DIG", "NONE"].map(posKey => {
               const posInfo = POSITIONS[posKey as keyof typeof POSITIONS];
               const members = reportData.filter(r => r.finalPosKey === posKey);
               if (members.length === 0) return null;

               // Calcs for Subtotal
               const gCupons = members.reduce((acc, v) => acc + v.current.cupons, 0);
               const gItens = members.reduce((acc, v) => acc + v.current.itens, 0);
               const gVenda = members.reduce((acc, v) => acc + v.current.venda, 0);
               const gIdent = members.reduce((acc, v) => acc + v.filtered.ident, 0);
               const gSlp = members.reduce((acc, v) => acc + v.slpQty, 0);
               const gBaralhos = members.reduce((acc, v) => acc + v.baralhoQty, 0);
               const gSacolas = members.reduce((acc, v) => acc + v.sacolaQty, 0);
               const gPickups = members.reduce((acc, v) => acc + v.pickupsAtendidas, 0);
               const gAdic = members.reduce((acc, v) => acc + v.adicionaisFeitos, 0);

               const gPa = gCupons > 0 ? gItens / gCupons : 0;
               const gTkm = gCupons > 0 ? gVenda / gCupons : 0;
               const gPm = gItens > 0 ? gVenda / gItens : 0;
               const gIdentPerc = gCupons > 0 ? Math.min(gIdent / gCupons, 1) * 100 : 0;
               const gConv = gPickups > 0 ? (gAdic / gPickups) * 100 : 0;

               const posGoal = positionGoals[posKey] || DEFAULT_POSITION_GOALS[posKey] || DEFAULT_POSITION_GOALS["LOJA"];
               const isSubtotalPaOk = gPa >= posGoal.paMeta;
               const isSubtotalTkmOk = gTkm >= posGoal.tkmMeta;
               const isSubtotalOk = isSubtotalPaOk && isSubtotalTkmOk;

               return (
                 <React.Fragment key={posKey}>
                   {members.map((v, i) => {
                      const rowColor = v.groupColor || "bg-white";

                      return (
                        <TableRow 
                          key={v.name + i} 
                          onClick={() => setSelectedColab(v)}
                          className={cn("border-b border-slate-200 divide-x divide-slate-200 group cursor-pointer print:bg-white print:border-b print:border-slate-300 print:h-8 h-11 print:divide-slate-300", rowColor)}>
                          <TableCell className="text-center align-middle whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <Select value={v.finalPosKey} onValueChange={(val) => setManualPositions(prev => ({...prev, [v.name]: val}))}>
                                <SelectTrigger className={cn("h-6 w-8 flex-shrink-0 text-[11px] px-0 py-0 border-none flex items-center justify-center rounded cursor-pointer transition-colors shadow-none print:hidden", posInfo.color, "[&>svg]:hidden")} onClick={(e) => e.stopPropagation()}>
                                  <span>{posInfo.label.split(' ')[0]}</span>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="P1" className="text-[10px] font-black uppercase text-rose-800">🟥 P1 CAIXA</SelectItem>
                                  <SelectItem value="P2" className="text-[10px] font-black uppercase text-amber-800">🟨 P2 PORTA</SelectItem>
                                  <SelectItem value="P3" className="text-[10px] font-black uppercase text-emerald-800">🟩 P3 SALÃO</SelectItem>
                                  <SelectItem value="DIG" className="text-[10px] font-black uppercase text-sky-800">🟦 DIGITAL</SelectItem>
                                  <SelectItem value="NONE" className="text-[10px] font-black uppercase text-slate-500">➖ SEM VENDAS</SelectItem>
                                </SelectContent>
                              </Select>
                              <span className="hidden print:inline-block mr-1 text-[8px]">{posInfo.label.split(' ')[0]}</span>
                              <p className={cn("font-black text-slate-800 uppercase leading-none text-[11px] md:text-xs print:text-[8px] truncate")}>{v.name}</p>
                            </div>
                          </TableCell>
                          
                          <TableCell className="text-center align-middle">
                            <Badge className={cn("font-black text-[9px] uppercase px-2 py-0.5 border-none shadow-sm gap-1", v.overallAtt.badgeClass)}>
                              {v.overallAtt.icon === 'check' ? <CheckCircle2 className="w-3 h-3" /> :
                               v.overallAtt.icon === 'info' ? <Info className="w-3 h-3 text-slate-950" /> :
                               v.overallAtt.icon === 'alert' ? <AlertTriangle className="w-3 h-3 text-white" /> :
                               <XCircle className="w-3 h-3 text-white" />}
                              <span>{v.overallAtt.shortLabel}</span>
                            </Badge>
                          </TableCell>

                          <TableCell className="text-center align-middle">
                            <div className="flex flex-col items-center justify-center">
                              <span className="font-black text-slate-800 text-xs md:text-sm print:text-[8px]">{formatBRL(v.current.venda)}</span>
                              <span className="text-[8px] font-bold text-slate-400 print:hidden">
                                {(totals.venda > 0 ? (v.current.venda / totals.venda) * 100 : 0).toFixed(1)}% do total
                              </span>
                            </div>
                          </TableCell>
                          
                          <TableCell className="text-center align-middle">
                            <div className="flex flex-col items-center justify-center">
                              <span className="font-black text-slate-700 text-xs md:text-sm print:text-[8px]">{v.current.cupons}</span>
                              <span className="text-[8px] font-bold text-slate-400 print:hidden">
                                {(totals.cupons > 0 ? (v.current.cupons / totals.cupons) * 100 : 0).toFixed(1)}% do total
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="text-center align-middle">
                            <span className="font-black text-slate-700 text-xs md:text-sm print:text-[8px]">{v.current.itens.toFixed(0)}</span>
                          </TableCell>

                          <TableCell className="text-center align-middle">
                            <div className="flex flex-col items-center justify-center">
                              <div className="flex items-center justify-center gap-0.5">
                                <span className={cn("font-black text-xs md:text-sm print:text-[8px]", v.paAtt.textClass)}>
                                  {formatNum(v.metrics.pa)}
                                </span>
                                {v.paAtt.icon === 'check' ? <CheckCircle2 className="w-3 h-3 text-emerald-600 print:hidden" /> :
                                 v.paAtt.icon === 'info' ? <Info className="w-3 h-3 text-amber-600 print:hidden" /> :
                                 v.paAtt.icon === 'alert' ? <AlertTriangle className="w-3 h-3 text-orange-500 print:hidden" /> :
                                 <XCircle className="w-3 h-3 text-rose-500 print:hidden" />}
                              </div>
                              <span className="text-[8px] font-bold text-slate-400 print:hidden">
                                Meta {formatNum(v.posPaMeta)}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="text-center align-middle">
                            <div className="flex flex-col items-center justify-center">
                              <div className="flex items-center justify-center gap-0.5">
                                <span className={cn("font-black text-xs md:text-sm print:text-[8px]", v.tkmAtt.textClass)}>
                                  {formatBRL(v.metrics.tkm)}
                                </span>
                                {v.tkmAtt.icon === 'check' ? <CheckCircle2 className="w-3 h-3 text-emerald-600 print:hidden" /> :
                                 v.tkmAtt.icon === 'info' ? <Info className="w-3 h-3 text-amber-600 print:hidden" /> :
                                 v.tkmAtt.icon === 'alert' ? <AlertTriangle className="w-3 h-3 text-orange-500 print:hidden" /> :
                                 <XCircle className="w-3 h-3 text-rose-500 print:hidden" />}
                              </div>
                              <span className="text-[8px] font-bold text-slate-400 print:hidden">
                                Meta {formatBRL(v.posTkmMeta)}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="text-center align-middle">
                            <div className="flex flex-col items-center justify-center">
                              <div className="flex items-center justify-center gap-0.5">
                                <span className={cn("font-black text-xs md:text-sm print:text-[8px]", v.pmAtt.textClass)}>
                                  {formatBRL(v.metrics.pm)}
                                </span>
                                {v.pmAtt.icon === 'check' ? <CheckCircle2 className="w-3 h-3 text-emerald-600 print:hidden" /> :
                                 v.pmAtt.icon === 'info' ? <Info className="w-3 h-3 text-amber-600 print:hidden" /> :
                                 v.pmAtt.icon === 'alert' ? <AlertTriangle className="w-3 h-3 text-orange-500 print:hidden" /> :
                                 <XCircle className="w-3 h-3 text-rose-500 print:hidden" />}
                              </div>
                              <span className="text-[8px] font-bold text-slate-400 print:hidden">
                                Meta {formatBRL(v.posPmMeta)}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="text-center align-middle">
                            <div className="flex flex-col items-center justify-center">
                              <div className="flex items-center justify-center gap-0.5">
                                <span className={cn("font-black text-xs md:text-sm print:text-[8px]", v.cpfAtt.textClass)}>
                                  {v.metrics.ident.toFixed(0)}%
                                </span>
                                {v.cpfAtt.icon === 'check' ? <CheckCircle2 className="w-3 h-3 text-emerald-600 print:hidden" /> :
                                 v.cpfAtt.icon === 'info' ? <Info className="w-3 h-3 text-amber-600 print:hidden" /> :
                                 v.cpfAtt.icon === 'alert' ? <AlertTriangle className="w-3 h-3 text-orange-500 print:hidden" /> :
                                 <XCircle className="w-3 h-3 text-rose-500 print:hidden" />}
                              </div>
                              <span className="text-[8px] font-bold text-slate-400 print:hidden">
                                Meta {v.posCpfMeta.toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="text-center align-middle">
                            <span className="hidden print:inline text-[8px] font-black">{v.slpQty}</span>
                            <Badge className={cn("print:hidden font-black border-none px-1.5 text-[10px] h-5", v.slpQty > 0 ? "bg-orange-100 text-orange-700" : "bg-slate-50 text-slate-300")}>
                              {v.slpQty}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-center align-middle">
                            <span className="hidden print:inline text-[8px] font-black">{v.baralhoQty}</span>
                            <Badge className={cn("print:hidden font-black border-none px-1.5 text-[10px] h-5", v.baralhoQty > 0 ? "bg-rose-100 text-rose-700" : "bg-slate-50 text-slate-300")}>
                              {v.baralhoQty}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-center align-middle">
                            <span className="hidden print:inline text-[8px] font-black">{v.sacolaQty}</span>
                            <Badge className={cn("print:hidden font-black border-none px-1.5 text-[10px] h-5", v.sacolaQty > 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-50 text-slate-300")}>
                              {v.sacolaQty}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-center align-middle">
                            <span className="hidden print:inline text-[8px] font-black">{v.pickupsAtendidas}</span>
                            <Badge className={cn(
                              "print:hidden font-black border-none px-1.5 text-[10px] h-5",
                              v.finalPosKey === "P3" ? (v.pickupsAtendidas > 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-50 text-slate-400") :
                              v.finalPosKey === "P1" ? (v.pickupsAtendidas > 0 ? "bg-sky-100 text-sky-800" : "bg-slate-50 text-slate-400") :
                              (v.pickupsAtendidas === 0 ? "bg-slate-50 text-slate-400" : "bg-rose-100 text-rose-800")
                            )}>
                              {v.pickupsAtendidas}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-center align-middle">
                            <span className="hidden print:inline text-[8px] font-black">{v.adicionaisFeitos}</span>
                            <Badge className={cn("print:hidden font-black border-none px-1.5 text-[10px] h-5", v.adicionaisFeitos > 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-50 text-slate-300")}>
                              {v.adicionaisFeitos}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-center align-middle">
                            <Badge className={cn(
                              "print:hidden font-black border-none px-2 text-[10px] h-5",
                              v.metrics.conv >= 30 ? "bg-emerald-500 text-white" : v.metrics.conv >= 22 ? "bg-amber-500 text-slate-950 font-extrabold" : v.pickupsAtendidas > 0 ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-500"
                            )}>
                              <div className="flex items-center gap-1">
                                {formatNum(v.metrics.conv, 1)}%
                                {v.metrics.conv >= 30 ? <CheckCircle2 className="w-2.5 h-2.5 text-white" /> : v.metrics.conv >= 22 ? <Info className="w-2.5 h-2.5 text-slate-950" /> : v.pickupsAtendidas > 0 ? <XCircle className="w-2.5 h-2.5 text-white" /> : null}
                              </div>
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                   {/* SUBTOTAL ROW */}
                   {(() => {
                     const posGoal = positionGoals[posKey] || DEFAULT_POSITION_GOALS[posKey] || DEFAULT_POSITION_GOALS["LOJA"];
                     const posPmGoal = posGoal.paMeta > 0 ? (posGoal.tkmMeta / posGoal.paMeta) : 0;
                     const posCpfGoal = posGoal.cpfMeta || 85.0;

                     const subPaAtt = getAttainmentLevel(gPa, posGoal.paMeta);
                     const subTkmAtt = getAttainmentLevel(gTkm, posGoal.tkmMeta);
                     const subPmAtt = getAttainmentLevel(gPm, posPmGoal);
                     const subCpfAtt = getAttainmentLevel(gIdentPerc, posCpfGoal);
                     const subAvgPct = (subPaAtt.pct + subTkmAtt.pct + subPmAtt.pct + subCpfAtt.pct) / 4;
                     const subOverall = getAttainmentLevel(subAvgPct, 100);

                     const subVendaShare = totals.venda > 0 ? (gVenda / totals.venda) * 100 : 0;
                     const subCuponsShare = totals.cupons > 0 ? (gCupons / totals.cupons) * 100 : 0;

                     return (
                       <TableRow className="border-t border-b-[6px] border-b-slate-100 print:border-b-2 print:border-black font-black bg-slate-900 text-white hover:bg-slate-800 transition-colors divide-x divide-slate-700 print:divide-black">
                         <TableCell className="text-center align-middle text-[9px] uppercase tracking-wider text-slate-300 whitespace-nowrap">
                           <span className="bg-white/10 px-2 py-1 rounded-md border border-white/10 inline-block">Subtotal • {posInfo.label.split(' ')[0]} {posInfo.label.split(' ')[1]}</span>
                         </TableCell>
                         <TableCell className="text-center align-middle">
                           <Badge className={cn("font-black text-[9px] uppercase border-none px-1.5 py-0.5", subOverall.badgeClass)}>
                             {subOverall.shortLabel}
                           </Badge>
                         </TableCell>
                         <TableCell className="text-center align-middle text-xs md:text-sm print:text-[8px] text-emerald-400">
                           <div className="flex flex-col items-center">
                             <span>{formatBRL(gVenda)}</span>
                             <span className="text-[8px] font-bold text-slate-400 print:hidden">{subVendaShare.toFixed(1)}% do total</span>
                           </div>
                         </TableCell>
                         <TableCell className="text-center align-middle text-xs md:text-sm print:text-[8px]">
                           <div className="flex flex-col items-center">
                             <span>{gCupons}</span>
                             <span className="text-[8px] font-bold text-slate-400 print:hidden">{subCuponsShare.toFixed(1)}% do total</span>
                           </div>
                         </TableCell>
                         <TableCell className="text-center align-middle text-xs md:text-sm print:text-[8px]">{gItens.toFixed(0)}</TableCell>
                         <TableCell className={cn("text-center align-middle text-xs md:text-sm print:text-[8px] font-black", subPaAtt.textClass)}>{formatNum(gPa)}</TableCell>
                         <TableCell className={cn("text-center align-middle text-xs md:text-sm print:text-[8px] font-black", subTkmAtt.textClass)}>{formatBRL(gTkm)}</TableCell>
                         <TableCell className={cn("text-center align-middle text-xs md:text-sm print:text-[8px] font-black", subPmAtt.textClass)}>{formatBRL(gPm)}</TableCell>
                         <TableCell className={cn("text-center align-middle text-xs md:text-sm print:text-[8px] font-black", subCpfAtt.textClass)}>{gIdentPerc.toFixed(0)}%</TableCell>
                         <TableCell className="text-center align-middle text-[10px] md:text-xs print:text-[8px] text-slate-300">{gSlp}</TableCell>
                         <TableCell className="text-center align-middle text-[10px] md:text-xs print:text-[8px] text-slate-300">{gBaralhos}</TableCell>
                         <TableCell className="text-center align-middle text-[10px] md:text-xs print:text-[8px] text-slate-300">{gSacolas}</TableCell>
                         <TableCell className={cn("text-center align-middle text-[10px] md:text-xs print:text-[8px] font-black", (posKey === "P3" ? (totals.pickups > 0 && (gPickups / totals.pickups) > 0.7) : posKey === "P1" ? (totals.pickups > 0 && (gPickups / totals.pickups) <= 0.3) : gPickups === 0) ? "text-emerald-400" : "text-rose-400")}>{gPickups}</TableCell>
                         <TableCell className="text-center align-middle text-[10px] md:text-xs print:text-[8px] text-slate-300">{gAdic}</TableCell>
                         <TableCell className={cn("text-center align-middle text-[10px] md:text-xs print:text-[8px] font-black", gConv >= 30 ? "text-emerald-400" : gConv >= 22 ? "text-amber-400" : gPickups > 0 ? "text-rose-400" : "text-slate-300")}>{formatNum(gConv, 1)}%</TableCell>
                       </TableRow>
                     );
                   })()}
                 </React.Fragment>
               );
            })}
          </TableBody>
          <TableFooter className="bg-slate-900 print:bg-slate-200">
            <TableRow className="hover:bg-slate-900 border-none h-12 print:h-7 print:border-t print:border-black font-black divide-x divide-slate-700 print:divide-black">
              <TableCell className="text-center align-middle text-white print:text-black uppercase text-[11px] md:text-xs print:text-[8px] whitespace-nowrap">Consolidado Loja</TableCell>
              <TableCell className="text-center align-middle">
                {(() => {
                  const storePaAtt = getAttainmentLevel(totals.pa, 1.75);
                  const storeTkmAtt = getAttainmentLevel(totals.tkm, 150.00);
                  const storePmAtt = getAttainmentLevel(totals.pm, 150.00 / 1.75);
                  const storeCpfAtt = getAttainmentLevel(totals.ident_perc, 85.0);
                  const storeAvg = (storePaAtt.pct + storeTkmAtt.pct + storePmAtt.pct + storeCpfAtt.pct) / 4;
                  const storeOverall = getAttainmentLevel(storeAvg, 100);
                  return (
                    <Badge className={cn("font-black text-[9px] uppercase border-none px-2 py-0.5", storeOverall.badgeClass)}>
                      {storeOverall.shortLabel}
                    </Badge>
                  );
                })()}
              </TableCell>
              <TableCell className="text-center align-middle text-emerald-400 print:text-black text-xs md:text-sm print:text-[8px]">
                <div className="flex flex-col items-center">
                  <span>{formatBRL(totals.venda)}</span>
                  <span className="text-[8px] font-bold text-slate-400 print:hidden">100% total</span>
                </div>
              </TableCell>
              <TableCell className="text-center align-middle text-sky-400 print:text-black text-xs md:text-sm print:text-[8px]">
                <div className="flex flex-col items-center">
                  <span>{totals.cupons}</span>
                  <span className="text-[8px] font-bold text-slate-400 print:hidden">100% total</span>
                </div>
              </TableCell>
              <TableCell className="text-center align-middle text-white print:text-black text-xs md:text-sm print:text-[8px]">{totals.itens.toFixed(0)}</TableCell>
              <TableCell className={cn("text-center align-middle text-xs md:text-sm print:text-[8px] font-black", totals.pa >= 1.75 ? "text-emerald-400" : "text-rose-400")}>{formatNum(totals.pa)}</TableCell>
              <TableCell className={cn("text-center align-middle text-xs md:text-sm print:text-[8px] font-black", totals.tkm >= 150 ? "text-emerald-400" : "text-rose-400")}>{formatBRL(totals.tkm)}</TableCell>
              <TableCell className="text-center align-middle text-white print:text-black text-xs md:text-sm print:text-[8px]">{formatBRL(totals.pm)}</TableCell>
              <TableCell className="text-center align-middle text-white print:text-black text-xs md:text-sm print:text-[8px]">{totals.ident_perc.toFixed(0)}%</TableCell>
              <TableCell className="text-center align-middle text-orange-400 print:text-black text-[10px] md:text-xs print:text-[8px]">{totals.slp}</TableCell>
              <TableCell className="text-center align-middle text-rose-400 print:text-black text-[10px] md:text-xs print:text-[8px]">{totals.baralhos}</TableCell>
              <TableCell className="text-center align-middle text-emerald-400 print:text-black text-[10px] md:text-xs print:text-[8px]">{totals.sacolas}</TableCell>
              <TableCell className="text-center align-middle text-sky-400 print:text-black text-[10px] md:text-xs print:text-[8px]">{totals.pickups}</TableCell>
              <TableCell className="text-center align-middle text-emerald-400 print:text-black text-[10px] md:text-xs print:text-[8px]">{totals.adicionais}</TableCell>
              <TableCell className={cn("text-center align-middle text-[10px] md:text-xs print:text-[8px] font-black", totals.conv >= 30 ? "text-emerald-400" : totals.conv >= 22 ? "text-amber-400" : "text-rose-400")}>{formatNum(totals.conv, 1)}%</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Card>

      {/* MURAL DE ALERTAS E INSIGHTS OPERACIONAIS */}
      <Card className="ri-card bg-slate-900 text-white p-5 md:p-6 rounded-2xl border border-slate-800 shadow-xl print:bg-white print:text-black print:border print:border-black space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4 print:border-black">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/20 text-amber-400 p-2.5 rounded-xl border border-amber-500/30 print:hidden">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-black uppercase tracking-tight text-white print:text-black">
                  Mural de Alertas & Resumo Operacional
                </h2>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 print:hidden">
                  Atualização Dinâmica
                </Badge>
              </div>
              <p className="text-[11px] font-medium text-slate-400 print:text-slate-600">
                Resumo em formato de texto dos gargalos, superações e recomendações atualizados ao editar as posições na tabela.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {/* ALERTAS CRÍTICOS & GARGALOS */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-rose-500/30 space-y-3 print:bg-slate-50 print:border-black">
            <div className="flex items-center gap-2 text-rose-400 font-black text-xs uppercase tracking-wider print:text-rose-700">
              <AlertCircle className="w-4 h-4" />
              <span>Gargalos & Atenção ({insights.alerts.length})</span>
            </div>
            <div className="space-y-2">
              {insights.alerts.length === 0 ? (
                <p className="text-[11px] text-emerald-400 font-bold italic">Nenhum gargalo identificado. Operação no alvo!</p>
              ) : (
                insights.alerts.map((alertText, idx) => (
                  <div key={idx} className="bg-rose-950/30 border border-rose-500/20 p-2.5 rounded-lg flex items-start gap-2 print:bg-rose-50 print:border-rose-300">
                    <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 flex-shrink-0" />
                    <p className="text-[11px] font-bold leading-snug text-rose-200 print:text-rose-950">{alertText}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* DESTAQUES POSITIVOS */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-emerald-500/30 space-y-3 print:bg-slate-50 print:border-black">
            <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider print:text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              <span>Destaques Positivos ({insights.highlights.length})</span>
            </div>
            <div className="space-y-2">
              {insights.highlights.length === 0 ? (
                <p className="text-[11px] text-slate-400 font-bold italic">Nenhum destaque mapeado no momento.</p>
              ) : (
                insights.highlights.map((highText, idx) => (
                  <div key={idx} className="bg-emerald-950/30 border border-emerald-500/20 p-2.5 rounded-lg flex items-start gap-2 print:bg-emerald-50 print:border-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
                    <p className="text-[11px] font-bold leading-snug text-emerald-200 print:text-emerald-950">{highText}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RECOMENDAÇÕES PARA O GESTOR */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-indigo-500/30 space-y-3 print:bg-slate-50 print:border-black">
            <div className="flex items-center gap-2 text-indigo-400 font-black text-xs uppercase tracking-wider print:text-indigo-700">
              <Lightbulb className="w-4 h-4" />
              <span>Plano de Ação para o Gestor ({insights.recommendations.length})</span>
            </div>
            <div className="space-y-2">
              {insights.recommendations.length === 0 ? (
                <p className="text-[11px] text-slate-400 font-bold italic">Manter alocação e fluxo operacional atual.</p>
              ) : (
                insights.recommendations.map((recText, idx) => (
                  <div key={idx} className="bg-indigo-950/30 border border-indigo-500/20 p-2.5 rounded-lg flex items-start gap-2 print:bg-indigo-50 print:border-indigo-300">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1 flex-shrink-0" />
                    <p className="text-[11px] font-bold leading-snug text-indigo-200 print:text-indigo-950">{recText}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* fecha captureRef */}
      </div>

      <Sheet open={!!selectedColab} onOpenChange={(open) => !open && setSelectedColab(null)}>
        <SheetContent className="w-full sm:max-w-md bg-white border-l-4 border-slate-900 p-0 overflow-y-auto">
          {selectedColab && (
            <div className="h-full flex flex-col">
              <div className="bg-slate-900 p-6 md:p-8 space-y-2 border-b-4 border-indigo-500">
                <SheetTitle className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter leading-none">{selectedColab.name}</SheetTitle>
                <SheetDescription className="text-slate-400 font-bold uppercase text-[9px] md:text-[10px] tracking-[0.2em]">{selectedColab.group}</SheetDescription>
              </div>
              <div className="p-6 md:p-8 space-y-6 flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Faturamento</p>
                    <p className="text-lg font-black text-slate-800">{formatBRL(selectedColab.current.venda)}</p>
                    <p className="text-[9px] font-bold text-indigo-600 uppercase mt-0.5">{(totals.venda > 0 ? (selectedColab.current.venda / totals.venda) * 100 : 0).toFixed(1)}% da loja</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Tickets</p>
                    <p className="text-lg font-black text-slate-800">{selectedColab.current.cupons}</p>
                    <p className="text-[9px] font-bold text-indigo-600 uppercase mt-0.5">{(totals.cupons > 0 ? (selectedColab.current.cupons / totals.cupons) * 100 : 0).toFixed(1)}% da loja</p>
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">Detalhes Operacionais</h4>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">SLP Campanha</span>
                        <span className="text-sm font-black text-orange-600">{selectedColab.slpQty} ITENS</span>
                     </div>
                     <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Baralhos 🃏</span>
                        <span className="text-sm font-black text-rose-600">{selectedColab.baralhoQty} ITENS</span>
                     </div>
                     <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Sacolas 🛍️</span>
                        <span className="text-sm font-black text-emerald-600">{selectedColab.sacolaQty} ITENS</span>
                     </div>
                     <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Retiradas</span>
                        <span className="text-sm font-black text-sky-600">{selectedColab.pickupsAtendidas}</span>
                     </div>
                     <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Vendas Adicionais</span>
                        <span className="text-sm font-black text-emerald-600">{selectedColab.adicionaisFeitos}</span>
                     </div>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-100">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    Avaliação vs Meta da Posição ({selectedColab.posMeta.name})
                  </h4>
                  <div className="space-y-3">
                    <PerformanceMetric 
                      label="P.A. (FILTRADO)" 
                      value={formatNum(selectedColab.metrics.pa)} 
                      average={`Meta: ${formatNum(selectedColab.posPaMeta)}`} 
                      delta={selectedColab.metrics.pa - selectedColab.posPaMeta} 
                    />
                    <PerformanceMetric 
                      label="TICKET MÉDIO (FILTRADO)" 
                      value={formatBRL(selectedColab.metrics.tkm)} 
                      average={`Meta: ${formatBRL(selectedColab.posTkmMeta)}`} 
                      delta={selectedColab.metrics.tkm - selectedColab.posTkmMeta} 
                      isCurrency 
                    />
                    <PerformanceMetric 
                      label="PREÇO MÉDIO (P.M.)" 
                      value={formatBRL(selectedColab.metrics.pm)} 
                      average={`Meta: ${formatBRL(selectedColab.posPmMeta)}`} 
                      delta={selectedColab.metrics.pm - selectedColab.posPmMeta} 
                      isCurrency 
                    />
                    <PerformanceMetric 
                      label="IDENTIFICAÇÃO (CPF)" 
                      value={`${selectedColab.metrics.ident.toFixed(0)}%`} 
                      average={`Meta: ${selectedColab.posCpfMeta.toFixed(0)}%`} 
                      delta={selectedColab.metrics.ident - selectedColab.posCpfMeta} 
                      isPercent 
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t bg-slate-50">
                <Button onClick={() => setSelectedColab(null)} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl h-14 md:h-16 text-sm shadow-lg uppercase tracking-wide">FECHAR DETALHES</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* RODAPÉ TÉCNICO */}
      <div className="flex justify-between items-center text-[8px] font-black text-slate-400 uppercase tracking-widest px-4 border-t pt-4 print:pt-1 print:border-none print:text-slate-600">
        <div className="flex items-center gap-2">
          <Info className="w-3 h-3 print:hidden" />
          <p>Comparativo Justo por Posicionamento Ativado • Auditoria Interna Ri Happy</p>
          <AnalysisHelp 
            title="Posicionamento de Loja" 
            description="Os colaboradores são divididos automaticamente baseados no seu comportamento (Ex: Alto Volume e Baixo PA = Caixa. PA Alto = Salão). Isso permite cobrar resultados justos de cada um de acordo com sua função real no dia a dia, não apenas do cargo." 
            className="text-slate-400 hover:text-slate-600"
            iconClassName="w-3 h-3"
          />
        </div>
        <p>RESTRITO: USO GERENCIAL</p>
      </div>

      <style jsx global>{`
        @media print {
          @page { 
            size: A4 landscape; 
            margin: 0.3cm; 
          }
          body, html { 
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            color: black !important;
          }
          
          header, aside, .sidebar-trigger, [data-sidebar="sidebar"], .print\:hidden, button, [role="switch"], .legenda-grupos {
            display: none !important;
          }

          main, [data-sidebar-wrapper], .group\/sidebar-wrapper, .flex-1 {
            display: block !important;
            height: auto !important;
            overflow: visible !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: none !important;
          }

          .ri-card { 
            border: 1px solid black !important; 
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }

          table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 7pt !important;
            table-layout: fixed !important;
            color: black !important;
          }

          th {
            background-color: #f1f5f9 !important;
            color: black !important;
            border-bottom: 1px solid black !important;
            font-weight: 900 !important;
          }

          td {
            padding: 1pt 1pt !important;
            border-bottom: 1px solid #e2e8f0 !important;
            color: black !important;
          }

          tr {
            page-break-inside: avoid !important;
          }

          .text-emerald-600 { color: #059669 !important; }
          .text-rose-500 { color: #e11d48 !important; }

          .print\:flex { display: flex !important; }
          .print\:items-center { align-items: center !important; }
          .print\:justify-between { justify-content: space-between !important; }
          .print\:border { border: 1px solid black !important; }
          .print\:p-1 { padding: 2pt !important; }
          .print\:bg-slate-50 { background-color: #f8fafc !important; }
          .print\:mb-2 { margin-bottom: 4pt !important; }

          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}

function ReportKPI({ label, value, icon: Icon, color, large }: any) {
  return (
    <Card className={cn(
      "ri-card border-none bg-white p-4 md:p-5 flex flex-col items-center justify-center text-center shadow-sm transition-all duration-300",
      large ? "h-28 md:h-36" : "h-24 md:h-28",
      "print:border-none print:h-auto print:p-1.5 print:bg-transparent print:flex-row print:items-center print:gap-1.5"
    )}>
      <div className="flex items-center justify-center mb-2 print:hidden">
        <div className={cn("p-2 rounded-xl bg-slate-50", color)}>
          <Icon className={cn(large ? "w-6 h-6" : "w-5 h-5")} />
        </div>
      </div>
      <div className="flex flex-col items-center justify-center print:flex-row print:items-center print:gap-1">
        <p className={cn(
          "font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5 print:mb-0 print:text-black",
          large ? "text-[10px] md:text-[11px]" : "text-[8px] md:text-[9px]",
          "print:text-[6.5px]"
        )}>
          {label}:
        </p>
        <p className={cn(
          "font-black text-slate-800 leading-none truncate print:text-black",
          large ? "text-lg md:text-2xl" : "text-sm md:text-lg",
          "print:text-[8px]"
        )}>
          {value}
        </p>
      </div>
    </Card>
  );
}

function SortableHead({ label, sortKey, currentSort, onSort, className }: any) {
  const isActive = currentSort.key === sortKey;
  const handleSort = () => {
    onSort({
      key: sortKey,
      direction: isActive && currentSort.direction === 'desc' ? 'asc' : 'desc'
    });
  };

  return (
    <TableHead 
      className={cn(
        "text-white print:text-black font-black uppercase text-[8px] md:text-[9px] transition-colors",
        className
      )}
    >
      <div className="flex items-center justify-center gap-1.5 w-full h-full">
        <button onClick={handleSort} className="hover:text-orange-500 flex items-center justify-center gap-1.5 focus:outline-none w-full">
          {label}
          <div className="flex flex-col">
            <ArrowUpRight className={cn("w-2 h-2 transition-all", isActive ? (currentSort.direction === 'asc' ? "text-orange-500" : "text-orange-500 opacity-50") : "text-white/20")} />
          </div>
        </button>
      </div>
    </TableHead>
  );
}

function PerformanceMetric({ label, value, average, delta, isCurrency, isPercent }: any) {
  const isPositive = delta > 0;
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
      <div>
        <p className="text-[10px] font-black text-slate-800 uppercase leading-none mb-1">{label}</p>
        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Média Grupo: {average}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-black text-slate-700">{value}</p>
        <p className={cn("text-[9px] font-bold flex items-center justify-end gap-1", isPositive ? "text-emerald-600" : "text-rose-500")}>
          {isPositive ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
          {isCurrency ? (delta > 0 ? "+" : "") + delta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : (isPercent ? (delta > 0 ? "+" : "") + delta.toFixed(1) + "%" : (delta > 0 ? "+" : "") + delta.toFixed(2))}
        </p>
      </div>
    </div>
  );
}
