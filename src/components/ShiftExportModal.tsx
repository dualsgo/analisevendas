"use client";

import React, { useState } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { ShiftComparisonResult } from "@/lib/shift-comparison";
import {
  exportDailyShiftsCsv,
  exportWeeklyShiftsCsv,
  exportMonthlyShiftsCsv,
  exportComparisonSummaryCsv,
  exportEmployeeComparisonCsv,
  downloadCsvString,
} from "@/lib/shift-export";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  CalendarDays,
  CalendarRange,
  ArrowRightLeft,
  Users,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ShiftExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: DetailedSaleRow[];
  comparisonResult?: ShiftComparisonResult;
  comparisonMode: boolean;
  resolvedDatesA: string[];
  resolvedDatesB: string[];
  labelA?: string;
  labelB?: string;
}

type ExportType = "comparison" | "daily" | "weekly" | "monthly" | "employees";
type ScopeType = "scope_a" | "scope_b" | "scope_both" | "scope_all";

export function ShiftExportModal({
  isOpen,
  onClose,
  sales,
  comparisonResult,
  comparisonMode,
  resolvedDatesA,
  resolvedDatesB,
  labelA = "Período A",
  labelB = "Período B",
}: ShiftExportModalProps) {
  const [exportType, setExportType] = useState<ExportType>(
    comparisonMode ? "comparison" : "daily"
  );
  const [scope, setScope] = useState<ScopeType>("scope_both");

  // Determine allowed dates based on scope
  const getAllowedDates = (): string[] | undefined => {
    if (!comparisonMode || scope === "scope_all") return undefined;
    if (scope === "scope_a") return resolvedDatesA;
    if (scope === "scope_b") return resolvedDatesB;
    if (scope === "scope_both") {
      const combined = Array.from(new Set([...resolvedDatesA, ...resolvedDatesB]));
      return combined;
    }
    return undefined;
  };

  const handleExport = () => {
    const dates = getAllowedDates();
    const timestamp = new Date().toISOString().slice(0, 10);

    if (exportType === "comparison" && comparisonResult) {
      const csv = exportComparisonSummaryCsv(comparisonResult, labelA, labelB);
      downloadCsvString(`turnos_comparativo_${labelA}_vs_${labelB}_${timestamp}.csv`, csv);
    } else if (exportType === "daily") {
      const csv = exportDailyShiftsCsv(sales, dates);
      downloadCsvString(`turnos_evolucao_diaria_${timestamp}.csv`, csv);
    } else if (exportType === "weekly") {
      const csv = exportWeeklyShiftsCsv(sales, dates);
      downloadCsvString(`turnos_evolucao_semanal_${timestamp}.csv`, csv);
    } else if (exportType === "monthly") {
      const csv = exportMonthlyShiftsCsv(sales, dates);
      downloadCsvString(`turnos_evolucao_mensal_${timestamp}.csv`, csv);
    } else if (exportType === "employees" && comparisonResult) {
      const csv = exportEmployeeComparisonCsv(comparisonResult, labelA, labelB);
      downloadCsvString(`turnos_colaboradores_comparativo_${timestamp}.csv`, csv);
    } else {
      // Fallback daily
      const csv = exportDailyShiftsCsv(sales, dates);
      downloadCsvString(`turnos_export_${timestamp}.csv`, csv);
    }

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-8">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-slate-800 uppercase tracking-tight">
                Exportar Dados para Planilha
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium">
                Gere planilhas formatadas (.CSV com codificação UTF-8 e separador &quot;;&quot;) compatíveis com Microsoft Excel e Google Sheets
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Seletor do Tipo de Relatório */}
          <div>
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2.5">
              1. Escolha a Estrutura da Planilha:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Comparativo Direto */}
              {comparisonMode && comparisonResult && (
                <button
                  type="button"
                  onClick={() => setExportType("comparison")}
                  className={cn(
                    "p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 relative",
                    exportType === "comparison"
                      ? "border-indigo-600 bg-indigo-50/60 shadow-sm ring-2 ring-indigo-500/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  )}
                >
                  <div className={cn("p-2 rounded-xl shrink-0 mt-0.5", exportType === "comparison" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600")}>
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-xs text-slate-800">Comparativo dos Turnos</span>
                      <Badge className="bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase px-1 shadow-none">
                        A vs B
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">
                      Resumo executivo com Variação % e absoluta de Faturamento, Cupons, TKM e PA por Turno.
                    </p>
                  </div>
                </button>
              )}

              {/* Evolução Diária */}
              <button
                type="button"
                onClick={() => setExportType("daily")}
                className={cn(
                  "p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 relative",
                  exportType === "daily"
                    ? "border-indigo-600 bg-indigo-50/60 shadow-sm ring-2 ring-indigo-500/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                )}
              >
                <div className={cn("p-2 rounded-xl shrink-0 mt-0.5", exportType === "daily" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600")}>
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-black text-xs text-slate-800 block">Evolução Diária (Dia a Dia)</span>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">
                    Linhas com cada data e colunas detalhadas com Manhã, Tarde, Noite e Total do Dia.
                  </p>
                </div>
              </button>

              {/* Evolução Semanal */}
              <button
                type="button"
                onClick={() => setExportType("weekly")}
                className={cn(
                  "p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 relative",
                  exportType === "weekly"
                    ? "border-indigo-600 bg-indigo-50/60 shadow-sm ring-2 ring-indigo-500/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                )}
              >
                <div className={cn("p-2 rounded-xl shrink-0 mt-0.5", exportType === "weekly" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600")}>
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-black text-xs text-slate-800 block">Evolução Semanal</span>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">
                    Linhas com cada semana do ano e colunas com vendas e indicadores de cada turno.
                  </p>
                </div>
              </button>

              {/* Evolução Mensal */}
              <button
                type="button"
                onClick={() => setExportType("monthly")}
                className={cn(
                  "p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 relative",
                  exportType === "monthly"
                    ? "border-indigo-600 bg-indigo-50/60 shadow-sm ring-2 ring-indigo-500/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                )}
              >
                <div className={cn("p-2 rounded-xl shrink-0 mt-0.5", exportType === "monthly" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600")}>
                  <CalendarRange className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-black text-xs text-slate-800 block">Evolução Mensal (Mês a Mês)</span>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">
                    Linhas com cada mês consolidado e colunas com faturamento, TKM e PA por turno.
                  </p>
                </div>
              </button>

              {/* Colaboradores */}
              {comparisonMode && comparisonResult && (
                <button
                  type="button"
                  onClick={() => setExportType("employees")}
                  className={cn(
                    "p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 relative sm:col-span-2",
                    exportType === "employees"
                      ? "border-indigo-600 bg-indigo-50/60 shadow-sm ring-2 ring-indigo-500/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  )}
                >
                  <div className={cn("p-2 rounded-xl shrink-0 mt-0.5", exportType === "employees" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600")}>
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-black text-xs text-slate-800 block">Colaboradores por Turno (Comparativo)</span>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">
                      Desempenho individual de cada vendedor comparando os períodos A e B dentro de cada turno.
                    </p>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Filtro de Escopo de Datas (Quando no Modo Comparação e Relatório Temporal) */}
          {comparisonMode && exportType !== "comparison" && exportType !== "employees" && (
            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2">
                2. Filtrar Datas da Exportação:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setScope("scope_both")}
                  className={cn(
                    "p-2.5 rounded-xl border text-xs font-bold transition-all text-center",
                    scope === "scope_both"
                      ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  Período A + B ({Array.from(new Set([...resolvedDatesA, ...resolvedDatesB])).length} dias)
                </button>
                <button
                  type="button"
                  onClick={() => setScope("scope_a")}
                  className={cn(
                    "p-2.5 rounded-xl border text-xs font-bold transition-all text-center",
                    scope === "scope_a"
                      ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  Só Período A ({resolvedDatesA.length} dias)
                </button>
                <button
                  type="button"
                  onClick={() => setScope("scope_b")}
                  className={cn(
                    "p-2.5 rounded-xl border text-xs font-bold transition-all text-center",
                    scope === "scope_b"
                      ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  Só Período B ({resolvedDatesB.length} dias)
                </button>
                <button
                  type="button"
                  onClick={() => setScope("scope_all")}
                  className={cn(
                    "p-2.5 rounded-xl border text-xs font-bold transition-all text-center",
                    scope === "scope_all"
                      ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  Histórico Todo
                </button>
              </div>
            </div>
          )}

          {/* Dica de Compatibilidade */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-center gap-2 text-xs text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Formatado com <strong>ponto-e-vírgula</strong> e <strong>vírgula decimal</strong> para abrir diretamente no Excel Brasil sem desconfigurar colunas.
            </span>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Planilha (.CSV / Excel)</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
