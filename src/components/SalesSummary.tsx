
"use client";

import React, { useMemo, useState } from "react";
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
  Sparkles
} from "lucide-react";
import { format, parseISO, min, max } from "date-fns";
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
import { DeliveryPanel } from "./DeliveryPanel";
import { GapAnalysis } from "./GapAnalysis";
import { CouponAnalysis } from "./CouponAnalysis";
import { CollaboratorProductRanking } from "./CollaboratorProductRanking";
import { EasterPanel } from "./EasterPanel";
import { Calculator, Map, Egg as EggIcon } from "lucide-react";

interface SalesSummaryProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
  onLogout?: () => void;
}

export function SalesSummary({ data = [], vinculos = [] }: SalesSummaryProps) {
  const [activeTab, setActiveTab] = useState("executivo");
  const { setOpenMobile, state } = useSidebar();
  const isCollapsed = state === "collapsed";

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
    const saidas = data.filter(r => r.tpNF === 1 && !r.is_cancelada);
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
  }, [data]);

  const toggleChannel = (channel: keyof typeof selectedChannels) => {
    setSelectedChannels(prev => ({ ...prev, [channel]: !prev[channel] }));
  };

  const metricsByChannel = useMemo(() => {
    const saidas = data.filter(r => r.tpNF === 1 && !r.is_devolucao && !r.is_cancelada);
    
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

    const vTroca = vinculos.reduce((acc, v) => acc + v.valor_diferenca, 0);
    const cTroca = vinculos.length;
    const iTroca = vinculos.reduce((acc, v) => acc + v.diferenca_itens, 0);
    const identifiedTroca = vinculos.filter(v => v.cpf_cliente).length;

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

    const saidas = data.filter(r => r.tpNF === 1 && !r.is_cancelada);
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
  }, [data, periodView]);

  const navItems = [
    { id: "executivo", label: "Resumo Executivo", icon: Sparkles, category: "Resultados", color: "text-orange-500 font-black" },
    { id: "gap_analise", label: "GAP de Produtividade", icon: Activity, category: "Resultados", color: "text-rose-500 font-black" },
    { id: "geral", label: "Visão Geral", icon: LayoutDashboard, category: "Resultados" },
    { id: "impacto", label: "Projeção de Impacto", icon: Target, category: "Resultados", color: "text-purple-500 font-bold" },
    { id: "performance", label: "Performance", icon: ClipboardList, category: "Resultados", color: "text-emerald-600 font-black" },
    { id: "diario", label: "Performance Diária", icon: CalendarIcon, category: "Resultados" },

    { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, category: "Pessoas", color: "text-emerald-500" },
    { id: "colab_ranking_prod", label: "Ranking por Produto", icon: Trophy, category: "Pessoas", color: "text-violet-600 font-black" },

    { id: "item_ranking", label: "Ranking de Itens", icon: ShoppingCart, category: "Produtos", color: "text-orange-600 font-black" },
    { id: "market_basket", label: "Matriz de Afinidade", icon: Boxes, category: "Produtos", color: "text-indigo-600 font-black" },
    { id: "venda_sugestiva", label: "SLP & Social", icon: ShoppingBag, category: "Produtos", color: "text-orange-600 font-black" },
    { id: "pascoa", label: "Kits de Páscoa", icon: EggIcon, category: "Produtos", color: "text-orange-500 font-black" },
    { id: "price_profile", label: "Perfil de Preço", icon: DollarSign, category: "Produtos", color: "text-rose-600 font-black" },
    { id: "elasticidade", label: "Elasticidade Desconto", icon: LineChart, category: "Produtos", color: "text-amber-600" },

    { id: "customer_loyalty", label: "Fidelidade & Recorrência", icon: Users2, category: "Clientes", color: "text-emerald-600 font-black" },
    { id: "ritmo_operacional", label: "Ritmo Operacional", icon: Timer, category: "Operacional" },
    { id: "pickup_track", label: "Monitor Pickup", icon: Smartphone, category: "Operacional", color: "text-sky-600 font-black" },
    { id: "delivery_track", label: "Monitor Delivery", icon: Truck, category: "Operacional", color: "text-rose-600 font-black" },
    { id: "transacoes", label: "Transações", icon: ListFilter, category: "Operacional" },
    { id: "payment_map", label: "Mapa de Pagamentos", icon: CreditCard, category: "Operacional" },
    { id: "qualidade_avancada", label: "Qualidade da Venda", icon: Target, category: "Operacional" },
    { id: "radar", label: "Radar de Alertas", icon: ShieldAlert, category: "Auditoria" },
    { id: "auditoria", label: "Auditoria de Descontos", icon: Percent, category: "Auditoria" },
    { id: "trocas", label: "Trocas", icon: ArrowRightLeft, category: "Auditoria" },
    { id: "pa", label: "Análise de PA", icon: Hash, category: "Auditoria" },
    { id: "coupon_analysis", label: "Análise de Cupons", icon: Layers, category: "Auditoria", color: "text-rose-500 font-black" },
    { id: "conversao", label: "Auditoria de Conversão", icon: Scale, category: "Auditoria" },
    { id: "oportunidades", label: "Oportunidades", icon: Lightbulb, category: "Auditoria" },
    { id: "sangria", label: "Risco de Trocas", icon: AlertTriangle, category: "Auditoria" },
    { id: "geodesic", label: "Análise Geográfica", icon: Map, category: "Clientes" },
  ];

  const renderActiveTab = () => {
    switch(activeTab) {
      case "executivo": return <ExecutiveSummary data={data} vinculos={vinculos} onSwitchTab={handleTabChange} />;
      case "gap_analise": return <GapAnalysis data={data} />;
      case "geral":
        return (
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-6 md:space-y-8"
          >
            <motion.div variants={childItem} className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 bg-white p-3 md:p-4 rounded-2xl border border-slate-200 shadow-sm">
              <ChannelSelector label="Loja Física" icon={Store} active={selectedChannels.fisica} color="text-slate-600" onToggle={() => toggleChannel('fisica')} />
              <ChannelSelector label="Pickup" icon={Smartphone} active={selectedChannels.online} color="text-sky-500" onToggle={() => toggleChannel('online')} />
              <ChannelSelector label="Adicional" icon={Zap} active={selectedChannels.adicional} color="text-emerald-500" onToggle={() => toggleChannel('adicional')} />
              <ChannelSelector label="Delivery" icon={Truck} active={selectedChannels.delivery} color="text-rose-500" onToggle={() => toggleChannel('delivery')} />
              <ChannelSelector label="Trocas" icon={ArrowRightLeft} active={selectedChannels.troca} color="text-purple-500" onToggle={() => toggleChannel('troca')} />
            </motion.div>

            <motion.div variants={childItem} className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-fit">
              <Button 
                variant={periodView === 'consolidated' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setPeriodView('consolidated')}
                className="rounded-xl text-[10px] font-black uppercase h-8"
              >
                Consolidado
              </Button>
              <Button 
                variant={periodView === 'monthly' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setPeriodView('monthly')}
                className="rounded-xl text-[10px] font-black uppercase h-8"
              >
                Por Mês
              </Button>
              <Button 
                variant={periodView === 'daily' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setPeriodView('daily')}
                className="rounded-xl text-[10px] font-black uppercase h-8"
              >
                Por Dia
              </Button>
            </motion.div>

            {periodView === 'consolidated' ? (
              <motion.div variants={childItem}>
                <Card className="ri-card border-slate-200 border overflow-hidden shadow-sm">
                  <div className="p-3 md:p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-tight">Consolidado do Período</h3>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-[10px] font-bold text-slate-600">{consolidado.cadastros.toFixed(1)}% IDENT.</span>
                    </div>
                  </div>
                  <CardContent className="p-4 md:p-5 space-y-6 flex flex-col items-center justify-center text-center">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">Faturamento Total</p>
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
                      <QuickMetric label="Ticket Médio" value={formatCurrency(consolidado.tkm, true)} color="text-indigo-600" large={isCollapsed} />
                      <QuickMetric label="P.A. Geral" value={consolidado.pa.toFixed(2)} color="text-sky-600" large={isCollapsed} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div variants={childItem} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {periodBreakdown?.map((p) => (
                  <Card key={p.key} className="ri-card border-slate-200 border overflow-hidden shadow-sm bg-white">
                    <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{p.label}</h3>
                      <div className="flex items-center gap-2">
                        {p.trend !== 0 && (
                          <div className={cn(
                            "flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full",
                            p.trend > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                          )}>
                            {p.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                            {Math.abs(p.trend).toFixed(1)}%
                          </div>
                        )}
                        <Badge className="bg-white border-slate-200 text-slate-600 border text-[8px]">{p.ident.toFixed(0)}% CPF</Badge>
                      </div>
                    </div>
                    <CardContent className="p-4 space-y-4">
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Faturamento</p>
                        <p className="text-xl font-black text-slate-800">{formatCurrency(p.venda)}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 border-t pt-3">
                        <div className="text-center">
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Tickets</p>
                          <p className="text-xs font-black text-slate-700">{p.cupons}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[8px] font-bold text-slate-400 uppercase">P.A.</p>
                          <p className="text-xs font-black text-sky-600">{p.pa.toFixed(2)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[8px] font-bold text-slate-400 uppercase">TKM</p>
                          <p className="text-xs font-black text-indigo-600">{formatCurrency(p.tkm, true)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            )}

            <motion.div variants={childItem} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FixedChannelCard title="Físico" icon={Store} metrics={metricsByChannel.fisica} color="border-slate-200" large={isCollapsed} />
              <FixedChannelCard title="Pickup" icon={Smartphone} metrics={metricsByChannel.online} color="border-sky-200" large={isCollapsed} />
              <FixedChannelCard title="Adicional" icon={Zap} metrics={metricsByChannel.adicional} color="border-emerald-200" large={isCollapsed} />
              <FixedChannelCard title="Delivery" icon={Truck} metrics={metricsByChannel.delivery} color="border-rose-200" large={isCollapsed} />
              <FixedChannelCard title="Trocas" icon={ArrowRightLeft} metrics={metricsByChannel.troca} color="border-purple-200" large={isCollapsed} />
            </motion.div>
          </motion.div>
        );
      case "impacto": return <ImpactProjection data={data} />;
      case "heatmap": return <HeatmapAnalysis data={data} vinculos={vinculos} />;
      case "energy": return <SalesEnergy data={data} />;
      case "basket": return null;
      case "product_risk": return <ProductRisk data={data} />;
      case "performance": return <ConsolidatedReport data={data} vinculos={vinculos} />;
      case "diario": return <DailyPerformance data={data} />;
      case "composicao": return null;
      case "radar": return <RiskRadar data={data} />;
      case "conversao": return <ConversionAudit data={data} />;
      case "auditoria": return <DiscountAudit data={data} />;
      case "trocas": return <ExchangeManagement data={data} vinculos={vinculos} />;
      case "transacoes": return <TransactionList data={data} />;
      case "pickup_track": return <PickupPanel data={data} />;
      case "delivery_track": return <DeliveryPanel data={data} />;
      case "whatsapp": return <WhatsappReports data={data} vinculos={vinculos} />;
      case "elasticidade": return <ElasticityAnalysis data={data} />;
      case "deep_dive": return null;
      case "qualidade_avancada": return <QualityAnalysis data={data} vinculos={vinculos} />;
      case "ritmo_operacional": return <OperationalRhythm data={data} />;
      case "payment_map": return <PaymentMap data={data} />;
      case "customer_loyalty": return <CustomerLoyalty data={data} vinculos={vinculos} />;
      case "price_profile": return <PriceProfile data={data} />;
      case "item_ranking": return <ItemRanking data={data} />;
      case "pacing": return null;
      case "market_basket": return <MatrizAfinidade data={data} />;
      case "sangria": return <RiscoTrocas data={data} />;
      case "what_if": return null;
      case "geodesic": return <GeographicAnalysis data={data} />;
      case "oportunidades": return <LostOpportunities data={data} vinculos={vinculos} />;
      case "pa": return <AdditionalItemsAnalysis data={data} />;
      case "pascoa": return <EasterPanel data={data} />;
      case "coupon_analysis": return <CouponAnalysis data={data} />;
      case "venda_sugestiva": return <AdditionalItemsAnalysis data={data} />;
      case "colab_ranking_prod": return <CollaboratorProductRanking data={data} />;
      case "gamification": return null;
      case "feedback": return null;
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
      <Sidebar className="border-r border-slate-200 bg-slate-50 print:hidden" collapsible="icon">
        <SidebarContent className="p-3 md:p-4">
          {["Resultados", "Pessoas", "Produtos", "Clientes", "Auditoria", "Operacional"].map((cat) => (
            <SidebarGroup key={cat} className="mb-4">
              <SidebarGroupLabel className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] mb-3 px-2 group-data-[collapsible=icon]:hidden flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/20" />
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
                            "rounded-xl py-4 px-3 transition-all duration-200 h-auto",
                            activeTab === item.id 
                              ? "bg-white text-indigo-700 shadow-sm border border-slate-200 font-bold" 
                              : "hover:bg-white text-slate-600 font-medium border border-transparent"
                          )}
                        >
                          <item.icon className={cn("w-4 h-4 mr-2.5 shrink-0", activeTab !== item.id && (item.color || "text-slate-400"))} />
                          <span className="text-[13px] tracking-tight group-data-[collapsible=icon]:hidden truncate">{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <div className="mt-auto p-4 border-t border-slate-200 group-data-[collapsible=icon]:hidden">
          <div className="flex flex-col gap-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Versão Atual</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase">09/03/2026 • 21:03</p>
          </div>
        </div>
      </Sidebar>

      <div className={cn(
        "flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6 flex flex-col gap-6 scrollbar-hide print:p-0 print:bg-white transition-all duration-300",
        isCollapsed ? "text-mode-large" : ""
      )}>
        {/* Dashboard Header with Period Info */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0 px-2 lg:px-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="bg-indigo-50/50 text-indigo-600 border-indigo-100 font-bold text-[10px] uppercase tracking-widest px-2 py-0">
                {analysisPeriod}
              </Badge>
              <div className="w-1 h-1 bg-slate-300 rounded-full" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {data.length} Transações Detectadas
              </span>
            </div>
            <h1 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3 truncate">
              Análise Estratégica
            </h1>
          </div>
          
          <div className="flex items-center gap-2 print:hidden">
             <SidebarTrigger className="md:hidden" />
             <Button variant="outline" size="sm" onClick={() => window.print()} className="rounded-xl border-slate-200 text-slate-500 font-bold text-[10px] uppercase gap-2">
                <FileText className="w-3.5 h-3.5" />
                Exportar PDF
             </Button>
          </div>
        </div>

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
