
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
  UserCheck,
  ShoppingCart,
  Boxes
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
  const [considerExchanges, setConsiderExchanges] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterChannel, setFilterChannel] = useState("ALL");
  const [filterVendor, setFilterVendor] = useState("ALL");

  const entradas = useMemo(() => (data || []).filter(r => r.tpNF === 0 || r.is_devolucao), [data]);
  const saidas = useMemo(() => (data || []).filter(r => r.tpNF === 1 && !r.is_devolucao), [data]);
  const naoClassificadas = useMemo(() => (data || []).length - (entradas.length + saidas.length), [data, entradas, saidas]);

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
    // Vendas Normais (Excluindo Trocas)
    const normais = saidas.filter(r => r.canal_consolidado !== "TROCA");
    const vNormais = normais.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
    const iNormais = normais.reduce((acc, r) => acc + parseFloat(r.itens_qtd), 0);
    const cNormais = normais.length;

    // Impacto das Trocas
    const saldoTrocasVenda = vinculos.reduce((acc, v) => acc + v.valor_diferenca, 0);
    const saldoTrocasItens = vinculos.reduce((acc, v) => acc + v.diferenca_itens, 0);
    const cTrocas = vinculos.length;

    if (considerExchanges) {
      const totalVenda = vNormais + saldoTrocasVenda;
      const totalItens = iNormais + saldoTrocasItens;
      const totalCupons = cNormais + cTrocas;
      return {
        venda: totalVenda,
        cupons: totalCupons,
        itens: totalItens,
        tkm: totalCupons > 0 ? totalVenda / totalCupons : 0,
        pa: totalCupons > 0 ? totalItens / totalCupons : 0
      };
    } else {
      return {
        venda: vNormais,
        cupons: cNormais,
        itens: iNormais,
        tkm: cNormais > 0 ? vNormais / cNormais : 0,
        pa: cNormais > 0 ? iNormais / cNormais : 0
      };
    }
  }, [saidas, vinculos, considerExchanges]);

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
    <div className="flex flex-col md:flex-row h-[calc(100vh-80px)] overflow-hidden">
      <Sidebar className="border-r border-orange-100 bg-white hidden md:block">
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

      <div className="flex-1 overflow-y-auto bg-amber-50/20 p-4 md:p-8">
        {/* Navegação Mobile */}
        <div className="md:hidden flex overflow-x-auto gap-2 mb-6 pb-2 no-scrollbar">
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant={activeTab === item.id ? "default" : "outline"}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "rounded-full whitespace-nowrap px-6 text-xs font-black uppercase",
                activeTab === item.id ? "bg-orange-500 border-orange-500" : "text-slate-500 border-slate-200"
              )}
            >
              <item.icon className="w-3.5 h-3.5 mr-2" />
              {item.label}
            </Button>
          ))}
        </div>

        {showWelcome && (
          <section className="bg-gradient-to-r from-orange-500 to-[#F37021] rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8 text-white shadow-xl shadow-orange-100 flex flex-col md:flex-row items-center gap-6 md:gap-8 border-b-8 border-orange-600 mb-8 animate-in slide-in-from-top-4 relative">
            <Button variant="ghost" size="icon" onClick={() => setShowWelcome(false)} className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full">
              <X className="w-5 h-5" />
            </Button>
            <div className="bg-white/20 p-4 rounded-full">
              <Sparkles className="w-10 h-10 text-white animate-pulse" />
            </div>
            <div className="flex-1 space-y-2 text-center md:text-left">
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter leading-none">Gestão Mágica: Performance e Cadastro!</h2>
              <p className="text-orange-50 font-medium max-w-2xl text-sm md:text-base">
                Monitore o crescimento da sua loja através da identificação do cliente e conversão de adicionais.
              </p>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
              <div className="flex-1 bg-white/10 px-4 py-3 rounded-2xl border border-white/20 text-center">
                <p className="text-[9px] font-black uppercase opacity-60">Meta Conversão</p>
                <p className="text-xl font-black">{META_CONVERSAO}%</p>
              </div>
              <div className="flex-1 bg-white/10 px-4 py-3 rounded-2xl border border-white/20 text-center">
                <p className="text-[9px] font-black uppercase opacity-60">Meta Cadastro</p>
                <p className="text-xl font-black">{META_CADASTRO}%</p>
              </div>
            </div>
          </section>
        )}

        {activeTab === "geral" && (
          <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <Card className="ri-card lg:col-span-3 bg-white border-orange-200 border-2 md:border-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 md:p-6 flex items-center gap-3 bg-orange-50 rounded-bl-[1.5rem] border-l border-b border-orange-100">
                   <Label htmlFor="consider-exchanges" className="text-[10px] font-black text-orange-600 cursor-pointer uppercase">Incluir Impacto de Trocas?</Label>
                   <Switch id="consider-exchanges" checked={considerExchanges} onCheckedChange={setConsiderExchanges} className="data-[state=checked]:bg-orange-500" />
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-500 p-2 rounded-xl"><Store className="w-5 h-5 text-white" /></div>
                    <CardTitle className="text-sm md:text-base font-black text-slate-800 uppercase tracking-tight">Resultado Consolidado da Loja</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-8">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Venda Total</p>
                      <p className="text-xl md:text-3xl font-black text-slate-800">R$ {consolidadoTotal.venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cupons</p>
                      <p className="text-lg md:text-2xl font-black text-slate-600">{consolidadoTotal.cupons}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo Itens</p>
                      <p className="text-lg md:text-2xl font-black text-slate-600">{consolidadoTotal.itens}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest">Valor Médio (TKM)</p>
                      <p className="text-lg md:text-2xl font-black text-orange-500">R$ {consolidadoTotal.tkm.toFixed(2)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-sky-400 uppercase tracking-widest">Peças/Venda (PA)</p>
                      <p className="text-lg md:text-2xl font-black text-sky-500">{consolidadoTotal.pa.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="ri-card bg-emerald-500 text-white border-0 shadow-emerald-100 shadow-xl flex flex-col justify-center p-6 md:p-8">
                <p className="text-[10px] font-black uppercase opacity-70 tracking-widest">Status do Processamento</p>
                <div className="space-y-3 mt-4">
                  <div className="flex justify-between items-center text-xs font-black border-b border-white/20 pb-2">
                    <span className="opacity-80">SAÍDAS (VENDAS):</span>
                    <span>{saidas.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-black border-b border-white/20 pb-2">
                    <span className="opacity-80">ENTRADAS (DEVOLUÇÕES):</span>
                    <span>{entradas.length}</span>
                  </div>
                  {naoClassificadas > 0 && (
                    <div className="flex justify-between items-center text-xs font-black opacity-60">
                      <span>OUTRAS NOTAS:</span>
                      <span>{naoClassificadas}</span>
                    </div>
                  )}
                </div>
                <div className="mt-6 flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl w-fit">
                   <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                   <span className="text-[9px] font-black uppercase">Leitura Finalizada</span>
                </div>
              </Card>
            </div>

            {/* Impacto das Trocas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="ri-card bg-white border-purple-100 border-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-500 p-2 rounded-xl"><Boxes className="w-5 h-5 text-white" /></div>
                    <CardTitle className="text-xs font-black text-purple-800 uppercase tracking-tight">Impacto de Trocas no Estoque</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Itens Devolvidos</p>
                    <p className="text-xl font-black text-red-500">-{vinculos.reduce((acc, v) => acc + v.itens_devolvidos, 0)}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Novos Itens Levados</p>
                    <p className="text-xl font-black text-emerald-500">+{vinculos.reduce((acc, v) => acc + v.itens_trocados, 0)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="ri-card bg-white border-orange-100 border-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-500 p-2 rounded-xl"><ShoppingCart className="w-5 h-5 text-white" /></div>
                    <CardTitle className="text-xs font-black text-orange-800 uppercase tracking-tight">Diferença Financeira das Trocas</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Créditos de Devolução</p>
                    <p className="text-xl font-black text-slate-600">R$ {vinculos.reduce((acc, v) => acc + v.valor_devolvido, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-2xl">
                    <p className="text-[9px] font-black text-orange-600 uppercase">Saldo Pago a Mais</p>
                    <p className="text-xl font-black text-orange-700">R$ {vinculos.reduce((acc, v) => acc + v.valor_diferenca, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {channelSummary.map((c, idx) => (
                <Card key={c.Canal} className="ri-card overflow-hidden group hover:scale-[1.01] transition-transform">
                  <div className={cn("h-1.5 w-full", ["bg-[#E4007C]", "bg-[#36B7E1]", "bg-[#F37021]", "bg-[#662D91]", "bg-[#39B54A]", "bg-[#ED1C24]"][idx % 6])} />
                  <CardHeader className="p-5 pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">{formatCanal(c.Canal)}</CardTitle>
                      <Store className="w-4 h-4 opacity-30 group-hover:scale-110 transition-transform" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 pt-2">
                    <div className="text-xl font-black text-slate-800 mb-4">R$ {parseFloat(c.Venda_Total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    <div className="grid grid-cols-2 gap-3 border-t border-slate-50 pt-3">
                      <div className="space-y-1">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Cupons</p>
                        <p className="text-xs font-black text-slate-700">{c.Cupons}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Peças</p>
                        <p className="text-xs font-black text-slate-700">{c.Itens_Total}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Média (TKM)</p>
                        <p className="text-xs font-black text-orange-500">R$ {c.TKM}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">PA</p>
                        <p className="text-xs font-black text-sky-500">{c.PA}</p>
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
            <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-6 md:p-8 flex items-start gap-6">
              <div className="bg-emerald-500 p-3 rounded-xl shadow-lg shadow-emerald-100 hidden sm:block"><TrendingUp className="w-6 h-6 text-white" /></div>
              <div className="flex-1">
                <h3 className="text-emerald-800 font-black uppercase tracking-tight text-lg">Ranking de Performance e Cadastro</h3>
                <p className="text-emerald-600 text-sm font-medium mt-1">
                  Meta de Cadastro: <span className="font-black text-emerald-800">80%</span>. Cores em <span className="font-black">VERDE</span> superam a média da loja.
                </p>
              </div>
            </div>
            <section className="bg-white rounded-2xl shadow-xl border-2 border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase px-6 py-4">Colaborador</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase">Cupons</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase">Cadastro (%)</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase">Peças</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase">Venda Total</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase">TKM (R$)</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase px-6">PA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumoVendaLoja.map((v) => (
                      <TableRow key={v.Vendedor} className="hover:bg-orange-50/30 transition-colors">
                        <TableCell className={cn("px-6 py-4 font-black whitespace-nowrap", getStatusColor(parseFloat(v.Venda_Total), mediasLojaVendaLoja?.venda || 0))}>{v.Vendedor}</TableCell>
                        <TableCell className={cn("text-right font-bold", getStatusColor(v.Cupons, mediasLojaVendaLoja?.cupons || 0))}>{v.Cupons}</TableCell>
                        <TableCell className="text-center">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-black",
                            parseFloat(v.TaxaCadastro) >= META_CADASTRO ? "bg-emerald-100 text-emerald-700" : "bg-red-50 text-red-600"
                          )}>
                            {v.TaxaCadastro}%
                          </span>
                        </TableCell>
                        <TableCell className={cn("text-right font-bold", getStatusColor(v.Itens_Total, mediasLojaVendaLoja?.itens || 0))}>{v.Itens_Total}</TableCell>
                        <TableCell className={cn("text-right font-mono font-black whitespace-nowrap", getStatusColor(parseFloat(v.Venda_Total), mediasLojaVendaLoja?.venda || 0))}>R$ {parseFloat(v.Venda_Total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className={cn("text-right font-black", getStatusColor(parseFloat(v.TKM), mediasLojaVendaLoja?.tkm || 0))}>R$ {v.TKM}</TableCell>
                        <TableCell className="text-center px-6">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-black",
                            parseFloat(v.PA) >= (mediasLojaVendaLoja?.pa || 0) ? "bg-emerald-100 text-emerald-700" : "bg-red-50 text-red-600"
                          )}>{v.PA}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-slate-900 text-white font-black hover:bg-slate-900 sticky bottom-0">
                      <TableCell className="px-6 py-5 uppercase text-[10px] tracking-widest text-orange-400">MÉDIA LOJA</TableCell>
                      <TableCell className="text-right">{mediasLojaVendaLoja?.cupons.toFixed(0)}</TableCell>
                      <TableCell className="text-center">{mediasLojaVendaLoja?.taxaCadastro.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{mediasLojaVendaLoja?.itens.toFixed(0)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">R$ {mediasLojaVendaLoja?.venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">R$ {mediasLojaVendaLoja?.tkm.toFixed(2)}</TableCell>
                      <TableCell className="text-center px-6">{mediasLojaVendaLoja?.pa.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </section>
          </div>
        )}

        {/* Outras Abas Seguindo o Mesmo Padrão de Tabela Responsiva */}
        {activeTab === "conversao" && (
          <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
            <div className="bg-sky-50 border-2 border-sky-100 rounded-2xl p-6 md:p-8 flex items-start gap-6">
              <div className="bg-[#36B7E1] p-3 rounded-xl shadow-lg shadow-sky-100 hidden sm:block"><Target className="w-6 h-6 text-white" /></div>
              <div>
                <h3 className="text-sky-800 font-black uppercase tracking-tight text-lg">Conversão de Atendimentos Online</h3>
                <p className="text-sky-600 text-sm font-medium mt-1">Meta Mágica: <span className="font-black text-sky-800">{META_CONVERSAO}%</span>.</p>
              </div>
            </div>
            <section className="bg-white rounded-2xl shadow-xl border-2 border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-sky-50/30">
                    <TableRow>
                      <TableHead className="font-black text-[10px] uppercase px-6 py-4">Colaborador</TableHead>
                      <TableHead className="text-center font-black text-[10px] uppercase">Retiradas</TableHead>
                      <TableHead className="text-center font-black text-[10px] uppercase text-emerald-600">Adicionais</TableHead>
                      <TableHead className="text-center font-black text-[10px] uppercase text-orange-500">Suspeitas</TableHead>
                      <TableHead className="text-center font-black text-[10px] uppercase">Conversão</TableHead>
                      <TableHead className="text-right font-black text-[10px] uppercase">Valor Gerado</TableHead>
                      <TableHead className="text-center font-black text-[10px] uppercase px-6">Status</TableHead>
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
                          <TableCell className="font-black text-slate-700 px-6 py-4 whitespace-nowrap">{v.Vendedor}</TableCell>
                          <TableCell className="text-center font-bold text-slate-500">{ops}</TableCell>
                          <TableCell className="text-center font-black text-emerald-600">{adics}</TableCell>
                          <TableCell className="text-center font-black text-orange-500">{susp}</TableCell>
                          <TableCell className={cn("text-center font-black text-lg", parseFloat(taxa) >= META_CONVERSAO ? "text-emerald-600" : "text-red-500")}>{taxa}%</TableCell>
                          <TableCell className="text-right font-mono font-black text-slate-800 whitespace-nowrap">R$ {valorAdics.toFixed(2)}</TableCell>
                          <TableCell className="text-center px-6">
                            <span className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase whitespace-nowrap", parseFloat(taxa) >= META_CONVERSAO ? "bg-emerald-100 text-emerald-700" : "bg-red-50 text-red-600")}>
                              {parseFloat(taxa) >= META_CONVERSAO ? "ACIMA META" : "ABAIXO META"}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </section>
          </div>
        )}

        {activeTab === "auditoria" && (
          <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
            <div className="bg-[#E4007C]/5 border-2 border-[#E4007C]/20 rounded-2xl p-6 md:p-8 flex items-start gap-6">
              <div className="bg-[#E4007C] p-3 rounded-xl shadow-lg shadow-pink-100 hidden sm:block"><AlertCircle className="w-6 h-6 text-white" /></div>
              <div>
                <h3 className="text-pink-800 font-black uppercase tracking-tight text-lg">Auditoria de Descontos e Cadastro</h3>
                <p className="text-pink-600 text-sm font-medium mt-1">Verificação de conformidade de descontos e identificação do cliente.</p>
              </div>
            </div>
            <section className="bg-white rounded-2xl shadow-xl border-2 border-slate-100 overflow-hidden">
               <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/30">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase px-6 py-4">Colaborador</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Cliente / Cadastro</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase">Valor Venda</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase">Desconto</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase px-6">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditDescontos.map((r, i) => (
                      <TableRow key={i} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-black text-slate-700 px-6 py-4 whitespace-nowrap">{r.vendedor}</TableCell>
                        <TableCell className="min-w-[200px]">
                          <p className="font-black text-slate-800 uppercase text-[10px]">{r.nome_dest || "SEM NOME"}</p>
                          <p className={cn("font-bold mt-1 text-[9px]", r.tem_destinatario ? "text-emerald-600" : "text-red-500")}>
                            {r.tem_destinatario ? `CADASTRO: ${r.cpf_cnpj_dest}` : "SEM CADASTRO"}
                          </p>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-slate-800">R$ {r.vNF}</TableCell>
                        <TableCell className="text-right text-[10px] font-mono font-black text-[#E4007C] whitespace-nowrap">R$ {r.desconto_total} ({(parseFloat(r.percentual_desconto) * 100).toFixed(1)}%)</TableCell>
                        <TableCell className="text-center px-6">
                          <span className={cn("text-[8px] px-3 py-1 rounded-full font-black uppercase whitespace-nowrap", r.status_auditoria.includes("PADRÃO") ? "bg-red-50 text-red-600" : "bg-emerald-100 text-emerald-700")}>
                            {r.status_auditoria.includes("PADRÃO") ? "FORA DO PADRÃO" : "PADRÃO OK"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </div>
        )}

        {activeTab === "trocas" && (
          <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
            <div className="bg-purple-50 border-2 border-purple-100 rounded-2xl p-6 md:p-8 flex items-start gap-6">
              <div className="bg-purple-500 p-3 rounded-xl shadow-lg shadow-purple-100 hidden sm:block"><ArrowRightLeft className="w-6 h-6 text-white" /></div>
              <div>
                <h3 className="text-purple-800 font-black uppercase tracking-tight text-lg">Gestão e Vínculo de Trocas</h3>
                <p className="text-purple-600 text-sm font-medium mt-1">Comparativo entre o Crédito Devolvido e o Valor da Nova Aquisição.</p>
              </div>
            </div>
            <section className="bg-white rounded-2xl shadow-xl border-2 border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-purple-50/30">
                    <TableRow>
                      <TableHead className="w-12 px-6 py-4"></TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Cliente</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-center">Operador</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase">Crédito</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase">Novo Total</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase text-orange-600 px-6">Saldo Pago</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(vinculos || []).map((v, i) => (
                      <ExpandableTradeRow key={i} vinculo={v} data={data} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </div>
        )}

        {activeTab === "transacoes" && (
          <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border-2 border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 items-end">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Busca Rápida</Label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" placeholder="Nota, Operador ou Cliente..." className="w-full pl-12 pr-6 py-3 rounded-xl border-2 border-slate-100 focus:outline-none focus:ring-4 focus:ring-orange-100 text-xs md:text-sm font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Canal</Label>
                <Select value={filterChannel} onValueChange={setFilterChannel}>
                  <SelectTrigger className="rounded-xl border-2 py-5 text-xs font-bold"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent className="rounded-xl font-bold">
                    <SelectItem value="ALL">Todos os Canais</SelectItem>
                    {Array.from(new Set(data.map(r => r.canal))).map(c => <SelectItem key={c} value={c}>{formatCanal(c)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Operador</Label>
                <Select value={filterVendor} onValueChange={setFilterVendor}>
                  <SelectTrigger className="rounded-xl border-2 py-5 text-xs font-bold"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent className="rounded-xl font-bold">
                    <SelectItem value="ALL">Todos os Operadores</SelectItem>
                    {Array.from(new Set(data.map(r => r.vendedor))).map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <section className="bg-white rounded-2xl shadow-xl border-2 border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="w-12 px-6 py-4"></TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Nota / Data</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Operador</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-center">Cadastro</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase">Total (R$)</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase px-6">Peças</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.slice(0, 100).map((r, i) => (
                      <ExpandableRow key={i} row={r} formatCanal={formatCanal} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </div>
        )}

        {activeTab === "whatsapp" && (
          <section className="bg-white rounded-2xl shadow-xl border-4 border-emerald-50 p-6 md:p-12 flex flex-col items-center animate-in zoom-in duration-500">
            <div className="w-full max-w-2xl flex flex-col md:flex-row justify-between items-center mb-8 gap-6 text-center md:text-left">
              <div className="flex items-center gap-5">
                <div className="bg-emerald-100 p-4 rounded-2xl shadow-lg shadow-emerald-50"><MessageCircle className="w-8 h-8 text-emerald-600" /></div>
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Relatório WhatsApp</h3>
                  <p className="text-sm md:text-base font-bold text-emerald-600 mt-1">Pronto para compartilhar!</p>
                </div>
              </div>
              <Button onClick={() => {
                navigator.clipboard.writeText(whatsReport);
                toast({ title: "Copiado com Sucesso!" });
              }} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-full px-8 py-6 shadow-lg text-sm uppercase">
                COPIAR RELATÓRIO
              </Button>
            </div>
            <pre className="w-full max-w-2xl h-[400px] md:h-[550px] p-6 md:p-10 bg-slate-900 text-emerald-400 border-4 md:border-8 border-slate-800 rounded-[1.5rem] md:rounded-[3rem] font-mono text-xs md:text-base overflow-auto shadow-2xl whitespace-pre-wrap">
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
        <TableCell className="px-6 py-4">{isOpen ? <ChevronUp className="w-4 h-4 text-orange-500" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}</TableCell>
        <TableCell className="text-[10px] whitespace-nowrap">
          <div className="flex items-center gap-2">
            <p className="font-black text-orange-600">NF {row.nf}</p>
            {row.tem_desconto && <AlertCircle className="w-3 h-3 text-[#E4007C]" />}
          </div>
          <p className="text-slate-400 font-bold">{row.dhEmi.substring(0, 10)}</p>
        </TableCell>
        <TableCell className="text-[10px] font-black text-slate-700 uppercase whitespace-nowrap">{row.vendedor}</TableCell>
        <TableCell className="text-center">
          {row.tem_destinatario ? (
            <div className="flex flex-col items-center">
              <UserCheck className="w-4 h-4 text-emerald-500 mb-0.5" />
              <span className="text-[7px] font-black text-emerald-600 uppercase">IDENTIFICADO</span>
            </div>
          ) : (
            <div className="flex flex-col items-center opacity-30">
              <User className="w-4 h-4 text-slate-400 mb-0.5" />
              <span className="text-[7px] font-black text-slate-400 uppercase">SEM CADASTRO</span>
            </div>
          )}
        </TableCell>
        <TableCell className="text-right font-mono font-black text-slate-800 text-xs whitespace-nowrap">R$ {parseFloat(row.vNF).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
        <TableCell className="text-center font-black px-6 text-xs">{row.itens_qtd}</TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="bg-slate-50/50">
          <TableCell colSpan={6} className="p-0 border-b border-orange-100">
            <div className="p-4 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 animate-in slide-in-from-top-2">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-orange-500" />
                  Produtos da Nota
                </h4>
                <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50/30">
                      <TableRow>
                        <TableHead className="text-[9px] font-black uppercase px-4 py-2">Produto</TableHead>
                        <TableHead className="text-center text-[9px] font-black uppercase">Qtd</TableHead>
                        <TableHead className="text-right text-[9px] font-black uppercase px-4">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {row.itens.map((item: Item, idx: number) => (
                        <TableRow key={idx} className="hover:bg-transparent">
                          <TableCell className="text-[10px] font-bold text-slate-700 px-4 py-2">{item.xProd}</TableCell>
                          <TableCell className="text-center text-[10px] font-black">{item.qCom}</TableCell>
                          <TableCell className="text-right text-[10px] font-mono font-black px-4">R$ {item.vProd.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-sky-500" />
                  Identificação e Financeiro
                </h4>
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Identificação</p>
                      <p className="text-xs font-black text-slate-800 mt-1">{row.nome_dest || "NÃO IDENTIFICADO"}</p>
                      <div className="flex items-center gap-1.5 mt-1 text-slate-500 font-mono text-[9px]">
                        <Hash className="w-2.5 h-2.5 opacity-50" /> {row.cpf_cnpj_dest || "CPF/CNPJ NÃO INFORMADO"}
                      </div>
                    </div>
                    <div>
                      <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Canal / Auditoria</p>
                      <p className="text-[9px] font-black text-slate-600 mt-1">{formatCanal(row.canal)}</p>
                      <p className="text-[8px] font-black text-[#E4007C] mt-0.5 uppercase">{row.status_auditoria}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-50">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-50 p-3 rounded-xl text-center">
                        <p className="text-[7px] text-slate-400 font-black uppercase">Líquido</p>
                        <p className="text-xs font-black text-slate-800">R$ {parseFloat(row.vNF).toFixed(0)}</p>
                      </div>
                      <div className="bg-pink-50 p-3 rounded-xl text-center">
                        <p className="text-[7px] text-pink-400 font-black uppercase">Desconto</p>
                        <p className="text-xs font-black text-[#E4007C]">R$ {parseFloat(row.desconto_total).toFixed(0)}</p>
                      </div>
                      <div className="bg-sky-50 p-3 rounded-xl text-center">
                        <p className="text-[7px] text-sky-400 font-black uppercase">Crédito/Troco</p>
                        <p className="text-xs font-black text-sky-600">R$ {(parseFloat(row.vTroca) + parseFloat(row.vTroco)).toFixed(0)}</p>
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
        <TableCell className="px-6 py-4">{isOpen ? <ChevronUp className="w-4 h-4 text-purple-500" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}</TableCell>
        <TableCell className="text-[10px] whitespace-nowrap">
          <p className="font-black text-slate-800">{vinculo.nome_cliente || "TROCA BALCÃO"}</p>
          <p className="text-slate-400 font-mono text-[9px] mt-0.5">{vinculo.cpf_cliente || "-"}</p>
        </TableCell>
        <TableCell className="text-[10px] font-black text-slate-700 uppercase text-center whitespace-nowrap">{vinculo.vendedor}</TableCell>
        <TableCell className="text-right font-mono font-black text-slate-600 text-[10px] whitespace-nowrap">R$ {vinculo.valor_devolvido.toFixed(2)}</TableCell>
        <TableCell className="text-right font-mono font-black text-slate-600 text-[10px] whitespace-nowrap">R$ {vinculo.valor_trocado.toFixed(2)}</TableCell>
        <TableCell className="text-right font-mono font-black text-orange-600 px-6 text-sm whitespace-nowrap">R$ {vinculo.valor_diferenca.toFixed(2)}</TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="bg-slate-50/50">
          <TableCell colSpan={6} className="p-0 border-b border-purple-100">
            <div className="p-4 md:p-10 space-y-8 animate-in slide-in-from-top-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                    Entrada (Itens Devolvidos)
                  </h4>
                  <div className="bg-white rounded-xl border border-red-50 overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-red-50/30">
                        <TableRow>
                          <TableHead className="text-[9px] font-black uppercase px-4 py-2">Produto</TableHead>
                          <TableHead className="text-center text-[9px] font-black uppercase px-4">Qtd</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {notaEntrada?.itens.map((item, idx) => (
                          <TableRow key={idx} className="hover:bg-transparent">
                            <TableCell className="text-[10px] font-bold text-slate-700 px-4 py-2">{item.xProd}</TableCell>
                            <TableCell className="text-center text-[10px] font-black px-4">{item.qCom}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                    Saída (Novos Itens)
                  </h4>
                  <div className="bg-white rounded-xl border border-emerald-50 overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-emerald-50/30">
                        <TableRow>
                          <TableHead className="text-[9px] font-black uppercase px-4 py-2">Produto Novo</TableHead>
                          <TableHead className="text-center text-[9px] font-black uppercase px-4">Qtd</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {notaSaida?.itens.map((item, idx) => (
                          <TableRow key={idx} className="hover:bg-transparent">
                            <TableCell className="text-[10px] font-bold text-slate-700 px-4 py-2">{item.xProd}</TableCell>
                            <TableCell className="text-center text-[10px] font-black px-4">{item.qCom}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
              <div className="bg-slate-900 text-white rounded-2xl md:rounded-[2rem] p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl border-b-4 border-slate-800">
                <div className="text-center md:text-left">
                  <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Impacto Consolidado da Troca</p>
                  <p className="text-xs font-bold opacity-70 mt-1">Comparativo de itens e saldo financeiro final.</p>
                </div>
                <div className="flex gap-10 md:gap-16">
                  <div className="text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Dif. Itens</p>
                    <p className="text-2xl md:text-3xl font-black mt-1">{vinculo.diferenca_itens > 0 ? `+${vinculo.diferenca_itens}` : vinculo.diferenca_itens}</p>
                  </div>
                  <div className="text-center border-l border-white/10 pl-10 md:pl-16">
                    <p className="text-[9px] font-black text-orange-400 uppercase">Saldo Pago</p>
                    <p className="text-2xl md:text-3xl font-black text-emerald-400 mt-1">R$ {vinculo.valor_diferenca.toFixed(2)}</p>
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
