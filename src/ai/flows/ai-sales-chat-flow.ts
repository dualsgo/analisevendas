'use server';
/**
 * @fileOverview Um fluxo Genkit para chat interativo sobre os dados de vendas.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MessageSchema = z.object({
  role: z.enum(['user', 'model', 'system']),
  content: z.string(),
});

const AISalesChatInputSchema = z.object({
  history: z.array(MessageSchema).describe('Histórico da conversa.'),
  userMessage: z.string().describe('A pergunta atual do usuário.'),
  context: z.object({
    storeSummary: z.any().describe('Resumo consolidado da loja.'),
    vendorSummary: z.array(z.any()).describe('Resumo por vendedor.'),
    complianceAlerts: z.array(z.string()).describe('Alertas de auditoria identificados.'),
  }),
});

export type AISalesChatInput = z.infer<typeof AISalesChatInputSchema>;

const AISalesChatOutputSchema = z.object({
  text: z.string().describe('A resposta da IA.'),
});

export async function aiSalesChat(input: AISalesChatInput) {
  return aiSalesChatFlow(input);
}

const aiSalesChatFlow = ai.defineFlow(
  {
    name: 'aiSalesChatFlow',
    inputSchema: AISalesChatInputSchema,
    outputSchema: AISalesChatOutputSchema,
  },
  async (input) => {
    const { history, userMessage, context } = input;

    const systemPrompt = `Você é o "Solzinho Estrategista", um consultor de negócios especialista em operações de varejo da Ri Happy.
Sua missão é ajudar o gerente da loja a interpretar os dados de vendas, auditoria de PA, trocas e retiradas online.

CONTEXTO ATUAL DA LOJA:
- Faturamento Total: R$ ${context.storeSummary.venda}
- PA Global: ${context.storeSummary.pa}
- Taxa de Identificação (CPF): ${context.storeSummary.cadastros}%
- Conversão de Pickup: ${context.storeSummary.convPickup}%

ALERTAS DE AUDITORIA:
${context.complianceAlerts.length > 0 ? context.complianceAlerts.join('\n') : 'Nenhum alerta crítico detectado.'}

RANKING DE VENDEDORES (TOP 3):
${context.vendorSummary.slice(0, 3).map((v: any) => `- ${v.name}: R$ ${v.venda} (PA: ${v.pa})`).join('\n')}

DIRETRIZES DE RESPOSTA:
1. Seja direto, profissional e use um tom encorajador (estilo Ri Happy).
2. Se o usuário perguntar sobre performance, cite nomes específicos de vendedores com base no contexto.
3. Se houver alertas de Auditoria de PA (itens de 0,01), foque em como corrigir isso.
4. Use markdown para formatação (negrito, listas).
5. Se não souber algo com base nos dados, peça para o usuário olhar a aba específica do dashboard.`;

    const response = await ai.generate({
      system: systemPrompt,
      messages: history.map(m => ({ role: m.role, content: [{ text: m.content }] })),
      prompt: userMessage,
    });

    return { text: response.text };
  }
);
