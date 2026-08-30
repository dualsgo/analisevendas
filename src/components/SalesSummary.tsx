
"use client";

import React, { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  Settings2,
  Calculator,
  Map,
  Heart,
  Brain,
  HelpCircle,
  Search,
  CheckCircle2,
  Loader2,
  BarChart3,
  PieChart,
  Compass
} from "lucide-react";
import { format, parseISO, min, max, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
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
import { Input } from "@/components/ui/input";
import { AnalysisHelp } from "./AnalysisHelp";

// Loading Skeleton para Dynamic Imports
function PanelLoading() {
  return (
    <div className="w-full h-96 flex flex-col items-center justify-center gap-3 text-indigo-600">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Carregando painel analítico...</span>
    </div>
  );
}

// Dynamic Imports dos Painéis Ativos (Code-Splitting)
const ExecutiveSummary = dynamic(() => import("./ExecutiveSummary").then(m => m.ExecutiveSummary), { loading: () => <PanelLoading /> });
const GapAnalysis = dynamic(() => import("./GapAnalysis").then(m => m.GapAnalysis), { loading: () => <PanelLoading /> });
const SimuladorCenarios = dynamic(() => import("./SimuladorCenarios").then(m => m.SimuladorCenarios), { loading: () => <PanelLoading /> });
const ConsolidatedReport = dynamic(() => import("./ConsolidatedReport").then(m => m.ConsolidatedReport), { loading: () => <PanelLoading /> });
const DailyPerformance = dynamic(() => import("./DailyPerformance").then(m => m.DailyPerformance), { loading: () => <PanelLoading /> });
const WeeklyAnalysis = dynamic(() => import("./WeeklyAnalysis").then(m => m.WeeklyAnalysis), { loading: () => <PanelLoading /> });
const BasketQualityAnalysis = dynamic(() => import("./BasketQualityAnalysis").then(m => m.BasketQualityAnalysis), { loading: () => <PanelLoading /> });
const ConversionAudit = dynamic(() => import("./ConversionAudit").then(m => m.ConversionAudit), { loading: () => <PanelLoading /> });

const CollaboratorXRay = dynamic(() => import("./CollaboratorXRay").then(m => m.CollaboratorXRay), { loading: () => <PanelLoading /> });
const WeightedPerformanceReport = dynamic(() => import("./WeightedPerformanceReport").then(m => m.WeightedPerformanceReport), { loading: () => <PanelLoading /> });
const CollaboratorProductRanking = dynamic(() => import("./CollaboratorProductRanking").then(m => m.CollaboratorProductRanking), { loading: () => <PanelLoading /> });
const WhatsappReports = dynamic(() => import("./WhatsappReports").then(m => m.WhatsappReports), { loading: () => <PanelLoading /> });

const ItemRanking = dynamic(() => import("./ItemRanking").then(m => m.ItemRanking), { loading: () => <PanelLoading /> });
const ProductCouponAnalysis = dynamic(() => import("./ProductCouponAnalysis").then(m => m.ProductCouponAnalysis), { loading: () => <PanelLoading /> });
const UnmissableOffersAnalysis = dynamic(() => import("./UnmissableOffersAnalysis").then(m => m.UnmissableOffersAnalysis), { loading: () => <PanelLoading /> });
const AdditionalItemsAnalysis = dynamic(() => import("./AdditionalItemsAnalysis").then(m => m.AdditionalItemsAnalysis), { loading: () => <PanelLoading /> });
const SocialActionPanel = dynamic(() => import("./SocialActionPanel").then(m => m.SocialActionPanel), { loading: () => <PanelLoading /> });
const PriceProfile = dynamic(() => import("./PriceProfile").then(m => m.PriceProfile), { loading: () => <PanelLoading /> });
const CopaAnalysis = dynamic(() => import("./CopaAnalysis").then(m => m.CopaAnalysis), { loading: () => <PanelLoading /> });
const AgingCampaignAnalysis = dynamic(() => import("./AgingCampaignAnalysis").then(m => m.AgingCampaignAnalysis), { loading: () => <PanelLoading /> });
const LostOpportunities = dynamic(() => import("./LostOpportunities").then(m => m.LostOpportunities), { loading: () => <PanelLoading /> });

const CustomerLoyalty = dynamic(() => import("./CustomerLoyalty").then(m => m.CustomerLoyalty), { loading: () => <PanelLoading /> });

const RealtimeImpactPanel = dynamic(() => import("./RealtimeImpactPanel").then(m => m.RealtimeImpactPanel), { loading: () => <PanelLoading /> });
const OperationalRhythm = dynamic(() => import("./OperationalRhythm").then(m => m.OperationalRhythm), { loading: () => <PanelLoading /> });
const HeatmapAnalysis = dynamic(() => import("./HeatmapAnalysis").then(m => m.HeatmapAnalysis), { loading: () => <PanelLoading /> });
const ShiftPerformance = dynamic(() => import("./ShiftPerformance").then(m => m.ShiftPerformance), { loading: () => <PanelLoading /> });
const PickupDashboard = dynamic(() => import("./PickupDashboard").then(m => m.PickupDashboard), { loading: () => <PanelLoading /> });
const PickupPanel = dynamic(() => import("./PickupPanel").then(m => m.PickupPanel), { loading: () => <PanelLoading /> });
const DeliveryPanel = dynamic(() => import("./DeliveryPanel").then(m => m.DeliveryPanel), { loading: () => <PanelLoading /> });
const TransactionList = dynamic(() => import("./TransactionList").then(m => m.TransactionList), { loading: () => <PanelLoading /> });
const PaymentMap = dynamic(() => import("./PaymentMap").then(m => m.PaymentMap), { loading: () => <PanelLoading /> });
const CashReconciliation = dynamic(() => import("./CashReconciliation").then(m => m.CashReconciliation), { loading: () => <PanelLoading /> });

const DiscountAudit = dynamic(() => import("./DiscountAudit").then(m => m.DiscountAudit), { loading: () => <PanelLoading /> });
const ExchangeManagement = dynamic(() => import("./ExchangeManagement").then(m => m.ExchangeManagement), { loading: () => <PanelLoading /> });
const CouponAnalysis = dynamic(() => import("./CouponAnalysis").then(m => m.CouponAnalysis), { loading: () => <PanelLoading /> });
const ConsecutiveCouponAnalysis = dynamic(() => import("./ConsecutiveCouponAnalysis").then(m => m.ConsecutiveCouponAnalysis), { loading: () => <PanelLoading /> });

interface SalesSummaryProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
  onLogout?: () => void;
}

