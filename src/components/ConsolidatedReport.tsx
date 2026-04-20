"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ConsolidatedReportProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

// Helper para cores dinâmicas
const BUCKET_COLORS = [
  "bg-slate-100 text-slate-600",
  "bg-sky-100 text-sky-700",
  "bg-indigo-100 text-indigo-700",
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-purple-100 text-purple-700"
];

function getDynamicGroupInfo(count: number, step: number) {
  if (count <= 0) return { label: "Nenhum", color: "bg-white" };
  const bucketIdx = Math.floor((count - 1) / step);
  const start = bucketIdx * step + 1;
  const end = (bucketIdx + 1) * step;
  return {
    label: `Volume ${start}-${end}`,
    color: BUCKET_COLORS[bucketIdx % BUCKET_COLORS.length]
  };
}



const SLP_CODES = ['5135238', '5135269', '5135270', '5135273', '5146458', '5146469', '5146470', '5146471', '5146472', '5146473', '5146474', '5146475', '5146476', '5146501', '5146504', '5146505', '5141894', '5141895', '5141896', '5141897', '5141898', '5141899', '5141900', '5141902', '5141903', '5141904', '5141905', '5141907', '5141909', '5141910', '5141911', '5141912', '5141913', '5141914', '5141915', '5141916', '5141917', '5141920', '5141949', '5141978', '5140469', '5140475', '5140476', '5140477', '5140478', '5140479', '5146477', '5146478', '5146502', '5146503'];
const SOCIAL_CODES = ['5057181', '5055875', '5135601', '5129270', '5129271', '5129247', '5129262', '5122642', '5122641', '5135612', '5122639', '5122638', '5133676', '5113644', '5113641', '5113642', '5113643', '5129267', '5129255', '5143422', '5139528', '5143423', '5145833', '5139527', '5147797', '5147796', '5145834', '5079753', '5079752', '5106673', '5106671', '5106674', '5106672', '5088519', '5097336', '5097335', '5011918', '5136558'];
const BARALHO_CODES = ['5147797', '5147796'];
const SACOLA_CODES = ['5133676', '5113644'];

