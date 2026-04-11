
"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ClipboardCheck, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Zap, 
  Users, 
  Star, 
  AlertCircle,
  BarChart3,
  Copy,
  CheckCircle2,
  FileText,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";

interface FeedbackPanelProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

const IGNORE_LIST = ["MAYCON", "RUAN"];
const GROUPS: Record<string, string> = {
  "RENATA": "Vendedores",
  "BARBOSA": "Vendedores",
  "LUIZ": "Vendedores",
  "CAREN": "Vendedores",
  "BIANCA": "Vendedores",
  "ERIKA": "Apoio Venda",
  "LUIZA": "Apoio Venda",
  "CAROL": "Apoio Venda",
  "ALINE": "Apoio Operação",
  "THAIS": "Apoio Operação",
  "LIDI": "Apoio Operação",
  "RAFA": "Aprendiz",
  "CATIA": "Aprendiz"
};

export function FeedbackPanel({ data, vinculos }: FeedbackPanelProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [copied, setCopied] = useState(false);

  const formatBRL = (val: number) => 
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const metrics = useMemo(() => {
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    const vendors: Record<string, any> = {};

    // Métricas Globais (exclui volume inflado passivamente pela OMNI)
    const organicSales = activeSales.filter(s => s.canal !== "DELIVERY" && s.canal !== "RETIRADA_ONLINE");
    const totalVendaLoja = organicSales.reduce((acc, s) => acc + parseFloat(s.vNF), 0);
    const totalCuponsLoja = organicSales.length;
    const totalItensLoja = organicSales.reduce((acc, s) => acc + parseFloat(s.itens_qtd), 0);
    const avgLojaPA = totalCuponsLoja > 0 ? totalItensLoja / totalCuponsLoja : 0;
    const avgLojaTKM = totalCuponsLoja > 0 ? totalVendaLoja / totalCuponsLoja : 0;
    const totalIdentificadas = organicSales.filter(s => s.cpf_cnpj_dest && s.cpf_cnpj_dest.trim().length > 3).length;
    const avgLojaIdent = totalCuponsLoja > 0 ? (totalIdentificadas / totalCuponsLoja) * 100 : 0;

    const pickupsLoja = activeSales.filter(s => s.canal === "RETIRADA_ONLINE").length;
    const adicionaisLoja = activeSales.filter(s => s.canal === "RETIRADA_ADICIONAL" || s.is_adicional || s.is_adicional_suspeito).length;
    const avgLojaConv = pickupsLoja > 0 ? (adicionaisLoja / pickupsLoja) * 100 : 0;

    // Métricas por Vendedor
    activeSales.forEach(s => {
      const v = s.vendedor || "OUTROS";
      if (IGNORE_LIST.includes(v)) return;
      
      if (!vendors[v]) vendors[v] = { 
        name: v, 
        group: GROUPS[v] || "Outros",
        venda: 0, 
        cupons: 0, 
        itens: 0, 
        identificados: 0, 
        pickups: 0, 
        adicionais: 0 
      };
      
      const isOrganico = s.canal !== "DELIVERY" && s.canal !== "RETIRADA_ONLINE";
      if (isOrganico) {
        vendors[v].venda += parseFloat(s.vNF);
        vendors[v].cupons++;
        vendors[v].itens += parseFloat(s.itens_qtd);
        if (s.cpf_cnpj_dest && s.cpf_cnpj_dest.trim().length > 3) vendors[v].identificados++;
      }
      if (s.canal === "RETIRADA_ONLINE") vendors[v].pickups++;
      if (s.canal === "RETIRADA_ADICIONAL" || s.is_adicional || s.is_adicional_suspeito) vendors[v].adicionais++;
    });

    const vendorResults = Object.values(vendors).map(v => ({
      ...v,
      pa: v.cupons > 0 ? v.itens / v.cupons : 0,
      tkm: v.cupons > 0 ? v.venda / v.cupons : 0,
      ident: v.cupons > 0 ? (v.identificados / v.cupons) * 100 : 0,
      conv: v.pickups > 0 ? (v.adicionais / v.pickups) * 100 : 0,
      share: (v.venda / totalVendaLoja) * 100
    })).sort((a, b) => b.venda - a.venda);

    return {
      store: {
        venda: totalVendaLoja,
        cupons: totalCuponsLoja,
        pa: avgLojaPA,
        tkm: avgLojaTKM,
        ident: avgLojaIdent,
        conv: avgLojaConv,
        pickups: pickupsLoja,
        adicionais: adicionaisLoja
      },
      vendors: vendorResults
    };
  }, [data]);

  const generateFeedback = (item: any, isStore = false) => {
    const points: string[] = [];
    const opportunities: string[] = [];

    // PA
    if (item.pa >= 2.2) points.push("Excelente aproveitamento de cestas (PA acima de 2.2).");
    else if (item.pa < 1.8) opportunities.push("Baixo volume de peças por atendimento; focar em produtos complementares.");

    // Conv
    if (item.conv >= 22) points.push("Alta eficiência na conversão de clientes pickup.");
    else if (item.conv < 15 && item.pickups > 2) opportunities.push("Baixa conversão de vendas adicionais em retiradas online.");

    // Identificação
    if (item.ident >= 85) points.push("Fidelização exemplar com alto índice de identificação (CPF).");
    else if (item.ident < 70) opportunities.push("Oportunidade de melhorar o cadastro de clientes no checkout.");

    // TKM
    if (!isStore) {
        if (item.tkm > metrics.store.tkm * 1.1) points.push("Ticket Médio superior à média da loja, indicando venda de valor agregado.");
        else if (item.tkm < metrics.store.tkm * 0.9) opportunities.push("Ticket Médio abaixo da média; trabalhar itens de maior valor.");
    }

    return { points, opportunities };
  };

  const storeFeedback = useMemo(() => generateFeedback(metrics.store, true), [metrics]);

  const reportTemplate = useMemo(() => {
    let text = `📊 RELATÓRIO DE FEEDBACK CONSOLIDADO\n`;
    text += `📅 Período Analisado: ${new Date().toLocaleDateString('pt-BR')}\n\n`;
    
    text += `🏢 RESULTADO GERAL DA LOJA\n`;
    text += `• Venda Total: ${formatBRL(metrics.store.venda)}\n`;
    text += `• P.A. Médio: ${metrics.store.pa.toFixed(2)}\n`;
    text += `• Ticket Médio: ${formatBRL(metrics.store.tkm)}\n`;
    text += `• Conversão Pickup: ${metrics.store.conv.toFixed(1)}%\n`;
    text += `• Identificação: ${metrics.store.ident.toFixed(1)}%\n\n`;

    text += `✅ PONTOS POSITIVOS (LOJA):\n`;
    storeFeedback.points.forEach(p => text += `  - ${p}\n`);
    if (storeFeedback.points.length === 0) text += "  - Estabilidade operacional mantida.\n";

    text += `\n🎯 OPORTUNIDADES (LOJA):\n`;
    storeFeedback.opportunities.forEach(o => text += `  - ${o}\n`);
    if (storeFeedback.opportunities.length === 0) text += "  - Manter o ritmo atual de crescimento.\n";

    text += `\n--------------------------------------------\n\n`;
    text += `👤 DESEMPENHO INDIVIDUAL (FEEDBACKS)\n\n`;

    metrics.vendors.forEach(v => {
      const f = generateFeedback(v);
      text += `--- ${v.name.toUpperCase()} (${v.group}) ---\n`;
      text += `KPIs: PA ${v.pa.toFixed(2)} | TKM ${formatBRL(v.tkm)} | CONV ${v.conv.toFixed(1)}% | IDEN ${v.ident.toFixed(0)}%\n`;
      
      text += `FORÇAS:\n`;
      f.points.forEach(p => text += `  - ${p}\n`);
      if (f.points.length === 0) text += "  - Execução padrão conformada.\n";
      
      text += `MELHORIAS:\n`;
      f.opportunities.forEach(o => text += `  - ${o}\n`);
      if (f.opportunities.length === 0) text += "  - Focar na consistência dos resultados.\n";
      text += `\n`;
    });

    return text;
  }, [metrics, storeFeedback]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(reportTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (metrics.vendors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-slate-400">
        <Users className="w-16 h-16 opacity-30" />
        <p className="text-sm font-bold uppercase tracking-widest text-center">Nenhum colaborador identificado para gerar feedback.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Painel de Feedback</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Consolidado Qualitativo baseado em Dados</p>
          </div>
        </div>
        <Button 
          onClick={copyToClipboard}
          className={cn(
            "rounded-2xl h-12 px-6 font-black uppercase text-[10px] gap-2 transition-all",
            copied ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-slate-900 hover:bg-slate-800 text-white"
          )}
        >
          {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? "COPIADO!" : "COPIAR RELATÓRIO PARA TEXTO"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feedback Loja */}
        <Card className="ri-card border-none shadow-xl bg-slate-900 text-white overflow-hidden">
          <CardHeader className="border-b border-white/10 p-6 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" /> Panorama Geral da Unidade
            </CardTitle>
            <Badge className="bg-white/10 text-white border-none font-black text-[10px]">LOJA</Badge>
          </CardHeader>
          <CardContent className="p-0">
             <div className="p-6 grid grid-cols-2 gap-4 border-b border-white/10 bg-white/5">
                <MetricDisplay label="P.A. MÉDIO" value={metrics.store.pa.toFixed(2)} icon={Target} />
                <MetricDisplay label="CONV. PICKUP" value={`${metrics.store.conv.toFixed(1)}%`} icon={Zap} />
                <MetricDisplay label="TICKET MÉDIO" value={formatBRL(metrics.store.tkm)} icon={BarChart3} />
                <MetricDisplay label="IDENTIFICAÇÃO" value={`${metrics.store.ident.toFixed(0)}%`} icon={Users} />
             </div>
             
             <div className="p-6 space-y-6">
                <div className="space-y-3">
                   <h4 className="text-[10px] font-black uppercase text-emerald-400 tracking-widest flex items-center gap-2">
                      <TrendingUp className="w-3 h-3" /> Pontos de Destaque
                   </h4>
                   <div className="space-y-2">
                      {storeFeedback.points.length > 0 ? storeFeedback.points.map((p, i) => (
                        <div key={i} className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/5 text-sm font-medium">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                           {p}
                        </div>
                      )) : (
                        <p className="text-xs text-slate-400 italic">Operação estável, mantendo metas básicas.</p>
                      )}
                   </div>
                </div>

                <div className="space-y-3">
                   <h4 className="text-[10px] font-black uppercase text-amber-400 tracking-widest flex items-center gap-2">
                      <AlertCircle className="w-3 h-3" /> Oportunidades
                   </h4>
                   <div className="space-y-2">
                      {storeFeedback.opportunities.length > 0 ? storeFeedback.opportunities.map((o, i) => (
                        <div key={i} className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/5 text-sm font-medium">
                           <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                           {o}
                        </div>
                      )) : (
                        <p className="text-xs text-slate-400 italic">Nenhuma vulnerabilidade crítica detectada no volume atual.</p>
                      )}
                   </div>
                </div>
             </div>
          </CardContent>
        </Card>

        {/* Preview do Template de Texto */}
        <Card className="ri-card border-2 border-slate-100 shadow-sm bg-white overflow-hidden flex flex-col">
           <CardHeader className="bg-slate-50 border-b p-6 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                 <FileText className="w-4 h-4 text-indigo-500" /> Template para Análise Externa
              </CardTitle>
              <Badge className="bg-indigo-100 text-indigo-700 border-none font-black text-[10px]">DADOS CONSOLIDADOS</Badge>
           </CardHeader>
           <CardContent className="p-6 flex-1 flex flex-col">
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 font-mono text-[11px] leading-relaxed text-slate-600 whitespace-pre-wrap overflow-y-auto max-h-[500px] flex-1">
                 {reportTemplate}
              </div>
              <p className="mt-4 text-[9px] font-bold text-slate-400 uppercase text-center flex items-center justify-center gap-2">
                 <MessageSquare className="w-3 h-3" /> Este texto pode ser enviado para o WhatsApp da gerência ou colado em relatórios.
              </p>
           </CardContent>
        </Card>
      </div>

      {/* Grid de Feedbacks Individuais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {metrics.vendors.map((v) => {
           const feedback = generateFeedback(v);
           return (
             <Card key={v.name} className="ri-card border-none shadow-md bg-white hover:shadow-lg transition-all group overflow-hidden">
                <div className="h-1 bg-indigo-500" />
                <CardHeader className="p-5 pb-2">
                   <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</p>
                        <h3 className="text-sm font-black text-slate-800 uppercase truncate">{v.name}</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{v.group}</p>
                      </div>
                      <Badge className="bg-slate-100 text-slate-600 border-none font-black text-[10px]">{v.share.toFixed(1)}% SHARE</Badge>
                   </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                   <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 p-2 rounded-lg text-center">
                         <p className="text-[8px] font-bold text-slate-400 uppercase">PA</p>
                         <p className="text-xs font-black text-slate-700">{v.pa.toFixed(2)}</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg text-center">
                         <p className="text-[8px] font-bold text-slate-400 uppercase">Conv%</p>
                         <p className="text-xs font-black text-slate-700">{v.conv.toFixed(1)}%</p>
                      </div>
                   </div>

                   <div className="space-y-3">
                      <div>
                         <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Destaques</p>
                         <div className="space-y-1">
                            {feedback.points.length > 0 ? feedback.points.map((p, i) => (
                              <p key={i} className="text-[11px] font-medium text-slate-600 flex items-start gap-1.5 leading-tight">
                                 <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                 {p}
                              </p>
                            )) : <p className="text-[10px] text-slate-400 italic">Mantendo padrões técnicos.</p>}
                         </div>
                      </div>
                      <div>
                         <p className="text-[9px] font-black text-amber-600 uppercase mb-1">A desenvolver</p>
                         <div className="space-y-1">
                            {feedback.opportunities.length > 0 ? feedback.opportunities.map((o, i) => (
                              <p key={i} className="text-[11px] font-medium text-slate-600 flex items-start gap-1.5 leading-tight">
                                 <span className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                 {o}
                              </p>
                            )) : <p className="text-[10px] text-slate-400 italic">Resultados consistentes.</p>}
                         </div>
                      </div>
                   </div>
                </CardContent>
             </Card>
           );
         })}
      </div>
    </div>
  );
}

function MetricDisplay({ label, value, icon: Icon }: any) {
   return (
      <div className="flex flex-col gap-1">
         <div className="flex items-center gap-1.5">
            <Icon className="w-3 h-3 text-indigo-400" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
         </div>
         <p className="text-xl font-black text-white">{value}</p>
      </div>
   );
}
