
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
  X, 
  Calendar as CalendarIcon,
  Smartphone,
  Zap,
  UserCheck,
  Award,
  Percent,
  CircleAlert,
  Layers,
  Activity,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  LineChart,
  Boxes,
  History,
  ShoppingBag,
  Sword,
  ClipboardList,
  Flame,
  MousePointer2
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
import { ComplianceAudit } from "./ComplianceAudit";
import { ElasticityAnalysis } from "./ElasticityAnalysis";
import { AdvancedAnalytics } from "./AdvancedAnalytics";
import { QualityAnalysis } from "./QualityAnalysis";
import { YoYAnalysis } from "./YoYAnalysis";
import { AdditionalItemsAnalysis } from "./AdditionalItemsAnalysis";
import { CollaboratorGamification } from "./CollaboratorGamification";
import { ConsolidatedReport } from "./ConsolidatedReport";
import { HeatmapAnalysis } from "./HeatmapAnalysis";
import { BasketBehavior } from "./BasketBehavior";
import { SalesEnergy } from "./SalesEnergy";
import { ProductRisk } from "./ProductRisk";

interface SalesSummaryProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

export function SalesSummary({ data = [], vinculos = [] }: SalesSummaryProps) {
  const [activeTab, setActiveTab] = useState("geral");
  const { setOpenMobile, state } = useSidebar();
  const isCollapsed = state === "collapsed";

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
    
    const calcMetrics = (rows: DetailedSaleRow[]) => {
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

    const allDisabled = !selectedChannels.fisica && !selectedChannels.online && !selectedChannels.adicional && !selectedChannels.troca;
    if (allDisabled) return { venda: 0, cupons: 0, itens: 0, tkm: 0, pa: 0, cadastros: 0 };

    return {
      venda: v,
      cupons: c,
      itens: i,
      tkm: c > 0 ? v / c : 0,
      pa: c > 0 ? i / c : 0,
      cadastros: c > 0 ? Math.min((iden / c) * 100, 100) : 0
    };
  }, [selectedChannels, metricsByChannel]);

  const navItems = [
    { id: "geral", label: "Visão Geral", icon: LayoutDashboard },
    { id: "heatmap", label: "Mapa de Calor", icon: Flame, color: "text-orange-500 font-black" },
    { id: "energy", label: "Curva de Energia", icon: Activity, color: "text-sky-500 font-bold" },
    { id: "basket", label: "Anatomia da Cesta", icon: ShoppingBag, color: "text-emerald-600 font-bold" },
    { id: "product_risk", label: "Risco Comercial", icon: ShieldAlert, color: "text-rose-600 font-bold" },
    { id: "consolidado", label: "Relatório Consolidado", icon: ClipboardList, color: "text-emerald-600 font-black" },
    { id: "gamification", label: "Arena de Talentos", icon: Sword, color: "text-yellow-500 font-black" },
    { id: "venda_sugestiva", label: "SLP & Social", icon: ShoppingBag, color: "text-orange-600 font-black" },
    { id: "yoy_analise", label: "Resultado YoY", icon: History, color: "text-indigo-600 font-bold" },
    { id: "diario", label: "Performance Diária", icon: CalendarIcon },
    { id: "performance_vendedores", label: "Performance Colaboradores", icon: Award },
    { id: "elasticidade", label: "Elasticidade Desconto", icon: LineChart, color: "text-amber-600" },
    { id: "deep_dive", label: "Fluxo & Pareto", icon: TrendingUp, color: "text-indigo-600" },
    { id: "qualidade_avancada", label: "Qualidade de Venda", icon: UserCheck, color: "text-emerald-600" },
    { id: "composicao", label: "Composição", icon: Layers, color: "text-indigo-500" },
    { id: "produtividade", label: "Produtividade", icon: Activity, color: "text-cyan-500" },
    { id: "compliance", label: "Auditoria PA", icon: ShieldCheck, color: "text-red-600" },
    { id: "radar", label: "Radar de Alertas", icon: ShieldAlert, color: "text-rose-600" },
    { id: "oportunidades", label: "Oportunidades", icon: CircleAlert, color: "text-orange-600" },
    { id: "conversao", label: "Audit. Conversão", icon: Smartphone, color: "text-sky-500" },
    { id: "auditoria", label: "Audit. Descontos", icon: Percent, color: "text-rose-500" },
    { id: "trocas", label: "Audit. Trocas", icon: ArrowRightLeft, color: "text-purple-500" },
    { id: "transacoes", label: "Transações", icon: FileText },
    { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "text-emerald-500" },
  ];

  const renderActiveTab = () => {
    switch(activeTab) {
      case "geral":
        return (
          <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 bg-white p-3 md:p-4 rounded-2xl border-2 border-orange-100 shadow-sm">
              <ChannelSelector label="Loja Física" icon={Store} active={selectedChannels.fisica} color="text-slate-600" onToggle={() => toggleChannel('fisica')} />
              <ChannelSelector label="Pickup" icon={Smartphone} active={selectedChannels.online} color="text-sky-500" onToggle={() => toggleChannel('online')} />
              <ChannelSelector label="Adicional" icon={Zap} active={selectedChannels.adicional} color="text-emerald-500" onToggle={() => toggleChannel('adicional')} />
              <ChannelSelector label="Trocas" icon={ArrowRightLeft} active={selectedChannels.troca} color="text-purple-500" onToggle={() => toggleChannel('troca')} />
            </div>

            <Card className="ri-card border-orange-400 border-2 bg-orange-50/30 overflow-hidden shadow-xl">
              <div className="p-2 md:p-3 bg-orange-50 border-b border-orange-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-orange-600" />
                  <h3 className="text-xs font-bold text-orange-800 uppercase tracking-tight">Consolidado</h3>
                </div>
                <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-orange-200 shadow-sm">
                   <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                   <span className="text-[10px] font-bold text-emerald-600">{consolidado.cadastros.toFixed(1)}% IDENT.</span>
                </div>
              </div>
              <CardContent className="p-4 md:p-5 space-y-6 flex flex-col items-center justify-center text-center">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">Faturamento Consolidado</p>
                  <p className={cn(
                    "font-black text-slate-800 tracking-tighter leading-none transition-all duration-300",
                    isCollapsed ? "text-5xl sm:text-7xl" : "text-4xl sm:text-5xl"
                  )}>
                    {formatCurrency(consolidado.venda)}
                  </p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 w-full px-4 md:px-10">
                  <QuickMetric label="Cupons" value={consolidado.cupons} large={isCollapsed} />
                  <QuickMetric label="Peças" value={consolidado.itens} large={isCollapsed} />
                  <QuickMetric label="Ticket Médio" value={formatCurrency(consolidado.tkm, true)} color="text-orange-600" large={isCollapsed} />
                  <QuickMetric label="P.A. Geral" value={consolidado.pa.toFixed(2)} color="text-sky-600" large={isCollapsed} />
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FixedChannelCard title="Físico" icon={Store} metrics={metricsByChannel.fisica} color="border-slate-200" large={isCollapsed} />
              <FixedChannelCard title="Pickup" icon={Smartphone} metrics={metricsByChannel.online} color="border-sky-200" large={isCollapsed} />
              <FixedChannelCard title="Adicional" icon={Zap} metrics={metricsByChannel.adicional} color="border-emerald-200" large={isCollapsed} />
              <FixedChannelCard title="Trocas" icon={ArrowRightLeft} metrics={metricsByChannel.troca} color="border-purple-200" large={isCollapsed} />
            </div>
          </div>
        );
      case "heatmap": return <HeatmapAnalysis data={data} vinculos={vinculos} />;
      case "energy": return <SalesEnergy data={data} />;
      case "basket": return <BasketBehavior data={data} />;
      case "product_risk": return <ProductRisk data={data} />;
      case "consolidado": return <ConsolidatedReport data={data} vinculos={vinculos} />;
      case "gamification": return <CollaboratorGamification data={data} vinculos={vinculos} />;
      case "venda_sugestiva": return <AdditionalItemsAnalysis data={data} />;
      case "diario": return <DailyPerformance data={data} />;
      case "performance_vendedores": return <VendorPerformance data={data} />;
      case "composicao": return <SalesComposition data={data} vinculos={vinculos} />;
      case "produtividade": return <OperationalProductivity data={data} />;
      case "compliance": return <ComplianceAudit data={data} />;
      case "oportunidades": return <LostOpportunities data={data} vinculos={vinculos} />;
      case "radar": return <RiskRadar data={data} />;
      case "conversao": return <ConversionAudit data={data} />;
      case "auditoria": return <DiscountAudit data={data} />;
      case "trocas": return <ExchangeManagement data={data} vinculos={vinculos} />;
      case "transacoes": return <TransactionList data={data} />;
      case "whatsapp": return <WhatsappReports data={data} vinculos={vinculos} />;
      case "elasticidade": return <ElasticityAnalysis data={data} />;
      case "deep_dive": return <AdvancedAnalytics data={data} />;
      case "qualidade_avancada": return <QualityAnalysis data={data} vinculos={vinculos} />;
      case "yoy_analise": return <YoYAnalysis data={data} />;
      default: return null;
    }
  };

  const formatCurrency = (val: number | string, isMobile = false) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isMobile && num >= 1000) {
      return `R$ ${(num / 1000).toFixed(1)}k`;
    }
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
      <Sidebar className="border-r border-orange-100 bg-white print:hidden" collapsible="icon">
        <SidebarContent className="p-3 md:p-4">
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-bold uppercase text-slate-400 tracking-widest mb-4 px-2 group-data-[collapsible=icon]:hidden">Menu Estratégico</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton 
                      isActive={activeTab === item.id} 
                      onClick={() => handleTabChange(item.id)}
                      tooltip={item.label}
                      className={cn(
                        "rounded-xl py-5 px-4 transition-all duration-200 h-auto",
                        activeTab === item.id 
                          ? "bg-orange-500 text-white shadow-lg font-black" 
                          : "hover:bg-orange-50 text-slate-500 font-bold"
                      )}
                    >
                      <item.icon className={cn("w-4 h-4 mr-3 shrink-0", activeTab !== item.id && (item.color || "text-slate-400"))} />
                      <span className="text-sm font-medium tracking-tight group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <div className={cn(
        "flex-1 overflow-y-auto bg-amber-50/20 p-4 md:p-6 flex flex-col gap-6 scrollbar-hide print:p-0 print:bg-white transition-all duration-300",
        isCollapsed ? "text-mode-large" : ""
      )}>
        <div className="flex-1 min-h-0">
          {renderActiveTab()}
        </div>
      </div>
    </div>
  );
}

