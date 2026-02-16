"use client";

import React, { useMemo } from "react";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  FileText, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Smartphone, 
  ArrowRightLeft, 
  LayoutDashboard,
  ShieldAlert,
  Search,
  ArrowRight,
  Target,
  UserCheck,
  Ban
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, min, max } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UploadDiagnosisProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
  onConfirm: () => void;
}

export function UploadDiagnosis({ data, vinculos, onConfirm }: UploadDiagnosisProps) {
  const stats = useMemo(() => {
    const saidas = data.filter(r => r.tpNF === 1 && !r.is_cancelada);
    const canceladas = data.filter(r => r.is_cancelada);
    const entries = data.filter(r => r.tpNF === 0 || r.is_devolucao);
    
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
    
    // Tipos detectados
    const pickups = saidas.filter(r => r.canal === "RETIRADA_ONLINE").length;
    const adicionais = saidas.filter(r => r.is_adicional || r.is_adicional_suspeito).length;
    const trocas = saidas.filter(r => r.is_troca).length;

    // Alertas
    const alerts: string[] = [];
    if (canceladas.length > data.length * 0.05) alerts.push("Alta taxa de cancelamento detectada.");
    if (cupons > 0 && identPerc < 75) alerts.push("Baixa identificação de clientes no período.");
    if (data.some(r => !r.protocolo)) alerts.push("Notas sem protocolo SEFAZ identificadas.");
    
    // Inconsistências de Troca
    const unlinkedExchanges = saidas.filter(r => r.is_troca && !vinculos.some(v => v.chave_saida === r.chave)).length;
    if (unlinkedExchanges > 0) alerts.push(`${unlinkedExchanges} trocas não puderam ser vinculadas automaticamente.`);

    // Saúde
    let health: 'healthy' | 'attention' | 'critical' = 'healthy';
    if (pa < 1.8 || identPerc < 80) health = 'attention';
    if (pa < 1.5 || identPerc < 70) health = 'critical';

    return {
      startDate, endDate, vTotal, cupons, itens, pa, identPerc,
      pickups, adicionais, trocas, canceladas: canceladas.length,
      alerts, health, unlinkedExchanges
    };
  }, [data, vinculos]);

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-10 animate-in zoom-in-95 duration-500 max-w-4xl mx-auto py-4 md:py-10">
      {/* Header Diagnóstico */}
      <div className="text-center space-y-6">
        <div className={cn(
          "inline-flex items-center gap-3 px-8 py-3 rounded-full font-black text-sm md:text-base border-2 shadow-sm",
          stats.health === 'healthy' ? "bg-emerald-50 border-emerald-200 text-emerald-600" :
          stats.health === 'attention' ? "bg-amber-50 border-amber-200 text-amber-600" :
          "bg-rose-50 border-rose-200 text-rose-600"
        )}>
          {stats.health === 'healthy' ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          SAÚDE DO PERÍODO: {stats.health === 'healthy' ? 'SAUDÁVEL' : stats.health === 'attention' ? 'ATENÇÃO' : 'CRÍTICO'}
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tighter uppercase leading-tight">Diagnóstico Inicial</h2>
        <div className="flex items-center justify-center gap-3 text-slate-400 font-bold uppercase text-[11px] md:text-xs tracking-[0.2em]">
          <Calendar className="w-4 h-4" />
          {format(stats.startDate, "dd/MM/yyyy")} — {format(stats.endDate, "dd/MM/yyyy")}
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <SummaryCard 
          label="Faturamento Total" 
          value={formatBRL(stats.vTotal)} 
          subValue={`${stats.cupons} Cupons Processados`}
          icon={TrendingUp} 
          color="text-orange-500" 
        />
        <SummaryCard 
          label="PA Médio Detectado" 
          value={stats.pa.toFixed(2)} 
          subValue={`${stats.itens} Peças Totais`}
          icon={Target} 
          color="text-sky-500" 
        />
        <SummaryCard 
          label="Identificação (CPF)" 
          value={`${stats.identPerc.toFixed(1)}%`} 
          subValue={`${stats.identPerc > 85 ? 'Excelente performance' : 'Pode melhorar'}`}
          icon={UserCheck} 
          color="text-emerald-500" 
        />
      </div>

      {/* Mix do Período */}
      <Card className="ri-card overflow-hidden border-none shadow-xl bg-white">
        <div className="bg-slate-50/80 p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-[11px] md:text-xs font-black uppercase text-slate-500 tracking-[0.1em]">Composição Detectada</h3>
          <Badge variant="outline" className="bg-white text-slate-400 font-black px-3 py-1 text-[10px] uppercase">{data.length} Notas Totais</Badge>
        </div>
        <CardContent className="p-6 md:p-10 grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          <MixItem label="Retiradas Online" value={stats.pickups} icon={Smartphone} color="text-sky-500" />
          <MixItem label="Vendas Adicionais" value={stats.adicionais} icon={TrendingUp} color="text-emerald-500" />
          <MixItem label="Atend. Troca" value={stats.trocas} icon={ArrowRightLeft} color="text-purple-500" />
          <MixItem label="Canceladas" value={stats.canceladas} icon={Ban} color="text-rose-500" />
        </CardContent>
      </Card>

      {/* Alertas e Inconsistências */}
      {stats.alerts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest px-4">Alertas de Processamento</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.alerts.map((alert, i) => (
              <div key={i} className="flex items-center gap-4 p-5 bg-orange-50/50 border-l-4 border-orange-400 rounded-r-2xl shadow-sm">
                <AlertTriangle className="w-6 h-6 text-orange-500 shrink-0" />
                <span className="text-[13px] font-bold text-orange-900 leading-snug">{alert}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA Final */}
      <div className="flex flex-col items-center gap-6 pt-10">
        <Button 
          onClick={onConfirm}
          className="bg-orange-500 hover:bg-orange-600 text-white font-black rounded-[1.5rem] h-16 md:h-20 px-12 md:px-20 text-lg md:text-xl shadow-2xl shadow-orange-200 gap-4 group w-full sm:w-auto transition-all hover:scale-[1.02]"
        >
          ACESSAR DASHBOARD COMPLETO
          <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
        </Button>
        <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-[0.2em] text-center">Todos os dados foram validados conforme padrão SEFAZ</p>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, subValue, icon: Icon, color }: any) {
  return (
    <Card className="ri-card border-none bg-white p-6 md:p-8 flex flex-col gap-6 shadow-sm hover:shadow-md transition-shadow">
      <div className={cn("p-4 rounded-2xl bg-slate-50 w-fit", color)}>
        <Icon className="w-7 h-7 md:w-8 md:h-8" />
      </div>
      <div className="space-y-1">
        <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{label}</p>
        <p className="text-2xl md:text-3xl font-black text-slate-800 tracking-tighter leading-none">{value}</p>
        <p className="text-[10px] md:text-xs font-bold text-slate-400 pt-2">{subValue}</p>
      </div>
    </Card>
  );
}

function MixItem({ label, value, icon: Icon, color }: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-xl bg-slate-50", color)}>
          <Icon className="w-4 h-4 md:w-5 md:h-5" />
        </div>
        <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-tight">{label}</span>
      </div>
      <p className="text-2xl md:text-3xl font-black text-slate-700 leading-none">{value}</p>
    </div>
  );
}
