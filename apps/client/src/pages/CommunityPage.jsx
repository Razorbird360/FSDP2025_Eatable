import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DemoOne } from '@/components/ui/demo';
import api from '@/lib/api';

const highlightCards = [
  {
    title: 'Authentic visuals',
    description:
      'See hawker dishes exactly how neighbours photographed them the same day you visit.',
    stat: '9,200+',
    statLabel: 'photos verified by locals',
  },
  {
    title: 'Trust the crowd',
    description:
      'Every submission is tagged with stall metadata so you always know where a dish lives.',
    stat: '320',
    statLabel: 'stalls with living galleries',
  },
  {
    title: 'Boost your stall',
    description:
      'Stall owners get instant access to curated visuals they can reuse on their menus.',
    stat: '45%',
    statLabel: 'faster menu refresh rate',
  },
];

const MAX_CENTRES = 4;
const MAX_STALLS_PER_CENTRE = 4;
const MAX_MENU_ITEMS_PER_STALL = 4;
const MAX_UPLOADS = 48;

function CommunityPage() {
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [galleryNotice, setGalleryNotice] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchUploads() {
      setGalleryLoading(true);
      setGalleryNotice('');

      try {
        const centresResponse = await api.get(`/hawker-centres?limit=${MAX_CENTRES}`);
        const centres = Array.isArray(centresResponse?.data) ? centresResponse.data : [];
        const centreIds = centres
          .map((centre) => centre.id)
          .filter(Boolean)
          .slice(0, MAX_CENTRES);

        if (!centreIds.length) {
          if (!cancelled) {
            setGalleryNotice('Share a dish pic from the Home page to seed the community gallery.');
          }
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

          if (!limited.length) {
            setGalleryNotice('No approved uploads yet. Share the first one from the Home page!');
          }
        }
      } catch (error) {
        console.error('Failed to fetch community uploads', error);
        if (!cancelled) {
          setGalleryNotice('Live uploads appear once the Eatable API is up. Showing demo shots meanwhile.');
        }
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
    <div className="flex min-h-screen flex-col bg-[#fbf7f0] text-[#1c201d]">
      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 pb-10 pt-20 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <p className="text-xs uppercase tracking-[0.35em] text-[#6b766b]">Community</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-brand md:text-5xl">
            Drag through a living wall of neighbour-sourced hawker food memories.
          </h1>
          <p className="text-base text-[#4A554B] md:text-lg">
            Explore the freshest uploads from supper clubs, families, and stall owners across
            Singapore. Every tile is draggable so you can wander endlessly through delicious
            inspiration without losing your place.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/home"
              className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(33,66,27,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_35px_rgba(33,66,27,0.25)]"
            >
              Share a photo
            </Link>
            <a
              href="#community-gallery"
              className="rounded-full border border-[#d7cebb] bg-white px-6 py-3 text-sm font-semibold text-brand transition hover:-translate-y-0.5 hover:border-brand/40"
            >
              Jump to gallery
            </a>
          </div>
        </div>

        <div className="grid gap-4 rounded-3xl border border-[#e7dec8] bg-white p-6 shadow-[0_30px_80px_rgba(25,44,23,0.08)]">
          {highlightCards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-[#efe5d1] bg-[#fbf7f0] p-5 transition hover:border-brand/30"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-[#9bc394]">{card.statLabel}</p>
              <p className="mt-2 text-3xl font-semibold text-brand">{card.stat}</p>
              <h3 className="mt-4 text-lg font-semibold text-[#253224]">{card.title}</h3>
              <p className="mt-2 text-sm text-[#5e6a5d]">{card.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="community-gallery" className="w-full px-4 pb-16">
        <div className="mx-auto w-full max-w-6xl rounded-[32px] border border-[#ecdfc8] bg-white/90 p-4 shadow-[0_35px_90px_rgba(25,44,23,0.08)]">
          <div className="rounded-[28px] border border-[#ede3cf] bg-[#f4ede1]/80 p-4">
            <DemoOne
              images={galleryImages}
              isLoading={galleryLoading}
            />
          </div>
          {galleryNotice ? (
            <p className="mt-4 text-center text-xs font-medium text-[#6a7665]">{galleryNotice}</p>
          ) : null}
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 pb-24">
        <div className="rounded-3xl border border-[#e1d6c3] bg-white p-8 text-sm text-[#4a554b] shadow-[0_25px_60px_rgba(25,44,23,0.08)]">
          <h2 className="text-2xl font-semibold text-brand">Ready to upload?</h2>
          <p className="mt-3 text-base">
            Head back to the Home page where the green{' '}
            <span className="font-semibold text-brand">"Share a photo"</span> button sits close to
            the hero banner. That shortcut launches the full media upload flow in seconds.
          </p>
          <Link
            to="/home"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_15px_35px_rgba(33,66,27,0.25)]"
          >
            Go to Home
          </Link>
        </div>
      </section>
    </div>
  );
}

export default CommunityPage;
