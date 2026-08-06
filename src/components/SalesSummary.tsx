
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { fadeIn, staggerContainer, childItem, slideUp } from "@/lib/animations";
import { 
  DetailedSaleRow, 
  VinculoTroca
} from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Trophy,
  Store, 
  Target, 
  LayoutDashboard, 
  ArrowRightLeft, 
  FileText, 
  MessageCircle, 
  X, 
  Truck,
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
  UserX,
  ClipboardList,
  ClipboardCheck,
  Flame,
  MousePointer2,
  Radio,
  CreditCard,
  Users2,
  DollarSign,
  ShoppingCart,
  ChevronRight,
  Timer,
  ListFilter,
  Hash,
  Scale,
  Lightbulb,
  AlertTriangle,
  Menu,
  ChevronDown,
  Sparkles,
  Settings2
} from "lucide-react";
import { format, parseISO, min, max, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { ptBR } from "date-fns/locale";
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
  useSidebar,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetTrigger
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DailyPerformance } from "./DailyPerformance";
import { ImpactProjection } from './ImpactProjection';
import { ConversionAudit } from "./ConversionAudit";
import { DiscountAudit } from "./DiscountAudit";
import { ExchangeManagement } from "./ExchangeManagement";
import { TransactionList } from "./TransactionList";
import { WhatsappReports } from "./WhatsappReports";
import { LostOpportunities } from "./LostOpportunities";
import { RiskRadar } from "./RiskRadar";
import { ElasticityAnalysis } from "./ElasticityAnalysis";
import { AdvancedAnalytics } from "./AdvancedAnalytics";
import { QualityAnalysis } from "./QualityAnalysis";
import { AdditionalItemsAnalysis } from "./AdditionalItemsAnalysis";
import { ConsolidatedReport } from "./ConsolidatedReport";
import { HeatmapAnalysis } from "./HeatmapAnalysis";
import { UnmissableOffersAnalysis } from "./UnmissableOffersAnalysis";
import { SalesEnergy } from "./SalesEnergy";
import { ProductRisk } from "./ProductRisk";
import { OperationalRhythm } from "./OperationalRhythm";
import { PaymentMap } from "./PaymentMap";
import { CustomerLoyalty } from "./CustomerLoyalty";
import { PriceProfile } from "./PriceProfile";
import { ItemRanking } from "./ItemRanking";
import { MatrizAfinidade } from "./MatrizAfinidade";
import { RiscoTrocas } from "./RiscoTrocas";
import { GeographicAnalysis } from "./GeographicAnalysis";
import { ExecutiveSummary } from "./ExecutiveSummary";
import { PickupPanel } from "./PickupPanel";
import { PickupDashboard } from "./PickupDashboard";
import { DeliveryPanel } from "./DeliveryPanel";
import { GapAnalysis } from "./GapAnalysis";
import { CouponAnalysis } from "./CouponAnalysis";
import { CollaboratorProductRanking } from "./CollaboratorProductRanking";
import { SocialActionPanel } from "./SocialActionPanel";
import { ConsecutiveCouponAnalysis } from "./ConsecutiveCouponAnalysis";
import { SundayAnalysis } from "./SundayAnalysis";
import { ProductivityDiagnostic } from "./ProductivityDiagnostic";
import { CashReconciliation } from "./CashReconciliation";
import { Calculator, Map, Heart, Brain, HelpCircle } from "lucide-react";
import { AnalysisHelp } from "./AnalysisHelp";
import { CopaAnalysis } from "./CopaAnalysis";
import { WeeklyAnalysis } from "./WeeklyAnalysis";
import { AgingCampaignAnalysis } from "./AgingCampaignAnalysis";
import { ShiftPerformance } from "./ShiftPerformance";
import { CollaboratorXRay } from "./CollaboratorXRay";

interface SalesSummaryProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
  onLogout?: () => void;
}

