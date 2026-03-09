"use client";
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Map, MapPin, Navigation, Globe, TrendingUp } from "lucide-react";
import { DetailedSaleRow } from "@/lib/types";

export function GeographicAnalysis({ data }: { data: DetailedSaleRow[] }) {
  const geoData = useMemo(() => {
    const cityStats: Record<string, { count: number; value: number; ceps: Set<string> }> = {};
    const saidas = data.filter(r => r.tpNF === 1 && !r.is_devolucao && !r.is_cancelada);

    saidas.forEach(sale => {
      const cep = sale.cep_dest || "00000000";
      const value = parseFloat(sale.vNF) || 0;
      
      // Tenta extrair cidade do endereco_dest se existir (geralmente no final)
      const addrParts = sale.endereco_dest?.split(",") || [];
      const city = addrParts.length > 3 ? addrParts[addrParts.length - 2]?.trim() : "Local";

      if (!cityStats[city]) {
        cityStats[city] = { count: 0, value: 0, ceps: new Set() };
      }
      cityStats[city].count++;
      cityStats[city].value += value;
      cityStats[city].ceps.add(cep);
    });

    return Object.entries(cityStats)
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        value: stats.value,
        uniqueCeps: stats.ceps.size,
        share: (stats.value / (saidas.reduce((acc, r) => acc + parseFloat(r.vNF), 0) || 1)) * 100
      }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const topCeps = useMemo(() => {
    const cepStats: Record<string, { count: number; value: number; city: string }> = {};
    const saidas = data.filter(r => r.tpNF === 1 && !r.is_devolucao && !r.is_cancelada);

    saidas.forEach(sale => {
      const cep = sale.cep_dest;
      if (!cep) return;
      const addrParts = sale.endereco_dest?.split(",") || [];
      const city = addrParts.length > 3 ? addrParts[addrParts.length - 2]?.trim() : "Regional";
      const value = parseFloat(sale.vNF) || 0;

      if (!cepStats[cep]) {
        cepStats[cep] = { count: 0, value: 0, city };
      }
      cepStats[cep].count++;
      cepStats[cep].value += value;
    });

    return Object.entries(cepStats)
      .map(([cep, stats]) => ({
        cep,
        ...stats
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [data]);

  if (geoData.length === 0) return (
    <div className="p-8 text-center text-slate-500 italic border-2 border-dashed rounded-xl">
      Aguardando processamento de XMLs com dados de destinatário para análise geográfica...
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-800 uppercase italic flex items-center gap-2">
            <Map className="w-6 h-6 text-indigo-600" />
            Análise Geográfica
          </h2>
          <p className="text-xs text-slate-500 font-medium">Distribuição de vendas por origem do cliente (Municípios e CEPs).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Municípios */}
        <Card className="ri-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Concentração por Município
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {geoData.map((city, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center bg-slate-100 rounded text-[9px] font-black">{idx + 1}</span>
                    <span className="text-sm font-bold text-slate-700 uppercase">{city.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-800">
                      {city.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                    <span className="ml-2 text-[10px] font-black text-indigo-500">{city.share.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                  <div 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-700" 
                    style={{ width: `${city.share}%` }} 
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase">
                  <span>{city.count} Atendimentos</span>
                  <span>{city.uniqueCeps} CEPs Distintos</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top CEPs Hotspots */}
        <Card className="ri-card">
          <CardHeader>
            <CardTitle className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-500" />
              Hotspots de CEP (Principais)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <div className="divide-y divide-slate-100">
                {topCeps.map((item, idx) => (
                  <div key={idx} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                    <div className="space-y-0.5">
                       <p className="text-xs font-black text-slate-800 group-hover:text-rose-600 transition-colors">{item.cep}</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase">{item.city || "Região Local"}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-xs font-black text-slate-700">{item.count} Pedidos</p>
                       <p className="text-[10px] font-medium text-slate-400">Total: {item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</p>
                    </div>
                  </div>
                ))}
             </div>
             {topCeps.length === 0 && (
               <div className="p-8 text-center text-[10px] text-slate-400 italic">
                  Sem dados de CEP detalhados.
               </div>
             )}
          </CardContent>
        </Card>
      </div>

      <div className="bg-slate-900 rounded-3xl p-6 text-white overflow-hidden relative border-none shadow-xl">
        <div className="absolute top-0 right-0 p-4 opacity-10">
           <Navigation className="w-16 h-16" />
        </div>
        <div className="flex flex-col md:flex-row gap-6 items-center relative z-10">
           <div className="p-4 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
              <TrendingUp className="w-8 h-8 text-indigo-400" />
           </div>
           <div className="space-y-1 text-center md:text-left">
              <h4 className="font-bold text-lg leading-tight uppercase tracking-tight">Estratégia de Expansão e Logística</h4>
              <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
                Utilize os CEPs hotspots para otimizar <strong>campanhas de tráfego pago</strong> ou planejar <strong>novas rotas de entrega própria</strong>. 
                Municípios com alta representatividades, mas baixo ticket médio, podem sinalizar a necessidade de ajustes no mix local.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
