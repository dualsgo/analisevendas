
import { useState, useEffect, useMemo, useCallback } from "react";
import { DetailedSaleRow, VinculoTroca, UploadHistoryItem } from "@/lib/types";
import { detectarAdicionaisSuspeitos, vincularTrocas as vincularTrocasUtils } from "@/lib/analysis-utils";
import { format, parseISO, min, max } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type ProcessingStatus = "idle" | "processing" | "analyzed" | "success" | "syncing" | "loading_db";

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
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [lastSyncedKey, setLastSyncedKey] = useState<string | null>(null);
    const [history, setHistory] = useState<UploadHistoryItem[]>([]);
    const [availablePeriods, setAvailablePeriods] = useState<{ year: string, month: string }[]>([]);
    const { toast } = useToast();

    // Load history and auth from storage on mount
    useEffect(() => {
        const auth = sessionStorage.getItem("ri_happy_auth");
        if (auth === "true") setIsAuthenticated(true);

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
        setLastSyncedKey(null);
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
        const normalizedData = item.data.map(r => ({
            ...r,
            vendedor: normalizeVendedor(r.vendedor)
        }));
        const processedRows = detectarAdicionaisSuspeitos(normalizedData);
        setParsedRows(processedRows);
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

    const login = useCallback(async (key: string) => {
        try {
            const response = await fetch("/api/auth/check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setIsAuthenticated(true);
                    sessionStorage.setItem("ri_happy_auth", "true");
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error("Auth error:", error);
            return false;
        }
    }, []);

    const logout = useCallback(() => {
        setIsAuthenticated(false);
        sessionStorage.removeItem("ri_happy_auth");
        reset();
    }, [reset]);

    const fetchPeriods = useCallback(async () => {
        try {
            const response = await fetch("/api/sales/periods");
            if (response.ok) {
                const data = await response.json();
                setAvailablePeriods(data.periods || []);
            }
        } catch (error) {
            console.error("Fetch periods error:", error);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) fetchPeriods();
    }, [isAuthenticated, fetchPeriods]);

    const syncToCloud = useCallback(async () => {
        if (parsedRows.length === 0) return;
        setStatus("syncing");
        try {
            const response = await fetch("/api/sales/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sales: parsedRows, links: vinculos })
            });
            if (!response.ok) throw new Error("Falha na sincronização");

            // Create a unique key for the current session to mark as synced
            const syncKey = parsedRows.length > 0 ? parsedRows[0].chave : "synced";
            setLastSyncedKey(syncKey);

            toast({
                title: "Sincronizado com Sucesso",
                description: `${parsedRows.length} registros salvos no MongoDB Atlas.`,
            });
            fetchPeriods();
        } catch (error) {
            console.error("Sync error:", error);
            toast({
                title: "Erro de Sincronização",
                description: "Não foi possível salvar os dados no banco de dados.",
                variant: "destructive"
            });
        } finally {
            setStatus("success");
        }
    }, [parsedRows, vinculos, toast, fetchPeriods]);

    const loadPeriod = useCallback(async (year: string, month: string) => {
        setStatus("loading_db");
        try {
            const response = await fetch(`/api/sales/load?year=${year}&month=${month}`);
            if (!response.ok) throw new Error("Falha ao carregar dados");
            const { sales, links } = await response.json();
            if (sales && sales.length > 0) {
                const normalizedRows = sales.map((r: DetailedSaleRow) => ({
                    ...r,
                    vendedor: normalizeVendedor(r.vendedor)
                }));
                const withSuspects = detectarAdicionaisSuspeitos(normalizedRows);
                setParsedRows(withSuspects);
                setVinculos(links || []);
                setStatus("success");
                toast({ title: "Dados Carregados", description: `Período ${month}/${year} carregado com sucesso.` });
            } else {
                toast({ title: "Nenhum dado encontrado", description: "Não há registros para este período." });
                setStatus("idle");
            }
        } catch (error) {
            console.error("Load error:", error);
            toast({ title: "Erro ao carregar", description: "Ocorreu um problema.", variant: "destructive" });
            setStatus("idle");
        }
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
        clearHistory,
        syncToCloud,
        loadPeriod,
        availablePeriods,
        fetchPeriods,
        isAuthenticated,
        login,
        logout,
        lastSyncedKey
    };
}
