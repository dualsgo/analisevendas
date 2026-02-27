
"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  Zap, 
  Target, 
  Star, 
  ShieldCheck, 
  Heart, 
  Users, 
  ArrowRightLeft, 
  Sword, 
  Crown, 
  Flame, 
  ChevronRight,
  Info,
  Medal,
  Dizzy
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CollaboratorGamificationProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

// Códigos das campanhas para o cálculo de XP específico
const SLP_CODES = ['5135238', '5135269', '5135270', '5135273', '5146458', '5146469', '5146470', '5146471', '5146472', '5146473', '5146474', '5146475', '5146476', '5146501', '5146504', '5146505', '5141894', '5141895', '5141896', '5141897', '5141898', '5141899', '5141900', '5141902', '5141903', '5141904', '5141905', '5141907', '5141909', '5141910', '5141911', '5141912', '5141913', '5141914', '5141915', '5141916', '5141917', '5141920', '5141949', '5141978', '5140469', '5140475', '5140476', '5140477', '5140478', '5140479', '5146477', '5146478', '5146502', '5146503'];
const SOCIAL_CODES = ['5057181', '5055875', '5135601', '5129270', '5129271', '5129247', '5129262', '5122642', '5122641', '5135612', '5122639', '5122638', '5133676', '5113644', '5113641', '5113642', '5113643', '5129267', '5129255', '5143422', '5139528', '5143423', '5145833', '5139527', '5147797', '5147796', '5145834', '5079753', '5079752', '5106673', '5106671', '5106674', '5106672', '5088519', '5097336', '5097335', '5011918', '5136558'];

