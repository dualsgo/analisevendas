
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
  TrendingUp, 
  Target, 
  AlertCircle, 
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
  UserCheck
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
  SidebarProvider,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";
import { DailyPerformance } from "./DailyPerformance";

interface SalesSummaryProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

const formatCurrency = (val: number | string) => {
  const num = typeof val === 'string' ? parseFloat(val) : val;
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

  const metricsByChannel = useMemo(() => {
    const saidas = data.filter(r => r.tpNF === 1 && !r.is_devolucao && !r.is_cancelada);
    
    const fisica = saidas.filter(r => r.canal === "LOJA_FISICA");
    const online = saidas.filter(r => r.canal === "RETIRADA_ONLINE");
    const adicional = saidas.filter(r => r.canal === "RETIRADA_ADICIONAL" || r.is_adicional || r.is_adicional_suspeito);
    
    const calcMetrics = (rows: DetailedSaleRow[], isFisica = false) => {
      const v = rows.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
      const c = rows.length;
      const i = rows.reduce((acc, r) => acc + parseFloat(r.itens_qtd), 0);
      
      const identifiedCount = rows.filter(r => r.cpf_cnpj_dest && r.cpf_cnpj_dest.trim() !== "").length;
      const cadastrosPercent = isFisica ? (c > 0 ? (identifiedCount / c) * 100 : 0) : 100;

      return {
        venda: v,
        cupons: c,
        itens: i,
        tkm: c > 0 ? v / c : 0,
        pa: c > 0 ? i / c : 0,
        cadastros: cadastrosPercent,
        identified: identifiedCount
      };
    };

    const vTroca = vinculos.reduce((acc, v) => acc + v.valor_diferenca, 0);
    const cTroca = vinculos.length;
    const iTroca = vinculos.reduce((acc, v) => acc + v.diferenca_itens, 0);

    return {
      fisica: calcMetrics(fisica, true),
      online: calcMetrics(online),
      adicional: calcMetrics(adicional),
      troca: {
        venda: vTroca,
        cupons: cTroca,
        itens: iTroca,
        tkm: cTroca > 0 ? vTroca / cTroca : 0,
        pa: cTroca > 0 ? iTroca / cTroca : 0,
        cadastros: 100,
        identified: cTroca
      }
    };
  }, [data, vinculos]);

  const consolidado = useMemo(() => {
    let v = 0, c = 0, i = 0, iden = 0;
    
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
      iden += metricsByChannel.online.cupons;
    }
    if (selectedChannels.adicional) {
      v += metricsByChannel.adicional.venda;
      c += metricsByChannel.adicional.cupons;
      i += metricsByChannel.adicional.itens;
      iden += metricsByChannel.adicional.cupons;
    }
    if (selectedChannels.troca) {
      v += metricsByChannel.troca.venda;
      c += metricsByChannel.troca.cupons;
      i += metricsByChannel.troca.itens;
      iden += metricsByChannel.troca.cupons;
    }

    const allDisabled = !selectedChannels.fisica && !selectedChannels.online && !selectedChannels.adicional && !selectedChannels.troca;
    if (allDisabled) {
      v = metricsByChannel.fisica.venda + metricsByChannel.online.venda + metricsByChannel.adicional.venda + metricsByChannel.troca.venda;
      c = metricsByChannel.fisica.cupons + metricsByChannel.online.cupons + metricsByChannel.adicional.cupons + metricsByChannel.troca.cupons;
      i = metricsByChannel.fisica.itens + metricsByChannel.online.itens + metricsByChannel.adicional.itens + metricsByChannel.troca.itens;
      iden = metricsByChannel.fisica.identified + metricsByChannel.online.cupons + metricsByChannel.adicional.cupons + metricsByChannel.troca.cupons;
    }

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
    { id: "venda_loja", label: "Performance Venda", icon: TrendingUp },
    { id: "conversao", label: "Conversão Online", icon: Target },
    { id: "auditoria", label: "Auditoria Descontos", icon: AlertCircle },
    { id: "trocas", label: "Gestão de Trocas", icon: ArrowRightLeft },
    { id: "transacoes", label: "Todas Transações", icon: FileText },
    { id: "whatsapp", label: "Relatório WhatsApp", icon: MessageCircle, color: "text-emerald-500" },
  ];

  const renderActiveTab = () => {
    switch(activeTab) {
      case "geral":
        return (
          <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-4 rounded-3xl border-2 border-orange-100 shadow-sm">
              <ChannelSelector label="Loja Física" icon={Store} active={selectedChannels.fisica} color="text-slate-600" onToggle={() => toggleChannel('fisica')} />
              <ChannelSelector label="Retirada Online" icon={Smartphone} active={selectedChannels.online} color="text-sky-500" onToggle={() => toggleChannel('online')} />
              <ChannelSelector label="Venda Adicional" icon={Zap} active={selectedChannels.adicional} color="text-emerald-500" onToggle={() => toggleChannel('adicional')} />
              <ChannelSelector label="Saldo Trocas" icon={ArrowRightLeft} active={selectedChannels.troca} color="text-purple-500" onToggle={() => toggleChannel('troca')} />
            </div>

            <Card className="ri-card border-orange-400 border-4 bg-orange-50/30 overflow-hidden">
              <div className="p-4 bg-orange-50 border-b border-orange-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Target className="w-6 h-6 text-orange-600" />
                  <h3 className="text-sm md:text-base font-black text-orange-800 uppercase tracking-tight">Consolidado Dinâmico</h3>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border border-orange-200">
                   <UserCheck className="w-4 h-4 text-emerald-500" />
                   <span className="text-[10px] font-black text-slate-500 uppercase">Cadastros (CPF):</span>
                   <span className="text-sm font-black text-emerald-600">{consolidado.cadastros.toFixed(1)}%</span>
                </div>
              </div>
              <CardContent className="p-6 md:p-10">
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 md:gap-10 text-center lg:text-left">
                  <div className="col-span-2 lg:col-span-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Venda Selecionada</p>
                    <p className="text-2xl md:text-4xl font-black text-slate-800">{formatCurrency(consolidado.venda)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tickets</p>
                    <p className="text-xl md:text-3xl font-black text-slate-600">{consolidado.cupons}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Peças</p>
                    <p className="text-xl md:text-3xl font-black text-slate-600">{consolidado.itens}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Valor Médio</p>
                    <p className="text-xl md:text-3xl font-black text-orange-600">{formatCurrency(consolidado.tkm)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-1">P.A.</p>
                    <p className="text-xl md:text-3xl font-black text-sky-600">{consolidado.pa.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <MetricCard title="Venda Direta (Física)" icon={Store} metrics={metricsByChannel.fisica} showCadastros color="border-slate-200" headerColor="bg-slate-50 text-slate-600" />
              <MetricCard title="Retirada Online" icon={Smartphone} metrics={metricsByChannel.online} color="border-sky-200" headerColor="bg-sky-50 text-sky-600" />
              <MetricCard title="Venda Adicional (Upsell)" icon={Zap} metrics={metricsByChannel.adicional} color="border-emerald-200" headerColor="bg-emerald-50 text-emerald-600" />
              <MetricCard title="Saldo de Trocas" icon={ArrowRightLeft} metrics={metricsByChannel.troca} color="border-purple-200" headerColor="bg-purple-50 text-purple-600" />
            </div>
          </div>
        );
      case "diario":
        return <DailyPerformance data={data} />;
      default:
        const activeItem = navItems.find(n => n.id === activeTab);
        const ActiveIcon = activeItem?.icon || LayoutDashboard;
        return (
          <div className="flex-1 flex items-center justify-center p-12 bg-white rounded-[3rem] border-2 border-dashed border-orange-100">
            <div className="text-center space-y-4">
              <div className="bg-orange-50 p-6 rounded-full inline-block">
                <ActiveIcon className="w-12 h-12 text-orange-400" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Página em Construção</h3>
              <p className="text-slate-500 font-medium">Esta funcionalidade será migrada para o novo padrão estratégico em breve.</p>
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
                        "rounded-xl py-6 px-4 transition-all duration-300",
                        activeTab === item.id 
                          ? "bg-orange-500 text-white shadow-lg shadow-orange-100 font-black" 
                          : "hover:bg-orange-50 text-slate-500 font-bold"
                      )}
                    >
                      <item.icon className={cn("w-5 h-5 mr-3", activeTab !== item.id && item.color)} />
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
              <h2 className="text-lg md:text-2xl font-black uppercase tracking-tighter">Performance Estratégica</h2>
              <p className="text-orange-50 font-medium text-[11px] md:text-sm">Selecione e combine canais para analisar o resultado consolidado da unidade.</p>
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
        "flex flex-col items-center justify-center p-4 rounded-2xl cursor-pointer transition-all duration-300 border-2 gap-2",
        active ? "bg-white border-orange-400 shadow-md scale-[1.02]" : "bg-slate-50 border-transparent opacity-60 hover:opacity-100"
      )}
    >
      <div className={cn("p-2 rounded-full", active ? "bg-orange-50" : "bg-white")}>
        <Icon className={cn("w-6 h-6", active ? color : "text-slate-400")} />
      </div>
      <span className={cn("text-[10px] font-black uppercase tracking-widest", active ? "text-slate-800" : "text-slate-400")}>{label}</span>
      {active ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-1" /> : <Circle className="w-4 h-4 text-slate-200 mt-1" />}
    </div>
  );
}

function MetricCard({ title, icon: Icon, metrics, color, headerColor, showCadastros = false }: { title: string, icon: any, metrics: any, color: string, headerColor: string, showCadastros?: boolean }) {
  return (
    <Card className={cn("ri-card border-2 overflow-hidden bg-white", color)}>
      <div className={cn("p-4 flex items-center justify-between", headerColor)}>
        <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
          <Icon className="w-4 h-4" /> {title}
        </h4>
        <div className="flex flex-col items-end">
           <p className="text-lg font-black">{formatCurrency(metrics.venda)}</p>
           {showCadastros && (
             <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
               <UserCheck className="w-2.5 h-2.5" /> {metrics.cadastros.toFixed(1)}% CADASTRO
             </span>
           )}
        </div>
      </div>
      <CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div className="space-y-1">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tickets</p>
          <p className="text-base font-black text-slate-700">{metrics.cupons}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Peças</p>
          <p className="text-base font-black text-slate-700">{metrics.itens}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[8px] font-black text-orange-400 uppercase tracking-widest">TKM</p>
          <p className="text-base font-black text-orange-600">{formatCurrency(metrics.tkm)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[8px] font-black text-sky-400 uppercase tracking-widest">P.A.</p>
          <p className="text-base font-black text-sky-600">{metrics.pa.toFixed(2)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
