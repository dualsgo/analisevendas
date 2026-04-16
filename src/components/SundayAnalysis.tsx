"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar as CalendarIcon, 
  TrendingUp, 
  TrendingDown, 
  Info, 
  Timer, 
  ArrowRight,
  Target,
  Clock,
  Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseISO, getDay, getHours, format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend
} from "recharts";

interface SundayAnalysisProps {
  data: DetailedSaleRow[];
}

export function SundayAnalysis({ data }: SundayAnalysisProps) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const analytics = useMemo(() => {
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    
    const holyDays = [
      "01-01", "21-04", "01-05", "07-09", "12-10", "02-11", "15-11", "25-12"
    ];

    const isSundayOrHoliday = (dhEmi: string) => {
      const d = parseISO(dhEmi);
      if (getDay(d) === 0) return true;
      const fmt = format(d, "dd-MM");
      return holyDays.includes(fmt);
    };

    const targetSales = activeSales.filter(s => isSundayOrHoliday(s.dhEmi));

    const createStats = () => ({ 
      vNF: 0, 
      cupons: 0, 
      itens: 0,
    });

    // Grupar por data
    const byDay: Record<string, { 
      total: ReturnType<typeof createStats>, 
      earlySlot: ReturnType<typeof createStats>, // 12h-13h
      closingSlot: ReturnType<typeof createStats>, // 20h-21h
      peakSlot: ReturnType<typeof createStats>, // 13h-20h
    }> = {};
    
    targetSales.forEach(s => {
      const dayStr = s.dhEmi.split("T")[0];
      const h = getHours(parseISO(s.dhEmi));
      const val = parseFloat(s.vNF);
      const qItens = parseFloat(s.itens_qtd || "0");

      if (!byDay[dayStr]) {
        byDay[dayStr] = { 
          total: createStats(), 
          earlySlot: createStats(), 
          closingSlot: createStats(),
          peakSlot: createStats()
        };
      }
      
      const update = (stat: ReturnType<typeof createStats>) => {
        stat.vNF += val;
        stat.cupons++;
        stat.itens += qItens;
      };

      update(byDay[dayStr].total);

      if (h === 12) {
        update(byDay[dayStr].earlySlot);
      } else if (h === 20) {
        update(byDay[dayStr].closingSlot);
      } else if (h >= 13 && h < 20) {
        update(byDay[dayStr].peakSlot);
      }
    });

    const calculateMetrics = (stats: ReturnType<typeof createStats>) => {
      const tkm = stats.cupons > 0 ? stats.vNF / stats.cupons : 0;
      const pa = stats.cupons > 0 ? stats.itens / stats.cupons : 0;
      const pm = stats.itens > 0 ? stats.vNF / stats.itens : 0;
      return { ...stats, tkm, pa, pm };
    };

    const dayList = Object.entries(byDay).map(([date, stats]) => {
      const early = calculateMetrics(stats.earlySlot);
      const closing = calculateMetrics(stats.closingSlot);
      const total = calculateMetrics(stats.total);
      
      return {
        date,
        displayDate: format(parseISO(date), "dd/MM (EEE)", { locale: ptBR }),
        early,
        closing,
        total,
        participationEarly: total.vNF > 0 ? (early.vNF / total.vNF) * 100 : 0,
        participationClosing: total.vNF > 0 ? (closing.vNF / total.vNF) * 100 : 0,
        isBurstClosing: closing.cupons > (early.cupons * 1.2) // Se fecha com 20% mais cupons que abre, é rajada
      };
    }).sort((a, b) => b.date.localeCompare(a.date));

    const totals = dayList.reduce((acc, d) => ({
      vNF: acc.vNF + d.total.vNF,
      cupons: acc.cupons + d.total.cupons,
      itens: acc.itens + d.total.itens,
      earlyVNF: acc.earlyVNF + d.early.vNF,
      earlyCupons: acc.earlyCupons + d.early.cupons,
      closingVNF: acc.closingVNF + d.closing.vNF,
      closingCupons: acc.closingCupons + d.closing.cupons,
    }), { vNF: 0, cupons: 0, itens: 0, earlyVNF: 0, earlyCupons: 0, closingVNF: 0, closingCupons: 0 });

    const avgMetrics = {
      early: calculateMetrics({ vNF: totals.earlyVNF, cupons: totals.earlyCupons, itens: 0 }), // Itens calculation simplified for totals
      closing: calculateMetrics({ vNF: totals.closingVNF, cupons: totals.closingCupons, itens: 0 }),
      global: calculateMetrics({ vNF: totals.vNF, cupons: totals.cupons, itens: totals.itens })
    };

    // Recalcular PA e PM do total de forma correta
    const aggregateEarlyItens = dayList.reduce((acc, d) => acc + d.early.itens, 0);
    const aggregateClosingItens = dayList.reduce((acc, d) => acc + d.closing.itens, 0);

    const fullEarlyMetrics = calculateMetrics({ vNF: totals.earlyVNF, cupons: totals.earlyCupons, itens: aggregateEarlyItens });
    const fullClosingMetrics = calculateMetrics({ vNF: totals.closingVNF, cupons: totals.closingCupons, itens: aggregateClosingItens });

    return {
      dayList,
      totals,
      avgMetrics: {
        early: fullEarlyMetrics,
        closing: fullClosingMetrics,
        global: avgMetrics.global
      },
      isEarlyWorth: (totals.earlyVNF / totals.vNF) > 0.08,
      riskClosing: fullClosingMetrics.cupons > (fullEarlyMetrics.cupons * 1.1),
      // Produtividade: Venda por pessoa (considerando 2 pessoas às 12h e 4 às 20h)
      prodEarly: totals.earlyVNF / 2,
      prodClosing: totals.closingVNF / 4
    };
  }, [data]);

  const dashboardData = analytics.dayList.map(d => ({
    name: d.displayDate,
    "12h-13h": d.early.vNF,
    "20h-21h": d.closing.vNF,
    "Restante": d.total.vNF - d.early.vNF - d.closing.vNF
  })).reverse();

  const formatBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header com Projeção */}
      <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 blur-[100px] -mr-32 -mt-32" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
          <div className="space-y-4 max-w-xl">
             <div className="flex items-center gap-3">
                <div className="p-3 bg-white/10 rounded-2xl">
                   <CalendarIcon className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                   <h2 className="text-2xl font-black uppercase tracking-tight">Análise Dominical (12h às 13h)</h2>
                   <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Vale a pena abrir 1 hora mais cedo?</p>
                </div>
             </div>
             
             <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                   <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Impacto Abertura (12h)</p>
                   <p className="text-2xl font-black text-indigo-400">{((analytics.totals.earlyVNF / analytics.totals.vNF) * 100).toFixed(1)}%</p>
                   <p className="text-[8px] text-slate-500 font-bold uppercase mt-1">Participação na venda total</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                   <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Risco Fechamento (20h)</p>
                   <div className="flex items-center gap-2">
                      <p className={cn("text-lg font-black uppercase", analytics.riskClosing ? "text-rose-400" : "text-emerald-400")}>
                        {analytics.riskClosing ? "Crítico" : "Estável"}
                      </p>
                      {analytics.riskClosing ? <TrendingDown className="w-5 h-5 text-rose-400" /> : <TrendingUp className="w-5 h-5 text-emerald-400" />}
                   </div>
                   <p className="text-[8px] text-slate-500 font-bold uppercase mt-1">Volume 20h vs 12h</p>
                </div>
             </div>
          </div>

          <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 flex-1 max-w-sm space-y-6">
             <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Faturamento Total do Período</p>
                <p className="text-3xl font-black text-white">{formatBRL(analytics.totals.vNF)}</p>
                <div className="h-2 w-full bg-slate-800 rounded-full mt-2 overflow-hidden">
                   <div className="h-full bg-indigo-500" style={{ width: '100%' }} />
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Extra 12h</p>
                   <p className="text-lg font-black text-indigo-300">{formatBRL(analytics.totals.earlyVNF)}</p>
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Extra 20h</p>
                   <p className="text-lg font-black text-rose-300">{formatBRL(analytics.totals.closingVNF)}</p>
                </div>
             </div>
             <p className="text-[9px] text-center text-indigo-300 font-bold uppercase tracking-tight italic">
               Análise correlacionada entre abertura antecipada e fechamento
             </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Evolução por Domingo */}
        <Card className="ri-card lg:col-span-2 overflow-hidden border-none shadow-sm">
          <CardHeader className="bg-slate-50 border-b p-6 flex flex-row items-center justify-between">
            <div>
               <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                 <Clock className="w-4 h-4 text-indigo-500" /> Performance Diária (Domingos e Feriados)
               </CardTitle>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Comparação da primeira hora com o restante</p>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '10px' }} />
                <Bar dataKey="12h-13h" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Restante" stackId="a" fill="#e2e8f0" radius={[0, 0, 0, 0]} />
                <Bar dataKey="20h-21h" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Diagnóstico Qualitativo */}
        <div className="space-y-4">
           <Card className="ri-card border-none shadow-sm h-fit">
              <CardHeader className="bg-slate-900 text-white p-6">
                 <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                    <Target className="w-4 h-4" /> KPIs Qualitativos (Médias)
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                  <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                     <div className="p-4 text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase">TKM Global</p>
                        <p className="text-sm font-black text-slate-800">{formatBRL(analytics.avgMetrics.global.tkm)}</p>
                     </div>
                     <div className="p-4 text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase">PA Global</p>
                        <p className="text-sm font-black text-slate-800">{analytics.avgMetrics.global.pa.toFixed(2)}</p>
                     </div>
                     <div className="p-4 text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase">PM Global</p>
                        <p className="text-sm font-black text-slate-800">{formatBRL(analytics.avgMetrics.global.pm)}</p>
                     </div>
                  </div>
                  
                  <div className="p-6 space-y-6">
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black uppercase text-indigo-500 tracking-widest flex items-center gap-2">
                          <Clock className="w-3 h-3" /> Performance 12h-13h
                       </h4>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                             <p className="text-[9px] font-bold text-indigo-400 uppercase">PA</p>
                             <p className="text-lg font-black text-indigo-700">{analytics.avgMetrics.early.pa.toFixed(2)}</p>
                          </div>
                          <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                             <p className="text-[9px] font-bold text-indigo-400 uppercase">TKM</p>
                             <p className="text-lg font-black text-indigo-700">{formatBRL(analytics.avgMetrics.early.tkm)}</p>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black uppercase text-rose-500 tracking-widest flex items-center gap-2">
                          <Clock className="w-3 h-3" /> Performance 20h-21h
                       </h4>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100">
                             <p className="text-[9px] font-bold text-rose-400 uppercase">PA</p>
                             <p className="text-lg font-black text-rose-700">{analytics.avgMetrics.closing.pa.toFixed(2)}</p>
                          </div>
                          <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100">
                             <p className="text-[9px] font-bold text-rose-400 uppercase">TKM</p>
                             <p className="text-lg font-black text-rose-700">{formatBRL(analytics.avgMetrics.closing.tkm)}</p>
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="p-6 pt-0 space-y-6">
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black uppercase text-amber-500 tracking-widest flex items-center gap-2">
                          <Briefcase className="w-3 h-3" /> Produtividade (Venda/Pessoa)
                       </h4>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                             <p className="text-[9px] font-bold text-amber-600 uppercase">12h (2 pessoas)</p>
                             <p className="text-sm font-black text-amber-700">{formatBRL(analytics.prodEarly)}</p>
                          </div>
                          <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                             <p className="text-[9px] font-bold text-amber-600 uppercase">20h (4 pessoas)</p>
                             <p className="text-sm font-black text-amber-700">{formatBRL(analytics.prodClosing)}</p>
                          </div>
                       </div>
                       <p className="text-[8px] text-slate-400 italic font-medium leading-tight">
                         {analytics.prodClosing > analytics.prodEarly 
                           ? "O fechamento exige mais de cada consultor do que a abertura." 
                           : "A abertura gera mais faturamento por pessoa que o fechamento."}
                       </p>
                    </div>
                  </div>
              </CardContent>
           </Card>

           <Card className="ri-card border-none shadow-sm bg-indigo-900 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-2xl rounded-full -mr-16 -mt-16" />
              <CardHeader className="p-6 pb-2">
                 <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                    <Info className="w-4 h-4" /> Argumentos para a Diretoria
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-4">
                 <div className="space-y-3">
                    <div className="flex gap-3">
                       <div className="bg-white/10 w-2 h-2 rounded-full mt-1.5 shrink-0" />
                       <p className="text-[11px] font-medium leading-tight">
                          <strong>Escalabilidade Operacional:</strong> {analytics.riskClosing 
                            ? "O volume das 20h supera o das 12h em cupons. A saída de 2 pessoas às 20h gera um gargalo onde a demanda é maior que a abertura." 
                            : "A distribuição entre 12h e 20h está equilibrada, suportando a redução de equipe no fechamento."}
                       </p>
                    </div>
                    <div className="flex gap-3">
                       <div className="bg-white/10 w-2 h-2 rounded-full mt-1.5 shrink-0" />
                       <p className="text-[11px] font-medium leading-tight">
                          <strong>Qualidade do Atendimento:</strong> O PA de 20h às 21h é de {analytics.avgMetrics.closing.pa.toFixed(2)}. 
                          {analytics.avgMetrics.closing.pa < analytics.avgMetrics.early.pa 
                            ? " Há sinais de 'venda de rajada' com menor profundidade (venda rápida/reativa) no fechamento devido à falta de consultores."
                            : " A qualidade se mantém estável mesmo com equipe reduzida."}
                       </p>
                    </div>
                    <div className="flex gap-3">
                       <div className="bg-white/10 w-2 h-2 rounded-full mt-1.5 shrink-0" />
                       <p className="text-[11px] font-medium leading-tight">
                          <strong>Eficiência Financeira:</strong> A abertura (2 pessoas) rende {formatBRL(analytics.prodEarly)}/pessoa. 
                          O fechamento (4 pessoas) rende {formatBRL(analytics.prodClosing)}/pessoa. 
                          {analytics.prodClosing > analytics.prodEarly * 1.2 
                           ? " O fechamento está sobrecarregado (rajada), sugerindo que manter as 6 pessoas até o fim traria mais conversão que abrir cedo." 
                           : " A produtividade está equilibrada entre os turnos."}
                       </p>
                    </div>
                 </div>
                 
                 <div className="pt-4 border-t border-white/10 mt-2">
                    <div className={cn("p-3 rounded-lg text-[10px] font-black uppercase text-center", analytics.riskClosing ? "bg-rose-500" : "bg-emerald-500")}>
                       Conclusão: {analytics.riskClosing ? "Repriorizar Saída das 20h" : "Op. Sustentável"}
                    </div>
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>

      {/* Tabela de Detalhes por Data */}
      <Card className="ri-card border-none shadow-sm overflow-hidden text-black bg-white">
        <CardHeader className="bg-slate-900 text-white p-6">
          <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
            <Timer className="w-4 h-4 text-indigo-400" /> Histórico de Abertura Antecipada
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-4 font-black uppercase text-slate-500">Data</th>
                  <th className="p-4 font-black uppercase text-slate-500">Faturamento Tot.</th>
                  <th className="p-4 font-black uppercase text-slate-500 text-center">Cupons (12h | 20h)</th>
                  <th className="p-4 font-black uppercase text-slate-500 text-center">PA (12h | 20h)</th>
                  <th className="p-4 font-black uppercase text-slate-500 text-right">Trend</th>
                </tr>
              </thead>
              <tbody>
                {analytics.dayList.map((d, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-black text-slate-700 uppercase">{d.displayDate}</td>
                    <td className="p-4 font-bold text-slate-600">{formatBRL(d.total.vNF)}</td>
                    <td className="p-4 text-center font-bold text-slate-600">
                      <span className="text-indigo-600">{d.early.cupons}</span> | <span className="text-rose-600">{d.closing.cupons}</span>
                    </td>
                    <td className="p-4 text-center font-bold text-slate-600">
                      <span className="text-indigo-600">{d.early.pa.toFixed(2)}</span> | <span className="text-rose-600">{d.closing.pa.toFixed(2)}</span>
                    </td>
                    <td className="p-4 text-right">
                      <Badge className={cn("text-[10px] font-black border-none", d.isBurstClosing ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700")}>
                        {d.isBurstClosing ? "Rajada 20h" : "Estável"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
