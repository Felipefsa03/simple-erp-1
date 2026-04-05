import { useState, useCallback, useRef } from 'react';
import { toast } from '@/hooks/useShared';

/**
 * useAsyncAction — Universal hook for async actions with loading state,
 * anti-double-click guard, and automatic toast feedback.
 *
 * Usage:
 *   const { execute, isLoading } = useAsyncAction(
 *     () => saveData(payload),
 *     { successMessage: 'Salvo!', errorMessage: 'Falha ao salvar.' }
 *   );
 *
 *   <button onClick={execute} disabled={isLoading}>
 *     {isLoading ? 'Salvando...' : 'Salvar'}
 *   </button>
 */
export function useAsyncAction<T>(
  action: () => Promise<T> | T,
  options?: {
    onSuccess?: (result: T) => void;
    onError?: (err: Error) => void;
    successMessage?: string;
    errorMessage?: string;
  }
) {
  const [isLoading, setIsLoading] = useState(false);
  const guardRef = useRef(false);

  const execute = useCallback(async () => {
    if (guardRef.current) return; // anti double-click
    guardRef.current = true;
    setIsLoading(true);
    try {
      const result = await action();
      options?.onSuccess?.(result);
      if (options?.successMessage) toast(options.successMessage);
      return result;
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (options?.errorMessage ?? 'Ocorreu um erro. Tente novamente.');
      options?.onError?.(err instanceof Error ? err : new Error(message));
      toast(message, 'error');
    } finally {
      guardRef.current = false;
      setIsLoading(false);
    }
  }, [action, options]);

  return { execute, isLoading };
}
