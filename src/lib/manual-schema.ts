import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// --- Esquemas Base (Não Recursivos) ---

const ParagraphBlockSchema = z.object({
    id: z.string().default(() => uuidv4()),
    type: z.literal('paragraph'),
    data: z.string().min(1, 'O conteúdo do parágrafo é obrigatório.'),
    imageToken: z.string().optional(), 
});

const TableBlockSchema = z.object({
    id: z.string().default(() => uuidv4()),
    type: z.literal('table'),
    title: z.string().default('Tabela de Dados'),
    headers: z.string().array().default([]),
    rows: z.string().array().array().default([]),
});

const ListBlockSchema = z.object({
    id: z.string().default(() => uuidv4()),
    type: z.literal('list'),
    title: z.string().optional(),
    items: z.string().array().min(1, 'A lista deve ter pelo menos um item.'),
});

const AlertBlockSchema = z.object({
    id: z.string().default(() => uuidv4()),
    type: z.literal('alert'),
    level: z.enum(['info', 'warning', 'danger']).default('info'),
    title: z.string().min(1, 'O título do alerta é obrigatório.'),
    data: z.string().min(1, 'O conteúdo do alerta é obrigatório.'),
});

// --- Esquema Recursivo e União (Estrutura Corrigida) ---

// Primeiro, definimos um tipo base que representa a estrutura aninhada.
// Isto ajuda o TypeScript a entender a forma recursiva.
interface CollapsibleBlock {
  id: string;
  type: 'collapsible';
  title: string;
  content: SectionContent[]; // A propriedade recursiva
}

// Criamos o schema para o bloco colapsável, usando z.lazy na propriedade 'content'
// e fazendo um 'cast' para o tipo que definimos acima.
const CollapsibleBlockSchema: z.ZodType<CollapsibleBlock> = z.object({
    id: z.string().default(() => uuidv4()),
    type: z.literal('collapsible'),
    title: z.string().min(1, 'O título do bloco colapsável é obrigatório.'),
    content: z.lazy(() => SectionContentSchema.array()),
});

// Agora, definimos a união final de todos os blocos
export const SectionContentSchema = z.discriminatedUnion('type', [
    ParagraphBlockSchema,
    TableBlockSchema,
    ListBlockSchema,
 AlertBlockSchema,
 CollapsibleBlockSchema,
]);

// Finalmente, exportamos o tipo inferido pelo Zod, que agora entende a estrutura completa
export type SectionContent = z.infer<typeof SectionContentSchema>;


// --- Esquema Principal do Manual ---

export const TabSchema = z.object({
    id: z.string().default(() => uuidv4()),
    title: z.string().min(1, 'O nome da aba é obrigatório.'),
    content: z.array(SectionContentSchema),
});

export type Tab = z.infer<typeof TabSchema>;

export const ManualDataSchema = z.object({
    title: z.string().default('Manual de Manutenção'),
    model: z.string().default('Modelo'),
    revision: z.string().optional(),
    date: z.string().optional(),
    abstract: z.string().optional(),
    tabs: z.array(TabSchema),
});

export type ManualData = z.infer<typeof ManualDataSchema>;

// --- DADOS INICIAIS ---

export const createInitialManualData = (): ManualData => ({
    title: 'Novo Manual de Manutenção',
    model: 'Modelo do Produto',
    revision: 'V1.0',
    date: new Date().toISOString().split('T')[0],
    abstract: 'Este é um novo manual. Use o painel de geração para começar.',
    tabs: [],
});