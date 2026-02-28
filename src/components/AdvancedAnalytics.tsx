
"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Award, 
  Layers, 
  Target, 
  Info, 
  UserX, 
  TrendingDown, 
  Zap, 
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AdvancedAnalyticsProps {
  data: DetailedSaleRow[];
}

export function AdvancedAnalytics({ data }: AdvancedAnalyticsProps) {
  const activeSales = useMemo(() => data.filter(s => !s.is_cancelada && s.tpNF === 1), [data]);
  const [selectedSim, setSelectedSim] = useState<string>("none");

  // 1. Levantamento de Talentos e Rankings
  const talentMetrics = useMemo(() => {
    const vendors: Record<string, any> = {};
    activeSales.forEach(s => {
      const v = s.vendedor || "OUTROS";
      if (!vendors[v]) vendors[v] = { name: v, venda: 0, cupons: 0, itens: 0 };
      vendors[v].venda += parseFloat(s.vNF);
      vendors[v].cupons++;
      vendors[v].itens += parseFloat(s.itens_qtd);
    });

    return Object.values(vendors)
      .map(v => ({
        ...v,
        pa: v.itens / v.cupons,
        tkm: v.venda / v.cupons,
        weight: (v.venda / (activeSales.reduce((acc, s) => acc + parseFloat(s.vNF), 0) || 1)) * 100
      }))
      .sort((a, b) => b.venda - a.venda);
  }, [activeSales]);

  // 2. Pareto Data
  const paretoData = useMemo(() => {
    let cumSum = 0;
    const total = talentMetrics.reduce((acc, v) => acc + v.venda, 0);
    return talentMetrics.map(v => {
      cumSum += v.venda;
      return { ...v, cumulative: (cumSum / total) * 100 };
    });
  }, [talentMetrics]);

  // 3. Simulação de Ausência
  const simulation = useMemo(() => {
    if (selectedSim === "none") return null;
    
    const target = talentMetrics.find(t => t.name === selectedSim);
    if (!target) return null;

    const others = talentMetrics.filter(t => t.name !== selectedSim);
    const avgPAOthers = others.reduce((acc, t) => acc + t.pa, 0) / others.length || 0;
    const avgTKMOthers = others.reduce((acc, t) => acc + t.tkm, 0) / others.length || 0;

    const gapPA = target.pa - avgPAOthers;
    const gapTKM = target.tkm - avgTKMOthers;

    // Diagnóstico de "Suprimento à Altura"
    let diagnosis = "";
    let severity: 'low' | 'medium' | 'high' = 'low';

    if (gapPA > 0.5) {
      diagnosis = `AUSÊNCIA CRÍTICA: ${target.name} possui um PA ${gapPA.toFixed(2)} maior que a média do time. Sua ausência não seria suprida pela equipe atual, resultando em perda de eficiência de balcão.`;
      severity = 'high';
    } else if (gapPA > 0.2) {
      diagnosis = `AUSÊNCIA SENSÍVEL: O time tem técnica razoável, mas perderia cerca de ${(gapPA/target.pa*100).toFixed(0)}% da qualidade nas vendas que seriam deste colaborador.`;
      severity = 'medium';
    } else {
      diagnosis = `AUSÊNCIA SUPRÍVEL: O time possui técnica similar. A perda seria apenas de volume (braço), não de qualidade por ticket.`;
      severity = 'low';
    }

    return { target, others, gapPA, gapTKM, diagnosis, severity };
  }, [talentMetrics, selectedSim]);

  const top3Concentration = paretoData.slice(0, 3).reduce((acc, v) => acc + v.weight, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Didático */}
      <div className="bg-white rounded-[2rem] p-6 md:p-8 border-2 border-indigo-100 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="bg-indigo-600 p-4 rounded-3xl text-white shadow-lg shadow-indigo-100">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="flex-1 space-y-1 text-center md:text-left">
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-800 italic">Análise de Dependência e Stress Test</h1>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            Sua unidade sobrevive à ausência dos destaques? Avaliamos se o restante da equipe possui técnica (PA/TKM) suficiente para suprir a falta de um talento "Sniper".
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Curva de Pareto - Concentração */}
        <Card className="ri-card border-none overflow-hidden shadow-xl lg:col-span-7 bg-white">
          <CardHeader className="bg-indigo-50/50 border-b p-6 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-xs font-black uppercase text-indigo-700 tracking-widest">Peso dos Talentos (Pareto)</CardTitle>
            </div>
            <Badge className={cn(
              "border-none font-black text-[9px] uppercase px-3 h-6",
              top3Concentration > 60 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
            )}>
              {top3Concentration > 60 ? "ALTA DEPENDÊNCIA" : "ESTRUTURA SAUDÁVEL"}
            </Badge>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paretoData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tick={{fontSize: 9, fontWeight: 700}} />
                  <YAxis axisLine={false} tick={{fontSize: 9, fontWeight: 700}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', shadow: 'none', fontWeight: 'bold' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="weight" name="Peso no Faturamento (%)" radius={[4, 4, 0, 0]}>
                    {paretoData.map((entry, index) => (
                      <Cell key={index} fill={index < 3 ? '#6366f1' : '#cbd5e1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl flex gap-4 items-center">
               <Info className="w-5 h-5 text-indigo-500 shrink-0" />
               <p className="text-[11px] text-slate-600 font-medium leading-relaxed italic">
                 "Os 3 maiores vendedores concentram <strong>{top3Concentration.toFixed(1)}%</strong> da sua receita. Isso significa que a meta da sua loja repousa sobre os ombros de apenas 3 pessoas."
               </p>
            </div>
          </CardContent>
        </Card>

        {/* Simulador de Ausência */}
        <Card className="ri-card border-none bg-slate-900 text-white lg:col-span-5 shadow-2xl flex flex-col overflow-hidden">
          <CardHeader className="bg-white/5 border-b border-white/10 p-6">
            <div className="flex items-center gap-3">
              <UserX className="w-5 h-5 text-rose-400" />
              <CardTitle className="text-xs font-black uppercase tracking-widest">Simulador de Impacto</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-8 flex-1">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Selecione um Destaque para retirar da escala:</label>
              <Select value={selectedSim} onValueChange={setSelectedSim}>
                <SelectTrigger className="bg-white/10 border-white/20 h-12 rounded-xl text-sm font-black uppercase">
                  <SelectValue placeholder="Escolha um colaborador..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="font-bold">Nenhum (Visão Base)</SelectItem>
                  {talentMetrics.slice(0, 5).map(t => (
                    <SelectItem key={t.name} value={t.name} className="font-bold uppercase">{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {simulation ? (
              <div className="space-y-8 animate-in slide-in-from-bottom-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Faturamento em Risco</p>
                    <p className="text-xl font-black text-rose-400">-{simulation.target.weight.toFixed(1)}%</p>
                    <p className="text-[10px] font-bold text-slate-500 mt-1">R$ {simulation.target.venda.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Gap Técnico (PA)</p>
                    <p className={cn("text-xl font-black", simulation.gapPA > 0 ? "text-orange-400" : "text-emerald-400")}>
                      {simulation.gapPA > 0 ? `+${simulation.gapPA.toFixed(2)}` : simulation.gapPA.toFixed(2)}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 mt-1">Vs média base</p>
                  </div>
                </div>

                <div className={cn(
                  "p-6 rounded-[2rem] border-2 space-y-4",
                  simulation.severity === 'high' ? "bg-rose-500/10 border-rose-500/30" : 
                  simulation.severity === 'medium' ? "bg-orange-500/10 border-orange-500/30" : 
                  "bg-emerald-500/10 border-emerald-500/30"
                )}>
                  <div className="flex items-center gap-3">
                    <Zap className={cn("w-5 h-5", simulation.severity === 'high' ? "text-rose-400" : "text-orange-400")} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Veredito do Stress Test</span>
                  </div>
                  <p className="text-sm font-medium leading-relaxed italic opacity-90">
                    "{simulation.diagnosis}"
                  </p>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/10">
                   <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-indigo-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ação Recomendada</span>
                   </div>
                   <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                     {simulation.severity === 'high' 
                       ? `Urgente: Iniciar treinamento de "Sombra" entre ${simulation.target.name} e os demais vendedores para transferir a técnica de venda adicional e reduzir o gap de PA.`
                       : `Focar em aumentar a quantidade de atendimentos da base, já que a qualidade técnica (PA) deles já é satisfatória.`}
                   </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 opacity-40 py-10">
                <Users className="w-12 h-12" />
                <p className="text-xs font-bold uppercase tracking-widest max-w-[200px]">Selecione um talento para iniciar o simulador</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
