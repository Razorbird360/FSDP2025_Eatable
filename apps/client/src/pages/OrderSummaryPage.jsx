import { useParams } from "react-router-dom";
import OrderSummary from "../features/orders/components/OrderSummary";

export default function OrderSummaryPage() {
  const { orderId } = useParams();
  return <OrderSummary orderId={orderId} />;
}

