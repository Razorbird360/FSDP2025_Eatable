import { Card, Image } from '@chakra-ui/react';
import ratingIcon from '../../../assets/hawker/rating.svg';

interface StallCardProps {
  name: string;
  cuisineType: string;
  rating: number;
  price: string;
  imageUrl: string;
}

const StallCard = ({ name, cuisineType, rating, price, imageUrl }: StallCardProps) => {
  return (
    <Card.Root className="overflow-hidden font-sans rounded-xl shadow-md border border-gray-200 h-full flex flex-col">
      <Image
        src={imageUrl}
        alt={name}
        className="w-full h-32 lg:h-56 object-cover flex-shrink-0"
      />
      <Card.Body className="p-3 lg:p-5 flex flex-col flex-grow pr-2 lg:pr-5">
        <div className="min-h-[2.5rem] lg:min-h-[3rem] mb-1 lg:mb-2">
          <h3 className="text-sm lg:text-lg font-normal text-gray-900 leading-tight line-clamp-2">{name}</h3>
        </div>

        <p className="text-xs lg:text-sm text-gray-600 mb-2 lg:mb-4">{cuisineType}</p>

        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-1 lg:gap-1.5">
            <img src={ratingIcon} alt="" className="w-3 h-3 lg:w-4 lg:h-4" />
            <span className="text-sm lg:text-base text-gray-600">{rating}</span>
          </div>
          <span className="text-base lg:text-lg font-semibold text-gray-900">{price}</span>
        </div>
      </Card.Body>
    </Card.Root>
  );
};

export default StallCard;
