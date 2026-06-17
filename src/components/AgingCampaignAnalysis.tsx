import React, { useMemo } from 'react';
import { 
  Timer, 
  Layers, 
  TrendingDown, 
  TrendingUp, 
  UserCheck,
  Boxes
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DetailedSaleRow } from '@/lib/types';
import { format, parseISO } from 'date-fns';

import agingDataRaw from '../data/aging-campaign.json';

interface AgingCampaignAnalysisProps {
  data: DetailedSaleRow[];
}

const agingData = agingDataRaw.map(item => ({
  ...item,
  codigo: String(item.codigo)
}));

const AGING_CODES = new Set(agingData.map(item => item.codigo));

const isAgingItem = (cProd: string) => AGING_CODES.has(cProd);

export const AgingCampaignAnalysis: React.FC<AgingCampaignAnalysisProps> = ({ data }) => {
  const stats = useMemo(() => {
    if (!data.length) return null;

    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    
    let totalAgingValue = 0;
    let totalAgingQty = 0;
    
    const salesWithAging: DetailedSaleRow[] = [];
    const salesOnlyAging: DetailedSaleRow[] = [];
    
    const collaboratorImpact: Record<string, any> = {};
    const productStats: Record<string, { codigo: string, descricao: string, categoria: string, fornecedor: string, qty: number, value: number }> = {};

    activeSales.forEach(sale => {
      const agingItemsInSale = sale.itens.filter(item => isAgingItem(item.cProd));
      const hasAging = agingItemsInSale.length > 0;
      const isOnlyAging = hasAging && agingItemsInSale.length === sale.itens.length;

      if (hasAging) {
        salesWithAging.push(sale);
        if (isOnlyAging) salesOnlyAging.push(sale);

        const saleAgingValue = agingItemsInSale.reduce((acc, item) => acc + item.vProd, 0);
        const saleAgingQty = agingItemsInSale.reduce((acc, item) => acc + item.qCom, 0);
        
        totalAgingValue += saleAgingValue;
        totalAgingQty += saleAgingQty;
        
        agingItemsInSale.forEach(item => {
          if (!productStats[item.cProd]) {
            const refData = agingData.find(a => a.codigo === item.cProd);
            productStats[item.cProd] = {
              codigo: item.cProd,
              descricao: refData?.descricao || item.xProd,
              categoria: refData?.categoria || 'N/A',
              fornecedor: refData?.fornecedor || 'N/A',
              qty: 0,
              value: 0
            };
          }
          productStats[item.cProd].qty += item.qCom;
          productStats[item.cProd].value += item.vProd;
        });
      }

      // Individual impact
      const v = sale.vendedor || "OUTROS";
      if (!collaboratorImpact[v]) {
        collaboratorImpact[v] = {
          name: v,
          withAging: { venda: 0, cupons: 0, itens: 0 },
          withoutAging: { venda: 0, cupons: 0, itens: 0 }
        };
      }

      const val = parseFloat(sale.vNF);
      const qItens = parseFloat(sale.itens_qtd);
      const agingVal = agingItemsInSale.reduce((acc, i) => acc + i.vProd, 0);
      const agingQty = agingItemsInSale.reduce((acc, i) => acc + i.qCom, 0);

      collaboratorImpact[v].withAging.venda += val;
      collaboratorImpact[v].withAging.cupons += 1;
      collaboratorImpact[v].withAging.itens += qItens;

      if (!isOnlyAging) {
        collaboratorImpact[v].withoutAging.venda += (val - agingVal);
        collaboratorImpact[v].withoutAging.cupons += 1;
        collaboratorImpact[v].withoutAging.itens += (qItens - agingQty);
      }
    });

    const totalVenda = activeSales.reduce((acc, s) => acc + parseFloat(s.vNF), 0);
    const totalCupons = activeSales.length;
    const totalItens = activeSales.reduce((acc, s) => acc + parseFloat(s.itens_qtd), 0);

    const vendaSemAging = totalVenda - totalAgingValue;
    const cuponsSemAging = totalCupons - salesOnlyAging.length;
    const itensSemAging = totalItens - totalAgingQty;

    // Daily Projections
    const dailyData: Record<string, any> = {};
    activeSales.forEach(s => {
      const date = format(parseISO(s.dhEmi), "dd/MM/yyyy");
      if (!dailyData[date]) dailyData[date] = { withAging: 0, withoutAging: 0 };
      
      const val = parseFloat(s.vNF);
      const agingVal = s.itens
        .filter(item => isAgingItem(item.cProd))
        .reduce((acc, i) => acc + i.vProd, 0);
      
      const isOnlyAging = s.itens.every(item => isAgingItem(item.cProd));

      dailyData[date].withAging += val;
      if (!isOnlyAging) {
        dailyData[date].withoutAging += (val - agingVal);
      }
    });

    return {
      totalAgingValue,
      totalAgingQty,
      salesWithAging,
      salesOnlyAging,
      totalVenda,
      totalCupons,
      totalItens,
      vendaSemAging,
      cuponsSemAging,
      itensSemAging,
      percOnlyAging: totalCupons > 0 ? (salesOnlyAging.length / totalCupons) * 100 : 0,
      collaboratorImpact: Object.values(collaboratorImpact),
      dailyData: Object.entries(dailyData).sort((a, b) => a[0].localeCompare(b[0])),
      topProducts: Object.values(productStats).sort((a, b) => b.value - a.value).slice(0, 50)
    };
  }, [data]);

  if (!stats) return null;

  const formatBRL = (v: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const tkmCom = stats.totalCupons > 0 ? stats.totalVenda / stats.totalCupons : 0;
  const tkmSem = stats.cuponsSemAging > 0 ? stats.vendaSemAging / stats.cuponsSemAging : 0;
  
  const paCom = stats.totalCupons > 0 ? stats.totalItens / stats.totalCupons : 0;
  const paSem = stats.cuponsSemAging > 0 ? stats.itensSemAging / stats.cuponsSemAging : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Timer className="w-32 h-32 text-rose-500" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-rose-500 p-2 rounded-xl">
              <Timer className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-black text-white tracking-tight uppercase">Análise Campanha Aging</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Impacto da lista de itens antigos ("Mais Diversão por Menos")</p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-slate-800/50 text-slate-300 border-slate-700 font-bold text-[9px] uppercase tracking-wider">
                  Total Itens na Lista: {agingData.length}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Venda Total Aging</p>
              <p className="text-xl font-black text-rose-400">{formatBRL(stats.totalAgingValue)}</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Qtd. Itens Vendidos</p>
              <p className="text-xl font-black text-white">{stats.totalAgingQty.toLocaleString()}</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cupons com Aging</p>
              <p className="text-xl font-black text-sky-400">{stats.salesWithAging.length}</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Participação na Venda</p>
              <p className="text-xl font-black text-emerald-400">
                {stats.totalVenda > 0 ? ((stats.totalAgingValue / stats.totalVenda) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="ri-card border-slate-200 overflow-hidden bg-white shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 font-black text-[10px] uppercase">Vendas "Exclusivas Aging"</Badge>
              <Layers className="w-4 h-4 text-slate-300" />
            </div>
            <CardTitle className="text-2xl font-black text-slate-800">{stats.percOnlyAging.toFixed(1)}%</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-tight">Proporção de cupons sem outros produtos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-2 space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase">
                <span className="text-slate-400">Cupons Exclusivos (Só Aging)</span>
                <span className="text-slate-800">{stats.salesOnlyAging.length}</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full transition-all duration-500" 
                  style={{ width: `${stats.percOnlyAging}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="ri-card border-slate-200 overflow-hidden bg-white shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 font-black text-[10px] uppercase">Venda Média (TKM)</Badge>
              {tkmCom < tkmSem ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-rose-400" />}
            </div>
            <CardTitle className="text-2xl font-black text-slate-800">
              {formatBRL(tkmCom - tkmSem)}
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-tight">Variação gerada por Aging</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex items-center gap-2 mt-2">
                <div className="text-center flex-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight h-6">Desempenho<br/>Geral</p>
                  <p className="text-sm font-black text-slate-700">{formatBRL(tkmCom)}</p>
                </div>
                <div className="w-px h-8 bg-slate-100" />
                <div className="text-center flex-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight h-6" title="Descontando os itens aging, mas mantendo a venda dos outros itens daquele cupom">Sem<br/>Itens Aging</p>
                  <p className="text-sm font-black text-indigo-600">{formatBRL(tkmSem)}</p>
                </div>
             </div>
          </CardContent>
        </Card>

        <Card className="ri-card border-slate-200 overflow-hidden bg-white shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="bg-sky-50 text-sky-600 border-sky-100 font-black text-[10px] uppercase">Itens por Venda (P.A.)</Badge>
              {paCom > paSem ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-rose-400" />}
            </div>
            <CardTitle className="text-2xl font-black text-slate-800">
              {(paCom - paSem > 0 ? "+" : "")}{(paCom - paSem).toFixed(2)}
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-tight">Variação artificial gerada</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex items-center gap-2 mt-2">
                <div className="text-center flex-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight h-6">Desempenho<br/>Geral</p>
                  <p className="text-sm font-black text-slate-700">{paCom.toFixed(2)}</p>
                </div>
                <div className="w-px h-8 bg-slate-100" />
                <div className="text-center flex-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight h-6" title="Descontando os itens aging, mas mantendo a venda dos outros itens daquele cupom">Sem<br/>Itens Aging</p>
                  <p className="text-sm font-black text-sky-600">{paSem.toFixed(2)}</p>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Collaborator Impact */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="bg-slate-50 border-b border-slate-200">
          <CardTitle className="text-sm font-black text-slate-800 uppercase flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            Impacto Individual por Colaborador
          </CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Desempenho com e sem cupons da campanha Aging</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase border-b">Colaborador</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase border-b text-center">Vendas (Expurgadas)</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase border-b text-center">Venda Média vs S/ Aging</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase border-b text-center">Itens/Cupom vs S/ Aging</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase border-b text-right">Inflação Rec.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.collaboratorImpact
                .sort((a: any, b: any) => b.withAging.venda - a.withAging.venda)
                .map((col: any) => {
                  const tkmReal = col.withAging.cupons > 0 ? col.withAging.venda / col.withAging.cupons : 0;
                  const tkmSem = col.withoutAging.cupons > 0 ? col.withoutAging.venda / col.withoutAging.cupons : 0;
                  
                  const paReal = col.withAging.cupons > 0 ? col.withAging.itens / col.withAging.cupons : 0;
                  const paSem = col.withoutAging.cupons > 0 ? col.withoutAging.itens / col.withoutAging.cupons : 0;

                  const inflation = col.withAging.venda > 0 ? ((col.withAging.venda - col.withoutAging.venda) / col.withAging.venda) * 100 : 0;

                  return (
                    <tr key={col.name} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-black text-xs text-slate-700 uppercase">{col.name}</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase">{col.withAging.cupons} vendas totais</div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-xs font-black text-slate-600">{col.withoutAging.cupons}</span>
                        <span className="text-[9px] font-bold text-slate-400 ml-1">(-{col.withAging.cupons - col.withoutAging.cupons})</span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 line-through">{formatBRL(tkmReal)}</span>
                            <span className="text-xs font-black text-indigo-600">{formatBRL(tkmSem)}</span>
                          </div>
                          <div className={cn(
                            "text-[8px] font-black uppercase px-1 rounded-sm mt-0.5",
                            tkmSem < tkmReal ? "text-rose-500" : "text-emerald-500"
                          )}>
                            Var: {formatBRL(tkmSem - tkmReal)}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center">
                           <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 line-through">{paReal.toFixed(2)}</span>
                            <span className="text-xs font-black text-sky-600">{paSem.toFixed(2)}</span>
                          </div>
                           <div className={cn(
                            "text-[8px] font-black uppercase px-1 rounded-sm mt-0.5",
                            paSem < paReal ? "text-rose-500" : "text-emerald-500"
                          )}>
                            Var: {(paSem - paReal).toFixed(2)}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <Badge className={cn(
                          "font-black text-[10px]",
                          inflation > 15 ? "bg-rose-500" : inflation > 5 ? "bg-amber-500" : "bg-slate-200"
                        )}>
                          {inflation.toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card className="border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col max-h-[500px]">
        <CardHeader className="bg-slate-50 border-b border-slate-200 shrink-0">
          <CardTitle className="text-sm font-black text-slate-800 uppercase flex items-center gap-2">
            <Boxes className="w-4 h-4 text-indigo-600" />
            Itens Aging Mais Vendidos (Top 50)
          </CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Performance dos produtos mapeados</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white shadow-sm z-10">
              <tr>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase border-b">Produto</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase border-b text-center">Qtd</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase border-b text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.topProducts.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="text-[10px] font-black text-slate-700 uppercase">{p.descricao}</div>
                    <div className="text-[8px] text-slate-400 font-bold uppercase">Cód: {p.codigo} | Cat: {p.categoria}</div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-xs font-black text-slate-600">{p.qty}</span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="text-[10px] font-black text-emerald-600">{formatBRL(p.value)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

    </div>
  );
};
