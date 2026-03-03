"use client";

import React, { useState } from "react";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, 
  BrainCircuit, 
  Loader2, 
  TrendingUp, 
  Target, 
  Award,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Smartphone,
  History,
  Percent,
  Search
} from "lucide-react";
import { aiTeamProductivity } from "@/ai/flows/ai-team-productivity-flow";
import { cn } from "@/lib/utils";

interface TeamProductivityAIProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
  activeTab: string;
}

const TAB_NAME_MAP: Record<string, string> = {
  geral: "Visão Macro",
  compliance: "Auditoria de PA (Itens 0,01)",
  conversao: "Conversão Pickup e Adicionais",
  yoy_analise: "Engenharia de Resultado YoY",
  auditoria: "Gestão de Margem e Descontos",
  trocas: "Qualidade de Trocas",
  elasticidade: "Eficiência de Desconto",
  deep_dive: "Pareto e Riscos de Concentração",
  qualidade_avancada: "Anatomia da Cesta",
  diagnostico_gargalo: "Gargalos Operacionais",
  produtividade: "Produtividade Operacional",
  oportunidades: "Mapeamento de Oportunidades Perdidas"
};

export function TeamProductivityAI({ data, vinculos, activeTab }: TeamProductivityAIProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const generateAnalysis = async () => {
    setLoading(true);
    try {
      const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
      
      // 1. Métricas Base
      const vendors: Record<string, any> = {};
      activeSales.forEach(s => {
        const v = s.vendedor || "VENDEDOR";
        if (!vendors[v]) vendors[v] = { name: v, venda: 0, cupons: 0, itens: 0, ident: 0, pickupAdd: 0, pickups: 0 };
        vendors[v].venda += parseFloat(s.vNF);
        vendors[v].cupons++;
        vendors[v].itens += parseFloat(s.itens_qtd);
        if (s.cpf_cnpj_dest) vendors[v].ident++;
        if (s.canal === "RETIRADA_ADICIONAL") vendors[v].pickupAdd++;
        if (s.canal === "RETIRADA_ONLINE") vendors[v].pickups++;
      });

      const vendorSummary = Object.values(vendors).map(v => ({
        name: v.name,
        venda: v.venda.toFixed(2),
        pa: (v.itens / v.cupons || 0).toFixed(2),
        tkm: (v.venda / v.cupons || 0).toFixed(2),
        taxaIdentificacao: ((v.ident / v.cupons || 0) * 100).toFixed(1),
        taxaConversaoOnline: v.pickups > 0 ? ((v.pickupAdd / v.pickups) * 100).toFixed(1) : "0.0"
      }));

      // 2. Dados Específicos do Painel Ativo
      let specificData: any = {};
      
      if (activeTab === 'compliance') {
        const suspicious = data.filter(s => s.status_auditoria?.includes("SUSPEITO") || s.itens.some(it => (it.vProd / it.qCom) <= 0.1));
        specificData = {
          totalSuspeitos: suspicious.length,
          vendedoresEnvolvidos: Array.from(new Set(suspicious.map(s => s.vendedor)))
        };
      } else if (activeTab === 'trocas') {
        specificData = {
          totalTrocas: vinculos.length,
          scoreMedio: vinculos.reduce((acc, v) => acc + v.score_qualidade, 0) / vinculos.length || 0,
          diagnosticos: vinculos.map(v => ({ vendedor: v.vendedor, diag: v.diagnostico }))
        };
      } else if (activeTab === 'conversao') {
        const online = data.filter(s => s.canal === "RETIRADA_ONLINE");
        specificData = {
          totalPickups: online.length,
          adicionaisConfirmados: data.filter(s => s.canal === "RETIRADA_ADICIONAL").length,
          taxaConversaoLoja: (data.filter(s => s.canal === "RETIRADA_ADICIONAL").length / online.length) * 100 || 0
        };
      }

      const storeMetrics = {
        pa: (activeSales.reduce((acc, s) => acc + parseFloat(s.itens_qtd), 0) / activeSales.length || 0).toFixed(2),
        tkm: (activeSales.reduce((acc, s) => acc + parseFloat(s.vNF), 0) / activeSales.length || 0).toFixed(2),
        cadastros: ((activeSales.filter(s => s.cpf_cnpj_dest).length / activeSales.length || 0) * 100).toFixed(1)
      };

      const analysis = await aiTeamProductivity({ 
        vendorSummary, 
        storeMetrics,
        pageContext: { id: activeTab, name: TAB_NAME_MAP[activeTab] || activeTab },
        specificData
      });
      setResult(analysis);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    if (activeTab === 'compliance') return <ShieldCheck className="w-6 h-6 text-white" />;
    if (activeTab === 'conversao') return <Smartphone className="w-6 h-6 text-white" />;
    if (activeTab === 'yoy_analise') return <History className="w-6 h-6 text-white" />;
    if (activeTab === 'auditoria') return <Percent className="w-6 h-6 text-white" />;
    return <Users className="w-6 h-6 text-white" />;
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if(v && !result) generateAnalysis(); }}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="bg-white/20 border-white/30 text-white hover:bg-white/40 font-black text-[10px] gap-2 rounded-full h-8 px-4"
        >
          <BrainCircuit className="w-3.5 h-3.5" />
          CONSULTORIA IA DO PAINEL
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-2xl bg-white border-l-4 border-orange-500 p-0 flex flex-col">
        <SheetHeader className="bg-orange-500 p-6 md:p-8 text-white space-y-2 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
              {getIcon()}
            </div>
            <div>
              <SheetTitle className="text-xl md:text-2xl font-black uppercase text-white leading-none">Consultoria Especialista</SheetTitle>
              <Badge className="bg-white/20 text-white border-none mt-2 text-[10px] font-black uppercase">{TAB_NAME_MAP[activeTab] || activeTab}</Badge>
            </div>
          </div>
          <SheetDescription className="text-orange-100 font-bold text-[10px] uppercase tracking-widest italic pt-2">
            Análise comportamental e técnica focada no tema deste painel.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400">
              <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
              <p className="text-xs font-black uppercase tracking-widest animate-pulse">O especialista está analisando o contexto da página...</p>
            </div>
          ) : result ? (
            <ScrollArea className="flex-1 p-6 md:p-8">
              <div className="space-y-8 pb-10">
                {/* Papel do Especialista */}
                <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <BrainCircuit className="w-4 h-4 text-orange-500" />
                  <p className="text-[10px] font-black text-slate-500 uppercase">Visão do {result.specialistRole}</p>
                </div>

                {/* Análise Global */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-orange-600">
                    <TrendingUp className="w-5 h-5" />
                    <h3 className="text-xs font-black uppercase tracking-widest">Diagnóstico Estratégico</h3>
                  </div>
                  <Card className="ri-card p-6 shadow-sm">
                    <p className="text-sm font-medium text-slate-700 leading-relaxed italic">
                      "{result.globalAnalysis}"
                    </p>
                  </Card>
                </section>

                {/* Destaques Individuais */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Award className="w-5 h-5" />
                    <h3 className="text-xs font-black uppercase tracking-widest">Feedback Individual ({activeTab})</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {result.individualHighlights.map((vendor: any, idx: number) => (
                      <Card key={idx} className="ri-card p-5 shadow-sm space-y-4 border-l-4 border-l-slate-100 hover:border-l-orange-400 transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-black text-slate-800 uppercase">{vendor.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full w-24">
                                <div className="h-full bg-orange-500 rounded-full" style={{ width: `${vendor.score}%` }} />
                              </div>
                              <span className="text-[10px] font-black text-orange-600">{vendor.score} pts</span>
                            </div>
                          </div>
                          {vendor.score >= 80 ? (
                            <Badge className="bg-emerald-100 text-emerald-700 border-none font-black text-[8px] uppercase">Destaque Técnico</Badge>
                          ) : vendor.score < 50 ? (
                            <Badge className="bg-rose-100 text-rose-700 border-none font-black text-[8px] uppercase">Ação Requerida</Badge>
                          ) : (
                            <Badge className="bg-sky-100 text-sky-700 border-none font-black text-[8px] uppercase">Regular</Badge>
                          )}
                        </div>
                        <p className="text-xs font-medium text-slate-600 leading-relaxed">
                          {vendor.analysis}
                        </p>
                        <div className="bg-slate-900 rounded-xl p-3 flex gap-3 items-center">
                          <Zap className="w-4 h-4 text-orange-400 shrink-0" />
                          <p className="text-[10px] font-bold text-white uppercase leading-tight">
                            <span className="text-orange-400">Diretriz:</span> {vendor.priorityAction}
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-300">
              <Sparkles className="w-12 h-12" />
              <p className="text-xs font-black uppercase">Deseja uma visão especialista deste painel?</p>
              <Button onClick={generateAnalysis} className="bg-orange-500 font-black rounded-xl px-10">GERAR DIAGNÓSTICO</Button>
            </div>
          )}
        </div>

        <div className="p-6 md:p-8 border-t bg-slate-50 shrink-0 flex items-center justify-between">
          <Button onClick={() => setResult(null)} variant="ghost" className="text-slate-400 font-black text-[10px] uppercase">Recalcular</Button>
          <Button onClick={() => setOpen(false)} className="bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl h-12 px-10 uppercase">Fechar</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
