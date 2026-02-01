export interface HawkerCentre {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  postalCode: string | null;
  latitude: number;
  longitude: number;
  imageUrl?: string | null;
  distance: number; // km from reference point (e.g., Clementi MRT)
  stallCount: number; // actual count from database
}

export interface Stall {
  id: string;
  name: string;
  cuisineType: string | null;
  imageUrl: string | null; // from media uploads or stall.image_url
  dietaryTags?: string[];
  maxPriceCents?: number;
  maxPrepTimeMins?: number;
  menuItemCount: number;
  totalUpvotes?: number;
}

export interface HawkerCentreWithStalls extends HawkerCentre {
  stalls: Stall[];
}
