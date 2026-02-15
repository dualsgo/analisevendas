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
  Hash,
  ShoppingBag,
  Sparkles,
  Info,
  TrendingUp,
  Target,
  AlertCircle
} from "lucide-react";
import { exportToCsv } from "@/lib/csv-utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SalesSummaryProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

const META_CONVERSAO = 22.0;

export function SalesSummary({ data = [], vinculos = [] }: SalesSummaryProps) {
  const { toast } = useToast();
  const saidas = useMemo(() => (data || []).filter(r => r.tpNF === 1), [data]);
  const [searchTerm, setSearchTerm] = useState("");

  const formatCanal = (canal: string) => {
    switch (canal) {
      case "LOJA_FISICA": return "Venda Direta na Loja";
      case "RETIRADA_ONLINE": return "Entrega de Pedido Online";
      case "RETIRADA_ADICIONAL": return "Venda Adicional na Retirada";
      case "TROCA_COM_DIFERENÇA": return "Troca com Valor Adicional";
      case "TROCA_SEM_DIFERENÇA": return "Troca Valor Igual";
      case "VENDA_LOJA": return "Total Venda Loja Física";
      case "TROCA": return "Operações de Troca";
      default: return canal.replace(/_/g, " ");
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

  const resumoVendaLoja = useMemo(() => {
    const agg: Record<string, { cupons: number; venda: number; itens: number }> = {};
    const filtered = saidas.filter(r => r.canal_consolidado === "VENDA_LOJA");
    
    filtered.forEach(r => {
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

  // Médias da Loja (Venda Loja)
  const mediasLojaVendaLoja = useMemo(() => {
    if (resumoVendaLoja.length === 0) return null;
    const total = resumoVendaLoja.reduce((acc, v) => ({
      venda: acc.venda + parseFloat(v.Venda_Total),
      cupons: acc.cupons + v.Cupons,
      itens: acc.itens + v.Itens_Total
    }), { venda: 0, cupons: 0, itens: 0 });

    const numVendedores = resumoVendaLoja.length;
    return {
      venda: total.venda / numVendedores,
      cupons: total.cupons / numVendedores,
      itens: total.itens / numVendedores,
      tkm: total.venda / total.cupons,
      pa: total.itens / total.cupons
    };
  }, [resumoVendaLoja]);

  const auditDescontos = useMemo(() => saidas.filter(r => r.tem_desconto && !r.is_troca), [saidas]);
  const suspeitos = useMemo(() => saidas.filter(r => r.is_adicional_suspeito), [saidas]);
  const adicionaisValidos = useMemo(() => saidas.filter(r => r.is_adicional), [saidas]);
  const atendimentosOnline = useMemo(() => saidas.filter(r => r.is_retirada_online), [saidas]);

  const filteredTransactions = useMemo(() => {
    return (data || []).filter(r => 
      r.nf.includes(searchTerm) || 
      r.vendedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.nome_dest.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.cpf_cnpj_dest.includes(searchTerm)
    );
  }, [data, searchTerm]);

  const whatsReport = useMemo(() => {
    let text = "✨ *RELATÓRIO MÁGICO RI HAPPY* ✨\n\n";
    resumoVendaLoja.forEach(v => {
      const vend = v.Vendedor;
      const ops = atendimentosOnline.filter(r => r.vendedor === vend).length;
      const adics = adicionaisValidos.filter(r => r.vendedor === vend).length;
      const susp = suspeitos.filter(r => r.vendedor === vend).length;
      const totalAdic = adics + susp;
      const taxa = ops > 0 ? ((totalAdic / ops) * 100).toFixed(0) : "0";

      text += `🧸 *${vend}*\n`;
      text += `💰 Venda Loja: R$ ${parseFloat(v.Venda_Total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      text += `🎟️ Cupons: ${v.Cupons} | 📦 Itens: ${v.Itens_Total}\n`;
      text += `📊 TKM: R$ ${v.TKM} | 📈 PA: ${v.PA}\n`;
      text += `🎯 ${ops} retirada / ${totalAdic} adicional (${taxa}%)\n\n`;
    });
    return text.trim();
  }, [resumoVendaLoja, atendimentosOnline, adicionaisValidos, suspeitos]);

  const getStatusColor = (value: number, media: number) => {
    if (value > media) return "text-emerald-600 font-black";
    if (value < media) return "text-red-600 font-bold";
    return "text-slate-600";
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Guia do Gestor - Bloco Explicativo Inicial */}
      <section className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-3xl p-8 text-white shadow-xl shadow-orange-100 flex flex-col md:flex-row items-center gap-8 border-b-8 border-orange-600">
        <div className="bg-white/20 p-4 rounded-full">
          <Sparkles className="w-12 h-12 text-white" />
        </div>
        <div className="flex-1 space-y-2">
          <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Bem-vindo ao Painel Mágico de Gestão!</h2>
          <p className="text-orange-50 font-medium max-w-2xl">
            Este painel ajuda você a identificar oportunidades de venda na sua loja. Olhe para os números em <span className="font-black text-emerald-200">VERDE</span> para ver quem está brilhando acima da média e em <span className="font-black text-red-100">VERMELHO</span> para quem precisa de um treinamento ou incentivo.
          </p>
        </div>
        <div className="hidden lg:flex gap-4">
          <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/20">
            <p className="text-[10px] font-black uppercase opacity-60">Meta Conversão</p>
            <p className="text-xl font-black">{META_CONVERSAO}%</p>
          </div>
        </div>
      </section>

      <Tabs defaultValue="geral" className="w-full">
        <div className="sticky top-20 bg-amber-50/90 backdrop-blur-md z-40 pt-2 pb-4 border-b-2 border-orange-100 overflow-x-auto">
          <TabsList className="bg-transparent p-0 flex justify-start h-auto gap-6 min-w-max px-2">
            <TabsTrigger value="geral" className="tab-trigger-custom">VISÃO GERAL DO SOLZINHO</TabsTrigger>
            <TabsTrigger value="venda_loja" className="tab-trigger-custom flex items-center gap-2">
              DESEMPENHO VENDA LOJA
              <TrendingUp className="w-3.5 h-3.5" />
            </TabsTrigger>
            <TabsTrigger value="conversao" className="tab-trigger-custom flex items-center gap-2">
              CONVERSÃO DE ADICIONAIS
              <Target className="w-3.5 h-3.5" />
            </TabsTrigger>
            <TabsTrigger value="auditoria" className="tab-trigger-custom flex items-center gap-2">
              AUDITORIA DE DESCONTOS
              <AlertCircle className="w-3.5 h-3.5" />
            </TabsTrigger>
            <TabsTrigger value="trocas" className="tab-trigger-custom">VÍNCULOS DE TROCAS</TabsTrigger>
            <TabsTrigger value="transacoes" className="tab-trigger-custom">TRANSAÇÕES DETALHADAS</TabsTrigger>
            <TabsTrigger value="whatsapp" className="tab-trigger-custom flex items-center gap-2 text-[#39B54A]">
              <MessageCircle className="w-3.5 h-3.5" /> WHATSAPP
            </TabsTrigger>
          </TabsList>
        </div>

        {/* --- ABA VISÃO GERAL --- */}
        <TabsContent value="geral" className="mt-8 space-y-10">
          <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm flex items-center gap-4">
            <Info className="w-5 h-5 text-[#36B7E1]" />
            <p className="text-sm font-bold text-slate-500">
              <span className="text-slate-800">Dica do Mestre:</span> Os cards abaixo mostram o volume total que entrou em cada canal de venda. O <strong>TKM (Ticket Médio)</strong> indica quanto o cliente gastou e o <strong>PA (Peças por Atendimento)</strong> indica quantos brinquedos ele levou.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {channelSummary.map((c, idx) => {
              const colors = ["bg-[#E4007C]", "bg-[#36B7E1]", "bg-[#F37021]", "bg-[#662D91]", "bg-[#39B54A]", "bg-[#ED1C24]"];
              const color = colors[idx % colors.length];
              return (
                <Card key={c.Canal} className="ri-card overflow-hidden group">
                  <div className={cn("h-2 w-full", color)} />
                  <CardHeader className="p-6 pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest leading-tight">
                        {formatCanal(c.Canal)}
                      </CardTitle>
                      <Store className={cn("w-4 h-4 opacity-30 group-hover:scale-125 transition-transform", color.replace('bg-', 'text-'))} />
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-2">
                    <div className="text-2xl font-black text-slate-800 mb-6">
                      R$ {parseFloat(c.Venda_Total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Total de Cupons</p>
                        <p className="text-sm font-black text-slate-700">{c.Cupons}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Total de Peças</p>
                        <p className="text-sm font-black text-slate-700">{c.Itens_Total}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Valor Médio (TKM)</p>
                        <p className="text-sm font-black text-orange-500">R$ {c.TKM}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Peças por Venda (PA)</p>
                        <p className="text-sm font-black text-sky-500">{c.PA}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* --- ABA DESEMPENHO VENDA LOJA --- */}
        <TabsContent value="venda_loja" className="mt-8 space-y-8">
          <div className="bg-emerald-50 border-2 border-emerald-100 rounded-3xl p-6 flex items-start gap-4">
            <TrendingUp className="w-6 h-6 text-emerald-600 mt-1" />
            <div>
              <h3 className="text-emerald-800 font-black uppercase tracking-tight">Análise de Performance: Loja Física + Adicionais</h3>
              <p className="text-emerald-600 text-sm font-medium mt-1">
                Aqui comparamos cada colaborador com a média atual da sua loja. Quem está em <span className="underline font-black">verde</span> superou a média e é seu destaque!
              </p>
            </div>
          </div>

          <section className="bg-white rounded-3xl shadow-xl border-2 border-slate-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-orange-500" />
                <h3 className="font-black text-slate-800 text-base tracking-tight uppercase">Ranking dos Colaboradores</h3>
              </div>
              <div className="flex items-center gap-4">
                 <div className="hidden md:flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border shadow-sm">
                   <span className="text-[10px] font-black text-slate-400 uppercase">Média da Loja:</span>
                   <span className="text-xs font-black text-slate-800">TKM R$ {mediasLojaVendaLoja?.tkm.toFixed(2)} | PA {mediasLojaVendaLoja?.pa.toFixed(2)}</span>
                 </div>
                 <Button variant="outline" size="sm" onClick={() => exportToCsv("ranking_vendedores.csv", resumoVendaLoja, ["Vendedor", "Cupons", "Venda_Total", "Itens_Total", "TKM", "PA"])} className="text-orange-600 border-orange-200 rounded-full font-black text-xs hover:bg-orange-50">
                    <Download className="w-3.5 h-3.5 mr-2" /> EXPORTAR
                  </Button>
              </div>
            </div>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase px-8">Colaborador</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Cupons (Vendas)</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Total de Peças</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Venda Total (R$)</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Valor Médio (TKM)</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase px-8">Peças por Venda (PA)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumoVendaLoja.map((v) => (
                  <TableRow key={v.Vendedor} className="hover:bg-orange-50/30 transition-colors">
                    <TableCell className="font-black text-slate-700 px-8">{v.Vendedor}</TableCell>
                    <TableCell className={cn("text-right", getStatusColor(v.Cupons, mediasLojaVendaLoja?.cupons || 0))}>{v.Cupons}</TableCell>
                    <TableCell className={cn("text-right", getStatusColor(v.Itens_Total, mediasLojaVendaLoja?.itens || 0))}>{v.Itens_Total}</TableCell>
                    <TableCell className={cn("text-right font-mono", getStatusColor(parseFloat(v.Venda_Total), mediasLojaVendaLoja?.venda || 0))}>
                      R$ {parseFloat(v.Venda_Total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className={cn("text-right font-black", getStatusColor(parseFloat(v.TKM), mediasLojaVendaLoja?.tkm || 0))}>R$ {v.TKM}</TableCell>
                    <TableCell className="text-center px-8">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black",
                        parseFloat(v.PA) >= (mediasLojaVendaLoja?.pa || 0) ? "bg-emerald-100 text-emerald-700" : "bg-red-50 text-red-600"
                      )}>
                        {v.PA}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Linha de Média da Loja */}
                <TableRow className="bg-slate-900 text-white font-black">
                  <TableCell className="px-8 uppercase text-[11px]">MÉDIA DA LOJA (REFERÊNCIA)</TableCell>
                  <TableCell className="text-right">{mediasLojaVendaLoja?.cupons.toFixed(0)}</TableCell>
                  <TableCell className="text-right">{mediasLojaVendaLoja?.itens.toFixed(0)}</TableCell>
                  <TableCell className="text-right">R$ {mediasLojaVendaLoja?.venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">R$ {mediasLojaVendaLoja?.tkm.toFixed(2)}</TableCell>
                  <TableCell className="text-center px-8">{mediasLojaVendaLoja?.pa.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        {/* --- ABA CONVERSÃO --- */}
        <TabsContent value="conversao" className="mt-8 space-y-8">
          <div className="bg-[#36B7E1]/10 border-2 border-[#36B7E1]/30 rounded-3xl p-6 flex items-start gap-4">
            <Target className="w-6 h-6 text-[#36B7E1] mt-1" />
            <div>
              <h3 className="text-sky-800 font-black uppercase tracking-tight">Conversão: Retirada Online em Venda Adicional</h3>
              <p className="text-sky-600 text-sm font-medium mt-1">
                Nossa meta mágica é de <span className="font-black text-sky-800">{META_CONVERSAO}%</span>. Isso significa que a cada 5 pessoas que vêm buscar um brinquedo online, pelo menos 1 deve levar algo a mais na loja!
              </p>
            </div>
          </div>

          <section className="bg-white rounded-3xl shadow-xl border-2 border-slate-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-sky-50/30">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-sky-500" />
                <h3 className="font-black text-slate-800 text-base tracking-tight uppercase">Performance de Conversão por Colaborador</h3>
              </div>
            </div>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-black text-[10px] uppercase px-8">Colaborador</TableHead>
                  <TableHead className="text-center font-black text-[10px] uppercase">Retiradas Online</TableHead>
                  <TableHead className="text-center font-black text-[10px] uppercase text-emerald-600">Vendas Adicionais</TableHead>
                  <TableHead className="text-center font-black text-[10px] uppercase text-orange-500">Vendas Suspeitas</TableHead>
                  <TableHead className="text-center font-black text-[10px] uppercase">Taxa de Conversão</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase">Valor Adicional Gerado</TableHead>
                  <TableHead className="text-center font-black text-[10px] uppercase px-8">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumoVendaLoja.map((v) => {
                  const ops = atendimentosOnline.filter(r => r.vendedor === v.Vendedor).length;
                  const adics = adicionaisValidos.filter(r => r.vendedor === v.Vendedor).length;
                  const susp = suspeitos.filter(r => r.vendedor === v.Vendedor).length;
                  const filteredAdics = saidas.filter(r => r.vendedor === v.Vendedor && (r.is_adicional || r.is_adicional_suspeito));
                  const valorAdics = filteredAdics.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
                  const taxa = ops > 0 ? (((adics + susp) / ops) * 100).toFixed(1) : "0.0";
                  const isAboveGoal = parseFloat(taxa) >= META_CONVERSAO;
                  
                  return (
                    <TableRow key={v.Vendedor} className="hover:bg-slate-50/50">
                      <TableCell className="font-black text-slate-700 px-8">{v.Vendedor}</TableCell>
                      <TableCell className="text-center font-bold text-slate-500">{ops}</TableCell>
                      <TableCell className="text-center font-black text-emerald-600">{adics}</TableCell>
                      <TableCell className="text-center font-black text-orange-500">{susp}</TableCell>
                      <TableCell className={cn("text-center font-black", isAboveGoal ? "text-emerald-600" : "text-red-500")}>
                        {taxa}%
                      </TableCell>
                      <TableCell className="text-right font-mono font-black text-slate-800">R$ {valorAdics.toFixed(2)}</TableCell>
                      <TableCell className="text-center px-8">
                        {isAboveGoal ? (
                          <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">ACIMA DA META</span>
                        ) : (
                          <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">ABAIXO DA META</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        {/* --- ABA AUDITORIA --- */}
        <TabsContent value="auditoria" className="mt-8 space-y-8">
          <div className="bg-[#E4007C]/10 border-2 border-[#E4007C]/30 rounded-3xl p-6 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-[#E4007C] mt-1" />
            <div>
              <h3 className="text-[#E4007C] font-black uppercase tracking-tight">O que é a Auditoria de Descontos?</h3>
              <p className="text-[#E4007C] text-sm font-medium mt-1">
                O Analisador identifica descontos entre 8% e 12% como vendas adicionais legítimas. Se o desconto estiver fora disso, marcamos como <strong>"Fora do Padrão"</strong> para você verificar se foi um erro de lançamento ou um desconto excessivo.
              </p>
            </div>
          </div>

          <section className="bg-white rounded-3xl shadow-xl border-2 border-slate-100 overflow-hidden">
            <div className="p-8 bg-[#E4007C]/5 border-b border-[#E4007C]/10 flex justify-between items-center">
              <div>
                <h3 className="text-base font-black text-[#E4007C] uppercase tracking-tighter">Listagem Técnica para Auditoria</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">Somente vendas que possuem descontos aplicados (vDesc &gt; 0).</p>
              </div>
               <Button variant="outline" size="sm" onClick={() => exportToCsv("auditoria_descontos.csv", auditDescontos, ["vendedor", "nf", "vNF", "desconto_total", "percentual_desconto", "status_auditoria"])} className="text-[#E4007C] border-[#E4007C]/20 rounded-full font-black text-xs hover:bg-[#E4007C]/5">
                  <Download className="w-3.5 h-3.5 mr-2" /> EXPORTAR
                </Button>
            </div>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase px-8">Colaborador</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Nota / Data</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Valor da Venda</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Desconto (R$)</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase">Motivo / Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditDescontos.map((r, i) => (
                  <TableRow key={i} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-black text-xs px-8 text-slate-700">{r.vendedor}</TableCell>
                    <TableCell className="text-right text-[10px]">
                       <p className="font-black text-slate-600">NF {r.nf}</p>
                       <p className="text-slate-400">{r.dhEmi.substring(0, 10)}</p>
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono font-bold">R$ {r.vNF}</TableCell>
                    <TableCell className="text-right text-xs font-mono font-black text-[#E4007C]">R$ {r.desconto_total} ({(parseFloat(r.percentual_desconto) * 100).toFixed(1)}%)</TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        "text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-tighter",
                        r.is_adicional ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      )}>
                        {r.status_auditoria.includes("FORA DO PADRÃO") 
                          ? "DESCONTO FORA DA FAIXA ESPERADA" 
                          : "CLASSIFICADO COMO ADICIONAL"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        {/* --- ABA TROCAS --- */}
        <TabsContent value="trocas" className="mt-8 space-y-6">
          <div className="bg-[#662D91]/10 border-2 border-[#662D91]/30 rounded-3xl p-6 flex items-start gap-4">
            <ArrowRightLeft className="w-6 h-6 text-[#662D91] mt-1" />
            <div>
              <h3 className="text-purple-800 font-black uppercase tracking-tight">O que são Vínculos de Trocas?</h3>
              <p className="text-purple-600 text-sm font-medium mt-1">
                Aqui o Analisador cruza a <strong>Nota de Entrada</strong> (o que o cliente devolveu) com a <strong>Nota de Saída</strong> (o que ele levou novo). Isso ajuda a garantir que o saldo financeiro e de estoque esteja correto.
              </p>
            </div>
          </div>

          <section className="bg-white rounded-3xl shadow-xl border-2 border-slate-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 bg-[#662D91]/5 flex justify-between items-center">
              <h3 className="font-black text-slate-800 text-base tracking-tight uppercase">Auditoria Detalhada de Trocas</h3>
              <span className="text-[10px] font-black text-purple-600 bg-white px-3 py-1 rounded-full border border-purple-100 uppercase">
                {(vinculos || []).length} Trocas Mapeadas
              </span>
            </div>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-12 px-8"></TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Dados do Cliente</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-center">Colaborador</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Crédito Gerado (R$)</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Nova Compra (R$)</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase text-orange-600 px-8">Diferença Paga (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(vinculos || []).map((v, i) => (
                  <ExpandableTradeRow key={i} vinculo={v} data={data} />
                ))}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        {/* --- ABA TRANSAÇÕES --- */}
        <TabsContent value="transacoes" className="mt-8 space-y-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center px-4">
            <div className="relative w-full md:w-[400px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Pesquisar por Nota, Colaborador ou Cliente..." 
                className="w-full pl-12 pr-6 py-3 rounded-full border-2 border-orange-100 focus:outline-none focus:ring-4 focus:ring-orange-100 text-sm font-bold shadow-sm transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 text-xs font-black text-slate-400 uppercase tracking-widest bg-white px-5 py-2 rounded-full border border-slate-100">
              <FileText className="w-4 h-4 text-orange-500" />
              {filteredTransactions.length} Movimentações Encontradas
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border-2 border-slate-100 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-12 px-8"></TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Número / Data</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Colaborador</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Canal de Venda</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Venda Total (R$)</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase px-8">Peças</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.slice(0, 100).map((r, i) => (
                  <ExpandableRow key={i} row={r} formatCanal={formatCanal} />
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* --- ABA WHATSAPP --- */}
        <TabsContent value="whatsapp" className="mt-8">
          <section className="bg-white rounded-[2.5rem] shadow-xl border-4 border-emerald-50 p-10 flex flex-col items-center">
            <div className="w-full max-w-2xl flex flex-col md:flex-row justify-between items-center mb-8 gap-6 text-center md:text-left">
               <div className="flex items-center gap-4">
                <div className="bg-emerald-100 p-3 rounded-2xl">
                  <MessageCircle className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter leading-none">Relatório Mágico para Equipe</h3>
                  <p className="text-sm font-bold text-emerald-600 mt-1">Copie os resultados para compartilhar no grupo!</p>
                </div>
               </div>
              <Button onClick={() => {
                navigator.clipboard.writeText(whatsReport);
                toast({ title: "Copiado para o WhatsApp!", description: "O relatório já está na sua área de transferência." });
              }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-full px-8 py-6 shadow-lg shadow-emerald-100 transition-all w-full md:w-auto">
                COPIAR RELATÓRIO AGORA
              </Button>
            </div>
            <pre className="w-full max-w-2xl h-[500px] p-8 bg-slate-900 text-emerald-400 border-4 border-slate-800 rounded-[2rem] font-mono text-sm leading-relaxed overflow-auto shadow-2xl whitespace-pre-wrap">
              {whatsReport}
            </pre>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ExpandableRow({ row, formatCanal }: { row: DetailedSaleRow, formatCanal: Function }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <TableRow 
        className={cn("cursor-pointer hover:bg-orange-50/50 transition-colors", isOpen && "bg-orange-50/50")}
        onClick={() => setIsOpen(!isOpen)}
      >
        <TableCell className="px-8">
          {isOpen ? <ChevronUp className="w-4 h-4 text-orange-500" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </TableCell>
        <TableCell className="text-xs">
          <p className="font-black text-orange-600">NF {row.nf}</p>
          <p className="text-slate-400 font-bold">{row.dhEmi.substring(0, 10)} {row.dhEmi.substring(11, 16)}</p>
        </TableCell>
        <TableCell className="text-xs font-black text-slate-700 uppercase">{row.vendedor}</TableCell>
        <TableCell>
          <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
            {formatCanal(row.canal)}
          </span>
        </TableCell>
        <TableCell className="text-right font-mono font-black text-slate-800">R$ {parseFloat(row.vNF).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
        <TableCell className="text-center font-black px-8">{row.itens_qtd}</TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="bg-slate-50 hover:bg-slate-50">
          <TableCell colSpan={6} className="p-0 border-b-2 border-orange-100">
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10 animate-in slide-in-from-top-4 duration-300">
              <div className="space-y-6">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                  <div className="bg-orange-100 p-1.5 rounded-lg"><Package className="w-4 h-4 text-orange-500" /></div>
                  Produtos da Nota Fiscal
                </h4>
                <div className="bg-white rounded-[2rem] border-2 border-slate-100 overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="text-[10px] font-black uppercase px-6">Brinquedo / Produto</TableHead>
                        <TableHead className="text-center text-[10px] font-black uppercase">Qtd</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase px-6">Valor (R$)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {row.itens.map((item: Item, idx: number) => (
                        <TableRow key={idx} className="hover:bg-transparent">
                          <TableCell className="text-[11px] font-bold text-slate-700 px-6">{item.xProd}</TableCell>
                          <TableCell className="text-center text-[11px] font-black">{item.qCom}</TableCell>
                          <TableCell className="text-right text-[11px] font-mono font-black px-6">R$ {item.vProd.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div className="space-y-6">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                  <div className="bg-sky-100 p-1.5 rounded-lg"><User className="w-4 h-4 text-sky-500" /></div>
                  Informações de Cliente e Auditoria
                </h4>
                <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-sm space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Nome do Cliente</p>
                      <p className="text-sm font-black text-slate-800 mt-1">{row.nome_dest || "NÃO IDENTIFICADO"}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                        <Hash className="w-3 h-3 opacity-50" /> {row.cpf_cnpj_dest || "CPF NÃO INFORMADO"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Resultado da Auditoria</p>
                      <p className="text-[11px] font-black text-orange-600 uppercase mt-2 leading-tight">
                        {row.status_auditoria.includes("FORA DO PADRÃO") 
                          ? "DESCONTO FORA DA FAIXA ESPERADA" 
                          : "CLASSIFICADO COMO ADICIONAL"}
                      </p>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 font-black uppercase flex items-center gap-2 mb-4 tracking-widest">
                      <CreditCard className="w-3.5 h-3.5 opacity-50" /> Resumo Financeiro
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[9px] text-slate-400 font-black uppercase">Venda Líquida</p>
                        <p className="text-sm font-black text-slate-800">R$ {parseFloat(row.vNF).toFixed(0)}</p>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                        <p className="text-[9px] text-orange-400 font-black uppercase">Desconto</p>
                        <p className="text-sm font-black text-orange-600">R$ {parseFloat(row.desconto_total).toFixed(0)}</p>
                      </div>
                      <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100">
                        <p className="text-[9px] text-sky-400 font-black uppercase">Troco / Valor</p>
                        <p className="text-sm font-black text-sky-600">R$ {parseFloat(row.vTroco).toFixed(0)}</p>
                      </div>
                    </div>
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

function ExpandableTradeRow({ vinculo, data }: { vinculo: VinculoTroca, data: DetailedSaleRow[] }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const notaEntrada = useMemo(() => (data || []).find(r => r.chave === vinculo.chave_entrada), [data, vinculo.chave_entrada]);
  const notaSaida = useMemo(() => (data || []).find(r => r.chave === vinculo.chave_saida), [data, vinculo.chave_saida]);

  return (
    <>
      <TableRow 
        className={cn("cursor-pointer hover:bg-purple-50/50 transition-colors", isOpen && "bg-purple-50/50")}
        onClick={() => setIsOpen(!isOpen)}
      >
        <TableCell className="px-8">
          {isOpen ? <ChevronUp className="w-4 h-4 text-purple-500" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </TableCell>
        <TableCell className="text-xs">
          <p className="font-black text-slate-800 leading-none">{vinculo.nome_cliente || "TROCA SEM CPF"}</p>
          <p className="text-slate-400 font-mono text-[10px] font-bold mt-1">{vinculo.cpf_cliente || "-"}</p>
        </TableCell>
        <TableCell className="text-xs font-black text-slate-700 uppercase text-center">{vinculo.vendedor}</TableCell>
        <TableCell className="text-right font-mono font-black text-slate-600">R$ {vinculo.valor_devolvido.toFixed(2)}</TableCell>
        <TableCell className="text-right font-mono font-black text-slate-600">R$ {vinculo.valor_trocado.toFixed(2)}</TableCell>
        <TableCell className="text-right font-mono font-black text-orange-600 px-8">R$ {vinculo.valor_diferenca.toFixed(2)}</TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="bg-slate-50 hover:bg-slate-50">
          <TableCell colSpan={6} className="p-0 border-b-2 border-purple-100">
            <div className="p-10 space-y-10 animate-in slide-in-from-top-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                    <div className="bg-red-100 p-1.5 rounded-lg"><ArrowRightLeft className="w-4 h-4 text-red-500" /></div>
                    O que o cliente Devolveu (Crédito)
                  </h4>
                  <div className="bg-white rounded-[2rem] border-2 border-red-50 overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-red-50/30">
                        <TableRow>
                          <TableHead className="text-[10px] font-black uppercase px-6">Produto</TableHead>
                          <TableHead className="text-center text-[10px] font-black uppercase">Qtd</TableHead>
                          <TableHead className="text-right text-[10px] font-black uppercase px-6">Valor Unit. (R$)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {notaEntrada?.itens.map((item, idx) => (
                          <TableRow key={idx} className="hover:bg-transparent">
                            <TableCell className="text-[11px] font-bold text-slate-700 px-6">{item.xProd}</TableCell>
                            <TableCell className="text-center text-[11px] font-black">{item.qCom}</TableCell>
                            <TableCell className="text-right text-[11px] font-mono font-black px-6">R$ {item.vProd.toFixed(2)}</TableCell>
                          </TableRow>
                        )) || <TableRow><TableCell colSpan={3} className="text-center text-xs text-slate-400 italic py-6">Detalhes indisponíveis</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                    <div className="bg-emerald-100 p-1.5 rounded-lg"><ArrowRightLeft className="w-4 h-4 text-emerald-500" /></div>
                    O que o cliente Levou Novo (Saída)
                  </h4>
                  <div className="bg-white rounded-[2rem] border-2 border-emerald-50 overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-emerald-50/30">
                        <TableRow>
                          <TableHead className="text-[10px] font-black uppercase px-6">Produto Novo</TableHead>
                          <TableHead className="text-center text-[10px] font-black uppercase">Qtd</TableHead>
                          <TableHead className="text-right text-[10px] font-black uppercase px-6">Valor Unit. (R$)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {notaSaida?.itens.map((item, idx) => (
                          <TableRow key={idx} className="hover:bg-transparent">
                            <TableCell className="text-[11px] font-bold text-slate-700 px-6">{item.xProd}</TableCell>
                            <TableCell className="text-center text-[11px] font-black">{item.qCom}</TableCell>
                            <TableCell className="text-right text-[11px] font-mono font-black px-6">R$ {item.vProd.toFixed(2)}</TableCell>
                          </TableRow>
                        )) || <TableRow><TableCell colSpan={3} className="text-center text-xs text-slate-400 italic py-6">Detalhes indisponíveis</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl border-b-8 border-slate-800">
                <div className="space-y-2 text-center md:text-left">
                  <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest leading-none">Análise do Vínculo de Troca</p>
                  <p className="text-sm font-bold opacity-80">
                    Vínculo identificado por <span className="text-sky-400">{vinculo.metodo_vinculo === "NFref" ? "REFERÊNCIA DE NOTA" : "CONFERÊNCIA DE VALOR"}</span> com <span className="text-emerald-400">{(vinculo.confianca * 100).toFixed(0)}% de precisão</span>.
                  </p>
                </div>
                <div className="flex gap-12">
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Diferença de Itens</p>
                    <p className="text-3xl font-black">{vinculo.diferenca_itens > 0 ? `+${vinculo.diferenca_itens}` : vinculo.diferenca_itens}</p>
                    <p className="text-[9px] text-slate-500 font-bold">SALDO DE PEÇAS</p>
                  </div>
                  <div className="text-center border-l-2 border-slate-800 pl-12">
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest leading-tight">Diferença Paga</p>
                    <p className="text-3xl font-black text-emerald-400">R$ {vinculo.valor_diferenca.toFixed(2)}</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase">VALOR EM DINHEIRO</p>
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
