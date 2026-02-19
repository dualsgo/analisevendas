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
  Target, 
  Calculator,
  AlertCircle,
  HelpCircle,
  Zap,
  LineChart,
  BarChart3,
  Scale,
  Sparkles,
  Loader2,
  BrainCircuit,
  MessageSquare
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend
} from "recharts";
import { cn } from "@/lib/utils";
import { aiYoYConsiderations } from "@/ai/flows/ai-yoy-considerations-flow";

interface YoYAnalysisProps {
  data: DetailedSaleRow[];
}

export function YoYAnalysis({ data }: YoYAnalysisProps) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  const stats = useMemo(() => {
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    if (activeSales.length === 0) return null;

    // Identificar os anos presentes
    const years = Array.from(new Set(activeSales.map(s => new Date(s.dhEmi).getFullYear()))).sort((a, b) => b - a);
    
    if (years.length < 2) return { needsMoreData: true, yearsFound: years };

    const currentYear = years[0];
    const previousYear = years[1];

    const tyData = activeSales.filter(s => new Date(s.dhEmi).getFullYear() === currentYear);
    const lyData = activeSales.filter(s => new Date(s.dhEmi).getFullYear() === previousYear);

    const calc = (rows: DetailedSaleRow[]) => {
      const venda = rows.reduce((acc, s) => acc + parseFloat(s.vNF), 0);
      const cupons = rows.length;
      const itens = rows.reduce((acc, s) => acc + parseFloat(s.itens_qtd), 0);
      return {
        venda,
        cupons,
        itens,
        pa: cupons > 0 ? itens / cupons : 0,
        pm: itens > 0 ? venda / itens : 0,
        tkm: cupons > 0 ? venda / cupons : 0
      };
    };

    const ty = calc(tyData);
    const ly = calc(lyData);

    // --- DECOMPOSIÇÃO E IMPACTO ---
    const vendaSimuladaPA = ty.cupons * ly.pa * ty.pm;
    const impactoPA = ty.venda - vendaSimuladaPA;

    const vendaSimuladaFluxo = ly.cupons * ty.pa * ty.pm;
    const impactoFluxo = ty.venda - vendaSimuladaFluxo;

    const vendaSimuladaPM = ty.cupons * ty.pa * ly.pm;
    const impactoPM = ty.venda - vendaSimuladaPM;

    const diffVenda = ty.venda - ly.venda;
    const totalImpactoAbs = Math.abs(impactoFluxo) + Math.abs(impactoPA) + Math.abs(impactoPM);

    return {
      ty: { ...ty, year: currentYear },
      ly: { ...ly, year: previousYear },
      diff: {
        venda: diffVenda,
        percVenda: (ty.venda / ly.venda - 1) * 100,
        percFluxo: (ty.cupons / ly.cupons - 1) * 100,
        percPA: (ty.pa / ly.pa - 1) * 100,
        percPM: (ty.pm / ly.pm - 1) * 100,
      },
      impacto: { pa: impactoPA, fluxo: impactoFluxo, pm: impactoPM },
      contrib: {
        fluxo: (impactoFluxo / (diffVenda || 1)) * 100,
        pa: (impactoPA / (diffVenda || 1)) * 100,
        pm: (impactoPM / (diffVenda || 1)) * 100
      }
    };
  }, [data]);

  const handleGenerateAI = async () => {
    if (!stats || stats.needsMoreData) return;
    setAiLoading(true);
    try {
      const context = `A venda variou ${stats.diff.percVenda.toFixed(1)}%. O impacto do PA foi de R$ ${stats.impacto.pa.toFixed(2)}, do Fluxo R$ ${stats.impacto.fluxo.toFixed(2)} e do Preço Médio R$ ${stats.impacto.pm.toFixed(2)}.`;
      const result = await aiYoYConsiderations({
        metrics: {
          vendaVarPerc: stats.diff.percVenda,
          fluxoVarPerc: stats.diff.percFluxo,
          paVarPerc: stats.diff.percPA,
          pmVarPerc: stats.diff.percPM,
          impactoPA: stats.impacto.pa,
          impactoFluxo: stats.impacto.fluxo,
          impactoPM: stats.impacto.pm,
        },
        context
      });
      setAiResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (!stats) return null;

  if (stats.needsMoreData) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-6 text-center max-w-md mx-auto animate-in fade-in duration-500">
        <div className="bg-orange-100 p-6 rounded-full">
          <AlertCircle className="w-12 h-12 text-orange-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-800 uppercase">Período Comparativo Ausente</h2>
          <p className="text-sm text-slate-500 font-medium">
            Para realizar a análise YoY, você precisa carregar arquivos XML de pelo menos dois anos diferentes (ex: 2024 e 2025).
          </p>
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase">Identificamos apenas o ano: {stats.yearsFound?.join(', ')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-6xl mx-auto">
      
      {/* Header Didático */}
      <div className="bg-white rounded-[2rem] p-6 md:p-8 border-2 border-slate-50 shadow-sm space-y-4">
        <div className="flex items-center gap-3 text-indigo-600">
          <LineChart className="w-6 h-6" />
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight">Crescimento Real: {stats.ty.year} vs {stats.ly.year}</h1>
        </div>
        <p className="text-sm text-slate-500 font-medium leading-relaxed">
          Análise baseada nos dados reais dos XMLs carregados. Isolamos o impacto do <strong>Comportamento (PA)</strong>, do <strong>Mercado (Preço)</strong> e do <strong>Tráfego (Fluxo)</strong>.
        </p>
      </div>

      {/* 1. Visão Comparativa Consolidada */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <YoYCard label="Faturamento" ty={stats.ty.venda} ly={stats.ly.venda} isCurrency icon={TrendingUp} color="text-emerald-600" />
        <YoYCard label="Fluxo (Cupons)" ty={stats.ty.cupons} ly={stats.ly.cupons} icon={Users} color="text-sky-600" />
        <YoYCard label="Qualidade (PA)" ty={stats.ty.pa} ly={stats.ly.pa} icon={Target} color="text-orange-600" precision={2} />
      </div>

      {/* 2. Decomposição Matemática */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="ri-card border-none bg-white overflow-hidden shadow-xl lg:col-span-8">
          <CardHeader className="bg-slate-900 text-white p-6">
            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-3">
              <Calculator className="w-5 h-5 text-indigo-400" /> Matriz de Impacto Financeiro (R$)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ImpactBox label="Impacto do PA" value={stats.impacto.pa} desc="Venda gerada/perdida pela variação na eficiência de itens por cliente." isPositive={stats.impacto.pa > 0} />
              <ImpactBox label="Impacto do Fluxo" value={stats.impacto.fluxo} desc="Contribuição do volume de clientes que entraram na loja." isPositive={stats.impacto.fluxo > 0} />
              <ImpactBox label="Impacto do Preço" value={stats.impacto.pm} desc="Variação causada por mudança no ticket médio dos itens." isPositive={stats.impacto.pm > 0} />
            </div>

            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed border-slate-200 space-y-6">
               <ProgressBar label="Contribuição por Fluxo" perc={stats.contrib.fluxo} color="bg-sky-500" />
               <ProgressBar label="Contribuição por Atendimento (PA)" perc={stats.contrib.pa} color="bg-orange-500" />
               <ProgressBar label="Contribuição por Valor Item (PM)" perc={stats.contrib.pm} color="bg-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Diagnóstico Rápido</h3>
          
          <YoYAlert 
            title="Alerta de PA"
            desc={stats.diff.percPA < 0 ? "Atenção: A qualidade do atendimento caiu em relação ao ano anterior." : "Parabéns: A equipe está vendendo mais itens por cliente."}
            type={stats.diff.percPA < 0 ? "danger" : "success"}
          />

          {!aiResult && (
            <Button 
              onClick={handleGenerateAI}
              disabled={aiLoading}
              className="w-full h-24 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl flex-col gap-2 shadow-xl shadow-indigo-200"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-[10px] font-black uppercase">Solzinho está calculando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6 animate-pulse" />
                  <span className="text-xs font-black uppercase">Considerações da IA</span>
                </>
              )}
            </Button>
          )}

          {aiResult && (
            <Card className="ri-card border-none bg-indigo-50 p-6 space-y-4 animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 text-indigo-600">
                <BrainCircuit className="w-5 h-5" />
                <h4 className="text-[10px] font-black uppercase">Análise Estratégica</h4>
              </div>
              <div className="space-y-4">
                <p className="text-xs font-medium text-slate-700 leading-relaxed">{aiResult.analysis}</p>
                <div className="p-3 bg-white rounded-xl border border-indigo-100">
                  <p className="text-[9px] font-black text-indigo-600 uppercase mb-1">Ação Sugerida</p>
                  <p className="text-xs font-bold text-slate-800">{aiResult.suggestion}</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* 3. Gráficos Comparativos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="ri-card border-none shadow-md bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b p-6">
            <CardTitle className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Volume: {stats.ty.year} vs {stats.ly.year}
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
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '1rem', border: 'none' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold' }} />
                <Bar dataKey="LY" fill="#cbd5e1" radius={[4, 4, 0, 0]} name={`Ano ${stats.ly.year}`} />
                <Bar dataKey="TY" fill="#6366f1" radius={[4, 4, 0, 0]} name={`Ano ${stats.ty.year}`} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="ri-card border-none shadow-md bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b p-6">
            <CardTitle className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
              <LineChart className="w-4 h-4" /> Eficiência PA e Preço Item
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'PA', TY: stats.ty.pa, LY: stats.ly.pa },
                { name: 'PM (R$ / 10)', TY: stats.ty.pm / 10, LY: stats.ly.pm / 10 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                <YAxis axisLine={false} hide />
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold' }} />
                <Bar dataKey="LY" fill="#cbd5e1" radius={[4, 4, 0, 0]} name={`Ano ${stats.ly.year}`} />
                <Bar dataKey="TY" fill="#f59e0b" radius={[4, 4, 0, 0]} name={`Ano ${stats.ty.year}`} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

function YoYCard({ label, ty, ly, isCurrency = false, icon: Icon, color, precision = 0 }: any) {
  const perc = (ty / ly - 1) * 100;
  const isPositive = ty > ly;
  const formatValue = (v: number) => isCurrency ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : v.toFixed(precision);

  return (
    <Card className="ri-card border-none bg-white p-6 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={cn("p-2 rounded-xl bg-slate-50", color)}><Icon className="w-5 h-5" /></div>
        <Badge className={cn("font-black text-[10px] border-none px-3", isPositive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
          {perc.toFixed(1)}%
        </Badge>
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-black text-slate-800">{formatValue(ty)}</p>
          <p className="text-[10px] font-bold text-slate-300 line-through">LY: {formatValue(ly)}</p>
        </div>
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
  const displayPerc = Math.min(100, Math.max(5, Math.abs(perc)));
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

function YoYAlert({ title, desc, type }: { title: string, desc: string, type: 'danger' | 'success' }) {
  const styles = {
    danger: "bg-rose-50 border-rose-200 text-rose-800",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800"
  };
  const Icon = type === 'success' ? TrendingUp : AlertCircle;

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
