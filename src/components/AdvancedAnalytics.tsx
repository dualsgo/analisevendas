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
  Cell,
  PieChart,
  Pie
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Smartphone, Clock, Award, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdvancedAnalyticsProps {
  data: DetailedSaleRow[];
}

export function AdvancedAnalytics({ data }: AdvancedAnalyticsProps) {
  const activeSales = useMemo(() => data.filter(s => !s.is_cancelada && s.tpNF === 1), [data]);

  // 1. Pareto - Concentração de Adicionais
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

  // 2. Stress Test - Dependência de Canal
  const dependencyData = useMemo(() => {
    const pickupRev = activeSales.filter(s => s.canal === "RETIRADA_ONLINE").reduce((acc, s) => acc + parseFloat(s.vNF), 0);
    const addRev = activeSales.filter(s => s.canal === "RETIRADA_ADICIONAL").reduce((acc, s) => acc + parseFloat(s.vNF), 0);
    const organicRev = activeSales.filter(s => s.canal === "LOJA_FISICA").reduce((acc, s) => acc + parseFloat(s.vNF), 0);
    const total = pickupRev + addRev + organicRev;

    return [
      { name: 'Pickup (Site)', value: pickupRev, fill: '#36B7E1' },
      { name: 'Adicional (Upsell)', value: addRev, fill: '#F37021' },
      { name: 'Orgânico Puro', value: organicRev, fill: '#39B54A' }
    ];
  }, [activeSales]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Curva de Pareto */}
        <Card className="ri-card border-none overflow-hidden shadow-xl">
          <CardHeader className="bg-indigo-50/50 border-b p-6 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-black uppercase text-indigo-700 flex items-center gap-2">
                <Award className="w-4 h-4" /> Concentração de Adicionais (Pareto)
              </CardTitle>
            </div>
            <Badge className="bg-indigo-100 text-indigo-700 border-none font-black text-[9px]">RISCO OPERACIONAL</Badge>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-[11px] text-slate-500 mb-6 font-medium italic">
              "Se os primeiros 3 vendedores concentram mais de 70% dos adicionais, sua loja depende de talentos isolados, não de um processo padrão."
            </p>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paretoData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tick={{fontSize: 9, fontWeight: 700}} />
                  <YAxis axisLine={false} tick={{fontSize: 9, fontWeight: 700}} />
                  <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
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
              <Smartphone className="w-4 h-4" /> Stress Test: Dependência de Canal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex flex-col md:flex-row items-center gap-8">
            <div className="h-[250px] w-full md:w-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dependencyData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80} paddingAngle={5} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-4">
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
                <p className="text-[9px] font-black text-sky-800 uppercase mb-1">Diagnóstico de Independência</p>
                <p className="text-[10px] text-sky-700 leading-relaxed">
                  {dependencyData[2].value > dependencyData[0].value + dependencyData[1].value 
                    ? "Sua loja tem força orgânica sólida. O site é um bônus." 
                    : "Atenção: Sua unidade é 'Site-Dependente'. Se o tráfego digital cair, o faturamento colapsa."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
