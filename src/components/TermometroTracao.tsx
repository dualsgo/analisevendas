"use client";
import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Target, Zap, AlertCircle, CheckCircle2 } from "lucide-react";
import { DetailedSaleRow } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TermometroTracao({ data }: { data: DetailedSaleRow[] }) {
  const [metaMensal, setMetaMensal] = useState(150000); // Meta padrão editável

  const stats = useMemo(() => {
    const saidas = data.filter(r => r.tpNF === 1 && !r.is_devolucao && !r.is_cancelada);
    if (saidas.length === 0) return null;

    // Agrupar por data para contar dias operados
    const dates = saidas.map(r => r.dhEmi.split('T')[0]);
    const diasComVenda = new Set(dates).size;
    const isSingleDay = diasComVenda <= 1;
    
    const totalVenda = saidas.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
    const vmd = totalVenda / (diasComVenda || 1); // Venda Média Diária
    
    // Projeção baseada na VMD para 30 dias
    const projeção = vmd * 30;
    const atingimento = (totalVenda / metaMensal) * 100;
    const projeçãoAtingimento = (projeção / metaMensal) * 100;
    
    return {
      totalVenda,
      vmd,
      projeção,
      atingimento,
      projeçãoAtingimento,
      status: projeção >= metaMensal ? "BATE" : "NÃO BATE",
      dias: diasComVenda,
      isSingleDay
    };
  }, [data, metaMensal]);

  if (!stats) return (
    <div className="p-8 text-center text-slate-500 italic border-2 border-dashed rounded-xl">
      Aguardando dados de vendas para calcular o ritmo...
    </div>
  );

  const formatCurrency = (val?: number | string | null) => 
    (Number(val) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bloco de Configuração da Meta */}
        <Card className="ri-card border-indigo-100 bg-indigo-50/30">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-indigo-700">
                <Target className="w-5 h-5" />
                <h3 className="font-bold text-sm uppercase">Definir Meta do Mês</h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta" className="text-xs font-bold text-indigo-600/60 uppercase">Valor Alvo (R$)</Label>
                <Input 
                  id="meta"
                  type="number" 
                  value={metaMensal} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMetaMensal(parseFloat(e.target.value))}
                  className="bg-white border-indigo-200 focus-visible:ring-indigo-500 font-bold"
                />
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                A projeção é calculada dividindo o total realizado pelo número de dias com movimento ({stats.dias} dias) e multiplicando por 30.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Termômetro Realizado */}
        <Card className="ri-card lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Status do Período
              </CardTitle>
              <span className="text-2xl font-black text-slate-800">{stats.atingimento.toFixed(1)}%</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase">
                <span className="text-slate-400">Realizado: {formatCurrency(stats.totalVenda)}</span>
                <span className="text-indigo-600">Meta: {formatCurrency(metaMensal)}</span>
              </div>
              <Progress value={Math.min(stats.atingimento, 100)} className="h-3 bg-slate-100" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Ritmo Atual (VMD)</p>
                <p className="text-lg font-black text-slate-700">{formatCurrency(stats.vmd)}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Dias Analisados</p>
                <p className="text-lg font-black text-slate-700">{stats.dias} dias</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card de Projeção Final */}
      <Card className={cn(
        "ri-card border-l-8 overflow-hidden",
        stats.isSingleDay ? "border-l-indigo-400 bg-indigo-50/10" : stats.status === "BATE" ? "border-l-emerald-500 bg-emerald-50/10" : "border-l-rose-500 bg-rose-50/10"
      )}>
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-2 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                {stats.isSingleDay ? (
                  <Zap className="w-6 h-6 text-indigo-500 animate-pulse" />
                ) : stats.status === "BATE" ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-rose-500" />
                )}
                <h2 className="text-xl font-black text-slate-800 uppercase italic">
                  {stats.isSingleDay ? "Ritmo de Venda Diária" : "Projeção de Fechamento"}
                </h2>
              </div>
              <p className="text-sm text-slate-500 font-medium">
                {stats.isSingleDay 
                  ? "Analisando dados de hoje para estimar potencial operacional:"
                  : `Se mantiver o ritmo de ${formatCurrency(stats.vmd)}/dia, a unidade fechará o mês com:`}
              </p>
            </div>

            <div className="flex flex-col items-center md:items-end">
              <p className={cn(
                "text-4xl md:text-5xl font-black tracking-tighter leading-none mb-2",
                stats.isSingleDay ? "text-indigo-600" : stats.status === "BATE" ? "text-emerald-600" : "text-rose-600"
              )}>
                {formatCurrency(stats.isSingleDay ? stats.vmd : stats.projeção)}
              </p>
              <div className={cn(
                "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest",
                stats.isSingleDay ? "bg-indigo-500 text-white" : stats.status === "BATE" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
              )}>
                {stats.isSingleDay ? "Ritmo Atual (VMD)" : `${stats.projeçãoAtingimento.toFixed(1)}% da Meta`}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
