"use client";

import React, { useMemo, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Smartphone, 
  ArrowRightLeft, 
  ShieldAlert,
  ArrowRight,
  Target,
  UserCheck,
  Ban,
  Store,
  MessageCircle,
  ShoppingCart,
  Package,
  Activity,
  Layers
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, min, max } from "date-fns";

interface UploadDiagnosisProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
  onConfirm: () => void;
}

const getChannelIcon = (canal: string) => {
  const c = canal.toUpperCase();
  if (c.includes("WHATSAPP") || c.includes("DIGITAL")) return MessageCircle;
  if (c.includes("E-COMMERCE") || c.includes("ONLINE") || c.includes("SITE")) return ShoppingCart;
  if (c.includes("RETIRADA")) return Package;
  return Store;
};

const getChannelColor = (index: number) => {
  const colors = [
    "bg-indigo-50 text-indigo-600 border-indigo-100",
    "bg-emerald-50 text-emerald-600 border-emerald-100",
    "bg-amber-50 text-amber-600 border-amber-100",
    "bg-sky-50 text-sky-600 border-sky-100",
    "bg-purple-50 text-purple-600 border-purple-100",
    "bg-rose-50 text-rose-600 border-rose-100"
  ];
  return colors[index % colors.length];
};

export function UploadDiagnosis({ data, vinculos, onConfirm }: UploadDiagnosisProps) {
  const [headerElement, setHeaderElement] = useState<Element | null>(null);

  useEffect(() => {
    setHeaderElement(document.getElementById("header-actions"));
  }, []);

  const stats = useMemo(() => {
    const saidas = data.filter(r => r.tpNF === 1 && !r.is_cancelada);
    const canceladas = data.filter(r => r.is_cancelada);
    
    // Datas
    const dates = saidas.map(r => parseISO(r.dhEmi)).filter(d => !isNaN(d.getTime()));
    const startDate = dates.length > 0 ? min(dates) : new Date();
    const endDate = dates.length > 0 ? max(dates) : new Date();

    // Valores e KPIs
    const vTotal = saidas.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
    const cupons = saidas.length;
    const itens = saidas.reduce((acc, r) => acc + parseFloat(r.itens_qtd), 0);
    const idenCount = saidas.filter(r => r.cpf_cnpj_dest).length;
    
    const pa = cupons > 0 ? itens / cupons : 0;
    const identPerc = cupons > 0 ? (idenCount / cupons) * 100 : 0;
    const tm = cupons > 0 ? vTotal / cupons : 0;
    
    // Canais
    const channelMap = new Map<string, { vTotal: number; count: number, itens: number }>();
    saidas.forEach(r => {
      const c = r.canal || "LOJA FÍSICA";
      const existing = channelMap.get(c) || { vTotal: 0, count: 0, itens: 0 };
      existing.vTotal += parseFloat(r.vNF);
      existing.count += 1;
      existing.itens += parseFloat(r.itens_qtd);
      channelMap.set(c, existing);
    });

    const channels = Array.from(channelMap.entries()).map(([name, metrics]) => ({
      name,
      ...metrics,
      perc: vTotal > 0 ? (metrics.vTotal / vTotal) * 100 : 0,
      pa: metrics.count > 0 ? metrics.itens / metrics.count : 0,
      tm: metrics.count > 0 ? metrics.vTotal / metrics.count : 0
    })).sort((a, b) => b.vTotal - a.vTotal);

    // Tipos detectados (Insights extras)
    const pickups = saidas.filter(r => r.canal === "RETIRADA_ONLINE").length;
    const adicionais = saidas.filter(r => r.is_adicional || r.is_adicional_suspeito).length;
    const trocas = saidas.filter(r => r.is_troca).length;

    // Alertas
    const alerts: string[] = [];
    if (canceladas.length > data.length * 0.05) alerts.push(`Alta taxa de cancelamento (${canceladas.length} notas).`);
    if (cupons > 0 && identPerc < 75) alerts.push("Baixa identificação de clientes no período.");
    if (data.some(r => !r.protocolo)) alerts.push("Notas sem protocolo SEFAZ identificadas.");
    
    // Inconsistências de Troca
    const unlinkedExchanges = saidas.filter(r => r.is_troca && !vinculos.some(v => v.chave_saida === r.chave)).length;
    if (unlinkedExchanges > 0) alerts.push(`${unlinkedExchanges} trocas sem vínculo automático.`);

    // Saúde
    let health: 'healthy' | 'attention' | 'critical' = 'healthy';
    if (pa < 1.8 || identPerc < 80) health = 'attention';
    if (pa < 1.5 || identPerc < 70) health = 'critical';

    return {
      startDate, endDate, vTotal, cupons, itens, pa, tm, identPerc,
      channels, pickups, adicionais, trocas, canceladas: canceladas.length,
      alerts, health, unlinkedExchanges
    };
  }, [data, vinculos]);

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const headerContent = (
    <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 animate-in fade-in zoom-in duration-500">
      <div className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-black text-[9px] md:text-[10px] uppercase tracking-widest border",
        stats.health === 'healthy' ? "bg-emerald-50 border-emerald-200 text-emerald-600" :
        stats.health === 'attention' ? "bg-amber-50 border-amber-200 text-amber-600" :
        "bg-rose-50 border-rose-200 text-rose-600"
      )}>
        {stats.health === 'healthy' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
        SAÚDE: {stats.health === 'healthy' ? 'SAUDÁVEL' : stats.health === 'attention' ? 'ATENÇÃO' : 'CRÍTICA'}
      </div>
      <div className="hidden md:flex items-center gap-2 text-slate-500 font-bold uppercase text-[10px] tracking-widest border-l pl-4 border-slate-200">
        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
        {format(stats.startDate, "dd/MM/yy")} - {format(stats.endDate, "dd/MM/yy")}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700 w-full h-full flex flex-col py-2">
      {headerElement && createPortal(headerContent, headerElement)}

      {/* Top Row: Visão Global KPIs */}
      <div className="shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500" /> Visão Global
          </h3>
        </div>
        {/* Adjusted for mobile: 1 col on XS, 2 on SM, 4 on LG */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard label="Faturamento Total" value={formatBRL(stats.vTotal)} subValue={`${stats.cupons} vendas`} icon={TrendingUp} color="text-emerald-500" />
          <SummaryCard label="PA Médio Global" value={stats.pa.toFixed(2)} subValue={`${stats.itens} peças`} icon={Target} color="text-sky-500" />
          <SummaryCard label="Ticket Médio" value={formatBRL(stats.tm)} subValue="Média por venda" icon={ShoppingCart} color="text-indigo-500" />
          <SummaryCard label="Identificação" value={`${stats.identPerc.toFixed(1)}%`} subValue="CPFs na nota" icon={UserCheck} color="text-purple-500" />
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Canais */}
        <div className={cn("flex flex-col min-h-0", stats.alerts.length > 0 ? "lg:col-span-9" : "lg:col-span-12")}>
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest flex items-center gap-2 mb-3 shrink-0">
            <Layers className="w-4 h-4 text-indigo-500" /> Desempenho por Canal
          </h3>
          <div className={cn(
            "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 overflow-y-auto pr-2 pb-2",
            stats.alerts.length > 0 ? "xl:grid-cols-4" : "xl:grid-cols-4 2xl:grid-cols-6"
          )}>
            {stats.channels.map((channel, i) => {
              const Icon = getChannelIcon(channel.name);
              const colorClass = getChannelColor(i);
              
              return (
                <Card key={channel.name} className="relative overflow-hidden group hover:shadow-md hover:shadow-indigo-500/10 transition-all border-slate-100 rounded-2xl h-full flex flex-col">
                  <div className="p-4 flex flex-col h-full justify-between">
                    <div className="flex items-center justify-between mb-4">
                      <div className={cn("p-2 rounded-xl flex items-center gap-2 border shadow-sm", colorClass)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <Badge variant="outline" className="bg-slate-50 text-slate-500 font-bold text-[9px] uppercase border-slate-200">
                        {channel.perc.toFixed(1)}% Total
                      </Badge>
                    </div>
                    
                    <div className="mb-3">
                      <p className="font-black text-[10px] md:text-xs uppercase tracking-wider text-slate-600 mb-1 line-clamp-1">{channel.name}</p>
                      <p className="text-lg md:text-xl font-black text-slate-800 leading-none mb-1">{formatBRL(channel.vTotal)}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{channel.count} VENDAS</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 mt-auto">
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">PA Médio</p>
                        <p className="text-xs font-bold text-slate-700">{channel.pa.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Ticket</p>
                        <p className="text-xs font-bold text-slate-700">{formatBRL(channel.tm)}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
            
            {/* Bloco de Métricas Operacionais - Ocupa o 6º slot perfeitamente */}
            <Card className="relative overflow-hidden transition-all border-slate-100 rounded-2xl h-full flex flex-col bg-slate-50/50">
              <div className="p-4 flex flex-col justify-center h-full gap-4">
                 <InsightItem label="Retiradas" value={stats.pickups} icon={Smartphone} color="text-sky-500" />
                 <InsightItem label="V. Adicionais" value={stats.adicionais} icon={TrendingUp} color="text-emerald-500" />
                 <InsightItem label="Trocas" value={stats.trocas} icon={ArrowRightLeft} color="text-purple-500" />
                 <InsightItem label="Canceladas" value={stats.canceladas} icon={Ban} color="text-rose-500" />
              </div>
            </Card>
          </div>
        </div>

        {/* Alertas Sidebar (Somente aparece se houver alertas) */}
        {stats.alerts.length > 0 && (
          <div className="lg:col-span-3 flex flex-col gap-4 overflow-y-auto pr-1">
            <div className="space-y-2 shrink-0">
              <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest px-1">Alertas Identificados</h3>
              <div className="flex flex-col gap-1.5">
                {stats.alerts.slice(0, 4).map((alert, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 bg-rose-50/80 border-l-4 border-rose-500 rounded-r-xl shadow-sm">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="text-[10px] font-bold text-rose-900 leading-tight">{alert}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CTA Final */}
      <div className="flex flex-col items-center gap-3 pt-4 shrink-0 border-t border-slate-100">
        <Button 
          onClick={onConfirm}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl h-12 md:h-14 px-10 md:px-20 text-sm md:text-base shadow-xl shadow-indigo-500/20 gap-3 group w-full md:w-auto transition-all hover:scale-[1.02]"
        >
          ACESSAR DASHBOARD COMPLETO
          <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
        </Button>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, subValue, icon: Icon, color }: any) {
  return (
    <Card className="p-3 md:p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-all rounded-2xl border-slate-100 bg-white">
      <div className={cn("p-2.5 rounded-xl bg-slate-50 shrink-0", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-sm md:text-lg font-black text-slate-800 leading-none mb-1 truncate">{value}</p>
        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">{subValue}</p>
      </div>
    </Card>
  );
}

function InsightItem({ label, value, icon: Icon, color }: any) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("p-1.5 md:p-2 rounded-lg bg-white shadow-sm shrink-0", color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm md:text-xl font-black text-slate-700 leading-none mb-0.5">{value}</p>
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider truncate block">{label}</span>
      </div>
    </div>
  );
}
