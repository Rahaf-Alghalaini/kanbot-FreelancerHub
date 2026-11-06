import { useQuery } from '@tanstack/react-query';
import { aiApi } from '../api/ai';

/** AI-5: GET /ai/status → "mock" or "ai". */
export const useAiStatus = () => useQuery({ queryKey: ['ai', 'status'], queryFn: aiApi.status, staleTime: 5 * 60_000 });
