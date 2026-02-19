"use client";

import React, { useState } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BrainCircuit, 
  Loader2, 
  Target, 
  CircleAlert,
  ShieldCheck,
  TrendingDown,
  ActivitySquare
} from "lucide-react";
import { aiBottleneckDiagnosis } from "@/ai/flows/ai-bottleneck-diagnosis-flow";
import { cn } from "@/lib/utils";

interface BottleneckDiagnosisProps {
  data: DetailedSaleRow[];
}

export function BottleneckDiagnosis({ data }: BottleneckDiagnosisProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const performDiagnosis = async () => {
    setLoading(true);
    try {
      const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
      const totalRev = activeSales.reduce((acc, s) => acc + parseFloat(s.vNF), 0);
      const totalItens = activeSales.reduce((acc, s) => acc + parseFloat(s.itens_qtd), 0);
      const pickups = activeSales.filter(s => s.canal === "RETIRADA_ONLINE").length;
      const additions = activeSales.filter(s => s.canal === "RETIRADA_ADICIONAL").length;
      const cancels = data.filter(s => s.is_cancelada).length;

      const metrics = {
        pa: activeSales.length > 0 ? totalItens / activeSales.length : 0,
        tkm: activeSales.length > 0 ? totalRev / activeSales.length : 0,
        convPickup: pickups > 0 ? (additions / pickups) * 100 : 0,
        percDesconto: activeSales.length > 0 ? (activeSales.filter(s => parseFloat(s.desconto_total) > 0).length / activeSales.length) * 100 : 0,
        percCancelamento: data.length > 0 ? (cancels / data.length) * 100 : 0,
        percIdentificacao: activeSales.length > 0 ? (activeSales.filter(s => s.cpf_cnpj_dest).length / activeSales.length) * 100 : 0,
        vendaTotal: totalRev
      };

      const trends: string[] = [];
      if (metrics.pa < 1.8) trends.push("O PA está abaixo da meta esperada de 2.0.");
      if (metrics.convPickup < 15) trends.push("A taxa de conversão das retiradas online está baixa.");
      if (metrics.percDesconto > 25) trends.push("O uso de descontos está muito acima da média operacional.");
      if (metrics.percCancelamento > 5) trends.push("Existe um pico anormal de notas canceladas.");

      const diagnosis = await aiBottleneckDiagnosis({ metrics, trends });
      setResult(diagnosis);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-4xl mx-auto">
      {/* Header Didático de Impacto */}
      <section className="bg-gradient-to-br from-rose-600 to-rose-500 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[100px] -mr-32 -mt-32" />
        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md border border-white/30">
            <ActivitySquare className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic">O que está travando sua loja?</h2>
            <p className="text-rose-100 font-medium max-w-xl mx-auto text-sm md:text-base leading-relaxed">
              Nosso motor de IA vai analisar todos os seus XMLs para encontrar o <strong>Principal Limitador</strong> do seu faturamento hoje.
            </p>
          </div>

          {!result && !loading && (
            <Button 
              onClick={performDiagnosis}
              className="bg-white text-rose-600 hover:bg-rose-50 font-black rounded-2xl h-16 px-12 text-lg shadow-xl gap-3 group transition-all"
            >
              <BrainCircuit className="w-6 h-6 animate-pulse" />
              IDENTIFICAR GARGALO AGORA
            </Button>
          )}
        </div>
      </section>

      {loading && (
        <div className="py-20 flex flex-col items-center gap-6 text-slate-400">
          <Loader2 className="w-16 h-16 animate-spin text-rose-500" />
          <p className="text-sm font-black uppercase tracking-widest animate-pulse">A IA está comparando PA, TKM e Fluxos...</p>
        </div>
      )}

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in slide-in-from-bottom-4 duration-700">
          <Card className="md:col-span-8 ri-card border-none shadow-xl bg-white overflow-hidden">
            <div className="bg-rose-50 p-6 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CircleAlert className="w-5 h-5 text-rose-600" />
                <h3 className="text-xs font-black uppercase text-rose-700 tracking-widest">Diagnóstico Estratégico</h3>
              </div>
              <Badge className="bg-rose-600 text-white font-black px-4 h-7 border-none">{result.classification}</Badge>
            </div>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A Causa Raiz</p>
                <p className="text-xl font-bold text-slate-700 leading-relaxed">{result.diagnosis}</p>
              </div>
              
              <div className="p-6 bg-slate-900 rounded-[2rem] text-white shadow-lg space-y-4">
                <div className="flex items-center gap-2 text-rose-400">
                  <ShieldCheck className="w-5 h-5" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Ação Prioritária (O que fazer agora?)</p>
                </div>
                <p className="text-base font-medium leading-relaxed opacity-90">{result.priorityAction}</p>
              </div>
            </CardContent>
          </Card>

          <div className="md:col-span-4 space-y-4">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Nível de Alerta</h3>
            <Card className={cn(
              "ri-card border-none p-8 text-center shadow-lg transition-all",
              result.riskLevel === 'CRITICO' ? "bg-rose-600 text-white" : 
              result.riskLevel === 'ALTO' ? "bg-orange-500 text-white" : "bg-emerald-500 text-white"
            )}>
              <p className="text-[10px] font-black uppercase opacity-80 mb-2">Gravidade do Gargalo</p>
              <p className="text-4xl font-black">{result.riskLevel}</p>
            </Card>
            
            <Card className="ri-card border-none bg-white p-6 shadow-sm space-y-4">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visão do Solzinho</p>
               <p className="text-[11px] text-slate-500 leading-relaxed italic">
                 "Ao analisar os dados, identifiquei que este fator está canibalizando o esforço da equipe nos outros indicadores. Resolvendo este ponto, o PA deve subir naturalmente."
               </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
