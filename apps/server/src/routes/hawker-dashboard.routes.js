import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { hawkerDashboardController } from "../controllers/hawker-dashboard.controller.js";
import {
  getHawkerOrders,
  acceptOrder,
  setOrderItemPrepared,
  markOrderReady,
  collectOrderByToken,
} from "../controllers/hawkerOrders.controller.js";

const router = Router();

router.get("/dashboard", authMiddleware, hawkerDashboardController.getDashboard);
router.get(
  "/dashboard/activity",
  authMiddleware,
  hawkerDashboardController.getActivity
);
router.get("/dashboard/dishes", authMiddleware, hawkerDashboardController.getDishes);
router.patch(
  "/dashboard/dishes/:menuItemId",
  authMiddleware,
  hawkerDashboardController.updateDish
);
router.patch(
  "/dashboard/dishes/:menuItemId/remove",
  authMiddleware,
  hawkerDashboardController.removeDish
);
router.delete(
  "/dashboard/dishes/:menuItemId",
  authMiddleware,
  hawkerDashboardController.deleteDish
);

// hawker orders routes
router.get("/orders", authMiddleware, getHawkerOrders);
router.patch("/orders/:orderId/accept", authMiddleware, acceptOrder);
router.patch(
  "/orders/:orderId/items/:orderItemId/prepared",
  authMiddleware,
  setOrderItemPrepared
);
router.patch("/orders/:orderId/ready", authMiddleware, markOrderReady);
router.post("/orders/:orderId/collect", authMiddleware, collectOrderByToken);

export default router;
