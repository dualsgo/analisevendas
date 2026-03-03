
"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  ShieldAlert,
  Percent,
  UserMinus,
  ArrowUpRight,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Info,
  ChevronRight,
  Zap,
  Target,
  TrendingDown,
  ShieldCheck,
  Search,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RiskRadarProps {
  data: DetailedSaleRow[];
}

type RiskLevel = 'low' | 'medium' | 'high';

interface Alert {
  id: string;
  type: string;
  collaborator?: string;
  indicator: string;
  value: string;
  reference: string;
  variation: string;
  level: RiskLevel;
  icon: any;
  description: string;
  impact: string;
  recommendation: string;
}

export function RiskRadar({ data }: RiskRadarProps) {
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  const alerts = useMemo(() => {
    const list: Alert[] = [];
    const saidas = data.filter(s => s.tpNF === 1 && !s.is_cancelada);
    if (saidas.length === 0) return [];

    // Excluir notas de CAMPANHA e CAMPANHA + ALERTA da auditoria de risco de desconto para evitar distorção
    const validForDiscountAudit = saidas.filter(s => s.tipo_desconto !== "CAMPANHA" && s.tipo_desconto !== "CAMPANHA + ALERTA");

    const avgStoreDiscount = (validForDiscountAudit.filter(s => parseFloat(s.desconto_total) > 0).reduce((acc, s) => acc + parseFloat(s.percentual_desconto), 0) / validForDiscountAudit.filter(s => parseFloat(s.desconto_total) > 0).length || 0) * 100;
    const avgStoreRegistration = (saidas.filter(s => s.cpf_cnpj_dest).length / saidas.length) * 100;

    const vendors: Record<string, any> = {};
    saidas.forEach(s => {
      const v = s.vendedor || "VENDEDOR";
      if (!vendors[v]) vendors[v] = { name: v, sales: [], discounts: [], regCount: 0, campaignAlertCount: 0 };
      vendors[v].sales.push(s);
      
      // Apenas considera descontos que não são de campanha para o alerta de margem
      if (s.tipo_desconto !== "CAMPANHA" && s.tipo_desconto !== "CAMPANHA + ALERTA" && parseFloat(s.desconto_total) > 0) {
        vendors[v].discounts.push(parseFloat(s.percentual_desconto) * 100);
      }
      
      if (s.tipo_desconto === "CAMPANHA + ALERTA") vendors[v].campaignAlertCount++;
      if (s.cpf_cnpj_dest) vendors[v].regCount++;
    });

    Object.values(vendors).forEach((v: any) => {
      const avgVDesc = v.discounts.length > 0 ? v.discounts.reduce((a: any, b: any) => a + b, 0) / v.discounts.length : 0;
      const vRegRate = (v.regCount / v.sales.length) * 100;

      // Alerta de Desconto (Comparando maçãs com maçãs, excluindo campanhas)
      if (avgVDesc > avgStoreDiscount * 1.4 && v.discounts.length > 3) {
        list.push({
          id: `desc-${v.name}`,
          type: 'Desconto Elevado',
          collaborator: v.name,
          indicator: 'Média Desconto',
          value: `${avgVDesc.toFixed(1)}%`,
          reference: `${avgStoreDiscount.toFixed(1)}%`,
          variation: `+${(avgVDesc - avgStoreDiscount).toFixed(1)}%`,
          level: avgVDesc > avgStoreDiscount * 1.8 ? 'high' : 'medium',
          icon: Percent,
          description: `O colaborador está praticando uma média de descontos significativamente superior à média da unidade (excluindo campanhas oficiais).`,
          impact: `Isso compromete diretamente a margem de lucro da loja e indica que o desconto está sendo usado como principal argumento de venda.`,
          recommendation: `Acompanhar o atendimento para identificar se o desconto é oferecido precocemente ou se falta técnica de agregação de valor.`
        });
      }

      // Alerta de Campanha + Outros (Novo)
      if (v.campaignAlertCount > 0) {
        list.push({
          id: `slp-alert-${v.name}`,
          type: 'Uso Indevido Campanha',
          collaborator: v.name,
          indicator: 'Alertas SLP',
          value: `${v.campaignAlertCount} Notas`,
          reference: '0 Notas',
          variation: `+${v.campaignAlertCount}`,
          level: 'high',
          icon: AlertTriangle,
          description: `Identificamos cupons onde o item SLP da campanha foi vendido junto com descontos manuais em outros produtos do carrinho.`,
          impact: `Quebra de política de margem. O benefício do SLP por 9,99 não deve ser cumulativo com descontos manuais no mesmo atendimento.`,
          recommendation: `Auditar individualmente estas notas no menu "Audit. Descontos" e reforçar que a campanha SLP é o incentivo máximo permitido no cupom.`
        });
      }

      // Alerta de Cadastro
      if (vRegRate < avgStoreRegistration * 0.75 && v.sales.length > 5) {
        list.push({
          id: `reg-${v.name}`,
          type: 'Fuga de Cadastro',
          collaborator: v.name,
          indicator: 'Taxa Identificação',
          value: `${vRegRate.toFixed(1)}%`,
          reference: `${avgStoreRegistration.toFixed(1)}%`,
          variation: `${(vRegRate - avgStoreRegistration).toFixed(1)}%`,
          level: 'high',
          icon: UserMinus,
          description: `Baixa taxa de coleta de CPF/Identificação nas vendas realizadas por este colaborador.`,
          impact: `Perda de inteligência de CRM e redução do Lifetime Value (LTV).`,
          recommendation: `Reforçar a importância da identificação para garantir a segurança da troca e fidelização do cliente.`
        });
      }
    });

    const cancelRate = (data.filter(s => s.is_cancelada).length / data.length) * 100;
    if (cancelRate > 5) {
      list.push({
        id: 'store-cancel',
        type: 'Pico Cancelamento',
        indicator: 'Taxa Loja',
        value: `${cancelRate.toFixed(1)}%`,
        reference: '3.0%',
        variation: `+${(cancelRate - 3).toFixed(1)}%`,
        level: 'high',
        icon: AlertTriangle,
        description: `O volume de notas canceladas no lote atual está acima do limite operacional aceitável de 3%.`,
        impact: `Pode indicar erros sistêmicos ou comportamentos anômalos no PDV.`,
        recommendation: `Analisar a aba "Transações" filtrando por notas canceladas para identificar padrões de horário ou motivo.`
      });
    }
    return list;
  }, [data]);

  const healthStatus = useMemo(() => {
    const highAlerts = alerts.filter(a => a.level === 'high').length;
    if (highAlerts > 2) return { label: 'CRÍTICO', color: 'text-rose-600', bg: 'bg-rose-50', icon: AlertOctagon };
    if (alerts.length > 0) return { label: 'ATENÇÃO', color: 'text-orange-600', bg: 'bg-orange-50', icon: AlertTriangle };
    return { label: 'SAUDÁVEL', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 };
  }, [alerts]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      <Card className={cn("ri-card border-none overflow-hidden shadow-lg", healthStatus.bg)}>
        <CardContent className="p-6 md:p-10 flex flex-col md:flex-row items-center gap-8">
          <div className={cn("p-5 rounded-3xl bg-white shadow-sm shrink-0", healthStatus.color)}>
            <healthStatus.icon className="w-12 h-12 md:w-16 md:h-16" />
          </div>
          <div className="flex-1 min-w-0 space-y-2 text-center md:text-left">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Status de Integridade Operacional</p>
            <h2 className={cn("text-3xl md:text-5xl font-black leading-none italic", healthStatus.color)}>{healthStatus.label}</h2>
            <p className="text-sm font-medium text-slate-500 max-w-2xl">
              {alerts.length > 0 
                ? `Identificamos ${alerts.length} comportamentos fora do padrão estatístico da sua unidade. Clique nos cards abaixo para auditar os detalhes.`
                : "Sua operação está rodando dentro das métricas de conformidade. Continue monitorando regularmente."}
            </p>
          </div>
          <Badge className="bg-white text-slate-600 border-none font-black px-6 py-3 text-sm rounded-2xl shadow-sm">
            {alerts.filter(a => a.level === 'high').length} RISCOS CRÍTICOS
          </Badge>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <div className="px-2 flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> Radar de Monitoramento Ativo
          </h3>
          <Badge variant="outline" className="text-[9px] font-black uppercase text-slate-400">Atualizado via XML</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {alerts.map((alert) => (
            <Card 
              key={alert.id} 
              onClick={() => setSelectedAlert(alert)}
              className="ri-card p-5 space-y-5 relative overflow-hidden group hover: hover: transition-all cursor-pointer"
            >
              <div className={cn("absolute top-0 left-0 w-1.5 h-full", alert.level === 'high' ? "bg-rose-500" : "bg-orange-400")} />
              
              <div className="flex justify-between items-start">
                <div className={cn("p-2.5 rounded-xl bg-slate-50 group-hover:scale-110 transition-transform", alert.level === 'high' ? "text-rose-500" : "text-orange-500")}>
                  <alert.icon className="w-6 h-6" />
                </div>
                <div className="flex flex-col items-end">
                  <Badge className={cn("text-[8px] font-black uppercase px-2 h-4 border-none mb-1", alert.level === 'high' ? "bg-rose-500 text-white" : "bg-orange-100 text-orange-700")}>
                    {alert.level === 'high' ? 'CRÍTICO' : 'ATENÇÃO'}
                  </Badge>
                  <span className="text-[8px] font-bold text-slate-300 uppercase">Prioridade</span>
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-800 uppercase leading-none tracking-tight">{alert.type}</h4>
                {alert.collaborator && <p className="text-[10px] font-bold text-slate-400 uppercase truncate">{alert.collaborator}</p>}
              </div>

              <div className="pt-4 border-t grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Valor Atual</p>
                  <p className="text-sm font-black text-slate-700">{alert.value}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Desvio</p>
                  <span className={cn("text-sm font-black flex items-center justify-end gap-1 leading-none", alert.level === 'high' ? "text-rose-600" : "text-orange-600")}>
                    {alert.variation} <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[9px] font-black text-orange-500 uppercase opacity-0 group-hover:opacity-100 transition-opacity pt-2">
                <span>Ver Auditoria</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </Card>
          ))}
          
          {alerts.length === 0 && (
            <Card className="col-span-full py-20 bg-slate-50/50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4">
              <ShieldCheck className="w-12 h-12 text-slate-200" />
              <p className="text-sm font-black text-slate-400 uppercase tracking-tighter">Nenhum comportamento anômalo identificado no período</p>
            </Card>
          )}
        </div>
      </div>

      <Sheet open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <SheetContent className="w-full sm:max-w-xl bg-white border-l-4 border-orange-500 p-0 flex flex-col">
          {selectedAlert && (
            <>
              <SheetHeader className={cn(
                "p-8 md:p-10 text-white space-y-4 shrink-0",
                selectedAlert.level === 'high' ? "bg-rose-600" : "bg-orange-500"
              )}>
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                    <selectedAlert.icon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <SheetTitle className="text-2xl font-black uppercase text-white leading-none">{selectedAlert.type}</SheetTitle>
                    <Badge className="bg-white/20 text-white border-none mt-2 text-[10px] font-black uppercase">Auditoria de Risco</Badge>
                  </div>
                </div>
                <SheetDescription className="text-white/80 font-bold text-xs uppercase tracking-widest leading-relaxed">
                  Análise de conformidade e impacto para o colaborador: <strong>{selectedAlert.collaborator || "Unidade Geral"}</strong>
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-8 md:p-10 space-y-10">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Valor do Colaborador</p>
                    <p className="text-2xl font-black text-slate-800">{selectedAlert.value}</p>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Média Unidade (Ref)</p>
                    <p className="text-2xl font-black text-slate-500">{selectedAlert.reference}</p>
                  </div>
                </div>

                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-800">
                    <Info className="w-5 h-5 text-orange-500" />
                    <h4 className="text-xs font-black uppercase tracking-widest">O que está acontecendo?</h4>
                  </div>
                  <p className="text-sm font-medium text-slate-600 leading-relaxed italic border-l-4 border-slate-100 pl-4">
                    "{selectedAlert.description}"
                  </p>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-800">
                    <TrendingDown className="w-5 h-5 text-rose-500" />
                    <h4 className="text-xs font-black uppercase tracking-widest">Qual o impacto real?</h4>
                  </div>
                  <Card className="ri-card bg-rose-50/50 p-6 shadow-sm">
                    <p className="text-sm font-medium text-rose-900 leading-relaxed">
                      {selectedAlert.impact}
                    </p>
                  </Card>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-800">
                    <Zap className="w-5 h-5 text-emerald-500" />
                    <h4 className="text-xs font-black uppercase tracking-widest">Ação Sugerida para o Gestor</h4>
                  </div>
                  <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl -mr-16 -mt-16" />
                    <p className="text-base font-medium leading-relaxed opacity-90 relative z-10">
                      {selectedAlert.recommendation}
                    </p>
                    <div className="flex items-center gap-2 pt-4 border-t border-white/10 relative z-10">
                       <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                       <span className="text-[10px] font-bold uppercase tracking-widest">Meta: Reversão de Indicador</span>
                    </div>
                  </div>
                </section>
              </div>

              <div className="p-8 border-t bg-slate-50 mt-auto">
                <Button onClick={() => setSelectedAlert(null)} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black rounded-2xl h-16 uppercase shadow-lg">CONCLUIR AUDITORIA</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
