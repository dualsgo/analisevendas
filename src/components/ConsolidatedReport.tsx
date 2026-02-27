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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ConsolidatedReportProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

export function ConsolidatedReport({ data, vinculos }: ConsolidatedReportProps) {
  const [includePickups, setIncludePickups] = useState(false);
  const [includeExchanges, setIncludeExchanges] = useState(false);

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatNum = (val: number, precision = 2) => val.toLocaleString('pt-BR', { minimumFractionDigits: precision, maximumFractionDigits: precision });

  const reportData = useMemo(() => {
    const vendors: Record<string, any> = {};
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);

    // 1. Identificar o Universo de Vendedores
    const vendorNames = new Set(activeSales.map(s => s.vendedor || "OUTROS"));
    vendorNames.forEach(name => {
      vendors[name] = {
        name,
        base: { venda: 0, cupons: 0, itens: 0 },
        extra: { venda: 0, cupons: 0, itens: 0 },
        pickupsAtendidas: 0,
        adicionaisFeitos: 0
      };
    });

    // 2. Processar Vendas
    activeSales.forEach(s => {
      const v = s.vendedor || "OUTROS";
      const val = parseFloat(s.vNF);
      const qItens = parseFloat(s.itens_qtd);

      // Classificação Base (Sempre entra: Loja Física + Adicional)
      if (s.canal === "LOJA_FISICA" || s.canal === "RETIRADA_ADICIONAL" || s.is_adicional || s.is_adicional_suspeito) {
        vendors[v].base.venda += val;
        vendors[v].base.cupons += 1;
        vendors[v].base.itens += qItens;
      }

      // Classificação Extra: Retiradas
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

    // 3. Processar Trocas (Se houver saldo de faturamento ou itens)
    if (includeExchanges) {
      vinculos.forEach(vinc => {
        const v = vinc.vendedor || "OUTROS";
        if (vendors[v]) {
          vendors[v].extra.venda += vinc.valor_diferenca;
          vendors[v].extra.cupons += 1; // Uma troca é um atendimento
          vendors[v].extra.itens += vinc.diferenca_itens;
        }
      });
    }

    // 4. Calcular Métricas Finais e Deltas
    return Object.values(vendors).map((v: any) => {
      const base = v.base;
      const total = {
        venda: base.venda + (includePickups ? v.extra.venda : 0),
        cupons: base.cupons + (includePickups ? v.extra.cupons : 0),
        itens: base.itens + (includePickups ? v.extra.itens : 0)
      };

      // Se a troca for ativada no toggle, ela já foi somada no passo 3
      // Aqui apenas consolidamos o resultado final para exibição
      
      const metrics = {
        base: {
          pa: base.cupons > 0 ? base.itens / base.cupons : 0,
          tkm: base.cupons > 0 ? base.venda / base.cupons : 0
        },
        total: {
          pa: total.cupons > 0 ? total.itens / total.cupons : 0,
          tkm: total.cupons > 0 ? total.venda / total.cupons : 0
        }
      };

      const convRate = v.pickupsAtendidas > 0 ? (v.adicionaisFeitos / v.pickupsAtendidas) * 100 : 0;

      return {
        ...v,
        current: total,
        metrics: metrics.total,
        deltas: {
          venda: total.venda - base.venda,
          vendaPerc: base.venda > 0 ? ((total.venda / base.venda) - 1) * 100 : 0,
          pa: metrics.total.pa - metrics.base.pa,
          paPerc: metrics.base.pa > 0 ? ((metrics.total.pa / metrics.base.pa) - 1) * 100 : 0,
          tkm: metrics.total.tkm - metrics.base.tkm,
          tkmPerc: metrics.base.tkm > 0 ? ((metrics.total.tkm / metrics.base.tkm) - 1) * 100 : 0,
        },
        convRate
      };
    }).sort((a, b) => b.current.venda - a.current.venda);
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
      {/* HEADER EXECUTIVO (Oculto na Impressão) */}
      <div className="bg-white rounded-[2rem] p-6 border-2 border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 print:hidden">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-3 rounded-2xl text-white shadow-lg"><FileText className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-800">Relatório Executivo Consolidado</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Análise Numérica e Simulador de Canais</p>
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
              <ArrowRightLeft className="w-3 h-3 text-purple-500" /> Incluir Trocas
            </Label>
          </div>
          <Button onClick={handlePrint} variant="outline" className="ml-4 rounded-xl font-black text-[10px] gap-2 border-slate-200 hover:bg-white hover:text-orange-500 shadow-sm">
            <Printer className="w-4 h-4" /> GERAR PDF / IMPRIMIR
          </Button>
        </div>
      </div>

      {/* CABEÇALHO PARA IMPRESSÃO (Oculto no Navegador) */}
      <div className="hidden print:block text-center border-b-4 border-slate-900 pb-6 mb-8">
        <h1 className="text-3xl font-black uppercase mb-1">Ri Happy | Performance Consolidada</h1>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
          Relatório Operacional • {new Date().toLocaleDateString('pt-BR')} • 
          Canais: Loja Física + Adicionais {includePickups && "+ Retiradas"} {includeExchanges && "+ Trocas"}
        </p>
      </div>

      {/* KPI TOTALIZADORES */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 print:grid-cols-6">
        <ReportKPI label="Venda Total" value={formatBRL(totals.venda)} icon={TrendingUp} color="text-emerald-600" />
        <ReportKPI label="Atendimentos" value={totals.cupons} icon={Users} color="text-sky-600" />
        <ReportKPI label="PA Unidade" value={formatNum(totals.pa)} icon={Target} color="text-orange-600" />
        <ReportKPI label="TKM Unidade" value={formatBRL(totals.tkm)} icon={ShoppingBag} color="text-purple-600" />
        <ReportKPI label="Pickups" value={totals.pickups} icon={Smartphone} color="text-slate-500" />
        <ReportKPI label="Conv. Real" value={`${formatNum(totals.conv, 1)}%`} icon={Zap} color="text-amber-500" />
      </div>

      {/* TABELA CONSOLIDADA */}
      <Card className="ri-card border-none overflow-hidden shadow-xl bg-white print:shadow-none print:border">
        <Table>
          <TableHeader className="bg-slate-900">
            <TableRow className="hover:bg-slate-900 border-none h-12">
              <TableHead className="text-white font-black uppercase text-[10px] pl-8">Colaborador</TableHead>
              <TableHead className="text-white font-black uppercase text-[10px] text-right">Venda</TableHead>
              <TableHead className="text-white font-black uppercase text-[10px] text-center">Cupons</TableHead>
              <TableHead className="text-white font-black uppercase text-[10px] text-center">PA</TableHead>
              <TableHead className="text-white font-black uppercase text-[10px] text-right">TKM</TableHead>
              <TableHead className="text-white font-black uppercase text-[10px] text-center">Pks</TableHead>
              <TableHead className="text-white font-black uppercase text-[10px] text-center">Adic</TableHead>
              <TableHead className="text-white font-black uppercase text-[10px] text-right pr-8">Conv %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reportData.map((v, i) => (
              <TableRow key={i} className="border-slate-100 hover:bg-slate-50/50 h-14 group">
                <TableCell className="pl-8">
                  <p className="text-xs font-black text-slate-800 uppercase leading-none">{v.name}</p>
                  <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">Ranking Unidade #{i+1}</p>
                </TableCell>
                
                <TableCell className="text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-black text-slate-700">{formatBRL(v.current.venda)}</span>
                    {Math.abs(v.deltas.venda) > 0.1 && (
                      <DeltaBadge value={v.deltas.venda} perc={v.deltas.vendaPerc} isCurrency />
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-center font-bold text-slate-600 text-xs">
                  {v.current.cupons}
                </TableCell>

                <TableCell className="text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-black text-slate-700">{formatNum(v.metrics.pa)}</span>
                    {Math.abs(v.deltas.pa) > 0.01 && (
                      <DeltaBadge value={v.deltas.pa} perc={v.deltas.paPerc} precision={2} />
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-black text-slate-700">{formatBRL(v.metrics.tkm)}</span>
                    {Math.abs(v.deltas.tkm) > 0.1 && (
                      <DeltaBadge value={v.deltas.tkm} perc={v.deltas.tkmPerc} isCurrency />
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-center font-bold text-slate-400 text-xs">
                  {v.pickupsAtendidas}
                </TableCell>

                <TableCell className="text-center font-black text-emerald-600 text-xs">
                  {v.adicionaisFeitos}
                </TableCell>

                <TableCell className="text-right pr-8">
                  <Badge className={cn(
                    "text-[10px] font-black border-none",
                    v.convRate >= 20 ? "bg-emerald-100 text-emerald-700" : 
                    v.convRate >= 10 ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-400"
                  )}>
                    {formatNum(v.convRate, 1)}%
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* RODAPÉ TÉCNICO */}
      <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest px-4 border-t pt-4">
        <p>Base de Dados: XML/NFC-e Processados • Ri Happy Unidade RJ</p>
        <p>Documento de uso interno exclusivo do gestor</p>
      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .container { max-width: 100% !important; padding: 0 !important; }
          @page { size: landscape; margin: 1cm; }
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

function DeltaBadge({ value, perc, isCurrency = false, precision = 0 }: any) {
  const isPositive = value > 0;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
  
  return (
    <div className={cn(
      "flex items-center gap-0.5 text-[8px] font-bold uppercase",
      isPositive ? "text-emerald-600" : "text-rose-500"
    )}>
      <Icon className="w-2.5 h-2.5" />
      {perc.toFixed(1)}%
    </div>
  );
}
