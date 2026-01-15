import { Card, Image } from '@chakra-ui/react';
import { TrendingUp } from 'lucide-react';
import placeholderImage from '../../../assets/hawker/hawker-default.jpg';

interface StallCardProps {
  name: string;
  cuisineType: string | null;
  imageUrl: string | null;
}

const StallCard = ({ name, cuisineType, imageUrl }: StallCardProps) => {
  // Hardcoded values as per requirements
  const rating = 201;

  // Use placeholder image if imageUrl is null
  const displayImage = imageUrl || placeholderImage;

  // Fallback to "Local" if cuisineType is null
  const displayCuisine = cuisineType || 'Local';
  return (
    <Card.Root className="overflow-hidden font-sans rounded-xl shadow-md border border-gray-200 h-full flex flex-col">
      <Image
        src={displayImage}
        alt={name}
        className="w-full h-32 lg:h-56 object-cover flex-shrink-0"
      />
      <Card.Body className="p-3 lg:p-4 pb-2 lg:pb-3 flex flex-col flex-grow pr-2 lg:pr-4">
        <div className="min-h-[2.5rem] lg:min-h-[3rem] mb-1 lg:mb-2">
          <h3 className="text-sm lg:text-lg font-normal text-gray-900 leading-tight line-clamp-2">{name}</h3>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs lg:text-sm text-gray-600">{displayCuisine}</p>
          <div className="flex items-center gap-1 lg:gap-1.5">
            <TrendingUp className="w-3 h-3 lg:w-4 lg:h-4 text-gray-500" aria-hidden="true" />
            <span className="text-sm lg:text-base text-gray-600">{rating}</span>
          </div>
        </div>
      </Card.Body>
    </Card.Root>
  );
};

export default StallCard;
