
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
  Clock
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
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 pb-20">
      {/* Indicador Geral de Saúde */}
      <Card className={cn("ri-card border-none overflow-hidden", healthStatus.bg)}>
        <CardContent className="p-6 md:p-10 flex flex-col md:flex-row items-center gap-6">
          <div className={cn("p-4 rounded-full bg-white shadow-sm", healthStatus.color)}>
            <healthStatus.icon className="w-10 h-10 md:w-12 md:h-12" />
          </div>
          <div className="text-center md:text-left flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Status Operacional</p>
            <h2 className={cn("text-3xl md:text-5xl font-black tracking-tighter", healthStatus.color)}>{healthStatus.label}</h2>
            <p className="text-xs md:text-sm font-medium text-slate-500 mt-2">Encontrados {alerts.length} comportamentos que fogem do padrão esperado no período.</p>
          </div>
          <div className="flex gap-3">
             <Badge className="bg-white text-slate-600 border-none font-black px-4 py-2 text-xs shadow-sm">
               {alerts.filter(a => a.level === 'high').length} RISCO ALTO
             </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Grid de Alertas Ativos */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest px-2 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" /> Alertas de Comportamento
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {alerts.map((alert, i) => (
            <Card key={i} className="ri-card border-none bg-white p-5 space-y-4 relative overflow-hidden group">
              <div className={cn(
                "absolute top-0 left-0 w-1.5 h-full",
                alert.level === 'high' ? "bg-rose-500" : "bg-orange-400"
              )} />
              
              <div className="flex justify-between items-start">
                <div className={cn("p-2 rounded-xl bg-slate-50", alert.level === 'high' ? "text-rose-500" : "text-orange-500")}>
                  <alert.icon className="w-5 h-5" />
                </div>
                <Badge className={cn(
                  "text-[8px] font-black border-none uppercase",
                  alert.level === 'high' ? "bg-rose-500 text-white" : "bg-orange-100 text-orange-700"
                )}>
                  Risco {alert.level === 'high' ? 'Alto' : 'Médio'}
                </Badge>
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-800 uppercase leading-tight">{alert.type}</h4>
                {alert.collaborator && <p className="text-[10px] font-bold text-slate-400 uppercase">{alert.collaborator}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Valor Atual</p>
                  <p className="text-sm font-black text-slate-700">{alert.value}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Variação</p>
                  <span className={cn("text-xs font-black flex items-center justify-end gap-1", alert.level === 'high' ? "text-rose-600" : "text-orange-600")}>
                    {alert.variation} <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </Card>
          ))}

          {alerts.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4 bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
               <div className="p-4 bg-emerald-50 rounded-full inline-block">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
               </div>
               <h4 className="text-base font-black text-slate-800 uppercase tracking-tight">Nenhum comportamento anômalo detectado</h4>
               <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">A operação está seguindo os padrões estatísticos de venda, desconto e identificação.</p>
            </div>
          )}
        </div>
      </div>

      {/* Histórico de Oscilações (Placeholder Visual) */}
      <Card className="ri-card overflow-hidden">
        <CardHeader className="bg-slate-50 border-b p-5">
          <CardTitle className="text-xs font-black uppercase text-slate-600 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Radar de Instabilidade Temporal
          </CardTitle>
        </CardHeader>
        <CardContent className="p-10 text-center space-y-4">
           <TrendingDown className="w-12 h-12 text-slate-200 mx-auto" />
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Análise de oscilação disponível em períodos acima de 15 dias.</p>
        </CardContent>
      </Card>
    </div>
  );
}
