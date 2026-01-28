import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { getAgentCapabilities, streamAgentResponse } from '../agent/agent.ts';
import { agentRateLimit } from '../middleware/agent-rate-limit.ts';
import { createToolRegistry } from '../agent/tools/index.ts';
import { customerMiddleware } from '../middleware/customer.middleware.js';

const router = Router();

const isValidMessage = (message) =>
  message &&
  typeof message === 'object' &&
  typeof message.role === 'string' &&
  typeof message.content === 'string';

router.post(
  '/',
  authMiddleware,
  customerMiddleware,
  agentRateLimit,
  async (req, res, next) => {
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

    for await (const event of stream) {
      if (closed) {
        break;
      }
      if (event.type === 'delta') {
        res.write(`event: delta\ndata: ${JSON.stringify({ delta: event.delta })}\n\n`);
      } else if (event.type === 'tool') {
        res.write(`event: tool\ndata: ${JSON.stringify(event.payload)}\n\n`);
      } else if (event.type === 'error') {
        res.write(`event: error\ndata: ${JSON.stringify({ error: event.error })}\n\n`);
      }
    }

    if (!closed) {
      res.write('event: done\ndata: {}\n\n');
      res.end();
    }
  } catch (error) {
    console.error('Agent stream failed:', error);
    res.write(
      `event: error\ndata: ${JSON.stringify({
        error: 'Agent request failed. Please try again.',
      })}\n\n`
    );
    res.end();
    if (!res.headersSent) {
      next(error);
    }
  }
  }
);

router.get('/health', authMiddleware, customerMiddleware, (req, res) => {
  const capabilities = getAgentCapabilities();
  const tools = createToolRegistry(
    { userId: req.user.id, sessionId: null },
    { netsEnabled: capabilities.netsEnabled }
  );

  res.json({
    ok: capabilities.geminiConfigured,
    capabilities,
    tools: tools.map((tool) => tool.name),
    warnings: [
      ...(capabilities.geminiConfigured ? [] : ['GEMINI_API_KEY missing']),
      ...(capabilities.netsEnabled ? [] : ['NETS credentials missing']),
    ],
  });
});

export default router;
