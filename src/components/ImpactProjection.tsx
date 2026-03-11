import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Info, 
  AlertTriangle,
  ChevronRight,
  Calculator,
  DollarSign,
  ShoppingCart,
  Percent
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface ImpactProjectionProps {
  data: any[];
}

export const ImpactProjection: React.FC<ImpactProjectionProps> = ({ data }) => {
  const [benchmarkType, setBenchmarkType] = useState<'average' | 'top' | 'meta'>('meta');

  const stats = useMemo(() => {
    if (!data.length) return null;

    // Agrupar dados por vendedor para a projeção
    const vendors: Record<string, any> = {};
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);

    activeSales.forEach(s => {
      const v = s.vendedor || "OUTROS";
      if (!vendors[v]) {
        vendors[v] = {
          name: v,
          current: { venda: 0, cupons: 0, itens: 0 },
          pickupsAtendidas: 0,
          adicionaisFeitos: 0,
          extra: { venda: 0 }
        };
      }

      const val = parseFloat(s.vNF);
      const qItens = parseFloat(s.itens_qtd);

      // Físico, Adicional e Suspeitos de Adicional
      if (s.canal === "LOJA_FISICA" || s.canal === "RETIRADA_ADICIONAL" || s.is_adicional || s.is_adicional_suspeito) {
        vendors[v].current.venda += val;
        vendors[v].current.cupons += 1;
        vendors[v].current.itens += qItens;
      }

      // Somente pickups online (potencial de conversão)
      if (s.canal === "RETIRADA_ONLINE") {
        vendors[v].pickupsAtendidas += 1;
      }

      // Identificar quem fez a venda adicional de fato
      if (s.is_adicional || s.is_adicional_suspeito || s.canal === "RETIRADA_ADICIONAL") {
        vendors[v].adicionaisFeitos += 1;
        vendors[v].extra.venda += val;
      }
    });

    const groupedData = Object.values(vendors);

    const totals = groupedData.reduce((acc, v) => ({
      venda: acc.venda + v.current.venda,
      cupons: acc.cupons + v.current.cupons,
      itens: acc.itens + v.current.itens,
      pickups: acc.pickups + v.pickupsAtendidas,
      adicionais: acc.adicionais + v.adicionaisFeitos,
      vendaAdicional: acc.vendaAdicional + v.extra.venda
    }), { venda: 0, cupons: 0, itens: 0, pickups: 0, adicionais: 0, vendaAdicional: 0 });

    const avgPA = totals.cupons > 0 ? totals.itens / totals.cupons : 0;
    const avgTKM = totals.cupons > 0 ? totals.venda / totals.cupons : 0;
    const avgConv = totals.pickups > 0 ? (totals.adicionais / totals.pickups) * 100 : 0;

    // Benchmarks
    const topPA = Math.max(...groupedData.map(v => v.current.cupons > 0 ? v.current.itens / v.current.cupons : 0));
    const topTKM = Math.max(...groupedData.map(v => v.current.cupons > 0 ? v.current.venda / v.current.cupons : 0));
    const topConv = Math.max(...groupedData.map(v => v.pickupsAtendidas > 0 ? (v.adicionaisFeitos / v.pickupsAtendidas) * 100 : 0));

    // Target Selection
    const targetPA = benchmarkType === 'average' ? avgPA : benchmarkType === 'top' ? topPA : 2.5; // Meta 2.5 é sugerida para varejo, ou use algo fixo
    const targetTKM = benchmarkType === 'average' ? avgTKM : benchmarkType === 'top' ? topTKM : (avgTKM * 1.1); // +10% como meta
    const targetConv = benchmarkType === 'average' ? avgConv : benchmarkType === 'top' ? topConv : 22.0;

    // Impact Calculation
    const potentialItensPA = groupedData.reduce((acc, v) => {
      const currentPA = v.current.cupons > 0 ? v.current.itens / v.current.cupons : 0;
      if (currentPA < targetPA) {
        const gap = targetPA - currentPA;
        const extraItens = gap * v.current.cupons;
        const currentPM = v.current.itens > 0 ? v.current.venda / v.current.itens : (totals.venda / totals.itens || 0);
        return acc + (extraItens * currentPM);
      }
      return acc;
    }, 0);

    const potentialVendaTKM = groupedData.reduce((acc, v) => {
      const currentTKM = v.current.cupons > 0 ? v.current.venda / v.current.cupons : 0;
      if (currentTKM < targetTKM) {
        return acc + ((targetTKM - currentTKM) * v.current.cupons);
      }
      return acc;
    }, 0);

    const potentialVendaAdic = groupedData.reduce((acc, v) => {
      const currentConv = v.pickupsAtendidas > 0 ? (v.adicionaisFeitos / v.pickupsAtendidas) * 100 : 0;
      if (currentConv < targetConv) {
        const extraAdicionais = ((targetConv - currentConv) / 100) * v.pickupsAtendidas;
        const avgAdicValue = v.adicionaisFeitos > 0 ? v.extra.venda / v.adicionaisFeitos : (totals.vendaAdicional / totals.adicionais || (totals.venda / totals.cupons));
        return acc + (extraAdicionais * avgAdicValue);
      }
      return acc;
    }, 0);

    return {
      totals,
      groupedData,
      targets: { pa: targetPA, tkm: targetTKM, conv: targetConv },
      impacts: {
        pa: potentialItensPA,
        tkm: potentialVendaTKM,
        adic: potentialVendaAdic,
        total: potentialVendaTKM + potentialVendaAdic
      }
    };
  }, [data, benchmarkType]);

  if (!stats) return null;

  const formatBRL = (v: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Calculator className="w-6 h-6 text-emerald-400" />
            PROJEÇÃO DE IMPACTO
          </h2>
          <p className="text-slate-400 text-sm font-medium italic">Simulador de Arrecadação Incremental</p>
        </div>
        
        <div className="flex gap-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
          <button 
            onClick={() => setBenchmarkType('meta')}
            className={cn(
              "px-4 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all",
              benchmarkType === 'meta' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
            )}
          >
            META COMPANHIA (22%)
          </button>
          <button 
            onClick={() => setBenchmarkType('average')}
            className={cn(
              "px-4 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all",
              benchmarkType === 'average' ? "bg-emerald-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
            )}
          >
            MÉDIA DO GRUPO
          </button>
          <button 
            onClick={() => setBenchmarkType('top')}
            className={cn(
              "px-4 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all",
              benchmarkType === 'top' ? "bg-amber-500 text-white shadow-lg" : "text-slate-400 hover:text-white"
            )}
          >
            MELHOR PERFORMER
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ImpactCard 
          title="Potencial de TKM" 
          value={stats.impacts.tkm} 
          icon={<DollarSign className="w-5 h-5" />}
          description="Impacto se todos atingissem o Ticket Médio alvo"
          color="emerald"
          targetLabel="Alvo TKM"
          targetValue={formatBRL(stats.targets.tkm)}
        />
        <ImpactCard 
          title="Potencial de PA" 
          value={stats.impacts.pa} 
          icon={<ShoppingCart className="w-5 h-5" />}
          description="Geração de valor através de Itens por Atendimento"
          color="blue"
          targetLabel="Alvo PA"
          targetValue={stats.targets.pa.toFixed(2)}
        />
        <ImpactCard 
          title="Potencial Adicional" 
          value={stats.impacts.adic} 
          icon={<Percent className="w-5 h-5" />}
          description="Receita extra com conversão de Adicionais"
          color="purple"
          targetLabel="Alvo Conv."
          targetValue={`${stats.targets.conv.toFixed(1)}%`}
        />
      </div>

      <Card className="border-2 border-emerald-500/20 bg-slate-900 overflow-hidden">
        <CardHeader className="border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white font-black text-xl">IMPACTO TOTAL ESTIMADO</CardTitle>
              <CardDescription className="text-slate-400">Arrecadação incremental potencial no período analisado</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-emerald-400">{formatBRL(stats.impacts.total)}</div>
              <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 font-black">
                +{((stats.impacts.total / stats.totals.venda) * 100).toFixed(1)}% de Crescimento
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="bg-amber-500/10 border-y border-amber-500/20 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200/80 leading-relaxed font-medium">
              <strong className="text-amber-500 block mb-1">AVISO LEGAL E LIMITAÇÕES DA PROJEÇÃO</strong>
              Esta é uma simulação estatística linear. O resultado real depende de fatores externos (fluxo de loja, mix de produtos), disposições individuais de clientes e consistência operacional. Estes valores representam o "custo de oportunidade" da variação de indicadores entre colaboradores.
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white font-black">OPORTUNIDADE POR CONSULTOR</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[400px] overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              {stats.groupedData
                .map(v => {
                  const currentTKM = v.current.cupons > 0 ? v.current.venda / v.current.cupons : 0;
                  const gap = Math.max(0, stats.targets.tkm - currentTKM);
                  const impact = gap * v.current.cupons;
                  return { ...v, impact };
                })
                .sort((a, b) => b.impact - a.impact)
                .map((v, i) => (
                  <div key={v.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 group hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-black text-white group-hover:bg-emerald-500 transition-colors">
                        {i + 1}
                      </div>
                      <div>
                        <div className="text-sm font-black text-white uppercase">{v.name}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Impacto TKM</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-emerald-400">{formatBRL(v.impact)}</div>
                      <div className="text-[10px] text-slate-500 font-bold italic">Gap: {formatBRL(Math.max(0, stats.targets.tkm - (v.current.cupons > 0 ? v.current.venda / v.current.cupons : 0)))}</div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white font-black text-sm uppercase flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />
                Como ler estes dados?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-400 space-y-3 leading-relaxed">
              <p>
                <strong className="text-slate-200">Ticket Médio (TKM):</strong> Calcula quanto o faturamento subiria se todos os consultores que estão abaixo do alvo atingissem o alvo, mantendo o mesmo número de cupons.
              </p>
              <p>
                <strong className="text-slate-200">Itens por Atendimento (PA):</strong> Mostra o valor que seria gerado se o PA subisse para o alvo, considerando o preço médio atual de cada consultor.
              </p>
              <p>
                <strong className="text-slate-200">Conversão Adicional:</strong> Projeta a receita extra que viria de transformar mais pickups atendidas em vendas adicionais.
              </p>
            </CardContent>
          </Card>
          
          <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
             <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-black text-white text-lg">Action Plan</h4>
                  <p className="text-xs text-slate-400 font-medium italic">Foco em elevar a base</p>
                </div>
             </div>
             <p className="text-xs text-slate-300 leading-normal mb-4">
               O maior impacto vem de treinar os colaboradores com maior <span className="text-emerald-400 font-bold">Volume de Cupons</span> e <span className="text-rose-400 font-bold">Baixo TKM</span>. Um movimento pequeno neles gera mais receita que um movimento grande em quem vende pouco.
             </p>
             <button className="w-full py-2 bg-white text-slate-900 rounded-xl font-black text-xs uppercase hover:bg-emerald-50 transition-colors">
               Ver Detalhes do Gap
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ImpactCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  description: string;
  color: 'emerald' | 'blue' | 'purple';
  targetLabel: string;
  targetValue: string | number;
}

const ImpactCard: React.FC<ImpactCardProps> = ({ title, value, icon, description, color, targetLabel, targetValue }) => {
  const colorMap = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
  };

  const formatBRL = (v: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-all overflow-hidden relative">
      <div className={cn("absolute top-0 right-0 p-4 opacity-10", colorMap[color].split(' ')[0])}>
        {React.cloneElement(icon as React.ReactElement, { className: "w-12 h-12" } as any)}
      </div>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between mb-1">
          <Badge variant="outline" className={cn("font-black text-[10px] uppercase", colorMap[color])}>
            {title}
          </Badge>
          <div className="text-[10px] font-bold text-slate-500 uppercase">{targetLabel}: {targetValue}</div>
        </div>
        <CardTitle className="text-2xl font-black text-white">{formatBRL(value)}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
};
