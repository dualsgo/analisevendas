"use client";

import React, { useState } from "react";
import { TeamDispersionStats, CollaboratorExtendedStats } from "@/lib/advanced-collaborator-analytics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ResponsiveContainer, 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis, 
  Tooltip as RechartsTooltip, 
  Cell, 
  ReferenceLine 
} from "recharts";
import { 
  Users, 
  Target, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Award, 
  AlertTriangle, 
  Scale, 
  Info, 
  CheckCircle2, 
  ShoppingBag,
  Heart,
  Tag,
  ArrowRight,
  ShieldCheck,
  Flame,
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CollaboratorTeamDispersionProps {
  dispersionStats: TeamDispersionStats;
  selectedVendor: string;
  onSelectVendor: (vendor: string) => void;
}

const QUADRANT_COLORS = {
  ESTRELA: "#10b981", // Emerald
  SNIPER: "#6366f1", // Indigo
  VELOCISTA: "#3b82f6", // Blue
  MENTORIA: "#f59e0b", // Amber
};

export function CollaboratorTeamDispersion({
  dispersionStats,
  selectedVendor,
  onSelectVendor
}: CollaboratorTeamDispersionProps) {
  const [filterQuadrant, setFilterQuadrant] = useState<string>("ALL");
  const [scatterMode, setScatterMode] = useState<"DAILY" | "TOTAL">("DAILY");

  const { collaborators, teamMeans, quadrantCounts, outliersSummary } = dispersionStats;

  const formatBRL = (val?: number | string | null) =>
    (Number(val) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const formatNum = (val?: number | string | null, precision = 2) =>
    (Number(val) || 0).toLocaleString("pt-BR", { minimumFractionDigits: precision, maximumFractionDigits: precision });

  // Filtragem dos colaboradores para exibição na tabela e gráfico
  const filteredList = collaborators.filter(c => {
    if (filterQuadrant === "ALL") return true;
    return c.quadrantKey === filterQuadrant;
  });

  // Preparar dados do Scatter Chart
  const scatterData = collaborators.map(c => ({
    name: c.name,
    x: scatterMode === "DAILY" ? Number(c.cuponsPorDia.toFixed(1)) : c.cuponsTotal,
    y: Number(c.pa.toFixed(2)),
    z: scatterMode === "DAILY" ? Number(c.vendaPorDia.toFixed(0)) : c.vendaTotal,
    vendaDia: c.vendaPorDia,
    vendaTotal: c.vendaTotal,
    cuponsDia: c.cuponsPorDia,
    cuponsTotal: c.cuponsTotal,
    pa: c.pa,
    tkm: c.tkm,
    jScore: c.jScore,
    quadrantKey: c.quadrantKey,
    quadrantName: c.quadrantName,
    metaPonderadaPA: c.metaPonderadaPA,
    isSelected: c.name === selectedVendor
  }));

  const xMean = scatterMode === "DAILY" ? teamMeans.cuponsPorDia : teamMeans.cuponsPorDia * 10;
  const yMean = teamMeans.pa;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* CABEÇALHO PEDAGÓGICO DE DISPERSÃO E COMPARAÇÃO JUSTA */}
      <Card className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white border-none shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 blur-[100px] pointer-events-none" />
        <CardHeader className="p-6 md:p-8 pb-4 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider border border-indigo-500/30">
                <Scale className="w-4 h-4 text-indigo-400" />
                Matriz de Dispersão e Justiça Avaliativa
              </div>
              <CardTitle className="text-2xl md:text-3xl font-headline font-extrabold text-white flex items-center gap-2.5">
                Comparação Justa da Equipe (4 Quadrantes)
              </CardTitle>
              <CardDescription className="text-xs md:text-sm text-slate-300 font-medium max-w-3xl">
                Avaliamos a equipe cruzando <strong>Ritmo de Giro Diário</strong> (eixo X) com <strong>Profundidade de Cesta / PA</strong> (eixo Y). O tamanho de cada bolha representa a produtividade diária em faturamento.
              </CardDescription>
            </div>

            {/* TOGGLE DE MODO DIÁRIO VS TOTAL */}
            <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl p-2 border border-slate-700 flex items-center gap-1.5 self-start md:self-auto">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setScatterMode("DAILY")}
                className={cn(
                  "text-xs font-bold rounded-xl h-8 px-3 transition-all",
                  scatterMode === "DAILY" 
                    ? "bg-indigo-600 text-white shadow-sm" 
                    : "text-slate-400 hover:text-white"
                )}
              >
                ⚖️ Por Dia Trabalhado (Mais Justo)
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setScatterMode("TOTAL")}
                className={cn(
                  "text-xs font-bold rounded-xl h-8 px-3 transition-all",
                  scatterMode === "TOTAL" 
                    ? "bg-indigo-600 text-white shadow-sm" 
                    : "text-slate-400 hover:text-white"
                )}
              >
                📦 Volume Total Acumulado
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* 4 CARDS DE QUADRANTES INTERATIVOS (FILTROS) */}
        <CardContent className="p-6 md:p-8 pt-2 space-y-6 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* QUADRANTE 1: ESTRELAS */}
            <button
              onClick={() => setFilterQuadrant(filterQuadrant === "ESTRELA" ? "ALL" : "ESTRELA")}
              className={cn(
                "p-4 rounded-2xl border text-left transition-all relative overflow-hidden group",
                filterQuadrant === "ESTRELA" 
                  ? "bg-emerald-950/60 border-emerald-500 shadow-md ring-2 ring-emerald-500/50" 
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Estrelas de Impacto
                </span>
                <Badge className="bg-emerald-500/20 text-emerald-300 font-extrabold text-xs">
                  {quadrantCounts.ESTRELA} colab.
                </Badge>
              </div>
              <p className="text-xs text-slate-300 mt-2 line-clamp-2">
                Alto giro diário + Alto PA. Referências da loja em velocidade e técnica.
              </p>
            </button>

            {/* QUADRANTE 2: SNIPERS */}
            <button
              onClick={() => setFilterQuadrant(filterQuadrant === "SNIPER" ? "ALL" : "SNIPER")}
              className={cn(
                "p-4 rounded-2xl border text-left transition-all relative overflow-hidden group",
                filterQuadrant === "SNIPER" 
                  ? "bg-indigo-950/60 border-indigo-500 shadow-md ring-2 ring-indigo-500/50" 
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  Snipers Consultivos
                </span>
                <Badge className="bg-indigo-500/20 text-indigo-300 font-extrabold text-xs">
                  {quadrantCounts.SNIPER} colab.
                </Badge>
              </div>
              <p className="text-xs text-slate-300 mt-2 line-clamp-2">
                Alto PA com menor giro. Atendimento aprofundado e ticket elevado.
              </p>
            </button>

            {/* QUADRANTE 3: VELOCISTAS */}
            <button
              onClick={() => setFilterQuadrant(filterQuadrant === "VELOCISTA" ? "ALL" : "VELOCISTA")}
              className={cn(
                "p-4 rounded-2xl border text-left transition-all relative overflow-hidden group",
                filterQuadrant === "VELOCISTA" 
                  ? "bg-blue-950/60 border-blue-500 shadow-md ring-2 ring-blue-500/50" 
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  Giro Rápido (Caixa/Porta)
                </span>
                <Badge className="bg-blue-500/20 text-blue-300 font-extrabold text-xs">
                  {quadrantCounts.VELOCISTA} colab.
                </Badge>
              </div>
              <p className="text-xs text-slate-300 mt-2 line-clamp-2">
                Alto giro com PA mais baixo. Foco em conversão ágil e potencial de adicionar +1 item.
              </p>
            </button>

            {/* QUADRANTE 4: MENTORIA */}
            <button
              onClick={() => setFilterQuadrant(filterQuadrant === "MENTORIA" ? "ALL" : "MENTORIA")}
              className={cn(
                "p-4 rounded-2xl border text-left transition-all relative overflow-hidden group",
                filterQuadrant === "MENTORIA" 
                  ? "bg-amber-950/60 border-amber-500 shadow-md ring-2 ring-amber-500/50" 
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Zona de Mentoria
                </span>
                <Badge className="bg-amber-500/20 text-amber-300 font-extrabold text-xs">
                  {quadrantCounts.MENTORIA} colab.
                </Badge>
              </div>
              <p className="text-xs text-slate-300 mt-2 line-clamp-2">
                Abaixo da média em giro e PA. Oportunidade imediata de acompanhamento e suporte.
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* GRÁFICO DE DISPERSÃO (SCATTER PLOT) */}
      <Card className="bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/50 pb-4">
          <div>
            <CardTitle className="text-lg font-headline font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Mapeamento Visual de Dispersão da Equipe
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Clique em qualquer bolha para selecionar o colaborador. As linhas tracejadas marcam as médias da loja.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[11px] font-bold">
              Média Giro: {teamMeans.cuponsPorDia.toFixed(1)} cup./dia
            </Badge>
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[11px] font-bold">
              Média PA: {teamMeans.pa.toFixed(2)} PA
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="h-[420px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 25, left: 10 }}>
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name={scatterMode === "DAILY" ? "Cupons por Dia" : "Total de Cupons"} 
                  unit={scatterMode === "DAILY" ? " cup/dia" : " cupons"}
                  tick={{ fontSize: 11, fontWeight: 600 }}
                  label={{ 
                    value: scatterMode === "DAILY" ? "Ritmo de Atendimento (Cupons / Dia Trabalhado)" : "Volume Total de Atendimentos (Cupons)", 
                    position: "insideBottom", 
                    offset: -15, 
                    fontSize: 12,
                    fontWeight: 700,
                    fill: "#64748b"
                  }}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name="PA (Peças por Atendimento)" 
                  unit=" PA"
                  tick={{ fontSize: 11, fontWeight: 600 }}
                  domain={['dataMin - 0.2', 'dataMax + 0.3']}
                  label={{ 
                    value: "Profundidade de Cesta (PA Realizado)", 
                    angle: -90, 
                    position: "insideLeft", 
                    offset: 0,
                    fontSize: 12,
                    fontWeight: 700,
                    fill: "#64748b"
                  }}
                />
                <ZAxis 
                  type="number" 
                  dataKey="z" 
                  range={[120, 900]} 
                  name="Faturamento" 
                />
                <RechartsTooltip 
                  cursor={{ strokeDasharray: '3 3', stroke: '#94a3b8' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-xl border border-slate-700 text-xs space-y-2 min-w-[240px]">
                          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                            <span className="font-extrabold text-sm text-white">{data.name}</span>
                            <Badge className={cn("text-[10px] font-bold border-none px-2", 
                              data.quadrantKey === "ESTRELA" && "bg-emerald-500/30 text-emerald-300",
                              data.quadrantKey === "SNIPER" && "bg-indigo-500/30 text-indigo-300",
                              data.quadrantKey === "VELOCISTA" && "bg-blue-500/30 text-blue-300",
                              data.quadrantKey === "MENTORIA" && "bg-amber-500/30 text-amber-300"
                            )}>
                              {data.quadrantName}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-slate-200">
                            <div className="flex justify-between">
                              <span className="text-slate-400">J-Score (Justiça):</span>
                              <span className="font-bold text-amber-300">{data.jScore} / 100</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">PA Realizado:</span>
                              <span className="font-bold text-white">{(data.pa ?? 0).toFixed(2)} (Meta: {(data.metaPonderadaPA ?? 0).toFixed(2)})</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Ritmo / Dia:</span>
                              <span className="font-bold text-white">{(data.cuponsDia ?? 0).toFixed(1)} cupons/dia</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Ticket Médio (TKM):</span>
                              <span className="font-bold text-emerald-300">{formatBRL(data.tkm)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Venda / Dia:</span>
                              <span className="font-bold text-indigo-300">R$ {formatNum(data.vendaDia)}</span>
                            </div>
                          </div>
                          <div className="pt-2 border-t border-slate-800 text-[10px] text-indigo-300 italic">
                            💡 Clique para abrir o Raio-X detalhado
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* LINHAS DE REFERÊNCIA DAS MÉDIAS (CRUZAMENTO DOS 4 QUADRANTES) */}
                <ReferenceLine 
                  x={xMean} 
                  stroke="#94a3b8" 
                  strokeDasharray="4 4" 
                  strokeWidth={1.5}
                  label={{ value: `Média Giro (${xMean.toFixed(1)})`, fill: '#64748b', fontSize: 10, position: 'top' }} 
                />
                <ReferenceLine 
                  y={yMean} 
                  stroke="#94a3b8" 
                  strokeDasharray="4 4" 
                  strokeWidth={1.5}
                  label={{ value: `Média PA (${yMean.toFixed(2)})`, fill: '#64748b', fontSize: 10, position: 'right' }} 
                />
                <Scatter 
                  name="Colaboradores" 
                  data={scatterData} 
                  onClick={(entry) => onSelectVendor(entry.name)}
                  className="cursor-pointer"
                >
                  {scatterData.map((entry, index) => {
                    const color = QUADRANT_COLORS[entry.quadrantKey] || "#6366f1";
                    const isSelected = entry.isSelected;
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={color} 
                        stroke={isSelected ? "#ffffff" : color}
                        strokeWidth={isSelected ? 4 : 1}
                        fillOpacity={isSelected ? 1.0 : 0.85}
                        className="transition-all hover:scale-110 hover:opacity-100"
                      />
                    );
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* LEGENDA INFORMATIVA DOS QUADRANTES */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-semibold text-slate-700">Estrelas (+Giro / +PA)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-indigo-500 shrink-0" />
              <span className="font-semibold text-slate-700">Snipers (-Giro / +PA)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-blue-500 shrink-0" />
              <span className="font-semibold text-slate-700">Velocistas (+Giro / -PA)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-500 shrink-0" />
              <span className="font-semibold text-slate-700">Mentoria (-Giro / -PA)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO DE OUTLIERS ESTRATÉGICOS (Z-SCORE & DESTAQUES FORA DA CURVA) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* OUTLIERS POSITIVOS (DESTAQUES FORA DA CURVA) */}
        <Card className="lg:col-span-6 bg-emerald-50/50 border border-emerald-200/80 shadow-2xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-headline font-bold text-emerald-950">
                    Destaques Positivos Extremos (+1.25σ)
                  </CardTitle>
                  <CardDescription className="text-xs text-emerald-700">
                    Colaboradores que superam estatisticamente o padrão da equipe.
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-emerald-200 text-emerald-900 font-extrabold text-xs">
                {outliersSummary.positiveOutliers.length} destaques
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {outliersSummary.positiveOutliers.map((out, idx) => (
              <div 
                key={idx}
                onClick={() => onSelectVendor(out.name)}
                className="p-3 rounded-xl bg-white/90 border border-emerald-200/60 flex items-center justify-between hover:bg-white hover:shadow-xs transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                    ⭐
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {out.name}
                    </h5>
                    <span className="text-[11px] font-semibold text-emerald-700">{out.tag}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-emerald-900 block">{out.value}</span>
                  <span className="text-[10px] text-slate-400 font-medium">Métrica: {out.metric}</span>
                </div>
              </div>
            ))}
            {outliersSummary.positiveOutliers.length === 0 && (
              <p className="text-xs text-slate-500 italic text-center py-4">
                Nenhum outlier positivo extremo identificado (equipe homogênea).
              </p>
            )}
          </CardContent>
        </Card>

        {/* OUTLIERS NEGATIVOS (ALERTAS E PONTOS DE MENTORIA) */}
        <Card className="lg:col-span-6 bg-rose-50/50 border border-rose-200/80 shadow-2xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-headline font-bold text-rose-950">
                    Oportunidades de Apoio & Mentoria (-1.25σ)
                  </CardTitle>
                  <CardDescription className="text-xs text-rose-700">
                    Indicadores sensivelmente abaixo da média que exigem treinamento.
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-rose-200 text-rose-900 font-extrabold text-xs">
                {outliersSummary.negativeOutliers.length} alertas
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {outliersSummary.negativeOutliers.map((out, idx) => (
              <div 
                key={idx}
                onClick={() => onSelectVendor(out.name)}
                className="p-3 rounded-xl bg-white/90 border border-rose-200/60 flex items-center justify-between hover:bg-white hover:shadow-xs transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 font-bold flex items-center justify-center text-xs">
                    ⚠️
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 group-hover:text-rose-700 transition-colors">
                      {out.name}
                    </h5>
                    <span className="text-[11px] font-semibold text-rose-700">{out.tag}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-rose-900 block">{out.value}</span>
                  <span className="text-[10px] text-slate-400 font-medium">Métrica: {out.metric}</span>
                </div>
              </div>
            ))}
            {outliersSummary.negativeOutliers.length === 0 && (
              <p className="text-xs text-slate-500 italic text-center py-4">
                Nenhum gargalo extremo detectado no período avaliado.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* TABELA DE RANKING JUSTO DA EQUIPE (J-SCORE & METAS PONDERADAS) */}
      <Card className="bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <CardTitle className="text-lg font-headline font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-600" />
              Ranking de Justiça Avaliativa (J-Score)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Pontuação equilibrada de 0 a 100 baseada em Meta Ponderada por Escala, Produtividade Diária, Ticket, Campanhas e Fidelidade.
            </CardDescription>
          </div>

          <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 font-extrabold text-xs">
            {filteredList.length} colaboradores listados
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Pos / Colaborador</th>
                  <th className="py-3 px-3">Perfil / Quadrante</th>
                  <th className="py-3 px-3 text-center">J-Score (Justiça)</th>
                  <th className="py-3 px-3 text-right">Venda / Dia</th>
                  <th className="py-3 px-3 text-right">Giro / Dia</th>
                  <th className="py-3 px-3 text-right">PA vs Meta Justa</th>
                  <th className="py-3 px-3 text-right">Ticket Médio</th>
                  <th className="py-3 px-3 text-right">Taxa CPF</th>
                  <th className="py-3 px-4 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((colab, idx) => {
                  const isSelected = colab.name === selectedVendor;
                  const isBateuMeta = colab.pa >= colab.metaPonderadaPA;

                  return (
                    <tr 
                      key={colab.name}
                      onClick={() => onSelectVendor(colab.name)}
                      className={cn(
                        "hover:bg-indigo-50/40 transition-colors cursor-pointer",
                        isSelected && "bg-indigo-50/80 font-semibold"
                      )}
                    >
                      <td className="py-3 px-4 flex items-center gap-2.5">
                        <span className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px]",
                          idx === 0 ? "bg-amber-100 text-amber-800 font-extrabold" :
                          idx === 1 ? "bg-slate-200 text-slate-700" :
                          idx === 2 ? "bg-amber-50 text-amber-700" : "text-slate-500"
                        )}>
                          #{idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-slate-900 block">{colab.name}</span>
                          <span className="text-[10px] text-slate-400">{colab.diasTrabalhados} dia(s) ativo(s)</span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <Badge className={cn("text-[10px] font-bold border", colab.quadrantBadgeClass)}>
                          {colab.quadrantName}
                        </Badge>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="font-headline font-extrabold text-sm text-indigo-700">
                          {colab.jScore}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium block">pts</span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <span className="font-bold text-slate-800">
                          {formatBRL(colab.vendaPorDia)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">Total: {formatBRL(colab.vendaTotal)}</span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <span className="font-bold text-slate-800">{(colab.cuponsPorDia ?? 0).toFixed(1)} cup/dia</span>
                        <span className="text-[10px] text-slate-400 block">{colab.cuponsTotal} cupons</span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <span className={cn("font-bold", isBateuMeta ? "text-emerald-700" : "text-rose-700")}>
                          {(colab.pa ?? 0).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          / Meta {(colab.metaPonderadaPA ?? 0).toFixed(2)} ({(colab.atingimentoPonderadoPct ?? 0).toFixed(0)}%)
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <span className="font-bold text-slate-800">
                          {formatBRL(colab.tkm)}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <span className={cn("font-bold", colab.cpfRate >= teamMeans.cpfRate ? "text-emerald-700" : "text-slate-700")}>
                          {(colab.cpfRate ?? 0).toFixed(1)}%
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-bold h-7 px-2.5 rounded-lg"
                        >
                          Ver Raio-X <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
