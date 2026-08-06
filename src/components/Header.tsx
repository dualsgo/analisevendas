import { Sparkles, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { TopBarStats } from "./TopBarStats";

import { motion } from "framer-motion";

interface HeaderProps {
  status: "idle" | "processing" | "analyzed" | "success";
  fileStats?: {
    total: number;
    entradas: number;
    saidas: number;
    canceladas: number;
  };
  onReset: () => void;
}

export function Header({ status, fileStats, onReset }: HeaderProps) {
  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-white/85 backdrop-blur-xl border-b border-slate-200/80 text-slate-800 shadow-xs h-16 flex items-center sticky top-0 z-[60] shrink-0 print:hidden"
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-2 rounded-xl shadow-md shadow-indigo-500/20 flex items-center justify-center text-white">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg md:text-xl font-headline font-extrabold tracking-tight text-slate-900">
              Ri Happy
            </h1>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 uppercase tracking-wider">
              Sales Intelligence
            </span>
          </div>
        </div>

        {/* Top Bar Stats */}
        {status === "success" && fileStats && (
          <div className="hidden lg:block">
            <TopBarStats stats={fileStats} />
          </div>
        )}
        
        <div className="flex items-center gap-3">
          <div id="header-actions" className="flex items-center gap-2"></div>
          <Button 
            variant="default" 
            size="sm" 
            asChild
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white gap-1.5 font-bold rounded-xl shadow-sm shadow-emerald-200/50 text-xs h-9 px-4 hidden sm:flex"
          >
            <a href="/looker">
              Painel Looker
            </a>
          </Button>
          {(status === "success" || status === "analyzed") && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onReset}
              className="bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50 gap-1.5 font-semibold rounded-xl shadow-2xs text-xs h-9 px-4"
            >
              <RefreshCcw className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Nova Análise</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          )}
        </div>
      </div>
    </motion.header>
  );
}
