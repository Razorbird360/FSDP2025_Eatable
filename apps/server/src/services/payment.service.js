// routes/netsQr.js
import express from "express";
import axios from "axios";

import { orderService } from "./order.service.js";

const router = express.Router();

const NETS_BASE_URL =
  process.env.NETS_BASE_URL || "https://sandbox.nets.openapipaas.com/api/v1";

const NETS_HEADERS = {
  "api-key": process.env.NETS_SANDBOX_API_KEY,
  "project-id": process.env.NETS_SANDBOX_PROJECT_ID,
};

// 1) Request NETS QR (proxied)
router.post("/request/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    // 1) Get the order
    const order = await orderService.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }


    // 2) Extract values
    const txnId = order.netsTxnId; // your internal transaction ID
    const amountCents = order.totalCents; // stored as INT cents
    const notify_mobile = 88286909;

    if (!amountCents || amountCents <= 0) {
      return res.status(400).json({ error: "Invalid order amount" });
    }

    // Convert cents → dollars (NETS requires 2-decimal string)
    const amt_in_dollars = (amountCents / 100).toFixed(2);

    // 3) Build NETS request body
    const body = {
      txn_id: txnId,
      amt_in_dollars,
      notify_mobile,
    };

    // 4) Call NETS API
    const netsRes = await axios.post(
      `${NETS_BASE_URL}/common/payments/nets-qr/request`,
      body,
      { headers: NETS_HEADERS }
    );


    // 5) Return NETS response to frontend
    res.json(netsRes.data);

  } catch (err) {
    console.error("NETS /request error:", err.response?.data || err.message);
    res.status(500).json({ error: "NETS request failed" });
  }
});

// 2) Query NETS QR status (for polling / timeout)
router.post("/query/:orderId", async (req, res) => {
  try {
    const { txn_retrieval_ref, frontend_timeout_status } = req.body;
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ error: "Missing orderId" });
    }

    const body = {
      txn_retrieval_ref,
      frontend_timeout_status,
    };

    const netsRes = await axios.post(
      `${NETS_BASE_URL}/common/payments/nets-qr/query`,
      body,
      { headers: NETS_HEADERS }
    );

    const result = netsRes.data?.result?.data;

    const isSuccess =
      result?.response_code === "00" &&
      Number(result?.txn_status) === 1;

    if (isSuccess) {
      console.log("💰 Payment confirmed. Updating order:", orderId);

      try {
        const updated = await orderService.orderPaymentSuccess(orderId);
        console.log("Order updated:", updated);
      } catch (dbErr) {
        console.error("❌ Failed to update order:", dbErr);
      }
    }

    res.json(netsRes.data);
  } catch (err) {
    console.error("NETS /query error:", err.response?.data || err.message);
    res.status(500).json({ error: "NETS query failed" });
  }
});

export default router;
