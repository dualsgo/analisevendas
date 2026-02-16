
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
          <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500">
            {/* Seletor de Canais para Consolidação */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 bg-white p-3 md:p-4 rounded-3xl border-2 border-orange-100 shadow-sm">
              <ChannelSelector label="Loja Física" icon={Store} active={selectedChannels.fisica} color="text-slate-600" onToggle={() => toggleChannel('fisica')} />
              <ChannelSelector label="Pickup" icon={Smartphone} active={selectedChannels.online} color="text-sky-500" onToggle={() => toggleChannel('online')} />
              <ChannelSelector label="Venda Adicional" icon={Zap} active={selectedChannels.adicional} color="text-emerald-500" onToggle={() => toggleChannel('adicional')} />
              <ChannelSelector label="Trocas" icon={ArrowRightLeft} active={selectedChannels.troca} color="text-purple-500" onToggle={() => toggleChannel('troca')} />
            </div>

            {/* Quadro Consolidado Geral */}
            <Card className="ri-card border-orange-400 border-4 bg-orange-50/30 overflow-hidden shadow-xl shadow-orange-100/50">
              <div className="p-4 bg-orange-50 border-b border-orange-200 flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <Target className="w-6 h-6 text-orange-600 shrink-0" />
                  <h3 className="text-sm md:text-base font-black text-orange-800 uppercase tracking-tight">Consolidado Selecionado</h3>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border border-orange-200 w-full md:w-auto justify-center">
                   <UserCheck className="w-4 h-4 text-emerald-500" />
                   <span className="text-[10px] font-black text-slate-500 uppercase">Fidelização:</span>
                   <span className="text-sm font-black text-emerald-600">{consolidado.cadastros.toFixed(1)}%</span>
                </div>
              </div>
              <CardContent className="p-6 md:p-10 space-y-8">
                <div className="text-center lg:text-left border-b border-orange-100 pb-6">
                  <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Faturamento Consolidado</p>
                  <p className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-800 leading-tight tracking-tighter">
                    {formatCurrency(consolidado.venda)}
                  </p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10">
                  <div className="text-center lg:text-left">
                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Cupons</p>
                    <p className="text-xl md:text-2xl font-black text-slate-600">{consolidado.cupons}</p>
                  </div>
                  <div className="text-center lg:text-left">
                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Peças</p>
                    <p className="text-xl md:text-2xl font-black text-slate-600">{consolidado.itens}</p>
                  </div>
                  <div className="text-center lg:text-left">
                    <p className="text-[9px] md:text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Ticket Médio</p>
                    <p className="text-xl md:text-2xl font-black text-orange-600">{formatCurrency(consolidado.tkm, true)}</p>
                  </div>
                  <div className="text-center lg:text-left">
                    <p className="text-[9px] md:text-[10px] font-black text-sky-400 uppercase tracking-widest mb-1">P.A. Geral</p>
                    <p className="text-xl md:text-2xl font-black text-sky-600">{consolidado.pa.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cards Fixos por Canal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
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
          <div className="flex-1 flex items-center justify-center p-8 md:p-12 bg-white rounded-[2rem] md:rounded-[3rem] border-2 border-dashed border-orange-100">
            <div className="text-center space-y-4">
              <div className="bg-orange-50 p-6 rounded-full inline-block">
                {(() => {
                  const item = navItems.find(n => n.id === activeTab);
                  const Icon = item?.icon || LayoutDashboard;
                  return <Icon className="w-10 h-10 md:w-12 md:h-12 text-orange-400" />;
                })()}
              </div>
              <h3 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">Página em Construção</h3>
              <p className="text-sm md:text-base text-slate-500 font-medium max-w-xs mx-auto">Esta funcionalidade será migrada para o novo padrão estratégico em breve.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
      <Sidebar className="border-r border-orange-100 bg-white" collapsible="offcanvas">
        <SidebarContent className="p-4">
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6">Menu de Navegação</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton 
                      isActive={activeTab === item.id} 
                      onClick={() => handleTabChange(item.id)}
                      className={cn(
                        "rounded-xl py-6 px-4 transition-all duration-300 h-auto",
                        activeTab === item.id 
                          ? "bg-orange-500 text-white shadow-lg shadow-orange-100 font-black" 
                          : "hover:bg-orange-50 text-slate-500 font-bold"
                      )}
                    >
                      <item.icon className={cn("w-5 h-5 mr-3 shrink-0", activeTab !== item.id && item.color)} />
                      <span className="text-sm">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <div className="flex-1 overflow-y-auto bg-amber-50/20 p-4 md:p-8 flex flex-col gap-6 md:gap-8 scroll-smooth scrollbar-hide">
        {showWelcome && (
          <section className="bg-gradient-to-r from-orange-500 to-[#F37021] rounded-2xl md:rounded-[2.5rem] p-5 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-center gap-4 relative animate-in slide-in-from-top-4 duration-500">
            <Button variant="ghost" size="icon" onClick={() => setShowWelcome(false)} className="absolute top-2 right-2 text-white hover:bg-white/20 rounded-full">
              <X className="w-5 h-5" />
            </Button>
            <div className="bg-white/20 p-3 rounded-full hidden lg:block"><Sparkles className="w-8 h-8 text-white" /></div>
            <div className="flex-1 space-y-1 text-center md:text-left">
              <h2 className="text-lg md:text-2xl font-black uppercase tracking-tighter">Gestão Estratégica</h2>
              <p className="text-orange-50 font-medium text-[11px] md:text-sm">Analise o desempenho da loja física e e-commerce de forma integrada e transparente.</p>
            </div>
          </section>
        )}

        {renderActiveTab()}
      </div>
    </div>
  );
}

