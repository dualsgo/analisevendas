
"use client";

import React, { useMemo } from "react";
import { 
  DetailedSaleRow, 
  ChannelSummaryRow, 
  VendorSummaryRow,
  VinculoTroca
} from "@/lib/types";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, Users, ShoppingBag, Gift, AlertTriangle, RefreshCw, MessageSquare, Copy } from "lucide-react";
import { exportToCsv } from "@/lib/csv-utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface SalesSummaryProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

export function SalesSummary({ data, vinculos }: SalesSummaryProps) {
  const { toast } = useToast();
  const saidas = useMemo(() => data.filter(r => r.tpNF === 1), [data]);

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

  const vendorSummary = useMemo(() => {
    const agg: Record<string, { cupons: number; venda: number; itens: number; canal: string; vendedor: string }> = {};
    saidas.forEach(r => {
      const key = `${r.canal}-${r.vendedor}`;
      if (!agg[key]) agg[key] = { cupons: 0, venda: 0, itens: 0, canal: r.canal, vendedor: r.vendedor };
      agg[key].cupons++;
      agg[key].venda += parseFloat(r.vNF);
      agg[key].itens += parseFloat(r.itens_qtd);
    });

    return Object.entries(agg).map(([_, d]): VendorSummaryRow => ({
      Canal: d.canal,
      Vendedor: d.vendedor,
      Cupons: d.cupons.toString(),
      Venda_Total: d.venda.toFixed(2),
      Itens_Total: d.itens.toString(),
      TKM: (d.venda / d.cupons).toFixed(2),
      PA: (d.itens / d.cupons).toFixed(2),
    })).sort((a, b) => parseFloat(b.Venda_Total) - parseFloat(a.Venda_Total));
  }, [saidas]);

  const auditDescontos = useMemo(() => {
    return saidas.filter(r => r.tem_desconto && !r.is_troca);
  }, [saidas]);

  const suspeitos = useMemo(() => {
    return saidas.filter(r => r.is_adicional_suspeito);
  }, [saidas]);

  const whatsText = useMemo(() => {
    let text = "📊 *RELATÓRIO DE DESEMPENHO RI HAPPY*\n" + "=".repeat(30) + "\n";
    const perVend: Record<string, { venda: number; cupons: number; itens: number }> = {};
    saidas.forEach(r => {
      if (!perVend[r.vendedor]) perVend[r.vendedor] = { venda: 0, cupons: 0, itens: 0 };
      perVend[r.vendedor].venda += parseFloat(r.vNF);
      perVend[r.vendedor].cupons++;
      perVend[r.vendedor].itens += parseFloat(r.itens_qtd);
    });

    Object.entries(perVend).forEach(([vend, d]) => {
      text += `\n🧑‍💼 *${vend}*\n`;
      text += `   🎟️  *Cupons:* ${d.cupons}\n`;
      text += `   💵 *Venda Total:* R$ ${d.venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      text += `   📦 *Itens:* ${d.itens}\n`;
      text += `   💰 *TKM:* R$ ${(d.venda / d.cupons).toFixed(2)}\n`;
      
      const vAdic = saidas.filter(r => r.vendedor === vend && (r.is_adicional || r.is_adicional_suspeito));
      if (vAdic.length > 0) {
        text += `   🎁 *Adicionais:* ${vAdic.length}\n`;
      }
    });
    return text;
  }, [saidas]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(whatsText);
    toast({ title: "Copiado!", description: "Relatório copiado para o WhatsApp." });
  };

  const handleDownload = (type: string) => {
    if (type === 'vendas') {
      exportToCsv("vendas_detalhado.csv", data, Object.keys(data[0] || {}));
    } else if (type === 'trocas') {
      exportToCsv("vínculos_troca.csv", vinculos, Object.keys(vinculos[0] || {}));
    }
  };

  const totalRevenue = useMemo(() => saidas.reduce((acc, r) => acc + parseFloat(r.vNF), 0), [saidas]);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-primary text-primary-foreground border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-primary-foreground/70">Venda Bruta</CardDescription>
            <CardTitle className="text-2xl font-bold">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-emerald-50 border-emerald-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-600 font-semibold uppercase text-[10px]">Adicionais</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-700">{saidas.filter(r => r.is_adicional).length}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-orange-600 font-semibold uppercase text-[10px]">Suspeitos</CardDescription>
            <CardTitle className="text-2xl font-bold text-orange-700">{suspeitos.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-indigo-50 border-indigo-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-indigo-600 font-semibold uppercase text-[10px]">Trocas</CardDescription>
            <CardTitle className="text-2xl font-bold text-indigo-700">{vinculos.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-between bg-secondary/50 p-4 rounded-xl">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleDownload('vendas')} className="bg-background">
            <Download className="w-4 h-4 mr-2" /> Vendas Completo
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDownload('trocas')} className="bg-background">
            <Download className="w-4 h-4 mr-2" /> Vínculos Troca
          </Button>
          <Button variant="outline" size="sm" onClick={copyToClipboard} className="bg-emerald-600 text-white hover:bg-emerald-700">
            <Copy className="w-4 h-4 mr-2" /> WhatsApp
          </Button>
        </div>
      </div>

      <Tabs defaultValue="canais" className="w-full">
        <TabsList className="bg-secondary p-1 w-full justify-start overflow-x-auto h-auto">
          <TabsTrigger value="canais">Canais</TabsTrigger>
          <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
          <TabsTrigger value="adicionais" className="text-emerald-700">Adicionais</TabsTrigger>
          <TabsTrigger value="auditoria" className="text-amber-700">Auditoria</TabsTrigger>
          <TabsTrigger value="suspeitos" className="text-orange-700">Suspeitos</TabsTrigger>
          <TabsTrigger value="trocas" className="text-indigo-700">Trocas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="canais" className="mt-4">
          <Card className="border-none shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Canal</TableHead>
                  <TableHead className="text-right">Cupons</TableHead>
                  <TableHead className="text-right">Venda</TableHead>
                  <TableHead className="text-right">Itens</TableHead>
                  <TableHead className="text-right">TKM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channelSummary.map((r) => (
                  <TableRow key={r.Canal}>
                    <TableCell className="font-medium">{r.Canal}</TableCell>
                    <TableCell className="text-right">{r.Cupons}</TableCell>
                    <TableCell className="text-right">R$ {parseFloat(r.Venda_Total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">{r.Itens_Total}</TableCell>
                    <TableCell className="text-right">R$ {r.TKM}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="adicionais" className="mt-4">
           <Card className="border-none shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-emerald-50">
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Desconto</TableHead>
                  <TableHead>NF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {saidas.filter(r => r.is_adicional).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.vendedor}</TableCell>
                    <TableCell>{r.nome_dest}</TableCell>
                    <TableCell className="text-right">R$ {parseFloat(r.vNF).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-bold">{parseFloat(r.percentual_desconto) * 100}%</TableCell>
                    <TableCell className="text-xs font-mono">{r.nf}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="trocas" className="mt-4">
           <Card className="border-none shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-indigo-50">
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Devolvido</TableHead>
                  <TableHead className="text-right">Trocado</TableHead>
                  <TableHead className="text-right text-emerald-600">Diferença R$</TableHead>
                  <TableHead className="text-center">Itens Δ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vinculos.map((v, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{v.vendedor}</TableCell>
                    <TableCell className="text-xs">{v.nome_cliente}</TableCell>
                    <TableCell className="text-right">R$ {v.valor_devolvido.toFixed(2)}</TableCell>
                    <TableCell className="text-right">R$ {v.valor_trocado.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">R$ {v.valor_diferenca.toFixed(2)}</TableCell>
                    <TableCell className="text-center font-bold text-orange-600">{v.diferenca_itens}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="suspeitos" className="mt-4">
           <Card className="border-none shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-orange-50">
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Referência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suspeitos.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.vendedor}</TableCell>
                    <TableCell>{r.nome_dest}</TableCell>
                    <TableCell className="text-xs font-mono">{r.cpf_cnpj_dest}</TableCell>
                    <TableCell className="text-right font-bold">R$ {parseFloat(r.vNF).toFixed(2)}</TableCell>
                    <TableCell className="text-[10px]">{r.chave_retirada_associada?.substring(36)} ({r.tipo_retirada_associada})</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
