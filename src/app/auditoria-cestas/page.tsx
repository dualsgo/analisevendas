"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Target, ShieldCheck, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HistoricalBasketAudit } from "@/components/HistoricalBasketAudit";

export default function AuditoriaCestasPage() {
  return (
    <main className="min-h-screen bg-slate-50 font-body flex flex-col">
      {/* Top Bar Standalone */}
      <header className="bg-white/85 backdrop-blur-xl border-b border-slate-200/80 h-16 flex items-center sticky top-0 z-50 px-4 md:px-8 justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="rounded-xl text-slate-600 hover:text-slate-900 gap-1.5 font-bold">
            <Link href="/">
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Sistema</span>
            </Link>
          </Button>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <span className="text-xs font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full hidden sm:inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Auditoria Histórica de Cestas (Jan a Ago)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="rounded-xl text-xs font-bold border-slate-200">
            <Link href="/">
              <Home className="w-3.5 h-3.5 mr-1" />
              Início
            </Link>
          </Button>
        </div>
      </header>

      {/* Container Principal */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        <HistoricalBasketAudit />
      </div>
    </main>
  );
}
