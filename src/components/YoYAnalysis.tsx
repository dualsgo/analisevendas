"use client";

import React, { useMemo, useState, useEffect } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  ArrowUpRight, 
  TrendingUp, 
  Users, 
  Target, 
  Calculator,
  AlertCircle,
  Sparkles,
  Loader2,
  BrainCircuit,
  Settings2,
  History,
  ArrowRight,
  Zap,
  ShoppingBag,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { aiYoYConsiderations } from "@/ai/flows/ai-yoy-considerations-flow";

interface YoYAnalysisProps {
  data: DetailedSaleRow[];
}

interface PeriodInput {
  year: string;
  venda: string;
  cupons: string;
  pa: string;
  tkm: string;
}

export function YoYAnalysis({ data }: YoYAnalysisProps) {
  const [tyInput, setTyInput] = useState<PeriodInput>({
    year: new Date().getFullYear().toString(),
    venda: "",
    cupons: "",
    pa: "",
    tkm: ""
  });

  const [lyInput, setLyInput] = useState<PeriodInput>({
    year: (new Date().getFullYear() - 1).toString(),
    venda: "",
    cupons: "",
    pa: "",
    tkm: ""
  });

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    const years = Array.from(new Set(activeSales.map(s => {
      const d = new Date(s.dhEmi);
      return isNaN(d.getTime()) ? null : d.getFullYear();
    }))).filter(Boolean).sort((a, b) => b! - a!) as number[];
    
    if (years.length > 0) {
      const currentYear = years[0];
      const tyRows = activeSales.filter(s => new Date(s.dhEmi).getFullYear() === currentYear);
      const vTY = tyRows.reduce((acc, s) => acc + parseFloat(s.vNF), 0);
      const cTY = tyRows.length;
      const iTY = tyRows.reduce((acc, s) => acc + parseFloat(s.itens_qtd), 0);

      setTyInput({
        year: currentYear.toString(),
        venda: vTY.toFixed(2),
        cupons: cTY.toString(),
        pa: (cTY > 0 ? iTY / cTY : 0).toFixed(2),
        tkm: (cTY > 0 ? vTY / cTY : 0).toFixed(2)
      });

      if (years.length >= 2) {
        const prevYear = years[1];
        const lyRows = activeSales.filter(s => new Date(s.dhEmi).getFullYear() === prevYear);
        const vLY = lyRows.reduce((acc, s) => acc + parseFloat(s.vNF), 0);
        const cLY = lyRows.length;
        const iLY = lyRows.reduce((acc, s) => acc + parseFloat(s.itens_qtd), 0);

        setLyInput({
          year: prevYear.toString(),
          venda: vLY.toFixed(2),
          cupons: cLY.toString(),
          pa: (cLY > 0 ? iLY / cLY : 0).toFixed(2),
          tkm: (cLY > 0 ? vLY / cLY : 0).toFixed(2)
        });
      } else {
        setLyInput(prev => ({ ...prev, year: (currentYear - 1).toString() }));
      }
    }
  }, [data]);

  const stats = useMemo(() => {
    const ty = {
      venda: parseFloat(tyInput.venda) || 0,
      cupons: parseInt(tyInput.cupons) || 0,
      pa: parseFloat(tyInput.pa) || 0,
      tkm: parseFloat(tyInput.tkm) || 0,
      year: tyInput.year
    };

    const ly = {
      venda: parseFloat(lyInput.venda) || 0,
      cupons: parseInt(lyInput.cupons) || 0,
      pa: parseFloat(lyInput.pa) || 0,
      tkm: parseFloat(lyInput.tkm) || 0,
      year: lyInput.year
    };

    const isReady = ty.venda > 0 && ly.venda > 0;
    if (!isReady) return { isReady: false };

    // --- DECOMPOSIÇÃO E IMPACTO ---
    const vendaSimuladaTKM = ty.cupons * ly.tkm;
    const impactoTKM = ty.venda - vendaSimuladaTKM;

    const vendaSimuladaFluxo = ly.cupons * ty.tkm;
    const impactoFluxo = ty.venda - vendaSimuladaFluxo;

    const pmTY = ty.pa > 0 ? ty.tkm / ty.pa : 0;
    const vendaSimuladaPA = ty.cupons * ly.pa * pmTY;
    const impactoPA = (ty.cupons * ty.pa * pmTY) - vendaSimuladaPA;

    const totalImpactoAbs = Math.abs(impactoFluxo) + Math.abs(impactoTKM) || 1;

    return {
      isReady: true,
      ty,
      ly,
      diff: {
        venda: ty.venda - ly.venda,
        percVenda: (ty.venda / ly.venda - 1) * 100,
        percFluxo: (ty.cupons / ly.cupons - 1) * 100,
        percPA: (ty.pa / ly.pa - 1) * 100,
        percTKM: (ty.tkm / ly.tkm - 1) * 100,
      },
      impacto: { pa: impactoPA, fluxo: impactoFluxo, tkm: impactoTKM },
      contrib: {
        fluxo: (impactoFluxo / totalImpactoAbs) * 100,
        tkm: (impactoTKM / totalImpactoAbs) * 100
      }
    };
  }, [tyInput, lyInput]);

  const handleGenerateAI = async () => {
    if (!stats.isReady) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const context = `Comparação entre ${stats.ly.year} e ${stats.ty.year}. Variação Venda: ${stats.diff.percVenda.toFixed(1)}%. Impacto Fluxo: R$ ${stats.impacto.fluxo.toFixed(2)}, Impacto TKM: R$ ${stats.impacto.tkm.toFixed(2)}, Impacto Eficiência (PA): R$ ${stats.impacto.pa.toFixed(2)}.`;
      const result = await aiYoYConsiderations({
        metrics: {
          vendaVarPerc: stats.diff.percVenda,
          fluxoVarPerc: stats.diff.percFluxo,
          paVarPerc: stats.diff.percPA,
          tkmVarPerc: stats.diff.percTKM,
          impactoPA: stats.impacto.pa,
          impactoFluxo: stats.impacto.fluxo,
          impactoTKM: stats.impacto.tkm,
        },
        context
      });
      setAiResult(result);
    } catch (e) {
      console.error(e);
      setAiError("Não foi possível gerar considerações automáticas agora. Os cálculos matemáticos acima continuam válidos.");
    } finally {
      setAiLoading(false);
    }
  };

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-6xl mx-auto">
      
      <div className="bg-white rounded-[2rem] p-6 border-2 border-indigo-100 shadow-sm space-y-3">
        <div className="flex items-center gap-3 text-indigo-600">
          <History className="w-6 h-6" />
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight">Análise de Resultado YoY</h1>
        </div>
        <p className="text-sm text-slate-500 font-medium leading-relaxed">
          Compare o desempenho histórico da sua unidade. A **Engenharia de Resultado** isola o quanto você ganhou ou perdeu por conta da eficiência de venda (**TKM/PA**) ou do volume de clientes (**Fluxo**).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PeriodFormCard 
          title="Dados do Ano Atual" 
          subtitle="Preenchimento via XML ou Manual"
          input={tyInput} 
          setInput={setTyInput} 
          color="border-orange-200 bg-orange-50/20"
          accent="orange"
        />
        <PeriodFormCard 
          title="Dados do Ano Anterior" 
          subtitle="Dados históricos para comparação"
          input={lyInput} 
          setInput={setLyInput} 
          color="border-indigo-200 bg-indigo-50/20"
          accent="indigo"
        />
      </div>

      {stats.isReady ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <YoYCard label="Faturamento" ty={stats.ty.venda} ly={stats.ly.venda} isCurrency icon={TrendingUp} color="text-emerald-600" />
            <YoYCard label="Fluxo (Cupons)" ty={stats.ty.cupons} ly={stats.ly.cupons} icon={Users} color="text-sky-600" />
            <YoYCard label="Qualidade (PA)" ty={stats.ty.pa} ly={stats.ly.pa} icon={Target} color="text-orange-600" precision={2} />
            <YoYCard label="Ticket Médio" ty={stats.ty.tkm} ly={stats.ly.tkm} isCurrency icon={ShoppingBag} color="text-purple-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="ri-card border-none bg-white overflow-hidden shadow-xl lg:col-span-8">
              <CardHeader className="bg-slate-900 text-white p-6">
                <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-3">
                  <Calculator className="w-5 h-5 text-indigo-400" /> Matriz de Impacto Financeiro (R$)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <ImpactBox label="Impacto do Fluxo" value={stats.impacto.fluxo} desc="Contribuição do volume de tráfego." isPositive={stats.impacto.fluxo > 0} />
                  <ImpactBox label="Impacto do Ticket (TKM)" value={stats.impacto.tkm} desc="Venda gerada/perdida pelo valor do ticket." isPositive={stats.impacto.tkm > 0} />
                  <ImpactBox label="Peso do PA" value={stats.impacto.pa} desc="Parcela do impacto vinda da eficiência de itens." isPositive={stats.impacto.pa > 0} />
                </div>

                <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed border-slate-200 space-y-6">
                   <ProgressBar label="Contribuição por Fluxo" perc={stats.contrib.fluxo} color="bg-sky-500" />
                   <ProgressBar label="Contribuição por Técnica (TKM)" perc={stats.contrib.tkm} color="bg-purple-500" />
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-4 space-y-4">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Análise Executiva</h3>
              
              <YoYAlert 
                title="Status de Qualidade"
                desc={stats.diff.percTKM < 0 ? "A saúde do ticket caiu. Clientes estão gastando menos por visita que o ano anterior." : "Excelente! A equipe está conseguindo extrair mais valor de cada atendimento."}
                type={stats.diff.percTKM < 0 ? "danger" : "success"}
              />

              {aiError && (
                <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-800 rounded-2xl">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="font-black uppercase text-[10px]">IA Indisponível</AlertTitle>
                  <AlertDescription className="text-[10px] font-medium leading-tight">
                    {aiError}
                  </AlertDescription>
                </Alert>
              )}

              {!aiResult ? (
                <Button 
                  onClick={handleGenerateAI}
                  disabled={aiLoading}
                  className="w-full h-24 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl flex-col gap-2 shadow-xl shadow-indigo-200 group"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="text-[10px] font-black uppercase">Calculando Estratégia...</span>
                    </>
                  ) : (
                    <>
                      <BrainCircuit className="w-6 h-6 animate-pulse" />
                      <span className="text-xs font-black uppercase">Gerar Considerações IA</span>
                    </>
                  )}
                </Button>
              ) : (
                <Card className="ri-card border-none bg-indigo-50 p-6 space-y-4 animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <Sparkles className="w-5 h-5" />
                    <h4 className="text-[10px] font-black uppercase">Visão do Solzinho</h4>
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
        </>
      ) : (
        <div className="h-[40vh] flex flex-col items-center justify-center space-y-4 border-2 border-dashed border-slate-200 rounded-[2rem] bg-white text-center px-6">
          <History className="w-12 h-12 text-slate-200" />
          <p className="text-sm font-black text-slate-400 uppercase tracking-tighter">Preencha os indicadores de ambos os anos acima</p>
        </div>
      )}
    </div>
  );
}

