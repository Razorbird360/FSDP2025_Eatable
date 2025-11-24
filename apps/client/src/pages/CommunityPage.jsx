import { useEffect, useState } from 'react';
import { DemoOne } from '@/components/ui/demo';
import api from '@/lib/api';

const MAX_CENTRES = 4;
const MAX_STALLS_PER_CENTRE = 4;
const MAX_MENU_ITEMS_PER_STALL = 4;
const MAX_UPLOADS = 48;

function CommunityPage() {
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchUploads() {
      setGalleryLoading(true);

      try {
        const centresResponse = await api.get(`/hawker-centres?limit=${MAX_CENTRES}`);
        const centres = Array.isArray(centresResponse?.data) ? centresResponse.data : [];
        const centreIds = centres
          .map((centre) => centre.id)
          .filter(Boolean)
          .slice(0, MAX_CENTRES);

        if (!centreIds.length) {
          return;
        }

        const stallResponses = await Promise.all(
          centreIds.map(async (centreId) => {
            try {
              const res = await api.get(`/hawker-centres/stalls/${centreId}`);
              return Array.isArray(res?.data) ? res.data : [];
            } catch (error) {
              console.error(`Failed to fetch stalls for hawker ${centreId}`, error);
              return [];
            }
          }),
        );

        const uploads = [];
        stallResponses.forEach((stalls) => {
          (Array.isArray(stalls) ? stalls : [])
            .slice(0, MAX_STALLS_PER_CENTRE)
            .forEach((stall) => {
              (stall.menuItems ?? [])
                .slice(0, MAX_MENU_ITEMS_PER_STALL)
                .forEach((menuItem) => {
                  const topUpload = menuItem.mediaUploads?.[0];
                  if (topUpload?.imageUrl) {
                    uploads.push({
                      id: topUpload.id ?? `${menuItem.id}-${topUpload.imageUrl}`,
                      src: topUpload.imageUrl,
                      alt: menuItem.name || stall.name || 'Community upload',
                    });
                  }
                });
            });
        });

        if (!cancelled) {
          const deduped = [];
          const seen = new Set();

          uploads.forEach((upload) => {
            if (!upload?.src) return;
            const dedupeKey = upload.id || upload.src;
            if (seen.has(dedupeKey)) return;
            seen.add(dedupeKey);
            deduped.push(upload);
          });

          const limited = deduped.slice(0, MAX_UPLOADS);
          setGalleryImages(limited);
        }
      } catch (error) {
        console.error('Failed to fetch community uploads', error);
      } finally {
        if (!cancelled) {
          setGalleryLoading(false);
        }
      }
    }

    fetchUploads();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DemoOne
      images={galleryImages}
      isLoading={galleryLoading}
    />
  );
}

export default CommunityPage;
