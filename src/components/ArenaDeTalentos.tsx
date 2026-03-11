
"use client";

import React, { useMemo } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, 
  Medal, 
  Target, 
  Zap, 
  UserCheck, 
  Award,
  Star,
  Flame,
  TrendingUp,
  Search,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ArenaDeTalentosProps {
  data: DetailedSaleRow[];
}

export function ArenaDeTalentos({ data }: ArenaDeTalentosProps) {
  const ranking = useMemo(() => {
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    const vendors: Record<string, any> = {};

    // Coletar métricas básicas
    activeSales.forEach(s => {
      const v = s.vendedor || "OUTROS";
      if (!vendors[v]) vendors[v] = { 
        name: v, 
        venda: 0, 
        cupons: 0, 
        itens: 0, 
        identificados: 0, 
        pickups: 0, 
        adicionais: 0 
      };
      
      const val = parseFloat(s.vNF);
      vendors[v].venda += val;
      vendors[v].cupons++;
      vendors[v].itens += parseFloat(s.itens_qtd);
      if (s.cpf_cnpj_dest && s.cpf_cnpj_dest.trim().length > 3) vendors[v].identificados++;
      
      if (s.canal === "RETIRADA_ONLINE") vendors[v].pickups++;
      if (s.canal === "RETIRADA_ADICIONAL" || s.is_adicional || s.is_adicional_suspeito) vendors[v].adicionais++;
    });

    // Calcular KPIs e Score
    const totalVendaLoja = activeSales.reduce((acc, s) => acc + parseFloat(s.vNF), 0);
    const avgLojaPA = activeSales.reduce((acc, s) => acc + parseFloat(s.itens_qtd), 0) / activeSales.length || 0;

    return Object.values(vendors).map(v => {
      const pa = v.cupons > 0 ? v.itens / v.cupons : 0;
      const tkm = v.cupons > 0 ? v.venda / v.cupons : 0;
      const ident = v.cupons > 0 ? (v.identificados / v.cupons) * 100 : 0;
      const conv = v.pickups > 0 ? (v.adicionais / v.pickups) * 100 : 0;
      
      // Score Gamificado (0 a 1000)
      // Pesos: PA (30%), TKM (25%), Identificação (20%), Conversão (25%)
      const scorePA = Math.min((pa / (avgLojaPA * 1.5)) * 300, 300);
      const scoreTKM = Math.min((tkm / 500) * 250, 250); // Base 500 reais
      const scoreIdent = (ident / 100) * 200;
      const scoreConv = Math.min((conv / 50) * 250, 250); // Meta 50% para pontuação máxima

      const totalScore = scorePA + scoreTKM + scoreIdent + scoreConv;

      return {
        ...v,
        pa,
        tkm,
        ident,
        conv,
        score: totalScore,
        share: (v.venda / totalVendaLoja) * 100
      };
    }).sort((a, b) => b.score - a.score);
  }, [data]);

  const formatBRL = (v: number) => 
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (ranking.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-slate-400">
        <Users className="w-16 h-16 opacity-30" />
        <p className="text-sm font-bold uppercase tracking-widest text-center">Nenhum colaborador identificado nos dados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Hero Ranking */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden border border-slate-800 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 blur-[120px] -mr-32 -mt-32" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
           <div className="bg-gradient-to-br from-yellow-400 to-orange-600 p-6 rounded-[2.5rem] shadow-xl shadow-orange-500/20">
              <Trophy className="w-12 h-12 text-white" />
           </div>
           <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl font-black tracking-tighter uppercase italic">Arena de Talentos</h2>
              <p className="text-slate-400 font-medium text-sm mt-1">Ranking de performance equilibrada — A técnica supera o volume.</p>
           </div>
           
           <div className="flex gap-4">
              <div className="bg-white/5 px-6 py-4 rounded-3xl border border-white/10 text-center">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Colaboradores</p>
                 <p className="text-2xl font-black">{ranking.length}</p>
              </div>
           </div>
        </div>
      </div>

      {/* Top 3 Spotlight */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ranking.slice(0, 3).map((v, i) => (
          <SpotlightCard key={v.name} vendor={v} rank={i + 1} />
        ))}
      </div>

      {/* Ranking Table */}
      <Card className="ri-card border-none shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b p-6">
           <CardTitle className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
             <Medal className="w-4 h-4 text-indigo-500" /> Tabela Geral de Pontuação
           </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
           <div className="overflow-x-auto">
              <table className="w-full">
                 <thead>
                    <tr className="bg-slate-50/30 border-b border-slate-100">
                       <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Pos</th>
                       <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultor</th>
                       <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Score IQ</th>
                       <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">P.A.</th>
                       <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">TKM</th>
                       <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Ident %</th>
                       <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Conv %</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {ranking.map((v, i) => (
                      <tr key={v.name} className="hover:bg-slate-50 transition-colors group">
                         <td className="px-6 py-4">
                            <span className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black",
                              i === 0 ? "bg-yellow-400 text-white" : i === 1 ? "bg-slate-300 text-white" : i === 2 ? "bg-orange-400 text-white" : "bg-slate-100 text-slate-400"
                            )}>
                               {i + 1}
                            </span>
                         </td>
                         <td className="px-6 py-4">
                            <div>
                               <p className="text-xs font-black text-slate-700 uppercase">{v.name}</p>
                               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Share: {v.share.toFixed(1)}%</p>
                            </div>
                         </td>
                         <td className="px-6 py-4 text-center">
                            <Badge className="bg-indigo-50 text-indigo-700 border-none font-black text-[10px]">{v.score.toFixed(0)} pts</Badge>
                         </td>
                         <td className="px-6 py-4 text-center">
                            <span className={cn("text-xs font-bold", v.pa >= 2 ? "text-emerald-600" : "text-slate-500")}>{v.pa.toFixed(2)}</span>
                         </td>
                         <td className="px-6 py-4 text-center">
                            <span className="text-xs font-bold text-slate-600">{formatBRL(v.tkm)}</span>
                         </td>
                         <td className="px-6 py-4 text-center">
                            <span className={cn("text-xs font-bold", v.ident >= 80 ? "text-emerald-600" : "text-slate-500")}>{v.ident.toFixed(1)}%</span>
                         </td>
                         <td className="px-6 py-4 text-center">
                            <span className={cn("text-xs font-bold", v.conv >= 22 ? "text-sky-600 font-black" : "text-slate-500")}>{v.conv.toFixed(1)}%</span>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </CardContent>
      </Card>

      {/* Como funciona? */}
      <Card className="ri-card bg-indigo-600 text-white p-8 overflow-hidden relative">
         <div className="absolute top-0 right-0 p-8 opacity-10">
            <Flame className="w-32 h-32" />
         </div>
         <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
            <div className="space-y-4 flex-1">
               <h3 className="text-xl font-black uppercase italic tracking-tight">Como o IQ de Venda é calculado?</h3>
               <p className="text-sm text-indigo-100 leading-relaxed font-medium">
                 O <strong>Índice de Qualidade (IQ)</strong> não olha apenas para quem vende mais em R$, mas para quem tem a melhor <strong>TÉCNICA</strong>. O score de 0 a 1000 é composto por:
               </p>
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <FormulaItem label="P.A. (30%)" desc="Peças por Atendimento" />
                  < FormulaItem label="TKM (25%)" desc="Ticket Médio" />
                  <FormulaItem label="Ident. (20%)" desc="Cadastro de Clientes" />
                  <FormulaItem label="Conv. (25%)" desc="Conversão de Pickups" />
               </div>
            </div>
            <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/20 text-center min-w-[200px]">
               <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Média IQ do Time</p>
               <p className="text-4xl font-black">{(ranking.reduce((acc, v) => acc + v.score, 0) / ranking.length).toFixed(0)}</p>
            </div>
         </div>
      </Card>
    </div>
  );
}

function SpotlightCard({ vendor, rank }: { vendor: any, rank: number }) {
  const colors = [
    "from-yellow-400 to-orange-500 shadow-yellow-500/20",
    "from-slate-300 to-slate-500 shadow-slate-400/20",
    "from-orange-400 to-amber-700 shadow-orange-700/20",
  ];

  const icons = [Trophy, Medal, Award];
  const Icon = icons[rank - 1];

  return (
    <Card className="ri-card border-none p-6 relative overflow-hidden group hover:scale-[1.02] transition-all bg-white shadow-xl">
       <div className={cn("absolute -right-8 -bottom-8 w-32 h-32 bg-gradient-to-br opacity-5 rounded-full", colors[rank-1])} />
       
       <div className="flex justify-between items-start mb-6">
          <div className={cn("p-4 rounded-2xl bg-gradient-to-br text-white shadow-lg", colors[rank-1])}>
             <Icon className="w-8 h-8" />
          </div>
          <div className="text-right">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Score Geral</p>
             <p className="text-3xl font-black text-slate-800 tracking-tighter">{vendor.score.toFixed(0)}</p>
          </div>
       </div>

       <div className="space-y-4">
          <div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Consultor #{rank}</p>
             <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight truncate">{vendor.name}</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div className="bg-slate-50 p-3 rounded-xl text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase">P.A. Real</p>
                <p className="text-sm font-black text-emerald-600">{vendor.pa.toFixed(2)}</p>
             </div>
             <div className="bg-slate-50 p-3 rounded-xl text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase">Conv %</p>
                <p className="text-sm font-black text-sky-600">{vendor.conv.toFixed(1)}%</p>
             </div>
          </div>

          <div className="space-y-1 pt-2">
             <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                <span>Progressão IQ</span>
                <span>{vendor.score.toFixed(0)}/1000</span>
             </div>
             <Progress value={vendor.score / 10} className="h-1.5" />
          </div>
       </div>
    </Card>
  );
}

function FormulaItem({ label, desc }: any) {
  return (
    <div className="p-3 bg-white/10 rounded-xl border border-white/10">
       <p className="text-xs font-black">{label}</p>
       <p className="text-[9px] text-indigo-200 mt-0.5">{desc}</p>
    </div>
  );
}
