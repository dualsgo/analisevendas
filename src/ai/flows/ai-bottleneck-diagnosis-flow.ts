'use server';
/**
 * @fileOverview Fluxo Genkit para diagnóstico automático de gargalos operacionais.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const BottleneckInputSchema = z.object({
  metrics: z.object({
    pa: z.number(),
    tkm: z.number(),
    convPickup: z.number(),
    percDesconto: z.number(),
    percCancelamento: z.number(),
    percIdentificacao: z.number(),
    vendaTotal: z.number(),
  }),
  trends: z.array(z.string()).describe('Tendências identificadas (ex: PA caindo, Desconto subindo)'),
});

export type BottleneckInput = z.infer<typeof BottleneckInputSchema>;

const BottleneckOutputSchema = z.object({
  classification: z.enum(['TRAFEGO', 'ARGUMENTACAO', 'MARGEM', 'OPERACIONAL', 'CONVERSAO_PICKUP']),
  diagnosis: z.string().describe('Explicação detalhada do gargalo.'),
  priorityAction: z.string().describe('Ação prioritária para o gestor.'),
  riskLevel: z.enum(['BAIXO', 'MEDIO', 'ALTO', 'CRITICO']),
});

export async function aiBottleneckDiagnosis(input: BottleneckInput) {
  return aiBottleneckDiagnosisFlow(input);
}

const aiBottleneckDiagnosisFlow = ai.defineFlow(
  {
    name: 'aiBottleneckDiagnosisFlow',
    inputSchema: BottleneckInputSchema,
    outputSchema: BottleneckOutputSchema,
  },
  async (input) => {
    const { metrics, trends } = input;

    const systemPrompt = `Você é um Analista Master de Varejo da Ri Happy. 
Sua tarefa é diagnosticar o "Principal Limitador" do mês com base nos KPIs fornecidos.

CLASSIFICAÇÕES POSSÍVEIS:
- TRAFEGO: Venda baixa com PA/TKM bons (falta gente na loja).
- ARGUMENTACAO: PA baixo e muitas vendas de 1 item.
- MARGEM: Desconto muito acima da média sem retorno proporcional em TKM.
- CONVERSAO_PICKUP: Muitas retiradas site mas pouquíssimos adicionais presenciais.
- OPERACIONAL: Alto cancelamento ou trocas com perda de valor.

KPIs ATUAIS:
- PA: ${metrics.pa}
- TKM: R$ ${metrics.tkm}
- Conv. Pickup: ${metrics.convPickup}%
- Desconto Médio: ${metrics.percDesconto}%
- Cancelamento: ${metrics.percCancelamento}%

TENDÊNCIAS:
${trends.join('\n')}

Responda em JSON estruturado conforme o schema. Seja direto, executivo e focado em lucro e eficiência.`;

    const response = await ai.generate({
      system: systemPrompt,
      prompt: "Analise os dados e identifique o gargalo principal.",
    });

    const output = response.output as any;
    return output || { 
      classification: 'ARGUMENTACAO', 
      diagnosis: 'Não foi possível determinar.', 
      priorityAction: 'Revisar KPIs manualmente.',
      riskLevel: 'MEDIO'
    };
  }
);
