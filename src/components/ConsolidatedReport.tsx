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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
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
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ConsolidatedReportProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

// Grupos de Afinidade para Comparação Justa
const GROUPS: Record<string, string> = {
  "RENATA": "Vendedores",
  "BARBOSA": "Vendedores",
  "LUIZ": "Vendedores",
  "CAREN": "Vendedores",
  "BIANCA": "Vendedores",
  "ERIKA": "Apoio Venda",
  "LUIZA": "Apoio Venda",
  "CAROL": "Apoio Venda",
  "ALINE": "Apoio Operação",
  "THAIS": "Apoio Operação",
  "LIDI": "Apoio Operação",
  "RAFA": "Aprendiz"
};

const GROUP_COLORS: Record<string, string> = {
  "Vendedores": "bg-orange-50/40",
  "Apoio Venda": "bg-sky-50/40",
  "Apoio Operação": "bg-emerald-50/40",
  "Aprendiz": "bg-slate-50/40"
};

const IGNORE_LIST = ["MAYCON", "RUAN"];

const SLP_CODES = ['5135238', '5135269', '5135270', '5135273', '5146458', '5146469', '5146470', '5146471', '5146472', '5146473', '5146474', '5146475', '5146476', '5146501', '5146504', '5146505', '5141894', '5141895', '5141896', '5141897', '5141898', '5141899', '5141900', '5141902', '5141903', '5141904', '5141905', '5141907', '5141909', '5141910', '5141911', '5141912', '5141913', '5141914', '5141915', '5141916', '5141917', '5141920', '5141949', '5141978', '5140469', '5140475', '5140476', '5140477', '5140478', '5140479', '5146477', '5146478', '5146502', '5146503'];
const SOCIAL_CODES = ['5057181', '5055875', '5135601', '5129270', '5129271', '5129247', '5129262', '5122642', '5122641', '5135612', '5122639', '5122638', '5133676', '5113644', '5113641', '5113642', '5113643', '5129267', '5129255', '5143422', '5139528', '5143423', '5145833', '5139527', '5147797', '5147796', '5145834', '5079753', '5079752', '5106673', '5106671', '5106674', '5106672', '5088519', '5097336', '5097335', '5011918', '5136558'];

