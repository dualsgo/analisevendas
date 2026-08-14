
import { useState, useEffect, useMemo, useCallback } from "react";
import { DetailedSaleRow, VinculoTroca, UploadHistoryItem } from "@/lib/types";
import { detectarAdicionaisSuspeitos, vincularTrocas as vincularTrocasUtils } from "@/lib/analysis-utils";
import { format, parseISO, min, max } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
    saveCurrentSession,
    loadCurrentSession,
    clearCurrentSession,
    saveUploadHistory,
    loadUploadHistory
} from "@/lib/indexed-db";

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

    // Carrega histórico do IndexedDB (com fallback para localStorage se estiver vazio)
    useEffect(() => {
        let isMounted = true;
        async function fetchHistory() {
            try {
                const idbHistory = await loadUploadHistory();
                if (idbHistory && idbHistory.length > 0) {
                    if (isMounted) setHistory(idbHistory);
                    return;
                }
            } catch (e) {
                console.warn("Falha ao ler histórico do IndexedDB, tentando localStorage");
            }

            // Fallback localStorage
            const saved = localStorage.getItem("ri_happy_upload_history");
            if (saved && isMounted) {
                try {
                    const parsed = JSON.parse(saved);
                    setHistory(parsed);
                    // Migra para o IndexedDB
                    saveUploadHistory(parsed);
                } catch (e) {
                    console.error("Erro ao carregar histórico do localStorage");
                }
            }
        }
        fetchHistory();
        return () => { isMounted = false; };
    }, []);

    // Carrega sessão ativa do IndexedDB (com fallback para sessionStorage)
    useEffect(() => {
        let isMounted = true;
        async function fetchSession() {
            try {
                const session = await loadCurrentSession();
                if (session && session.rows && session.rows.length > 0) {
                    if (isMounted) {
                        const normalizedRows = session.rows.map((r: DetailedSaleRow) => ({
                            ...r,
                            vendedor: normalizeVendedor(r.vendedor)
                        }));
                        setParsedRows(normalizedRows);
                        setVinculos(session.links || []);
                        setStatus((session.currentStatus as ProcessingStatus) || "success");
                    }
                    return;
                }
            } catch (e) {
                console.warn("Falha ao recuperar sessão do IndexedDB, tentando sessionStorage");
            }

            // Fallback sessionStorage
            const sessionData = sessionStorage.getItem("ri_happy_current_session");
            if (sessionData && isMounted) {
                try {
                    const { rows, links, currentStatus } = JSON.parse(sessionData);
                    if (rows && rows.length > 0) {
                        const normalizedRows = rows.map((r: DetailedSaleRow) => ({
                            ...r,
                            vendedor: normalizeVendedor(r.vendedor)
                        }));
                        setParsedRows(normalizedRows);
                        setVinculos(links || []);
                        setStatus(currentStatus || "success");
                    }
                } catch (e) {
                    console.error("Erro ao recuperar sessão do sessionStorage");
                }
            }
        }
        fetchSession();
        return () => { isMounted = false; };
    }, []);

    // Salva a sessão ativa no IndexedDB e sessionStorage
    useEffect(() => {
        if (status === "success" || status === "analyzed") {
            saveCurrentSession(parsedRows, vinculos, status);
            try {
                sessionStorage.setItem("ri_happy_current_session", JSON.stringify({
                    rows: parsedRows,
                    links: vinculos,
                    currentStatus: status
                }));
            } catch (e) {
                // Quota excedida no sessionStorage é tolerada pois o IndexedDB já gravou com segurança
            }
        } else if (status === "idle") {
            clearCurrentSession();
            sessionStorage.removeItem("ri_happy_current_session");
        }
    }, [parsedRows, vinculos, status]);

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
            const updated = [newItem, ...prev.filter(item => item.id !== newItem.id)].slice(0, 10);
            saveUploadHistory(updated);
            try {
                localStorage.setItem("ri_happy_upload_history", JSON.stringify(
                    updated.map((item, idx) => idx === 0 ? item : { ...item, data: [] })
                ));
            } catch (e) {
                // Silently fallback on IndexedDB
            }
            return updated;
        });
    }, []);

    const processData = useCallback((rows: DetailedSaleRow[]) => {
        setStatus("processing");
        setTimeout(() => {
            try {
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
        }, 50);
    }, [addToHistory, toast]);

    const confirmDashboard = useCallback(() => {
        setStatus("success");
    }, []);

    const reset = useCallback(() => {
        setParsedRows([]);
        setVinculos([]);
        setStatus("idle");
        clearCurrentSession();
        sessionStorage.removeItem("ri_happy_current_session");
    }, []);

    const reopenHistory = useCallback((item: UploadHistoryItem) => {
        if (!item.data || item.data.length === 0) {
            toast({
                title: "Dados não disponíveis",
                description: "Este lote antigo não possui os dados salvos em memória. Por favor, reenvie o arquivo.",
                variant: "destructive"
            });
            return;
        }
        const normalizedData = item.data.map(r => ({
            ...r,
            vendedor: normalizeVendedor(r.vendedor)
        }));
        const processedRows = detectarAdicionaisSuspeitos(normalizedData);
        setParsedRows(processedRows);
        setVinculos(vincularTrocasUtils(processedRows));
        setStatus("success");
        saveCurrentSession(processedRows, vincularTrocasUtils(processedRows), "success");
    }, [toast]);

    const clearHistory = useCallback(() => {
        setHistory([]);
        saveUploadHistory([]);
        localStorage.removeItem("ri_happy_upload_history");
        toast({
            title: "Histórico limpo",
            description: "Todos os registros de uploads anteriores foram removidos.",
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
