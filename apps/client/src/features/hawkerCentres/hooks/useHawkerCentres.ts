import { useState, useEffect } from 'react';
import { getNearbyHawkerCentres, getRandomStalls } from '../api/hawkerCentres.api';
import type { HawkerCentreWithStalls } from '../types/hawker.types';

interface UseHawkerCentresResult {
  hawkerCentres: HawkerCentreWithStalls[];
  loading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch nearby hawker centres with random stalls
 * @param limit - Maximum number of hawker centres to fetch
 * @returns Object containing hawkerCentres data, loading state, and error
 */
export const useHawkerCentres = (limit = 10): UseHawkerCentresResult => {
  const [hawkerCentres, setHawkerCentres] = useState<HawkerCentreWithStalls[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch nearby hawker centres
        const centres = await getNearbyHawkerCentres(limit);

        // 2. For each centre, fetch 3 random stalls
        const centresWithStalls = await Promise.all(
          centres.map(async (centre) => {
            try {
              const stalls = await getRandomStalls(centre.slug, 3);
              return {
                ...centre,
                stalls
              };
            } catch (stallError) {
              // If fetching stalls fails for a centre, return it with empty stalls array
              console.error(`Failed to fetch stalls for ${centre.name}:`, stallError);
              return {
                ...centre,
                stalls: []
              };
            }
          })
        );

        setHawkerCentres(centresWithStalls);
      } catch (err) {
        console.error('Error fetching hawker centres:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch hawker centres'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [limit]);

  return { hawkerCentres, loading, error };
};
