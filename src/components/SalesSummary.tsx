
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
import { Download, Copy, Users, ShoppingBag, Gift, AlertTriangle, RefreshCw } from "lucide-react";
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
          <CardHeader className="p-4">
            <CardDescription className="text-primary-foreground/70 text-xs">Venda Bruta</CardDescription>
            <CardTitle className="text-xl font-bold">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-emerald-50 border-emerald-200">
          <CardHeader className="p-4">
            <CardDescription className="text-emerald-600 font-semibold uppercase text-[10px]">Adicionais Válidos</CardDescription>
            <CardTitle className="text-xl font-bold text-emerald-700">{saidas.filter(r => r.is_adicional).length}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardHeader className="p-4">
            <CardDescription className="text-orange-600 font-semibold uppercase text-[10px]">Suspeitos Mesmo Dia</CardDescription>
            <CardTitle className="text-xl font-bold text-orange-700">{suspeitos.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-indigo-50 border-indigo-200">
          <CardHeader className="p-4">
            <CardDescription className="text-indigo-600 font-semibold uppercase text-[10px]">Vínculos de Troca</CardDescription>
            <CardTitle className="text-xl font-bold text-indigo-700">{vinculos.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-between bg-card border p-4 rounded-xl shadow-sm">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleDownload('vendas')}>
            <Download className="w-4 h-4 mr-2" /> Vendas CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDownload('trocas')}>
            <Download className="w-4 h-4 mr-2" /> Trocas CSV
          </Button>
          <Button variant="outline" size="sm" onClick={copyToClipboard} className="bg-emerald-600 text-white hover:bg-emerald-700 border-none">
            <Copy className="w-4 h-4 mr-2" /> WhatsApp
          </Button>
        </div>
      </div>

      <Tabs defaultValue="canais" className="w-full">
        <TabsList className="bg-muted p-1 w-full justify-start overflow-x-auto h-auto flex-nowrap">
          <TabsTrigger value="canais">Canais</TabsTrigger>
          <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
          <TabsTrigger value="auditoria" className="text-amber-700">Auditoria Descontos</TabsTrigger>
          <TabsTrigger value="suspeitos" className="text-orange-700">Suspeitos</TabsTrigger>
          <TabsTrigger value="trocas" className="text-indigo-700">Trocas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="canais" className="mt-4">
          <Card className="border shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Canal</TableHead>
                  <TableHead className="text-right">Cupons</TableHead>
                  <TableHead className="text-right">Venda</TableHead>
                  <TableHead className="text-right">Itens</TableHead>
                  <TableHead className="text-right">TKM</TableHead>
                  <TableHead className="text-right">PA</TableHead>
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
                    <TableCell className="text-right">{r.PA}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="vendedores" className="mt-4">
          <Card className="border shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead className="text-right">Cupons</TableHead>
                  <TableHead className="text-right">Venda</TableHead>
                  <TableHead className="text-right">TKM</TableHead>
                  <TableHead className="text-right">PA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorSummary.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.Vendedor}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.Canal}</TableCell>
                    <TableCell className="text-right">{r.Cupons}</TableCell>
                    <TableCell className="text-right">R$ {parseFloat(r.Venda_Total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">R$ {r.TKM}</TableCell>
                    <TableCell className="text-right">{r.PA}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="auditoria" className="mt-4">
           <Card className="border shadow-sm overflow-hidden">
            <div className="p-4 bg-amber-50 border-b border-amber-100">
              <h3 className="text-sm font-bold text-amber-800">Auditoria de Descontos (Vendas com Desconto)</h3>
              <p className="text-xs text-amber-600">Listagem de todas as notas que possuem vDesc &gt; 0</p>
            </div>
            <Table>
              <TableHeader className="bg-amber-50/50">
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Valor Venda</TableHead>
                  <TableHead className="text-right">Desconto R$</TableHead>
                  <TableHead className="text-right">Desconto %</TableHead>
                  <TableHead>Status Auditoria</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditDescontos.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.vendedor}</TableCell>
                    <TableCell className="text-xs">{r.nome_dest || "NÃO INFORMADO"}</TableCell>
                    <TableCell className="text-right">R$ {parseFloat(r.vNF).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-amber-700">R$ {parseFloat(r.desconto_total).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold text-amber-600">{(parseFloat(r.percentual_desconto) * 100).toFixed(1)}%</TableCell>
                    <TableCell>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        r.status_auditoria === 'ADICIONAL' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {r.tipo_desconto}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {auditDescontos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma venda com desconto identificada.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="trocas" className="mt-4">
           <Card className="border shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-indigo-50">
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Devolvido</TableHead>
                  <TableHead className="text-right">Trocado</TableHead>
                  <TableHead className="text-right text-emerald-600">Diferença R$</TableHead>
                  <TableHead className="text-center">Itens Δ</TableHead>
                  <TableHead>Método</TableHead>
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
                    <TableCell className="text-[10px] text-muted-foreground">{v.metodo_vinculo}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="suspeitos" className="mt-4">
           <Card className="border shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-orange-50">
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Chave Retirada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suspeitos.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.vendedor}</TableCell>
                    <TableCell className="text-xs">{r.nome_dest}</TableCell>
                    <TableCell className="text-xs font-mono">{r.cpf_cnpj_dest}</TableCell>
                    <TableCell className="text-right font-bold">R$ {parseFloat(r.vNF).toFixed(2)}</TableCell>
                    <TableCell>
                       <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        r.tipo_retirada_associada === 'ANTES' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {r.tipo_retirada_associada}
                      </span>
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">{r.chave_retirada_associada?.slice(-8)}</TableCell>
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
