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
  Minus,
  CheckCircle2,
  XCircle
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
  "ERIKA": "Apoio Venda",
  "LUIZA": "Apoio Venda",
  "CAROL": "Apoio Venda",
  "ALINE": "Apoio Operação",
  "THAIS": "Apoio Operação",
  "LIDI": "Apoio Operação",
  "RAFA": "Aprendiz"
};

const IGNORE_LIST = ["MAYCON", "RUAN"];

const SLP_CODES = ['5135238', '5135269', '5135270', '5135273', '5146458', '5146469', '5146470', '5146471', '5146472', '5146473', '5146474', '5146475', '5146476', '5146501', '5146504', '5146505', '5141894', '5141895', '5141896', '5141897', '5141898', '5141899', '5141900', '5141902', '5141903', '5141904', '5141905', '5141907', '5141909', '5141910', '5141911', '5141912', '5141913', '5141914', '5141915', '5141916', '5141917', '5141920', '5141949', '5141978', '5140469', '5140475', '5140476', '5140477', '5140478', '5140479', '5146477', '5146478', '5146502', '5146503'];
const SOCIAL_CODES = ['5057181', '5055875', '5135601', '5129270', '5129271', '5129247', '5129262', '5122642', '5122641', '5135612', '5122639', '5122638', '5133676', '5113644', '5113641', '5113642', '5113643', '5129267', '5129255', '5143422', '5139528', '5143423', '5145833', '5139527', '5147797', '5147796', '5145834', '5079753', '5079752', '5106673', '5106671', '5106674', '5106672', '5088519', '5097336', '5097335', '5011918', '5136558'];

