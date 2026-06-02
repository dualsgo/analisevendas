import React, { useMemo } from 'react';
import { 
  Trophy, 
  Package, 
  Layers, 
  TrendingDown, 
  TrendingUp, 
  ShoppingCart, 
  UserCheck,
  AlertTriangle,
  Info,
  Calendar,
  Filter,
  Share2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DetailedSaleRow } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CopaAnalysisProps {
  data: DetailedSaleRow[];
}

const COPA_ALBUM = "5147812";
const COPA_STICKERS = ["5147790", "5147791", "5149187"];
const isCopaItem = (cProd: string) => cProd === COPA_ALBUM || COPA_STICKERS.includes(cProd);

export const CopaAnalysis: React.FC<CopaAnalysisProps> = ({ data }) => {
  const stats = useMemo(() => {
    if (!data.length) return null;

    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    
    let totalCopaValue = 0;
    let totalCopaQty = 0;
    let albumQty = 0;
    let stickerQty = 0;
    
    const salesWithCopa: DetailedSaleRow[] = [];
    const salesOnlyCopa: DetailedSaleRow[] = [];
    
    const collaboratorImpact: Record<string, any> = {};

    activeSales.forEach(sale => {
      const copaItems = sale.itens.filter(item => isCopaItem(item.cProd));
      const hasCopa = copaItems.length > 0;
      const isOnlyCopa = hasCopa && copaItems.length === sale.itens.length;

      if (hasCopa) {
        salesWithCopa.push(sale);
        if (isOnlyCopa) salesOnlyCopa.push(sale);

        const saleCopaValue = copaItems.reduce((acc, item) => acc + item.vProd, 0);
        const saleCopaQty = copaItems.reduce((acc, item) => acc + item.qCom, 0);
        
        totalCopaValue += saleCopaValue;
        totalCopaQty += saleCopaQty;
        
        albumQty += copaItems.filter(i => i.cProd === COPA_ALBUM).reduce((acc, i) => acc + i.qCom, 0);
        stickerQty += copaItems.filter(i => COPA_STICKERS.includes(i.cProd)).reduce((acc, i) => acc + i.qCom, 0);
      }

      // Individual impact
      const v = sale.vendedor || "OUTROS";
      if (!collaboratorImpact[v]) {
        collaboratorImpact[v] = {
          name: v,
          withCopa: { venda: 0, cupons: 0, itens: 0 },
          withoutCopa: { venda: 0, cupons: 0, itens: 0 }
        };
      }

      const val = parseFloat(sale.vNF);
      const qItens = parseFloat(sale.itens_qtd);
      const copaVal = copaItems.reduce((acc, i) => acc + i.vProd, 0);
      const copaQty = copaItems.reduce((acc, i) => acc + i.qCom, 0);

      collaboratorImpact[v].withCopa.venda += val;
      collaboratorImpact[v].withCopa.cupons += 1;
      collaboratorImpact[v].withCopa.itens += qItens;

      // If it's "Only Copa", we remove the entire coupon for the "without" analysis
      // If it's mixed, we remove just the copa items
      if (!isOnlyCopa) {
        collaboratorImpact[v].withoutCopa.venda += (val - copaVal);
        collaboratorImpact[v].withoutCopa.cupons += 1;
        collaboratorImpact[v].withoutCopa.itens += (qItens - copaQty);
      }
    });

    const totalVenda = activeSales.reduce((acc, s) => acc + parseFloat(s.vNF), 0);
    const totalCupons = activeSales.length;
    const totalItens = activeSales.reduce((acc, s) => acc + parseFloat(s.itens_qtd), 0);

    const vendaSemCopa = totalVenda - totalCopaValue;
    // For cupons "without copa", we only count cupons that weren't ONLY copa
    const cuponsSemCopa = totalCupons - salesOnlyCopa.length;
    const itensSemCopa = totalItens - totalCopaQty;

    // Daily Projections
    const dailyData: Record<string, any> = {};
    activeSales.forEach(s => {
      const date = format(parseISO(s.dhEmi), "dd/MM/yyyy");
      if (!dailyData[date]) dailyData[date] = { withCopa: 0, withoutCopa: 0 };
      
      const val = parseFloat(s.vNF);
      const copaVal = s.itens
        .filter(item => isCopaItem(item.cProd))
        .reduce((acc, i) => acc + i.vProd, 0);
      
      const isOnlyCopa = s.itens.every(item => isCopaItem(item.cProd));

      dailyData[date].withCopa += val;
      if (!isOnlyCopa) {
        dailyData[date].withoutCopa += (val - copaVal);
      }
    });

    return {
      totalCopaValue,
      totalCopaQty,
      albumQty,
      stickerQty,
      salesWithCopa,
      salesOnlyCopa,
      totalVenda,
      totalCupons,
      totalItens,
      vendaSemCopa,
      cuponsSemCopa,
      itensSemCopa,
      percOnlyCopa: totalCupons > 0 ? (salesOnlyCopa.length / totalCupons) * 100 : 0,
      collaboratorImpact: Object.values(collaboratorImpact),
      dailyData: Object.entries(dailyData).sort((a, b) => a[0].localeCompare(b[0]))
    };
  }, [data]);

  if (!stats) return null;

  const formatBRL = (v: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const handleShareWhatsApp = () => {
    const tkmReal = stats.totalVenda / stats.totalCupons;
    const tkmSemCopa = stats.vendaSemCopa / stats.cuponsSemCopa;
    const paReal = stats.totalItens / stats.totalCupons;
    const paSemCopa = stats.itensSemCopa / stats.cuponsSemCopa;
    
    const text = `🏆 *ANÁLISE DE IMPACTO COPA* 🏆

💰 *VENDA COPA:* ${formatBRL(stats.totalCopaValue)}
📦 *ÁLBUNS:* ${stats.albumQty} | *FIGURINHAS:* ${stats.stickerQty}

📊 *O IMPACTO NOS NÚMEROS:*
• *Venda Média (TKM):* Cai de *${formatBRL(tkmReal)}* para *${formatBRL(tkmSemCopa)}* sem os itens da copa.
• *Itens por Venda (PA):* Cai de *${paReal.toFixed(2)}* para *${paSemCopa.toFixed(2)}*.

⚠️ *RESUMO:*
*${stats.percOnlyCopa.toFixed(1)}%* dos nossos cupons são apenas de figurinhas/álbum. 
Isso significa que esses atendimentos *não agregam outros produtos*, baixando nossa produtividade real.

*Análise gerada pelo Sistema de Vendas.*`;

    const encodedText = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Trophy className="w-32 h-32 text-amber-500" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-amber-500 p-2 rounded-xl">
              <Trophy className="w-6 h-6 text-slate-900" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-black text-white tracking-tight uppercase">Análise de Itens Sazonais (Copa)</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Monitoramento de Impacto nos Indicadores</p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-slate-800/50 text-slate-300 border-slate-700 font-bold text-[9px] uppercase tracking-wider">
                  Cód. Álbum: {COPA_ALBUM}
                </Badge>
                <Badge variant="outline" className="bg-slate-800/50 text-slate-300 border-slate-700 font-bold text-[9px] uppercase tracking-wider">
                  Cód. Figurinhas: {COPA_STICKERS.join(', ')}
                </Badge>
              </div>
            </div>
            <button 
              onClick={handleShareWhatsApp}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-black text-[10px] uppercase transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              Enviar p/ WhatsApp
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Venda Total Copa</p>
              <p className="text-xl font-black text-amber-400">{formatBRL(stats.totalCopaValue)}</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Qtd. Total Itens</p>
              <p className="text-xl font-black text-white">{stats.totalCopaQty.toLocaleString()}</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Álbuns Vendidos</p>
              <p className="text-xl font-black text-sky-400">{stats.albumQty.toLocaleString()}</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pacotes Vendidos</p>
              <p className="text-xl font-black text-emerald-400">{stats.stickerQty.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="ri-card border-slate-200 overflow-hidden bg-white shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 font-black text-[10px] uppercase">Vendas "Só Copa"</Badge>
              <Layers className="w-4 h-4 text-slate-300" />
            </div>
            <CardTitle className="text-2xl font-black text-slate-800">{stats.percOnlyCopa.toFixed(1)}%</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-tight">Proporção de cupons sem outros produtos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-2 space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase">
                <span className="text-slate-400">Cupons Exclusivos</span>
                <span className="text-slate-800">{stats.salesOnlyCopa.length}</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full transition-all duration-500" 
                  style={{ width: `${stats.percOnlyCopa}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 italic leading-tight">
                Estes cupons são puramente transacionais e não representam venda consultiva.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="ri-card border-slate-200 overflow-hidden bg-white shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 font-black text-[10px] uppercase">Venda Média (TKM)</Badge>
              <TrendingDown className="w-4 h-4 text-rose-400" />
            </div>
            <CardTitle className="text-2xl font-black text-slate-800">
              {formatBRL((stats.totalVenda / stats.totalCupons) - (stats.vendaSemCopa / stats.cuponsSemCopa))}
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-tight">Redução no valor médio por venda</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex items-center gap-4 mt-2">
                <div className="text-center flex-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Com Copa</p>
                  <p className="text-sm font-black text-slate-700">{formatBRL(stats.totalVenda / stats.totalCupons)}</p>
                </div>
                <div className="w-px h-8 bg-slate-100" />
                <div className="text-center flex-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Sem Copa</p>
                  <p className="text-sm font-black text-indigo-600">{formatBRL(stats.vendaSemCopa / stats.cuponsSemCopa)}</p>
                </div>
             </div>
          </CardContent>
        </Card>

        <Card className="ri-card border-slate-200 overflow-hidden bg-white shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="bg-sky-50 text-sky-600 border-sky-100 font-black text-[10px] uppercase">Itens por Venda (P.A.)</Badge>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <CardTitle className="text-2xl font-black text-slate-800">
              +{( (stats.totalItens / stats.totalCupons) - (stats.itensSemCopa / stats.cuponsSemCopa) ).toFixed(2)}
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-tight">Aumento artificial de itens por cupom</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mt-2">
                <div className="text-center flex-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Com Copa</p>
                  <p className="text-sm font-black text-slate-700">{(stats.totalItens / stats.totalCupons).toFixed(2)}</p>
                </div>
                <div className="w-px h-8 bg-slate-100" />
                <div className="text-center flex-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Sem Copa</p>
                  <p className="text-sm font-black text-sky-600">{(stats.itensSemCopa / stats.cuponsSemCopa).toFixed(2)}</p>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Comparison */}
      <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-black text-slate-800 uppercase flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Projeção Diária: Com vs Sem Copa
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Comparação de faturamento real x expurgado</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-tight">Real</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span className="text-[9px] font-black uppercase text-indigo-600 tracking-tight">Sem Copa</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {stats.dailyData.map(([date, data]: any) => {
              const diff = data.withCopa - data.withoutCopa;
              const perc = (diff / data.withCopa) * 100;
              return (
                <div key={date} className="p-4 hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-black text-slate-700 uppercase">{date}</div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-slate-400">{formatBRL(data.withCopa)}</span>
                      <ArrowRightIcon className="w-3 h-3 text-slate-300" />
                      <span className="text-xs font-black text-indigo-600">{formatBRL(data.withoutCopa)}</span>
                    </div>
                  </div>
                  <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="absolute inset-0 bg-slate-200" />
                    <div 
                      className="absolute inset-0 bg-indigo-500" 
                      style={{ width: `${(data.withoutCopa / data.withCopa) * 100}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between">
                    <p className="text-[9px] font-bold text-slate-400 uppercase italic">Expurgo: {formatBRL(diff)}</p>
                    <p className="text-[9px] font-black text-amber-600 uppercase">Impacto: {perc.toFixed(1)}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Collaborator Impact */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="bg-slate-50 border-b border-slate-200">
          <CardTitle className="text-sm font-black text-slate-800 uppercase flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            Impacto Individual por Colaborador
          </CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Como estes itens estão inflando os números de cada um</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase border-b">Colaborador</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase border-b text-center">Vendas (Expurgadas)</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase border-b text-center">Venda Média vs S/ Copa</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase border-b text-center">Itens/Cupom vs S/ Copa</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase border-b text-right">Inflação Rec.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.collaboratorImpact
                .sort((a: any, b: any) => b.withCopa.venda - a.withCopa.venda)
                .map((col: any) => {
                  const tkmReal = col.withCopa.venda / col.withCopa.cupons;
                  const tkmSemCopa = col.withoutCopa.cupons > 0 ? col.withoutCopa.venda / col.withoutCopa.cupons : 0;
                  
                  const paReal = col.withCopa.itens / col.withCopa.cupons;
                  const paSemCopa = col.withoutCopa.cupons > 0 ? col.withoutCopa.itens / col.withoutCopa.cupons : 0;

                  const inflation = ((col.withCopa.venda - col.withoutCopa.venda) / col.withCopa.venda) * 100;

                  return (
                    <tr key={col.name} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-black text-xs text-slate-700 uppercase">{col.name}</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase">{col.withCopa.cupons} vendas totais</div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-xs font-black text-slate-600">{col.withoutCopa.cupons}</span>
                        <span className="text-[9px] font-bold text-slate-400 ml-1">(-{col.withCopa.cupons - col.withoutCopa.cupons})</span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 line-through">{formatBRL(tkmReal)}</span>
                            <span className="text-xs font-black text-indigo-600">{formatBRL(tkmSemCopa)}</span>
                          </div>
                          <div className={cn(
                            "text-[8px] font-black uppercase px-1 rounded-sm mt-0.5",
                            tkmSemCopa < tkmReal ? "text-rose-500" : "text-emerald-500"
                          )}>
                            Var: {formatBRL(tkmSemCopa - tkmReal)}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center">
                           <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 line-through">{paReal.toFixed(2)}</span>
                            <span className="text-xs font-black text-sky-600">{paSemCopa.toFixed(2)}</span>
                          </div>
                           <div className={cn(
                            "text-[8px] font-black uppercase px-1 rounded-sm mt-0.5",
                            paSemCopa < paReal ? "text-rose-500" : "text-emerald-500"
                          )}>
                            Var: {(paSemCopa - paReal).toFixed(2)}
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

      {/* Warning/Insight Section */}
      <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl flex flex-col md:flex-row items-start gap-4">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm shrink-0">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-2">Diagnóstico de Qualidade Operacional</h4>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            A venda de figurinhas atrai clientes para a loja, mas diminui o <span className="text-indigo-600 font-bold">Valor Médio das Vendas</span> e o <span className="text-sky-600 font-bold">Número de Itens por Atendimento</span>. 
            Isso acontece porque muitos clientes compram apenas as figurinhas.
            <br/><br/>
            <strong className="text-slate-800 underline">Dica para Gestão:</strong> Para saber quem realmente está vendendo bem os produtos da loja, olhe para os números "Sem Copa". Eles mostram a produtividade real sem a distorção das figurinhas.
          </p>
        </div>
      </div>

      {/* Transaction Details */}
      <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-black text-slate-800 uppercase flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-600" />
            Detalhamento de Transações (Copa)
          </CardTitle>
          <Badge className="bg-slate-800 text-white font-black text-[10px]">{stats.salesWithCopa.length} Transações</Badge>
        </CardHeader>
        <CardContent className="p-0 max-h-[400px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white shadow-sm z-10">
              <tr>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase border-b">Data/NF</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase border-b">Vendedor</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase border-b text-center">Copa Itens</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase border-b text-right">Valor Total</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase border-b text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.salesWithCopa
                .sort((a, b) => b.dhEmi.localeCompare(a.dhEmi))
                .map((sale) => {
                  const copaItems = sale.itens.filter(i => isCopaItem(i.cProd));
                  const isOnlyCopa = copaItems.length === sale.itens.length;
                  return (
                    <tr key={sale.chave} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="text-[10px] font-black text-slate-700">{format(parseISO(sale.dhEmi), "dd/MM HH:mm")}</div>
                        <div className="text-[8px] text-slate-400 font-bold uppercase">NF: {sale.nf}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-[10px] font-black text-slate-600 uppercase">{sale.vendedor}</div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {copaItems.map((item, idx) => (
                            <Badge key={idx} variant="outline" className={cn(
                              "text-[8px] font-black px-1 py-0",
                              item.cProd === COPA_ALBUM ? "border-sky-200 text-sky-600 bg-sky-50" : "border-emerald-200 text-emerald-600 bg-emerald-50"
                            )}>
                              {item.cProd === COPA_ALBUM ? 'ALBUM' : 'FIG'} x{item.qCom}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="text-[10px] font-black text-slate-700">{formatBRL(parseFloat(sale.vNF))}</div>
                      </td>
                      <td className="p-4 text-center">
                        {isOnlyCopa ? (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[8px] font-black uppercase">Exclusivo Copa</Badge>
                        ) : (
                          <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[8px] font-black uppercase">Venda Mista</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

function ArrowRightIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
