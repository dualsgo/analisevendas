
"use client";

import { useState } from "react";
import { UploadZone } from "@/components/UploadZone";
import { SalesSummary } from "@/components/SalesSummary";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import { FileBarChart, RefreshCw, BarChart3, Database, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { detectarAdicionaisSuspeitos, vincularTrocas } from "@/lib/analysis-utils";

export default function Home() {
  const [parsedRows, setParsedRows] = useState<DetailedSaleRow[]>([]);
  const [vinculos, setVinculos] = useState<VinculoTroca[]>([]);

  const handleDataParsed = (rows: DetailedSaleRow[]) => {
    // 1. Detectar Adicionais Suspeitos
    const withSuspects = detectarAdicionaisSuspeitos(rows);
    
    // 2. Vincular Trocas
    const exchangeLinks = vincularTrocas(withSuspects);
    
    setParsedRows(withSuspects);
    setVinculos(exchangeLinks);
  };

  const handleReset = () => {
    setParsedRows([]);
    setVinculos([]);
  };

  return (
    <main className="min-h-screen pb-20 bg-background font-body">
      <header className="border-b bg-card py-6 mb-8 sticky top-0 z-50">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
              <FileBarChart className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-primary">Analisador Ri Happy</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Versão 6.0 • Auditoria Fiscal</p>
            </div>
          </div>
          {parsedRows.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground hover:text-primary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reiniciar
            </Button>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 max-w-6xl">
        {parsedRows.length === 0 ? (
          <div className="flex flex-col gap-12 max-w-3xl mx-auto pt-12">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-extrabold text-foreground tracking-tight leading-tight">
                Dashboard de <span className="text-primary italic">Performance Comercial</span>
              </h2>
              <p className="text-muted-foreground text-lg">
                Importe seus arquivos ZIP com XMLs para análise completa de canais, 
                trocas e detecção de adicionais por CPF.
              </p>
            </div>
            <UploadZone onDataParsed={handleDataParsed} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-card border shadow-sm space-y-3">
                <Database className="w-5 h-5 text-primary" />
                <h3 className="font-bold">Análise de Trocas</h3>
                <p className="text-sm text-muted-foreground">Vínculo automático entre entrada e saída para cálculo de diferença paga.</p>
              </div>
              <div className="p-6 rounded-2xl bg-card border shadow-sm space-y-3">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h3 className="font-bold">Adicionais Suspeitos</h3>
                <p className="text-sm text-muted-foreground">Identifica compras no mesmo dia e CPF de retiradas online.</p>
              </div>
              <div className="p-6 rounded-2xl bg-card border shadow-sm space-y-3">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                <h3 className="font-bold">Filtro de Troco</h3>
                <p className="text-sm text-muted-foreground">Evita falsos positivos em retiradas online detectando pagamentos presenciais.</p>
              </div>
            </div>
          </div>
        ) : (
          <SalesSummary data={parsedRows} vinculos={vinculos} />
        )}
      </div>
      <Toaster />
    </main>
  );
}