export function SalesSummary({ data = [], vinculos = [] }: SalesSummaryProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [activeTab, setActiveTab] = useState("executivo");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const { setOpenMobile, state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const [hiddenCollaborators, setHiddenCollaborators] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("hiddenCollaborators");
      return saved ? JSON.parse(saved) : ["MAYCON", "RUAN"];
    }
    return [];
  });

  const toggleCollaborator = (name: string) => {
    const updated = hiddenCollaborators.includes(name)
      ? hiddenCollaborators.filter(n => n !== name)
      : [...hiddenCollaborators, name];
    setHiddenCollaborators(updated);
    localStorage.setItem("hiddenCollaborators", JSON.stringify(updated));
  };

  const allCollaborators = useMemo(() => {
    const vends = new Set<string>();
    data.forEach(s => {
      if (s.vendedor) vends.add(s.vendedor);
    });
    return Array.from(vends).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    let result = data;
    if (hiddenCollaborators.length > 0) {
      result = result.filter(s => !s.vendedor || !hiddenCollaborators.includes(s.vendedor));
    }
    if (dateRange?.from) {
      const start = startOfDay(dateRange.from);
      const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      result = result.filter(s => {
        const d = parseISO(s.dhEmi);
        return isWithinInterval(d, { start, end });
      });
    }
    return result;
  }, [data, hiddenCollaborators, dateRange]);

  const filteredVinculos = useMemo(() => {
    let result = vinculos;
    if (hiddenCollaborators.length > 0) {
      result = result.filter(v => !v.vendedor || !hiddenCollaborators.includes(v.vendedor));
    }
    if (dateRange?.from) {
      const start = startOfDay(dateRange.from);
      const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      result = result.filter(v => {
        const d = parseISO(v.data_saida || v.data_entrada);
        return isWithinInterval(d, { start, end });
      });
    }
    return result;
  }, [vinculos, hiddenCollaborators, dateRange]);

  const [selectedChannels, setSelectedChannels] = useState({
    fisica: true,
    online: true,
    adicional: true,
    troca: true,
    delivery: true
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setOpenMobile(false);
  };

  const [periodView, setPeriodView] = useState<'consolidated' | 'monthly' | 'daily'>('consolidated');

  const analysisPeriod = useMemo(() => {
    const saidas = filteredData.filter(r => r.tpNF === 1 && !r.is_cancelada);
    if (saidas.length === 0) return "Sem dados";
    const dates = saidas.map(r => parseISO(r.dhEmi)).filter(d => !isNaN(d.getTime()));
    if (dates.length === 0) return "Período Indefinido";
    const start = min(dates);
    const end = max(dates);
    
    const isSameMonth = format(start, "MM/yyyy") === format(end, "MM/yyyy");
    const isSameDay = format(start, "dd/MM/yyyy") === format(end, "dd/MM/yyyy");

    if (isSameDay) {
      return format(start, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }).toUpperCase();
    }
    if (isSameMonth) {
      return format(start, "MMMM 'de' yyyy", { locale: ptBR }).toUpperCase();
    }
    return `${format(start, "dd/MM/yy")} — ${format(end, "dd/MM/yy")}`;
  }, [filteredData]);

  const toggleChannel = (channel: keyof typeof selectedChannels) => {
    setSelectedChannels(prev => ({ ...prev, [channel]: !prev[channel] }));
  };

  const metricsByChannel = useMemo(() => {
    const saidas = filteredData.filter(r => r.tpNF === 1 && !r.is_devolucao && !r.is_cancelada);
    
    const fisica    = saidas.filter(r => r.canal === "LOJA_FISICA" && !r.is_troca);
    const online    = saidas.filter(r => r.canal === "RETIRADA_ONLINE");
    const adicional = saidas.filter(r => r.canal === "RETIRADA_ADICIONAL");
    const delivery  = saidas.filter(r => r.canal === "DELIVERY");
    
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

    const vTroca = filteredVinculos.reduce((acc, v) => acc + v.valor_diferenca, 0);
    const cTroca = filteredVinculos.length;
    const iTroca = filteredVinculos.reduce((acc, v) => acc + v.diferenca_itens, 0);
    const identifiedTroca = filteredVinculos.filter(v => v.cpf_cliente).length;

    return {
      fisica: calcMetrics(fisica),
      online: calcMetrics(online),
      adicional: calcMetrics(adicional),
      delivery: calcMetrics(delivery),
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
  }, [filteredData, filteredVinculos]);

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
    if (selectedChannels.delivery) {
      v += metricsByChannel.delivery.venda;
      c += metricsByChannel.delivery.cupons;
      i += metricsByChannel.delivery.itens;
      iden += metricsByChannel.delivery.identified;
    }
    if (selectedChannels.troca) {
      v += metricsByChannel.troca.venda;
      c += metricsByChannel.troca.cupons;
      i += metricsByChannel.troca.itens;
      iden += metricsByChannel.troca.identified;
    }

    const allDisabled = !selectedChannels.fisica && !selectedChannels.online && !selectedChannels.adicional && !selectedChannels.troca && !selectedChannels.delivery;
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

  const periodBreakdown = useMemo(() => {
    if (periodView === 'consolidated') return null;

    const saidas = filteredData.filter(r => r.tpNF === 1 && !r.is_cancelada);
    const groups: Record<string, DetailedSaleRow[]> = {};
    
    saidas.forEach(r => {
      const date = parseISO(r.dhEmi);
      const key = periodView === 'monthly' ? format(date, "MM/yyyy") : format(date, "dd/MM/yyyy");
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });

    return Object.entries(groups).map(([key, rows]) => {
      const venta = rows.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
      const cupons = rows.length;
      const itens = rows.reduce((acc, r) => acc + parseFloat(r.itens_qtd), 0);
      const iden = rows.filter(r => r.cpf_cnpj_dest && r.cpf_cnpj_dest.trim() !== "").length;
      
      const label = periodView === 'monthly' 
        ? format(parseISO(rows[0].dhEmi), "MMMM yyyy", { locale: ptBR }).toUpperCase()
        : format(parseISO(rows[0].dhEmi), "dd/MM (eee)", { locale: ptBR }).toUpperCase();

      return {
        key,
        label,
        venda: venta,
        cupons,
        itens,
        tkm: cupons > 0 ? venta / cupons : 0,
        pa: cupons > 0 ? itens / cupons : 0,
        ident: cupons > 0 ? (iden / cupons) * 100 : 0
      };
    }).sort((a, b) => {
      // Sort by date key
      if (periodView === 'monthly') {
        const [ma, ya] = a.key.split('/').map(Number);
        const [mb, yb] = b.key.split('/').map(Number);
        return (ya * 12 + ma) - (yb * 12 + mb);
      } else {
        const [da, ma, ya] = a.key.split('/').map(Number);
        const [db, mb, yb] = b.key.split('/').map(Number);
        return new Date(ya, ma-1, da).getTime() - new Date(yb, mb-1, db).getTime();
      }
    }).map((p, i, arr) => {
      // Add trend comparison with previous month/day
      if (i === 0) return { ...p, trend: 0 };
      const prev = arr[i - 1];
      const trend = prev.venda > 0 ? ((p.venda - prev.venda) / prev.venda) * 100 : 0;
      return { ...p, trend };
    });
  }, [filteredData, periodView]);

  const navItems = [
    { id: "executivo", label: "Resumo Executivo", icon: Sparkles, category: "Resultados", color: "text-orange-500 font-black" },
    { id: "semanal", label: "Análise Semanal (Expurgo)", icon: CalendarIcon, category: "Resultados", color: "text-blue-500 font-black" },
    { id: "gap_analise", label: "Laboratório de Produtividade", icon: Activity, category: "Resultados", color: "text-rose-500 font-black" },

    { id: "impacto", label: "Projeção de Impacto", icon: Target, category: "Resultados", color: "text-purple-500 font-bold" },
    { id: "performance", label: "Performance", icon: ClipboardList, category: "Resultados", color: "text-emerald-600 font-black" },
    { id: "diario", label: "Performance Diária", icon: CalendarIcon, category: "Resultados" },

    { id: "raio_x_colaborador", label: "Raio-X do Colaborador", icon: UserCheck, category: "Pessoas", color: "text-indigo-600 font-black" },
    { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, category: "Pessoas", color: "text-emerald-500" },
    { id: "colab_ranking_prod", label: "Ranking por Produto", icon: Trophy, category: "Pessoas", color: "text-violet-600 font-black" },

    { id: "item_ranking", label: "Ranking de Itens", icon: ShoppingCart, category: "Produtos", color: "text-orange-600 font-black" },
    { id: "unmissable_offers", label: "Ofertas Imperdíveis", icon: Flame, category: "Produtos", color: "text-rose-600 font-black" },
    { id: "market_basket", label: "Matriz de Afinidade", icon: Boxes, category: "Produtos", color: "text-indigo-600 font-black" },
    { id: "venda_sugestiva", label: "Venda Sugestiva (SLP)", icon: ShoppingBag, category: "Produtos", color: "text-orange-600 font-black" },
    { id: "acao_social", label: "Ação Social & Sacolas", icon: Heart, category: "Produtos", color: "text-rose-500 font-black" },
    { id: "price_profile", label: "Perfil de Preço", icon: DollarSign, category: "Produtos", color: "text-rose-600 font-black" },

    { id: "copa", label: "Análise Copa (Figurinhas)", icon: Trophy, category: "Produtos", color: "text-amber-500 font-black" },
    { id: "aging_campaign", label: "Campanha Aging", icon: Timer, category: "Produtos", color: "text-rose-600 font-black" },

    { id: "customer_loyalty", label: "Fidelidade & Recorrência", icon: Users2, category: "Clientes", color: "text-emerald-600 font-black" },
    { id: "ritmo_operacional", label: "Ritmo de Atendimento", icon: Timer, category: "Operacional" },
    { id: "heatmap", label: "Mapa de Calor", icon: Flame, category: "Operacional", color: "text-orange-500 font-black" },
    { id: "desempenho_turno", label: "Desempenho por Turno", icon: Timer, category: "Operacional", color: "text-indigo-600 font-black" },

    { id: "pickup_dashboard", label: "Dashboard Pickup", icon: Zap, category: "Operacional", color: "text-emerald-600 font-black" },
    { id: "pickup_track", label: "Monitor Pickup", icon: Smartphone, category: "Operacional", color: "text-sky-600 font-black" },
    { id: "delivery_track", label: "Monitor Delivery", icon: Truck, category: "Operacional", color: "text-rose-600 font-black" },
    { id: "transacoes", label: "Transações", icon: ListFilter, category: "Operacional" },
    { id: "payment_map", label: "Mapa de Pagamentos", icon: CreditCard, category: "Operacional" },
    { id: "cash_reconcile", label: "Conciliação de Dinheiro", icon: Calculator, category: "Operacional", color: "text-emerald-600 font-black" },

    { id: "auditoria", label: "Auditoria de Descontos", icon: Percent, category: "Auditoria" },
    { id: "trocas", label: "Trocas", icon: ArrowRightLeft, category: "Auditoria" },
    { id: "pa", label: "Análise de PA", icon: Hash, category: "Auditoria" },
    { id: "coupon_analysis", label: "Análise de Cupons", icon: Layers, category: "Auditoria", color: "text-rose-500 font-black" },





    { id: "consecutive_cupons", label: "Vendas Divididas (Fragmentadas)", icon: Layers, category: "Auditoria", color: "text-rose-600 font-black" },
  ];

  const renderActiveTab = () => {
    switch(activeTab) {
      case "executivo": return <ExecutiveSummary data={filteredData} vinculos={filteredVinculos} onSwitchTab={handleTabChange} />;
      case "gap_analise": return <GapAnalysis data={filteredData} />;
      case "impacto": return <ImpactProjection data={filteredData} />;
      case "heatmap": return <HeatmapAnalysis data={filteredData} vinculos={filteredVinculos} />;
      case "energy": return <SalesEnergy data={filteredData} />;
      case "basket": return null;
      case "product_risk": return <ProductRisk data={filteredData} />;
      case "performance": return <ConsolidatedReport data={filteredData} vinculos={filteredVinculos} />;
      case "diario": return <DailyPerformance data={filteredData} />;
      case "composicao": return null;
      case "conversao": return <ConversionAudit data={filteredData} />;
      case "auditoria": return <DiscountAudit data={filteredData} />;
      case "trocas": return <ExchangeManagement data={filteredData} vinculos={filteredVinculos} />;
      case "transacoes": return <TransactionList data={filteredData} />;
      case "pickup_dashboard": return <PickupDashboard data={filteredData} />;
      case "pickup_track": return <PickupPanel data={filteredData} />;
      case "delivery_track": return <DeliveryPanel data={filteredData} />;
      case "raio_x_colaborador": return <CollaboratorXRay data={filteredData} vinculos={filteredVinculos} />;
      case "whatsapp": return <WhatsappReports data={filteredData} vinculos={filteredVinculos} />;
      case "elasticidade": return <ElasticityAnalysis data={filteredData} />;
      case "deep_dive": return null;
      case "qualidade_avancada": return <QualityAnalysis data={filteredData} vinculos={filteredVinculos} />;
      case "ritmo_operacional": return <OperationalRhythm data={filteredData} />;
      case "desempenho_turno": return <ShiftPerformance data={filteredData} />;
      case "produtividade_diag": return <ProductivityDiagnostic data={filteredData} />;
      case "payment_map": return <PaymentMap data={filteredData} />;
      case "cash_reconcile": return <CashReconciliation data={filteredData} />;
      case "customer_loyalty": return <CustomerLoyalty data={filteredData} vinculos={filteredVinculos} />;
      case "price_profile": return <PriceProfile data={filteredData} />;
      case "item_ranking": return <ItemRanking data={filteredData} />;
      case "unmissable_offers": return <UnmissableOffersAnalysis data={filteredData} />;
      case "pacing": return null;
      case "market_basket": return <MatrizAfinidade data={filteredData} />;
      case "sangria": return <RiscoTrocas data={filteredData} />;
      case "what_if": return null;
      case "geodesic": return <GeographicAnalysis data={filteredData} />;
      case "oportunidades": return <LostOpportunities data={filteredData} vinculos={filteredVinculos} />;
      case "pa": return <AdditionalItemsAnalysis data={filteredData} />;
      case "acao_social": return <SocialActionPanel data={filteredData} />;
      case "coupon_analysis": return <CouponAnalysis data={filteredData} />;
      case "venda_sugestiva": return <AdditionalItemsAnalysis data={filteredData} />;
      case "colab_ranking_prod": return <CollaboratorProductRanking data={filteredData} />;
      case "sunday_analise": return <SundayAnalysis data={filteredData} />;
      case "consecutive_cupons": return <ConsecutiveCouponAnalysis data={filteredData} />;
      case "copa": return <CopaAnalysis data={filteredData} />;
      case "aging_campaign": return <AgingCampaignAnalysis data={filteredData} />;
      case "gamification": return null;
      case "feedback": return null;
      case "semanal": return <WeeklyAnalysis data={filteredData} />;
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
      <Sidebar className="border-r border-slate-200/80 bg-white/60 backdrop-blur-xl print:hidden" collapsible="none">
        <SidebarContent className="p-2.5 md:p-3">
          {["Resultados", "Pessoas", "Produtos", "Clientes", "Auditoria", "Operacional"].map((cat) => (
            <SidebarGroup key={cat} className="mb-2">
              <SidebarGroupLabel className="text-[10px] font-headline font-bold uppercase text-slate-500 tracking-wider mb-1 px-2.5 group-data-[collapsible=icon]:hidden flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                {cat}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {navItems
                    .filter((item) => item.category === cat)
                    .map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton 
                          isActive={activeTab === item.id} 
                          onClick={() => handleTabChange(item.id)}
                          tooltip={item.label}
                          className={cn(
                            "rounded-xl py-2 px-3 transition-all duration-200 h-auto text-xs",
                            activeTab === item.id 
                              ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-200 font-bold" 
                              : "hover:bg-slate-100/80 text-slate-700 font-medium"
                          )}
                        >
                          <item.icon className={cn("w-4 h-4 shrink-0 group-data-[collapsible=icon]:mr-0 mr-2.5", activeTab === item.id ? "text-white" : (item.color || "text-slate-400"))} />
                          <span className="tracking-tight group-data-[collapsible=icon]:hidden truncate">{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <div className="mt-auto p-3.5 border-t border-slate-200/80 group-data-[collapsible=icon]:hidden">
          <div className="flex flex-col gap-0.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Versão Ativa</p>
            <p className="text-xs font-semibold text-slate-600">v2.0 • Ri Happy Analytics</p>
          </div>
        </div>
      </Sidebar>

      <div className={cn(
        "flex-1 overflow-y-auto bg-slate-50 p-3 md:p-5 flex flex-col gap-4 scrollbar-hide print:p-0 print:bg-white transition-all duration-300",
        isCollapsed ? "text-mode-large" : ""
      )}>
        
        
        {/* Equipe Portal to Header */}
        {mounted && document.getElementById("header-actions") ? createPortal(
          <div className="flex items-center gap-2">
             <Popover>
               <PopoverTrigger asChild>
                 <Button variant="outline" size="sm" className={cn("rounded-xl border-slate-200 text-slate-500 font-bold text-[10px] uppercase gap-2", !dateRange && "text-muted-foreground")}>
                   <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" />
                   {dateRange?.from ? (
                     dateRange.to ? (
                       <>
                         {format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}
                       </>
                     ) : (
                       format(dateRange.from, "dd/MM/yy")
                     )
                   ) : (
                     <span>Filtrar Período</span>
                   )}
                 </Button>
               </PopoverTrigger>
               <PopoverContent className="w-auto p-0" align="end">
                 <CalendarUI
                   initialFocus
                   mode="range"
                   defaultMonth={dateRange?.from}
                   selected={dateRange}
                   onSelect={setDateRange}
                   numberOfMonths={2}
                 />
                 <div className="p-3 border-t flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)} className="text-[10px] uppercase font-bold text-slate-500">
                      Limpar Filtro
                    </Button>
                 </div>
               </PopoverContent>
             </Popover>

             <Sheet>
               <SheetTrigger asChild>
                 <Button variant="outline" size="sm" className="rounded-xl border-slate-200 text-slate-500 font-bold text-[10px] uppercase gap-2">
                    <Users2 className="w-3.5 h-3.5 text-indigo-500" />
                    Equipe ({allCollaborators.length - hiddenCollaborators.length}/{allCollaborators.length})
                 </Button>
               </SheetTrigger>
               <SheetContent className="w-full sm:max-w-md bg-white">
                 <SheetHeader>
                   <SheetTitle className="text-xl font-black uppercase tracking-tight">Gerenciar Equipe</SheetTitle>
                   <SheetDescription className="text-xs font-medium text-slate-500">
                     Desmarque os colaboradores que deseja ocultar de todas as análises (ex: férias ou desligados).
                   </SheetDescription>
                 </SheetHeader>
                 <div className="mt-8 space-y-4">
                    <div className="flex items-center justify-between pb-4 border-b">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-[9px] font-black uppercase"
                        onClick={() => {
                          setHiddenCollaborators([]);
                          localStorage.setItem("hiddenCollaborators", JSON.stringify([]));
                        }}
                      >
                        Ativar Todos
                      </Button>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-2">
                      {allCollaborators.map(name => (
                        <div key={name} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                          <Label htmlFor={`colab-${name}`} className="flex-1 font-bold text-xs uppercase cursor-pointer py-1">
                            {name}
                          </Label>
                          <Checkbox 
                            id={`colab-${name}`}
                            checked={!hiddenCollaborators.includes(name)}
                            onCheckedChange={() => toggleCollaborator(name)}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 border-t italic text-[10px] text-slate-400">
                      * Ocultar um colaborador remove suas vendas do faturamento total e das médias do grupo.
                    </div>
                 </div>
               </SheetContent>
             </Sheet>
          </div>,
          document.getElementById("header-actions")!
        ) : null}
  

        <div className="flex-1 min-h-0 relative">
          <AnimatePresence mode="popLayout">
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, scale: 0.98, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="h-full"
            >
              {renderActiveTab()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function QuickMetric({ label, value, color, large, description }: any) {
  return (
    <div className="space-y-2 text-center flex flex-col items-center justify-center">
      <div className="flex items-center gap-1.5 mb-1">
        <p className={cn("font-bold text-slate-400 uppercase tracking-widest leading-none", large ? "text-[12px]" : "text-[10px]")}>
          {label}
        </p>
        {description && (
          <AnalysisHelp 
            title={label} 
            description={description} 
            className="text-slate-300 hover:text-slate-500" 
            iconClassName="w-3 h-3"
          />
        )}
      </div>
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
    <motion.div 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      className={cn(
        "flex flex-col items-center justify-center p-3 md:p-4 rounded-xl cursor-pointer transition-all border gap-2 h-full select-none text-center",
        active ? "bg-white border-indigo-200 shadow-sm scale-[1.02]" : "bg-slate-50 border-transparent opacity-60 hover:opacity-100 hover:bg-white hover:border-slate-200"
      )}
    >
      <Icon className={cn("w-5 h-5", active ? color : "text-slate-400")} />
      <span className={cn("text-xs font-bold uppercase text-center leading-none", active ? "text-slate-800" : "text-slate-400")}>{label}</span>
    </motion.div>
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
    <Card className={cn("ri-card border overflow-hidden bg-white shadow-sm flex flex-col h-full", color)}>
      <div className="p-3 bg-slate-50 border-b border-slate-100 flex flex-col items-center justify-center text-center gap-1">
        <h4 className={cn("font-bold uppercase tracking-widest text-slate-600 leading-none", large ? "text-[11px]" : "text-[10px]")}>{title}</h4>
        <p className={cn("font-black text-slate-800 leading-none", large ? "text-xl" : "text-lg")}>{formatCurrency(metrics.venda, true)}</p>
      </div>
      <CardContent className="p-4 grid grid-cols-2 gap-3 text-center items-center justify-center flex-1">
        <div className="space-y-1">
          <p className={cn("font-bold text-slate-400 uppercase leading-none", large ? "text-[10px]" : "text-[9px]")}>TKM</p>
          <p className={cn("font-bold text-indigo-600 leading-none", large ? "text-base" : "text-sm")}>{formatCurrency(metrics.tkm, true)}</p>
        </div>
        <div className="space-y-1">
          <p className={cn("font-bold text-slate-400 uppercase leading-none", large ? "text-[10px]" : "text-[9px]")}>P.A.</p>
          <p className={cn("font-bold text-sky-600 leading-none", large ? "text-base" : "text-sm")}>{metrics.pa.toFixed(2)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
