import crypto from "crypto";
import prisma from "../lib/prisma.js";

// ─────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────
function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function toCents(n) {
  const x = Number(n ?? 0);
  return Number.isFinite(x) ? Math.round(x) : 0;
}

function calcSubtotalCents(orderItems) {
  return orderItems.reduce((acc, it) => {
    const price = toCents(it?.menuItem?.priceCents);
    const qty = Number(it?.quantity ?? 1);
    return acc + price * qty;
  }, 0);
}

// If you already store these in DB, use those fields.
// If not, these defaults will show 0 until you implement them.
function getFeesAndTotals(order, subtotalCents) {
  const serviceFeeCents = toCents(
    order?.serviceFeeCents ??
      order?.service_fee_cents ??
      order?.serviceChargeCents ??
      order?.service_charge_cents ??
      0
  );

  const voucherCents = toCents(
    order?.voucherCents ??
      order?.voucher_cents ??
      order?.discountCents ??
      order?.discount_cents ??
      0
  );

  const totalCents = toCents(
    order?.totalCents ??
      order?.total_cents ??
      (subtotalCents + serviceFeeCents - voucherCents)
  );

  return { serviceFeeCents, voucherCents, totalCents };
}

async function getDbUserOrThrow(req) {
  const email = req.user?.email;
  if (!email) {
    const err = new Error("Auth user missing email");
    err.status = 401;
    throw err;
  }

  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true },
  });

  if (!dbUser) {
    const err = new Error("User not found in database");
    err.status = 401;
    throw err;
  }

  return dbUser;
}

async function assertHawkerAndGetOwnedStallIds(req) {
  const dbUser = await getDbUserOrThrow(req);

  if (dbUser.role !== "hawker") {
    const err = new Error("Forbidden: hawker only");
    err.status = 403;
    throw err;
  }

  const stalls = await prisma.stall.findMany({
    where: { ownerId: dbUser.id },
    select: { id: true },
  });

  const stallIds = stalls.map((s) => s.id);

  if (stallIds.length === 0) {
    const err = new Error("No stall found for this hawker");
    err.status = 403;
    throw err;
  }

  return { dbUser, stallIds };
}

function computeDefaultEstimateMinutes(orderItems) {
  // sum(prepTimeMins * qty) + 3
  let total = 0;
  for (const oi of orderItems) {
    const prep = Number(oi.menuItem?.prepTimeMins ?? 0);
    const qty = Number(oi.quantity ?? 1);
    total += prep * qty;
  }
  total += 3;
  return Math.max(1, total);
}

// ─────────────────────────────────────────────
// controllers
// ─────────────────────────────────────────────

export async function getHawkerOrders(req, res) {
  try {
    const { stallIds } = await assertHawkerAndGetOwnedStallIds(req);

    const orders = await prisma.order.findMany({
      where: {
        stallId: { in: stallIds },
        status: { in: ["PAID", "COMPLETED"] },
        orderStatus: { in: ["awaiting", "preparing", "ready"] },
      },
      orderBy: { createdAt: "desc" },
      include: {
        stall: { select: { id: true, name: true, location: true } },
        orderItems: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                prepTimeMins: true,
                imageUrl: true,
                priceCents: true,
                mediaUploads: {
                  where: { validationStatus: "approved" },
                  orderBy: { createdAt: "desc" },
                  take: 1,
                  select: { imageUrl: true },
                },
              },
            },
          },
        },
      },
    });

    const mapped = orders.map((o) => {
      const defaultEstimateMinutes = computeDefaultEstimateMinutes(o.orderItems);

      const subtotalCents = calcSubtotalCents(o.orderItems);
      const { serviceFeeCents, voucherCents, totalCents } = getFeesAndTotals(
        o,
        subtotalCents
      );

      return {
        id: o.id,
        status: o.status,
        orderStatus: o.orderStatus,
        orderCode: o.orderCode,
        createdAt: o.createdAt,
        acceptedAt: o.acceptedAt,
        estimatedMinutes: o.estimatedMinutes,
        estimatedReadyTime: o.estimatedReadyTime,

        // ✅ money fields for your modal breakdown
        subtotalCents,
        serviceFeeCents,
        voucherCents,
        totalCents,

        stall: o.stall,
        items: o.orderItems.map((it) => {
          const fallbackImage = it.menuItem?.mediaUploads?.[0]?.imageUrl ?? null;

          return {
            id: it.id,
            quantity: it.quantity,
            request: it.request,
            isPrepared: it.isPrepared,
            menuItem: {
              id: it.menuItem?.id,
              name: it.menuItem?.name,
              prepTimeMins: it.menuItem?.prepTimeMins,
              priceCents: it.menuItem?.priceCents,

              // ✅ use MenuItem.imageUrl if it exists, else use the MediaUpload imageUrl
              imageUrl: it.menuItem?.imageUrl ?? fallbackImage,
            },
          };
        }),
        defaultEstimateMinutes,
      };
    });

    // ✅ Keep READY orders visible under "pending" list too (if your UI renders only pending)
    return res.json({
      incoming: mapped.filter((o) => o.orderStatus === "awaiting"),
      pending: mapped.filter(
        (o) => o.orderStatus === "preparing" || o.orderStatus === "ready"
      ),
      ready: mapped.filter((o) => o.orderStatus === "ready"),
    });
  } catch (e) {
    return res
      .status(e.status || 500)
      .json({ error: e.message || "Failed to fetch orders" });
  }
}

