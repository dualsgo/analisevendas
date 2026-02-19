"use client";

import React, { useMemo, useState, useEffect } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  Users, 
  Target, 
  Calculator,
  AlertCircle,
  Zap,
  LineChart,
  BarChart3,
  Sparkles,
  Loader2,
  BrainCircuit,
  Settings2,
  History,
  DollarSign
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
  // Dados do Ano Atual (TY) - Extraídos do XML
  const tyDataFromXml = useMemo(() => {
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    if (activeSales.length === 0) return null;

    const years = Array.from(new Set(activeSales.map(s => new Date(s.dhEmi).getFullYear()))).sort((a, b) => b - a);
    const currentYear = years[0];
    const rows = activeSales.filter(s => new Date(s.dhEmi).getFullYear() === currentYear);

    const venda = rows.reduce((acc, s) => acc + parseFloat(s.vNF), 0);
    const cupons = rows.length;
    const itens = rows.reduce((acc, s) => acc + parseFloat(s.itens_qtd), 0);

    return {
      year: currentYear,
      venda,
      cupons,
      itens,
      pa: cupons > 0 ? itens / cupons : 0,
      pm: itens > 0 ? venda / itens : 0,
    };
  }, [data]);

  // Estado para Inputs do Ano Anterior (LY)
  const [lyInput, setLyInput] = useState({
    year: "",
    venda: "",
    cupons: "",
    pa: "",
    pm: ""
  });

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  // Tentar pré-preencher LY se houver dados de 2 anos no XML
  useEffect(() => {
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    const years = Array.from(new Set(activeSales.map(s => new Date(s.dhEmi).getFullYear()))).sort((a, b) => b - a);
    
    if (years.length >= 2) {
      const prevYear = years[1];
      const rows = activeSales.filter(s => new Date(s.dhEmi).getFullYear() === prevYear);
      const venda = rows.reduce((acc, s) => acc + parseFloat(s.vNF), 0);
      const cupons = rows.length;
      const itens = rows.reduce((acc, s) => acc + parseFloat(s.itens_qtd), 0);

      setLyInput({
        year: prevYear.toString(),
        venda: venda.toFixed(2),
        cupons: cupons.toString(),
        pa: (cupons > 0 ? itens / cupons : 0).toFixed(2),
        pm: (itens > 0 ? venda / itens : 0).toFixed(2)
      });
    } else if (tyDataFromXml) {
      setLyInput(prev => ({ ...prev, year: (tyDataFromXml.year - 1).toString() }));
    }
  }, [data, tyDataFromXml]);

  // Cálculos Consolidados
  const stats = useMemo(() => {
    if (!tyDataFromXml) return null;

    const ly = {
      venda: parseFloat(lyInput.venda) || 0,
      cupons: parseInt(lyInput.cupons) || 0,
      pa: parseFloat(lyInput.pa) || 0,
      pm: parseFloat(lyInput.pm) || 0,
      year: lyInput.year || (tyDataFromXml.year - 1).toString()
    };

    if (ly.venda <= 0) return { ty: tyDataFromXml, needsLy: true };

    const ty = tyDataFromXml;

    // --- DECOMPOSIÇÃO E IMPACTO ---
    // Impacto do PA: Quanto variou a venda se mantivéssemos fluxo e preço do ano atual, mas com PA do ano anterior
    const vendaSimuladaPA = ty.cupons * ly.pa * ty.pm;
    const impactoPA = ty.venda - vendaSimuladaPA;

    // Impacto do Fluxo: Venda se mantivéssemos PA e Preço do ano atual, mas com Fluxo do ano anterior
    const vendaSimuladaFluxo = ly.cupons * ty.pa * ty.pm;
    const impactoFluxo = ty.venda - vendaSimuladaFluxo;

    // Impacto do Preço Médio: Venda se mantivéssemos Fluxo e PA do ano atual, mas com Preço do ano anterior
    const vendaSimuladaPM = ty.cupons * ty.pa * ly.pm;
    const impactoPM = ty.venda - vendaSimuladaPM;

    const diffVenda = ty.venda - ly.venda;

    return {
      ty,
      ly,
      diff: {
        venda: diffVenda,
        percVenda: (ty.venda / ly.venda - 1) * 100,
        percFluxo: (ty.cupons / ly.cupons - 1) * 100,
        percPA: (ty.pa / ly.pa - 1) * 100,
        percPM: (ty.pm / ly.pm - 1) * 100,
      },
      impacto: { pa: impactoPA, fluxo: impactoFluxo, pm: impactoPM },
      contrib: {
        fluxo: (impactoFluxo / (Math.abs(impactoFluxo) + Math.abs(impactoPA) + Math.abs(impactoPM) || 1)) * 100,
        pa: (impactoPA / (Math.abs(impactoFluxo) + Math.abs(impactoPA) + Math.abs(impactoPM) || 1)) * 100,
        pm: (impactoPM / (Math.abs(impactoFluxo) + Math.abs(impactoPA) + Math.abs(impactoPM) || 1)) * 100
      },
      needsLy: false
    };
  }, [tyDataFromXml, lyInput]);

  const handleGenerateAI = async () => {
    if (!stats || stats.needsLy) return;
    setAiLoading(true);
    try {
      const context = `Comparação entre ${stats.ly.year} e ${stats.ty.year}. A venda variou ${stats.diff.percVenda.toFixed(1)}%. Impactos calculados: PA: R$ ${stats.impacto.pa.toFixed(2)}, Fluxo: R$ ${stats.impacto.fluxo.toFixed(2)}, Preço Médio: R$ ${stats.impacto.pm.toFixed(2)}.`;
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

  if (!tyDataFromXml) return (
    <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400">
      <AlertCircle className="w-12 h-12 mb-4" />
      <p className="font-black uppercase tracking-widest text-sm">Nenhum dado de venda encontrado nos XMLs.</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-6xl mx-auto">
      
      {/* Abastecimento de Dados LY */}
      <Card className="ri-card border-orange-200 bg-orange-50/20 overflow-hidden shadow-sm">
        <CardHeader className="bg-white border-b border-orange-100 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-xl text-orange-600"><Settings2 className="w-5 h-5" /></div>
              <div>
                <CardTitle className="text-sm font-black uppercase text-slate-700 tracking-tight">Abastecimento de Dados Históricos</CardTitle>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Insira os dados do ano anterior para comparação YoY</p>
              </div>
            </div>
            <Badge className="bg-white text-orange-600 border-orange-200 font-black">{stats?.ly?.year || "ANTERIOR"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase text-slate-400">Ano Base</Label>
              <Input 
                type="number" 
                value={lyInput.year} 
                onChange={e => setLyInput(p => ({ ...prev => ({ ...p, year: e.target.value }) }))}
                className="h-10 rounded-xl border-slate-200 font-bold"
                placeholder="Ex: 2024"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase text-slate-400">Venda Total (R$)</Label>
              <Input 
                type="number" 
                value={lyInput.venda} 
                onChange={e => setLyInput(p => ({ ...p, venda: e.target.value }))}
                className="h-10 rounded-xl border-slate-200 font-bold"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase text-slate-400">Fluxo (Cupons)</Label>
              <Input 
                type="number" 
                value={lyInput.cupons} 
                onChange={e => setLyInput(p => ({ ...p, cupons: e.target.value }))}
                className="h-10 rounded-xl border-slate-200 font-bold"
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase text-slate-400">PA (Peças/Atend)</Label>
              <Input 
                type="number" 
                step="0.01"
                value={lyInput.pa} 
                onChange={e => setLyInput(p => ({ ...p, pa: e.target.value }))}
                className="h-10 rounded-xl border-slate-200 font-bold"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase text-slate-400">Preço Médio (R$)</Label>
              <Input 
                type="number" 
                step="0.01"
                value={lyInput.pm} 
                onChange={e => setLyInput(p => ({ ...p, pm: e.target.value }))}
                className="h-10 rounded-xl border-slate-200 font-bold"
                placeholder="0.00"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {!stats?.needsLy ? (
        <>
          {/* Dashboard Comparativo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <YoYCard label="Faturamento" ty={stats.ty.venda} ly={stats.ly.venda} isCurrency icon={TrendingUp} color="text-emerald-600" />
            <YoYCard label="Fluxo (Cupons)" ty={stats.ty.cupons} ly={stats.ly.cupons} icon={Users} color="text-sky-600" />
            <YoYCard label="Qualidade (PA)" ty={stats.ty.pa} ly={stats.ly.pa} icon={Target} color="text-orange-600" precision={2} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Matriz de Impacto */}
            <Card className="ri-card border-none bg-white overflow-hidden shadow-xl lg:col-span-8">
              <CardHeader className="bg-slate-900 text-white p-6">
                <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-3">
                  <Calculator className="w-5 h-5 text-indigo-400" /> Matriz de Impacto Financeiro (R$)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <ImpactBox label="Impacto do PA" value={stats.impacto.pa} desc="Venda gerada/perdida pela eficiência de itens." isPositive={stats.impacto.pa > 0} />
                  <ImpactBox label="Impacto do Fluxo" value={stats.impacto.fluxo} desc="Contribuição do volume de clientes." isPositive={stats.impacto.fluxo > 0} />
                  <ImpactBox label="Impacto do Preço" value={stats.impacto.pm} desc="Variação causada pelo preço dos itens." isPositive={stats.impacto.pm > 0} />
                </div>

                <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed border-slate-200 space-y-6">
                   <ProgressBar label="Contribuição por Fluxo" perc={stats.contrib.fluxo} color="bg-sky-500" />
                   <ProgressBar label="Contribuição por Atendimento (PA)" perc={stats.contrib.pa} color="bg-orange-500" />
                   <ProgressBar label="Contribuição por Valor Item (PM)" perc={stats.contrib.pm} color="bg-emerald-500" />
                </div>
              </CardContent>
            </Card>

            {/* Diagnóstico e IA */}
            <div className="lg:col-span-4 space-y-4">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Análise Executiva</h3>
              
              <YoYAlert 
                title="Status de Qualidade"
                desc={stats.diff.percPA < 0 ? "A qualidade do atendimento caiu. O cliente está levando menos itens que o ano passado." : "A equipe está sendo mais eficiente no argumento de venda adicional."}
                type={stats.diff.percPA < 0 ? "danger" : "success"}
              />

              {!aiResult ? (
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
              ) : (
                <Card className="ri-card border-none bg-indigo-50 p-6 space-y-4 animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <BrainCircuit className="w-5 h-5" />
                    <h4 className="text-[10px] font-black uppercase">Diagnóstico do Solzinho</h4>
                  </div>
                  <div className="space-y-4">
                    <p className="text-xs font-medium text-slate-700 leading-relaxed">{aiResult.analysis}</p>
                    <div className="p-3 bg-white rounded-xl border border-indigo-100">
                      <p className="text-[9px] font-black text-indigo-600 uppercase mb-1">Sugestão Prática</p>
                      <p className="text-xs font-bold text-slate-800">{aiResult.suggestion}</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="h-[40vh] flex flex-col items-center justify-center space-y-4 border-2 border-dashed border-slate-200 rounded-[2rem] bg-white">
          <History className="w-12 h-12 text-slate-200" />
          <div className="text-center">
            <p className="text-sm font-black text-slate-400 uppercase tracking-tighter">Aguardando dados do ano anterior</p>
            <p className="text-[10px] font-bold text-slate-300 uppercase">Preencha o formulário acima para habilitar a engenharia de resultado</p>
          </div>
        </div>
      )}
    </div>
  );
}

function YoYCard({ label, ty, ly, isCurrency = false, icon: Icon, color, precision = 0 }: any) {
  const perc = ly > 0 ? (ty / ly - 1) * 100 : 0;
  const isPositive = ty > ly;
  const formatValue = (v: number) => isCurrency ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : v.toFixed(precision);

  return (
    <Card className="ri-card border-none bg-white p-6 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={cn("p-2 rounded-xl bg-slate-50", color)}><Icon className="w-5 h-5" /></div>
        <Badge className={cn("font-black text-[10px] border-none px-3", isPositive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
          {perc > 0 ? "+" : ""}{perc.toFixed(1)}%
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
