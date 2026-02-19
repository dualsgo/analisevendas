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
import { TrendingUp, AlertTriangle, Info } from "lucide-react";
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
      { min: 2, max: 7, label: "Desconto Leve (2-7%)" },
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
      {/* Guia Didático */}
      <div className="bg-white rounded-[2rem] p-6 md:p-8 border-2 border-orange-100 shadow-sm space-y-4">
        <div className="flex items-center gap-3 text-orange-500">
          <TrendingUp className="w-6 h-6" />
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight">O desconto está valendo a pena?</h1>
        </div>
        <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-4xl">
          Esta análise cruza o <strong>Investimento (Desconto %)</strong> com o <strong>Retorno (Peças por Atendimento)</strong>. 
          <br/><br/>
          <span className="text-slate-800 font-bold">Como ler o gráfico:</span> Se os pontos sobem conforme caminham para a direita, o desconto está funcionando. Se os pontos continuam "baixos" mesmo com desconto alto, o vendedor está perdendo margem sem aumentar a cesta do cliente.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="ri-card border-none lg:col-span-2 overflow-hidden shadow-xl">
          <CardHeader className="bg-slate-50/50 border-b p-6">
            <CardTitle className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
              <Info className="w-4 h-4" /> Mapa de Eficiência: Desconto vs Retorno em PA
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" dataKey="discount" name="Desconto" unit="%" axisLine={false} tick={{fontSize: 10, fontWeight: 700}} label={{ value: 'Quanto de Desconto foi dado (%)', position: 'insideBottom', offset: -10, fontSize: 10, fontWeight: 800 }} />
                  <YAxis type="number" dataKey="pa" name="PA" unit=" it" axisLine={false} tick={{fontSize: 10, fontWeight: 700}} label={{ value: 'Quantas Peças o cliente levou', angle: -90, position: 'insideLeft', fontSize: 10, fontWeight: 800 }} />
                  <ZAxis type="number" dataKey="value" range={[50, 400]} name="Valor R$" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
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
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Resumo por Faixa de Incentivo</h3>
          {stats.map((s, i) => (
            <Card key={i} className="ri-card border-none bg-white p-4 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <Badge variant="outline" className={cn(
                  "font-black border-none px-3",
                  s.min >= 7 && s.min < 12 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                )}>{s.label}</Badge>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{s.count} vendas</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">PA Médio</p>
                  <p className="text-lg font-black text-slate-800">{s.avgPA.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Ticket Médio</p>
                  <p className="text-lg font-black text-orange-600">R$ {s.avgValue.toFixed(0)}</p>
                </div>
              </div>
            </Card>
          ))}

          {diagnosis && (
            <div className={cn(
              "p-5 rounded-2xl border space-y-3 mt-6",
              diagnosis.lossValue ? "bg-rose-50 border-rose-100 text-rose-800" : "bg-emerald-50 border-emerald-100 text-emerald-800"
            )}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Leitura Estratégica</span>
              </div>
              <p className="text-[11px] font-medium leading-relaxed italic">
                {diagnosis.lossValue 
                  ? "Atenção: O faturamento com desconto tem um PA menor ou igual à venda orgânica. Você está 'pagando' para o cliente levar menos peças. Pare a estratégia imediatamente." 
                  : (diagnosis.isWorking 
                    ? "O desconto está funcionando! Clientes que recebem incentivo estão saindo com cestas significativamente maiores." 
                    : "Efeito neutro: O desconto está apenas mantendo o PA, sem crescimento real de volume.")
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
