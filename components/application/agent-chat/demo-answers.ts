/**
 * What the chat says when there is no model behind it.
 *
 * Demo mode exists so a fresh deploy can be tried before a key is added: the
 * screen, the streaming, the history all behave as they do with a model, and
 * only the words are canned. Each answer says so, quietly, so nobody mistakes
 * it for a model's.
 */

type DemoAnswer = { match: RegExp; reply: string };

const ANSWERS: DemoAnswer[] = [
  {
    match: /starter|what (is|does) this|about this app|boardui/i,
    reply:
      "This is the BoardUI chat starter: a Next.js app with a streaming chat, a dashboard, an inbox and sign-in screens, all built from BoardUI's free components and installed as source you own. Right now I'm in demo mode, so this answer is canned. Add AI_API_KEY in your Vercel project settings, redeploy, and the same chat talks to a real model.",
  },
  {
    match: /product update|announcement|release notes|changelog/i,
    reply:
      "Here's a product update in three sentences. This release adds a dashboard with revenue and orders charts, an inbox, and sign-in and sign-up screens, all built from the same free components as the chat. Every page installs as source, so nothing is locked behind a package. It deploys to Vercel in a click and runs on your own model key. (Demo mode: canned answer. Add AI_API_KEY for a real one.)",
  },
  {
    match: /names?\b.*\b(app|product|scheduling|startup|company)|name ideas|suggest.*names/i,
    reply:
      "Five names for a scheduling app: Slotwise, Tidemark, Cadence, Dayline, and Meridian. Slotwise says what it does, Cadence and Meridian carry a rhythm, Tidemark and Dayline feel like calendars without saying so. (Demo mode: canned answer. With a key, I'd tailor these to your product.)",
  },
  {
    match: /key|api|openrouter|openai|anthropic|provider|model/i,
    reply:
      "To connect a real model, add one environment variable, AI_API_KEY, in your Vercel project (Settings, then Environment Variables) and redeploy. The provider is read from the key itself: OpenAI, Anthropic, Google, OpenRouter, Groq, xAI or Vercel AI Gateway all work. Set CHAT_MODEL if you want a specific model. Until then I'm in demo mode, answering from a short script.",
  },
  {
    match: /hello|hi\b|hey|good (morning|afternoon|evening)/i,
    reply:
      "Hello. I'm the starter's demo assistant, answering from a short script until a model key is added. Try asking what this starter does, or how to connect a key.",
  },
];

const FALLBACK =
  "I'm in demo mode, so I can only answer from a short script, and that question isn't in it. Add AI_API_KEY in your Vercel project settings and redeploy, and this same chat will answer properly. Meanwhile, try: what does this starter do, or how do I connect a key.";

export function pickDemoAnswer(prompt: string): string {
  return ANSWERS.find((answer) => answer.match.test(prompt))?.reply ?? FALLBACK;
}
