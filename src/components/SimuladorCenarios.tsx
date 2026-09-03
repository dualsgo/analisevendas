"use client";
import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, TrendingUp, Users, ShoppingBag, ArrowRight, Info } from "lucide-react";
import { DetailedSaleRow } from "@/lib/types";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

export function SimuladorCenarios({ data }: { data: DetailedSaleRow[] }) {
  const baseMetrics = useMemo(() => {
    const saidas = data.filter(r => r.tpNF === 1 && !r.is_devolucao && !r.is_cancelada);
    const v = saidas.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
    const c = saidas.length;
    const i = saidas.reduce((acc, r) => acc + parseFloat(r.itens_qtd), 0);

    return {
      venda: v,
      cupons: c,
      tkm: c > 0 ? v / c : 0,
      pa: c > 0 ? i / c : 0
    };
  }, [data]);

  const [adjustments, setAdjustments] = useState({
    tkm: 0, // Percentual
    pa: 0,  // Absoluto (+0.1, +0.2...)
    cupons: 0 // Percentual (Fluxo)
  });

  const projection = useMemo(() => {
    const newTkm = baseMetrics.tkm * (1 + adjustments.tkm / 100);
    const newPa = baseMetrics.pa + adjustments.pa;
    const newCupons = baseMetrics.cupons * (1 + adjustments.cupons / 100);
    const newVenda = newCupons * newTkm;

    return {
      venda: newVenda,
      diff: newVenda - baseMetrics.venda,
      percent: baseMetrics.venda > 0 ? ((newVenda / baseMetrics.venda) - 1) * 100 : 0
    };
  }, [baseMetrics, adjustments]);

  const formatCurrency = (val?: number | string | null) => 
    (Number(val) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-800 uppercase italic flex items-center gap-2">
            <Calculator className="w-6 h-6 text-indigo-600" />
            Simulador What-If
          </h2>
          <p className="text-xs text-slate-500 font-medium">Manipule as variáveis operacionais para projetar o impacto no faturamento.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Painel de Controles */}
        <Card className="ri-card">
          <CardHeader>
            <CardTitle className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Ajustes Táticos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-10 pt-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold uppercase text-slate-600">Ticket Médio (TKM)</Label>
                <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {adjustments.tkm > 0 ? `+${adjustments.tkm}%` : `${adjustments.tkm}%`}
                </span>
              </div>
              <Slider 
                value={[adjustments.tkm]} 
                min={-20} 
                max={50} 
                step={1} 
                onValueChange={([v]) => setAdjustments(prev => ({ ...prev, tkm: v }))} 
              />
              <p className="text-[10px] text-slate-400 italic">Atual: {formatCurrency(baseMetrics.tkm)}</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold uppercase text-slate-600">Peças por Atendimento (P.A.)</Label>
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {adjustments.pa > 0 ? `+${adjustments.pa.toFixed(1)}` : adjustments.pa.toFixed(1)}
                </span>
              </div>
              <Slider 
                value={[adjustments.pa]} 
                min={-1} 
                max={2} 
                step={0.1} 
                onValueChange={([v]) => setAdjustments(prev => ({ ...prev, pa: v }))} 
              />
              <p className="text-[10px] text-slate-400 italic">Atual: {baseMetrics.pa.toFixed(2)}</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold uppercase text-slate-600">Fluxo de Clientes (Tickets)</Label>
                <span className="text-xs font-black text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
                  {adjustments.cupons > 0 ? `+${adjustments.cupons}%` : `${adjustments.cupons}%`}
                </span>
              </div>
              <Slider 
                value={[adjustments.cupons]} 
                min={-30} 
                max={100} 
                step={5} 
                onValueChange={([v]) => setAdjustments(prev => ({ ...prev, cupons: v }))} 
              />
              <p className="text-[10px] text-slate-400 italic">Atual: {baseMetrics.cupons} atendimentos</p>
            </div>
          </CardContent>
        </Card>

        {/* Resultado da Projeção */}
        <div className="space-y-6">
          <Card className="ri-card bg-indigo-600 text-white border-none shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <Calculator className="w-24 h-24" />
            </div>
            <CardContent className="p-8 space-y-4 relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">Novo Faturamento Projetado</p>
              <h3 className="text-4xl md:text-5xl font-black tracking-tighter tabular-nums drop-shadow-sm">
                {formatCurrency(projection.venda)}
              </h3>
              <div className="flex items-center gap-3 pt-2">
                <div className={cn(
                  "px-3 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1",
                  projection.diff >= 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                )}>
                  {projection.diff >= 0 ? "+" : ""}{projection.percent.toFixed(1)}%
                </div>
                <p className="text-xs font-medium text-indigo-100">
                  Impacto de {formatCurrency(projection.diff)}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Impacto Individual</p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Pelo TKM</span>
                <span className="text-xs font-black text-indigo-600">{formatCurrency(baseMetrics.venda * (adjustments.tkm / 100))}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Pelo Fluxo</span>
                <span className="text-xs font-black text-sky-600">{formatCurrency(baseMetrics.venda * (adjustments.cupons / 100))}</span>
              </div>
            </div>
            
            <Card className="bg-amber-50 border-amber-100 flex items-center justify-center p-4">
               <div className="text-center space-y-1">
                  <Info className="w-4 h-4 text-amber-500 mx-auto" />
                  <p className="text-[10px] font-bold text-amber-700 uppercase">Input Estratégico</p>
                  <p className="text-[9px] text-amber-600/80 leading-tight">Use estes números para alinhar objetivos no matinal com o time.</p>
               </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
