import type { HawkerCentre, Stall } from '../types/hawker.types';

// Clementi MRT coordinates
const CLEMENTI_MRT_LAT = 1.315528101289874;
const CLEMENTI_MRT_LNG = 103.76508385110719;

const API_ROOT =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
const API_BASE_URL = `${API_ROOT.replace(/\/$/, '')}/hawker-centres`;

type Coords = { lat: number; lng: number };

/**
 * Fetch nearby hawker centres sorted by distance from provided coordinates
 * @param limit - Maximum number of hawker centres to fetch (default: 10)
 * @param coords - Optional coordinates (defaults to Clementi MRT)
 * @returns Promise<HawkerCentre[]>
 */
export async function getNearbyHawkerCentres(
  limit = 10,
  coords?: Coords
): Promise<HawkerCentre[]> {
  const lat = coords?.lat ?? CLEMENTI_MRT_LAT;
  const lng = coords?.lng ?? CLEMENTI_MRT_LNG;
  const response = await fetch(
    `${API_BASE_URL}?lat=${lat}&lng=${lng}&limit=${limit}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch hawker centres: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch random stalls for a specific hawker centre
 * @param slug - Hawker centre slug
 * @param limit - Number of random stalls to fetch (default: 3)
 * @returns Promise<Stall[]>
 */
export async function getRandomStalls(slug: string, limit = 3): Promise<Stall[]> {
  const response = await fetch(`${API_BASE_URL}/${slug}/stalls/random?limit=${limit}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch stalls for ${slug}: ${response.statusText}`);
  }

  return response.json();
}
