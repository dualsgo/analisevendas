"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert,
  TrendingDown,
  Percent,
  UserMinus,
  ArrowUpRight,
  ChevronRight,
  Activity,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RiskRadarProps {
  data: DetailedSaleRow[];
}

type RiskLevel = 'low' | 'medium' | 'high';

interface Alert {
  type: string;
  collaborator?: string;
  indicator: string;
  value: string;
  reference: string;
  variation: string;
  level: RiskLevel;
  icon: any;
}

export function RiskRadar({ data }: RiskRadarProps) {
  const alerts = useMemo(() => {
    const list: Alert[] = [];
    const saidas = data.filter(s => s.tpNF === 1 && !s.is_cancelada);
    if (saidas.length === 0) return [];

    // Média Geral da Loja
    const avgStoreDiscount = (saidas.filter(s => parseFloat(s.desconto_total) > 0).reduce((acc, s) => acc + parseFloat(s.percentual_desconto), 0) / saidas.filter(s => parseFloat(s.desconto_total) > 0).length || 0) * 100;
    const avgStoreRegistration = (saidas.filter(s => s.cpf_cnpj_dest).length / saidas.length) * 100;

    // Métricas por Vendedor
    const vendors: Record<string, any> = {};
    saidas.forEach(s => {
      const v = s.vendedor || "VENDEDOR";
      if (!vendors[v]) vendors[v] = { name: v, sales: [], discounts: [], regCount: 0 };
      vendors[v].sales.push(s);
      if (parseFloat(s.desconto_total) > 0) vendors[v].discounts.push(parseFloat(s.percentual_desconto) * 100);
      if (s.cpf_cnpj_dest) vendors[v].regCount++;
    });

    Object.values(vendors).forEach((v: any) => {
      const avgVDesc = v.discounts.length > 0 ? v.discounts.reduce((a: any, b: any) => a + b, 0) / v.discounts.length : 0;
      const vRegRate = (v.regCount / v.sales.length) * 100;

      // Alerta 1: Desconto Abusivo
      if (avgVDesc > avgStoreDiscount * 1.5) {
        list.push({
          type: 'Desconto Elevado',
          collaborator: v.name,
          indicator: 'Média Desconto',
          value: `${avgVDesc.toFixed(1)}%`,
          reference: `${avgStoreDiscount.toFixed(1)}%`,
          variation: `+${(avgVDesc - avgStoreDiscount).toFixed(1)}%`,
          level: avgVDesc > avgStoreDiscount * 2 ? 'high' : 'medium',
          icon: Percent
        });
      }

      // Alerta 2: Baixa Identificação
      if (vRegRate < avgStoreRegistration * 0.7 && v.sales.length > 5) {
        list.push({
          type: 'Fuga de Cadastro',
          collaborator: v.name,
          indicator: 'Taxa Identificação',
          value: `${vRegRate.toFixed(1)}%`,
          reference: `${avgStoreRegistration.toFixed(1)}%`,
          variation: `${(vRegRate - avgStoreRegistration).toFixed(1)}%`,
          level: 'high',
          icon: UserMinus
        });
      }
    });

    // Alerta 3: Cancelamentos na Loja
    const cancelRate = (data.filter(s => s.is_cancelada).length / data.length) * 100;
    if (cancelRate > 5) {
      list.push({
        type: 'Pico Cancelamento',
        indicator: 'Taxa Loja',
        value: `${cancelRate.toFixed(1)}%`,
        reference: '3.0%',
        variation: `+${(cancelRate - 3).toFixed(1)}%`,
        level: 'high',
        icon: AlertTriangle
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
    <div className="space-y-10 animate-in fade-in duration-500 pb-24">
      {/* Indicador Geral de Saúde */}
      <Card className={cn("ri-card border-none overflow-hidden shadow-2xl", healthStatus.bg)}>
        <CardContent className="p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
          <div className={cn("p-6 rounded-full bg-white shadow-xl group-hover:scale-110 transition-transform", healthStatus.color)}>
            <healthStatus.icon className="w-12 h-12 md:w-16 md:h-16" />
          </div>
          <div className="text-center md:text-left flex-1 space-y-2">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Status Operacional</p>
            <h2 className={cn("text-4xl md:text-6xl font-black tracking-tighter leading-none uppercase", healthStatus.color)}>{healthStatus.label}</h2>
            <p className="text-sm md:text-lg font-medium text-slate-500 max-w-xl">Encontrados {alerts.length} comportamentos que fogem do padrão esperado no período.</p>
          </div>
          <div className="flex shrink-0">
             <Badge className="bg-white text-slate-600 border-none font-black px-6 py-3 text-sm shadow-sm rounded-2xl uppercase tracking-widest">
               {alerts.filter(a => a.level === 'high').length} Riscos Altos
             </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Grid de Alertas Ativos */}
      <div className="space-y-6">
        <div className="px-4 space-y-4">
          <h3 className="text-xs md:text-sm font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-3">
            <ShieldAlert className="w-5 h-5" /> Alertas de Comportamento
          </h3>
          <div className="bg-orange-50/50 border-l-4 border-orange-400 p-6 rounded-r-[1.5rem] shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-white rounded-lg shadow-sm shrink-0">
                <Info className="w-5 h-5 text-orange-500" />
              </div>
              <div className="space-y-2">
                <p className="text-[13px] font-black text-orange-900 uppercase tracking-tight">Como interpretar estes alertas?</p>
                <p className="text-xs text-orange-800/70 font-medium leading-relaxed max-w-3xl uppercase tracking-wide">
                  O sistema monitora constantemente os indicadores de cada colaborador e os compara com a média atual da unidade. Desvios acentuados (ex: dar muito mais desconto que o restante da equipe) geram alertas para investigação e treinamento corretivo.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 px-2">
          {alerts.map((alert, i) => (
            <Card key={i} className="ri-card border-none bg-white p-6 md:p-8 space-y-6 relative overflow-hidden group hover:shadow-xl transition-all hover:scale-[1.02]">
              <div className={cn(
                "absolute top-0 left-0 w-2 h-full transition-all group-hover:w-3",
                alert.level === 'high' ? "bg-rose-500" : "bg-orange-400"
              )} />
              
              <div className="flex justify-between items-start">
                <div className={cn("p-3 rounded-2xl bg-slate-50 shadow-inner", alert.level === 'high' ? "text-rose-500" : "text-orange-500")}>
                  <alert.icon className="w-6 h-6" />
                </div>
                <Badge className={cn(
                  "text-[10px] font-black border-none uppercase px-3 py-1 tracking-widest",
                  alert.level === 'high' ? "bg-rose-500 text-white" : "bg-orange-100 text-orange-700"
                )}>
                  Risco {alert.level === 'high' ? 'Alto' : 'Médio'}
                </Badge>
              </div>

              <div className="space-y-2">
                <h4 className="text-base md:text-lg font-black text-slate-800 uppercase leading-tight tracking-tight">{alert.type}</h4>
                {alert.collaborator && <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{alert.collaborator}</p>}
              </div>

              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-50">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase leading-none tracking-widest">Valor Atual</p>
                  <p className="text-base font-black text-slate-700 leading-none tracking-tight">{alert.value}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase leading-none tracking-widest">Variação</p>
                  <span className={cn("text-base font-black flex items-center justify-end gap-1.5 leading-none", alert.level === 'high' ? "text-rose-600" : "text-orange-600")}>
                    {alert.variation} <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </Card>
          ))}

          {alerts.length === 0 && (
            <div className="col-span-full py-24 text-center space-y-6 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 shadow-inner">
               <div className="p-6 bg-emerald-50 rounded-full inline-block shadow-sm">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500" />
               </div>
               <div className="space-y-2">
                  <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Operação Saudável</h4>
                  <p className="text-sm text-slate-400 font-medium max-w-sm mx-auto uppercase tracking-wide">Nenhum comportamento anômalo detectado. A equipe está seguindo os padrões estatísticos da unidade.</p>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Histórico de Oscilações (Placeholder Visual) */}
      <Card className="ri-card overflow-hidden shadow-sm border-none bg-slate-50/50">
        <CardHeader className="bg-slate-100/50 border-b p-6">
          <CardTitle className="text-[11px] font-black uppercase text-slate-500 tracking-[0.2em] flex items-center gap-3">
            <Activity className="w-4 h-4" /> Radar de Instabilidade Temporal
          </CardTitle>
        </CardHeader>
        <CardContent className="p-16 text-center space-y-6">
           <TrendingDown className="w-16 h-16 text-slate-200 mx-auto" />
           <div className="space-y-2">
              <p className="text-sm font-black text-slate-400 uppercase tracking-[0.1em]">Aguardando dados históricos</p>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Análise de oscilação disponível em períodos acima de 15 dias.</p>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