export function ConsolidatedReport({ data, vinculos }: ConsolidatedReportProps) {
  const [includePickups, setIncludePickups] = useState(false);
  const [includeExchanges, setIncludeExchanges] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>("all");

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatNum = (val: number, precision = 2) => val.toLocaleString('pt-BR', { minimumFractionDigits: precision, maximumFractionDigits: precision });

  const reportData = useMemo(() => {
    const vendors: Record<string, any> = {};
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);

    const vendorNames = Array.from(new Set(activeSales.map(s => s.vendedor || "OUTROS")))
      .filter(name => !IGNORE_LIST.includes(name));

    vendorNames.forEach(name => {
      vendors[name] = {
        name,
        group: GROUPS[name] || "Outros",
        base: { venda: 0, cupons: 0, itens: 0, ident: 0 },
        extra: { venda: 0, cupons: 0, itens: 0, ident: 0 },
        troca: { venda: 0, itens: 0, ident: 0 },
        pickupsAtendidas: 0,
        adicionaisFeitos: 0,
        slpQty: 0,
        socialQty: 0
      };
    });

    activeSales.forEach(s => {
      const v = s.vendedor || "OUTROS";
      if (IGNORE_LIST.includes(v)) return;
      if (!vendors[v]) return;

      const val = parseFloat(s.vNF);
      const qItens = parseFloat(s.itens_qtd);

      s.itens.forEach(it => {
        if (SLP_CODES.includes(it.cProd)) vendors[v].slpQty += it.qCom;
        if (SOCIAL_CODES.includes(it.cProd)) vendors[v].socialQty += it.qCom;
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
      if (IGNORE_LIST.includes(v)) return;
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
        ident: totalCupons > 0 ? Math.min((totalIdent / totalCupons) * 100, 100) : 0,
        conv: v.pickupsAtendidas > 0 ? (v.adicionaisFeitos / v.pickupsAtendidas) * 100 : 0
      };

      return {
        ...v,
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
      .filter(r => selectedGroup === "all" || r.group === selectedGroup)
      .map(r => ({
        ...r,
        groupAverages: groupStats[r.group]
      })).sort((a, b) => b.current.venda - a.current.venda);
  }, [data, vinculos, includePickups, includeExchanges, selectedGroup]);

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

  const groupsAvailable = ["Vendedores", "Apoio Venda", "Apoio Operação", "Aprendiz"];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 print:p-0 print:pb-0 print:space-y-0">
      {/* HEADER EXECUTIVO */}
      <div className="bg-white rounded-[2rem] p-6 border-2 border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 print:hidden">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-3 rounded-2xl text-white shadow-lg"><FileText className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-800">Relatório Consolidado de Performance</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Visão Técnica e Financeira da Unidade</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          {/* Novo Filtro de Grupo */}
          <div className="flex flex-col gap-1.5 mr-4">
            <Label className="text-[9px] font-black uppercase text-slate-400 px-1">Filtrar Perfil</Label>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="h-9 w-[180px] rounded-xl border-slate-200 bg-white font-black text-[10px] uppercase">
                <div className="flex items-center gap-2">
                  <Filter className="w-3 h-3 text-orange-500" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-bold uppercase">Todos os Perfis</SelectItem>
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
        <ReportKPI label="Venda Grupo" value={formatBRL(totals.venda)} icon={TrendingUp} color="text-emerald-600" />
        <ReportKPI label="Atendimentos" value={totals.cupons} icon={Users} color="text-sky-600" />
        <ReportKPI label="P.A. Médio" value={formatNum(totals.pa)} icon={Target} color="text-orange-600" />
        <ReportKPI label="Ticket Médio" value={formatBRL(totals.tkm)} icon={ShoppingBag} color="text-purple-600" />
        <ReportKPI label="Retiradas" value={totals.pickups} icon={Smartphone} color="text-slate-500" />
        <ReportKPI label="Conv. Real" value={`${formatNum(totals.conv, 1)}%`} icon={Zap} color="text-amber-500" />
      </div>

      {/* TABELA CONSOLIDADA */}
      <Card className="ri-card border-none overflow-hidden shadow-xl bg-white print:shadow-none print:border print:border-black print:w-full print:rounded-none">
        <Table className="print:table-fixed print:border-collapse">
          <TableHeader className="bg-slate-900 print:bg-slate-200">
            <TableRow className="hover:bg-slate-900 border-none h-10 md:h-12 print:h-7 print:border-b print:border-black">
              <TableHead className="text-white print:text-black font-black uppercase text-[8px] md:text-[9px] pl-4 md:pl-8 print:pl-1 print:w-[15%]">Colaborador</TableHead>
              <TableHead className="text-white print:text-black font-black uppercase text-[8px] md:text-[9px] text-right print:w-[12%]">Venda Total</TableHead>
              <TableHead className="text-white print:text-black font-black uppercase text-[8px] md:text-[9px] text-center print:w-[8%]">PA</TableHead>
              <TableHead className="text-white print:text-black font-black uppercase text-[8px] md:text-[9px] text-right print:w-[10%]">TKM</TableHead>
              <TableHead className="text-white print:text-black font-black uppercase text-[8px] md:text-[9px] text-center print:w-[8%]">CPF %</TableHead>
              <TableHead className="text-white print:text-black font-black uppercase text-[8px] md:text-[9px] text-center print:w-[7%]">SLP</TableHead>
              <TableHead className="text-white print:text-black font-black uppercase text-[8px] md:text-[9px] text-center print:w-[7%]">Social</TableHead>
              <TableHead className="text-white print:text-black font-black uppercase text-[8px] md:text-[9px] text-center print:w-[8%]">Pks</TableHead>
              <TableHead className="text-white print:text-black font-black uppercase text-[8px] md:text-[9px] text-center print:w-[8%]">Adic</TableHead>
              <TableHead className="text-white print:text-black font-black uppercase text-[8px] md:text-[9px] text-right pr-4 md:pr-8 print:pr-1 print:w-[10%]">Conv %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reportData.map((v, i) => {
              const isAbovePA = v.metrics.pa >= v.groupAverages.pa;
              const isAboveTKM = v.metrics.tkm >= v.groupAverages.tkm;
              const isAboveIdent = v.metrics.ident >= v.groupAverages.ident;
              const rowColor = GROUP_COLORS[v.group] || "bg-white";

              return (
                <TableRow key={i} className={cn("border-slate-100 hover:bg-slate-100/50 h-12 md:h-14 group print:bg-white print:border-b print:border-slate-300 print:h-8", rowColor)}>
                  <TableCell className="pl-4 md:pl-8 print:pl-1">
                    <p className="text-[10px] md:text-[11px] print:text-[8px] font-black text-slate-800 uppercase leading-none">{v.name}</p>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] md:text-xs print:text-[8px] font-black text-slate-700">{formatBRL(v.current.venda)}</span>
                      {Math.abs(v.deltas.venda) > 0.1 && (
                        <span className={cn("text-[7px] md:text-[8px] print:text-[6px] font-bold flex items-center gap-0.5", v.deltas.venda > 0 ? "text-emerald-600" : "text-rose-500")}>
                          {v.deltas.venda > 0 ? <ArrowUpRight className="w-2 md:w-2.5 h-2 md:h-2.5 print:w-1.5 print:h-1.5" /> : <ArrowDownRight className="w-2 md:w-2.5 h-2 md:h-2.5 print:w-1.5 print:h-1.5" />}
                          {formatBRL(Math.abs(v.deltas.venda))}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] md:text-xs print:text-[8px] font-black text-slate-700">{formatNum(v.metrics.pa)}</span>
                        {isAbovePA ? <ArrowUpRight className="w-2 md:w-2.5 h-2 md:h-2.5 text-emerald-500 print:w-1.5 print:h-1.5" /> : <ArrowDownRight className="w-2 md:w-2.5 h-2 md:h-2.5 text-rose-500 print:w-1.5 print:h-1.5" />}
                      </div>
                      {Math.abs(v.deltas.pa) > 0.01 && (
                        <span className={cn("text-[6px] md:text-[7px] print:text-[5px] font-black", v.deltas.pa > 0 ? "text-emerald-600" : "text-rose-500")}>
                          {v.deltas.pa > 0 ? "+" : ""}{v.deltas.pa.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] md:text-xs print:text-[8px] font-black text-slate-700">{formatBRL(v.metrics.tkm)}</span>
                        {isAboveTKM ? <ArrowUpRight className="w-2 md:w-2.5 h-2 md:h-2.5 text-emerald-500 print:w-1.5 print:h-1.5" /> : <ArrowDownRight className="w-2 md:w-2.5 h-2 md:h-2.5 text-rose-500 print:w-1.5 print:h-1.5" />}
                      </div>
                      {Math.abs(v.deltas.tkm) > 0.1 && (
                        <span className={cn("text-[6px] md:text-[7px] print:text-[5px] font-black", v.deltas.tkm > 0 ? "text-emerald-600" : "text-rose-500")}>
                          {v.deltas.tkm > 0 ? "+" : ""}{formatBRL(Math.abs(v.deltas.tkm))}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] md:text-xs print:text-[8px] font-black text-slate-700">{v.metrics.ident.toFixed(0)}%</span>
                        <div className="print:hidden">
                          {isAboveIdent ? <CheckCircle2 className="w-2 md:w-2.5 h-2 md:h-2.5 text-emerald-500" /> : <XCircle className="w-2 md:w-2.5 h-2 md:h-2.5 text-rose-400" />}
                        </div>
                      </div>
                      {Math.abs(v.deltas.ident) > 0.1 && (
                        <span className={cn("text-[6px] md:text-[7px] print:text-[5px] font-black", v.deltas.ident > 0 ? "text-emerald-600" : "text-rose-500")}>
                          {v.deltas.ident > 0 ? "+" : ""}{v.deltas.ident.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <span className="hidden print:inline text-[8px] font-black">{v.slpQty}</span>
                    <Badge className={cn("print:hidden text-[8px] md:text-[9px] font-black border-none px-1 h-4 md:h-5", v.slpQty > 0 ? "bg-orange-100 text-orange-700" : "bg-slate-50 text-slate-300")}>
                      <Star className="w-2 md:w-2.5 h-2 md:h-2.5 mr-0.5 md:mr-1 fill-current" /> {v.slpQty}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-center">
                    <span className="hidden print:inline text-[8px] font-black">{v.socialQty}</span>
                    <Badge className={cn("print:hidden text-[8px] md:text-[9px] font-black border-none px-1 h-4 md:h-5", v.socialQty > 0 ? "bg-rose-100 text-rose-700" : "bg-slate-50 text-slate-300")}>
                      <Heart className="w-2 md:w-2.5 h-2 md:h-2.5 mr-0.5 md:mr-1 fill-current" /> {v.socialQty}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-center font-bold text-slate-400 text-[10px] md:text-xs print:text-[8px] print:text-black">
                    {v.pickupsAtendidas}
                  </TableCell>

                  <TableCell className="text-center font-black text-emerald-600 text-[10px] md:text-xs print:text-[8px] print:text-black">
                    {v.adicionaisFeitos}
                  </TableCell>

                  <TableCell className="text-right pr-4 md:pr-8 print:pr-1">
                    <span className="hidden print:inline text-[8px] font-black">{formatNum(v.metrics.conv, 1)}%</span>
                    <Badge className={cn(
                      "print:hidden text-[8px] md:text-[9px] font-black border-none px-1 md:px-2 h-4 md:h-5",
                      v.metrics.conv >= 20 ? "bg-emerald-100 text-emerald-700" : 
                      v.metrics.conv >= 10 ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-400"
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

function ReportKPI({ label, value, icon: Icon, color }: any) {
  return (
    <Card className="ri-card border-none bg-white p-4 md:p-5 flex flex-col items-center justify-center text-center h-24 md:h-28 shadow-sm print:border-none print:h-auto print:p-1.5 print:bg-transparent print:flex-row print:items-center print:gap-1.5">
      <div className="flex items-center justify-center mb-2 print:hidden">
        <div className={cn("p-2 rounded-xl bg-slate-50", color)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="flex flex-col items-center justify-center print:flex-row print:items-center print:gap-1">
        <p className="text-[8px] md:text-[9px] print:text-[6.5px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5 print:mb-0 print:text-black">
          {label}:
        </p>
        <p className="text-sm md:text-lg print:text-[8px] font-black text-slate-800 leading-none truncate print:text-black">
          {value}
        </p>
      </div>
    </Card>
  );
}
