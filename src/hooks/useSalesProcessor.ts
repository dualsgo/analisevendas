
import { useState, useEffect, useMemo, useCallback } from "react";
import { DetailedSaleRow, VinculoTroca, UploadHistoryItem } from "@/lib/types";
import { detectarAdicionaisSuspeitos, vincularTrocas as vincularTrocasUtils } from "@/lib/analysis-utils";
import { format, parseISO, min, max } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type ProcessingStatus = "idle" | "processing" | "analyzed" | "success";

// Função Central de Normalização de Vendedores (Solzinho Engine)
function normalizeVendedor(name: string): string {
    const n = (name || "").toUpperCase().trim();
    if (n === "LIDIANE B" || n === "BARBOSA") return "BARBOSA";
    if (n === "LIDIANE" || n === "LIDI") return "LIDI";
    return n || "COLABORADOR NÃO IDENTIFICADO";
}

export function useSalesProcessor() {
    const [parsedRows, setParsedRows] = useState<DetailedSaleRow[]>([]);
    const [vinculos, setVinculos] = useState<VinculoTroca[]>([]);
    const [status, setStatus] = useState<ProcessingStatus>("idle");
    const [history, setHistory] = useState<UploadHistoryItem[]>([]);
    const { toast } = useToast();

    // Load history from localStorage on mount
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

    // Session persistence: Load current session from sessionStorage
    useEffect(() => {
        const sessionData = sessionStorage.getItem("ri_happy_current_session");
        if (sessionData) {
            try {
                const { rows, links, currentStatus } = JSON.parse(sessionData);
                if (rows && rows.length > 0) {
                    // Re-normalizar vendedores na carga de sessão para garantir consistência
                    const normalizedRows = rows.map((r: DetailedSaleRow) => ({
                        ...r,
                        vendedor: normalizeVendedor(r.vendedor)
                    }));
                    setParsedRows(normalizedRows);
                    setVinculos(links || []);
                    setStatus(currentStatus || "success");
                }
            } catch (e) {
                console.error("Erro ao recuperar sessão");
            }
        }
    }, []);

    // Save current session to sessionStorage
    useEffect(() => {
        if (status === "success" || status === "analyzed") {
            try {
                sessionStorage.setItem("ri_happy_current_session", JSON.stringify({
                    rows: parsedRows,
                    links: vinculos,
                    currentStatus: status
                }));
            } catch (e) {
                console.warn("Session storage quota exceeded");
            }
        } else if (status === "idle") {
            sessionStorage.removeItem("ri_happy_current_session");
        }
    }, [parsedRows, vinculos, status]);

    // Internal helper to save history list to localStorage with fallback for quota
    const saveToLocalStorage = (list: UploadHistoryItem[]) => {
        try {
            localStorage.setItem("ri_happy_upload_history", JSON.stringify(list));
            return true;
        } catch (e) {
            // Fallback: Save only metadata for older items if quota is exceeded
            try {
                const lightHistory = list.map((item, idx) => 
                    idx === 0 ? item : { ...item, data: [] }
                );
                localStorage.setItem("ri_happy_upload_history", JSON.stringify(lightHistory));
                return true;
            } catch (e2) {
                const metadataOnly = list.map(item => ({ ...item, data: [] }));
                localStorage.setItem("ri_happy_upload_history", JSON.stringify(metadataOnly));
                return true;
            }
        }
    };

    const addToHistory = useCallback((rows: DetailedSaleRow[]) => {
        const saidas = rows.filter(r => r.tpNF === 1 && !r.is_cancelada);
        const dates = saidas.map(r => parseISO(r.dhEmi)).filter(d => !isNaN(d.getTime()));
        const periodStr = dates.length > 0 ?
            `${format(min(dates), "dd/MM/yy")} - ${format(max(dates), "dd/MM/yy")}` :
            "Período Indefinido";

        const newItem: UploadHistoryItem = {
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toISOString(),
            periodo: periodStr,
            totalNotas: rows.length,
            valorTotal: saidas.reduce((acc, r) => acc + parseFloat(r.vNF), 0),
            data: rows
        };

        setHistory(prev => {
            const updated = [newItem, ...prev].slice(0, 5);
            saveToLocalStorage(updated);
            return updated;
        });
    }, []);

    const processData = useCallback((rows: DetailedSaleRow[]) => {
        setStatus("processing");

        setTimeout(() => {
            try {
                // Passo 0: Consolidação de Identidades Mandatória
                const normalizedRows = rows.map(r => ({
                    ...r,
                    vendedor: normalizeVendedor(r.vendedor)
                }));

                const withSuspects = detectarAdicionaisSuspeitos(normalizedRows);
                const exchangeLinks = vincularTrocasUtils(withSuspects);

                setParsedRows(withSuspects);
                setVinculos(exchangeLinks || []);
                addToHistory(withSuspects);
                setStatus("analyzed");
            } catch (error) {
                console.error("Erro ao processar dados:", error);
                setStatus("idle");
                toast({
                    title: "Erro no processamento",
                    description: "Não foi possível analisar os arquivos selecionados.",
                    variant: "destructive",
                });
            }
        }, 100);
    }, [addToHistory, toast]);

    const confirmDashboard = useCallback(() => {
        setStatus("success");
    }, []);

    const reset = useCallback(() => {
        setParsedRows([]);
        setVinculos([]);
        setStatus("idle");
        sessionStorage.removeItem("ri_happy_current_session");
    }, []);

    const reopenHistory = useCallback((item: UploadHistoryItem) => {
        if (!item.data || item.data.length === 0) {
            toast({
                title: "Dados não disponíveis",
                description: "O limite de armazenamento foi atingido para este registro. Re-anexe os arquivos.",
                variant: "destructive"
            });
            return;
        }
        
        // Re-normalizar vendedores ao reabrir histórico antigo (Migration Clean)
        const normalizedData = item.data.map(r => ({
            ...r,
            vendedor: normalizeVendedor(r.vendedor)
        }));

        const processedRows = detectarAdicionaisSuspeitos(normalizedData);
        setParsedRows(normalizedData);
        setVinculos(vincularTrocasUtils(processedRows));
        setStatus("success");
    }, [toast]);

    const clearHistory = useCallback(() => {
        setHistory([]);
        localStorage.removeItem("ri_happy_upload_history");
        toast({
            title: "Histórico limpo",
            description: "Todos os registros de uploads recentes foram removidos.",
        });
    }, [toast]);

    const fileStats = useMemo(() => {
        const total = parsedRows.length;
        const entradas = parsedRows.filter(r => (r.tpNF === 0 || r.is_devolucao) && !r.is_cancelada).length;
        const saidas = parsedRows.filter(r => r.tpNF === 1 && !r.is_devolucao && !r.is_cancelada).length;
        const canceladas = parsedRows.filter(r => r.is_cancelada).length;

        return { total, entradas, saidas, canceladas };
    }, [parsedRows]);

    return {
        parsedRows,
        vinculos,
        status,
        history,
        fileStats,
        processData,
        confirmDashboard,
        reset,
        reopenHistory,
        clearHistory
    };
}
