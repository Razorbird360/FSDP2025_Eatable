import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { streamAgentResponse } from '../agent/agent.ts';

const router = Router();

const isValidMessage = (message) =>
  message &&
  typeof message === 'object' &&
  typeof message.role === 'string' &&
  typeof message.content === 'string';

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { messages, sessionId } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    if (!messages.every(isValidMessage)) {
      return res.status(400).json({ error: 'messages must include role and content' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    res.write(
      `event: meta\ndata: ${JSON.stringify({
        sessionId: sessionId ?? null,
        userId,
      })}\n\n`
    );

    let closed = false;
    req.on('close', () => {
      closed = true;
    });

    const stream = streamAgentResponse({
      messages,
      userId,
      sessionId: sessionId ?? null,
    });

    for await (const delta of stream) {
      if (closed) {
        break;
      }
      res.write(`event: delta\ndata: ${JSON.stringify({ delta })}\n\n`);
    }

    if (!closed) {
      res.write('event: done\ndata: {}\n\n');
      res.end();
    }
  } catch (error) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
    if (!res.headersSent) {
      next(error);
    }
  }
});

export default router;