export function CollaboratorGamification({ data, vinculos }: CollaboratorGamificationProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const leaderboard = useMemo(() => {
    const players: Record<string, any> = {};
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    
    // Normalizadores (para escala 0-100)
    const maxVenda = Math.max(...activeSales.reduce((acc: any, s) => {
      const v = s.vendedor || "OUTROS";
      acc[v] = (acc[v] || 0) + parseFloat(s.vNF);
      return acc;
    }, {} as any), 1000);

    activeSales.forEach(s => {
      const v = s.vendedor || "OUTROS";
      if (!players[v]) players[v] = { 
        name: v, 
        venda: 0, cupons: 0, itens: 0, ident: 0, 
        pickups: 0, additions: 0, 
        slp: 0, social: 0, 
        trocaScore: 0, trocasCount: 0 
      };
      
      players[v].venda += parseFloat(s.vNF);
      players[v].cupons++;
      players[v].itens += parseFloat(s.itens_qtd);
      if (s.cpf_cnpj_dest) players[v].ident++;
      
      // Contagem de itens específicos
      s.itens.forEach(it => {
        if (SLP_CODES.includes(it.cProd)) players[v].slp += it.qCom;
        if (SOCIAL_CODES.includes(it.cProd)) players[v].social += it.qCom;
      });

      if (s.canal === "RETIRADA_ADICIONAL" || s.is_adicional || s.is_adicional_suspeito) players[v].additions++;
      if (s.canal === "RETIRADA_ONLINE") players[v].pickups++;
    });

    // Trocas
    vinculos.forEach(vinc => {
      const v = vinc.vendedor;
      if (players[v]) {
        players[v].trocaScore += vinc.score_qualidade;
        players[v].trocasCount++;
      }
    });

    return Object.values(players).map(p => {
      const pa = p.cupons > 0 ? p.itens / p.cupons : 0;
      const tkm = p.cupons > 0 ? p.venda / p.cupons : 0;
      const idenRate = p.cupons > 0 ? (p.ident / p.cupons) * 100 : 0;
      const slpRate = p.cupons > 0 ? (p.slp / p.cupons) * 100 : 0;
      const socialRate = p.cupons > 0 ? (p.social / p.cupons) * 100 : 0;
      const avgTroca = p.trocasCount > 0 ? p.trocaScore / p.trocasCount : 50;

      // CÁLCULO DE HABILIDADES (0-100)
      const skills = {
        sales: Math.min((p.venda / (maxVenda * 0.8)) * 100, 100),
        basket: Math.min((pa / 2.5) * 100, 100),
        value: Math.min((tkm / 300) * 100, 100),
        conversion: Math.min((p.additions / Math.max(p.cupons * 0.2, 1)) * 100, 100),
        campaign: Math.min((slpRate / 15) * 100, 100),
        social: Math.min((socialRate / 10) * 100, 100),
        fidelity: idenRate,
        problemSolver: avgTroca
      };

      const overallLevel = Object.values(skills).reduce((a, b) => a + b, 0) / 8;

      let title = "Aprendiz";
      if (overallLevel >= 85) title = "Lenda do Solzinho";
      else if (overallLevel >= 70) title = "Sniper de Elite";
      else if (overallLevel >= 50) title = "Guerreiro de Vendas";
      else if (overallLevel >= 30) title = "Vendedor Ativo";

      return { ...p, skills, overallLevel, title, pa, tkm, idenRate };
    }).sort((a, b) => b.overallLevel - a.overallLevel);
  }, [data, vinculos]);

  const currentPlayer = leaderboard.find(p => p.name === selectedPlayer) || leaderboard[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Estilo Arena */}
      <section className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl border-4 border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/20 blur-[120px] -mr-48 -mt-48 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-500/20 blur-[120px] -ml-48 -mb-48" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
              <Sword className="w-3 h-3" /> Arena Ri Happy
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">
              Ranking <span className="text-orange-500">Gamificado</span>
            </h1>
            <p className="text-slate-400 font-medium max-w-xl text-sm md:text-base">
              Acompanhe a evolução de habilidades e o nível de prestígio de cada talento. 
              Aqui, a performance é medida pelo equilíbrio entre técnica, volume e fidelização.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-white/5 p-6 rounded-[2rem] border border-white/10 backdrop-blur-md">
             <Trophy className="w-12 h-12 text-yellow-400" />
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">Líder Atual</p>
                <p className="text-2xl font-black text-white uppercase truncate max-w-[150px]">{leaderboard[0]?.name}</p>
                <p className="text-xs font-bold text-orange-400">Level {leaderboard[0]?.overallLevel.toFixed(0)} • {leaderboard[0]?.title}</p>
             </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LISTA DE PLAYERS */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-4 flex items-center gap-2">
            <Users className="w-4 h-4" /> Players Ativos no Lote
          </h3>
          <div className="space-y-3">
            {leaderboard.map((p, i) => (
              <Card 
                key={p.name} 
                onClick={() => setSelectedPlayer(p.name)}
                className={cn(
                  "ri-card border-none cursor-pointer transition-all duration-300 overflow-hidden",
                  selectedPlayer === p.name ? "ring-2 ring-orange-500 bg-orange-50/20 scale-[1.02]" : "bg-white hover:bg-slate-50"
                )}
              >
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-sm",
                      i === 0 ? "bg-yellow-400 text-white" : i === 1 ? "bg-slate-300 text-white" : i === 2 ? "bg-orange-400 text-white" : "bg-slate-100 text-slate-400"
                    )}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 uppercase leading-none mb-1">{p.name}</p>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-slate-900 text-[8px] font-black uppercase border-none h-4">LVL {p.overallLevel.toFixed(0)}</Badge>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{p.title}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={cn("w-5 h-5 transition-colors", selectedPlayer === p.name ? "text-orange-500" : "text-slate-200")} />
                </div>
                <div className="h-1 bg-slate-100">
                  <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${p.overallLevel}%` }} />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* FICHA DO PERSONAGEM (DETALHES) */}
        <div className="lg:col-span-7 space-y-6">
          {currentPlayer && (
            <Card className="ri-card border-none bg-white shadow-2xl overflow-hidden animate-in slide-in-from-right-4 duration-500">
              <div className="p-8 bg-slate-50 border-b flex flex-col md:flex-row items-center gap-8">
                <div className="relative">
                  <div className="w-24 h-24 rounded-3xl bg-slate-900 flex items-center justify-center border-4 border-white shadow-xl">
                    {currentPlayer.overallLevel >= 80 ? <Crown className="w-12 h-12 text-yellow-400" /> : <Sword className="w-12 h-12 text-slate-400" />}
                  </div>
                  <div className="absolute -bottom-3 -right-3 w-10 h-10 rounded-2xl bg-orange-500 border-4 border-white flex items-center justify-center text-white font-black text-sm">
                    {currentPlayer.overallLevel.toFixed(0)}
                  </div>
                </div>
                <div className="text-center md:text-left flex-1">
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic leading-none mb-2">{currentPlayer.name}</h2>
                  <div className="flex flex-wrap justify-center md:justify-start gap-2">
                    <Badge className="bg-orange-100 text-orange-700 border-none font-black text-[9px] uppercase px-3">{currentPlayer.title}</Badge>
                    <Badge variant="outline" className="border-slate-200 text-slate-400 font-bold text-[9px] uppercase px-3">{currentPlayer.cupons} Atendimentos</Badge>
                  </div>
                </div>
                <div className="hidden md:block text-right">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ranking Global</p>
                   <p className="text-4xl font-black text-slate-800">#{leaderboard.findIndex(p => p.name === currentPlayer.name) + 1}</p>
                </div>
              </div>

              <CardContent className="p-8 space-y-10">
                {/* Habilidades Primárias */}
                <section className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-500" /> Árvore de Habilidades (Skills)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                    <SkillBar icon={Zap} label="Poder de Venda" value={currentPlayer.skills.sales} color="bg-orange-500" score={`R$ ${currentPlayer.venda.toFixed(0)}`} />
                    <SkillBar icon={Target} label="Mestre da Cesta (PA)" value={currentPlayer.skills.basket} color="bg-emerald-500" score={`${currentPlayer.pa.toFixed(2)} PA`} />
                    <SkillBar icon={Medal} label="Caçador de Valor (TKM)" value={currentPlayer.skills.value} color="bg-sky-500" score={`R$ ${currentPlayer.tkm.toFixed(0)}`} />
                    <SkillBar icon={Crown} label="Sniper de Conversão" value={currentPlayer.skills.conversion} color="bg-purple-500" score={`${currentPlayer.additions} Adic.`} />
                    <SkillBar icon={Star} label="Herói de Campanha (SLP)" value={currentPlayer.skills.campaign} color="bg-yellow-500" score={`${currentPlayer.slp} Itens`} />
                    <SkillBar icon={Heart} label="Guardião Social" value={currentPlayer.skills.social} color="bg-rose-500" score={`${currentPlayer.social} Itens`} />
                    <SkillBar icon={Users} label="Elo de Fidelidade" value={currentPlayer.skills.fidelity} color="bg-indigo-500" score={`${currentPlayer.idenRate.toFixed(0)}% CPF`} />
                    <SkillBar icon={ArrowRightLeft} label="Mestre das Trocas" value={currentPlayer.skills.problemSolver} color="bg-slate-500" score={`${currentPlayer.skills.problemSolver.toFixed(0)} pts`} />
                  </div>
                </section>

                {/* Status Diagnóstico */}
                <div className="p-6 bg-slate-900 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl" />
                  <div className="flex items-center gap-3 mb-4">
                    <Info className="w-5 h-5 text-orange-400" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-100">Análise do Especialista (IA)</h4>
                  </div>
                  <p className="text-sm font-medium leading-relaxed opacity-90 italic">
                    "{getGamifiedDiagnosis(currentPlayer)}"
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function SkillBar({ icon: Icon, label, value, color, score }: any) {
  return (
    <div className="space-y-2 group">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg bg-slate-50 group-hover:scale-110 transition-transform", color.replace('bg-', 'text-'))}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{label}</span>
        </div>
        <span className="text-[10px] font-black text-slate-400 group-hover:text-slate-800 transition-colors">{score}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
        <div className={cn("h-full transition-all duration-1000", color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function getGamifiedDiagnosis(p: any): string {
  if (p.overallLevel >= 85) return `O Player ${p.name} atingiu o status de LENDA. Sua performance é impecável em todos os quesitos, sendo o pilar estratégico da unidade.`;
  
  if (p.skills.sales < 40) return `${p.name} demonstra grande habilidade técnica (PA ${p.pa.toFixed(2)}), mas precisa de mais volume de atendimentos para subir de nível.`;
  
  if (p.skills.basket < 40) return `${p.name} tem um ótimo faturamento, mas atua como 'Batedor Solitário'. O foco deve ser a evolução para 'Mestre da Cesta', agregando mais itens por ticket.`;
  
  if (p.skills.fidelity < 50) return `Atenção: A habilidade de fidelização é o ponto fraco. Sem o CPF, o player perde XP de longo prazo e compromete o rastro de CRM da unidade.`;

  return `${p.name} é um player equilibrado e confiável. Para chegar ao nível Elite, deve focar na especialização de uma das habilidades secundárias (SLP ou Social).`;
}
