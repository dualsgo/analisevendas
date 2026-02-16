"use client";

import { useState, useMemo, useEffect } from "react";
import { UploadZone } from "@/components/UploadZone";
import { SalesSummary } from "@/components/SalesSummary";
import { UploadDiagnosis } from "@/components/UploadDiagnosis";
import { DetailedSaleRow, VinculoTroca, UploadHistoryItem } from "@/lib/types";
import { detectarAdicionaisSuspeitos, vincularTrocas } from "@/lib/analysis-utils";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  RefreshCcw, 
  Loader2, 
  FileText, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Ban, 
  History, 
  Trash2,
  ChevronRight,
  Calendar
} from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { format, parseISO, min, max } from "date-fns";

export default function Home() {
  const [parsedRows, setParsedRows] = useState<DetailedSaleRow[]>([]);
  const [vinculos, setVinculos] = useState<VinculoTroca[]>([]);
  const [status, setStatus] = useState<"idle" | "processing" | "analyzed" | "success">("idle");
  const [history, setHistory] = useState<UploadHistoryItem[]>([]);

  // Carregar histórico do localStorage
  useEffect(() => {
    const saved = localStorage.getItem("ri_happy_upload_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar histórico");
      }
    }
  }, []);

  const handleDataParsed = (rows: DetailedSaleRow[]) => {
    setStatus("processing");
    
    setTimeout(() => {
      const withSuspects = detectarAdicionaisSuspeitos(rows);
      const exchangeLinks = vincularTrocas(withSuspects);
      
      setParsedRows(withSuspects);
      setVinculos(exchangeLinks || []);
      
      // Salvar no histórico
      const saidas = withSuspects.filter(r => r.tpNF === 1 && !r.is_cancelada);
      const dates = saidas.map(r => parseISO(r.dhEmi)).filter(d => !isNaN(d.getTime()));
      const periodStr = dates.length > 0 ? 
        `${format(min(dates), "dd/MM/yy")} - ${format(max(dates), "dd/MM/yy")}` : 
        "Período Indefinido";

      const newItem: UploadHistoryItem = {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toISOString(),
        periodo: periodStr,
        totalNotas: withSuspects.length,
        valorTotal: saidas.reduce((acc, r) => acc + parseFloat(r.vNF), 0),
        data: withSuspects
      };

      const updatedHistory = [newItem, ...history].slice(0, 5);
      setHistory(updatedHistory);
      localStorage.setItem("ri_happy_upload_history", JSON.stringify(updatedHistory));

      setStatus("analyzed");
    }, 1500);
  };

  const handleConfirmDashboard = () => {
    setStatus("success");
  };

  const handleReset = () => {
    setParsedRows([]);
    setVinculos([]);
    setStatus("idle");
  };

  const handleReopenHistory = (item: UploadHistoryItem) => {
    setParsedRows(item.data);
    setVinculos(vincularTrocas(detectarAdicionaisSuspeitos(item.data)));
    setStatus("success");
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem("ri_happy_upload_history");
  };

  // Estatísticas de Arquivos para o Top Bar
  const fileStats = useMemo(() => {
    const total = parsedRows.length;
    const entradas = parsedRows.filter(r => (r.tpNF === 0 || r.is_devolucao) && !r.is_cancelada).length;
    const saidas = parsedRows.filter(r => r.tpNF === 1 && !r.is_devolucao && !r.is_cancelada).length;
    const canceladas = parsedRows.filter(r => r.is_cancelada).length;
    
    return { total, entradas, saidas, canceladas };
  }, [parsedRows]);

  return (
    <SidebarProvider>
      <main className="min-h-screen bg-amber-50/30 font-body w-full flex flex-col">
        {/* Header Fixo Ri Happy Style */}
        <header className="bg-[#FFD100] border-b-4 border-orange-500 text-orange-900 shadow-md h-16 md:h-20 flex items-center sticky top-0 z-[60] shrink-0">
          <div className="container mx-auto px-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              {status === "success" && (
                <SidebarTrigger className="md:hidden bg-white/20 hover:bg-white/40 border-0" />
              )}
              <div className="bg-white p-1 rounded-xl md:rounded-2xl shadow-sm rotate-3 border-2 border-orange-400">
                <Sparkles className="w-5 h-5 md:w-7 h-7 text-orange-500" />
              </div>
              <div className="overflow-hidden">
                <h1 className="text-xl md:text-2xl font-black tracking-tighter leading-none flex gap-0.5">
                  <span className="text-[#E4007C]">Ri</span>
                  <span className="text-[#36B7E1]">H</span>
                  <span className="text-[#F37021]">a</span>
                  <span className="text-[#662D91]">p</span>
                  <span className="text-[#39B54A]">p</span>
                  <span className="text-[#ED1C24]">y</span>
                </h1>
                <p className="hidden md:block text-[9px] font-bold uppercase tracking-widest text-orange-700 opacity-80 mt-0.5">Analisador de Performance</p>
              </div>
            </div>

            {/* Top Bar Stats */}
            {status === "success" && (
              <div className="hidden lg:flex items-center gap-6 bg-white/40 backdrop-blur-sm px-6 py-2.5 rounded-full border border-white/50 shadow-inner mx-4">
                <StatItem icon={ArrowUpRight} label="Saídas" value={fileStats.saidas} color="text-emerald-600" />
                <StatItem icon={ArrowDownLeft} label="Entradas" value={fileStats.entradas} color="text-blue-600" />
                <StatItem icon={Ban} label="Canceladas" value={fileStats.canceladas} color="text-red-500" />
                <div className="w-px h-6 bg-orange-300/50" />
                <div className="flex items-center gap-2">
                   <FileText className="w-4 h-4 text-orange-700" />
                   <span className="text-xs font-black text-orange-900">{fileStats.total} <span className="text-[9px] opacity-70">TOTAL</span></span>
                </div>
              </div>
            )}
            
            {(status === "success" || status === "analyzed") && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleReset}
                className="bg-white border-orange-500 text-orange-600 hover:bg-orange-50 gap-1.5 font-black rounded-full shadow-sm text-[10px] md:text-xs h-9 md:h-10 px-4 md:px-6"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">NOVO UPLOAD</span>
                <span className="sm:hidden uppercase">Novo</span>
              </Button>
            )}
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden">
          {status === "idle" || status === "processing" ? (
            <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 gap-8 md:gap-12">
              <section className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl shadow-orange-100/50 border-4 border-white p-6 md:p-16 text-center animate-in zoom-in duration-500 max-w-2xl w-full">
                <div className="mb-8 md:mb-12">
                  <div className="inline-block bg-orange-100 text-orange-600 px-5 py-2 rounded-full text-[10px] md:text-xs font-black uppercase mb-6 tracking-widest">Início da Jornada</div>
                  <h2 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tighter mb-4 leading-tight uppercase">Pronto para encontrar oportunidades?</h2>
                  <p className="text-slate-500 font-medium text-sm md:text-lg leading-relaxed max-w-md mx-auto">
                    Arraste seus pacotes <span className="text-orange-500 font-bold">ZIP</span> ou <span className="text-orange-500 font-bold">XMLs</span> das notas fiscais. O Solzinho fará todo o trabalho pesado!
                  </p>
                </div>
                
                <UploadZone onDataParsed={handleDataParsed} isProcessing={status === "processing"} />

                {status === "processing" && (
                  <div className="mt-10 md:mt-16 flex flex-col items-center gap-6 text-orange-600">
                    <div className="relative">
                       <Loader2 className="w-12 h-12 md:w-20 h-12 animate-spin opacity-20" />
                       <Sparkles className="w-6 h-6 md:w-10 h-10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" />
                    </div>
                    <span className="text-sm md:text-xl font-black animate-pulse tracking-tight uppercase">Analisando nota por nota...</span>
                  </div>
                )}
              </section>

              {/* Histórico de Uploads */}
              {status === "idle" && history.length > 0 && (
                <section className="w-full max-w-2xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 px-2">
                  <div className="flex items-center justify-between px-4">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                      <History className="w-4 h-4" /> Uploads Recentes
                    </h3>
                    <Button variant="ghost" size="sm" onClick={handleClearHistory} className="text-[10px] font-black text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-full h-8">
                      LIMPAR TUDO
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {history.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => handleReopenHistory(item)}
                        className="bg-white/60 hover:bg-white p-5 rounded-[1.5rem] border-2 border-slate-100 hover:border-orange-200 transition-all cursor-pointer group flex items-center justify-between shadow-sm"
                      >
                        <div className="flex items-center gap-5">
                          <div className="p-3.5 bg-orange-50 rounded-2xl group-hover:scale-110 transition-transform">
                            <Calendar className="w-6 h-6 text-orange-500" />
                          </div>
                          <div>
                            <p className="text-sm md:text-base font-black text-slate-700 uppercase leading-none mb-1.5">{item.periodo}</p>
                            <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wide">
                              {item.totalNotas} notas • {item.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity uppercase mr-2 hidden sm:inline">Reabrir</span>
                          <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : status === "analyzed" ? (
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
              <UploadDiagnosis data={parsedRows} vinculos={vinculos} onConfirm={handleConfirmDashboard} />
            </div>
          ) : (
            <SalesSummary data={parsedRows} vinculos={vinculos} />
          )}
        </div>
        <Toaster />
      </main>
    </SidebarProvider>
  );
}

function StatItem({ icon: Icon, label, value, color }: { icon: any, label: string, value: number, color: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("w-3.5 h-3.5", color)} />
        <span className={cn("text-sm font-black", color)}>{value}</span>
      </div>
      <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter leading-none mt-0.5">{label}</span>
    </div>
  );
}
