"use client";

import React, { useState, useMemo } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Info, Calendar, Trophy, DollarSign, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OfertasImperdiveisProps {
  data: DetailedSaleRow[];
}

export function OfertasImperdiveis({ data }: OfertasImperdiveisProps) {
  const [inputCodes, setInputCodes] = useState("");
  const [analyzedCodes, setAnalyzedCodes] = useState<string[]>([]);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const handleAnalyze = () => {
    if (!inputCodes.trim()) {
      setAnalyzedCodes([]);
      setHasAnalyzed(false);
      return;
    }
    // Extract codes splitting by comma, newline or space
    const codes = inputCodes
      .split(/[\n,;]+/)
      .map(c => c.trim().toLowerCase())
      .filter(c => c.length > 0);
    setAnalyzedCodes(codes);
    setHasAnalyzed(true);
  };

  const results = useMemo(() => {
    if (analyzedCodes.length === 0) return null;

    const validSales = data.filter(r => !r.is_cancelada && r.tpNF === 1 && !r.is_devolucao);

    let totalQtd = 0;
    let totalValor = 0;
    const byVend: Record<string, { qtd: number; valor: number }> = {};
    const byDay: Record<string, { qtd: number; valor: number }> = {};

    validSales.forEach(sale => {
      let saleMatchQtd = 0;
      let saleMatchValor = 0;

      sale.itens.forEach(item => {
        const cProd = (item.cProd || "").toLowerCase();
        const xProd = (item.xProd || "").toLowerCase();

        // Check if item matches any of the analyzed codes
        const isMatch = analyzedCodes.some(code => cProd.includes(code) || xProd.includes(code));
        
        if (isMatch) {
          const qtd = item.qCom || 1;
          const valor = item.vProd || 0;
          saleMatchQtd += qtd;
          saleMatchValor += valor;
        }
      });

      if (saleMatchQtd > 0) {
        totalQtd += saleMatchQtd;
        totalValor += saleMatchValor;

        const vend = sale.vendedor || "DESCONHECIDO";
        if (!byVend[vend]) byVend[vend] = { qtd: 0, valor: 0 };
        byVend[vend].qtd += saleMatchQtd;
        byVend[vend].valor += saleMatchValor;

        let dayKey = "Data Desconhecida";
        try {
          const d = parseISO(sale.dhEmi);
          dayKey = format(d, "dd/MM/yyyy");
        } catch { /* ignore */ }

        if (!byDay[dayKey]) byDay[dayKey] = { qtd: 0, valor: 0 };
        byDay[dayKey].qtd += saleMatchQtd;
        byDay[dayKey].valor += saleMatchValor;
      }
    });

    const vendRanking = Object.entries(byVend)
      .map(([nome, stats]) => ({ nome, ...stats }))
      .sort((a, b) => b.qtd - a.qtd);

    const dayRanking = Object.entries(byDay)
      .map(([dia, stats]) => ({ dia, ...stats }))
      .sort((a, b) => {
        const [da, ma, ya] = a.dia.split('/');
        const [db, mb, yb] = b.dia.split('/');
        return new Date(Number(ya), Number(ma)-1, Number(da)).getTime() - new Date(Number(yb), Number(mb)-1, Number(db)).getTime();
      });

    return {
      totalQtd,
      totalValor,
      vendRanking,
      dayRanking
    };
  }, [analyzedCodes, data]);

  const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="bg-gradient-to-br from-rose-600 to-rose-500 rounded-[2rem] p-6 md:p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
          <div className="bg-white/10 p-3 rounded-2xl w-fit"><Flame className="w-8 h-8 text-rose-200" /></div>
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">Ofertas Imperdíveis</h2>
            <p className="text-rose-100 text-sm font-medium mt-1">
              Monitore a performance de itens específicos. Informe os códigos para iniciar a análise.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Códigos ou Nomes dos Produtos
            </label>
            <Textarea 
              placeholder="Cole os códigos aqui (separados por vírgula ou linha)..."
              className="min-h-[100px] resize-y bg-slate-50 border-slate-200 text-slate-700"
              value={inputCodes}
              onChange={e => setInputCodes(e.target.value)}
            />
            <p className="text-[10px] text-slate-400">
              A busca é feita ignorando letras maiúsculas/minúsculas. Pode informar parte do nome ou código.
            </p>
          </div>
          <Button 
            onClick={handleAnalyze}
            className="mt-6 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold px-6 h-auto py-3 shrink-0"
          >
            Analisar Ofertas
          </Button>
        </div>
      </div>

      {hasAnalyzed && results && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-rose-100 shadow-sm overflow-hidden bg-gradient-to-b from-rose-50 to-white">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
                <div className="p-3 bg-white rounded-full shadow-sm border border-rose-100 mb-2">
                  <ShoppingCart className="w-6 h-6 text-rose-500" />
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Quantidade Vendida</p>
                <p className="text-4xl md:text-5xl font-black text-slate-800">{results.totalQtd} <span className="text-lg text-slate-400 font-bold">pç</span></p>
              </CardContent>
            </Card>

            <Card className="border-emerald-100 shadow-sm overflow-hidden bg-gradient-to-b from-emerald-50 to-white">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
                <div className="p-3 bg-white rounded-full shadow-sm border border-emerald-100 mb-2">
                  <DollarSign className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Valor Arrecadado</p>
                <p className="text-4xl md:text-5xl font-black text-slate-800 tracking-tighter">{fmtBRL(results.totalValor)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Vendedores Ranking */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight">Performance por Colaborador</h3>
              </div>
              
              <div className="space-y-4">
                {results.vendRanking.length > 0 ? results.vendRanking.map((v, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={cn("text-xs font-black w-5 text-center",
                      i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-600" : "text-slate-300"
                    )}>
                      {i < 3 ? ["🥇","🥈","🥉"][i] : i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-700 truncate">{v.nome}</p>
                      <Progress 
                        value={(v.qtd / results.vendRanking[0].qtd) * 100} 
                        className="h-1.5 mt-1 bg-slate-100" 
                      />
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-rose-600">{v.qtd} pç</p>
                      <p className="text-[10px] text-slate-400">{fmtBRL(v.valor)}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-slate-400 text-center py-8">Nenhuma venda encontrada para os filtros.</p>
                )}
              </div>
            </div>

            {/* Evolução por Dia */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                <Calendar className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight">Performance por Dia</h3>
              </div>
              
              <div className="space-y-4">
                {results.dayRanking.length > 0 ? results.dayRanking.map((d, i) => {
                  const maxDayQtd = Math.max(...results.dayRanking.map(r => r.qtd));
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-20 shrink-0">
                        <p className="text-xs font-bold text-slate-600">{d.dia}</p>
                      </div>
                      <div className="flex-1 min-w-0 flex items-center">
                        <div className="flex-1 relative h-6 bg-slate-50 rounded-lg overflow-hidden flex">
                          <div 
                            className="bg-indigo-100 h-full rounded-lg transition-all duration-500"
                            style={{ width: `${(d.qtd / maxDayQtd) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right shrink-0 w-24">
                        <p className="text-sm font-black text-indigo-600">{d.qtd} pç</p>
                        <p className="text-[10px] text-slate-400">{fmtBRL(d.valor)}</p>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-sm text-slate-400 text-center py-8">Nenhuma venda encontrada para os filtros.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
