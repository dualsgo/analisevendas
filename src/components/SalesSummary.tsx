
"use client";

import React, { useMemo, useState } from "react";
import { 
  DetailedSaleRow, 
  ChannelSummaryRow, 
  VinculoTroca,
  Item
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
import { 
  Download, 
  AlertCircle, 
  MessageCircle, 
  Store, 
  Users, 
  Search,
  ChevronDown,
  ChevronUp,
  Package,
  FileText,
  CreditCard,
  ArrowRightLeft,
  User,
  Hash
} from "lucide-react";
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
  const [searchTerm, setSearchTerm] = useState("");

  const formatCanal = (canal: string) => {
    switch (canal) {
      case "LOJA_FISICA": return "Loja Física";
      case "RETIRADA_ONLINE": return "Retirada Online";
      case "RETIRADA_ADICIONAL": return "Retirada Adicional";
      case "TROCA_COM_DIFERENCA": return "Troca com Diferença";
      case "TROCA_SEM_DIFERENCA": return "Troca sem Diferença";
      case "VENDA_LOJA": return "Venda Loja";
      case "TROCA": return "Trocas";
      default: return canal.replace(/_/g, " ");
    }
  };

  const getStatusLabel = (status: string, detail?: string) => {
    switch (status) {
      case "ADICIONAL": return "CLASSIFICADO COMO ADICIONAL";
      case "FORA_DO_PADRAO": return "DESCONTO FORA DO PADRÃO PARA ADICIONAL";
      default:
        switch (detail) {
          case "ADICIONAL_VALIDO": return "ADICIONAL VÁLIDO (ENDEREÇO REAL)";
          case "ADICIONAL_ENDERECO_IGUAL": return "ADICIONAL COM ENDEREÇO IGUAL À LOJA";
          case "FORA_FAIXA_MENOR": return "DESCONTO ABAIXO DA FAIXA ESPERADA";
          case "FORA_FAIXA_MAIOR": return "DESCONTO ACIMA DA FAIXA ESPERADA";
          case "SUSPEITO_MESMO_DIA": return "VENDA SUSPEITA (MESMO CPF NO MESMO DIA)";
          case "COM_DESCONTO": return "ADICIONAL IDENTIFICADO PELO DESCONTO";
          default: return status || "NÃO CLASSIFICADO";
        }
    }
  };

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

  const resumoVendaLoja = useMemo(() => {
    const agg: Record<string, { cupons: number; venda: number; itens: number }> = {};
    saidas.filter(r => r.canal_consolidado === "VENDA_LOJA").forEach(r => {
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
  const atendimentosOnline = useMemo(() => saidas.filter(r => r.is_retirada_online), [saidas]);

  const filteredTransactions = useMemo(() => {
    return data.filter(r => 
      r.nf.includes(searchTerm) || 
      r.vendedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.nome_dest.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.cpf_cnpj_dest.includes(searchTerm)
    );
  }, [data, searchTerm]);

  const whatsReport = useMemo(() => {
    let text = "📊 *DESEMPENHO RI HAPPY*\n\n";
    totalOperador.forEach(v => {
      const vend = v.Vendedor;
      const vendaLoja = saidas.filter(r => r.vendedor === vend && r.canal_consolidado === "VENDA_LOJA")
                              .reduce((acc, r) => acc + parseFloat(r.vNF), 0);
      const ops = atendimentosOnline.filter(r => r.vendedor === vend).length;
      const adics = adicionaisValidos.filter(r => r.vendedor === vend).length;
      const susp = suspeitos.filter(r => r.vendedor === vend).length;
      const taxa = ops > 0 ? (((adics + susp) / ops) * 100).toFixed(0) : "0";

      text += `🧑‍💼 *${vend}*\n`;
      text += `🛍️ Venda Loja: R$ ${vendaLoja.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      text += `🎯 Conversão Retirada: ${ops} atend. / ${adics + susp} adic. (${taxa}%)\n\n`;
    });
    return text.trim();
  }, [totalOperador, saidas, atendimentosOnline, adicionaisValidos, suspeitos]);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <Tabs defaultValue="geral" className="w-full">
        <div className="sticky top-16 bg-slate-50 z-40 pt-2 pb-4 border-b border-slate-200 overflow-x-auto">
          <TabsList className="bg-transparent p-0 flex justify-start h-auto gap-6 min-w-max">
            <TabsTrigger value="geral" className="tab-trigger-custom">VISÃO GERAL</TabsTrigger>
            <TabsTrigger value="venda_loja" className="tab-trigger-custom">VENDA LOJA + ADICIONAIS</TabsTrigger>
            <TabsTrigger value="operadores" className="tab-trigger-custom">PERFORMANCE POR CANAL</TabsTrigger>
            <TabsTrigger value="conversao" className="tab-trigger-custom flex items-center gap-2">
              ADICIONAIS E CONVERSÃO
              <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                {adicionaisValidos.length + suspeitos.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="auditoria" className="tab-trigger-custom flex items-center gap-2">
              AUDITORIA DE DESCONTOS
              <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                {auditDescontos.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="trocas" className="tab-trigger-custom flex items-center gap-2">
               TROCAS VINCULADAS
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                {vinculos.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="transacoes" className="tab-trigger-custom">LISTAGEM DE TRANSAÇÕES</TabsTrigger>
            <TabsTrigger value="whatsapp" className="tab-trigger-custom flex items-center gap-2 text-emerald-600">
              <MessageCircle className="w-3.5 h-3.5" /> WHATSAPP
            </TabsTrigger>
          </TabsList>
        </div>

        {/* --- ABA VISÃO GERAL --- */}
        <TabsContent value="geral" className="mt-6 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {channelSummary.map((c) => (
              <Card key={c.Canal} className="hover:shadow-md transition-shadow border-slate-200">
                <CardHeader className="p-5 pb-2">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-indigo-500" />
                    <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest">{formatCanal(c.Canal)}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-5 pt-2">
                  <div className="text-2xl font-black text-slate-800 mb-4">
                    R$ {parseFloat(c.Venda_Total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Cupons</p>
                      <p className="text-sm font-bold text-slate-700">{c.Cupons}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Itens Vendidos</p>
                      <p className="text-sm font-bold text-slate-700">{c.Itens_Total}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Ticket Médio (TKM)</p>
                      <p className="text-sm font-bold text-indigo-600">R$ {c.TKM}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Peças/Atendimento (PA)</p>
                      <p className="text-sm font-bold text-emerald-600">{c.PA}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 text-sm tracking-tight uppercase">Resumo Geral por Operador</h3>
              <Button variant="outline" size="sm" onClick={() => exportToCsv("operadores_resumo.csv", totalOperador, ["Vendedor", "Cupons", "Venda_Total", "Itens_Total", "TKM", "PA"])} className="text-indigo-600 border-indigo-200">
                <Download className="w-3.5 h-3.5 mr-2" /> EXPORTAR CSV
              </Button>
            </div>
            <Table>
              <TableHeader className="bg-slate-100/50">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase">Operador</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Cupons</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Itens Totais</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Venda Total (R$)</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Ticket Médio (TKM)</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase">Peças/Atendimento (PA)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totalOperador.map((v) => (
                  <TableRow key={v.Vendedor} className="hover:bg-slate-50/80">
                    <TableCell className="font-bold text-slate-700">{v.Vendedor}</TableCell>
                    <TableCell className="text-right font-medium">{v.Cupons}</TableCell>
                    <TableCell className="text-right font-medium">{v.Itens_Total}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-slate-800">R$ {parseFloat(v.Venda_Total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right text-indigo-600 font-bold">R$ {v.TKM}</TableCell>
                    <TableCell className="text-center">
                      <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-bold">{v.PA}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        {/* --- ABA VENDA LOJA --- */}
        <TabsContent value="venda_loja" className="mt-6 space-y-10">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-emerald-50/30">
              <h3 className="font-black text-slate-800 text-sm tracking-tight uppercase">Performance Venda Loja (Física + Adicionais)</h3>
              <Button variant="outline" size="sm" onClick={() => exportToCsv("venda_loja_resumo.csv", resumoVendaLoja, ["Vendedor", "Cupons", "Venda_Total", "Itens_Total", "TKM", "PA"])} className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                <Download className="w-3.5 h-3.5 mr-2" /> EXPORTAR CSV
              </Button>
            </div>
            <Table>
              <TableHeader className="bg-slate-100/50">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase">Operador</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Cupons</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Itens Totais</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Venda Total (R$)</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Ticket Médio (TKM)</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase">Peças/Atendimento (PA)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumoVendaLoja.map((v) => (
                  <TableRow key={v.Vendedor} className="hover:bg-slate-50/80">
                    <TableCell className="font-bold text-slate-700">{v.Vendedor}</TableCell>
                    <TableCell className="text-right font-medium">{v.Cupons}</TableCell>
                    <TableCell className="text-right font-medium">{v.Itens_Total}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-slate-800">R$ {parseFloat(v.Venda_Total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-bold">R$ {v.TKM}</TableCell>
                    <TableCell className="text-center">
                      <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold">{v.PA}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        {/* --- ABA PERFORMANCE POR CANAL --- */}
        <TabsContent value="operadores" className="mt-6 space-y-10">
           <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-black text-slate-800 text-sm tracking-tight uppercase">Performance Detalhada por Canal e Operador</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-900 hover:bg-slate-900 border-none">
                    <TableHead className="text-white font-black text-[10px] uppercase border-r border-slate-700 min-w-[200px]">Canal de Venda</TableHead>
                    {totalOperador.map(v => (
                      <TableHead key={v.Vendedor} className="text-white font-black text-[10px] uppercase text-center border-r border-slate-700 min-w-[150px]">{v.Vendedor}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channelSummary.map(c => (
                    <TableRow key={c.Canal}>
                      <TableCell className="font-bold text-slate-800 border-r bg-slate-50/30 uppercase text-[11px]">{formatCanal(c.Canal)}</TableCell>
                      {totalOperador.map(v => {
                        const filt = saidas.filter(r => r.canal === c.Canal && r.vendedor === v.Vendedor);
                        const venda = filt.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
                        const cupons = filt.length;
                        const itens = filt.reduce((acc, r) => acc + parseFloat(r.itens_qtd), 0);
                        const tkm = cupons > 0 ? (venda / cupons).toFixed(2) : "0.00";
                        const pa = cupons > 0 ? (itens / cupons).toFixed(2) : "0.00";
                        
                        return (
                          <TableCell key={v.Vendedor} className="border-r p-3">
                            {cupons > 0 ? (
                              <div className="space-y-1 text-center">
                                <p className="text-[11px] font-black text-slate-800">R$ {venda.toFixed(0)}</p>
                                <div className="flex justify-center gap-2 text-[9px] text-slate-400 font-bold uppercase">
                                  <span>{cupons} CP</span>
                                  <span>{itens} IT</span>
                                </div>
                                <div className="text-[9px] flex justify-center gap-1 font-bold">
                                  <span className="text-indigo-500">TKM {tkm}</span>
                                  <span className="text-emerald-500">PA {pa}</span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-center text-slate-300">-</p>
                            )}
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

        {/* --- ABA ADICIONAIS --- */}
        <TabsContent value="conversao" className="mt-6 space-y-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Card className="bg-white border-slate-200">
              <CardHeader className="p-5 pb-2">
                <p className="text-[10px] text-slate-400 font-black uppercase">Oportunidades de Retirada</p>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <p className="text-3xl font-black text-indigo-600">{atendimentosOnline.length}</p>
                <p className="text-[10px] text-slate-400 mt-1">ATENDIMENTOS ONLINE IDENTIFICADOS</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-slate-200">
              <CardHeader className="p-5 pb-2">
                <p className="text-[10px] text-slate-400 font-black uppercase">Adicionais Válidos</p>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <p className="text-3xl font-black text-emerald-600">{adicionaisValidos.length}</p>
                <p className="text-[10px] text-slate-400 mt-1">DENTRO DO PADRÃO DE DESCONTO</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-slate-200">
              <CardHeader className="p-5 pb-2">
                <p className="text-[10px] text-slate-400 font-black uppercase">Vendas Suspeitas de Adicional</p>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <p className="text-3xl font-black text-orange-600">{suspeitos.length}</p>
                <p className="text-[10px] text-slate-400 mt-1">COMPRAS NO MESMO DIA DA RETIRADA</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-slate-200">
              <CardHeader className="p-5 pb-2">
                <p className="text-[10px] text-slate-400 font-black uppercase">Taxa de Conversão Real</p>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <p className="text-3xl font-black text-blue-600">
                  {atendimentosOnline.length > 0 
                    ? (((adicionaisValidos.length + suspeitos.length) / atendimentosOnline.length) * 100).toFixed(1) 
                    : "0"}%
                </p>
                <p className="text-[10px] text-slate-400 mt-1">RATIO DE ADICIONAIS POR ATENDIMENTOS</p>
              </CardContent>
            </Card>
          </div>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30">
              <h3 className="font-black text-slate-800 text-sm tracking-tight uppercase">Monitoramento de Conversão por Operador</h3>
            </div>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-black text-[10px] uppercase">Operador</TableHead>
                  <TableHead className="text-center font-black text-[10px] uppercase">Atendimentos Online</TableHead>
                  <TableHead className="text-center font-black text-[10px] uppercase text-emerald-700">Adicionais Padrão</TableHead>
                  <TableHead className="text-center font-black text-[10px] uppercase text-orange-600">Vendas Suspeitas</TableHead>
                  <TableHead className="text-center font-black text-[10px] uppercase text-blue-600">Conversão (%)</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase">Venda Total Adicional (R$)</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase">Ticket Médio (TKM)</TableHead>
                  <TableHead className="text-center font-black text-[10px] uppercase">Peças/Atend. (PA)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totalOperador.map((v) => {
                  const ops = atendimentosOnline.filter(r => r.vendedor === v.Vendedor).length;
                  const adics = adicionaisValidos.filter(r => r.vendedor === v.Vendedor).length;
                  const susp = suspeitos.filter(r => r.vendedor === v.Vendedor).length;
                  const filteredAdics = saidas.filter(r => r.vendedor === v.Vendedor && (r.is_adicional || r.is_adicional_suspeito));
                  const valorAdics = filteredAdics.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
                  const itensAdics = filteredAdics.reduce((acc, r) => acc + parseFloat(r.itens_qtd), 0);
                  const taxa = ops > 0 ? (((adics + susp) / ops) * 100).toFixed(1) : "0.0";
                  const tkm = (adics + susp) > 0 ? (valorAdics / (adics + susp)).toFixed(2) : "0.00";
                  const pa = (adics + susp) > 0 ? (itensAdics / (adics + susp)).toFixed(2) : "0.00";
                  
                  return (
                    <TableRow key={v.Vendedor} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold text-slate-700">{v.Vendedor}</TableCell>
                      <TableCell className="text-center font-medium">{ops}</TableCell>
                      <TableCell className="text-center font-bold text-emerald-700">{adics}</TableCell>
                      <TableCell className="text-center font-bold text-orange-600">{susp}</TableCell>
                      <TableCell className="text-center font-black text-blue-600">{taxa}%</TableCell>
                      <TableCell className="text-right font-mono font-bold text-slate-800">R$ {valorAdics.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-indigo-600">R$ {tkm}</TableCell>
                      <TableCell className="text-center font-bold text-emerald-600">{pa}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </section>

          {suspeitos.length > 0 && (
            <section className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-orange-50 bg-orange-50/50">
                <h3 className="font-black text-orange-800 text-sm tracking-tight uppercase flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> 
                  Vendas Suspeitas de serem Adicional (Mesmo CPF no dia da Retirada)
                </h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-orange-50/30">
                    <TableHead className="text-[10px] font-black uppercase">Operador</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Cliente</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Data da Venda</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase">Venda (R$)</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase">Itens</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase">Status da Auditoria</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase">Relacionamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suspeitos.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-bold">{r.vendedor}</TableCell>
                      <TableCell className="text-[11px]">
                        <p className="font-bold">{r.nome_dest}</p>
                        <p className="text-slate-400 font-mono">{r.cpf_cnpj_dest}</p>
                      </TableCell>
                      <TableCell className="text-xs">{r.dhEmi}</TableCell>
                      <TableCell className="text-right font-mono font-bold">R$ {r.vNF}</TableCell>
                      <TableCell className="text-center font-bold">{r.itens_qtd}</TableCell>
                      <TableCell className="text-center">
                        <span className="text-[9px] px-2 py-1 rounded bg-slate-100 text-slate-600 font-black">
                          {getStatusLabel(r.status_auditoria)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[9px] font-black",
                          r.tipo_retirada_associada === "ANTES" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                        )}>
                          REALIZADA {r.tipo_retirada_associada} DA RETIRADA
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          )}
        </TabsContent>

        {/* --- ABA AUDITORIA --- */}
        <TabsContent value="auditoria" className="mt-6 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-amber-50 border-amber-200">
              <CardHeader className="p-5">
                <CardTitle className="text-3xl font-black text-amber-600">
                  R$ {auditDescontos.reduce((acc, r) => acc + parseFloat(r.desconto_total), 0).toFixed(2)}
                </CardTitle>
                <p className="text-[10px] text-amber-800 font-black uppercase mt-1">Volume Total de Descontos Aplicados</p>
              </CardHeader>
            </Card>
            <Card className="bg-emerald-50 border-emerald-200">
              <CardHeader className="p-5">
                <CardTitle className="text-3xl font-black text-emerald-600">
                  {auditDescontos.filter(r => r.status_auditoria === "ADICIONAL").length}
                </CardTitle>
                <p className="text-[10px] text-emerald-800 font-black uppercase mt-1">Notas Classificadas como Adicional Válido</p>
              </CardHeader>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <CardHeader className="p-5">
                <CardTitle className="text-3xl font-black text-red-600">
                  {auditDescontos.filter(r => r.status_auditoria === "FORA_DO_PADRAO").length}
                </CardTitle>
                <p className="text-[10px] text-red-800 font-black uppercase mt-1">Descontos Fora do Padrão</p>
              </CardHeader>
            </Card>
          </div>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 bg-amber-50/50 border-b border-amber-100">
              <h3 className="text-sm font-black text-amber-800 uppercase tracking-tighter">Análise de Descontos Aplicados</h3>
              <p className="text-[11px] text-amber-600 mt-1 font-medium">
                Descontos identificados como "Fora do Padrão" estão fora da faixa esperada para adicionais (8% a 12%) e não podem ser classificados automaticamente por falta de informações complementares.
              </p>
            </div>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase">Operador</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Venda Total</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Cupons</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Itens</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Valor Desconto</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase">Status da Auditoria</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditDescontos.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-bold text-xs">{r.vendedor}</TableCell>
                    <TableCell className="text-right text-xs font-mono">R$ {r.vNF}</TableCell>
                    <TableCell className="text-right text-xs">1</TableCell>
                    <TableCell className="text-right text-xs">{r.itens_qtd}</TableCell>
                    <TableCell className="text-right text-xs font-mono font-bold text-amber-700">R$ {r.desconto_total} ({parseFloat(r.percentual_desconto) * 100}%)</TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        "text-[9px] px-2 py-1 rounded font-black",
                        r.status_auditoria === "ADICIONAL" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      )}>
                        {getStatusLabel(r.status_auditoria)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        {/* --- ABA TROCAS --- */}
        <TabsContent value="trocas" className="mt-6 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-purple-50 border-purple-200">
              <CardHeader className="p-5">
                <CardTitle className="text-3xl font-black text-purple-700">{vinculos.length}</CardTitle>
                <p className="text-[10px] text-purple-800 font-black uppercase mt-1">Vínculos de Troca Identificados</p>
              </CardHeader>
            </Card>
            <Card className="bg-indigo-50 border-indigo-200">
              <CardHeader className="p-5">
                <CardTitle className="text-3xl font-black text-indigo-700">
                  R$ {vinculos.reduce((acc, v) => acc + v.valor_diferenca, 0).toFixed(2)}
                </CardTitle>
                <p className="text-[10px] text-indigo-800 font-black uppercase mt-1">Diferença Total Recebida em Trocas</p>
              </CardHeader>
            </Card>
            <Card className="bg-slate-50 border-slate-200">
              <CardHeader className="p-5">
                <CardTitle className="text-3xl font-black text-slate-700">
                  {vinculos.reduce((acc, v) => acc + v.diferenca_itens, 0)}
                </CardTitle>
                <p className="text-[10px] text-slate-800 font-black uppercase mt-1">Saldo Total de Itens (Entrada - Saída)</p>
              </CardHeader>
            </Card>
          </div>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-purple-50/30">
              <h3 className="font-black text-slate-800 text-sm tracking-tight uppercase">Listagem Detalhada de Trocas (Vínculo Entrada ↔ Saída)</h3>
              <Button variant="outline" size="sm" onClick={() => exportToCsv("trocas_detalhadas.csv", vinculos, ["vendedor", "cpf_cliente", "nome_cliente", "data_entrada", "data_saida", "valor_devolvido", "valor_trocado", "valor_diferenca", "diferenca_itens"])} className="text-purple-700 border-purple-200 hover:bg-purple-50">
                <Download className="w-3.5 h-3.5 mr-2" /> EXPORTAR CSV
              </Button>
            </div>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Cliente / CPF</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Operador</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Crédito Devolvido (R$)</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Valor Nova Compra (R$)</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase text-indigo-700">Diferença Paga (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vinculos.map((v, i) => (
                  <ExpandableTradeRow key={i} vinculo={v} data={data} />
                ))}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        {/* --- ABA TRANSAÇÕES --- */}
        <TabsContent value="transacoes" className="mt-6 space-y-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Pesquisar por NF, Operador ou Cliente..." 
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <FileText className="w-4 h-4" />
              {filteredTransactions.length} TRANSAÇÕES ENCONTRADAS
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Nota Fiscal / Data</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Operador</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Canal de Venda</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Venda Total (R$)</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase">Itens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.slice(0, 100).map((r, i) => (
                  <ExpandableRow key={i} row={r} getStatusLabel={getStatusLabel} formatCanal={formatCanal} />
                ))}
              </TableBody>
            </Table>
            {filteredTransactions.length > 100 && (
              <div className="p-4 text-center bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Mostrando as primeiras 100 transações de {filteredTransactions.length}. Refine sua busca para ver mais.
              </div>
            )}
          </div>
        </TabsContent>

        {/* --- ABA WHATSAPP --- */}
        <TabsContent value="whatsapp" className="mt-6">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 flex flex-col items-center">
            <div className="w-full max-w-2xl flex justify-between items-center mb-6">
               <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-tighter">
                <MessageCircle className="w-5 h-5 text-emerald-600" /> Relatório de Performance p/ WhatsApp
              </h3>
              <Button onClick={() => {
                navigator.clipboard.writeText(whatsReport);
                toast({ title: "Copiado!", description: "Relatório pronto para enviar." });
              }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl px-10">
                COPIAR RELATÓRIO
              </Button>
            </div>
            <pre className="w-full max-w-2xl h-[500px] p-8 bg-slate-900 text-emerald-400 border rounded-2xl font-mono text-sm leading-relaxed overflow-auto shadow-2xl whitespace-pre-wrap">
              {whatsReport}
            </pre>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ExpandableRow({ row, getStatusLabel, formatCanal }: { row: DetailedSaleRow, getStatusLabel: Function, formatCanal: Function }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <TableRow 
        className={cn("cursor-pointer hover:bg-indigo-50/50 transition-colors", isOpen && "bg-indigo-50/30")}
        onClick={() => setIsOpen(!isOpen)}
      >
        <TableCell>
          {isOpen ? <ChevronUp className="w-4 h-4 text-indigo-500" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </TableCell>
        <TableCell className="text-xs">
          <p className="font-bold text-indigo-700">NF {row.nf}</p>
          <p className="text-slate-400 font-medium">{row.dhEmi}</p>
        </TableCell>
        <TableCell className="text-xs font-bold text-slate-700 uppercase">{row.vendedor}</TableCell>
        <TableCell>
          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-black uppercase">
            {formatCanal(row.canal)}
          </span>
        </TableCell>
        <TableCell className="text-right font-mono font-bold text-slate-800">R$ {row.vNF}</TableCell>
        <TableCell className="text-center font-bold">{row.itens_qtd}</TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
          <TableCell colSpan={6} className="p-0 border-b border-indigo-100">
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-2 duration-300">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2">
                  <Package className="w-3.5 h-3.5" /> Detalhamento de Produtos
                </h4>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-[9px] font-black uppercase">Descrição</TableHead>
                        <TableHead className="text-center text-[9px] font-black uppercase">Qtd</TableHead>
                        <TableHead className="text-right text-[9px] font-black uppercase">Venda (R$)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {row.itens.map((item: Item, idx: number) => (
                        <TableRow key={idx} className="hover:bg-transparent">
                          <TableCell className="text-[10px] font-bold text-slate-700">{item.xProd}</TableCell>
                          <TableCell className="text-center text-[10px]">{item.qCom}</TableCell>
                          <TableCell className="text-right text-[10px] font-mono">R$ {item.vProd.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2">
                  <User className="w-3.5 h-3.5" /> Informações do Cliente e Pagamento
                </h4>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Cliente</p>
                      <p className="text-xs font-bold text-slate-800">{row.nome_dest || "NÃO IDENTIFICADO"}</p>
                      <p className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                        <Hash className="w-2 h-2" /> {row.cpf_cnpj_dest || "CPF NÃO INFORMADO"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Análise de Auditoria</p>
                      <p className="text-[10px] font-black text-indigo-600 uppercase mt-1 leading-tight">
                        {getStatusLabel(row.status_auditoria)}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                        {getStatusLabel(row.status_auditoria, row.tipo_desconto)}
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1 mb-2">
                      <CreditCard className="w-3 h-3" /> Resumo Financeiro
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-50 p-2 rounded">
                        <p className="text-[8px] text-slate-400 font-black uppercase">Valor Total</p>
                        <p className="text-[10px] font-bold">R$ {row.vNF}</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded">
                        <p className="text-[8px] text-slate-400 font-black uppercase">Desconto</p>
                        <p className="text-[10px] font-bold text-amber-600">R$ {row.desconto_total}</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded">
                        <p className="text-[8px] text-slate-400 font-black uppercase">Troco</p>
                        <p className="text-[10px] font-bold">R$ {row.vTroco}</p>
                      </div>
                    </div>
                  </div>
                  {row.is_adicional_suspeito && (
                    <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg">
                      <p className="text-[9px] text-orange-800 font-black uppercase flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Alerta de Suspeita (Conversão Forçada)
                      </p>
                      <p className="text-[10px] text-orange-700 mt-1 leading-tight">
                        Venda realizada {row.tipo_retirada_associada} da retirada online ({row.data_retirada_associada}).
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function ExpandableTradeRow({ vinculo, data }: { vinculo: VinculoTroca, data: DetailedSaleRow[] }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const notaEntrada = useMemo(() => data.find(r => r.chave === vinculo.chave_entrada), [data, vinculo.chave_entrada]);
  const notaSaida = useMemo(() => data.find(r => r.chave === vinculo.chave_saida), [data, vinculo.chave_saida]);

  return (
    <>
      <TableRow 
        className={cn("cursor-pointer hover:bg-purple-50/50 transition-colors", isOpen && "bg-purple-50/30")}
        onClick={() => setIsOpen(!isOpen)}
      >
        <TableCell>
          {isOpen ? <ChevronUp className="w-4 h-4 text-purple-500" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </TableCell>
        <TableCell className="text-xs">
          <p className="font-bold text-slate-800">{vinculo.nome_cliente || "TROCA SEM CPF"}</p>
          <p className="text-slate-400 font-mono text-[10px]">{vinculo.cpf_cliente || "-"}</p>
        </TableCell>
        <TableCell className="text-xs font-bold text-slate-700 uppercase">{vinculo.vendedor}</TableCell>
        <TableCell className="text-right font-mono font-bold text-slate-700">R$ {vinculo.valor_devolvido.toFixed(2)}</TableCell>
        <TableCell className="text-right font-mono text-slate-600">R$ {vinculo.valor_trocado.toFixed(2)}</TableCell>
        <TableCell className="text-right font-mono font-bold text-indigo-700">R$ {vinculo.valor_diferenca.toFixed(2)}</TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
          <TableCell colSpan={6} className="p-0 border-b border-purple-100">
            <div className="p-8 space-y-8 animate-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Nota de Entrada */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-red-500" /> Itens Recebidos (Crédito de Troca)
                  </h4>
                  <div className="bg-white rounded-xl border border-red-100 overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-red-50/30">
                        <TableRow>
                          <TableHead className="text-[9px] font-black">Descrição</TableHead>
                          <TableHead className="text-center text-[9px] font-black">Qtd</TableHead>
                          <TableHead className="text-right text-[9px] font-black">Valor (R$)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {notaEntrada?.itens.map((item, idx) => (
                          <TableRow key={idx} className="hover:bg-transparent">
                            <TableCell className="text-[10px] font-bold text-slate-700">{item.xProd}</TableCell>
                            <TableCell className="text-center text-[10px]">{item.qCom}</TableCell>
                            <TableCell className="text-right text-[10px] font-mono">R$ {item.vProd.toFixed(2)}</TableCell>
                          </TableRow>
                        )) || <TableRow><TableCell colSpan={3} className="text-center text-xs text-slate-400 italic">Itens não detalhados</TableCell></TableRow>}
                      </TableBody>
                      <tfoot className="bg-red-50/20 border-t border-red-100">
                        <TableRow>
                          <th colSpan={2} className="text-[9px] font-black uppercase text-slate-400 p-2 text-right">Crédito Total Gerado:</th>
                          <th className="text-[10px] font-bold text-red-700 p-2 text-right">R$ {vinculo.valor_devolvido.toFixed(2)}</th>
                        </TableRow>
                      </tfoot>
                    </Table>
                  </div>
                </div>

                {/* Nota de Saída */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-500" /> Itens Vendidos (Nova Compra)
                  </h4>
                  <div className="bg-white rounded-xl border border-emerald-100 overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-emerald-50/30">
                        <TableRow>
                          <TableHead className="text-[9px] font-black">Descrição</TableHead>
                          <TableHead className="text-center text-[9px] font-black">Qtd</TableHead>
                          <TableHead className="text-right text-[9px] font-black">Valor (R$)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {notaSaida?.itens.map((item, idx) => (
                          <TableRow key={idx} className="hover:bg-transparent">
                            <TableCell className="text-[10px] font-bold text-slate-700">{item.xProd}</TableCell>
                            <TableCell className="text-center text-[10px]">{item.qCom}</TableCell>
                            <TableCell className="text-right text-[10px] font-mono">R$ {item.vProd.toFixed(2)}</TableCell>
                          </TableRow>
                        )) || <TableRow><TableCell colSpan={3} className="text-center text-xs text-slate-400 italic">Itens não detalhados</TableCell></TableRow>}
                      </TableBody>
                      <tfoot className="bg-emerald-50/20 border-t border-emerald-100">
                        <TableRow>
                          <th colSpan={2} className="text-[9px] font-black uppercase text-slate-400 p-2 text-right">Valor Total Saída:</th>
                          <th className="text-[10px] font-bold text-emerald-700 p-2 text-right">R$ {vinculo.valor_trocado.toFixed(2)}</th>
                        </TableRow>
                      </tfoot>
                    </Table>
                  </div>
                </div>
              </div>

              {/* Consolidação Final */}
              <div className="bg-indigo-900 text-white rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-indigo-300 uppercase">Resumo da Operação</p>
                  <p className="text-xs">
                    Vínculo identificado por <span className="font-black text-indigo-200">{vinculo.metodo_vinculo.replace(/_/g, " ")}</span> com <span className="font-black text-emerald-400">{(vinculo.confianca * 100).toFixed(0)}% de confiança</span>.
                  </p>
                </div>
                <div className="flex gap-8">
                  <div className="text-center">
                    <p className="text-[9px] font-black text-indigo-300 uppercase">Diferença de Itens</p>
                    <p className="text-xl font-black">{vinculo.diferenca_itens > 0 ? `+${vinculo.diferenca_itens}` : vinculo.diferenca_itens}</p>
                    <p className="text-[8px] text-indigo-400 uppercase">Entrada - Saída</p>
                  </div>
                  <div className="text-center border-l border-indigo-700 pl-8">
                    <p className="text-[9px] font-black text-indigo-300 uppercase">Diferença Paga</p>
                    <p className="text-xl font-black text-emerald-400">R$ {vinculo.valor_diferenca.toFixed(2)}</p>
                    <p className="text-[8px] text-indigo-400 uppercase">Recebido em Dinheiro/Cartão</p>
                  </div>
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
