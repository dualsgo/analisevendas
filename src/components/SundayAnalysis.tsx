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
    
    // Identificar Domingos (0)
    // Feriados comuns (simplificado para demonstração se não houver lista oficial)
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
    const otherSales = activeSales.filter(s => !isSundayOrHoliday(s.dhEmi));

    // Agrupar por data (apenas domingos/feriados)
    const byDay: Record<string, { total: number, extraHour: number, rest: number, cupons: number, extraCupons: number }> = {};
    
    targetSales.forEach(s => {
      const dayStr = s.dhEmi.split("T")[0];
      const h = getHours(parseISO(s.dhEmi));
      const val = parseFloat(s.vNF);
      const isExtra = h === 12;

      if (!byDay[dayStr]) byDay[dayStr] = { total: 0, extraHour: 0, rest: 0, cupons: 0, extraCupons: 0 };
      
      byDay[dayStr].total += val;
      byDay[dayStr].cupons++;
      if (isExtra) {
        byDay[dayStr].extraHour += val;
        byDay[dayStr].extraCupons++;
      } else {
        byDay[dayStr].rest += val;
      }
    });

    const dayList = Object.entries(byDay).map(([date, stats]) => ({
      date,
      displayDate: format(parseISO(date), "dd/MM (EEE)", { locale: ptBR }),
      ...stats,
      participation: (stats.extraHour / stats.total) * 100
    })).sort((a, b) => b.date.localeCompare(a.date));

    const totals = dayList.reduce((acc, d) => ({
      total: acc.total + d.total,
      extraHour: acc.extraHour + d.extraHour,
      rest: acc.rest + d.rest,
      cupons: acc.cupons + d.cupons,
      extraCupons: acc.extraCupons + d.extraCupons,
    }), { total: 0, extraHour: 0, rest: 0, cupons: 0, extraCupons: 0 });

    const avgParticipation = totals.total > 0 ? (totals.extraHour / totals.total) * 100 : 0;
    const avgTicketExtra = totals.extraCupons > 0 ? totals.extraHour / totals.extraCupons : 0;
    const avgTicketRest = (totals.cupons - totals.extraCupons) > 0 ? totals.rest / (totals.cupons - totals.extraCupons) : 0;

    return {
      dayList,
      totals,
      avgParticipation,
      avgTicketExtra,
      avgTicketRest,
      isWorth: avgParticipation > 8 // Arbitrário: se representa mais de 8% do dia (1h de 10h), vale a pena
    };
  }, [data]);

  const dashboardData = analytics.dayList.map(d => ({
    name: d.displayDate,
    "Faturamento 12h-13h": d.extraHour,
    "Faturamento Restante": d.rest
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
                   <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Participação na Venda</p>
                   <p className="text-2xl font-black text-indigo-400">{analytics.avgParticipation.toFixed(1)}%</p>
                   <p className="text-[8px] text-slate-500 font-bold uppercase mt-1">Estimativa de Impacto Diário</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                   <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Status da Decisão</p>
                   <div className="flex items-center gap-2">
                      <p className={cn("text-lg font-black uppercase", analytics.isWorth ? "text-emerald-400" : "text-rose-400")}>
                        {analytics.isWorth ? "Compensatório" : "Reavaliar"}
                      </p>
                      {analytics.isWorth ? <TrendingUp className="w-5 h-5 text-emerald-400" /> : <TrendingDown className="w-5 h-5 text-rose-400" />}
                   </div>
                   <p className="text-[8px] text-slate-500 font-bold uppercase mt-1">Baseado na média setada</p>
                </div>
             </div>
          </div>

          <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 flex-1 max-w-sm space-y-6">
             <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Com o movimento de 12h às 13h</p>
                <p className="text-3xl font-black text-white">{formatBRL(analytics.totals.total)}</p>
                <div className="h-2 w-full bg-slate-800 rounded-full mt-2 overflow-hidden">
                   <div className="h-full bg-indigo-500" style={{ width: '100%' }} />
                </div>
             </div>
             <div className="text-center opacity-60">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Padrão Original (S/ 12h-13h)</p>
                <p className="text-2xl font-black text-slate-300">{formatBRL(analytics.totals.rest)}</p>
                <div className="h-2 w-full bg-slate-800 rounded-full mt-2 overflow-hidden">
                   <div className="h-full bg-slate-600" style={{ width: `${(analytics.totals.rest/analytics.totals.total)*100}%` }} />
                </div>
             </div>
             <p className="text-[9px] text-center text-indigo-300 font-bold uppercase tracking-tight italic">
               Ganho incremental de {formatBRL(analytics.totals.extraHour)} no período analisado
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
                <Bar dataKey="Faturamento 12h-13h" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Faturamento Restante" stackId="a" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Diagnóstico Qualitativo */}
        <div className="space-y-4">
           <Card className="ri-card border-none shadow-sm h-fit">
              <CardHeader className="bg-emerald-900 text-white p-6">
                 <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                    <Target className="w-4 h-4" /> Qualidade da 1ª Hora
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                 <div className="flex justify-between items-end border-b pb-4 border-slate-100">
                    <div>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TKM 12h às 13h</p>
                       <p className="text-xl font-black text-slate-800">{formatBRL(analytics.avgTicketExtra)}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Diferença</p>
                       <p className={cn("text-sm font-black flex items-center gap-1 justify-end", (analytics.avgTicketExtra > analytics.avgTicketRest) ? "text-emerald-500" : "text-rose-500")}>
                          {(analytics.avgTicketExtra > analytics.avgTicketRest) ? "+" : "-"}{Math.abs(((analytics.avgTicketExtra / analytics.avgTicketRest) - 1) * 100).toFixed(1)}%
                       </p>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Recomendação Estratégica</h4>
                    <div className={cn("p-4 rounded-xl border-l-4", analytics.isWorth ? "bg-emerald-50 border-emerald-500" : "bg-amber-50 border-amber-500")}>
                       <p className="text-xs font-bold leading-relaxed text-slate-700">
                          {analytics.isWorth 
                            ? "Abertura antecipada saudável. O volume de vendas nesta 1ª hora justifica o custo operacional e mantém um TKM competitivo."
                            : "Volume baixo na 1ª hora. Considere mover essa força de trabalho para o fechamento ou horários de pico entre 14h e 16h para melhor ROI."
                          }
                       </p>
                    </div>
                 </div>
              </CardContent>
           </Card>

           <Card className="ri-card border-none shadow-sm">
              <CardHeader className="bg-slate-50 p-6 border-b">
                 <CardTitle className="text-xs font-black uppercase flex items-center gap-2 text-slate-500">
                    <Briefcase className="w-4 h-4" /> Custo de Oportunidade
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                 <div className="space-y-4">
                    <div className="flex justify-between text-xs">
                       <span className="text-slate-400 font-bold uppercase">Cupons na 1ª Hora</span>
                       <span className="font-black text-slate-700">{analytics.totals.extraCupons}</span>
                    </div>
                    <Progress value={(analytics.totals.extraCupons / analytics.totals.cupons) * 100} className="h-1.5" />
                    <p className="text-[10px] text-slate-400 italic">
                      Corresponde a {((analytics.totals.extraCupons / analytics.totals.cupons) * 100).toFixed(1)}% do total de clientes do domingo.
                    </p>
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
                  <th className="p-4 font-black uppercase text-slate-500">Extra (12h-13h)</th>
                  <th className="p-4 font-black uppercase text-slate-500">Cupons Extra</th>
                  <th className="p-4 font-black uppercase text-slate-500 text-right">Partic. %</th>
                </tr>
              </thead>
              <tbody>
                {analytics.dayList.map((d, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-black text-slate-700 uppercase">{d.displayDate}</td>
                    <td className="p-4 font-bold text-slate-600">{formatBRL(d.total)}</td>
                    <td className="p-4 font-black text-indigo-600">{formatBRL(d.extraHour)}</td>
                    <td className="p-4 font-bold text-slate-600">{d.extraCupons}</td>
                    <td className="p-4 text-right">
                      <Badge className={cn("text-[10px] font-black border-none", d.participation > 10 ? "bg-emerald-100 text-emerald-700" : d.participation > 5 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400")}>
                        {d.participation.toFixed(1)}%
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
