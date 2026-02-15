
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
  Sparkles,
  TrendingUp,
  Target,
  AlertCircle,
  LayoutDashboard,
  X,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck
} from "lucide-react";
import { exportToCsv } from "@/lib/csv-utils";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SalesSummaryProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

const META_CONVERSAO = 22.0;
const META_CADASTRO = 80.0;

export function SalesSummary({ data = [], vinculos = [] }: SalesSummaryProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("geral");
  const [showWelcome, setShowWelcome] = useState(true);
  const [considerExchanges, setConsiderExchanges] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterChannel, setFilterChannel] = useState("ALL");
  const [filterVendor, setFilterVendor] = useState("ALL");

  const saidas = useMemo(() => (data || []).filter(r => r.tpNF === 1), [data]);

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

  const consolidadoTotal = useMemo(() => {
    const filtered = considerExchanges ? saidas : saidas.filter(r => r.canal_consolidado !== "TROCA");
    const totalVenda = filtered.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
    const totalCupons = filtered.length;
    const totalItens = filtered.reduce((acc, r) => acc + parseFloat(r.itens_qtd), 0);
    
    return {
      venda: totalVenda,
      cupons: totalCupons,
      itens: totalItens,
      tkm: totalCupons > 0 ? totalVenda / totalCupons : 0,
      pa: totalCupons > 0 ? totalItens / totalCupons : 0
    };
  }, [saidas, considerExchanges]);

  const resumoVendaLoja = useMemo(() => {
    const agg: Record<string, { cupons: number; cuponsComCadastro: number; venda: number; itens: number }> = {};
    const filtered = saidas.filter(r => r.canal_consolidado === "VENDA_LOJA");
    
    filtered.forEach(r => {
      if (!agg[r.vendedor]) agg[r.vendedor] = { cupons: 0, cuponsComCadastro: 0, venda: 0, itens: 0 };
      agg[r.vendedor].cupons++;
      if (r.tem_destinatario) agg[r.vendedor].cuponsComCadastro++;
      agg[r.vendedor].venda += parseFloat(r.vNF);
      agg[r.vendedor].itens += parseFloat(r.itens_qtd);
    });

    return Object.entries(agg).map(([vend, d]) => ({
      Vendedor: vend,
      Cupons: d.cupons,
      CuponsComCadastro: d.cuponsComCadastro,
      TaxaCadastro: ((d.cuponsComCadastro / d.cupons) * 100).toFixed(1),
      Venda_Total: d.venda.toFixed(2),
      Itens_Total: d.itens,
      TKM: (d.venda / d.cupons).toFixed(2),
      PA: (d.itens / d.cupons).toFixed(2),
    })).sort((a, b) => parseFloat(b.Venda_Total) - parseFloat(a.Venda_Total));
  }, [saidas]);

  const mediasLojaVendaLoja = useMemo(() => {
    if (resumoVendaLoja.length === 0) return null;
    const total = resumoVendaLoja.reduce((acc, v) => ({
      venda: acc.venda + parseFloat(v.Venda_Total),
      cupons: acc.cupons + v.Cupons,
      cuponsComCadastro: acc.cuponsComCadastro + v.CuponsComCadastro,
      itens: acc.itens + v.Itens_Total
    }), { venda: 0, cupons: 0, cuponsComCadastro: 0, itens: 0 });

    const numVendedores = resumoVendaLoja.length;
    return {
      venda: total.venda / numVendedores,
      cupons: total.cupons / numVendedores,
      cuponsComCadastro: total.cuponsComCadastro / numVendedores,
      itens: total.itens / numVendedores,
      tkm: total.venda / total.cupons,
      pa: total.itens / total.cupons,
      taxaCadastro: (total.cuponsComCadastro / total.cupons) * 100
    };
  }, [resumoVendaLoja]);

  const auditDescontos = useMemo(() => saidas.filter(r => r.tem_desconto), [saidas]);
  const suspeitos = useMemo(() => saidas.filter(r => r.is_adicional_suspeito), [saidas]);
  const adicionaisValidos = useMemo(() => saidas.filter(r => r.is_adicional), [saidas]);
  const atendimentosOnline = useMemo(() => saidas.filter(r => r.is_retirada_online), [saidas]);

  const filteredTransactions = useMemo(() => {
    return (data || []).filter(r => {
      const matchSearch = r.nf.includes(searchTerm) || 
                         r.vendedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.nome_dest.toLowerCase().includes(searchTerm.toLowerCase());
      const matchChannel = filterChannel === "ALL" || r.canal === filterChannel;
      const matchVendor = filterVendor === "ALL" || r.vendedor === filterVendor;
      return matchSearch && matchChannel && matchVendor;
    });
  }, [data, searchTerm, filterChannel, filterVendor]);

  const whatsReport = useMemo(() => {
    let text = "✨ *RELATÓRIO MÁGICO RI HAPPY* ✨\n\n";
    resumoVendaLoja.forEach(v => {
      const vend = v.Vendedor;
      const ops = atendimentosOnline.filter(r => r.vendedor === vend).length;
      const adics = adicionaisValidos.filter(r => r.vendedor === vend).length;
      const susp = suspeitos.filter(r => r.vendedor === vend).length;
      const totalAdic = adics + susp;
      const taxaConv = ops > 0 ? ((totalAdic / ops) * 100).toFixed(0) : "0";

      text += `🧸 *${vend}*\n`;
      text += `💰 Venda: R$ ${parseFloat(v.Venda_Total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      text += `🎟️ Cupons: ${v.Cupons} | 📦 Itens: ${v.Itens_Total}\n`;
      text += `👤 Cadastro: ${v.TaxaCadastro}% (Meta 80%)\n`;
      text += `📊 TKM: R$ ${v.TKM} | 📈 PA: ${v.PA}\n`;
      text += `🎯 ${ops} retirada / ${totalAdic} adicional (${taxaConv}%)\n\n`;
    });
    return text.trim();
  }, [resumoVendaLoja, atendimentosOnline, adicionaisValidos, suspeitos]);

  const getStatusColor = (value: number, media: number) => {
    if (value > media) return "text-emerald-600 font-black";
    if (value < media) return "text-red-600 font-bold";
    return "text-slate-600";
  };

  const navItems = [
    { id: "geral", label: "Visão Geral", icon: LayoutDashboard },
    { id: "venda_loja", label: "Ranking Performance", icon: TrendingUp },
    { id: "conversao", label: "Conversão Adicionais", icon: Target },
    { id: "auditoria", label: "Auditoria Descontos", icon: AlertCircle },
    { id: "trocas", label: "Gestão de Trocas", icon: ArrowRightLeft },
    { id: "transacoes", label: "Todas Transações", icon: FileText },
    { id: "whatsapp", label: "Relatório WhatsApp", icon: MessageCircle, color: "text-emerald-500" },
  ];

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden">
      <Sidebar className="border-r border-orange-100 bg-white">
        <SidebarContent className="p-4">
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Módulos de Gestão</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton 
                      isActive={activeTab === item.id} 
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "rounded-xl py-6 px-4 transition-all duration-300",
                        activeTab === item.id 
                          ? "bg-orange-500 text-white shadow-lg shadow-orange-100 font-black" 
                          : "hover:bg-orange-50 text-slate-500 font-bold"
                      )}
                    >
                      <item.icon className={cn("w-5 h-5 mr-2", activeTab !== item.id && item.color)} />
                      <span className="text-sm">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <div className="flex-1 overflow-y-auto bg-amber-50/20 p-8">
        {showWelcome && (
          <section className="bg-gradient-to-r from-orange-500 to-[#F37021] rounded-[2.5rem] p-8 text-white shadow-xl shadow-orange-100 flex flex-col md:flex-row items-center gap-8 border-b-8 border-orange-600 mb-8 animate-in slide-in-from-top-4 relative">
            <Button variant="ghost" size="icon" onClick={() => setShowWelcome(false)} className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full">
              <X className="w-5 h-5" />
            </Button>
            <div className="bg-white/20 p-5 rounded-full">
              <Sparkles className="w-12 h-12 text-white animate-pulse" />
            </div>
            <div className="flex-1 space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Gestão Mágica: Performance e Cadastro!</h2>
              <p className="text-orange-50 font-medium max-w-2xl text-base">
                Acompanhe quem está superando a média da loja. <span className="text-emerald-200 font-black">Verde</span> é destaque; <span className="text-red-200 font-black">Vermelho</span> precisa de apoio. Foco na Meta de 80% de Cadastro!
              </p>
            </div>
            <div className="flex gap-4">
              <div className="bg-white/10 px-6 py-3 rounded-3xl border border-white/20 text-center">
                <p className="text-[10px] font-black uppercase opacity-60">Meta Conversão</p>
                <p className="text-2xl font-black">{META_CONVERSAO}%</p>
              </div>
              <div className="bg-white/10 px-6 py-3 rounded-3xl border border-white/20 text-center">
                <p className="text-[10px] font-black uppercase opacity-60">Meta Cadastro</p>
                <p className="text-2xl font-black">{META_CADASTRO}%</p>
              </div>
            </div>
          </section>
        )}

        {activeTab === "geral" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <Card className="ri-card lg:col-span-3 bg-white border-orange-200 border-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 flex items-center gap-3 bg-orange-50 rounded-bl-[2rem] border-l-2 border-b-2 border-orange-100">
                   <Label htmlFor="consider-exchanges" className="text-xs font-black text-orange-600 cursor-pointer uppercase">Incluir Saldo de Trocas?</Label>
                   <Switch id="consider-exchanges" checked={considerExchanges} onCheckedChange={setConsiderExchanges} className="data-[state=checked]:bg-orange-500" />
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-500 p-2 rounded-xl"><Store className="w-5 h-5 text-white" /></div>
                    <CardTitle className="text-base font-black text-slate-800 uppercase tracking-tight">Resultado Consolidado da Loja</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Venda Total</p>
                      <p className="text-3xl font-black text-slate-800">R$ {consolidadoTotal.venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cupons</p>
                      <p className="text-2xl font-black text-slate-600">{consolidadoTotal.cupons}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens</p>
                      <p className="text-2xl font-black text-slate-600">{consolidadoTotal.itens}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Valor Médio (TKM)</p>
                      <p className="text-2xl font-black text-orange-500">R$ {consolidadoTotal.tkm.toFixed(2)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Peças por Venda (PA)</p>
                      <p className="text-2xl font-black text-sky-500">{consolidadoTotal.pa.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="ri-card bg-emerald-500 text-white border-0 shadow-emerald-100 shadow-2xl flex flex-col justify-center p-8">
                <p className="text-[11px] font-black uppercase opacity-70 tracking-widest">Status da Operação</p>
                <h3 className="text-4xl font-black mt-2 leading-none uppercase tracking-tighter">LOJA ATIVA</h3>
                <div className="mt-6 flex items-center gap-2 bg-white/20 px-4 py-2 rounded-2xl w-fit">
                   <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                   <span className="text-[10px] font-black uppercase">{saidas.length} Notas Mapeadas</span>
                </div>
              </Card>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {channelSummary.map((c, idx) => (
                <Card key={c.Canal} className="ri-card overflow-hidden group hover:scale-[1.02] transition-transform">
                  <div className={cn("h-2 w-full", ["bg-[#E4007C]", "bg-[#36B7E1]", "bg-[#F37021]", "bg-[#662D91]", "bg-[#39B54A]", "bg-[#ED1C24]"][idx % 6])} />
                  <CardHeader className="p-6 pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest leading-tight">{formatCanal(c.Canal)}</CardTitle>
                      <Store className="w-4 h-4 opacity-30 group-hover:scale-125 transition-transform" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-2">
                    <div className="text-2xl font-black text-slate-800 mb-6">R$ {parseFloat(c.Venda_Total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Cupons</p>
                        <p className="text-sm font-black text-slate-700">{c.Cupons}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Peças</p>
                        <p className="text-sm font-black text-slate-700">{c.Itens_Total}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Média (TKM)</p>
                        <p className="text-sm font-black text-orange-500">R$ {c.TKM}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">PA</p>
                        <p className="text-sm font-black text-sky-500">{c.PA}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "venda_loja" && (
          <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
            <div className="bg-emerald-50 border-2 border-emerald-100 rounded-[2.5rem] p-8 flex items-start gap-6">
              <div className="bg-emerald-500 p-3 rounded-2xl shadow-lg shadow-emerald-100"><TrendingUp className="w-6 h-6 text-white" /></div>
              <div className="flex-1">
                <h3 className="text-emerald-800 font-black uppercase tracking-tight text-xl">Ranking de Performance e Cadastro</h3>
                <p className="text-emerald-600 text-sm font-medium mt-1">
                  Acompanhe quem está batendo a meta de <span className="font-black text-emerald-800">80% de Cadastro (CPF na Nota)</span>. Nomes em <span className="font-black">VERDE</span> estão superando as médias da loja.
                </p>
              </div>
            </div>
            <section className="bg-white rounded-[2.5rem] shadow-xl border-2 border-slate-100 overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-orange-500" />
                  <h3 className="font-black text-slate-800 text-base tracking-tight uppercase">Performance por Colaborador</h3>
                </div>
                <Button variant="outline" size="sm" onClick={() => exportToCsv("ranking_vendedores.csv", resumoVendaLoja, ["Vendedor", "Cupons", "CuponsComCadastro", "TaxaCadastro", "Venda_Total", "Itens_Total", "TKM", "PA"])} className="text-orange-600 border-orange-200 rounded-full font-black text-xs hover:bg-orange-50 px-6">
                  <Download className="w-3.5 h-3.5 mr-2" /> EXPORTAR CSV
                </Button>
              </div>
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase px-10 py-5">Colaborador</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase">Cupons</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase">Cadastro (%)</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase">Peças</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase">Venda Total</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase">TKM (R$)</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase px-10">PA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumoVendaLoja.map((v) => (
                    <TableRow key={v.Vendedor} className="hover:bg-orange-50/30 transition-colors">
                      <TableCell className={cn("px-10 py-5 font-black", getStatusColor(parseFloat(v.Venda_Total), mediasLojaVendaLoja?.venda || 0))}>{v.Vendedor}</TableCell>
                      <TableCell className={cn("text-right font-bold", getStatusColor(v.Cupons, mediasLojaVendaLoja?.cupons || 0))}>{v.Cupons}</TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "px-4 py-1.5 rounded-full text-[10px] font-black",
                          parseFloat(v.TaxaCadastro) >= META_CADASTRO ? "bg-emerald-100 text-emerald-700" : "bg-red-50 text-red-600"
                        )}>
                          {v.TaxaCadastro}%
                        </span>
                      </TableCell>
                      <TableCell className={cn("text-right font-bold", getStatusColor(v.Itens_Total, mediasLojaVendaLoja?.itens || 0))}>{v.Itens_Total}</TableCell>
                      <TableCell className={cn("text-right font-mono font-black", getStatusColor(parseFloat(v.Venda_Total), mediasLojaVendaLoja?.venda || 0))}>R$ {parseFloat(v.Venda_Total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className={cn("text-right font-black", getStatusColor(parseFloat(v.TKM), mediasLojaVendaLoja?.tkm || 0))}>R$ {v.TKM}</TableCell>
                      <TableCell className="text-center px-10">
                        <span className={cn(
                          "px-4 py-1.5 rounded-full text-[10px] font-black",
                          parseFloat(v.PA) >= (mediasLojaVendaLoja?.pa || 0) ? "bg-emerald-100 text-emerald-700" : "bg-red-50 text-red-600"
                        )}>{v.PA}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-slate-900 text-white font-black hover:bg-slate-900 sticky bottom-0">
                    <TableCell className="px-10 py-6 uppercase text-[11px] tracking-widest text-orange-400">MÉDIA DA LOJA (REF.)</TableCell>
                    <TableCell className="text-right">{mediasLojaVendaLoja?.cupons.toFixed(0)}</TableCell>
                    <TableCell className="text-center">{mediasLojaVendaLoja?.taxaCadastro.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{mediasLojaVendaLoja?.itens.toFixed(0)}</TableCell>
                    <TableCell className="text-right">R$ {mediasLojaVendaLoja?.venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">R$ {mediasLojaVendaLoja?.tkm.toFixed(2)}</TableCell>
                    <TableCell className="text-center px-10">{mediasLojaVendaLoja?.pa.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </section>
          </div>
        )}

        {activeTab === "conversao" && (
          <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
            <div className="bg-sky-50 border-2 border-sky-100 rounded-[2.5rem] p-8 flex items-start gap-6">
              <div className="bg-[#36B7E1] p-3 rounded-2xl shadow-lg shadow-sky-100"><Target className="w-6 h-6 text-white" /></div>
              <div>
                <h3 className="text-sky-800 font-black uppercase tracking-tight text-xl">Conversão de Atendimentos Online</h3>
                <p className="text-sky-600 text-sm font-medium mt-1">Meta mágica de conversão: <span className="font-black text-sky-800">{META_CONVERSAO}%</span>.</p>
              </div>
            </div>
            <section className="bg-white rounded-[2.5rem] shadow-xl border-2 border-slate-100 overflow-hidden">
              <Table>
                <TableHeader className="bg-sky-50/30">
                  <TableRow>
                    <TableHead className="font-black text-[10px] uppercase px-10 py-5">Colaborador</TableHead>
                    <TableHead className="text-center font-black text-[10px] uppercase">Retiradas Online</TableHead>
                    <TableHead className="text-center font-black text-[10px] uppercase text-emerald-600">Adicionais</TableHead>
                    <TableHead className="text-center font-black text-[10px] uppercase text-orange-500">Suspeitas</TableHead>
                    <TableHead className="text-center font-black text-[10px] uppercase">Conversão</TableHead>
                    <TableHead className="text-right font-black text-[10px] uppercase">Valor Gerado</TableHead>
                    <TableHead className="text-center font-black text-[10px] uppercase px-10">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumoVendaLoja.filter(v => atendimentosOnline.filter(r => r.vendedor === v.Vendedor).length > 0).map((v) => {
                    const ops = atendimentosOnline.filter(r => r.vendedor === v.Vendedor).length;
                    const adics = adicionaisValidos.filter(r => r.vendedor === v.Vendedor).length;
                    const susp = suspeitos.filter(r => r.vendedor === v.Vendedor).length;
                    const valorAdics = saidas.filter(r => r.vendedor === v.Vendedor && (r.is_adicional || r.is_adicional_suspeito)).reduce((acc, r) => acc + parseFloat(r.vNF), 0);
                    const taxa = (( (adics + susp) / ops ) * 100).toFixed(1);
                    return (
                      <TableRow key={v.Vendedor} className="hover:bg-slate-50/50">
                        <TableCell className="font-black text-slate-700 px-10 py-5">{v.Vendedor}</TableCell>
                        <TableCell className="text-center font-bold text-slate-500 text-lg">{ops}</TableCell>
                        <TableCell className="text-center font-black text-emerald-600 text-lg">{adics}</TableCell>
                        <TableCell className="text-center font-black text-orange-500 text-lg">{susp}</TableCell>
                        <TableCell className={cn("text-center font-black text-xl", parseFloat(taxa) >= META_CONVERSAO ? "text-emerald-600" : "text-red-500")}>{taxa}%</TableCell>
                        <TableCell className="text-right font-mono font-black text-slate-800">R$ {valorAdics.toFixed(2)}</TableCell>
                        <TableCell className="text-center px-10">
                          <span className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase", parseFloat(taxa) >= META_CONVERSAO ? "bg-emerald-100 text-emerald-700" : "bg-red-50 text-red-600")}>
                            {parseFloat(taxa) >= META_CONVERSAO ? "ACIMA DA META" : "ABAIXO DA META"}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </section>
          </div>
        )}

        {activeTab === "auditoria" && (
          <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
            <div className="bg-[#E4007C]/5 border-2 border-[#E4007C]/20 rounded-[2.5rem] p-8 flex items-start gap-6">
              <div className="bg-[#E4007C] p-3 rounded-2xl shadow-lg shadow-pink-100"><AlertCircle className="w-6 h-6 text-white" /></div>
              <div>
                <h3 className="text-pink-800 font-black uppercase tracking-tight text-xl">Auditoria de Descontos e Cadastro</h3>
                <p className="text-pink-600 text-sm font-medium mt-1">Verifique se o desconto está na faixa esperada (8% a 12%) e se o cliente foi identificado.</p>
              </div>
            </div>
            <section className="bg-white rounded-[2.5rem] shadow-xl border-2 border-slate-100 overflow-hidden">
               <Table>
                <TableHeader className="bg-slate-50/30">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase px-10 py-5">Colaborador</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Cliente / Cadastro</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase">Valor Venda</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase">Desconto</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase px-10">Status Auditoria</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditDescontos.map((r, i) => (
                    <TableRow key={i} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="font-black text-slate-700 px-10 py-5">{r.vendedor}</TableCell>
                      <TableCell className="text-[10px]">
                        <p className="font-black text-slate-800 uppercase">{r.nome_dest || "SEM NOME"}</p>
                        <p className={cn("font-bold mt-1", r.tem_destinatario ? "text-emerald-600" : "text-red-500")}>
                          {r.tem_destinatario ? `CADASTRO: ${r.cpf_cnpj_dest}` : "SEM CADASTRO"}
                        </p>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-slate-800">R$ {r.vNF}</TableCell>
                      <TableCell className="text-right text-xs font-mono font-black text-[#E4007C]">R$ {r.desconto_total} ({(parseFloat(r.percentual_desconto) * 100).toFixed(1)}%)</TableCell>
                      <TableCell className="text-center px-10">
                        <span className={cn("text-[9px] px-4 py-1.5 rounded-full font-black uppercase tracking-tighter", r.status_auditoria.includes("PADRÃO") ? "bg-red-50 text-red-600" : "bg-emerald-100 text-emerald-700")}>
                          {r.status_auditoria.includes("PADRÃO") ? "DESCONTO FORA DO PADRÃO" : "PADRÃO OK"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          </div>
        )}

        {activeTab === "trocas" && (
          <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
            <div className="bg-purple-50 border-2 border-purple-100 rounded-[2.5rem] p-8 flex items-start gap-6">
              <div className="bg-purple-500 p-3 rounded-2xl shadow-lg shadow-purple-100"><ArrowRightLeft className="w-6 h-6 text-white" /></div>
              <div>
                <h3 className="text-purple-800 font-black uppercase tracking-tight text-xl">Vínculos de Trocas</h3>
                <p className="text-purple-600 text-sm font-medium mt-1">Comparativo entre Entrada (Devolução) e Saída (Novo Item).</p>
              </div>
            </div>
            <section className="bg-white rounded-[2.5rem] shadow-xl border-2 border-slate-100 overflow-hidden">
              <Table>
                <TableHeader className="bg-purple-50/30">
                  <TableRow>
                    <TableHead className="w-12 px-10 py-5"></TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Cliente</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-center">Colaborador</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase">Crédito</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase">Saída</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase text-orange-600 px-10">Diferença Paga</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(vinculos || []).map((v, i) => (
                    <ExpandableTradeRow key={i} vinculo={v} data={data} />
                  ))}
                </TableBody>
              </Table>
            </section>
          </div>
        )}

        {activeTab === "transacoes" && (
          <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Pesquisar</Label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" placeholder="Nota, Colaborador ou Cliente..." className="w-full pl-12 pr-6 py-3 rounded-2xl border-2 border-slate-100 focus:outline-none focus:ring-4 focus:ring-orange-100 text-sm font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Canal</Label>
                <Select value={filterChannel} onValueChange={setFilterChannel}>
                  <SelectTrigger className="rounded-2xl border-2 py-6 font-bold"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent className="rounded-2xl font-bold">
                    <SelectItem value="ALL">Todos os Canais</SelectItem>
                    {Array.from(new Set(data.map(r => r.canal))).map(c => <SelectItem key={c} value={c}>{formatCanal(c)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Colaborador</Label>
                <Select value={filterVendor} onValueChange={setFilterVendor}>
                  <SelectTrigger className="rounded-2xl border-2 py-6 font-bold"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent className="rounded-2xl font-bold">
                    <SelectItem value="ALL">Todos os Operadores</SelectItem>
                    {Array.from(new Set(data.map(r => r.vendedor))).map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <section className="bg-white rounded-[2.5rem] shadow-xl border-2 border-slate-100 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="w-12 px-10 py-5"></TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Nota / Data</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Colaborador</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-center">Cadastro</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase">Total (R$)</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase px-10">Peças</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.slice(0, 100).map((r, i) => (
                    <ExpandableRow key={i} row={r} formatCanal={formatCanal} />
                  ))}
                </TableBody>
              </Table>
            </section>
          </div>
        )}

        {activeTab === "whatsapp" && (
          <section className="bg-white rounded-[2.5rem] shadow-xl border-4 border-emerald-50 p-12 flex flex-col items-center animate-in zoom-in duration-500">
            <div className="w-full max-w-2xl flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
              <div className="flex items-center gap-5">
                <div className="bg-emerald-100 p-4 rounded-[1.5rem] shadow-lg shadow-emerald-50"><MessageCircle className="w-8 h-8 text-emerald-600" /></div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Relatório WhatsApp</h3>
                  <p className="text-base font-bold text-emerald-600 mt-2">Pronto para compartilhar com a equipe!</p>
                </div>
              </div>
              <Button onClick={() => {
                navigator.clipboard.writeText(whatsReport);
                toast({ title: "Copiado com Sucesso!" });
              }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-full px-10 py-7 shadow-xl shadow-emerald-100 text-lg">
                COPIAR RELATÓRIO
              </Button>
            </div>
            <pre className="w-full max-w-2xl h-[550px] p-10 bg-slate-900 text-emerald-400 border-8 border-slate-800 rounded-[3rem] font-mono text-base overflow-auto shadow-2xl whitespace-pre-wrap">
              {whatsReport}
            </pre>
          </section>
        )}
      </div>
    </div>
  );
}

function ExpandableRow({ row, formatCanal }: { row: DetailedSaleRow, formatCanal: Function }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <TableRow className={cn("cursor-pointer hover:bg-orange-50/50 transition-colors", isOpen && "bg-orange-50/50")} onClick={() => setIsOpen(!isOpen)}>
        <TableCell className="px-10 py-5">{isOpen ? <ChevronUp className="w-4 h-4 text-orange-500" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}</TableCell>
        <TableCell className="text-xs">
          <div className="flex items-center gap-2">
            <p className="font-black text-orange-600">NF {row.nf}</p>
            {row.tem_desconto && <AlertCircle className="w-3 h-3 text-[#E4007C]" />}
          </div>
          <p className="text-slate-400 font-bold">{row.dhEmi.substring(0, 10)}</p>
        </TableCell>
        <TableCell className="text-xs font-black text-slate-700 uppercase">{row.vendedor}</TableCell>
        <TableCell className="text-center">
          {row.tem_destinatario ? (
            <div className="flex flex-col items-center">
              <UserCheck className="w-4 h-4 text-emerald-500 mb-1" />
              <span className="text-[8px] font-black text-emerald-600 uppercase">IDENTIFICADO</span>
            </div>
          ) : (
            <div className="flex flex-col items-center opacity-30">
              <User className="w-4 h-4 text-slate-400 mb-1" />
              <span className="text-[8px] font-black text-slate-400 uppercase">SEM CADASTRO</span>
            </div>
          )}
        </TableCell>
        <TableCell className="text-right font-mono font-black text-slate-800 text-base">R$ {parseFloat(row.vNF).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
        <TableCell className="text-center font-black px-10 text-base">{row.itens_qtd}</TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="bg-slate-50">
          <TableCell colSpan={6} className="p-0 border-b-2 border-orange-100">
            <div className="p-12 grid grid-cols-1 md:grid-cols-2 gap-12 animate-in slide-in-from-top-4">
              <div className="space-y-6">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                  <div className="bg-orange-100 p-2 rounded-xl"><Package className="w-4 h-4 text-orange-500" /></div>
                  Itens da Nota
                </h4>
                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="text-[10px] font-black uppercase px-8 py-4">Produto</TableHead>
                        <TableHead className="text-center text-[10px] font-black uppercase">Qtd</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase px-8">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {row.itens.map((item: Item, idx: number) => (
                        <TableRow key={idx} className="hover:bg-transparent">
                          <TableCell className="text-[11px] font-bold text-slate-700 px-8 py-3">{item.xProd}</TableCell>
                          <TableCell className="text-center text-[11px] font-black">{item.qCom}</TableCell>
                          <TableCell className="text-right text-[11px] font-mono font-black px-8">R$ {item.vProd.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div className="space-y-6">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                  <div className="bg-sky-100 p-2 rounded-xl"><User className="w-4 h-4 text-sky-500" /></div>
                  Dados do Cadastro e Pagamento
                </h4>
                <div className="bg-white p-10 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Cadastro do Cliente</p>
                      <p className="text-base font-black text-slate-800 mt-2">{row.nome_dest || "NÃO CADASTRADO"}</p>
                      <div className="flex items-center gap-2 mt-1 text-slate-500 font-mono text-xs">
                        <Hash className="w-3 h-3 opacity-50" /> {row.cpf_cnpj_dest || "CPF/CNPJ NÃO INFORMADO"}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Canal / Auditoria</p>
                      <p className="text-[11px] font-black text-slate-600 mt-2">{formatCanal(row.canal)}</p>
                      <p className="text-[10px] font-black text-[#E4007C] mt-1">{row.status_auditoria}</p>
                    </div>
                  </div>
                  <div className="pt-8 border-t border-slate-100">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                        <p className="text-[9px] text-slate-400 font-black uppercase">Venda Líquida</p>
                        <p className="text-lg font-black text-slate-800">R$ {parseFloat(row.vNF).toFixed(0)}</p>
                      </div>
                      <div className="bg-pink-50 p-5 rounded-3xl border border-pink-100">
                        <p className="text-[9px] text-pink-400 font-black uppercase">Desconto</p>
                        <p className="text-lg font-black text-[#E4007C]">R$ {parseFloat(row.desconto_total).toFixed(0)}</p>
                      </div>
                      <div className="bg-sky-50 p-5 rounded-3xl border border-sky-100">
                        <p className="text-[9px] text-sky-400 font-black uppercase">Troco / Outros</p>
                        <p className="text-lg font-black text-sky-600">R$ {parseFloat(row.vTroco).toFixed(0)}</p>
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
      <TableRow className={cn("cursor-pointer hover:bg-purple-50/50 transition-colors", isOpen && "bg-purple-50/50")} onClick={() => setIsOpen(!isOpen)}>
        <TableCell className="px-10 py-5">{isOpen ? <ChevronUp className="w-4 h-4 text-purple-500" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}</TableCell>
        <TableCell className="text-xs">
          <p className="font-black text-slate-800 text-base">{vinculo.nome_cliente || "TROCA SEM CADASTRO"}</p>
          <p className="text-slate-400 font-mono text-[10px] mt-1">{vinculo.cpf_cliente || "-"}</p>
        </TableCell>
        <TableCell className="text-xs font-black text-slate-700 uppercase text-center">{vinculo.vendedor}</TableCell>
        <TableCell className="text-right font-mono font-black text-slate-600">R$ {vinculo.valor_devolvido.toFixed(2)}</TableCell>
        <TableCell className="text-right font-mono font-black text-slate-600">R$ {vinculo.valor_trocado.toFixed(2)}</TableCell>
        <TableCell className="text-right font-mono font-black text-orange-600 px-10 text-xl">R$ {vinculo.valor_diferenca.toFixed(2)}</TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="bg-slate-50">
          <TableCell colSpan={6} className="p-0 border-b-2 border-purple-100">
            <div className="p-12 space-y-12 animate-in slide-in-from-top-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                    <div className="bg-red-100 p-2 rounded-xl"><ArrowDownRight className="w-5 h-5 text-red-500" /></div>
                    Entrada (Crédito)
                  </h4>
                  <div className="bg-white rounded-[2.5rem] border-2 border-red-50 overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-red-50/30">
                        <TableRow>
                          <TableHead className="text-[10px] font-black uppercase px-8 py-4">Produto</TableHead>
                          <TableHead className="text-center text-[10px] font-black uppercase">Qtd</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {notaEntrada?.itens.map((item, idx) => (
                          <TableRow key={idx} className="hover:bg-transparent">
                            <TableCell className="text-[11px] font-bold text-slate-700 px-8 py-3">{item.xProd}</TableCell>
                            <TableCell className="text-center text-[11px] font-black">{item.qCom}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                <div className="space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                    <div className="bg-emerald-100 p-2 rounded-xl"><ArrowUpRight className="w-5 h-5 text-emerald-500" /></div>
                    Saída (Novo Item)
                  </h4>
                  <div className="bg-white rounded-[2.5rem] border-2 border-emerald-50 overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-emerald-50/30">
                        <TableRow>
                          <TableHead className="text-[10px] font-black uppercase px-8 py-4">Produto Novo</TableHead>
                          <TableHead className="text-center text-[10px] font-black uppercase">Qtd</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {notaSaida?.itens.map((item, idx) => (
                          <TableRow key={idx} className="hover:bg-transparent">
                            <TableCell className="text-[11px] font-bold text-slate-700 px-8 py-3">{item.xProd}</TableCell>
                            <TableCell className="text-center text-[11px] font-black">{item.qCom}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
              <div className="bg-slate-900 text-white rounded-[3rem] p-10 flex flex-col md:flex-row justify-between items-center gap-10 shadow-2xl border-b-[10px] border-slate-800">
                <div className="space-y-3">
                  <p className="text-[11px] font-black text-orange-400 uppercase tracking-widest">Análise de Troca</p>
                  <p className="text-base font-bold opacity-80">Saldo financeiro e de itens da operação.</p>
                </div>
                <div className="flex gap-16">
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Dif. Itens</p>
                    <p className="text-4xl font-black mt-2">{vinculo.diferenca_itens > 0 ? `+${vinculo.diferenca_itens}` : vinculo.diferenca_itens}</p>
                  </div>
                  <div className="text-center border-l border-white/10 pl-16">
                    <p className="text-[10px] font-black text-orange-400 uppercase">Dif. Paga</p>
                    <p className="text-4xl font-black text-emerald-400 mt-2">R$ {vinculo.valor_diferenca.toFixed(2)}</p>
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
