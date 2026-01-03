export interface HawkerCentre {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  postalCode: string | null;
  latitude: number;
  longitude: number;
  distance: number; // km from reference point (e.g., Clementi MRT)
  stallCount: number; // actual count from database
}

export interface Stall {
  id: string;
  name: string;
  cuisineType: string | null;
  imageUrl: string | null; // from media uploads or stall.image_url
  maxPrepTimeMins?: number;
  menuItemCount: number;
}

export interface HawkerCentreWithStalls extends HawkerCentre {
  stalls: Stall[];
}