export async function acceptOrder(req, res) {
  try {
    const { stallIds } = await assertHawkerAndGetOwnedStallIds(req);
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: { menuItem: { select: { prepTimeMins: true } } },
        },
      },
    });

    if (!order || !stallIds.includes(order.stallId)) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (String(order.status).toUpperCase() !== "PAID") {
      return res.status(400).json({ error: "Order is not paid" });
    }

    if (order.orderStatus !== "awaiting") {
      return res.status(400).json({ error: "Order is not in awaiting state" });
    }

    const requested = Number(req.body?.estimatedMinutes);
    const defaultMinutes = computeDefaultEstimateMinutes(order.orderItems);

    const estimatedMinutes =
      Number.isFinite(requested) && requested > 0 ? requested : defaultMinutes;

    const now = new Date();
    const estimatedReadyTime = new Date(
      now.getTime() + estimatedMinutes * 60 * 1000
    );

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        orderStatus: "preparing",
        acceptedAt: now,
        estimatedMinutes,
        estimatedReadyTime,
        orderItems: {
          updateMany: {
            where: { orderId },
            data: { isPrepared: false },
          },
        },
      },
    });

    return res.json(updated);
  } catch (e) {
    return res
      .status(e.status || 500)
      .json({ error: e.message || "Failed to accept order" });
  }
}

export async function setOrderItemPrepared(req, res) {
  try {
    const { stallIds } = await assertHawkerAndGetOwnedStallIds(req);
    const { orderId, orderItemId } = req.params;

    const isPrepared = Boolean(req.body?.isPrepared);

    const item = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: true },
    });

    if (!item || item.orderId !== orderId) {
      return res.status(404).json({ error: "Order item not found" });
    }

    if (!stallIds.includes(item.order.stallId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (item.order.orderStatus !== "preparing") {
      return res
        .status(400)
        .json({ error: "Checklist only available while preparing" });
    }

    const updated = await prisma.orderItem.update({
      where: { id: orderItemId },
      data: { isPrepared },
    });

    return res.json(updated);
  } catch (e) {
    return res
      .status(e.status || 500)
      .json({ error: e.message || "Failed to update item" });
  }
}

export async function markOrderReady(req, res) {
  try {
    const { stallIds } = await assertHawkerAndGetOwnedStallIds(req);
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });

    if (!order || !stallIds.includes(order.stallId)) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.orderStatus !== "preparing") {
      return res.status(400).json({ error: "Order must be preparing first" });
    }

    const allPrepared = order.orderItems.every((it) => it.isPrepared);
    if (!allPrepared) {
      return res
        .status(400)
        .json({ error: "All items must be prepared before marking ready" });
    }

    const token = crypto.randomBytes(16).toString("hex");
    const tokenHash = sha256(token);

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        orderStatus: "ready",
        readyAt: new Date(),

        // ✅ store RAW token so customer can re-fetch QR after refresh
        pickupToken: token,

        // ✅ keep hash verification too
        pickupTokenHash: tokenHash,
        pickupTokenUsedAt: null,
      },
    });

    return res.json({
      order: updated,
      pickupToken: token,
    });
  } catch (e) {
    return res
      .status(e.status || 500)
      .json({ error: e.message || "Failed to mark ready" });
  }
}

export async function collectOrderByToken(req, res) {
  try {
    const { stallIds } = await assertHawkerAndGetOwnedStallIds(req);
    const { orderId } = req.params;
    const token = String(req.body?.token || "");

    if (!token) {
      return res.status(400).json({ error: "token is required" });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || !stallIds.includes(order.stallId)) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.orderStatus !== "ready") {
      return res.status(400).json({ error: "Order is not ready" });
    }

    if (!order.pickupTokenHash) {
      return res
        .status(400)
        .json({ error: "No pickup token exists for this order" });
    }

    if (order.pickupTokenUsedAt) {
      return res.status(400).json({ error: "Pickup token already used" });
    }

    const tokenHash = sha256(token);
    if (tokenHash !== order.pickupTokenHash) {
      return res.status(400).json({ error: "Invalid token" });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        orderStatus: "collected",
        collectedAt: new Date(),
        pickupTokenUsedAt: new Date(),

        // ✅ invalidate raw token after use
        pickupToken: null,

        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    return res.json(updated);
  } catch (e) {
    return res
      .status(e.status || 500)
      .json({ error: e.message || "Failed to collect order" });
  }
}
