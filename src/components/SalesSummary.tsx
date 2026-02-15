
"use client";

import React, { useMemo } from "react";
import { 
  DetailedSaleRow, 
  ChannelSummaryRow, 
  VinculoTroca
} from "@/lib/types";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Copy, BarChart3, TrendingUp, AlertCircle, ShoppingBag, Gift, RefreshCw, MessageCircle } from "lucide-react";
import { exportToCsv } from "@/lib/csv-utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SalesSummaryProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

export function SalesSummary({ data, vinculos }: SalesSummaryProps) {
  const { toast } = useToast();
  const saidas = useMemo(() => data.filter(r => r.tpNF === 1), [data]);

  // Agregações principais
  const channelSummary = useMemo(() => {
    const agg: Record<string, { cupons: number; venda: number; itens: number }> = {};
    saidas.forEach(r => {
      const canal = r.canal;
      if (!agg[canal]) agg[canal] = { cupons: 0, venda: 0, itens: 0 };
      agg[canal].cupons++;
      agg[canal].venda += parseFloat(r.vNF);
      agg[canal].itens += parseFloat(r.itens_qtd);
    });

    return Object.entries(agg).map(([canal, d]): ChannelSummaryRow => ({
      Canal: canal,
      Cupons: d.cupons.toString(),
      Venda_Total: d.venda.toFixed(2),
      Itens_Total: d.itens.toString(),
      TKM: (d.venda / d.cupons).toFixed(2),
      PA: (d.itens / d.cupons).toFixed(2),
    })).sort((a, b) => parseFloat(b.Venda_Total) - parseFloat(a.Venda_Total));
  }, [saidas]);

  const totalOperador = useMemo(() => {
    const agg: Record<string, { cupons: number; venda: number; itens: number }> = {};
    saidas.forEach(r => {
      if (!agg[r.vendedor]) agg[r.vendedor] = { cupons: 0, venda: 0, itens: 0 };
      agg[r.vendedor].cupons++;
      agg[r.vendedor].venda += parseFloat(r.vNF);
      agg[r.vendedor].itens += parseFloat(r.itens_qtd);
    });
    return Object.entries(agg).map(([vend, d]) => ({
      Vendedor: vend,
      Cupons: d.cupons,
      Venda_Total: d.venda.toFixed(2),
      Itens_Total: d.itens,
      TKM: (d.venda / d.cupons).toFixed(2),
      PA: (d.itens / d.cupons).toFixed(2),
    })).sort((a, b) => parseFloat(b.Venda_Total) - parseFloat(a.Venda_Total));
  }, [saidas]);

  const auditDescontos = useMemo(() => saidas.filter(r => r.tem_desconto && !r.is_troca), [saidas]);
  const suspeitos = useMemo(() => saidas.filter(r => r.is_adicional_suspeito), [saidas]);
  const adicionaisValidos = useMemo(() => saidas.filter(r => r.is_adicional), [saidas]);
  const retiradasOnline = useMemo(() => saidas.filter(r => r.is_retirada_online), [saidas]);

  // WhatsApp Report Generation
  const whatsReport = useMemo(() => {
    let text = "📊 *DESEMPENHO RI HAPPY*\n\n";
    
    totalOperador.forEach(v => {
      const vend = v.Vendedor;
      const loja = saidas.filter(r => r.vendedor === vend && r.canal_consolidado === "VENDA_LOJA");
      const vLoja = loja.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
      
      const ops = saidas.filter(r => r.vendedor === vend && r.is_retirada_online).length;
      const adics = saidas.filter(r => r.vendedor === vend && (r.is_adicional || r.is_adicional_suspeito)).length;
      const taxa = ops > 0 ? ((adics / ops) * 100).toFixed(0) : "0";

      text += `🧑‍💼 *${vend}*\n`;
      text += `🛍️ Loja: R$ ${vLoja.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      text += `🎯 Atend/Adic: ${ops}/${adics} (${taxa}%)\n\n`;
    });
    
    return text.trim();
  }, [totalOperador, saidas]);

  const copyWhats = () => {
    navigator.clipboard.writeText(whatsReport);
    toast({ title: "Copiado!", description: "Relatório formatado para WhatsApp." });
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Tabs defaultValue="geral" className="w-full">
        <div className="sticky top-16 bg-slate-50 z-30 pt-2 pb-4 border-b border-slate-200 overflow-x-auto">
          <TabsList className="bg-transparent p-0 flex justify-start h-auto gap-6 min-w-max">
            <TabsTrigger value="geral" className="tab-trigger-custom">Visão Geral</TabsTrigger>
            <TabsTrigger value="conversao" className="tab-trigger-custom flex items-center gap-2">
              Conversão
              <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                {adicionaisValidos.length + suspeitos.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="auditoria" className="tab-trigger-custom flex items-center gap-2">
              Auditoria
              <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                {auditDescontos.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="matriz" className="tab-trigger-custom">Matriz</TabsTrigger>
            <TabsTrigger value="trocas" className="tab-trigger-custom">Trocas</TabsTrigger>
            <TabsTrigger value="whatsapp" className="tab-trigger-custom flex items-center gap-2 text-emerald-600">
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </TabsTrigger>
          </TabsList>
        </div>

        {/* --- ABA VISÃO GERAL --- */}
        <TabsContent value="geral" className="mt-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {channelSummary.map((c) => (
              <Card key={c.Canal} className="hover:shadow-md transition-shadow">
                <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.Canal}</p>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-xl font-black text-slate-800">
                    R$ {parseFloat(c.Venda_Total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="flex justify-between mt-3 text-[10px] text-slate-500 font-bold uppercase">
                    <span>{c.Cupons} cupons</span>
                    <span>PA {c.PA}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">Resumo por Operador</h3>
              <Button variant="ghost" size="sm" onClick={() => exportToCsv("operadores.csv", totalOperador, ["Vendedor", "Venda_Total"])} className="text-indigo-600 text-xs font-bold">
                <Download className="w-3.5 h-3.5 mr-1" /> EXPORTAR
              </Button>
            </div>
            <Table>
              <TableHeader className="bg-slate-100/50">
                <TableRow>
                  <TableHead className="text-[10px] font-bold">OPERADOR</TableHead>
                  <TableHead className="text-right text-[10px] font-bold">CUPONS</TableHead>
                  <TableHead className="text-right text-[10px] font-bold">VENDA</TableHead>
                  <TableHead className="text-right text-[10px] font-bold">TKM</TableHead>
                  <TableHead className="text-center text-[10px] font-bold">PA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totalOperador.map((v) => (
                  <TableRow key={v.Vendedor}>
                    <TableCell className="font-bold text-slate-700">{v.Vendedor}</TableCell>
                    <TableCell className="text-right">{v.Cupons}</TableCell>
                    <TableCell className="text-right font-mono font-bold">R$ {parseFloat(v.Venda_Total).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-right text-indigo-600">R$ {v.TKM}</TableCell>
                    <TableCell className="text-center">
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-bold">{v.PA}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        {/* --- ABA CONVERSÃO --- */}
        <TabsContent value="conversao" className="mt-6 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                <p className="text-[10px] text-slate-400 font-bold uppercase">Atendimentos</p>
              </div>
              <p className="text-3xl font-black text-indigo-600">{retiradasOnline.length}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Gift className="w-3.5 h-3.5 text-emerald-400" />
                <p className="text-[10px] text-slate-400 font-bold uppercase">Adicionais</p>
              </div>
              <p className="text-3xl font-black text-emerald-600">{adicionaisValidos.length}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
                <p className="text-[10px] text-slate-400 font-bold uppercase">Suspeitos</p>
              </div>
              <p className="text-3xl font-black text-orange-600">{suspeitos.length}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                <p className="text-[10px] text-slate-400 font-bold uppercase">Conversão</p>
              </div>
              <p className="text-3xl font-black text-blue-600">
                {retiradasOnline.length > 0 
                  ? (((adicionaisValidos.length + suspeitos.length) / retiradasOnline.length) * 100).toFixed(1) 
                  : "0"}%
              </p>
            </div>
          </div>

          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30">
              <h3 className="font-bold text-slate-800 text-sm">Tabela de Conversão</h3>
            </div>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold">OPERADOR</TableHead>
                  <TableHead className="text-center font-bold">ATEND.</TableHead>
                  <TableHead className="text-center font-bold text-emerald-700">ADIC.</TableHead>
                  <TableHead className="text-center font-bold text-orange-600">SUSP.</TableHead>
                  <TableHead className="text-center font-bold text-blue-600">TAXA %</TableHead>
                  <TableHead className="text-right font-bold">VALOR ADIC.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totalOperador.map((v) => {
                  const ops = retiradasOnline.filter(r => r.vendedor === v.Vendedor).length;
                  const adics = adicionaisValidos.filter(r => r.vendedor === v.Vendedor).length;
                  const susp = suspeitos.filter(r => r.vendedor === v.Vendedor).length;
                  const valorAdics = saidas.filter(r => r.vendedor === v.Vendedor && (r.is_adicional || r.is_adicional_suspeito))
                                          .reduce((acc, r) => acc + parseFloat(r.vNF), 0);
                  const taxa = ops > 0 ? (((adics + susp) / ops) * 100).toFixed(1) : "0.0";
                  
                  return (
                    <TableRow key={v.Vendedor}>
                      <TableCell className="font-bold">{v.Vendedor}</TableCell>
                      <TableCell className="text-center">{ops}</TableCell>
                      <TableCell className="text-center font-bold text-emerald-700">{adics}</TableCell>
                      <TableCell className="text-center font-bold text-orange-600">{susp}</TableCell>
                      <TableCell className="text-center font-black text-blue-600">{taxa}%</TableCell>
                      <TableCell className="text-right font-bold">R$ {valorAdics.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        {/* --- ABA AUDITORIA --- */}
        <TabsContent value="auditoria" className="mt-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200">
              <p className="text-3xl font-black text-amber-600">R$ {auditDescontos.reduce((acc, r) => acc + parseFloat(r.desconto_total), 0).toFixed(2)}</p>
              <p className="text-[10px] text-amber-800 font-bold uppercase">Total Descontos</p>
            </div>
            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200">
              <p className="text-3xl font-black text-emerald-600">{auditDescontos.filter(r => r.status_auditoria === "ADICIONAL").length}</p>
              <p className="text-[10px] text-emerald-800 font-bold uppercase">Adicionais Válidos</p>
            </div>
            <div className="bg-red-50 p-6 rounded-2xl border border-red-200">
              <p className="text-3xl font-black text-red-600">{auditDescontos.filter(r => r.status_auditoria === "FORA_DO_PADRAO").length}</p>
              <p className="text-[10px] text-red-800 font-bold uppercase">Fora do Padrão</p>
            </div>
          </div>

          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-amber-50 border-b border-amber-100">
              <h3 className="text-sm font-bold text-amber-800">Listagem de Vendas com Desconto</h3>
              <p className="text-xs text-amber-600">Análise de todas as notas que possuem vDesc &gt; 0</p>
            </div>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-[10px] font-bold">VENDEDOR</TableHead>
                  <TableHead className="text-right text-[10px] font-bold">VENDA</TableHead>
                  <TableHead className="text-right text-[10px] font-bold">DESCONTO</TableHead>
                  <TableHead className="text-center text-[10px] font-bold">STATUS</TableHead>
                  <TableHead className="text-[10px] font-bold">TIPO</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditDescontos.slice(0, 50).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-xs">{r.vendedor}</TableCell>
                    <TableCell className="text-right text-xs">R$ {r.vNF}</TableCell>
                    <TableCell className="text-right text-xs font-bold text-amber-700">R$ {r.desconto_total}</TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded font-black",
                        r.status_auditoria === "ADICIONAL" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      )}>{r.status_auditoria}</span>
                    </TableCell>
                    <TableCell className="text-[10px] text-slate-500 uppercase">{r.tipo_desconto}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        {/* --- ABA MATRIZ --- */}
        <TabsContent value="matriz" className="mt-6">
           <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">Matriz Canal x Operador (R$)</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-800 hover:bg-slate-800">
                    <TableHead className="text-white font-bold border-r border-slate-700 min-w-[150px]">CANAL</TableHead>
                    {totalOperador.map(v => (
                      <TableHead key={v.Vendedor} className="text-white font-bold text-center border-r border-slate-700 min-w-[120px]">{v.Vendedor}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channelSummary.map(c => (
                    <TableRow key={c.Canal}>
                      <TableCell className="font-bold text-slate-800 border-r">{c.Canal}</TableCell>
                      {totalOperador.map(v => {
                        const valor = saidas.filter(r => r.canal === c.Canal && r.vendedor === v.Vendedor)
                                            .reduce((acc, r) => acc + parseFloat(r.vNF), 0);
                        return (
                          <TableCell key={v.Vendedor} className="text-center border-r font-mono text-xs">
                            {valor > 0 ? `R$ ${valor.toFixed(0)}` : "-"}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </TabsContent>

        {/* --- ABA TROCAS --- */}
        <TabsContent value="trocas" className="mt-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-indigo-50 border-indigo-200">
              <CardHeader className="p-4">
                <p className="text-3xl font-black text-indigo-700">{vinculos.length}</p>
                <p className="text-[10px] text-indigo-600 font-bold uppercase">Vínculos</p>
              </CardHeader>
            </Card>
            <Card className="bg-slate-50 border-slate-200">
              <CardHeader className="p-4">
                <p className="text-3xl font-black text-slate-700">{saidas.filter(r => r.is_troca).length}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Notas Saída</p>
              </CardHeader>
            </Card>
            <Card className="bg-emerald-50 border-emerald-200">
              <CardHeader className="p-4">
                <p className="text-3xl font-black text-emerald-700">R$ {vinculos.reduce((acc, v) => acc + v.valor_diferenca, 0).toFixed(2)}</p>
                <p className="text-[10px] text-emerald-600 font-bold uppercase">Diferença Total</p>
              </CardHeader>
            </Card>
          </div>

          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-800">
                <TableRow>
                  <TableHead className="text-white font-bold">VENDEDOR</TableHead>
                  <TableHead className="text-right text-white font-bold">DEVOLUÇÃO</TableHead>
                  <TableHead className="text-right text-white font-bold">TROCA</TableHead>
                  <TableHead className="text-right text-white font-bold bg-emerald-700">DIFERENÇA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totalOperador.map((v, idx) => {
                  const vTrocas = vinculos.filter(vi => vi.vendedor === v.Vendedor);
                  if (vTrocas.length === 0) return null;
                  const totalDif = vTrocas.reduce((acc, vi) => acc + vi.valor_diferenca, 0);
                  const totalDev = vTrocas.reduce((acc, vi) => acc + vi.valor_devolvido, 0);
                  const totalSaida = vTrocas.reduce((acc, vi) => acc + vi.valor_trocado, 0);
                  
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-bold">{v.Vendedor}</TableCell>
                      <TableCell className="text-right">R$ {totalDev.toFixed(2)}</TableCell>
                      <TableCell className="text-right">R$ {totalSaida.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-black text-emerald-600 bg-emerald-50/30">R$ {totalDif.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        {/* --- ABA WHATSAPP --- */}
        <TabsContent value="whatsapp" className="mt-6">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-6">
               <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-600" /> Relatório Conciso
              </h3>
              <Button onClick={copyWhats} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-8">
                Copiar Texto
              </Button>
            </div>
            <pre className="w-full h-[400px] p-6 bg-slate-50 border rounded-xl font-mono text-sm leading-relaxed overflow-auto">
              {whatsReport}
            </pre>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
