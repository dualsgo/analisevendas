"use client";

import React, { useState, useMemo } from "react";
import { CollaboratorExtendedStats, TeamDispersionStats } from "@/lib/advanced-collaborator-analytics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  Legend, 
  Tooltip as RechartsTooltip 
} from "recharts";
import { 
  ArrowRightLeft, 
  Award, 
  Scale, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  CheckCircle2, 
  ShoppingBag, 
  Heart, 
  Tag, 
  Users, 
  ShieldCheck, 
  AlertTriangle 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CollaboratorHeadToHeadProps {
  dispersionStats: TeamDispersionStats;
  selectedVendorA: string;
  onSelectVendorA?: (v: string) => void;
}

export function CollaboratorHeadToHead({
  dispersionStats,
  selectedVendorA,
  onSelectVendorA
}: CollaboratorHeadToHeadProps) {
  const { collaborators, teamMeans } = dispersionStats;

  const [vendorA, setVendorA] = useState<string>(selectedVendorA || (collaborators[0]?.name || ""));
  const [vendorB, setVendorB] = useState<string>(
    collaborators.find(c => c.name !== vendorA)?.name || (collaborators[1]?.name || "")
  );

  // Sincronizar caso a prop mude
  React.useEffect(() => {
    if (selectedVendorA && selectedVendorA !== vendorA) {
      setVendorA(selectedVendorA);
      if (vendorB === selectedVendorA) {
        const next = collaborators.find(c => c.name !== selectedVendorA)?.name || "";
        setVendorB(next);
      }
    }
  }, [selectedVendorA]);

  const statsA = useMemo(() => collaborators.find(c => c.name === vendorA), [collaborators, vendorA]);
  const statsB = useMemo(() => collaborators.find(c => c.name === vendorB), [collaborators, vendorB]);

  // Radar Data
  const radarData = useMemo(() => {
    if (!statsA || !statsB) return [];

    return [
      {
        subject: "Produtividade Diária",
        A: statsA.radarDimensions.produtividade,
        B: statsB.radarDimensions.produtividade,
        fullMark: 100
      },
      {
        subject: "Profundidade (PA)",
        A: statsA.radarDimensions.profundidadeCesta,
        B: statsB.radarDimensions.profundidadeCesta,
        fullMark: 100
      },
      {
        subject: "Ticket Médio",
        A: statsA.radarDimensions.ticketMedio,
        B: statsB.radarDimensions.ticketMedio,
        fullMark: 100
      },
      {
        subject: "Campanhas (SLP/Social)",
        A: statsA.radarDimensions.campanhas,
        B: statsB.radarDimensions.campanhas,
        fullMark: 100
      },
      {
        subject: "Fidelidade (CPF)",
        A: statsA.radarDimensions.fidelidade,
        B: statsB.radarDimensions.fidelidade,
        fullMark: 100
      },
      {
        subject: "Preservação Margem",
        A: statsA.radarDimensions.preservacaoMargem,
        B: statsB.radarDimensions.preservacaoMargem,
        fullMark: 100
      },
    ];
  }, [statsA, statsB]);

  if (!statsA || !statsB) {
    return (
      <div className="p-8 text-center text-slate-400">
        Selecione ao menos dois colaboradores para a análise comparativa.
      </div>
    );
  }

  // Comparações de Vantagem Técnica
  const advantagesA: string[] = [];
  const advantagesB: string[] = [];

  if (statsA.jScore > statsB.jScore) advantagesA.push(`J-Score superior (${statsA.jScore} vs ${statsB.jScore})`);
  else if (statsB.jScore > statsA.jScore) advantagesB.push(`J-Score superior (${statsB.jScore} vs ${statsA.jScore})`);

  if (statsA.vendaPorDia > statsB.vendaPorDia) advantagesA.push(`Maior Faturamento Diário (${statsA.vendaPorDia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/dia vs ${statsB.vendaPorDia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/dia)`);
  else if (statsB.vendaPorDia > statsA.vendaPorDia) advantagesB.push(`Maior Faturamento Diário (${statsB.vendaPorDia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/dia vs ${statsA.vendaPorDia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/dia)`);

  if (statsA.pa > statsB.pa) advantagesA.push(`Maior PA (${statsA.pa.toFixed(2)} vs ${statsB.pa.toFixed(2)})`);
  else if (statsB.pa > statsA.pa) advantagesB.push(`Maior PA (${statsB.pa.toFixed(2)} vs ${statsA.pa.toFixed(2)})`);

  if (statsA.tkm > statsB.tkm) advantagesA.push(`Ticket Médio mais alto (${statsA.tkm.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} vs ${statsB.tkm.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`);
  else if (statsB.tkm > statsA.tkm) advantagesB.push(`Ticket Médio mais alto (${statsB.tkm.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} vs ${statsA.tkm.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`);

  if (statsA.cpfRate > statsB.cpfRate) advantagesA.push(`Maior taxa de CPF (${statsA.cpfRate.toFixed(1)}% vs ${statsB.cpfRate.toFixed(1)}%)`);
  else if (statsB.cpfRate > statsA.cpfRate) advantagesB.push(`Maior taxa de CPF (${statsB.cpfRate.toFixed(1)}% vs ${statsA.cpfRate.toFixed(1)}%)`);

  if (statsA.slpPenetracaoRate > statsB.slpPenetracaoRate) advantagesA.push(`Maior conversão SLP (${statsA.slpPenetracaoRate.toFixed(1)}% vs ${statsB.slpPenetracaoRate.toFixed(1)}%)`);
  else if (statsB.slpPenetracaoRate > statsA.slpPenetracaoRate) advantagesB.push(`Maior conversão SLP (${statsB.slpPenetracaoRate.toFixed(1)}% vs ${statsA.slpPenetracaoRate.toFixed(1)}%)`);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* SELETORES DE COLABORADORES HEAD-TO-HEAD */}
      <Card className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-none shadow-xl">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider border border-indigo-500/30">
                <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
                Benchmark de Pares & Aprendizado Mútuo
              </div>
              <h2 className="text-2xl font-headline font-extrabold text-white">
                Comparativo Head-to-Head (Duelo Técnico)
              </h2>
              <p className="text-xs md:text-sm text-slate-300 font-medium max-w-2xl">
                Compare o desempenho de dois colaboradores de forma justa e normalizada para identificar trocas de boas práticas e mentorias cruzadas.
              </p>
            </div>

            {/* SELETORES DUPLOS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">
                  Colaborador A (Azul Índigo):
                </label>
                <select
                  value={vendorA}
                  onChange={(e) => {
                    setVendorA(e.target.value);
                    if (onSelectVendorA) onSelectVendorA(e.target.value);
                  }}
                  className="w-full bg-slate-800 text-white border border-indigo-500/40 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {collaborators.map(c => (
                    <option key={c.name} value={c.name} disabled={c.name === vendorB}>
                      {c.name} (J-Score: {c.jScore})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block">
                  Colaborador B (Verde Esmeralda):
                </label>
                <select
                  value={vendorB}
                  onChange={(e) => setVendorB(e.target.value)}
                  className="w-full bg-slate-800 text-white border border-emerald-500/40 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {collaborators.map(c => (
                    <option key={c.name} value={c.name} disabled={c.name === vendorA}>
                      {c.name} (J-Score: {c.jScore})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARDS PRINCIPAIS DE PERFIL DOS DOIS COLABORADORES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CARD COLABORADOR A */}
        <Card className="bg-indigo-950/20 border-2 border-indigo-500/40 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-2xl pointer-events-none" />
          <CardHeader className="pb-3 border-b border-indigo-100/50">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 block">Colaborador A</span>
                <CardTitle className="text-xl font-headline font-extrabold text-slate-900">{statsA.name}</CardTitle>
                <Badge className={cn("text-[10px] font-bold mt-1", statsA.quadrantBadgeClass)}>
                  {statsA.quadrantName}
                </Badge>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">J-Score Justo</span>
                <span className="text-2xl font-headline font-black text-indigo-700">{statsA.jScore} <span className="text-xs text-slate-400 font-medium">/100</span></span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-white rounded-xl border border-indigo-100">
                <span className="text-[10px] font-bold text-slate-400 block">Venda / Dia</span>
                <span className="text-sm font-extrabold text-slate-900">{statsA.vendaPorDia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                <span className="text-[10px] text-slate-400 block">{statsA.diasTrabalhados} dias ativos</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-indigo-100">
                <span className="text-[10px] font-bold text-slate-400 block">Giro / Dia</span>
                <span className="text-sm font-extrabold text-slate-900">{statsA.cuponsPorDia.toFixed(1)} cup/dia</span>
                <span className="text-[10px] text-slate-400 block">{statsA.cuponsTotal} cupons totais</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-indigo-100">
                <span className="text-[10px] font-bold text-slate-400 block">PA Realizado vs Meta</span>
                <span className={cn("text-sm font-extrabold", statsA.pa >= statsA.metaPonderadaPA ? "text-emerald-700" : "text-rose-700")}>
                  {statsA.pa.toFixed(2)} <span className="text-xs text-slate-400">/ {statsA.metaPonderadaPA.toFixed(2)}</span>
                </span>
                <span className="text-[10px] text-slate-400 block">{statsA.atingimentoPonderadoPct.toFixed(0)}% da meta</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-indigo-100">
                <span className="text-[10px] font-bold text-slate-400 block">Ticket Médio (TKM)</span>
                <span className="text-sm font-extrabold text-slate-900">{statsA.tkm.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                <span className="text-[10px] text-slate-400 block">CPF: {statsA.cpfRate.toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD COLABORADOR B */}
        <Card className="bg-emerald-950/20 border-2 border-emerald-500/40 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-2xl pointer-events-none" />
          <CardHeader className="pb-3 border-b border-emerald-100/50">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 block">Colaborador B</span>
                <CardTitle className="text-xl font-headline font-extrabold text-slate-900">{statsB.name}</CardTitle>
                <Badge className={cn("text-[10px] font-bold mt-1", statsB.quadrantBadgeClass)}>
                  {statsB.quadrantName}
                </Badge>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">J-Score Justo</span>
                <span className="text-2xl font-headline font-black text-emerald-700">{statsB.jScore} <span className="text-xs text-slate-400 font-medium">/100</span></span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-white rounded-xl border border-emerald-100">
                <span className="text-[10px] font-bold text-slate-400 block">Venda / Dia</span>
                <span className="text-sm font-extrabold text-slate-900">{statsB.vendaPorDia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                <span className="text-[10px] text-slate-400 block">{statsB.diasTrabalhados} dias ativos</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-emerald-100">
                <span className="text-[10px] font-bold text-slate-400 block">Giro / Dia</span>
                <span className="text-sm font-extrabold text-slate-900">{statsB.cuponsPorDia.toFixed(1)} cup/dia</span>
                <span className="text-[10px] text-slate-400 block">{statsB.cuponsTotal} cupons totais</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-emerald-100">
                <span className="text-[10px] font-bold text-slate-400 block">PA Realizado vs Meta</span>
                <span className={cn("text-sm font-extrabold", statsB.pa >= statsB.metaPonderadaPA ? "text-emerald-700" : "text-rose-700")}>
                  {statsB.pa.toFixed(2)} <span className="text-xs text-slate-400">/ {statsB.metaPonderadaPA.toFixed(2)}</span>
                </span>
                <span className="text-[10px] text-slate-400 block">{statsB.atingimentoPonderadoPct.toFixed(0)}% da meta</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-emerald-100">
                <span className="text-[10px] font-bold text-slate-400 block">Ticket Médio (TKM)</span>
                <span className="text-sm font-extrabold text-slate-900">{statsB.tkm.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                <span className="text-[10px] text-slate-400 block">CPF: {statsB.cpfRate.toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RADAR 6D SOBREPOSTO (SOBREPOSIÇÃO TÉCNICA) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs">
          <CardHeader>
            <CardTitle className="text-lg font-headline font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-600" />
              Radar de Habilidades 6D Sobreposto
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Sobreposição das 6 dimensões normalizadas de 0 a 100 para rápida identificação de dominância técnica.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fontWeight: 700, fill: "#475569" }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar name={statsA.name} dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} strokeWidth={2} />
                  <Radar name={statsB.name} dataKey="B" stroke="#10b981" fill="#10b981" fillOpacity={0.4} strokeWidth={2} />
                  <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingTop: 10 }} />
                  <RechartsTooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* PAINEL DE OPORTUNIDADES DE TROCA DE BOAS PRÁTICAS */}
        <Card className="lg:col-span-5 bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-lg font-headline font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              Mentoria & Troca de Boas Práticas
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Onde cada colaborador se destaca e pode mentorar o colega.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* VANTAGENS DE A */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-1.5">
              <h5 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                Pontos Fortes de {statsA.name} (Mentoria para {statsB.name}):
              </h5>
              <div className="space-y-1 pl-4 text-xs text-indigo-900">
                {advantagesA.map((adv, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-indigo-600 font-bold">•</span>
                    <span>{adv}</span>
                  </div>
                ))}
                {advantagesA.length === 0 && (
                  <p className="text-slate-500 italic">Desempenho equivalente ou alinhado.</p>
                )}
              </div>
            </div>

            {/* VANTAGENS DE B */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
              <h5 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                Pontos Fortes de {statsB.name} (Mentoria para {statsA.name}):
              </h5>
              <div className="space-y-1 pl-4 text-xs text-emerald-900">
                {advantagesB.map((adv, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>{adv}</span>
                  </div>
                ))}
                {advantagesB.length === 0 && (
                  <p className="text-slate-500 italic">Desempenho equivalente ou alinhado.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
