"use client";

import React, { useState, useRef, useEffect } from "react";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Loader2, 
  MessageSquare, 
  Zap, 
  BrainCircuit,
  Trash2
} from "lucide-react";
import { aiSalesChat } from "@/ai/flows/ai-sales-chat-flow";
import { cn } from "@/lib/utils";

interface Message {
  role: 'user' | 'model';
  content: string;
}

interface AIChatProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

export function AIChat({ data, vinculos }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: "Olá! Sou o seu **Copiloto Estratégico**. Analisei todos os documentos que você subiu e estou pronto para tirar suas dúvidas sobre a performance da loja. O que quer saber hoje?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para o fim
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      // Preparar contexto para a IA
      const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
      const storeVenda = activeSales.reduce((acc, s) => acc + parseFloat(s.vNF), 0);
      const storeItens = activeSales.reduce((acc, s) => acc + parseFloat(s.itens_qtd), 0);
      const storeIdent = activeSales.filter(s => s.cpf_cnpj_dest).length;
      
      const vendors: Record<string, any> = {};
      activeSales.forEach(s => {
        const v = s.vendedor || "VENDEDOR";
        if (!vendors[v]) vendors[v] = { name: v, venda: 0, cupons: 0, itens: 0 };
        vendors[v].venda += parseFloat(s.vNF);
        vendors[v].cupons++;
        vendors[v].itens += parseFloat(s.itens_qtd);
      });

      const vendorSummary = Object.values(vendors).map(v => ({
        name: v.name,
        venda: v.venda.toFixed(2),
        pa: (v.itens / v.cupons).toFixed(2)
      }));

      const context = {
        storeSummary: {
          venda: storeVenda.toFixed(2),
          pa: (storeItens / activeSales.length || 0).toFixed(2),
          cadastros: ((storeIdent / activeSales.length || 0) * 100).toFixed(1),
          convPickup: "15.0" // Mock ou cálculo real se disponível
        },
        vendorSummary,
        complianceAlerts: [
          data.filter(s => s.status_auditoria?.includes("SUSPEITO")).length > 0 
            ? "Existem itens suspeitos de manipulação de PA detectados." 
            : "Nenhuma anomalia de PA identificada."
        ]
      };

      const response = await aiSalesChat({
        history: messages.map(m => ({ role: m.role, content: m.content })),
        userMessage: userMsg,
        context
      });

      setMessages(prev => [...prev, { role: 'model', content: response.text }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', content: "Ops, tive um probleminha para processar isso. Pode tentar perguntar de novo?" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] max-w-4xl mx-auto animate-in fade-in duration-500">
      {/* Header do Chat */}
      <div className="bg-white border-2 border-orange-100 rounded-t-[2rem] p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 p-2 rounded-xl text-white shadow-lg shadow-orange-200">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Chat Estratégico</h3>
            <p className="text-[10px] font-bold text-emerald-500 uppercase flex items-center gap-1">
              <Zap className="w-3 h-3 fill-current" /> Motor Genkit Online
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setMessages([messages[0]])}
          className="text-slate-300 hover:text-rose-500 rounded-full"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Área de Mensagens */}
      <Card className="flex-1 bg-slate-50/50 border-x-2 border-b-2 border-orange-100 rounded-none overflow-hidden flex flex-col relative">
        <ScrollArea className="flex-1 p-4 md:p-6">
          <div className="space-y-6">
            {messages.map((m, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "flex items-start gap-3 animate-in slide-in-from-bottom-2 duration-300",
                  m.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "p-2.5 rounded-xl shadow-sm shrink-0",
                  m.role === 'user' ? "bg-sky-500 text-white" : "bg-white border border-slate-100 text-orange-500"
                )}>
                  {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={cn(
                  "max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed",
                  m.role === 'user' 
                    ? "bg-sky-500 text-white rounded-tr-none shadow-lg shadow-sky-100" 
                    : "bg-white text-slate-700 rounded-tl-none border border-slate-100 shadow-sm"
                )}>
                  <div className="prose prose-slate prose-sm max-w-none prose-strong:text-inherit prose-p:m-0">
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-3 animate-pulse">
                <div className="bg-white border border-slate-100 p-2.5 rounded-xl text-orange-500 shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Solzinho está analisando os dados...</p>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 bg-white border-t border-slate-100">
          <div className="relative flex items-center gap-2">
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Pergunte sobre PA, vendedores, trocas..."
              className="flex-1 h-14 rounded-2xl border-slate-100 bg-slate-50 px-6 pr-14 text-sm font-medium focus-visible:ring-orange-500"
            />
            <Button 
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="absolute right-2 h-10 w-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-200"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-hide">
            <QuickQuestion label="Quem é o melhor vendedor?" onClick={setInput} />
            <QuickQuestion label="Quais os riscos de PA?" onClick={setInput} />
            <QuickQuestion label="Resumo do faturamento" onClick={setInput} />
          </div>
        </div>
      </Card>
    </div>
  );
}

function QuickQuestion({ label, onClick }: { label: string, onClick: (v: string) => void }) {
  return (
    <button 
      onClick={() => onClick(label)}
      className="whitespace-nowrap px-4 py-1.5 bg-orange-50 text-orange-600 rounded-full text-[10px] font-black uppercase border border-orange-100 hover:bg-orange-100 transition-colors"
    >
      {label}
    </button>
  );
}
