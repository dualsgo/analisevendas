
"use client";

import React, { useMemo } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  CartesianGrid
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertTriangle, Info, Zap, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ElasticityAnalysisProps {
  data: DetailedSaleRow[];
}

export function ElasticityAnalysis({ data }: ElasticityAnalysisProps) {
  const chartData = useMemo(() => {
    return data
      .filter(s => !s.is_cancelada && s.tpNF === 1 && parseFloat(s.vNF) > 0)
      .map(s => ({
        discount: parseFloat(s.percentual_desconto) * 100,
        pa: parseFloat(s.itens_qtd),
        value: parseFloat(s.vNF),
        vendor: s.vendedor
      }));
  }, [data]);

  const stats = useMemo(() => {
    const ranges = [
      { min: 0, max: 2, label: "Sem Desconto (0-2%)" },
      { min: 2, max: 7, label: "Leve (2-7%)" },
      { min: 7, max: 12, label: "Estratégico (7-12%)" },
      { min: 12, max: 100, label: "Agressivo (12%+)" },
    ];

    return ranges.map(r => {
      const sales = chartData.filter(s => s.discount >= r.min && s.discount < r.max);
      const avgPA = sales.length > 0 ? sales.reduce((acc, s) => acc + s.pa, 0) / sales.length : 0;
      const avgValue = sales.length > 0 ? sales.reduce((acc, s) => acc + s.value, 0) / sales.length : 0;
      return { ...r, avgPA, avgValue, count: sales.length };
    });
  }, [chartData]);

  const diagnosis = useMemo(() => {
    if (stats.length < 4) return null;
    const noDisc = stats[0];
    const hiDisc = stats[2]; // Estratégico 7-12%
    const isWorking = hiDisc.avgPA > noDisc.avgPA + 0.3;
    const lossValue = hiDisc.avgPA <= noDisc.avgPA;
    return { isWorking, lossValue };
  }, [stats]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="ri-card lg:col-span-2 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b p-6">
            <CardTitle className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
              <Info className="w-4 h-4" /> Mapa de Elasticidade: Desconto vs Retorno em PA
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" dataKey="discount" name="Desconto" unit="%" axisLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                  <YAxis type="number" dataKey="pa" name="PA" unit=" it" axisLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                  <ZAxis type="number" dataKey="value" range={[50, 400]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Vendas" data={chartData} fill="#F37021" fillOpacity={0.6}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.discount > 12 ? '#ef4444' : (entry.discount > 7 ? '#39B54A' : '#F37021')} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="ri-card bg-slate-900 text-white p-6 space-y-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl" />
             <div className="flex items-center gap-3 text-orange-400">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Diagnóstico de Margem</span>
             </div>
             <div className="space-y-4">
                <p className="text-sm font-medium leading-relaxed italic opacity-90">
                  {diagnosis?.lossValue 
                    ? "GARGALO DE RENTABILIDADE: Detectamos 'Canibalização de Margem'. Você está dando descontos, mas o cliente continua levando a mesma quantidade de peças (PA estável). O incentivo está apenas 'queimando' seu lucro sem gerar volume extra." 
                    : "EFICIÊNCIA CONFIRMADA: O desconto está cumprindo seu papel. Vendas com incentivo possuem um PA significativamente maior, justificando o investimento em margem."}
                </p>
                <div className="pt-4 border-t border-white/10 flex items-center gap-3">
                   <div className="p-2 bg-white/10 rounded-lg"><Zap className="w-4 h-4 text-orange-400" /></div>
                   <p className="text-[10px] font-bold uppercase leading-tight">Diretriz: {diagnosis?.lossValue ? "Reduzir autonomia de descontos manuais e focar em campanhas de valor." : "Manter estratégia de adicional 10%."}</p>
                </div>
             </div>
          </Card>

          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2 mt-6">Resumo de Retorno</h3>
          {stats.map((s, i) => (
            <Card key={i} className="ri-card p-4 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <Badge variant="outline" className={cn("font-black border-none px-2 h-5", s.min >= 7 && s.min < 12 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>{s.label}</Badge>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{s.count} vds</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">PA Médio</p>
                  <p className="text-base font-black text-slate-800">{s.avgPA.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">TKM Médio</p>
                  <p className="text-base font-black text-orange-600">R$ {s.avgValue.toFixed(0)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
