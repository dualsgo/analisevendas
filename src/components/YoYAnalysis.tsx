
"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  Target, 
  Calculator,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Zap,
  LineChart,
  BarChart3,
  Scale
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  Cell,
  ComposedChart,
  Line
} from "recharts";
import { cn } from "@/lib/utils";

interface YoYAnalysisProps {
  data: DetailedSaleRow[];
}

export function YoYAnalysis({ data }: YoYAnalysisProps) {
  // Simulação de Ano Anterior (LY) caso o usuário suba apenas dados atuais
  // Em uma versão futura, o usuário subiria 2 arquivos ZIP (2025 e 2026)
  const stats = useMemo(() => {
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    
    // Dados "Atuais" (TY - This Year)
    const tyVenda = activeSales.reduce((acc, s) => acc + parseFloat(s.vNF), 0);
    const tyCupons = activeSales.length;
    const tyItens = activeSales.reduce((acc, s) => acc + parseFloat(s.itens_qtd), 0);
    const tyPA = tyCupons > 0 ? tyItens / tyCupons : 0;
    const tyPM = tyItens > 0 ? tyVenda / tyItens : 0;
    const tyTKM = tyCupons > 0 ? tyVenda / tyCupons : 0;
    const tyMeta = tyVenda * 1.15; // Simulação: Meta 15% acima do realizado

    // Dados "Anteriores" (LY - Last Year) - Simulação didática baseada em variância
    // Em produção, isso viria de um filtro de data ou upload secundário
    const lyVenda = tyVenda * 0.88; 
    const lyCupons = tyCupons * 0.85;
    const lyItens = tyItens * 0.92;
    const lyPA = lyItens / lyCupons;
    const lyPM = lyVenda / lyItens;
    const lyTKM = lyVenda / lyCupons;
    const lyMeta = lyVenda * 1.10;

    // --- Cálculos de Variação ---
    const diffVenda = tyVenda - lyVenda;
    const percVenda = (tyVenda / lyVenda - 1) * 100;
    const diffMeta = (tyVenda / tyMeta - 1) * 100;

    // --- DECOMPOSIÇÃO E IMPACTO (O Coração da Análise) ---
    // Simulação 1: Impacto do PA (Se PA fosse igual ao LY)
    // Venda simulada = Cupons Atual * PA Anterior * PM Atual
    const vendaSimuladaPA = tyCupons * lyPA * tyPM;
    const impactoPA = tyVenda - vendaSimuladaPA;

    // Simulação 2: Impacto do Fluxo (Se Cupons fosse igual ao LY)
    // Venda simulada = Cupons Anterior * PA Atual * PM Atual
    const vendaSimuladaFluxo = lyCupons * tyPA * tyPM;
    const impactoFluxo = tyVenda - vendaSimuladaFluxo;

    // Simulação 3: Impacto do Preço Médio (Se PM fosse igual ao LY)
    const vendaSimuladaPM = tyCupons * tyPA * lyPM;
    const impactoPM = tyVenda - vendaSimuladaPM;

    // Matriz de Contribuição
    const totalGrowth = diffVenda;
    const contribFluxoPerc = (impactoFluxo / totalGrowth) * 100;
    const contribPAPerc = (impactoPA / totalGrowth) * 100;
    const contribPMPerc = (impactoPM / totalGrowth) * 100;

    return {
      ty: { venda: tyVenda, cupons: tyCupons, itens: tyItens, pa: tyPA, pm: tyPM, tkm: tyTKM, meta: tyMeta },
      ly: { venda: lyVenda, cupons: lyCupons, itens: lyItens, pa: lyPA, pm: lyPM, tkm: lyTKM, meta: lyMeta },
      diff: { venda: diffVenda, percVenda, diffMeta },
      impacto: { pa: impactoPA, fluxo: impactoFluxo, pm: impactoPM },
      contrib: { fluxo: contribFluxoPerc, pa: contribPAPerc, pm: contribPMPerc }
    };
  }, [data]);

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatCompact = (val: number) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val.toFixed(0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-6xl mx-auto">
      
      {/* Header Didático */}
      <div className="bg-white rounded-[2rem] p-6 md:p-8 border-2 border-slate-50 shadow-sm space-y-4">
        <div className="flex items-center gap-3 text-indigo-600">
          <LineChart className="w-6 h-6" />
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight">Análise Comparativa YoY (Year over Year)</h1>
        </div>
        <p className="text-sm text-slate-500 font-medium leading-relaxed">
          Esta página transforma a comparação histórica em leitura causal. Não apenas mostramos se você cresceu, mas explicamos <strong>por que</strong> o faturamento mudou, isolando o impacto do Fluxo de Clientes, do Preço dos Brinquedos e da Qualidade do Atendimento (PA).
        </p>
        <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 inline-flex items-center gap-2">
          <Zap className="w-4 h-4 text-indigo-600" />
          <p className="text-[10px] font-black text-indigo-700 uppercase">Motor de Simulação Ativo: Comparando dados atuais com projeção histórica</p>
        </div>
      </div>

      {/* 1. Visão Comparativa Consolidada */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <YoYCard 
          label="Faturamento Total" 
          ty={stats.ty.venda} 
          ly={stats.ly.venda} 
          isCurrency 
          icon={TrendingUp} 
          color="text-emerald-600"
          subLabel={`Cresc. vs Meta: ${stats.diff.diffMeta.toFixed(1)}%`}
        />
        <YoYCard 
          label="Fluxo (Cupons)" 
          ty={stats.ty.cupons} 
          ly={stats.ly.cupons} 
          icon={Users} 
          color="text-sky-600"
        />
        <YoYCard 
          label="Qualidade (PA)" 
          ty={stats.ty.pa} 
          ly={stats.ly.pa} 
          icon={Target} 
          color="text-orange-600"
          precision={2}
        />
      </div>

      {/* 2. Decomposição Matemática e Impacto */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Painel de Simulação Reversa */}
        <Card className="ri-card border-none bg-white overflow-hidden shadow-xl lg:col-span-8">
          <CardHeader className="bg-slate-900 text-white p-6">
            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-3">
              <Calculator className="w-5 h-5 text-indigo-400" /> Diagnóstico de Impacto: "E se os indicadores fossem iguais?"
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Simulamos o seu faturamento congelando um fator por vez para medir sua relevância:</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ImpactBox 
                label="Impacto do PA" 
                value={stats.impacto.pa} 
                desc="Se o seu PA fosse o do ano passado, sua venda mudaria este valor."
                isPositive={stats.impacto.pa > 0}
              />
              <ImpactBox 
                label="Impacto do Fluxo" 
                value={stats.impacto.fluxo} 
                desc="Quanto do seu crescimento veio exclusivamente de ter mais gente na loja."
                isPositive={stats.impacto.fluxo > 0}
              />
              <ImpactBox 
                label="Impacto do Preço" 
                value={stats.impacto.pm} 
                desc="Influência da inflação ou mudança no mix de preço médio dos itens."
                isPositive={stats.impacto.pm > 0}
              />
            </div>

            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed border-slate-200">
               <div className="flex items-center gap-3 mb-4">
                 <Scale className="w-5 h-5 text-indigo-600" />
                 <h4 className="text-xs font-black uppercase text-slate-700">Matriz de Contribuição ao Crescimento</h4>
               </div>
               <div className="space-y-6">
                  <ProgressBar label="Crescimento por Fluxo (Cupons)" perc={stats.contrib.fluxo} color="bg-sky-500" />
                  <ProgressBar label="Crescimento por Atendimento (PA)" perc={stats.contrib.pa} color="bg-orange-500" />
                  <ProgressBar label="Crescimento por Valor (Preço Médio)" perc={stats.contrib.pm} color="bg-emerald-500" />
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Alertas Inteligentes YoY */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Alertas Estratégicos</h3>
          
          <YoYAlert 
            title="Crescimento de Fluxo"
            desc={stats.contrib.fluxo > 60 ? "Seu resultado depende excessivamente de fluxo. Se o tráfego da loja cair, o faturamento despenca. Foque em PA!" : "Seu crescimento de fluxo está equilibrado."}
            type={stats.contrib.fluxo > 60 ? "warning" : "success"}
          />

          <YoYAlert 
            title="Qualidade do Atendimento"
            desc={stats.ty.pa < stats.ly.pa ? "Atenção: A equipe está atendendo pior que no ano passado. Cada cliente está levando menos itens." : "Parabéns! O PA evoluiu, indicando melhoria técnica da equipe."}
            type={stats.ty.pa < stats.ly.pa ? "danger" : "success"}
          />

          <Card className="ri-card border-none bg-indigo-600 p-6 text-white shadow-lg shadow-indigo-200">
            <p className="text-[10px] font-black uppercase opacity-80 mb-2">Conclusão Executiva</p>
            <p className="text-sm font-bold leading-relaxed">
              O seu crescimento de <strong>{stats.diff.percVenda.toFixed(1)}%</strong> foi impulsionado principalmente pelo 
              {Math.max(stats.contrib.fluxo, stats.contrib.pa, stats.contrib.pm) === stats.contrib.fluxo ? " Aumento de Fluxo" : 
               Math.max(stats.contrib.fluxo, stats.contrib.pa, stats.contrib.pm) === stats.contrib.pa ? " Ganho de PA" : " Aumento de Preço Médio"}.
            </p>
          </Card>
        </div>
      </div>

      {/* 3. Gráficos Comparativos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="ri-card border-none shadow-md bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b p-6">
            <CardTitle className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Evolução de Volume: TY vs LY
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Cupons', TY: stats.ty.cupons, LY: stats.ly.cupons },
                { name: 'Itens', TY: stats.ty.itens, LY: stats.ly.itens },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                <YAxis axisLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '1rem', border: 'none', shadow: 'none' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                <Bar dataKey="LY" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Ano Anterior" />
                <Bar dataKey="TY" fill="#6366f1" radius={[4, 4, 0, 0]} name="Ano Atual" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="ri-card border-none shadow-md bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b p-6">
            <CardTitle className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
              <LineChart className="w-4 h-4" /> Qualidade e Preço: TY vs LY
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'PA', TY: stats.ty.pa, LY: stats.ly.pa },
                { name: 'PM (R$)', TY: stats.ty.pm / 10, LY: stats.ly.pm / 10 }, // Ajuste escala para visualização
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                <YAxis axisLine={false} hide />
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold' }} />
                <Bar dataKey="LY" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Ano Anterior" />
                <Bar dataKey="TY" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Ano Atual" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

function YoYCard({ label, ty, ly, isCurrency = false, icon: Icon, color, precision = 0, subLabel }: any) {
  const diff = ty - ly;
  const perc = (ty / ly - 1) * 100;
  const isPositive = diff > 0;
  const format = (v: number) => isCurrency ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : v.toFixed(precision);

  return (
    <Card className="ri-card border-none bg-white p-6 space-y-4 shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className={cn("p-2 rounded-xl bg-slate-50", color)}>
          <Icon className="w-5 h-5" />
        </div>
        <Badge className={cn(
          "font-black text-[10px] border-none px-3",
          isPositive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
        )}>
          {isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
          {perc.toFixed(1)}%
        </Badge>
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-black text-slate-800">{format(ty)}</p>
          <p className="text-[10px] font-bold text-slate-300 line-through">LY: {format(ly)}</p>
        </div>
        {subLabel && <p className="text-[9px] font-black text-slate-400 mt-2 uppercase">{subLabel}</p>}
      </div>
    </Card>
  );
}

function ImpactBox({ label, value, desc, isPositive }: any) {
  return (
    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
      <p className="text-[10px] font-black text-slate-500 uppercase leading-none">{label}</p>
      <p className={cn("text-lg font-black", isPositive ? "text-emerald-600" : "text-rose-600")}>
        {isPositive ? "+" : ""}{value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </p>
      <p className="text-[9px] text-slate-400 leading-tight font-medium">{desc}</p>
    </div>
  );
}

function ProgressBar({ label, perc, color }: any) {
  // Ajuste visual para contribuições negativas (simplificado para UI)
  const displayPerc = Math.max(5, Math.abs(perc));
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-end">
        <span className="text-[10px] font-black text-slate-600 uppercase">{label}</span>
        <span className={cn("text-xs font-black", perc > 0 ? "text-emerald-600" : "text-rose-600")}>{perc.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-1000", color)} style={{ width: `${displayPerc}%` }} />
      </div>
    </div>
  );
}

function YoYAlert({ title, desc, type }: { title: string, desc: string, type: 'warning' | 'danger' | 'success' }) {
  const styles = {
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    danger: "bg-rose-50 border-rose-200 text-rose-800",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800"
  };
  const Icon = type === 'success' ? CheckCircle2 : type === 'danger' ? AlertCircle : HelpCircle;

  return (
    <div className={cn("p-4 rounded-2xl border-2 space-y-1 shadow-sm", styles[type])}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" />
        <h4 className="text-[10px] font-black uppercase tracking-tight">{title}</h4>
      </div>
      <p className="text-[11px] font-medium leading-relaxed opacity-90">{desc}</p>
    </div>
  );
}

import { CheckCircle2 } from "lucide-react";
