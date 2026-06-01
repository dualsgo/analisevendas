"use client";

import { useState } from "react";
import { AlertCircle, Camera, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LookerPage() {
  const [screenshotMode, setScreenshotMode] = useState(false);

  return (
    <div className={cn("h-screen w-full bg-slate-50 font-body flex flex-col", screenshotMode ? "p-0" : "p-4 md:p-8")}>
      {!screenshotMode && (
        <div className="max-w-7xl mx-auto w-full mb-6 space-y-4 shrink-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Painel de Vendas em Tempo Real</h1>
              <p className="text-slate-500 text-sm mt-1">Integração Oficial do Looker</p>
            </div>
            <button 
              onClick={() => setScreenshotMode(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              <Camera className="w-4 h-4" />
              Modo Captura de Tela
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 items-start text-amber-800">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm">Acesso Restrito (Requer Login)</h3>
              <p className="text-xs mt-1 font-medium leading-relaxed">Este painel carrega os dados originais em tempo real. <strong>Só irá funcionar se o colaborador tiver acesso e já estiver logado</strong> com um e-mail corporativo ou e-mail da loja no navegador.</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-3 items-start text-slate-700 shadow-sm">
            <Info className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
            <div>
              <h3 className="font-bold text-sm text-slate-800">Cabeçalhos Importantes para Análise e Print</h3>
              <p className="text-xs mt-1 mb-3 font-medium text-slate-500">Certifique-se de que os seguintes indicadores estão visíveis antes de realizar a captura de tela:</p>
              <div className="flex flex-wrap gap-2">
                {["Desc Loja", "Meta Hoje", "Venda Total", "% Meta Hoje", "Cresc Venda Ly", "DSe DM", "Cupons", "TKM", "PA"].map(header => (
                  <span key={header} className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md">
                    {header}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {screenshotMode && (
        <div className="absolute top-4 right-4 z-50">
          <button 
            onClick={() => setScreenshotMode(false)}
            className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-xl backdrop-blur-md border border-slate-700"
          >
            Sair do Modo Captura
          </button>
        </div>
      )}

      <div className={cn("flex-1 w-full max-w-7xl mx-auto rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-white relative", screenshotMode && "max-w-none mx-0 rounded-none border-none shadow-none")}>
        <iframe 
          src="https://rihappy.cloud.looker.com/embed/dashboards/193?Superintendente=&Base+Lojas=&Bandeira=&Regional=RJ1-DANIELE&Cluster=" 
          className="absolute inset-0 w-full h-full border-none bg-slate-100"
          title="Looker Dashboard"
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
}
