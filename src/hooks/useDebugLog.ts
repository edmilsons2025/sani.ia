import { useCallback, useMemo } from 'react';

// Hook para controlar a exibição de logs de debug baseados na variável de ambiente.
// A variável deve ser definida como NEXT_PUBLIC_DEBUG_LOGS=true no .env.local

export const useDebugLog = (prefix: string = 'NCM_PROC') => {
    // Lê a variável de ambiente (garantindo que seja do Next.js com NEXT_PUBLIC_)
    const isDebugEnabled = useMemo(() => {
        // No navegador, a variável é acessada via process.env
        // Converte para booleano, ignorando case e espaços
        return process.env.NEXT_PUBLIC_DEBUG_LOGS?.toLowerCase().trim() === 'true';
    }, []);

    // Função que só loga se o debug estiver ativo
    const log = useCallback((message: string, ...data: unknown[]) => {
        if (isDebugEnabled) {
            // Usamos console.log para logs informativos
            console.log(`[${prefix}] ${message}`, ...data);
        }
    }, [isDebugEnabled, prefix]);

    // Função para logar avisos (sempre loga, mas com destaque)
    const warn = useCallback((message: string, ...data: unknown[]) => {
        // Usamos console.warn para alertas
        console.warn(`[${prefix} WARN] ${message}`, ...data);
    }, [prefix]);


    // Função para logar erros críticos (sempre loga, mas com prefixo)
    const error = useCallback((message: string, ...data: unknown[]) => {
        // Usamos console.error para erros
        console.error(`[${prefix} ERROR] ${message}`, ...data);
    }, [prefix]);

    return { log, warn, error, isDebugEnabled };
};
