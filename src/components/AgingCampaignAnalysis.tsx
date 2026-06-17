import React, { useMemo } from 'react';
import { 
  Timer, 
  Layers, 
  TrendingDown, 
  TrendingUp, 
  UserCheck,
  Boxes,
  Target
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
const TICKET_THRESHOLD = 49.99;

export const AgingCampaignAnalysis: React.FC<AgingCampaignAnalysisProps> = ({ data }) => {
  const stats = useMemo(() => {
    if (!data.length) return null;

    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    
    let totalAgingValue = 0;
    let totalAgingQty = 0;
    
    let totalOpportunities = 0;
    let totalConverted = 0;
    let totalExtraAging = 0;
    
    const collaboratorImpact: Record<string, any> = {};
    const productStats: Record<string, { codigo: string, descricao: string, categoria: string, fornecedor: string, qty: number, promoQty: number, extraQty: number, value: number }> = {};

    activeSales.forEach(sale => {
      const agingItemsInSale = sale.itens.filter(item => isAgingItem(item.cProd));
      const hasAging = agingItemsInSale.length > 0;

      const saleAgingValue = agingItemsInSale.reduce((acc, item) => acc + item.vProd, 0);
      const saleAgingQty = agingItemsInSale.reduce((acc, item) => acc + item.qCom, 0);
      
      const val = parseFloat(sale.vNF);
      const qItens = parseFloat(sale.itens_qtd);
      
      const normalValue = val - saleAgingValue;
      const normalQty = qItens - saleAgingQty;
      
      // Calculate Opportunities based on normal products spent
      const opps = Math.floor(normalValue / TICKET_THRESHOLD);
      const converted = Math.min(opps, saleAgingQty);
      const extra = Math.max(0, saleAgingQty - opps);
      
      totalOpportunities += opps;
      totalConverted += converted;
      totalExtraAging += extra;
      
      totalAgingValue += saleAgingValue;
      totalAgingQty += saleAgingQty;
      
      if (hasAging) {
        agingItemsInSale.forEach(item => {
          if (!productStats[item.cProd]) {
            const refData = agingData.find(a => a.codigo === item.cProd);
            productStats[item.cProd] = {
              codigo: item.cProd,
              descricao: refData?.descricao || item.xProd,
              categoria: refData?.categoria || 'N/A',
              fornecedor: refData?.fornecedor || 'N/A',
              qty: 0,
              promoQty: 0,
              extraQty: 0,
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
          withoutAging: { venda: 0, cupons: 0, itens: 0 },
          opportunities: 0,
          converted: 0,
          extraAging: 0
        };
      }

      collaboratorImpact[v].withAging.venda += val;
      collaboratorImpact[v].withAging.cupons += 1;
      collaboratorImpact[v].withAging.itens += qItens;

      // Expurgo: we just remove the aging items and aging value to simulate the sale without the promotion
      collaboratorImpact[v].withoutAging.venda += normalValue;
      // We still consider the coupon as valid if it had other items. If it was ONLY aging, it becomes 0 value and 0 items.
      collaboratorImpact[v].withoutAging.cupons += 1; // We keep the cupom count to calculate TKM correctly
      collaboratorImpact[v].withoutAging.itens += normalQty;

      collaboratorImpact[v].opportunities += opps;
      collaboratorImpact[v].converted += converted;
      collaboratorImpact[v].extraAging += extra;
    });

    const totalVenda = activeSales.reduce((acc, s) => acc + parseFloat(s.vNF), 0);
    const totalCupons = activeSales.length;
    const totalItens = activeSales.reduce((acc, s) => acc + parseFloat(s.itens_qtd), 0);

    const vendaSemAging = totalVenda - totalAgingValue;
    const itensSemAging = totalItens - totalAgingQty;

    return {
      totalAgingValue,
      totalAgingQty,
      totalVenda,
      totalCupons,
      totalItens,
      vendaSemAging,
      itensSemAging,
      totalOpportunities,
      totalConverted,
      totalExtraAging,
      conversionRate: totalOpportunities > 0 ? (totalConverted / totalOpportunities) * 100 : 0,
      collaboratorImpact: Object.values(collaboratorImpact),
      topProducts: Object.values(productStats).sort((a, b) => b.qty - a.qty).slice(0, 50)
    };
  }, [data]);

  if (!stats) return null;

  const formatBRL = (v: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const tkmCom = stats.totalCupons > 0 ? stats.totalVenda / stats.totalCupons : 0;
  const tkmSem = stats.totalCupons > 0 ? stats.vendaSemAging / stats.totalCupons : 0;
  
  const paCom = stats.totalCupons > 0 ? stats.totalItens / stats.totalCupons : 0;
  const paSem = stats.totalCupons > 0 ? stats.itensSemAging / stats.totalCupons : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Target className="w-32 h-32 text-rose-500" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-rose-500 p-2 rounded-xl">
              <Timer className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-black text-white tracking-tight uppercase">Análise Campanha Aging</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">A cada R$ 49,99 o cliente tem direito a 1 item da lista por metade do preço</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Oportunidades Geradas</p>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-black text-sky-400">{stats.totalOpportunities}</p>
                <p className="text-[10px] text-slate-500 font-bold mb-1 uppercase">Tickets &gt; R$50</p>
              </div>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 relative overflow-hidden">
              <div 
                className="absolute bottom-0 left-0 h-1 bg-emerald-500" 
                style={{ width: `${stats.conversionRate}%` }} 
              />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Conversão na Promoção</p>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-black text-emerald-400">{stats.conversionRate.toFixed(1)}%</p>
                <p className="text-[10px] text-slate-500 font-bold mb-1 uppercase">{stats.totalConverted} resgatados</p>
              </div>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Venda Prod. Saudáveis</p>
              <p className="text-2xl font-black text-white">{formatBRL(stats.vendaSemAging)}</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Faturamento Itens Aging</p>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-black text-rose-400">{formatBRL(stats.totalAgingValue)}</p>
                <p className="text-[10px] text-slate-500 font-bold mb-1 uppercase">{stats.totalAgingQty} unid.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="ri-card border-slate-200 overflow-hidden bg-white shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 font-black text-[10px] uppercase">Funil de Ativação</Badge>
              <Target className="w-4 h-4 text-slate-300" />
            </div>
            <CardTitle className="text-2xl font-black text-slate-800">{stats.totalOpportunities - stats.totalConverted}</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-tight">Oportunidades desperdiçadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-2 space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase">
                <span className="text-slate-400">Total Possível (Qtd)</span>
                <span className="text-slate-800">{stats.totalOpportunities}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-500" 
                  style={{ width: `${stats.conversionRate}%` }}
                />
                <div 
                  className="bg-rose-500 h-full transition-all duration-500" 
                  style={{ width: `${100 - stats.conversionRate}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold uppercase mt-1">
                <span className="text-emerald-600">Convertido: {stats.totalConverted}</span>
                <span className="text-rose-600">Perdido: {stats.totalOpportunities - stats.totalConverted}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="ri-card border-slate-200 overflow-hidden bg-white shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 font-black text-[10px] uppercase">Venda Média (TKM)</Badge>
              {tkmCom > tkmSem ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-rose-400" />}
            </div>
            <CardTitle className="text-2xl font-black text-slate-800">
              +{formatBRL(tkmCom - tkmSem)}
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-tight">Aumento gerado por Aging</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex items-center gap-2 mt-2">
                <div className="text-center flex-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight h-6">Com<br/>Aging</p>
                  <p className="text-sm font-black text-slate-700">{formatBRL(tkmCom)}</p>
                </div>
                <div className="w-px h-8 bg-slate-100" />
                <div className="text-center flex-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight h-6" title="Descontando os itens aging, mas mantendo a venda dos outros itens daquele cupom">Sem<br/>Aging</p>
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
            <CardDescription className="text-[10px] font-bold uppercase tracking-tight">Adicional de Itens na Sacola</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex items-center gap-2 mt-2">
                <div className="text-center flex-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight h-6">Com<br/>Aging</p>
                  <p className="text-sm font-black text-slate-700">{paCom.toFixed(2)}</p>
                </div>
                <div className="w-px h-8 bg-slate-100" />
                <div className="text-center flex-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight h-6" title="Descontando os itens aging, mas mantendo a venda dos outros itens daquele cupom">Sem<br/>Aging</p>
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
            Engajamento da Equipe na Campanha
          </CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Quem aproveita as oportunidades de sugerir o produto com desconto?</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase border-b">Colaborador</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase border-b text-center">TKM Real vs S/ Aging</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase border-b text-center">Oportunidades<br/>(A cada R$50)</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase border-b text-center">Convertidos<br/>(Na Promoção)</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase border-b text-center">Venda Avulsa<br/>(Preço Cheio)</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase border-b text-right">Taxa de Conversão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.collaboratorImpact
                .sort((a: any, b: any) => {
                   const convB = b.opportunities > 0 ? b.converted / b.opportunities : 0;
                   const convA = a.opportunities > 0 ? a.converted / a.opportunities : 0;
                   return convB - convA || b.opportunities - a.opportunities;
                })
                .map((col: any) => {
                  const tkmReal = col.withAging.cupons > 0 ? col.withAging.venda / col.withAging.cupons : 0;
                  const tkmSem = col.withoutAging.cupons > 0 ? col.withoutAging.venda / col.withoutAging.cupons : 0;
                  
                  const conversion = col.opportunities > 0 ? (col.converted / col.opportunities) * 100 : 0;

                  return (
                    <tr key={col.name} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-black text-xs text-slate-700 uppercase">{col.name}</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase">{col.withAging.cupons} vendas totais</div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 line-through">{formatBRL(tkmSem)}</span>
                            <span className="text-xs font-black text-emerald-600">{formatBRL(tkmReal)}</span>
                          </div>
                          <div className="text-[8px] font-black uppercase px-1 rounded-sm mt-0.5 text-emerald-500">
                            +{formatBRL(tkmReal - tkmSem)}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-sm font-black text-sky-600">{col.opportunities}</span>
                        <p className="text-[8px] font-bold text-slate-400 uppercase leading-none mt-1">Geradas</p>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-sm font-black text-emerald-600">{col.converted}</span>
                        <p className="text-[8px] font-bold text-slate-400 uppercase leading-none mt-1">Resgatadas</p>
                      </td>
                      <td className="p-4 text-center">
                        <span className={cn("text-xs font-black", col.extraAging > 0 ? "text-amber-500" : "text-slate-300")}>{col.extraAging}</span>
                        <p className="text-[8px] font-bold text-slate-400 uppercase leading-none mt-1">Itens</p>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={cn(
                            "font-black text-[10px]",
                            conversion > 50 ? "bg-emerald-500" : conversion > 20 ? "bg-amber-500" : "bg-rose-500"
                          )}>
                            {conversion.toFixed(1)}%
                          </Badge>
                        </div>
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
          <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Quais produtos da lista têm maior aceitação na oferta?</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white shadow-sm z-10">
              <tr>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase border-b">Produto</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase border-b text-center">Qtd Vendida</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase border-b text-right">Faturamento</th>
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
                    <span className="text-xs font-black text-slate-600">{p.qty} unid.</span>
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
