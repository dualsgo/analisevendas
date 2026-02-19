"use client";

import React, { useMemo } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Award, Layers, Target, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdvancedAnalyticsProps {
  data: DetailedSaleRow[];
}

export function AdvancedAnalytics({ data }: AdvancedAnalyticsProps) {
  const activeSales = useMemo(() => data.filter(s => !s.is_cancelada && s.tpNF === 1), [data]);

  // Pareto - Concentração de Adicionais
  const paretoData = useMemo(() => {
    const vendors: Record<string, number> = {};
    activeSales.forEach(s => {
      if (s.is_adicional || s.is_adicional_suspeito) {
        const v = s.vendedor || "OUTROS";
        vendors[v] = (vendors[v] || 0) + parseFloat(s.vNF);
      }
    });

    const sorted = Object.entries(vendors)
      .map(([name, val]) => ({ name, value: val }))
      .sort((a, b) => b.value - a.value);

    const total = sorted.reduce((acc, v) => acc + v.value, 0);
    let cumSum = 0;
    
    return sorted.map(v => {
      cumSum += v.value;
      return { ...v, percentage: (v.value / total) * 100, cumulative: (cumSum / total) * 100 };
    });
  }, [activeSales]);

  // Stress Test - Dependência de Canal
  const dependencyData = useMemo(() => {
    const pickupRev = activeSales.filter(s => s.canal === "RETIRADA_ONLINE").reduce((acc, s) => acc + parseFloat(s.vNF), 0);
    const addRev = activeSales.filter(s => s.canal === "RETIRADA_ADICIONAL").reduce((acc, s) => acc + parseFloat(s.vNF), 0);
    const organicRev = activeSales.filter(s => s.canal === "LOJA_FISICA").reduce((acc, s) => acc + parseFloat(s.vNF), 0);
    
    return [
      { name: 'Pickup (Site)', value: pickupRev, fill: '#36B7E1' },
      { name: 'Venda Adicional', value: addRev, fill: '#F37021' },
      { name: 'Orgânico Puro', value: organicRev, fill: '#39B54A' }
    ];
  }, [activeSales]);

  const top3Concentration = useMemo(() => {
    if (paretoData.length === 0) return 0;
    const top3 = paretoData.slice(0, 3).reduce((acc, v) => acc + v.value, 0);
    const total = paretoData.reduce((acc, v) => acc + v.value, 0);
    return total > 0 ? (top3 / total) * 100 : 0;
  }, [paretoData]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Didático */}
      <div className="bg-white rounded-[2rem] p-6 md:p-8 border-2 border-indigo-100 shadow-sm space-y-4">
        <div className="flex items-center gap-3 text-indigo-600">
          <Layers className="w-6 h-6" />
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight">Onde mora o risco da sua operação?</h1>
        </div>
        <p className="text-sm text-slate-500 font-medium leading-relaxed">
          Nesta página, testamos a resistência da sua unidade. Analisamos se o seu resultado depende de poucas pessoas (**Pareto**) ou se ele depende demais de fatores externos (**Canais Digitais**).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Curva de Pareto */}
        <Card className="ri-card border-none overflow-hidden shadow-xl">
          <CardHeader className="bg-indigo-50/50 border-b p-6 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-black uppercase text-indigo-700 flex items-center gap-2">
                <Award className="w-4 h-4" /> Dependência de Talentos (Pareto)
              </CardTitle>
            </div>
            <Badge className={cn(
              "border-none font-black text-[9px]",
              top3Concentration > 70 ? "bg-rose-100 text-rose-700" : "bg-indigo-100 text-indigo-700"
            )}>
              {top3Concentration > 70 ? "ALTO RISCO" : "BAIXO RISCO"}
            </Badge>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl flex gap-3 items-start">
              <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed italic">
                "Os Top 3 vendedores concentram <strong>{top3Concentration.toFixed(0)}%</strong> de todas as vendas adicionais da loja. {top3Concentration > 70 ? "Se um deles faltar hoje, seu PA despenca. Treine a base!" : "Seu resultado é bem distribuído."}"
              </p>
            </div>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paretoData.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tick={{fontSize: 9, fontWeight: 700}} />
                  <YAxis axisLine={false} tick={{fontSize: 9, fontWeight: 700}} />
                  <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', shadow: 'none' }} />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} name="Venda Adicional R$" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Dependência de Canal */}
        <Card className="ri-card border-none overflow-hidden shadow-xl">
          <CardHeader className="bg-sky-50/50 border-b p-6">
            <CardTitle className="text-xs font-black uppercase text-sky-700 flex items-center gap-2">
              <Smartphone className="w-4 h-4" /> Sobrevivência: Se o Site Parar?
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex flex-col md:flex-row items-center gap-8">
            <div className="h-[250px] w-full md:w-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dependencyData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80} paddingAngle={5}>
                    {dependencyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mix de Faturamento</p>
              {dependencyData.map((d, i) => (
                <div key={i} className="flex justify-between items-center border-b border-slate-50 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                    <span className="text-[10px] font-black text-slate-600 uppercase">{d.name}</span>
                  </div>
                  <span className="text-xs font-black text-slate-800">{((d.value / dependencyData.reduce((acc, v) => acc + v.value, 0)) * 100).toFixed(1)}%</span>
                </div>
              ))}
              <div className="bg-sky-50 p-4 rounded-xl border border-sky-100">
                <p className="text-[9px] font-black text-sky-800 uppercase mb-1">Diagnóstico Ri Happy</p>
                <p className="text-[10px] text-sky-700 leading-relaxed italic">
                  {dependencyData[2].value > (dependencyData[0].value + dependencyData[1].value) 
                    ? "Sua loja é forte no orgânico! Você vende mesmo sem o site." 
                    : "Atenção: Você é altamente dependente do fluxo digital. Se o tráfego cair, sua meta fica impossível."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