function PeriodFormCard({ title, subtitle, input, setInput, color, accent }: any) {
  const handleChange = (field: keyof PeriodInput, value: string) => {
    setInput((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <Card className={cn("ri-card border-2 overflow-hidden shadow-sm", color)}>
      <CardHeader className="bg-white border-b p-5">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-xl text-white", accent === 'orange' ? "bg-orange-500" : "bg-indigo-500")}>
            <Settings2 className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-xs font-black uppercase text-slate-700 tracking-tight">{title}</CardTitle>
            <p className="text-[9px] font-bold text-slate-400 uppercase">{subtitle}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[9px] font-black uppercase text-slate-400">Ano</Label>
          <Input value={input.year} onChange={e => handleChange('year', e.target.value)} className="h-9 rounded-xl border-slate-200 font-bold text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[9px] font-black uppercase text-slate-400">Venda Total (R$)</Label>
          <Input type="number" value={input.venda} onChange={e => handleChange('venda', e.target.value)} className="h-9 rounded-xl border-slate-200 font-bold text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[9px] font-black uppercase text-slate-400">Fluxo (Cupons)</Label>
          <Input type="number" value={input.cupons} onChange={e => handleChange('cupons', e.target.value)} className="h-9 rounded-xl border-slate-200 font-bold text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[9px] font-black uppercase text-slate-400">PA (Peças/Atend)</Label>
          <Input type="number" step="0.01" value={input.pa} onChange={e => handleChange('pa', e.target.value)} className="h-9 rounded-xl border-slate-200 font-bold text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[9px] font-black uppercase text-slate-400">Ticket Médio (R$)</Label>
          <Input type="number" step="0.01" value={input.tkm} onChange={e => handleChange('tkm', e.target.value)} className="h-9 rounded-xl border-slate-200 font-bold text-xs" />
        </div>
      </CardContent>
    </Card>
  );
}

function YoYCard({ label, ty, ly, isCurrency = false, icon: Icon, color, precision = 0 }: any) {
  const perc = ly > 0 ? (ty / ly - 1) * 100 : 0;
  const isPositive = ty > ly;
  const formatValue = (v: number) => isCurrency ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : v.toFixed(precision);

  return (
    <Card className="ri-card border-none bg-white p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={cn("p-2 rounded-xl bg-slate-50", color)}><Icon className="w-5 h-5" /></div>
        <Badge className={cn("font-black text-[10px] border-none px-2 h-5", isPositive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
          {perc > 0 ? "+" : ""}{perc.toFixed(1)}%
        </Badge>
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-xl font-black text-slate-800 tracking-tighter">{formatValue(ty)}</p>
          <p className="text-[9px] font-bold text-slate-300 line-through">LY: {formatValue(ly)}</p>
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
