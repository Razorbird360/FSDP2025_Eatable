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
    <Card.Root className="overflow-hidden font-sans rounded-xl shadow-md border border-gray-200">
      <Image
        src={imageUrl}
        alt={name}
        className="w-full h-56 object-cover"
      />
      <Card.Body className="p-5">
        <div className="min-h-[3rem] mb-2">
          <h3 className="text-lg font-normal text-gray-900 leading-tight">{name}</h3>
        </div>

        <p className="text-sm text-gray-600 mb-4">{cuisineType}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <img src={ratingIcon} alt="" className="w-4 h-4" />
            <span className="text-base text-gray-600">{rating}</span>
          </div>
          <span className="text-lg font-semibold text-gray-900">{price}</span>
        </div>
      </Card.Body>
    </Card.Root>
  );
};

export default StallCard;