export function SalesSummary({ data = [], vinculos = [] }: SalesSummaryProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [activeTab, setActiveTab] = useState("executivo");
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const { setOpenMobile } = useSidebar();

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

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setOpenMobile(false);
  };

  const navItems = [
    // --- RESULTADOS & PRODUTIVIDADE ---
    { id: "executivo", label: "Resumo Executivo", icon: Sparkles, category: "Resultados", color: "text-orange-500 font-black" },
    { id: "gap_analise", label: "Laboratório de Produtividade (GAP)", icon: Activity, category: "Resultados", color: "text-rose-500 font-black" },
    { id: "simulador_cenarios", label: "Simulador de Cenários (What-If)", icon: Calculator, category: "Resultados", color: "text-emerald-600 font-black" },
    { id: "performance", label: "Performance Consolidada", icon: ClipboardList, category: "Resultados", color: "text-emerald-600 font-black" },
    { id: "diario", label: "Performance Diária", icon: CalendarIcon, category: "Resultados" },
    { id: "semanal", label: "Análise Semanal (Expurgo)", icon: CalendarIcon, category: "Resultados", color: "text-blue-500 font-black" },
    { id: "qualidade_pa", label: "PA Sustentação & Produtividade", icon: Target, category: "Resultados", color: "text-indigo-600 font-black" },
    { id: "conversao", label: "Auditoria de Conversão", icon: UserCheck, category: "Resultados", color: "text-teal-600 font-bold" },

    // --- PESSOAS & TALENTOS ---
    { id: "raio_x_colaborador", label: "Raio-X do Colaborador", icon: UserCheck, category: "Pessoas", color: "text-indigo-600 font-black" },
    { id: "weighted_performance", label: "Meta Ponderada (Por Escala)", icon: Scale, category: "Pessoas", color: "text-indigo-600 font-black" },
    { id: "colab_ranking_prod", label: "Ranking por Produto", icon: Trophy, category: "Pessoas", color: "text-violet-600 font-black" },
    { id: "whatsapp", label: "Relatórios via WhatsApp", icon: MessageCircle, category: "Pessoas", color: "text-emerald-500" },

    // --- PRODUTOS & VENDAS ---
    { id: "item_ranking", label: "Ranking de Itens (Curva ABC)", icon: ShoppingCart, category: "Produtos", color: "text-orange-600 font-black" },
    { id: "product_coupon_analysis", label: "Solo vs. Múltiplo (Por Item)", icon: Layers, category: "Produtos", color: "text-indigo-600 font-black" },
    { id: "unmissable_offers", label: "Ofertas Imperdíveis", icon: Flame, category: "Produtos", color: "text-rose-600 font-black" },
    { id: "venda_sugestiva", label: "Venda Sugestiva (SLP)", icon: ShoppingBag, category: "Produtos", color: "text-orange-600 font-black" },
    { id: "acao_social", label: "Ação Social & Sacolas", icon: Heart, category: "Produtos", color: "text-rose-500 font-black" },
    { id: "price_profile", label: "Perfil de Preço", icon: DollarSign, category: "Produtos", color: "text-rose-600 font-black" },
    { id: "copa", label: "Análise Copa (Figurinhas)", icon: Trophy, category: "Produtos", color: "text-amber-500 font-black" },
    { id: "aging_campaign", label: "Campanha Aging", icon: Timer, category: "Produtos", color: "text-rose-600 font-black" },
    { id: "oportunidades", label: "Oportunidades Perdidas", icon: Lightbulb, category: "Produtos", color: "text-amber-600 font-black" },

    // --- CLIENTES & FIDELIDADE ---
    { id: "customer_loyalty", label: "Fidelidade & Recorrência", icon: Users2, category: "Clientes", color: "text-emerald-600 font-black" },

    // --- OPERACIONAL & FLUXO ---
    { id: "realtime_impact", label: "Impacto em Tempo Real", icon: Zap, category: "Operacional", color: "text-indigo-600 font-black" },
    { id: "ritmo_operacional", label: "Ritmo de Atendimento", icon: Timer, category: "Operacional" },
    { id: "heatmap", label: "Mapa de Calor de Vendas", icon: Flame, category: "Operacional", color: "text-orange-500 font-black" },
    { id: "desempenho_turno", label: "Desempenho por Turno", icon: Timer, category: "Operacional", color: "text-indigo-600 font-black" },
    { id: "pickup_dashboard", label: "Dashboard Pickup", icon: Zap, category: "Operacional", color: "text-emerald-600 font-black" },
    { id: "pickup_track", label: "Monitor Pickup", icon: Smartphone, category: "Operacional", color: "text-sky-600 font-black" },
    { id: "delivery_track", label: "Monitor Delivery", icon: Truck, category: "Operacional", color: "text-rose-600 font-black" },
    { id: "transacoes", label: "Lista de Transações", icon: ListFilter, category: "Operacional" },
    { id: "payment_map", label: "Mapa de Pagamentos", icon: CreditCard, category: "Operacional" },
    { id: "cash_reconcile", label: "Conciliação de Caixa (Dinheiro)", icon: Calculator, category: "Operacional", color: "text-emerald-600 font-black" },

    // --- AUDITORIA, RISCO & COMPLIANCE ---
    { id: "auditoria", label: "Auditoria de Descontos", icon: Percent, category: "Auditoria" },
    { id: "trocas", label: "Gestão de Trocas", icon: ArrowRightLeft, category: "Auditoria" },
    { id: "pa", label: "Análise de PA e Complementos", icon: Hash, category: "Auditoria" },
    { id: "coupon_analysis", label: "Análise de Cupons", icon: Layers, category: "Auditoria", color: "text-rose-500 font-black" },
    { id: "consecutive_cupons", label: "Vendas Divididas (Fragmentadas)", icon: Layers, category: "Auditoria", color: "text-rose-600 font-black" },
  ];

  const activeNavItem = useMemo(() => {
    return navItems.find(item => item.id === activeTab) || navItems[0];
  }, [activeTab, navItems]);

  const renderActiveTab = () => {
    switch(activeTab) {
      // Resultados
      case "executivo": return <ExecutiveSummary data={filteredData} vinculos={filteredVinculos} onSwitchTab={handleTabChange} />;
      case "gap_analise": return <GapAnalysis data={filteredData} />;
      case "simulador_cenarios": return <SimuladorCenarios data={filteredData} />;
      case "performance": return <ConsolidatedReport data={filteredData} vinculos={filteredVinculos} />;
      case "diario": return <DailyPerformance data={filteredData} />;
      case "semanal": return <WeeklyAnalysis data={filteredData} />;
      case "qualidade_pa": return <BasketQualityAnalysis data={filteredData} />;
      case "conversao": return <ConversionAudit data={filteredData} />;

      // Pessoas
      case "raio_x_colaborador": return <CollaboratorXRay data={filteredData} vinculos={filteredVinculos} />;
      case "weighted_performance": return <WeightedPerformanceReport data={filteredData} vinculos={filteredVinculos} />;
      case "colab_ranking_prod": return <CollaboratorProductRanking data={filteredData} />;
      case "whatsapp": return <WhatsappReports data={filteredData} vinculos={filteredVinculos} />;

      // Produtos
      case "item_ranking": return <ItemRanking data={filteredData} />;
      case "product_coupon_analysis": return <ProductCouponAnalysis data={filteredData} />;
      case "unmissable_offers": return <UnmissableOffersAnalysis data={filteredData} />;
      case "venda_sugestiva": return <AdditionalItemsAnalysis data={filteredData} />;
      case "acao_social": return <SocialActionPanel data={filteredData} />;
      case "price_profile": return <PriceProfile data={filteredData} />;
      case "copa": return <CopaAnalysis data={filteredData} />;
      case "aging_campaign": return <AgingCampaignAnalysis data={filteredData} />;
      case "oportunidades": return <LostOpportunities data={filteredData} vinculos={filteredVinculos} />;

      // Clientes
      case "customer_loyalty": return <CustomerLoyalty data={filteredData} vinculos={filteredVinculos} />;

      // Operacional
      case "realtime_impact": return <RealtimeImpactPanel data={filteredData} />;
      case "ritmo_operacional": return <OperationalRhythm data={filteredData} />;
      case "heatmap": return <HeatmapAnalysis data={filteredData} vinculos={filteredVinculos} />;
      case "desempenho_turno": return <ShiftPerformance data={filteredData} />;
      case "pickup_dashboard": return <PickupDashboard data={filteredData} />;
      case "pickup_track": return <PickupPanel data={filteredData} />;
      case "delivery_track": return <DeliveryPanel data={filteredData} />;
      case "transacoes": return <TransactionList data={filteredData} />;
      case "payment_map": return <PaymentMap data={filteredData} />;
      case "cash_reconcile": return <CashReconciliation data={filteredData} />;

      // Auditoria
      case "auditoria": return <DiscountAudit data={filteredData} />;
      case "trocas": return <ExchangeManagement data={filteredData} vinculos={filteredVinculos} />;
      case "pa": return <AdditionalItemsAnalysis data={filteredData} />;
      case "coupon_analysis": return <CouponAnalysis data={filteredData} />;
      case "consecutive_cupons": return <ConsecutiveCouponAnalysis data={filteredData} />;

      default: return <ExecutiveSummary data={filteredData} vinculos={filteredVinculos} onSwitchTab={handleTabChange} />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden w-full">
      {/* Navigation Portal to Header (Top-Left Hamburger Menu) */}
      {mounted && typeof document !== "undefined" && document.getElementById("header-left-menu") ? createPortal(
        <div className="flex items-center gap-2">
          <Sheet open={isNavOpen} onOpenChange={setIsNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl h-10 px-3.5 gap-2 shadow-md uppercase text-xs">
                <Menu className="w-5 h-5 text-indigo-400" />
                <span className="hidden sm:inline">Análises ({navItems.length})</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full sm:max-w-md bg-slate-900 border-r border-slate-800 text-white p-0 flex flex-col overflow-hidden">
              <SheetHeader className="p-5 border-b border-slate-800 bg-slate-950/90 space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md shadow-indigo-500/20">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <SheetTitle className="text-lg font-black text-white uppercase tracking-tight">Análises Estratégicas</SheetTitle>
                    <SheetDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">{navItems.length} Painéis de Inteligência Ativos</SheetDescription>
                  </div>
                </div>
                {/* SEARCH INPUT IN HAMBURGER MENU */}
                <div className="relative pt-3">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-6" />
                  <Input
                    type="text"
                    placeholder="Buscar análise por nome..."
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-white text-xs pl-9 h-9 font-bold placeholder:text-slate-500 rounded-xl"
                  />
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
                {["Resultados", "Pessoas", "Produtos", "Clientes", "Operacional", "Auditoria"].map(cat => {
                  const itemsInCat = navItems.filter(item => 
                    item.category === cat && 
                    (menuSearch.trim() === "" || item.label.toLowerCase().includes(menuSearch.toLowerCase()))
                  );
                  if (itemsInCat.length === 0) return null;

                  return (
                    <div key={cat} className="space-y-1.5">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-2 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        {cat} ({itemsInCat.length})
                      </p>
                      <div className="space-y-1">
                        {itemsInCat.map(item => {
                          const isActive = activeTab === item.id;
                          const IconComp = item.icon;
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                handleTabChange(item.id);
                                setIsNavOpen(false);
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between text-xs font-bold transition-all",
                                isActive 
                                  ? "bg-indigo-600 text-white font-black shadow-md shadow-indigo-500/20" 
                                  : "hover:bg-slate-800 text-slate-300 hover:text-white"
                              )}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <IconComp className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : (item.color || "text-slate-400"))} />
                                <span className="truncate">{item.label}</span>
                              </div>
                              {isActive && <CheckCircle2 className="w-4 h-4 text-white shrink-0 ml-2" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>

          {/* ACTIVE SCREEN INDICATOR BADGE IN HEADER */}
          {activeNavItem && (
            <Badge className="bg-indigo-50 text-indigo-800 border border-indigo-200/80 font-black text-xs px-3 py-1 uppercase rounded-xl flex items-center gap-1.5 shadow-2xs">
              <activeNavItem.icon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="truncate max-w-[140px] sm:max-w-[220px] md:max-w-[300px]">{activeNavItem.label}</span>
            </Badge>
          )}
        </div>,
        document.getElementById("header-left-menu")!
      ) : null}

      <div className="flex-1 overflow-y-auto bg-slate-50 p-3 md:p-5 flex flex-col gap-4 scrollbar-hide print:p-0 print:bg-white w-full">
        
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
              transition={{ duration: 0.25, ease: "easeInOut" }}
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