export function ConsolidatedReport({ data, vinculos }: ConsolidatedReportProps) {
  const [includePickups, setIncludePickups] = useState(false);
  const [includeExchanges, setIncludeExchanges] = useState(false);

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatNum = (val: number, precision = 2) => val.toLocaleString('pt-BR', { minimumFractionDigits: precision, maximumFractionDigits: precision });

  const reportData = useMemo(() => {
    const vendors: Record<string, any> = {};
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);

    // 1. Identificar o Universo de Vendedores (Filtrando Gerentes)
    const vendorNames = Array.from(new Set(activeSales.map(s => s.vendedor || "OUTROS")))
      .filter(name => !IGNORE_LIST.includes(name));

    vendorNames.forEach(name => {
      vendors[name] = {
        name,
        group: GROUPS[name] || "Outros",
        base: { venda: 0, cupons: 0, itens: 0 },
        extra: { venda: 0, cupons: 0, itens: 0 },
        pickupsAtendidas: 0,
        adicionaisFeitos: 0,
        slpQty: 0,
        socialQty: 0,
        identCount: 0
      };
    });

    // 2. Processar Vendas
    activeSales.forEach(s => {
      const v = s.vendedor || "OUTROS";
      if (IGNORE_LIST.includes(v)) return;
      if (!vendors[v]) return;

      const val = parseFloat(s.vNF);
      const qItens = parseFloat(s.itens_qtd);

      // Itens de Checkout (SLP e Social)
      s.itens.forEach(it => {
        if (SLP_CODES.includes(it.cProd)) vendors[v].slpQty += it.qCom;
        if (SOCIAL_CODES.includes(it.cProd)) vendors[v].socialQty += it.qCom;
      });

      // CPF Identificado
      if (s.cpf_cnpj_dest) vendors[v].identCount += 1;

      // Classificação Base (Loja Física + Adicional)
      if (s.canal === "LOJA_FISICA" || s.canal === "RETIRADA_ADICIONAL" || s.is_adicional || s.is_adicional_suspeito) {
        vendors[v].base.venda += val;
        vendors[v].base.cupons += 1;
        vendors[v].base.itens += qItens;
      }

      // Classificação Extra: Retiradas (Isoladas para o toggle)
      if (s.canal === "RETIRADA_ONLINE") {
        vendors[v].extra.venda += val;
        vendors[v].extra.cupons += 1;
        vendors[v].extra.itens += qItens;
        vendors[v].pickupsAtendidas += 1;
      }

      // Contador de Adicionais realizados
      if (s.is_adicional || s.is_adicional_suspeito || s.canal === "RETIRADA_ADICIONAL") {
        vendors[v].adicionaisFeitos += 1;
      }
    });

    // 3. Processar Trocas (Apenas Diferenças)
    vinculos.forEach(vinc => {
      const v = vinc.vendedor || "OUTROS";
      if (IGNORE_LIST.includes(v)) return;
      if (vendors[v]) {
        // Se o toggle de trocas estiver ativo, os valores de saldo entram no pool extra
        vendors[v].extra.venda += vinc.valor_diferenca;
        // vendors[v].extra.cupons += 1; // Uma troca é tecnicamente um atendimento manual
        vendors[v].extra.itens += vinc.diferenca_itens;
      }
    });

    // 4. Consolidar e Calcular Métricas
    const results = Object.values(vendors).map((v: any) => {
      const current = {
        venda: v.base.venda + (includePickups ? v.extra.venda : 0) + (includeExchanges ? 0 : 0), // O pool extra já foi preenchido no passo 2 e 3
        cupons: v.base.cupons + (includePickups ? v.extra.cupons : 0) + (includeExchanges ? v.extra.cupons : 0),
        itens: v.base.itens + (includePickups ? v.extra.itens : 0) + (includeExchanges ? 0 : 0),
      };

      // Recalcular base considerando que o pool extra agora contém pickups e saldos de troca
      // Se os toggles estiverem desligados, ignoramos o que está no extra
      const totalVenda = v.base.venda + (includePickups ? v.extra.venda : 0);
      const totalItens = v.base.itens + (includePickups ? v.extra.itens : 0);
      const totalCupons = v.base.cupons + (includePickups ? v.extra.cupons : 0);

      const metrics = {
        pa: totalCupons > 0 ? totalItens / totalCupons : 0,
        tkm: totalCupons > 0 ? totalVenda / totalCupons : 0,
        ident: totalCupons > 0 ? (v.identCount / totalCupons) * 100 : 0,
        conv: v.pickupsAtendidas > 0 ? (v.adicionaisFeitos / v.pickupsAtendidas) * 100 : 0
      };

      return {
        ...v,
        current: { venda: totalVenda, cupons: totalCupons, itens: totalItens },
        metrics,
        // Deltas para exibição visual
        deltas: {
          venda: totalVenda - v.base.venda,
          vendaPerc: v.base.venda > 0 ? ((totalVenda / v.base.venda) - 1) * 100 : 0,
          pa: metrics.pa - (v.base.cupons > 0 ? v.base.itens / v.base.cupons : 0)
        }
      };
    });

    // 5. Calcular Médias por Grupo para Comparação Justa
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

    return results.map(r => ({
      ...r,
      groupAverages: groupStats[r.group]
    })).sort((a, b) => b.current.venda - a.current.venda);
  }, [data, vinculos, includePickups, includeExchanges]);

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

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 print:p-0 print:pb-0">
      {/* HEADER EXECUTIVO */}
      <div className="bg-white rounded-[2rem] p-6 border-2 border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 print:hidden">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-3 rounded-2xl text-white shadow-lg"><FileText className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-800">Relatório Consolidado de Performance</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Análise de Médias por Grupo e Saldo de Trocas</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
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
              <ArrowRightLeft className="w-3 h-3 text-purple-500" /> Incluir Saldo Trocas
            </Label>
          </div>
          <Button onClick={handlePrint} variant="outline" className="ml-4 rounded-xl font-black text-[10px] gap-2 border-slate-200 hover:bg-white hover:text-orange-500 shadow-sm">
            <Printer className="w-4 h-4" /> IMPRIMIR RELATÓRIO
          </Button>
        </div>
      </div>

      {/* CABEÇALHO PARA IMPRESSÃO */}
      <div className="hidden print:block text-center border-b-4 border-slate-900 pb-6 mb-8">
        <h1 className="text-3xl font-black uppercase mb-1">Ri Happy | Performance Consolidada</h1>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
          Emissão: {new Date().toLocaleDateString('pt-BR')} • 
          Critério: Esforço de Loja {includePickups && "+ Retiradas"} {includeExchanges && "+ Diferenças de Troca"}
        </p>
      </div>

      {/* KPI TOTALIZADORES */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 print:grid-cols-6">
        <ReportKPI label="Venda Unidade" value={formatBRL(totals.venda)} icon={TrendingUp} color="text-emerald-600" />
        <ReportKPI label="Atendimentos" value={totals.cupons} icon={Users} color="text-sky-600" />
        <ReportKPI label="P.A. Médio" value={formatNum(totals.pa)} icon={Target} color="text-orange-600" />
        <ReportKPI label="Ticket Médio" value={formatBRL(totals.tkm)} icon={ShoppingBag} color="text-purple-600" />
        <ReportKPI label="Retiradas" value={totals.pickups} icon={Smartphone} color="text-slate-500" />
        <ReportKPI label="Conv. Real" value={`${formatNum(totals.conv, 1)}%`} icon={Zap} color="text-amber-500" />
      </div>

      {/* TABELA CONSOLIDADA */}
      <Card className="ri-card border-none overflow-hidden shadow-xl bg-white print:shadow-none print:border">
        <Table>
          <TableHeader className="bg-slate-900">
            <TableRow className="hover:bg-slate-900 border-none h-12">
              <TableHead className="text-white font-black uppercase text-[9px] pl-8">Colaborador / Grupo</TableHead>
              <TableHead className="text-white font-black uppercase text-[9px] text-right">Venda Total</TableHead>
              <TableHead className="text-white font-black uppercase text-[9px] text-center">PA</TableHead>
              <TableHead className="text-white font-black uppercase text-[9px] text-right">TKM</TableHead>
              <TableHead className="text-white font-black uppercase text-[9px] text-center">CPF %</TableHead>
              <TableHead className="text-white font-black uppercase text-[9px] text-center">SLP</TableHead>
              <TableHead className="text-white font-black uppercase text-[9px] text-center">Social</TableHead>
              <TableHead className="text-white font-black uppercase text-[9px] text-center">Pks Servidas</TableHead>
              <TableHead className="text-white font-black uppercase text-[9px] text-center">Adic Feitos</TableHead>
              <TableHead className="text-white font-black uppercase text-[9px] text-right pr-8">Conv %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reportData.map((v, i) => {
              const isAbovePA = v.metrics.pa >= v.groupAverages.pa;
              const isAboveTKM = v.metrics.tkm >= v.groupAverages.tkm;
              const isAboveIdent = v.metrics.ident >= v.groupAverages.ident;

              return (
                <TableRow key={i} className="border-slate-100 hover:bg-slate-50/50 h-14 group">
                  <TableCell className="pl-8">
                    <p className="text-[11px] font-black text-slate-800 uppercase leading-none">{v.name}</p>
                    <Badge variant="outline" className="text-[7px] font-black uppercase border-slate-200 text-slate-400 mt-1 h-4 px-1.5">{v.group}</Badge>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-black text-slate-700">{formatBRL(v.current.venda)}</span>
                      {Math.abs(v.deltas.venda) > 0.1 && (
                        <span className={cn("text-[8px] font-bold", v.deltas.venda > 0 ? "text-emerald-600" : "text-rose-500")}>
                          {v.deltas.venda > 0 ? "+" : ""}{formatBRL(v.deltas.venda)}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-black text-slate-700">{formatNum(v.metrics.pa)}</span>
                        {isAbovePA ? <ArrowUpRight className="w-2.5 h-2.5 text-emerald-500" /> : <ArrowDownRight className="w-2.5 h-2.5 text-rose-500" />}
                      </div>
                      <p className="text-[7px] font-bold text-slate-300 uppercase">Ref Grupo: {formatNum(v.groupAverages.pa)}</p>
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-black text-slate-700">{formatBRL(v.metrics.tkm)}</span>
                        {isAboveTKM ? <ArrowUpRight className="w-2.5 h-2.5 text-emerald-500" /> : <ArrowDownRight className="w-2.5 h-2.5 text-rose-500" />}
                      </div>
                      <p className="text-[7px] font-bold text-slate-300 uppercase">Ref Grupo: {formatBRL(v.groupAverages.tkm)}</p>
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-black text-slate-700">{v.metrics.ident.toFixed(0)}%</span>
                        {isAboveIdent ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" /> : <XCircle className="w-2.5 h-2.5 text-rose-400" />}
                      </div>
                      <p className="text-[7px] font-bold text-slate-300 uppercase">Ref: {v.groupAverages.ident.toFixed(0)}%</p>
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <Badge className={cn("text-[9px] font-black border-none", v.slpQty > 0 ? "bg-orange-100 text-orange-700" : "bg-slate-50 text-slate-300")}>
                      <Star className="w-2.5 h-2.5 mr-1 fill-current" /> {v.slpQty}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-center">
                    <Badge className={cn("text-[9px] font-black border-none", v.socialQty > 0 ? "bg-rose-100 text-rose-700" : "bg-slate-50 text-slate-300")}>
                      <Heart className="w-2.5 h-2.5 mr-1 fill-current" /> {v.socialQty}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-center font-bold text-slate-400 text-xs">
                    {v.pickupsAtendidas}
                  </TableCell>

                  <TableCell className="text-center font-black text-emerald-600 text-xs">
                    {v.adicionaisFeitos}
                  </TableCell>

                  <TableCell className="text-right pr-8">
                    <Badge className={cn(
                      "text-[9px] font-black border-none",
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
      <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest px-4 border-t pt-4">
        <p>Base: {data.length} XMLs • Média por Grupo Ativada • Gerentes Maycon/Ruan Ocultados da Média</p>
        <p>Documento Estratégico Ri Happy - Uso Interno</p>
      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .container { max-width: 100% !important; padding: 0 !important; }
          @page { size: landscape; margin: 0.5cm; }
          .ri-card { border: 1px solid #e2e8f0 !important; }
        }
      `}</style>
    </div>
  );
}

function ReportKPI({ label, value, icon: Icon, color }: any) {
  return (
    <Card className="ri-card border-none bg-white p-4 flex flex-col justify-between h-24 shadow-sm print:border print:h-20">
      <div className="flex items-center justify-between">
        <div className={cn("p-1.5 rounded-lg bg-slate-50", color)}><Icon className="w-4 h-4" /></div>
      </div>
      <div>
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-sm font-black text-slate-800 leading-none truncate">{value}</p>
      </div>
    </Card>
  );
}
