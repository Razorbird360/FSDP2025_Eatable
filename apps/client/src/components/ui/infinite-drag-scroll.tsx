import {
  animate,
  cubicBezier,
  motion,
  useMotionValue,
  wrap,
} from 'motion/react';
import {
  memo,
  useContext,
  useEffect,
  useRef,
  useState,
  createContext,
  type ReactNode,
} from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

type Variants = 'default' | 'masonry' | 'polaroid';

const GridVariantContext = createContext<Variants | undefined>(undefined);

const rowVariants = {
  initial: { opacity: 0, scale: 0.3 },
  animate: () => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: Math.random() * 0.3,
      duration: 0.6,
      ease: cubicBezier(0.18, 0.71, 0.11, 1),
    },
  }),
};

export const DraggableContainer = ({
  className,
  children,
  variant,
}: {
  className?: string;
  children: ReactNode;
  variant?: Variants;
}) => {
  const ref = useRef<HTMLDivElement | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const [isDragging, setIsDragging] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const handleIsDragging = () => setIsDragging(true);
  const handleIsNotDragging = () => setIsDragging(false);

  useEffect(() => {
    const initializePosition = () => {
      const container = ref.current;
      if (!container) return;

      const { width, height } = container.getBoundingClientRect();

      // Initialize position to center content on screen
      if (!isInitialized && width > 0 && height > 0) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Center the grid on initial load
        const initialX = Math.min(0, (viewportWidth - width) / 2);
        const initialY = Math.min(0, (viewportHeight - height) / 2);

        x.set(initialX);
        y.set(initialY);
        setIsInitialized(true);
      }
    };

    // Try to initialize immediately
    initializePosition();

    // Also try after a short delay in case content is still loading
    const timer = setTimeout(initializePosition, 100);

    const container = ref.current?.getBoundingClientRect();
    if (!container) return;

    const { width, height } = container;

    const xDrag = x.on('change', (latest) => {
      const wrappedX = wrap(-(width / 2), 0, latest);
      x.set(wrappedX);
    });

    const yDrag = y.on('change', (latest) => {
      const wrappedY = wrap(-(height / 2), 0, latest);
      y.set(wrappedY);
    });

    const handleWheelScroll = (event: WheelEvent) => {
      if (!isDragging) {
        animate(y, y.get() - event.deltaY * 2.7, {
          type: 'tween',
          duration: 1.2,
          ease: cubicBezier(0.18, 0.71, 0.11, 1),
        });
      }
    };

    const handleResize = () => {
      // Ensure content stays visible on resize
      const currentX = x.get();
      const currentY = y.get();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Adjust if content has moved too far off screen
      if (currentX < -(width - viewportWidth / 2)) {
        x.set(Math.min(0, (viewportWidth - width) / 2));
      }
      if (currentY < -(height - viewportHeight / 2)) {
        y.set(Math.min(0, (viewportHeight - height) / 2));
      }
    };

    window.addEventListener('wheel', handleWheelScroll);
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      xDrag();
      yDrag();
      window.removeEventListener('wheel', handleWheelScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [x, y, isDragging, isInitialized]);

  return (
    <GridVariantContext.Provider value={variant}>
      <div className="h-screen overflow-hidden bg-[#fbf7f0] touch-none">
        <motion.div className="h-screen overflow-hidden">
          <motion.div
            className={cn(
              'grid h-fit w-fit cursor-grab grid-cols-[repeat(2,1fr)] bg-[#fbf7f0] active:cursor-grabbing will-change-transform touch-none',
              className,
            )}
            drag
            dragMomentum
            dragTransition={{
              timeConstant: 200,
              power: 0.28,
              restDelta: 0,
              bounceStiffness: 0,
            }}
            dragElastic={0}
            onMouseDown={handleIsDragging}
            onMouseUp={handleIsNotDragging}
            onMouseLeave={handleIsNotDragging}
            onTouchStart={handleIsDragging}
            onTouchEnd={handleIsNotDragging}
            onTouchCancel={handleIsNotDragging}
            style={{ x, y }}
            ref={ref}
          >
            {children}
          </motion.div>
        </motion.div>
      </div>
    </GridVariantContext.Provider>
  );
};

export const GridItem = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  const variant = useContext(GridVariantContext);

  const gridItemStyles = cva(
    'overflow-hidden hover:cursor-pointer w-full h-full will-change-transform',
    {
      variants: {
        variant: {
          default: 'rounded-sm',
          masonry: 'even:mt-[60%] rounded-sm ',
          polaroid:
            'border-10 border-b-28 border-white shadow-xl even:rotate-3 odd:-rotate-2 hover:rotate-0 transition-transform ease-out duration-300 even:mt-[60%]',
        },
      },
      defaultVariants: {
        variant: 'default',
      },
    },
  );

  return (
    <motion.div
      className={cn(gridItemStyles({ variant }), className)}
      variants={rowVariants}
      initial="initial"
      animate="animate"
    >
      {children}
    </motion.div>
  );
};

export const GridBody = memo(
  ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => {
    const variant = useContext(GridVariantContext);

    const gridBodyStyles = cva('grid grid-cols-[repeat(6,1fr)] h-fit w-fit', {
      variants: {
        variant: {
          default: 'gap-14 p-7 md:gap-28 md:p-14',
          masonry: 'gap-x-14 px-7 md:gap-x-28 md:px-14',
          polaroid: 'gap-x-14 px-7 md:gap-x-28 md:px-14',
        },
      },
      defaultVariants: {
        variant: 'default',
      },
    });

    return (
      <>
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className={cn(gridBodyStyles({ variant }), className)}
          >
            {children}
          </div>
        ))}
      </>
    );
  },
);

GridBody.displayName = 'GridBody';