export function ConsolidatedReport({ data, vinculos }: ConsolidatedReportProps) {
  const [includePickups, setIncludePickups] = useState(false);
  const [includeExchanges, setIncludeExchanges] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedColab, setSelectedColab] = useState<any>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'venda',
    direction: 'desc'
  });
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [rangeStep, setRangeStep] = useState(50);

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
        base: { venda: 0, cupons: 0, itens: 0, ident: 0 },
        extra: { venda: 0, cupons: 0, itens: 0, ident: 0 },
        troca: { venda: 0, itens: 0, ident: 0 },
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

      const val = parseFloat(s.vNF);
      const qItens = parseFloat(s.itens_qtd);

      s.itens.forEach(it => {
        if (SLP_CODES.includes(it.cProd)) vendors[v].slpQty += it.qCom;
        if (SOCIAL_CODES.includes(it.cProd) || isBaralho(it) || isSacola(it)) {
          if (isBaralho(it)) vendors[v].baralhoQty += it.qCom;
          else if (isSacola(it)) vendors[v].sacolaQty += it.qCom;
          else vendors[v].baralhoQty += it.qCom; // Fallback for codes
        }
      });

      const isIdentified = s.cpf_cnpj_dest && s.cpf_cnpj_dest.trim() !== "";

      // Venda Física/Adicional (Base)
      if (s.canal === "LOJA_FISICA" || s.canal === "RETIRADA_ADICIONAL" || s.is_adicional || s.is_adicional_suspeito) {
        vendors[v].base.venda += val;
        vendors[v].base.cupons += 1;
        vendors[v].base.itens += qItens;
        if (isIdentified) vendors[v].base.ident += 1;
      }

      // Retirada Online (Extra)
      if (s.canal === "RETIRADA_ONLINE") {
        vendors[v].extra.venda += val;
        vendors[v].extra.cupons += 1;
        vendors[v].extra.itens += qItens;
        vendors[v].pickupsAtendidas += 1;
        if (isIdentified) vendors[v].extra.ident += 1;
      }

      if (s.is_adicional || s.is_adicional_suspeito || s.canal === "RETIRADA_ADICIONAL") {
        vendors[v].adicionaisFeitos += 1;
      }
    });

    vinculos.forEach(vinc => {
      const v = vinc.vendedor || "OUTROS";
      if (vendors[v]) {
        vendors[v].troca.venda += vinc.valor_diferenca;
        vendors[v].troca.itens += vinc.diferenca_itens;
        if (vinc.cpf_cliente) vendors[v].troca.ident += 1;
      }
    });

    const results = Object.values(vendors).map((v: any) => {
      // Cálculo Dinâmico baseado nos Toggles
      const totalVenda = v.base.venda + (includePickups ? v.extra.venda : 0) + (includeExchanges ? v.troca.venda : 0);
      const totalItens = v.base.itens + (includePickups ? v.extra.itens : 0) + (includeExchanges ? v.troca.itens : 0);
      const totalCupons = v.base.cupons + (includePickups ? v.extra.cupons : 0); 
      const totalIdent = v.base.ident + (includePickups ? v.extra.ident : 0) + (includeExchanges ? v.troca.ident : 0);

      const basePA = v.base.cupons > 0 ? v.base.itens / v.base.cupons : 0;
      const baseTKM = v.base.cupons > 0 ? v.base.venda / v.base.cupons : 0;
      const baseIdent = v.base.cupons > 0 ? (v.base.ident / v.base.cupons) * 100 : 0;

      const metrics = {
        pa: totalCupons > 0 ? totalItens / totalCupons : 0,
        tkm: totalCupons > 0 ? totalVenda / totalCupons : 0,
        pm: totalItens > 0 ? totalVenda / totalItens : 0,
        ident: totalCupons > 0 ? Math.min((totalIdent / totalCupons) * 100, 100) : 0,
        conv: v.pickupsAtendidas > 0 ? (v.adicionaisFeitos / v.pickupsAtendidas) * 100 : 0
      };

      const { label: groupLabel, color: groupColor } = getDynamicGroupInfo(totalCupons, rangeStep);

      return {
        ...v,
        group: groupLabel,
        groupColor: groupColor,
        current: { venda: totalVenda, cupons: totalCupons, itens: totalItens },
        metrics,
        deltas: {
          venda: totalVenda - v.base.venda,
          pa: metrics.pa - basePA,
          tkm: metrics.tkm - baseTKM,
          ident: metrics.ident - baseIdent
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
        (selectedGroup === "all" || r.group === selectedGroup) &&
        (searchTerm === "" || r.name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .map(r => ({
        ...r,
        groupAverages: groupStats[r.group]
      })).sort((a, b) => {
        let aVal = 0;
        let bVal = 0;
        
        switch(sortConfig.key) {
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
  }, [data, vinculos, includePickups, includeExchanges, selectedGroup, searchTerm, sortConfig]);

  const totals = useMemo(() => {
    const sum = reportData.reduce((acc, v) => ({
      venda: acc.venda + v.current.venda,
      cupons: acc.cupons + v.current.cupons,
      itens: acc.itens + v.current.itens,
      pickups: acc.pickups + v.pickupsAtendidas,
      adicionais: acc.adicionais + v.adicionaisFeitos
    }), { venda: 0, cupons: 0, itens: 0, pickups: 0, adicionais: 0 });

    return {
      ...sum,
      pa: sum.cupons > 0 ? sum.itens / sum.cupons : 0,
      tkm: sum.cupons > 0 ? sum.venda / sum.cupons : 0,
      conv: sum.pickups > 0 ? (sum.adicionais / sum.pickups) * 100 : 0
    };
  }, [reportData]);

  const handlePrint = () => window.print();

  const groupsAvailable = useMemo(() => {
    const labels = new Set(reportData.map(r => r.group));
    return Array.from(labels).sort((a, b) => {
      if (a === "Nenhum") return 1;
      if (b === "Nenhum") return -1;
      const numA = parseInt(a.split(" ")[1]?.split("-")[0] || "0");
      const numB = parseInt(b.split(" ")[1]?.split("-")[0] || "0");
      return numA - numB;
    });
  }, [reportData]);

  return (
    <div className={cn(
      "space-y-6 animate-in fade-in duration-500 pb-20 print:p-0 print:pb-0 print:space-y-0",
      isCollapsed ? "text-mode-large" : ""
    )}>
      {/* HEADER EXECUTIVO */}
      <div className="bg-white rounded-[2rem] p-6 border-2 border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 print:hidden">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-3 rounded-2xl text-white shadow-lg"><FileText className="w-6 h-6" /></div>
          <div className="hidden sm:block">
            <h1 className={cn("font-black uppercase tracking-tight text-slate-800", isCollapsed ? "text-2xl" : "text-xl")}>Performance Unificada</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Visão Geral e Individual do Time</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex-1 justify-end">
          <div className="flex flex-col gap-1.5 mr-auto">
            <Label className="text-[9px] font-black uppercase text-slate-400 px-1">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <input 
                type="text"
                placeholder="Nome..."
                className="h-9 w-32 md:w-48 pl-9 rounded-xl border-slate-200 bg-white font-bold text-[10px] uppercase outline-none focus:ring-1 focus:ring-orange-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>;
          {/* Novo Filtro de Grupo */}
          <div className="flex flex-col gap-1.5 mr-4">
            <Label className="text-[9px] font-black uppercase text-slate-400 px-1">Granularidade</Label>
            <Select value={rangeStep.toString()} onValueChange={(v) => { setRangeStep(parseInt(v)); setSelectedGroup("all"); }}>
              <SelectTrigger className="h-9 w-[100px] rounded-xl border-slate-200 bg-white font-black text-[10px] uppercase">
                 <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10" className="text-xs font-bold uppercase">De 10 em 10</SelectItem>
                <SelectItem value="25" className="text-xs font-bold uppercase">De 25 em 25</SelectItem>
                <SelectItem value="50" className="text-xs font-bold uppercase">De 50 em 50</SelectItem>
                <SelectItem value="100" className="text-xs font-bold uppercase">De 100 em 100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5 mr-4">
            <Label className="text-[9px] font-black uppercase text-slate-400 px-1">Filtrar Faixa</Label>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="h-9 w-[180px] rounded-xl border-slate-200 bg-white font-black text-[10px] uppercase">
                <div className="flex items-center gap-2">
                  <Filter className="w-3 h-3 text-orange-500" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-bold uppercase">Todas as Faixas</SelectItem>
                {groupsAvailable.map(g => (
                  <SelectItem key={g} value={g} className="text-xs font-bold uppercase">{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Switch id="inc-pickups" checked={includePickups} onCheckedChange={setIncludePickups} />
            <Label htmlFor="inc-pickups" className="text-[10px] font-black uppercase cursor-pointer flex items-center gap-1.5">
              <Smartphone className="w-3 h-3 text-sky-500" /> Incluir Retiradas
            </Label>
          </div>
          <div className="w-px h-6 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-3">
            <Switch id="inc-trocas" checked={includeExchanges} onCheckedChange={setIncludeExchanges} />
            <Label htmlFor="inc-trocas" className="text-[10px] font-black uppercase cursor-pointer flex items-center gap-1.5">
              <ArrowRightLeft className="w-3 h-3 text-purple-500" /> Incluir Trocas
            </Label>
          </div>
          <Button onClick={handlePrint} variant="outline" className="ml-4 rounded-xl font-black text-[10px] gap-2 border-slate-200 hover:bg-white hover:text-orange-500 shadow-sm">
            <Printer className="w-4 h-4" /> IMPRIMIR
          </Button>
        </div>
      </div>

      {/* CABEÇALHO PARA IMPRESSÃO */}
      <div className="hidden print:flex justify-between items-end border-b-2 border-black pb-1 mb-2">
        <div className="space-y-0.5">
          <h1 className="text-sm font-black uppercase leading-none">Ri Happy | Performance Consolidada</h1>
          <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">
            Visão: {selectedGroup === "all" ? "UNIDADE COMPLETA" : selectedGroup.toUpperCase()} • Físico {includePickups && "+ Retiradas"} {includeExchanges && "+ Trocas"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[8px] font-black uppercase">{new Date().toLocaleDateString('pt-BR')} - {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          <p className="text-[7px] font-bold text-slate-400">DOCUMENTO DE AUDITORIA INTERNA</p>
        </div>
      </div>

      {/* KPI TOTALIZADORES */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 print:flex print:items-center print:justify-between print:gap-4 print:p-2 print:bg-slate-50 print:mb-4 print:border-none">
        <ReportKPI label="Venda Grupo" value={formatBRL(totals.venda)} icon={TrendingUp} color="text-emerald-600" large={isCollapsed} />
        <ReportKPI label="Atendimentos" value={totals.cupons} icon={Users} color="text-sky-600" large={isCollapsed} />
        <ReportKPI label="P.A. Médio" value={formatNum(totals.pa)} icon={Target} color="text-orange-600" large={isCollapsed} />
        <ReportKPI label="Ticket Médio" value={formatBRL(totals.tkm)} icon={ShoppingBag} color="text-purple-600" large={isCollapsed} />
        <ReportKPI label="Baralhos" value={`🃏 ${reportData.reduce((acc, r) => acc + r.baralhoQty, 0)}`} icon={Heart} color="text-rose-600" large={isCollapsed} />
        <ReportKPI label="Conv. Real" value={`${formatNum(totals.conv, 1)}%`} icon={Zap} color="text-amber-500" large={isCollapsed} />
      </div>

      {/* TABELA CONSOLIDADA */}
      <Card className="ri-card overflow-hidden print:shadow-none print:border print:border-black print:w-full print:rounded-none">
        <Table className="print:table-fixed print:border-collapse">
          <TableHeader className="bg-slate-900 print:bg-slate-200">
            <TableRow className="hover:bg-slate-900 border-none h-10 md:h-12 print:h-7 print:border-b print:border-black">
              <TableHead className="text-white print:text-black font-black uppercase text-[8px] md:text-[9px] pl-4 md:pl-8 print:pl-1 print:w-[15%]">Colaborador</TableHead>
              <SortableHead label="Venda Total" sortKey="venda" currentSort={sortConfig} onSort={setSortConfig} className="text-right print:w-[10%]" />
              <SortableHead label="Cps" sortKey="cupons" currentSort={sortConfig} onSort={setSortConfig} className="text-center print:w-[5%]" />
              <SortableHead label="Its" sortKey="itens" currentSort={sortConfig} onSort={setSortConfig} className="text-center print:w-[5%]" />
              <SortableHead label="PA" sortKey="pa" currentSort={sortConfig} onSort={setSortConfig} className="text-center print:w-[6%]" />
              <SortableHead label="TKM" sortKey="tkm" currentSort={sortConfig} onSort={setSortConfig} className="text-right print:w-[8%]" />
              <SortableHead label="PM" sortKey="pm" currentSort={sortConfig} onSort={setSortConfig} className="text-right print:w-[8%]" />
              <SortableHead label="CPF %" sortKey="ident" currentSort={sortConfig} onSort={setSortConfig} className="text-center print:w-[6%]" />
              <TableHead className="text-white print:text-black font-black uppercase text-[8px] md:text-[9px] text-center print:w-[6%]">SLP</TableHead>
              <TableHead className="text-white print:text-black font-black uppercase text-[8px] md:text-[9px] text-center print:w-[6%]">🃏</TableHead>
              <TableHead className="text-white print:text-black font-black uppercase text-[8px] md:text-[9px] text-center print:w-[6%]">🛍️</TableHead>
              <SortableHead label="Pickups" sortKey="pickups" currentSort={sortConfig} onSort={setSortConfig} className="text-center print:w-[6%]" />
              <SortableHead label="Adicionais" sortKey="adicionais" currentSort={sortConfig} onSort={setSortConfig} className="text-center print:w-[6%]" />
              <SortableHead label="Conv %" sortKey="conv" currentSort={sortConfig} onSort={setSortConfig} className="text-right pr-4 md:pr-8 print:pr-1 print:w-[8%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {reportData.map((v, i) => {
              const isAbovePA = v.metrics.pa >= v.groupAverages.pa;
              const isAboveTKM = v.metrics.tkm >= v.groupAverages.tkm;
              const isAboveIdent = v.metrics.ident >= v.groupAverages.ident;
              const rowColor = v.groupColor || "bg-white";

              return (
                <TableRow 
                  key={i} 
                  onClick={() => setSelectedColab(v)}
                  className={cn("border-slate-100 hover:bg-slate-100/50 group cursor-pointer print:bg-white print:border-b print:border-slate-300 print:h-8", rowColor, isCollapsed ? "h-14 md:h-16" : "h-12 md:h-14")}>
                  <TableCell className="pl-4 md:pl-8 print:pl-1">
                    <p className={cn("font-black text-slate-800 uppercase leading-none", isCollapsed ? "text-[12px] md:text-[13px]" : "text-[10px] md:text-[11px]", "print:text-[8px]")}>{v.name}</p>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className={cn("font-black text-slate-700", isCollapsed ? "text-sm" : "text-[10px] md:text-xs", "print:text-[8px]")}>{formatBRL(v.current.venda)}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <span className={cn("font-black text-slate-700", isCollapsed ? "text-sm" : "text-[10px] md:text-xs", "print:text-[8px]")}>{v.current.cupons}</span>
                  </TableCell>

                  <TableCell className="text-center">
                    <span className={cn("font-black text-slate-700", isCollapsed ? "text-sm" : "text-[10px] md:text-xs", "print:text-[8px]")}>{v.current.itens.toFixed(0)}</span>
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1">
                        <span className={cn("font-black text-slate-700", isCollapsed ? "text-sm" : "text-[10px] md:text-xs", "print:text-[8px]")}>{formatNum(v.metrics.pa)}</span>
                        {isAbovePA ? <ArrowUpRight className={cn("text-emerald-500", isCollapsed ? "w-3.5 h-3.5" : "w-2 md:w-2.5 h-2 md:h-2.5", "print:w-1.5 print:h-1.5")} /> : <ArrowDownRight className={cn("text-rose-500", isCollapsed ? "w-3.5 h-3.5" : "w-2 md:w-2.5 h-2 md:h-2.5", "print:w-1.5 print:h-1.5")} />}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1">
                        <span className={cn("font-black text-slate-700", isCollapsed ? "text-sm" : "text-[10px] md:text-xs", "print:text-[8px]")}>{formatBRL(v.metrics.tkm)}</span>
                        {isAboveTKM ? <ArrowUpRight className={cn("text-emerald-500", isCollapsed ? "w-3.5 h-3.5" : "w-2 md:w-2.5 h-2 md:h-2.5", "print:w-1.5 print:h-1.5")} /> : <ArrowDownRight className={cn("text-rose-500", isCollapsed ? "w-3.5 h-3.5" : "w-2 md:w-2.5 h-2 md:h-2.5", "print:w-1.5 print:h-1.5")} />}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                     <span className={cn("font-black text-slate-700", isCollapsed ? "text-sm" : "text-[10px] md:text-xs", "print:text-[8px]")}>{formatBRL(v.metrics.pm)}</span>
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1">
                        <span className={cn("font-black text-slate-700", isCollapsed ? "text-sm" : "text-[10px] md:text-xs", "print:text-[8px]")}>{v.metrics.ident.toFixed(0)}%</span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <span className="hidden print:inline text-[8px] font-black">{v.slpQty}</span>
                    <Badge className={cn("print:hidden font-black border-none px-1", v.slpQty > 0 ? "bg-orange-100 text-orange-700" : "bg-slate-50 text-slate-300", isCollapsed ? "text-[11px] h-6" : "text-[8px] md:text-[9px] h-4 md:h-5")}>
                      <Star className={cn("fill-current", isCollapsed ? "w-3.5 h-3.5 mr-1.5" : "w-2 md:w-2.5 h-2 md:h-2.5 mr-0.5 md:mr-1")} /> {v.slpQty}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-center">
                    <span className="hidden print:inline text-[8px] font-black">{v.baralhoQty}</span>
                    <Badge className={cn("print:hidden font-black border-none px-1", v.baralhoQty > 0 ? "bg-rose-100 text-rose-700" : "bg-slate-50 text-slate-300", isCollapsed ? "text-[11px] h-6" : "text-[8px] md:text-[9px] h-4 md:h-5")}>
                       🃏 {v.baralhoQty}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-center">
                    <span className="hidden print:inline text-[8px] font-black">{v.sacolaQty}</span>
                    <Badge className={cn("print:hidden font-black border-none px-1", v.sacolaQty > 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-50 text-slate-300", isCollapsed ? "text-[11px] h-6" : "text-[8px] md:text-[9px] h-4 md:h-5")}>
                       🛍️ {v.sacolaQty}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-center">
                    <span className="hidden print:inline text-[8px] font-black">{v.pickupsAtendidas}</span>
                    <Badge className={cn("print:hidden font-black border-none px-1", v.pickupsAtendidas > 0 ? "bg-sky-100 text-sky-700" : "bg-slate-50 text-slate-300", isCollapsed ? "text-[11px] h-6" : "text-[8px] md:text-[9px] h-4 md:h-5")}>
                      <Smartphone className={cn("fill-current", isCollapsed ? "w-3.5 h-3.5 mr-1.5" : "w-2 md:w-2.5 h-2 md:h-2.5 mr-0.5 md:mr-1")} /> {v.pickupsAtendidas}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-center">
                    <span className="hidden print:inline text-[8px] font-black">{v.adicionaisFeitos}</span>
                    <Badge className={cn("print:hidden font-black border-none px-1", v.adicionaisFeitos > 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-50 text-slate-300", isCollapsed ? "text-[11px] h-6" : "text-[8px] md:text-[9px] h-4 md:h-5")}>
                      <Zap className={cn("fill-current", isCollapsed ? "w-3.5 h-3.5 mr-1.5" : "w-2 md:w-2.5 h-2 md:h-2.5 mr-0.5 md:mr-1")} /> {v.adicionaisFeitos}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right pr-4 md:pr-8 print:pr-1">
                    <span className="hidden print:inline text-[8px] font-black">{formatNum(v.metrics.conv, 1)}%</span>
                    <Badge className={cn(
                      "print:hidden font-black border-none px-1 md:px-2",
                      v.metrics.conv >= 20 ? "bg-emerald-100 text-emerald-700" : 
                      v.metrics.conv >= 10 ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-400",
                      isCollapsed ? "text-xs h-6" : "text-[8px] md:text-[9px] h-4 md:h-5"
                    )}>
                      {formatNum(v.metrics.conv, 1)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

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
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Tickets</p>
                    <p className="text-lg font-black text-slate-800">{selectedColab.current.cupons}</p>
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
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">Performance vs Média Grupo</h4>
                  <div className="space-y-3">
                    <PerformanceMetric label="P.A. MÉDIO" value={formatNum(selectedColab.metrics.pa)} average={formatNum(selectedColab.groupAverages.pa)} delta={selectedColab.deltas.pa} />
                    <PerformanceMetric label="TICKET MÉDIO" value={formatBRL(selectedColab.metrics.tkm)} average={formatBRL(selectedColab.groupAverages.tkm)} delta={selectedColab.deltas.tkm} isCurrency />
                    <PerformanceMetric label="IDENTIFICAÇÃO" value={`${selectedColab.metrics.ident.toFixed(0)}%`} average={`${selectedColab.groupAverages.ident.toFixed(0)}%`} delta={selectedColab.deltas.ident} isPercent />
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
          <p>Média Relativa por Grupo Ativada • Auditoria Interna Ri Happy</p>
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
      onClick={handleSort}
      className={cn(
        "text-white print:text-black font-black uppercase text-[8px] md:text-[9px] cursor-pointer hover:bg-slate-800 transition-colors",
        className
      )}
    >
      <div className={cn("flex items-center gap-1.5", className?.includes("text-right") ? "justify-end" : className?.includes("text-center") ? "justify-center" : "")}>
        {label}
        <div className="flex flex-col">
          <ArrowUpRight className={cn("w-2 h-2 transition-all", isActive && currentSort.direction === 'asc' ? "text-orange-500" : "text-white/20")} />
        </div>
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