function ChannelSelector({ label, icon: Icon, active, color, onToggle }: { label: string, icon: any, active: boolean, color: string, onToggle: () => void }) {
  return (
    <div 
      onClick={onToggle}
      className={cn(
        "flex flex-col items-center justify-center p-3 md:p-4 rounded-2xl cursor-pointer transition-all duration-300 border-2 gap-2 h-full",
        active ? "bg-white border-orange-400 shadow-md scale-[1.02]" : "bg-slate-50 border-transparent opacity-60 hover:opacity-100"
      )}
    >
      <div className={cn("p-2 rounded-full", active ? "bg-orange-50" : "bg-white")}>
        <Icon className={cn("w-5 h-5 md:w-6 md:h-6", active ? color : "text-slate-400")} />
      </div>
      <span className={cn("text-[9px] md:text-[10px] font-black uppercase tracking-widest text-center", active ? "text-slate-800" : "text-slate-400")}>{label}</span>
      {active ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-1" /> : <Circle className="w-4 h-4 text-slate-200 mt-1" />}
    </div>
  );
}

function FixedChannelCard({ title, icon: Icon, metrics, color, headerColor }: { title: string, icon: any, metrics: any, color: string, headerColor: string }) {
  return (
    <Card className={cn("ri-card border-2 overflow-hidden bg-white", color)}>
      <div className={cn("p-4 flex items-center justify-between", headerColor)}>
        <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
          <Icon className="w-4 h-4" /> {title}
        </h4>
        <div className="text-right">
           <p className="text-base font-black">{formatCurrency(metrics.venda)}</p>
           <span className="text-[9px] font-black text-slate-400 uppercase">{metrics.cadastros.toFixed(1)}% IDENTIFICAÇÃO</span>
        </div>
      </div>
      <CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div className="space-y-1">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Cupons</p>
          <p className="text-sm font-black text-slate-700">{metrics.cupons}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Itens</p>
          <p className="text-sm font-black text-slate-700">{metrics.itens}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[8px] font-black text-orange-400 uppercase tracking-widest">TKM</p>
          <p className="text-sm font-black text-orange-600">{formatCurrency(metrics.tkm, true)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[8px] font-black text-sky-400 uppercase tracking-widest">P.A.</p>
          <p className="text-sm font-black text-sky-600">{metrics.pa.toFixed(2)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