function QuickMetric({ label, value, color, large }: any) {
  return (
    <div className="space-y-2 text-center flex flex-col items-center justify-center">
      <p className={cn("font-bold text-slate-400 uppercase tracking-widest leading-none mb-1", large ? "text-[12px]" : "text-[10px]")}>{label}</p>
      <p className={cn(
        "font-black leading-none transition-all duration-300", 
        color || "text-slate-700",
        large ? "text-2xl md:text-4xl" : "text-lg md:text-2xl"
      )}>{value}</p>
    </div>
  );
}

function ChannelSelector({ label, icon: Icon, active, color, onToggle }: any) {
  return (
    <div 
      onClick={onToggle}
      className={cn(
        "flex flex-col items-center justify-center p-3 md:p-4 rounded-xl cursor-pointer transition-all border-2 gap-2 h-full select-none text-center",
        active ? "bg-white border-orange-400 shadow-md scale-[1.02]" : "bg-slate-50 border-transparent opacity-50 hover:opacity-80"
      )}
    >
      <Icon className={cn("w-5 h-5", active ? color : "text-slate-400")} />
      <span className={cn("text-xs font-bold uppercase text-center leading-none", active ? "text-slate-800" : "text-slate-400")}>{label}</span>
    </div>
  );
}

function FixedChannelCard({ title, metrics, color, large }: any) {
  const formatCurrency = (val: number | string, isMobile = false) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isMobile && num >= 1000) {
      return `R$ ${(num / 1000).toFixed(1)}k`;
    }
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <Card className={cn("ri-card border-2 overflow-hidden bg-white shadow-sm flex flex-col h-full", color)}>
      <div className="p-3 bg-slate-50/50 border-b flex flex-col items-center justify-center text-center gap-1">
        <h4 className={cn("font-bold uppercase tracking-widest text-slate-600 leading-none", large ? "text-[11px]" : "text-[10px]")}>{title}</h4>
        <p className={cn("font-black text-slate-800 leading-none", large ? "text-xl" : "text-lg")}>{formatCurrency(metrics.venda, true)}</p>
      </div>
      <CardContent className="p-4 grid grid-cols-2 gap-3 text-center items-center justify-center flex-1">
        <div className="space-y-1">
          <p className={cn("font-bold text-slate-400 uppercase leading-none", large ? "text-[10px]" : "text-[9px]")}>TKM</p>
          <p className={cn("font-bold text-orange-600 leading-none", large ? "text-base" : "text-sm")}>{formatCurrency(metrics.tkm, true)}</p>
        </div>
        <div className="space-y-1">
          <p className={cn("font-bold text-slate-400 uppercase leading-none", large ? "text-[10px]" : "text-[9px]")}>P.A.</p>
          <p className={cn("font-bold text-sky-600 leading-none", large ? "text-base" : "text-sm")}>{metrics.pa.toFixed(2)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
