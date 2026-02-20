
"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  MessageCircle,
  Copy,
  Check,
  TrendingUp,
  Award,
  Smartphone,
  AlertTriangle,
  Zap,
  LayoutDashboard,
  Trophy,
  Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format, parseISO, min, max, isSameDay } from "date-fns";

interface WhatsappReportsProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

type ReportType = 'STORE_SUMMARY' | 'VENDOR_PERFORMANCE' | 'PICKUP_CONVERSION' | 'DAILY_CLOSING' | 'STRATEGIC';

export function WhatsappReports({ data, vinculos }: WhatsappReportsProps) {
  const [reportType, setReportType] = useState<ReportType>('STORE_SUMMARY');
  const [useEmojis, setUseEmojis] = useState(true);
  const [formatType, setFormatType] = useState<'compact' | 'detailed'>('detailed');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Cálculos de métricas
  const metrics = useMemo(() => {
    const saidas = data.filter(r => r.tpNF === 1 && !r.is_devolucao && !r.is_cancelada);
    const fisica = saidas.filter(r => r.canal === "LOJA_FISICA");
    const online = saidas.filter(r => r.canal === "RETIRADA_ONLINE");
    const adicional = saidas.filter(r => r.canal === "RETIRADA_ADICIONAL" || r.is_adicional || r.is_adicional_suspeito);
    
    // Cálculo Loja Física
    const vFisica = fisica.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
    const cFisica = fisica.length;
    const iFisica = fisica.reduce((acc, r) => acc + parseFloat(r.itens_qtd), 0);
    const idenFisica = fisica.filter(r => r.cpf_cnpj_dest && r.cpf_cnpj_dest.trim() !== "").length;

    // Cálculo Adicional
    const vAdicional = adicional.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
    const cAdicional = adicional.length;
    const iAdicional = adicional.reduce((acc, r) => acc + parseFloat(r.itens_qtd), 0);

    // Cálculo Total Consolidado (Físico + Adicional + Online)
    const vTotal = vFisica + vAdicional + online.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
    const cTotal = cFisica + cAdicional + online.length;
    const iTotal = iFisica + iAdicional + online.reduce((acc, r) => acc + parseFloat(r.itens_qtd), 0);

    // Pickup
    const convPickup = online.length > 0 ? (cAdicional / online.length) * 100 : 0;

    // Mapeamento de Pickups para Clientes
    const onlinePerCustomer = new Map<string, number>();
    online.forEach(p => {
      if (p.cpf_cnpj_dest) {
        onlinePerCustomer.set(p.cpf_cnpj_dest, (onlinePerCustomer.get(p.cpf_cnpj_dest) || 0) + 1);
      }
    });

    // Métricas por Vendedor
    const vendors: Record<string, any> = {};
    const vendorCustomers = new Map<string, Set<string>>();
    
    const processVendorSale = (r: DetailedSaleRow) => {
      const name = r.vendedor || "VENDEDOR";
      if (!vendors[name]) vendors[name] = { venda: 0, cupons: 0, itens: 0, ident: 0, adicionais: 0, pickups: 0 };
      vendors[name].venda += parseFloat(r.vNF);
      vendors[name].cupons += 1;
      vendors[name].itens += parseFloat(r.itens_qtd);
      if (r.cpf_cnpj_dest) {
        vendors[name].ident += 1;
        if (!vendorCustomers.has(name)) vendorCustomers.set(name, new Set());
        vendorCustomers.get(name)!.add(r.cpf_cnpj_dest);
      }
      if (r.is_adicional || r.is_adicional_suspeito) {
        vendors[name].adicionais += 1;
      }
    };

    fisica.forEach(processVendorSale);
    adicional.forEach(processVendorSale);

    vendorCustomers.forEach((customers, vendorName) => {
      let totalPickups = 0;
      customers.forEach(cpf => {
        totalPickups += onlinePerCustomer.get(cpf) || 0;
      });
      if (vendors[vendorName]) {
        vendors[vendorName].pickups = totalPickups;
      }
    });

    const vendorPerformanceList = Object.entries(vendors)
      .map(([name, v]) => ({
        name,
        venda: v.venda,
        pa: v.cupons > 0 ? v.itens / v.cupons : 0,
        tkm: v.cupons > 0 ? v.venda / v.cupons : 0,
        ident: v.cupons > 0 ? (v.ident / v.cupons) * 100 : 0,
        adicionais: v.adicionais,
        pickups: v.pickups,
        conv: v.pickups > 0 ? (v.adicionais / v.pickups) * 100 : 0
      }))
      .sort((a, b) => b.venda - a.venda);

    return {
      venda: vTotal,
      cupons: cTotal,
      itens: iTotal,
      pa: cTotal > 0 ? iTotal / cTotal : 0,
      tkm: cTotal > 0 ? vTotal / cTotal : 0,
      cadastros: cFisica > 0 ? (idenFisica / cFisica) * 100 : 0,
      retiradas: online.length,
      adicionais: cAdicional,
      convPickup,
      trocas: vinculos.length,
      vendorPerformanceList
    };
  }, [data, vinculos]);

  const reportContent = useMemo(() => {
    const e = (emoji: string) => useEmojis ? emoji + " " : "";
    
    // Detecção de Período
    const dates = data.map(r => parseISO(r.dhEmi)).filter(d => !isNaN(d.getTime()));
    let dateStr = "";
    if (dates.length > 0) {
      const minDate = min(dates);
      const maxDate = max(dates);
      dateStr = isSameDay(minDate, maxDate) ? format(minDate, "dd/MM") : `${format(minDate, "dd/MM")} a ${format(maxDate, "dd/MM")}`;
    } else {
      dateStr = format(new Date(), "dd/MM");
    }

    switch (reportType) {
      case 'STORE_SUMMARY':
        return `${e("📊")}*Parcial Loja – ${dateStr}*\n\n` +
          `${e("💰")}*Venda:* ${formatBRL(metrics.venda)}\n` +
          `${e("🎯")}*PA:* ${metrics.pa.toFixed(2)} | ${e("💳")}*TKM:* ${formatBRL(metrics.tkm)}\n` +
          `${e("🆔")}*Ident:* ${metrics.cadastros.toFixed(1)}%\n` +
          `${e("🚚")}*Pickup:* ${metrics.retiradas} (${metrics.convPickup.toFixed(0)}% conv)\n` +
          (metrics.trocas > 0 ? `${e("🔄")}*Trocas:* ${metrics.trocas} atend.` : "");

      case 'VENDOR_PERFORMANCE':
        let perfText = `${e("👤")}*Performance Vendedores – ${dateStr}*\n\n`;
        metrics.vendorPerformanceList.forEach((v) => {
          perfText += `*${v.name}*\n` +
            `${e("💰")}${v.venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} | ${e("🎯")}PA ${v.pa.toFixed(2)}\n` +
            `${e("💳")}TKM ${formatBRL(v.tkm)} | ${e("🆔")}${v.ident.toFixed(0)}% Ident.\n`;
          
          if (v.pickups > 0 || v.adicionais > 0) {
            perfText += `${e("🚚")}${v.pickups} Pickups | ${e("➕")}${v.adicionais} Adic. (${v.conv.toFixed(0)}%)\n`;
          }
          perfText += "\n";
        });
        return perfText;

      case 'PICKUP_CONVERSION':
        return `${e("🚚")}*Relatório Pickup – ${dateStr}*\n\n` +
          `${e("📦")}*Retiradas:* ${metrics.retiradas}\n` +
          `${e("➕")}*Adicionais:* ${metrics.adicionais}\n` +
          `${e("📊")}*Conversão:* ${metrics.convPickup.toFixed(1)}%`;

      case 'DAILY_CLOSING':
        const highlights: Record<string, string[]> = {};
        const winners = {
          PA: [...metrics.vendorPerformanceList].sort((a, b) => b.pa - a.pa)[0],
          TKM: [...metrics.vendorPerformanceList].sort((a, b) => b.tkm - a.tkm)[0],
          Cadastros: [...metrics.vendorPerformanceList].sort((a, b) => b.ident - a.ident)[0],
          Adicionais: [...metrics.vendorPerformanceList].sort((a, b) => b.adicionais - a.adicionais)[0]
        };

        Object.entries(winners).forEach(([kpi, vendor]) => {
          if (vendor) {
            if (!highlights[vendor.name]) highlights[vendor.name] = [];
            highlights[vendor.name].push(kpi);
          }
        });

        let highlightsText = "";
        Object.entries(highlights).forEach(([name, kpis]) => {
          highlightsText += `${e("⭐")}*${name}:* ${kpis.join(", ")}\n`;
        });

        return `${e("📅")}*Fechamento – ${dateStr}*\n\n` +
          `${e("💰")}*Venda:* ${formatBRL(metrics.venda)}\n` +
          `${e("🎯")}*PA:* ${metrics.pa.toFixed(2)} | ${e("💳")}*TKM:* ${formatBRL(metrics.tkm)}\n` +
          `${e("🆔")}*Ident:* ${metrics.cadastros.toFixed(1)}%\n` +
          `${e("🚚")}*Pickup:* ${metrics.convPickup.toFixed(1)}%\n\n` +
          `${e("🏆")}*DESTAQUES DO DIA:*\n` +
          (highlightsText || "Equipe toda engajada!");

      case 'STRATEGIC':
        return `${e("📈")}*Gestão Estratégica – ${dateStr}*\n\n` +
          `*Status da Unidade:*\n` +
          `${metrics.pa < 2.0 ? e("🛑") : e("✅")} PA: ${metrics.pa.toFixed(2)}\n` +
          `${metrics.cadastros < 85 ? e("🛑") : e("✅")} Ident: ${metrics.cadastros.toFixed(1)}%\n` +
          `${metrics.convPickup < 15 ? e("🛑") : e("✅")} Conv: ${metrics.convPickup.toFixed(1)}%`;

      default:
        return "";
    }
  }, [reportType, metrics, useEmojis, data]);

  const handleCopy = () => {
    navigator.clipboard.writeText(reportContent);
    setCopied(true);
    toast({
      title: "Relatório Copiado!",
      description: "O texto está pronto para ser colado no WhatsApp.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="ri-card border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-emerald-50 border-b border-emerald-100">
              <CardTitle className="text-sm font-black text-emerald-700 uppercase flex items-center gap-2">
                <MessageCircle className="w-5 h-5" /> Configurar Relatório
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Tipo de Relatório</Label>
                <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                  <SelectTrigger className="rounded-xl h-12 border-slate-100 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STORE_SUMMARY">Parcial da Loja</SelectItem>
                    <SelectItem value="VENDOR_PERFORMANCE">Performance Vendedores</SelectItem>
                    <SelectItem value="PICKUP_CONVERSION">Relatório Pickup</SelectItem>
                    <SelectItem value="DAILY_CLOSING">Fechamento do Dia</SelectItem>
                    <SelectItem value="STRATEGIC">Estratégico / Gestão</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-50">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-black text-slate-700">Usar Emojis</Label>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Mensagem mais visual</p>
                  </div>
                  <Switch checked={useEmojis} onCheckedChange={setUseEmojis} />
                </div>
              </div>

              <Button 
                onClick={handleCopy}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl py-6 mt-4 gap-2"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copied ? "COPIADO!" : "COPIAR PARA WHATSAPP"}
              </Button>
            </CardContent>
          </Card>

          <Card className="ri-card border-none bg-orange-50/50 p-6 border-2 border-orange-100">
             <div className="flex gap-4">
                <Zap className="w-6 h-6 text-orange-500 shrink-0" />
                <div className="space-y-1">
                   <h4 className="text-xs font-black text-orange-900 uppercase">Dica Estratégica</h4>
                   <p className="text-[11px] text-orange-800/70 font-medium">Envie a parcial da loja em horários de pico para manter o foco em PA e Identificação.</p>
                </div>
             </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Pré-visualização</h3>
            <Badge variant="outline" className="bg-white text-emerald-600 border-emerald-100 font-black text-[9px]">OTIMIZADO</Badge>
          </div>

          <div className="bg-[#E5DDD5] rounded-[2rem] p-4 md:p-8 shadow-inner min-h-[450px] relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "url('https://picsum.photos/seed/wa/800/800')", backgroundSize: 'cover' }} />
            
            <div className="relative max-w-sm mx-auto space-y-4">
               <div className="bg-white rounded-2xl rounded-tl-none p-4 shadow-sm border-l-4 border-emerald-500 animate-in slide-in-from-left-4 duration-500">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800 leading-relaxed">
                    {reportContent}
                  </pre>
                  <div className="flex justify-end mt-2">
                     <span className="text-[9px] text-slate-400 font-bold">{format(new Date(), "HH:mm")}</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
