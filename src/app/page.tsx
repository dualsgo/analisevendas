
"use client";

import { useState } from "react";
import { UploadZone } from "@/components/UploadZone";
import { SalesSummary } from "@/components/SalesSummary";
import { UploadDiagnosis } from "@/components/UploadDiagnosis";
import { cn } from "@/lib/utils";
import { Loader2, LayoutDashboard, ArrowRight, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { UploadHistory } from "@/components/UploadHistory";
import { useSalesProcessor } from "@/hooks/useSalesProcessor";
import { motion, AnimatePresence } from "framer-motion";
import { fadeIn, zoomIn, slideUp } from "@/lib/animations";
import { Button } from "@/components/ui/button";

export default function Home() {
  const {
    parsedRows,
    vinculos,
    status: processorStatus,
    history,
    fileStats,
    processData,
    confirmDashboard,
    reset,
    reopenHistory,
    clearHistory
  } = useSalesProcessor();

  return (
      <main className="h-screen w-full bg-slate-50 font-body flex flex-col overflow-hidden">
        <Header 
          status={processorStatus as any} 
          fileStats={fileStats} 
          onReset={reset} 
        />

        <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <AnimatePresence mode="wait">
            {processorStatus === "idle" || processorStatus === "processing" ? (
              <motion.div 
                key="home-idle"
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="h-full flex flex-col items-center justify-center p-4 md:p-8 absolute inset-0 overflow-y-auto"
              >
                <div className={cn(
                  "w-full max-w-7xl mx-auto flex flex-col gap-8",
                  (history.length > 0 || parsedRows.length > 0) ? "lg:grid lg:grid-cols-12 items-start" : "flex flex-col items-center justify-center"
                )}>
                  <motion.section 
                    variants={zoomIn}
                    initial="hidden"
                    animate="visible"
                    className={cn(
                      "bg-white/90 backdrop-blur-2xl rounded-3xl md:rounded-[2.5rem] shadow-xl shadow-indigo-500/5 border border-slate-200/80 p-6 md:p-12 text-center relative overflow-hidden",
                      (history.length > 0 || parsedRows.length > 0) ? "lg:col-span-7" : "max-w-3xl w-full mx-auto"
                    )}
                  >
                    {/* Decorative ambient background lights */}
                    <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-gradient-to-r from-indigo-500/15 to-violet-500/15 blur-[90px] rounded-full pointer-events-none" />
                    
                    <div className="mb-6 md:mb-10 relative z-10">
                      <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-3.5 py-1 rounded-full text-[10px] font-bold uppercase mb-4 tracking-widest">
                        <span>Central de Processamento</span>
                      </div>
                      <h2 className="text-2xl md:text-4xl font-headline font-extrabold text-slate-900 tracking-tight mb-3 leading-tight">
                        Painel de Inteligência
                      </h2>
                      <p className="text-slate-500 font-medium text-xs md:text-sm leading-relaxed max-w-md mx-auto mb-6">
                        Carregue seus arquivos <span className="text-indigo-600 font-bold">ZIP</span> ou <span className="text-indigo-600 font-bold">XMLs</span> para gerar análises estratégicas.
                      </p>

                      <UploadZone onDataParsed={processData} isProcessing={processorStatus === "processing"} />

                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-center">
                        <a 
                          href="/auditoria-cestas" 
                          className="inline-flex items-center gap-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl border border-indigo-200/80 transition-all shadow-xs"
                        >
                          <Sparkles className="w-4 h-4 text-indigo-600" />
                          <span>🧪 Abrir Auditoria Histórica de Cestas (Jan a Ago)</span>
                        </a>
                      </div>

                      {parsedRows.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-8 p-6 bg-emerald-50/90 border border-emerald-200/90 rounded-2xl text-left flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-emerald-600 border border-emerald-100">
                              <LayoutDashboard className="w-6 h-6" />
                            </div>
                            <div>
                               <h4 className="text-sm font-bold text-slate-900 tracking-tight">Análise em Memória Pronta</h4>
                               <p className="text-xs font-semibold text-slate-500 tracking-wide mt-0.5">
                                  {fileStats.saidas} Saídas • {fileStats.total} Total de Notas
                               </p>
                            </div>
                          </div>
                          <Button 
                            onClick={confirmDashboard}
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl h-12 px-8 font-bold gap-2 shadow-md shadow-emerald-200/60 w-full sm:w-auto text-xs uppercase tracking-wider"
                          >
                            Acessar Dashboard
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      )}
                    </div>

                    {processorStatus === "processing" && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        className="mt-8 flex flex-col items-center gap-3 text-indigo-600"
                      >
                        <div className="relative">
                           <Loader2 className="w-10 h-10 animate-spin opacity-80" />
                        </div>
                        <span className="text-xs md:text-sm font-bold tracking-wide uppercase text-indigo-700">Processando lote de dados...</span>
                      </motion.div>
                    )}
                  </motion.section>

                  {processorStatus === "idle" && history.length > 0 && (
                    <motion.div 
                      variants={slideUp}
                      initial="hidden"
                      animate="visible"
                      className="lg:col-span-5 w-full flex flex-col gap-6"
                    >
                      <UploadHistory 
                        history={history} 
                        onReopen={reopenHistory} 
                        onClear={clearHistory} 
                      />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ) : processorStatus === "analyzed" ? (
              <motion.div 
                key="home-analyzed"
                variants={slideUp}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex-1 p-4 md:p-8 absolute inset-0 overflow-y-auto"
              >
                <div className="flex flex-col gap-6">
                  <UploadDiagnosis 
                    data={parsedRows} 
                    vinculos={vinculos} 
                    onConfirm={confirmDashboard} 
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="home-dashboard"
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="h-full"
              >
                <SalesSummary data={parsedRows} vinculos={vinculos} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
  );
}
