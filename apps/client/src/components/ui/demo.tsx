import { useMemo, useState, useCallback, useRef } from 'react';
import {
  GridBody,
  DraggableContainer,
  GridItem,
} from '@/components/ui/infinite-drag-scroll';

type GalleryImage = {
  id?: string | number;
  src?: string;
  alt?: string;
};

type VotePopupProps = {
  image: GalleryImage;
  onClose: () => void;
  onVote: (imageId: string | number, voteType: 'up' | 'down') => void;
};

const VotePopup = ({ image, onClose, onVote }: VotePopupProps) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overscroll-none"
      onClick={onClose}
      style={{ touchAction: 'none' }}
    >
      <div
        className="relative max-w-md w-full bg-[#fbf7f0] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5 text-[#1c201d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image */}
        <div className="w-full h-48 md:h-64 overflow-hidden bg-[#e7dec8]">
          <img
            src={image.src}
            alt={image.alt}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-[#1c201d] mb-4 text-center">
            How do you rate this dish?
          </h3>

          {/* Vote buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                onVote(image.id!, 'up');
                onClose();
              }}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-brand hover:bg-brand/90 text-white rounded-xl font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
              <span>Upvote</span>
            </button>

            <button
              onClick={() => {
                onVote(image.id!, 'down');
                onClose();
              }}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-[#6b766b] hover:bg-[#5a645a] text-white rounded-xl font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
              </svg>
              <span>Downvote</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const fallbackImages: GalleryImage[] = [
  {
    id: 1,
    alt: 'Silhouette of a traditional Japanese pagoda at sunset',
    src: 'https://images.unsplash.com/photo-1512692723619-8b3e68365c9c?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 2,
    alt: 'Himeji Castle on a clear day',
    src: 'https://images.unsplash.com/photo-1491884662610-dfcd28f30cfb?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 3,
    alt: 'Red Car',
    src: 'https://images.unsplash.com/photo-1536901766856-5d45744cd180?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTA2fHxqYXBhbnxlbnwwfDF8MHx8fDA%3D',
  },
  {
    id: 4,
    alt: 'Woman in kimono standing beside a traditional Japanese house',
    src: 'https://images.unsplash.com/photo-1505069446780-4ef442b5207f?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 5,
    alt: 'Group of men in black suits inside a hallway',
    src: 'https://images.unsplash.com/photo-1554797589-7241bb691973?q=80&w=1936&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 6,
    alt: 'Crowd walking through a street decorated with red lanterns',
    src: 'https://images.unsplash.com/photo-1596713109885-c94bdfd7f19d?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 7,
    alt: 'Timelapse of traffic lights and buildings at night',
    src: 'https://images.unsplash.com/photo-1498036882173-b41c28a8ba34?q=80&w=1964&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 8,
    alt: 'Close-up of orange and black wooden torii gate posts',
    src: 'https://images.unsplash.com/photo-1585028281328-54ec883cd7cf?q=80&w=1935&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 9,
    alt: 'Historic building with brown and white stone exterior in daylight',
    src: 'https://images.unsplash.com/photo-1614003024056-e3ecbf8888f7?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 10,
    alt: 'Lantern glowing on a quiet street at night',
    src: 'https://images.unsplash.com/photo-1573455494057-12684d151bf4?q=80&w=1924&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 11,
    alt: 'View of Osaka Castle with clear sky backdrop',
    src: 'https://images.unsplash.com/photo-1575489129683-4f7d23379975?q=80&w=1935&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 12,
    alt: 'Pagoda silhouetted during golden hour',
    src: 'https://images.unsplash.com/photo-1512692723619-8b3e68365c9c?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 13,
    alt: 'Himeji Castle seen from a distance',
    src: 'https://images.unsplash.com/photo-1491884662610-dfcd28f30cfb?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 14,
    alt: 'Torii gate pillars in vibrant orange and black',
    src: 'https://images.unsplash.com/photo-1585028281328-54ec883cd7cf?q=80&w=1935&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 15,
    alt: 'Traditional Japanese home under daylight',
    src: 'https://images.unsplash.com/photo-1505069446780-4ef442b5207f?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 16,
    alt: 'Women wearing kimono beside wooden house',
    src: 'https://images.unsplash.com/photo-1505069446780-4ef442b5207f?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 17,
    alt: 'People passing under hanging red lanterns at dusk',
    src: 'https://images.unsplash.com/photo-1596713109885-c94bdfd7f19d?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 18,
    alt: 'Stepping stone path winding through lush forest',
    src: 'https://plus.unsplash.com/premium_photo-1673285285994-6bfff235db97?q=80&w=1936&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
];

type DemoOneProps = {
  images?: GalleryImage[];
  isLoading?: boolean;
};

const DemoOne = ({ images, isLoading = false }: DemoOneProps) => {
  const [failedImages, setFailedImages] = useState<Set<string | number>>(new Set());
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const clickStartPos = useRef<{ x: number; y: number } | null>(null);

  const gallery = useMemo(() => {
    const dataset = images?.length ? images : fallbackImages;
    return dataset
      .filter(
        (
          image,
        ): image is GalleryImage & Required<Pick<GalleryImage, 'src'>> =>
          Boolean(image?.src) && !failedImages.has(image.id ?? image.src),
      )
      .map((image, index) => ({
        id: image.id ?? `fallback-${index}`,
        alt: image.alt || 'Community upload',
        src: image.src,
      }));
  }, [images, failedImages]);

  const handleImageError = useCallback((imageId: string | number) => {
    setFailedImages((prev) => {
      const newSet = new Set(prev);
      newSet.add(imageId);
      return newSet;
    });
  }, []);

  const handleImageMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      clickStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
      clickStartPos.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleImageClick = useCallback((image: GalleryImage, e: React.MouseEvent | React.TouchEvent) => {
    if (!clickStartPos.current) return;

    let clientX: number, clientY: number;

    if ('changedTouches' in e) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const deltaX = Math.abs(clientX - clickStartPos.current.x);
    const deltaY = Math.abs(clientY - clickStartPos.current.y);

    // If mouse/touch moved less than 5px, consider it a click (not a drag)
    if (deltaX < 5 && deltaY < 5) {
      setSelectedImage(image);
    }

    clickStartPos.current = null;
  }, []);

  const handleVote = useCallback((imageId: string | number, voteType: 'up' | 'down') => {
    console.log(`Voted ${voteType} for image:`, imageId);
    // TODO: Implement API call to record vote
  }, []);

  const handleClosePopup = useCallback(() => {
    setSelectedImage(null);
  }, []);

  return (
    <div className="relative">
      <DraggableContainer
        variant="masonry"
        className="bg-[#fbf7f0]"
      >
        <GridBody>
          {gallery.map((image) => (
            <GridItem
              key={image.id}
              className="relative h-[13.5rem] w-36 md:h-96 md:w-64"
            >
              <div
                className="absolute inset-0 cursor-pointer touch-auto"
                onMouseDown={handleImageMouseDown}
                onClick={(e) => handleImageClick(image, e)}
                onTouchStart={handleImageMouseDown}
                onTouchEnd={(e) => handleImageClick(image, e)}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  className="pointer-events-none absolute h-full w-full object-cover select-none"
                  loading="lazy"
                  onError={() => handleImageError(image.id)}
                  draggable={false}
                />
              </div>
            </GridItem>
          ))}
        </GridBody>
      </DraggableContainer>

      {isLoading && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#fbf7f0]/95 text-center text-sm font-semibold text-[#1c201d]/80 backdrop-blur-sm">
          Loading community uploads…
        </div>
      )}

      {selectedImage && (
        <VotePopup
          image={selectedImage}
          onClose={handleClosePopup}
          onVote={handleVote}
        />
      )}
    </div>
  );
};

export { DemoOne };
