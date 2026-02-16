"use client";

import React, { useMemo, useState } from "react";
import { 
  DetailedSaleRow, 
  VinculoTroca
} from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Store, 
  Target, 
  LayoutDashboard, 
  ArrowRightLeft, 
  FileText, 
  MessageCircle, 
  Sparkles, 
  X, 
  Calendar as CalendarIcon,
  Smartphone,
  Zap,
  CheckCircle2,
  Circle,
  UserCheck,
  Award,
  Percent,
  CircleAlert,
  Layers,
  Activity,
  ShieldAlert
} from "lucide-react";
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
  useSidebar
} from "@/components/ui/sidebar";
import { DailyPerformance } from "./DailyPerformance";
import { VendorPerformance } from "./VendorPerformance";
import { ConversionAudit } from "./ConversionAudit";
import { DiscountAudit } from "./DiscountAudit";
import { ExchangeManagement } from "./ExchangeManagement";
import { TransactionList } from "./TransactionList";
import { WhatsappReports } from "./WhatsappReports";
import { LostOpportunities } from "./LostOpportunities";
import { SalesComposition } from "./SalesComposition";
import { OperationalProductivity } from "./OperationalProductivity";
import { RiskRadar } from "./RiskRadar";

interface SalesSummaryProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

const formatCurrency = (val: number | string, isMobile = false) => {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isMobile && num >= 1000) {
    return `R$ ${(num / 1000).toFixed(1)}k`;
  }
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export function SalesSummary({ data = [], vinculos = [] }: SalesSummaryProps) {
  const [activeTab, setActiveTab] = useState("geral");
  const [showWelcome, setShowWelcome] = useState(true);
  const { setOpenMobile } = useSidebar();

  const [selectedChannels, setSelectedChannels] = useState({
    fisica: true,
    online: true,
    adicional: true,
    troca: true
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setOpenMobile(false);
  };

  const toggleChannel = (channel: keyof typeof selectedChannels) => {
    setSelectedChannels(prev => ({ ...prev, [channel]: !prev[channel] }));
  };

  // Cálculo de Métricas Fixas por Canal
  const metricsByChannel = useMemo(() => {
    const saidas = data.filter(r => r.tpNF === 1 && !r.is_devolucao && !r.is_cancelada);
    
    const fisica = saidas.filter(r => r.canal === "LOJA_FISICA");
    const online = saidas.filter(r => r.canal === "RETIRADA_ONLINE");
    const adicional = saidas.filter(r => r.canal === "RETIRADA_ADICIONAL" || r.is_adicional || r.is_adicional_suspeito);
    
    const calcMetrics = (rows: DetailedSaleRow[], isTroca = false) => {
      const v = rows.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
      const c = rows.length;
      const i = rows.reduce((acc, r) => acc + parseFloat(r.itens_qtd), 0);
      const identifiedCount = rows.filter(r => r.cpf_cnpj_dest && r.cpf_cnpj_dest.trim() !== "").length;

      return {
        venda: v,
        cupons: c,
        itens: i,
        tkm: c > 0 ? v / c : 0,
        pa: c > 0 ? i / c : 0,
        cadastros: c > 0 ? (identifiedCount / c) * 100 : 0,
        identified: identifiedCount
      };
    };

    // Canal Trocas baseado nos vínculos
    const vTroca = vinculos.reduce((acc, v) => acc + v.valor_diferenca, 0);
    const cTroca = vinculos.length;
    const iTroca = vinculos.reduce((acc, v) => acc + v.diferenca_itens, 0);
    const identifiedTroca = vinculos.filter(v => v.cpf_cliente).length;

    return {
      fisica: calcMetrics(fisica),
      online: calcMetrics(online),
      adicional: calcMetrics(adicional),
      troca: {
        venda: vTroca,
        cupons: cTroca,
        itens: iTroca,
        tkm: cTroca > 0 ? vTroca / cTroca : 0,
        pa: cTroca > 0 ? iTroca / cTroca : 0,
        cadastros: cTroca > 0 ? (identifiedTroca / cTroca) * 100 : 0,
        identified: identifiedTroca
      }
    };
  }, [data, vinculos]);

  // Consolidado Dinâmico com Regra de Recálculo (Nunca somar métricas derivadas)
  const consolidado = useMemo(() => {
    let v = 0, c = 0, i = 0, iden = 0;
    
    // 1. Somar Bases Brutas
    if (selectedChannels.fisica) {
      v += metricsByChannel.fisica.venda;
      c += metricsByChannel.fisica.cupons;
      i += metricsByChannel.fisica.itens;
      iden += metricsByChannel.fisica.identified;
    }
    if (selectedChannels.online) {
      v += metricsByChannel.online.venda;
      c += metricsByChannel.online.cupons;
      i += metricsByChannel.online.itens;
      iden += metricsByChannel.online.identified;
    }
    if (selectedChannels.adicional) {
      v += metricsByChannel.adicional.venda;
      c += metricsByChannel.adicional.cupons;
      i += metricsByChannel.adicional.itens;
      iden += metricsByChannel.adicional.identified;
    }
    if (selectedChannels.troca) {
      v += metricsByChannel.troca.venda;
      c += metricsByChannel.troca.cupons;
      i += metricsByChannel.troca.itens;
      iden += metricsByChannel.troca.identified;
    }

    // Fallback caso todos estejam desativados
    const allDisabled = !selectedChannels.fisica && !selectedChannels.online && !selectedChannels.adicional && !selectedChannels.troca;
    if (allDisabled) {
      return { venda: 0, cupons: 0, itens: 0, tkm: 0, pa: 0, cadastros: 0 };
    }

    // 2. Recalcular métricas derivadas sobre a nova base somada
    return {
      venda: v,
      cupons: c,
      itens: i,
      tkm: c > 0 ? v / c : 0,
      pa: c > 0 ? i / c : 0,
      cadastros: c > 0 ? (iden / c) * 100 : 0
    };
  }, [selectedChannels, metricsByChannel]);

  const navItems = [
    { id: "geral", label: "Visão Geral", icon: LayoutDashboard },
    { id: "diario", label: "Performance Diária", icon: CalendarIcon },
    { id: "performance_vendedores", label: "Ranking Performance", icon: Award },
    { id: "composicao", label: "Composição da Venda", icon: Layers, color: "text-indigo-500" },
    { id: "produtividade", label: "Produtividade", icon: Activity, color: "text-cyan-500" },
    { id: "oportunidades", label: "Oportunidades Perdidas", icon: CircleAlert, color: "text-orange-600" },
    { id: "radar", label: "Radar de Risco", icon: ShieldAlert, color: "text-rose-600" },
    { id: "conversao", label: "Auditoria Pickup", icon: Smartphone, color: "text-sky-500" },
    { id: "auditoria", label: "Auditoria Descontos", icon: Percent, color: "text-rose-500" },
    { id: "trocas", label: "Gestão de Trocas", icon: ArrowRightLeft, color: "text-purple-500" },
    { id: "transacoes", label: "Todas Transações", icon: FileText },
    { id: "whatsapp", label: "Relatórios WhatsApp", icon: MessageCircle, color: "text-emerald-500" },
  ];

  const renderActiveTab = () => {
    switch(activeTab) {
      case "geral":
        return (
          <div className="space-y-8 md:space-y-12 animate-in fade-in duration-500">
            {/* Seletor de Canais para Consolidação */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 bg-white p-4 md:p-6 rounded-[2.5rem] border-2 border-orange-100 shadow-sm">
              <ChannelSelector label="Loja Física" icon={Store} active={selectedChannels.fisica} color="text-slate-600" onToggle={() => toggleChannel('fisica')} />
              <ChannelSelector label="Pickup" icon={Smartphone} active={selectedChannels.online} color="text-sky-500" onToggle={() => toggleChannel('online')} />
              <ChannelSelector label="Venda Adicional" icon={Zap} active={selectedChannels.adicional} color="text-emerald-500" onToggle={() => toggleChannel('adicional')} />
              <ChannelSelector label="Trocas" icon={ArrowRightLeft} active={selectedChannels.troca} color="text-purple-500" onToggle={() => toggleChannel('troca')} />
            </div>

            {/* Quadro Consolidado Geral */}
            <Card className="ri-card border-orange-400 border-4 bg-orange-50/30 overflow-hidden shadow-2xl shadow-orange-100/50">
              <div className="p-5 bg-orange-50 border-b border-orange-200 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <Target className="w-7 h-7 text-orange-600 shrink-0" />
                  <h3 className="text-sm md:text-lg font-black text-orange-800 uppercase tracking-tight">Consolidado Selecionado</h3>
                </div>
                <div className="flex items-center gap-3 bg-white px-6 py-2 rounded-full border border-orange-200 w-full md:w-auto justify-center shadow-sm">
                   <UserCheck className="w-5 h-5 text-emerald-500" />
                   <span className="text-[11px] font-black text-slate-500 uppercase">Fidelização:</span>
                   <span className="text-base font-black text-emerald-600">{consolidado.cadastros.toFixed(1)}%</span>
                </div>
              </div>
              <CardContent className="p-8 md:p-12 space-y-10">
                <div className="text-center lg:text-left border-b border-orange-100/50 pb-8">
                  <p className="text-[11px] md:text-xs font-black text-slate-400 uppercase tracking-[0.25em] mb-3">Faturamento Consolidado</p>
                  <p className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-800 leading-tight tracking-tighter">
                    {formatCurrency(consolidado.venda)}
                  </p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
                  <div className="text-center lg:text-left space-y-1">
                    <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">Total Cupons</p>
                    <p className="text-2xl md:text-3xl font-black text-slate-600 tracking-tight">{consolidado.cupons}</p>
                  </div>
                  <div className="text-center lg:text-left space-y-1">
                    <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">Total Peças</p>
                    <p className="text-2xl md:text-3xl font-black text-slate-600 tracking-tight">{consolidado.itens}</p>
                  </div>
                  <div className="text-center lg:text-left space-y-1">
                    <p className="text-[10px] md:text-[11px] font-black text-orange-400 uppercase tracking-widest">Ticket Médio</p>
                    <p className="text-2xl md:text-3xl font-black text-orange-600 tracking-tight">{formatCurrency(consolidado.tkm, true)}</p>
                  </div>
                  <div className="text-center lg:text-left space-y-1">
                    <p className="text-[10px] md:text-[11px] font-black text-sky-400 uppercase tracking-widest">P.A. Geral</p>
                    <p className="text-2xl md:text-3xl font-black text-sky-600 tracking-tight">{consolidado.pa.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cards Fixos por Canal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
              <FixedChannelCard title="Loja Física" icon={Store} metrics={metricsByChannel.fisica} color="border-slate-200" headerColor="bg-slate-50 text-slate-600" />
              <FixedChannelCard title="Pickup" icon={Smartphone} metrics={metricsByChannel.online} color="border-sky-200" headerColor="bg-sky-50 text-sky-600" />
              <FixedChannelCard title="Venda Adicional" icon={Zap} metrics={metricsByChannel.adicional} color="border-emerald-200" headerColor="bg-emerald-50 text-emerald-600" />
              <FixedChannelCard title="Trocas" icon={ArrowRightLeft} metrics={metricsByChannel.troca} color="border-purple-200" headerColor="bg-purple-50 text-purple-600" />
            </div>
          </div>
        );
      case "diario":
        return <DailyPerformance data={data} />;
      case "performance_vendedores":
        return <VendorPerformance data={data} />;
      case "composicao":
        return <SalesComposition data={data} vinculos={vinculos} />;
      case "produtividade":
        return <OperationalProductivity data={data} />;
      case "oportunidades":
        return <LostOpportunities data={data} vinculos={vinculos} />;
      case "radar":
        return <RiskRadar data={data} />;
      case "conversao":
        return <ConversionAudit data={data} />;
      case "auditoria":
        return <DiscountAudit data={data} />;
      case "trocas":
        return <ExchangeManagement data={data} vinculos={vinculos} />;
      case "transacoes":
        return <TransactionList data={data} />;
      case "whatsapp":
        return <WhatsappReports data={data} vinculos={vinculos} />;
      default:
        return (
          <div className="flex-1 flex items-center justify-center p-8 md:p-16 bg-white rounded-[3rem] border-2 border-dashed border-orange-100">
            <div className="text-center space-y-6">
              <div className="bg-orange-50 p-8 rounded-full inline-block">
                {(() => {
                  const item = navItems.find(n => n.id === activeTab);
                  const Icon = item?.icon || LayoutDashboard;
                  return <Icon className="w-12 h-12 md:w-16 md:h-16 text-orange-400" />;
                })()}
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tighter">Página em Construção</h3>
              <p className="text-sm md:text-lg text-slate-500 font-medium max-w-sm mx-auto">Esta funcionalidade será migrada para o novo padrão estratégico em breve.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
      <Sidebar className="border-r border-orange-100 bg-white" collapsible="offcanvas">
        <SidebarContent className="p-4 md:p-6">
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] mb-8 px-2">Menu Estratégico</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-3">
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton 
                      isActive={activeTab === item.id} 
                      onClick={() => handleTabChange(item.id)}
                      className={cn(
                        "rounded-[1.25rem] py-7 px-5 transition-all duration-300 h-auto",
                        activeTab === item.id 
                          ? "bg-orange-500 text-white shadow-xl shadow-orange-100 font-black" 
                          : "hover:bg-orange-50 text-slate-500 font-bold"
                      )}
                    >
                      <item.icon className={cn("w-5 h-5 mr-4 shrink-0", activeTab !== item.id && (item.color || "text-slate-400"))} />
                      <span className="text-sm tracking-tight">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <div className="flex-1 overflow-y-auto bg-amber-50/20 p-4 md:p-10 flex flex-col gap-8 md:gap-12 scroll-smooth scrollbar-hide">
        {showWelcome && (
          <section className="bg-gradient-to-br from-orange-500 to-[#F37021] rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 text-white shadow-2xl flex flex-col md:flex-row items-center gap-6 relative animate-in slide-in-from-top-4 duration-500 overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
               <Sparkles className="w-40 h-40" />
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowWelcome(false)} className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full h-10 w-10">
              <X className="w-6 h-6" />
            </Button>
            <div className="bg-white/20 p-5 rounded-full hidden lg:block shrink-0"><Sparkles className="w-10 h-10 text-white" /></div>
            <div className="flex-1 space-y-2 text-center md:text-left relative z-10">
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none">Gestão Estratégica</h2>
              <p className="text-orange-50 font-medium text-xs md:text-base opacity-90 leading-relaxed max-w-2xl">Analise o desempenho da loja física e e-commerce de forma integrada e transparente. Use os dados para orientar sua equipe.</p>
            </div>
          </section>
        )}

        <div className="flex-1">
          {renderActiveTab()}
        </div>
      </div>
    </div>
  );
}

function ChannelSelector({ label, icon: Icon, active, color, onToggle }: { label: string, icon: any, active: boolean, color: string, onToggle: () => void }) {
  return (
    <div 
      onClick={onToggle}
      className={cn(
        "flex flex-col items-center justify-center p-4 md:p-6 rounded-[1.75rem] cursor-pointer transition-all duration-300 border-2 gap-3 h-full select-none",
        active ? "bg-white border-orange-400 shadow-lg scale-[1.03]" : "bg-slate-50 border-transparent opacity-50 hover:opacity-100"
      )}
    >
      <div className={cn("p-3 rounded-full shadow-sm", active ? "bg-orange-50" : "bg-white")}>
        <Icon className={cn("w-6 h-6 md:w-7 md:h-7", active ? color : "text-slate-400")} />
      </div>
      <span className={cn("text-[10px] md:text-[11px] font-black uppercase tracking-[0.1em] text-center leading-tight", active ? "text-slate-800" : "text-slate-400")}>{label}</span>
      {active ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-1" /> : <Circle className="w-5 h-5 text-slate-200 mt-1" />}
    </div>
  );
}

function FixedChannelCard({ title, icon: Icon, metrics, color, headerColor }: { title: string, icon: any, metrics: any, color: string, headerColor: string }) {
  return (
    <Card className={cn("ri-card border-2 overflow-hidden bg-white shadow-sm", color)}>
      <div className={cn("p-5 flex items-center justify-between border-b", headerColor)}>
        <h4 className="text-[11px] font-black uppercase tracking-[0.15em] flex items-center gap-3">
          <Icon className="w-5 h-5" /> {title}
        </h4>
        <div className="text-right">
           <p className="text-lg font-black tracking-tight">{formatCurrency(metrics.venda)}</p>
           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{metrics.cadastros.toFixed(1)}% IDENTIFICAÇÃO</span>
        </div>
      </div>
      <CardContent className="p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        <div className="space-y-1.5">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cupons</p>
          <p className="text-lg font-black text-slate-700 leading-none">{metrics.cupons}</p>
        </div>
        <div className="space-y-1.5">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Peças</p>
          <p className="text-lg font-black text-slate-700 leading-none">{metrics.itens}</p>
        </div>
        <div className="space-y-1.5">
          <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest">TKM</p>
          <p className="text-lg font-black text-orange-600 leading-none">{formatCurrency(metrics.tkm, true)}</p>
        </div>
        <div className="space-y-1.5">
          <p className="text-[9px] font-black text-sky-400 uppercase tracking-widest">P.A.</p>
          <p className="text-lg font-black text-sky-600 leading-none">{metrics.pa.toFixed(2)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
