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
  CartesianGrid,
  Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Target, TrendingUp, Percent, AlertTriangle } from "lucide-react";
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
      { min: 0, max: 2, label: "0-2%" },
      { min: 2, max: 7, label: "2-7%" },
      { min: 7, max: 12, label: "7-12%" },
      { min: 12, max: 100, label: "12%+" },
    ];

    return ranges.map(r => {
      const sales = chartData.filter(s => s.discount >= r.min && s.discount < r.max);
      const avgPA = sales.length > 0 ? sales.reduce((acc, s) => acc + s.pa, 0) / sales.length : 0;
      const avgValue = sales.length > 0 ? sales.reduce((acc, s) => acc + s.value, 0) / sales.length : 0;
      return { ...r, avgPA, avgValue, count: sales.length };
    });
  }, [chartData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="bg-white rounded-[2rem] p-6 border-2 border-orange-100 shadow-sm space-y-4">
        <div className="flex items-center gap-3 text-orange-500">
          <TrendingUp className="w-6 h-6" />
          <h1 className="text-xl font-black uppercase tracking-tight">Elasticidade de Desconto</h1>
        </div>
        <p className="text-sm text-slate-500 font-medium leading-relaxed">
          O desconto está "comprando" PA ou apenas reduzindo a margem? 
          Este gráfico cruza o <strong>% de Desconto (Eixo X)</strong> com a <strong>Quantidade de Peças (Eixo Y)</strong>. 
          Se a nuvem de pontos não sobe conforme o desconto aumenta, você está usando o desconto como um atalho ineficiente.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="ri-card border-none lg:col-span-2 overflow-hidden shadow-xl">
          <CardHeader className="bg-slate-50/50 border-b p-6">
            <CardTitle className="text-xs font-black uppercase text-slate-500 tracking-widest">Correlação Desconto vs PA</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" dataKey="discount" name="Desconto" unit="%" axisLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                  <YAxis type="number" dataKey="pa" name="PA" unit=" it" axisLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                  <ZAxis type="number" dataKey="value" range={[50, 400]} name="Valor R$" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Scatter name="Vendas" data={chartData} fill="#F37021" fillOpacity={0.6}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.discount > 12 ? '#ef4444' : '#F37021'} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Eficiência por Faixa</h3>
          {stats.map((s, i) => (
            <Card key={i} className="ri-card border-none bg-white p-4 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <Badge variant="outline" className="bg-slate-50 text-slate-600 font-black border-slate-100">{s.label}</Badge>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{s.count} cupons</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">PA Médio</p>
                  <p className="text-lg font-black text-slate-800">{s.avgPA.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">TKM Médio</p>
                  <p className="text-lg font-black text-orange-600">R$ {s.avgValue.toFixed(0)}</p>
                </div>
              </div>
            </Card>
          ))}

          <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 space-y-3 mt-6">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Alerta de Margem</span>
            </div>
            <p className="text-[11px] font-medium text-amber-800 leading-relaxed italic">
              "Vendas com mais de 12% de desconto devem apresentar PA 30% superior à média orgânica. Caso contrário, o desconto é apenas perda de lucro."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
