import { useEffect, useState } from 'react';

type LocationStatus = 'pending' | 'granted' | 'denied';

export type UserCoords = {
  lat: number;
  lng: number;
};

export const useUserLocation = () => {
  const [coords, setCoords] = useState<UserCoords | null>(null);
  const [status, setStatus] = useState<LocationStatus>('pending');

  useEffect(() => {
    if (!navigator?.geolocation) {
      setStatus('denied');
      return;
    }

    let permissionStatus: PermissionStatus | null = null;
    let cancelled = false;

    const updateCoords = (position: GeolocationPosition) => {
      if (cancelled) return;
      setCoords({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      setStatus('granted');
    };

    const handleError = (error: GeolocationPositionError) => {
      if (cancelled) return;
      if (error?.code === error.PERMISSION_DENIED) {
        setStatus('denied');
      }
    };

    const requestPosition = () => {
      navigator.geolocation.getCurrentPosition(updateCoords, handleError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      });
    };

    const syncPermissionState = (state) => {
      if (cancelled) return;
      if (state === 'denied') {
        setStatus('denied');
        return;
      }
      setStatus('pending');
      requestPosition();
    };

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((perm) => {
          permissionStatus = perm;
          syncPermissionState(perm.state);
          permissionStatus.onchange = () => syncPermissionState(permissionStatus.state);
        })
        .catch(() => {
          requestPosition();
        });
    } else {
      requestPosition();
    }

    return () => {
      cancelled = true;
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, []);

  return { coords, status };
};
