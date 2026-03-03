
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  TrendingUp, 
  Users, 
  Target, 
  Calculator,
  AlertCircle,
  Settings2,
  History,
  ShoppingBag,
  Zap,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

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
      ty, ly,
      diff: {
        venda: ty.venda - ly.venda,
        percVenda: (ty.venda / ly.venda - 1) * 100,
        percFluxo: (ty.cupons / ly.cupons - 1) * 100,
        percTKM: (ty.tkm / ly.tkm - 1) * 100,
      },
      impacto: { pa: impactoPA, fluxo: impactoFluxo, tkm: impactoTKM },
      contrib: {
        fluxo: (impactoFluxo / totalImpactoAbs) * 100,
        tkm: (impactoTKM / totalImpactoAbs) * 100
      }
    };
  }, [tyInput, lyInput]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PeriodFormCard title="Ano Atual (TY)" input={tyInput} setInput={setTyInput} accent="orange" />
        <PeriodFormCard title="Ano Anterior (LY)" input={lyInput} setInput={setLyInput} accent="indigo" />
      </div>

      {stats.isReady && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <YoYCard label="Faturamento" ty={stats.ty.venda} ly={stats.ly.venda} isCurrency icon={TrendingUp} color="text-emerald-600" />
            <YoYCard label="Fluxo (Cupons)" ty={stats.ty.cupons} ly={stats.ly.cupons} icon={Users} color="text-sky-600" />
            <YoYCard label="Qualidade (PA)" ty={stats.ty.pa} ly={stats.ly.pa} icon={Target} color="text-orange-600" precision={2} />
            <YoYCard label="Ticket Médio" ty={stats.ty.tkm} ly={stats.ly.tkm} isCurrency icon={ShoppingBag} color="text-purple-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="ri-card overflow-hidden lg:col-span-8">
              <CardHeader className="bg-slate-900 text-white p-6">
                <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-3">
                  <Calculator className="w-5 h-5 text-indigo-400" /> Engenharia de Resultado (Impacto R$)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <ImpactBox label="Contribuição Fluxo" value={stats.impacto.fluxo} isPositive={stats.impacto.fluxo > 0} />
                  <ImpactBox label="Contribuição Técnica" value={stats.impacto.tkm} isPositive={stats.impacto.tkm > 0} />
                  <ImpactBox label="Peso do PA" value={stats.impacto.pa} isPositive={stats.impacto.pa > 0} />
                </div>

                <div className="p-6 bg-slate-900 rounded-[2rem] text-white space-y-4">
                   <div className="flex items-center gap-3 text-indigo-400">
                      <Zap className="w-5 h-5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Diagnóstico de Gestão</span>
                   </div>
                   <p className="text-sm font-medium leading-relaxed opacity-90 italic">
                     {stats.impacto.tkm > stats.impacto.fluxo 
                       ? "Crescimento Saudável (Ativo): O resultado da loja foi 'carregado' pela técnica da equipe. Mesmo com oscilação de fluxo, o aumento de TKM/PA compensou e gerou lucro real." 
                       : "Crescimento Perigoso (Passivo): A loja cresceu apenas porque entrou mais gente (Fluxo). A técnica de venda (TKM) está perdendo força. Se o tráfego externo cair amanhã, sua meta estará em risco total."}
                   </p>
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-4 space-y-4">
              <Card className="ri-card p-6 space-y-4">
                 <div className="flex items-center gap-2 text-orange-600">
                    <Info className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Gargalo Estratégico</span>
                 </div>
                 <p className="text-xs font-medium text-slate-700 leading-relaxed italic">
                   {stats.diff.percTKM < 0 
                     ? "Gargalo de Valor: Seu faturamento está sendo canibalizado por tickets baixos. Motivos prováveis: excesso de descontos agressivos ou falta de treinamento em itens de alto valor (Upsell)." 
                     : "Técnica de Valor em dia. O time está conseguindo extrair mais valor de cada cliente que entra na loja."}
                 </p>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PeriodFormCard({ title, input, setInput, accent }: any) {
  const handleChange = (field: keyof PeriodInput, value: string) => {
    setInput((prev: any) => ({ ...prev, [field]: value }));
  };
  return (
    <Card className="ri-card border-slate-100 overflow-hidden shadow-sm">
      <CardHeader className="bg-slate-50 border-b p-4">
        <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-[8px] font-black uppercase text-slate-400">Venda Total</Label>
          <Input type="number" value={input.venda} onChange={e => handleChange('venda', e.target.value)} className="h-8 text-xs font-bold" />
        </div>
        <div className="space-y-1">
          <Label className="text-[8px] font-black uppercase text-slate-400">Cupons</Label>
          <Input type="number" value={input.cupons} onChange={e => handleChange('cupons', e.target.value)} className="h-8 text-xs font-bold" />
        </div>
        <div className="space-y-1">
          <Label className="text-[8px] font-black uppercase text-slate-400">PA</Label>
          <Input type="number" step="0.01" value={input.pa} onChange={e => handleChange('pa', e.target.value)} className="h-8 text-xs font-bold" />
        </div>
        <div className="space-y-1">
          <Label className="text-[8px] font-black uppercase text-slate-400">TKM</Label>
          <Input type="number" step="0.01" value={input.tkm} onChange={e => handleChange('tkm', e.target.value)} className="h-8 text-xs font-bold" />
        </div>
      </CardContent>
    </Card>
  );
}

function YoYCard({ label, ty, ly, isCurrency = false, icon: Icon, color, precision = 0 }: any) {
  const perc = ly > 0 ? (ty / ly - 1) * 100 : 0;
  const isPositive = ty > ly;
  return (
    <Card className="ri-card p-4 shadow-sm text-center items-center flex flex-col justify-center gap-3">
      <div className={cn("p-2 rounded-xl bg-slate-50", color)}><Icon className="w-5 h-5" /></div>
      <div>
        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{label}</p>
        <p className="text-lg font-black text-slate-800">{isCurrency ? ty.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ty.toFixed(precision)}</p>
        <Badge className={cn("mt-1 text-[8px] font-black border-none h-4", isPositive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
          {perc > 0 ? "+" : ""}{perc.toFixed(1)}%
        </Badge>
      </div>
    </Card>
  );
}

function ImpactBox({ label, value, isPositive }: any) {
  return (
    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-1">
      <p className="text-[8px] font-black text-slate-500 uppercase">{label}</p>
      <p className={cn("text-sm font-black", isPositive ? "text-emerald-600" : "text-rose-600")}>
        {isPositive ? "+" : ""}{value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </p>
    </div>
  );
}
