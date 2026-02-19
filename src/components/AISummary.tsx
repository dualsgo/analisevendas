
"use client";

import React, { useState } from "react";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, BrainCircuit, Target, TrendingUp, AlertTriangle, Lightbulb, Copy, Check } from "lucide-react";
import { aiSalesSummaryReport } from "@/ai/flows/ai-sales-summary-report-flow";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface AISummaryProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

export function AISummary({ data, vinculos }: AISummaryProps) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateReport = async () => {
    setLoading(true);
    try {
      // 1. Agregado por Canal
      const channelMap: Record<string, any> = {};
      const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
      
      activeSales.forEach(s => {
        if (!channelMap[s.canal_consolidado]) {
          channelMap[s.canal_consolidado] = { Canal: s.canal_consolidado, Cupons: 0, Venda_Total: 0, Itens_Total: 0 };
        }
        channelMap[s.canal_consolidado].Cupons++;
        channelMap[s.canal_consolidado].Venda_Total += parseFloat(s.vNF);
        channelMap[s.canal_consolidado].Itens_Total += parseFloat(s.itens_qtd);
      });

      const channelSummary = Object.values(channelMap).map(c => ({
        ...c,
        Venda_Total: c.Venda_Total.toFixed(2),
        TKM: (c.Venda_Total / c.Cupons).toFixed(2),
        PA: (c.Itens_Total / c.Cupons).toFixed(2),
        Cupons: c.Cupons.toString(),
        Itens_Total: c.Itens_Total.toString()
      }));

      // 2. Agregado por Vendedor
      const vendorMap: Record<string, any> = {};
      activeSales.forEach(s => {
        const key = `${s.canal_consolidado}-${s.vendedor}`;
        if (!vendorMap[key]) {
          vendorMap[key] = { Canal: s.canal_consolidado, Vendedor: s.vendedor, Cupons: 0, Venda_Total: 0, Itens_Total: 0 };
        }
        vendorMap[key].Cupons++;
        vendorMap[key].Venda_Total += parseFloat(s.vNF);
        vendorMap[key].Itens_Total += parseFloat(s.itens_qtd);
      });

      const vendorSummary = Object.values(vendorMap).map(v => ({
        ...v,
        Venda_Total: v.Venda_Total.toFixed(2),
        TKM: (v.Venda_Total / v.Cupons).toFixed(2),
        PA: (v.Itens_Total / v.Cupons).toFixed(2),
        Cupons: v.Cupons.toString(),
        Itens_Total: v.Itens_Total.toString()
      }));

      // 3. Dados Detalhados (Limitado para não estourar tokens)
      const detailedSalesData = activeSales.slice(0, 100).map(s => ({
        chave: s.chave,
        nf: s.nf,
        dhEmi: s.dhEmi,
        vendedor: s.vendedor,
        canal: s.canal_consolidado,
        vNF: s.vNF,
        itens_qtd: s.itens_qtd,
        is_troca: s.is_troca,
        vTroca: s.vTroca,
        dif_troca: s.dif_troca,
        is_retirada: s.canal === "RETIRADA_ONLINE",
        is_retirada_adicional: s.canal === "RETIRADA_ADICIONAL",
        pickup_match_fields: s.pickup_match_fields || 0
      }));

      const response = await aiSalesSummaryReport({
        channelSummary,
        vendorSummary,
        detailedSalesData
      });

      setReport(response.summary);
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro na IA",
        description: "Não foi possível gerar o relatório no momento.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (report) {
      navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Hero IA */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[100px] -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-500/10 blur-[100px] -ml-32 -mb-32" />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-md border border-white/20">
            <BrainCircuit className="w-10 h-10 text-orange-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic">Análise Executiva IA</h2>
            <p className="text-slate-400 font-medium max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
              Nosso motor de inteligência analisará todos os {data.length} documentos fiscais para encontrar padrões, anomalias e oportunidades que os números sozinhos não mostram.
            </p>
          </div>

          {!report && !loading && (
            <Button 
              onClick={generateReport}
              className="bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl h-16 px-12 text-lg shadow-xl shadow-orange-900/40 gap-3 group transition-all hover:scale-105"
            >
              <Sparkles className="w-6 h-6 animate-pulse" />
              GERAR INSIGHTS AGORA
            </Button>
          )}
        </div>
      </section>

      {loading && (
        <div className="py-20 flex flex-col items-center gap-6 text-slate-400">
          <div className="relative">
            <Loader2 className="w-16 h-16 animate-spin opacity-20" />
            <BrainCircuit className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-orange-500 animate-bounce" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-black uppercase tracking-widest animate-pulse">Cruzando dados de vendas e auditoria...</p>
            <p className="text-[10px] font-bold uppercase opacity-60">Isso pode levar alguns segundos</p>
          </div>
        </div>
      )}

      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4 duration-700">
          <div className="lg:col-span-3 space-y-6">
            <Card className="ri-card border-none shadow-xl overflow-hidden bg-white">
              <CardHeader className="bg-slate-50/50 border-b p-6 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-orange-500" />
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Relatório Consolidado</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={handleCopy} className="text-slate-400 hover:text-orange-500 gap-2 font-black text-[10px]">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "COPIADO" : "COPIAR"}
                </Button>
              </CardHeader>
              <CardContent className="p-8 md:p-12">
                <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tighter prose-p:font-medium prose-p:text-slate-600 prose-strong:text-slate-900 prose-li:text-slate-600">
                  <div className="whitespace-pre-wrap font-sans leading-relaxed text-slate-700 text-sm md:text-base">
                    {report}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Pilares da Análise</h3>
            <SidebarInsight icon={Target} label="Foco em KPI" desc="Conversão de Pickup e PA real." color="text-sky-500" />
            <SidebarInsight icon={TrendingUp} label="Tendências" desc="Crescimento diário e mix." color="text-emerald-500" />
            <SidebarInsight icon={AlertTriangle} label="Riscos" desc="Detecção de anomalias em PA e Descontos." color="text-rose-500" />
            <SidebarInsight icon={Lightbulb} label="Ações" desc="Sugestões práticas para o time." color="text-orange-500" />
            
            <Card className="ri-card border-none bg-orange-50 p-6 mt-6">
              <p className="text-[10px] font-black text-orange-800 uppercase mb-2">Dica Pro</p>
              <p className="text-xs font-medium text-orange-700 leading-relaxed italic">
                "Use este relatório para pautar a sua reunião matinal com o time de vendas."
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarInsight({ icon: Icon, label, desc, color }: any) {
  return (
    <Card className="ri-card border-none bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-xl bg-slate-50 shrink-0", color)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] font-black text-slate-800 uppercase">{label}</p>
          <p className="text-[10px] font-medium text-slate-400 leading-tight">{desc}</p>
        </div>
      </div>
    </Card>
  );
}
