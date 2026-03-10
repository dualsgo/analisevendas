
"use client";

import React, { useMemo } from "react";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CloudUpload,
  Loader2,
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
import { useSalesProcessor } from "@/hooks/useSalesProcessor";
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
    if (unlinkedExchanges > 0) alerts.push(`${unlinkedExchanges} trocas sem vínculo automático.`);

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
    <div className="space-y-6 md:space-y-8 animate-in zoom-in-95 duration-500 max-w-5xl mx-auto py-2 md:py-6 h-full flex flex-col">
      {/* Header Diagnóstico */}
      <div className="text-center space-y-3 shrink-0">
        <div className={cn(
          "inline-flex items-center gap-2 px-6 py-2 rounded-full font-black text-sm md:text-base border-2 shadow-sm",
          stats.health === 'healthy' ? "bg-emerald-50 border-emerald-200 text-emerald-600" :
          stats.health === 'attention' ? "bg-amber-50 border-amber-200 text-amber-600" :
          "bg-rose-50 border-rose-200 text-rose-600"
        )}>
          {stats.health === 'healthy' ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          SAÚDE: {stats.health === 'healthy' ? 'SAUDÁVEL' : stats.health === 'attention' ? 'ATENÇÃO' : 'CRÍTICO'}
        </div>
        <h2 className="text-2xl md:text-5xl font-black text-slate-800 tracking-tighter uppercase leading-tight">Diagnóstico Inicial</h2>
        <div className="flex items-center justify-center gap-2 text-slate-400 font-bold uppercase text-xs md:text-sm tracking-widest">
          <Calendar className="w-4 h-4" />
          {format(stats.startDate, "dd/MM/yyyy")} — {format(stats.endDate, "dd/MM/yyyy")}
        </div>
      </div>

      {/* Cards de Resumo e Mix */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0">
        <div className="md:col-span-4 space-y-4">
          <SummaryCard label="Faturamento" value={formatBRL(stats.vTotal)} subValue={`${stats.cupons} cupons`} icon={TrendingUp} color="text-orange-500" />
          <SummaryCard label="PA Médio" value={stats.pa.toFixed(2)} subValue={`${stats.itens} peças`} icon={Target} color="text-sky-500" />
          <SummaryCard label="Fidelização" value={`${stats.identPerc.toFixed(1)}%`} subValue="Identificação CPF" icon={UserCheck} color="text-emerald-500" />
        </div>

        <div className="md:col-span-8 flex flex-col gap-6">
          <Card className="ri-card overflow-hidden flex-1 flex flex-col">
            <div className="bg-slate-50/80 p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase text-slate-500 tracking-widest">Composição</h3>
              <Badge variant="outline" className="bg-white text-slate-400 font-bold px-2 py-0.5 text-[10px] uppercase">{data.length} notas</Badge>
            </div>
            <div className="p-6 md:p-8 grid grid-cols-2 gap-y-8 gap-x-12 my-auto">
              <MixItem label="Retiradas Online" value={stats.pickups} icon={Smartphone} color="text-sky-500" />
              <MixItem label="Vendas Adicionais" value={stats.adicionais} icon={TrendingUp} color="text-emerald-500" />
              <MixItem label="Atend. Troca" value={stats.trocas} icon={ArrowRightLeft} color="text-purple-500" />
              <MixItem label="Canceladas" value={stats.canceladas} icon={Ban} color="text-rose-500" />
            </div>
          </Card>

          {stats.alerts.length > 0 && (
            <div className="space-y-2 shrink-0">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Alertas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {stats.alerts.slice(0, 4).map((alert, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-orange-50/50 border-l-4 border-orange-400 rounded-r-xl shadow-sm">
                    <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                    <span className="text-xs font-medium text-orange-900 leading-tight truncate">{alert}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CTA Final */}
      <div className="flex flex-col items-center gap-6 pt-4 shrink-0 border-t border-slate-100">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Button 
            onClick={onConfirm}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl h-14 md:h-16 px-12 md:px-20 text-base md:text-lg shadow-xl shadow-indigo-200 gap-3 group w-full sm:w-auto transition-all hover:scale-[1.02]"
          >
            ACESSAR DASHBOARD COMPLETO
            <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
          </Button>
        </div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">
          DADOS VALIDADOS CONFORME PADRÃO SEFAZ • ANÁLISE EM TEMPO REAL
        </p>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, subValue, icon: Icon, color }: any) {
  return (
    <Card className="ri-card p-4 md:p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={cn("p-2.5 rounded-xl bg-slate-50 shrink-0", color)}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-lg md:text-2xl font-black text-slate-800 leading-none truncate">{value}</p>
        <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase">{subValue}</p>
      </div>
    </Card>
  );
}

function MixItem({ label, value, icon: Icon, color }: any) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className={cn("p-1.5 rounded-lg bg-slate-50", color)}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate">{label}</span>
      </div>
      <p className="text-2xl md:text-3xl font-black text-slate-700 leading-none">{value}</p>
    </div>
  );
}
