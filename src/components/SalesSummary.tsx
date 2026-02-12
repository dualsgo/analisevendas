
"use client";

import React, { useMemo } from "react";
import { 
  DetailedSaleRow, 
  ChannelSummaryRow, 
  VendorSummaryRow 
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
import { Download, TrendingUp, Users, ShoppingBag } from "lucide-react";
import { exportToCsv } from "@/lib/csv-utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SalesSummaryProps {
  data: DetailedSaleRow[];
}

export function SalesSummary({ data }: SalesSummaryProps) {
  const channelSummary = useMemo(() => {
    const agg: Record<string, { cupons: number; venda: number; itens: number }> = {};
    data.forEach(r => {
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
  }, [data]);

  const vendorSummary = useMemo(() => {
    const agg: Record<string, { cupons: number; venda: number; itens: number; canal: string; vendedor: string }> = {};
    data.forEach(r => {
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
  }, [data]);

  const handleDownload = (type: 'canal' | 'vendedor' | 'detalhe') => {
    if (type === 'canal') {
      exportToCsv("resumo_canais.csv", channelSummary, ["Canal", "Cupons", "Venda_Total", "Itens_Total", "TKM", "PA"]);
    } else if (type === 'vendedor') {
      exportToCsv("resumo_vendedores.csv", vendorSummary, ["Canal", "Vendedor", "Cupons", "Venda_Total", "Itens_Total", "TKM", "PA"]);
    } else {
      exportToCsv("detalhe_vendas.csv", data, [
        "chave", "nf", "dhEmi", "vendedor", "canal", "vNF", "itens_qtd", 
        "is_troca", "vTroca", "dif_troca", "is_retirada", "is_retirada_adicional"
      ]);
    }
  };

  const totalRevenue = useMemo(() => data.reduce((acc, r) => acc + parseFloat(r.vNF), 0), [data]);
  const totalTransactions = data.length;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary text-primary-foreground border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-primary-foreground/70">Venda Bruta Total</CardDescription>
            <CardTitle className="text-3xl font-bold">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
              <TrendingUp className="w-4 h-4" />
              <span>Baseado em {totalTransactions} cupons</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border-none">
          <CardHeader className="pb-2">
            <CardDescription>Ticket Médio Geral</CardDescription>
            <CardTitle className="text-3xl font-bold">R$ {(totalRevenue / totalTransactions).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShoppingBag className="w-4 h-4" />
              <span>Valor médio por cupom</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border-none">
          <CardHeader className="pb-2">
            <CardDescription>Performance Vendedores</CardDescription>
            <CardTitle className="text-3xl font-bold">{new Set(data.map(r => r.vendedor)).size}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>Colaboradores ativos</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-between bg-secondary/50 p-4 rounded-xl">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleDownload('canal')} className="bg-background">
            <Download className="w-4 h-4 mr-2" /> Resumo Canais
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDownload('vendedor')} className="bg-background">
            <Download className="w-4 h-4 mr-2" /> Resumo Vendedores
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDownload('detalhe')} className="bg-background">
            <Download className="w-4 h-4 mr-2" /> Detalhado
          </Button>
        </div>
      </div>

      <Tabs defaultValue="canais" className="w-full">
        <TabsList className="bg-secondary p-1">
          <TabsTrigger value="canais">Vendas por Canal</TabsTrigger>
          <TabsTrigger value="vendedores">Vendas por Vendedor</TabsTrigger>
        </TabsList>
        <TabsContent value="canais" className="mt-4">
          <Card className="border-none shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-semibold">Canal</TableHead>
                  <TableHead className="font-semibold text-right">Cupons</TableHead>
                  <TableHead className="font-semibold text-right">Venda Total</TableHead>
                  <TableHead className="font-semibold text-right">Itens</TableHead>
                  <TableHead className="font-semibold text-right">TKM</TableHead>
                  <TableHead className="font-semibold text-right">PA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channelSummary.map((r) => (
                  <TableRow key={r.Canal}>
                    <TableCell className="font-medium">{r.Canal}</TableCell>
                    <TableCell className="text-right">{r.Cupons}</TableCell>
                    <TableCell className="text-right">R$ {parseFloat(r.Venda_Total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">{r.Itens_Total}</TableCell>
                    <TableCell className="text-right">R$ {parseFloat(r.TKM).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">{r.PA}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        <TabsContent value="vendedores" className="mt-4">
          <Card className="border-none shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-semibold">Vendedor</TableHead>
                  <TableHead className="font-semibold">Canal</TableHead>
                  <TableHead className="font-semibold text-right">Cupons</TableHead>
                  <TableHead className="font-semibold text-right">Venda Total</TableHead>
                  <TableHead className="font-semibold text-right">TKM</TableHead>
                  <TableHead className="font-semibold text-right">PA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorSummary.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.Vendedor}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.Canal}</TableCell>
                    <TableCell className="text-right">{r.Cupons}</TableCell>
                    <TableCell className="text-right">R$ {parseFloat(r.Venda_Total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">R$ {parseFloat(r.TKM).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">{r.PA}</TableCell>
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
