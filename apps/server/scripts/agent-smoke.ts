const url = process.env.AGENT_SMOKE_URL ?? 'http://localhost:3000/api/agent';
const token = process.env.AGENT_SMOKE_TOKEN;
const prompt =
  process.env.AGENT_SMOKE_PROMPT ??
  'Call the tool get_top_voted_menu_items with limit 1, then reply "done".';

if (!token) {
  console.error('AGENT_SMOKE_TOKEN is required.');
  process.exit(1);
}

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    messages: [{ role: 'user', content: prompt }],
  }),
});

if (!response.ok || !response.body) {
  let message = `Request failed with status ${response.status}.`;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      const data = await response.json();
      message = data?.error || data?.message || message;
    } catch {
      // ignore
    }
  } else {
    const text = await response.text();
    if (text) message = text;
  }
  console.error(message);
  process.exit(1);
}

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = '';
let toolEvents = 0;
let deltaChars = 0;
const errors: string[] = [];

const handleChunk = (chunk: string) => {
  const lines = chunk.split('\n');
  let eventType = 'message';
  let data = '';

  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventType = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      data += line.slice(5).trim();
    }
  }

  if (!data) return;

  try {
    const payload = JSON.parse(data);
    if (eventType === 'delta') {
      deltaChars += (payload?.delta ?? '').length;
    } else if (eventType === 'tool') {
      toolEvents += 1;
    } else if (eventType === 'error') {
      errors.push(payload?.error || 'Unknown error');
    }
  } catch {
    // ignore parse errors
  }
};

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const chunks = buffer.split('\n\n');
  buffer = chunks.pop() || '';
  chunks.forEach(handleChunk);
}

if (errors.length > 0) {
  console.error('Agent smoke check failed:', errors.join(' | '));
  process.exit(1);
}

if (toolEvents === 0) {
  console.error('Agent smoke check failed: no tool events received.');
  process.exit(1);
}

console.log(
  `Agent smoke check passed: ${toolEvents} tool event(s), ${deltaChars} streamed characters.`
);
