"use client";

import React, { useMemo } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert,
  Percent,
  UserMinus,
  ArrowUpRight,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
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

    const avgStoreDiscount = (saidas.filter(s => parseFloat(s.desconto_total) > 0).reduce((acc, s) => acc + parseFloat(s.percentual_desconto), 0) / saidas.filter(s => parseFloat(s.desconto_total) > 0).length || 0) * 100;
    const avgStoreRegistration = (saidas.filter(s => s.cpf_cnpj_dest).length / saidas.length) * 100;

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

      if (avgVDesc > avgStoreDiscount * 1.5) {
        list.push({
          type: 'Desconto Elevado', collaborator: v.name, indicator: 'Média Desconto',
          value: `${avgVDesc.toFixed(1)}%`, reference: `${avgStoreDiscount.toFixed(1)}%`,
          variation: `+${(avgVDesc - avgStoreDiscount).toFixed(1)}%`, level: avgVDesc > avgStoreDiscount * 2 ? 'high' : 'medium', icon: Percent
        });
      }
      if (vRegRate < avgStoreRegistration * 0.7 && v.sales.length > 5) {
        list.push({
          type: 'Fuga de Cadastro', collaborator: v.name, indicator: 'Taxa Identificação',
          value: `${vRegRate.toFixed(1)}%`, reference: `${avgStoreRegistration.toFixed(1)}%`,
          variation: `${(vRegRate - avgStoreRegistration).toFixed(1)}%`, level: 'high', icon: UserMinus
        });
      }
    });

    const cancelRate = (data.filter(s => s.is_cancelada).length / data.length) * 100;
    if (cancelRate > 5) {
      list.push({
        type: 'Pico Cancelamento', indicator: 'Taxa Loja', value: `${cancelRate.toFixed(1)}%`,
        reference: '3.0%', variation: `+${(cancelRate - 3).toFixed(1)}%`, level: 'high', icon: AlertTriangle
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
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <Card className={cn("ri-card border-none overflow-hidden shadow-lg", healthStatus.bg)}>
        <CardContent className="p-6 md:p-8 flex items-center gap-6">
          <div className={cn("p-4 rounded-full bg-white shadow-sm", healthStatus.color)}>
            <healthStatus.icon className="w-10 h-10 md:w-12 md:h-12" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Saúde Operacional</p>
            <h2 className={cn("text-2xl md:text-4xl font-black leading-none", healthStatus.color)}>{healthStatus.label}</h2>
            <p className="text-[11px] font-medium text-slate-500 truncate">{alerts.length} alertas detectados.</p>
          </div>
          <Badge className="hidden sm:inline-flex bg-white text-slate-600 border-none font-black px-4 py-2 text-xs rounded-xl shadow-sm">
            {alerts.filter(a => a.level === 'high').length} RISCOS ALTOS
          </Badge>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="px-2">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4" /> Alertas Ativos
          </h3>
          <div className="bg-orange-50/50 border-l-4 border-orange-400 p-4 rounded-r-xl flex gap-3 items-start">
            <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-orange-800/70 font-medium leading-relaxed uppercase">Os alertas sinalizam desvios estatísticos em relação à média da unidade, servindo para direcionar treinamentos.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {alerts.map((alert, i) => (
            <Card key={i} className="ri-card border-none bg-white p-4 space-y-4 relative overflow-hidden group hover:shadow-md transition-all">
              <div className={cn("absolute top-0 left-0 w-1 h-full", alert.level === 'high' ? "bg-rose-500" : "bg-orange-400")} />
              <div className="flex justify-between items-start">
                <div className={cn("p-2 rounded-lg bg-slate-50", alert.level === 'high' ? "text-rose-500" : "text-orange-500")}><alert.icon className="w-5 h-5" /></div>
                <Badge className={cn("text-[8px] font-black uppercase px-2 h-4", alert.level === 'high' ? "bg-rose-500 text-white" : "bg-orange-100 text-orange-700")}>
                  {alert.level === 'high' ? 'ALTO' : 'MÉDIO'}
                </Badge>
              </div>
              <div className="space-y-1">
                <h4 className="text-[11px] font-black text-slate-800 uppercase leading-none truncate">{alert.type}</h4>
                {alert.collaborator && <p className="text-[9px] font-bold text-slate-400 uppercase truncate">{alert.collaborator}</p>}
              </div>
              <div className="pt-3 border-t grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Valor</p>
                  <p className="text-[11px] font-black text-slate-700">{alert.value}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Variação</p>
                  <span className={cn("text-[11px] font-black flex items-center justify-end gap-1 leading-none", alert.level === 'high' ? "text-rose-600" : "text-orange-600")}>
                    {alert.variation} <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </Card>
          ))}
          {alerts.length === 0 && <div className="col-span-full py-12 text-center text-slate-400 font-bold uppercase text-xs">Nenhum comportamento anômalo detectado.</div>}
        </div>
      </div>
    </div>
  );
}
