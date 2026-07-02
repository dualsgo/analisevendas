
"use client";

import { useState } from "react";
import { UploadZone } from "@/components/UploadZone";
import { SalesSummary } from "@/components/SalesSummary";
import { UploadDiagnosis } from "@/components/UploadDiagnosis";
import { cn } from "@/lib/utils";
import { Loader2, LayoutDashboard, ArrowRight } from "lucide-react";
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
                      "bg-white/80 backdrop-blur-2xl rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl shadow-indigo-500/10 border border-white p-6 md:p-12 text-center relative overflow-hidden",
                      (history.length > 0 || parsedRows.length > 0) ? "lg:col-span-7" : "max-w-3xl w-full mx-auto"
                    )}
                  >
                    {/* Decorative background element */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
                    
                    <div className="mb-6 md:mb-10 relative z-10">
                      <div className="inline-block bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[9px] md:text-[10px] font-bold uppercase mb-4 tracking-widest">Início da Jornada</div>
                      <h2 className="text-xl md:text-3xl font-bold text-slate-800 tracking-tight mb-2 leading-tight">Painel de Inteligência</h2>
                      <p className="text-slate-500 font-medium text-xs md:text-sm leading-relaxed max-w-md mx-auto mb-6">
                        Arraste seus pacotes <span className="text-indigo-600 font-bold">ZIP</span> ou <span className="text-indigo-600 font-bold">XMLs</span> para iniciar uma nova análise.
                      </p>

                      <UploadZone onDataParsed={processData} isProcessing={processorStatus === "processing"} />

                      {parsedRows.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-8 p-6 bg-emerald-50 border-2 border-emerald-100 rounded-3xl text-left flex flex-col sm:flex-row items-center justify-between gap-6"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-emerald-600">
                              <LayoutDashboard className="w-6 h-6" />
                            </div>
                            <div>
                               <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Análise em Memória</h4>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
                                  {fileStats.saidas} Saídas • {fileStats.total} Total Notas
                               </p>
                            </div>
                          </div>
                          <Button 
                            onClick={confirmDashboard}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-14 px-10 font-black gap-2 shadow-lg shadow-emerald-100 w-full sm:w-auto"
                          >
                            ACESSAR DASHBOARD
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      )}
                    </div>

                    {processorStatus === "processing" && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        className="mt-8 flex flex-col items-center gap-4 text-indigo-600"
                      >
                        <div className="relative">
                           <Loader2 className="w-10 h-10 md:w-12 h-12 animate-spin opacity-20" />
                        </div>
                        <span className="text-xs md:text-sm font-bold animate-pulse tracking-tight uppercase">Analisando nota por nota...</span>
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
