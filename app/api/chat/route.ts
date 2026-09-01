import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createGateway,
  createUIMessageStreamResponse,
  safeValidateUIMessages,
  smoothStream,
  streamText,
  toUIMessageStream,
  type LanguageModel,
} from "ai";

/**
 * The chat runtime every BoardUI agent template talks to.
 *
 * This file is the contract the starter's chat screen installs against, and
 * the one any later live chat screen should share: UI ships separately and
 * assumes exactly three things — a POST endpoint at `/api/chat`, an AI SDK
 * UI-message stream coming back, and the env vars below. Nothing else. Keep
 * that contract narrow; anything a screen needs beyond it becomes a reason
 * for it to not be portable.
 *
 * The CLI skips files that already exist, so installing anything else that
 * ships this file into a project that already has it keeps the customised
 * version rather than clobbering it. That is the desired behaviour, with one
 * consequence worth knowing: if this file gains a capability later (tool
 * calls, say) an older copy will NOT be replaced, and a newer template will
 * run against a stale backend. `RUNTIME_CONTRACT` is the version marker for
 * detecting that.
 *
 * Bring your own key. The simplest form is one variable, and the provider is
 * read off the key's own prefix:
 *
 *   AI_API_KEY=sk-ant-...   Anthropic        AI_API_KEY=gsk_...   Groq
 *   AI_API_KEY=sk-or-...    OpenRouter       AI_API_KEY=xai-...   xAI
 *   AI_API_KEY=sk-...       OpenAI           AI_API_KEY=vck_...   Vercel AI Gateway
 *   AI_API_KEY=AIza...      Google Gemini
 *
 * That is what lets the Vercel deploy button ask for a single value instead
 * of a form of nine optional fields. Every provider's conventional variable
 * (OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, ...) is
 * honoured too and wins over AI_API_KEY, for anyone who already has one set.
 *
 * For keys with no recognisable shape (Mistral, DeepSeek) name the provider:
 *
 *   AI_PROVIDER=mistral   with AI_API_KEY or MISTRAL_API_KEY
 *
 * And any OpenAI-compatible server works by URL — Ollama, LM Studio, vLLM,
 * Together, Fireworks — with CHAT_MODEL naming the model, since there is no
 * sensible default for an arbitrary endpoint:
 *
 *   AI_BASE_URL=http://localhost:11434/v1  CHAT_MODEL=llama3.2
 *
 * CHAT_MODEL overrides the default model for any provider. Ids are provider
 * specific: OpenRouter and the Gateway namespace them ("openai/gpt-5-nano"),
 * the rest do not ("gpt-5.4-mini").
 *
 * SECURITY: the key is read server-side only and never leaves this file. Do
 * not move it to a NEXT_PUBLIC_ variable — that ships it to the browser, where
 * any visitor can read it out of the bundle and spend against it.
 *
 * COST: requests bill to whoever owns the key. Before putting a deployment
 * with a live key in front of the public, put a rate limit in front of this
 * route; a chat endpoint open to the internet is an open invitation to spend
 * someone else's money.
 */

/** Bumped when the contract below changes in a way templates can depend on. */
export const RUNTIME_CONTRACT = 1;

/** Streaming replies outlive the default budget on longer answers. */
export const maxDuration = 30;

type KnownProviderId =
  | "anthropic"
  | "openrouter"
  | "openai"
  | "google"
  | "gateway"
  | "groq"
  | "xai"
  | "mistral"
  | "deepseek";
/** "custom" is any OpenAI-compatible server named by AI_BASE_URL alone. */
type ProviderId = KnownProviderId | "custom";

interface ProviderSpec {
  label: string;
  /** The variable the provider's own SDK and docs use — the explicit form. */
  envKey: string;
  /** Prefix the provider mints its keys with, for reading AI_API_KEY. Absent
   *  when the keys have no recognisable shape and AI_PROVIDER must say. */
  prefix?: string;
  defaultModel: string;
  /** Chat-completions endpoint, for providers spoken to over the OpenAI wire
   *  format rather than a native SDK. */
  baseURL?: string;
}

/**
 * Order matters twice over: "sk-ant-" and "sk-or-" must be tried before the
 * plain "sk-" OpenAI shape they extend, and when several explicit variables
 * are set the first one here wins (set AI_PROVIDER to be exact).
 */
const PROVIDERS: Record<KnownProviderId, ProviderSpec> = {
  anthropic: {
    label: "Anthropic",
    envKey: "ANTHROPIC_API_KEY",
    prefix: "sk-ant-",
    defaultModel: "claude-haiku-4-5",
  },
  openrouter: {
    label: "OpenRouter",
    envKey: "OPENROUTER_API_KEY",
    prefix: "sk-or-",
    defaultModel: "openai/gpt-5-nano",
    baseURL: "https://openrouter.ai/api/v1",
  },
  openai: {
    label: "OpenAI",
    envKey: "OPENAI_API_KEY",
    prefix: "sk-",
    defaultModel: "gpt-5.4-mini",
  },
  google: {
    label: "Google",
    envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
    prefix: "AIza",
    defaultModel: "gemini-2.5-flash",
  },
  gateway: {
    label: "Vercel AI Gateway",
    envKey: "AI_GATEWAY_API_KEY",
    prefix: "vck_",
    defaultModel: "openai/gpt-5-nano",
  },
  groq: {
    label: "Groq",
    envKey: "GROQ_API_KEY",
    prefix: "gsk_",
    defaultModel: "llama-3.3-70b-versatile",
    baseURL: "https://api.groq.com/openai/v1",
  },
  xai: {
    label: "xAI",
    envKey: "XAI_API_KEY",
    prefix: "xai-",
    defaultModel: "grok-4-fast-non-reasoning",
    baseURL: "https://api.x.ai/v1",
  },
  mistral: {
    label: "Mistral",
    envKey: "MISTRAL_API_KEY",
    defaultModel: "mistral-small-latest",
    baseURL: "https://api.mistral.ai/v1",
  },
  deepseek: {
    label: "DeepSeek",
    envKey: "DEEPSEEK_API_KEY",
    defaultModel: "deepseek-chat",
    baseURL: "https://api.deepseek.com/v1",
  },
};

const PROVIDER_IDS = Object.keys(PROVIDERS) as KnownProviderId[];

type Provider = {
  id: ProviderId;
  /** Surfaced to the UI so the composer can show what is answering. */
  label: string;
  modelId: string;
  model: LanguageModel;
};

/** Either a usable provider or the one sentence explaining why there is none. */
type Resolution = { provider: Provider; reason?: undefined } | { provider: null; reason: string };

/** Empty and whitespace-only values count as unset — a blank field in a deploy
 *  wizard should not read as a key. */
function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function buildModel(id: ProviderId, apiKey: string, modelId: string, baseURL?: string): LanguageModel {
  switch (id) {
    case "openai":
      return createOpenAI({ apiKey, baseURL })(modelId);
    case "anthropic":
      return createAnthropic({ apiKey, baseURL })(modelId);
    case "google":
      return createGoogleGenerativeAI({ apiKey, baseURL })(modelId);
    case "gateway":
      return createGateway({ apiKey, baseURL })(modelId);
    default:
      // Everyone else speaks OpenAI's chat-completions format. `.chat` is
      // deliberate: the bare provider call targets the Responses API, which
      // most compatible servers do not serve.
      return createOpenAI({
        apiKey,
        baseURL: baseURL ?? (id === "custom" ? undefined : PROVIDERS[id].baseURL),
      }).chat(modelId);
  }
}

function resolveProvider(): Resolution {
  const single = env("AI_API_KEY");
  const named = env("AI_PROVIDER")?.toLowerCase();
  const baseURL = env("AI_BASE_URL");
  const modelOverride = env("CHAT_MODEL");

  const build = (id: ProviderId, apiKey: string, defaultModel: string, label: string): Resolution => {
    const modelId = modelOverride ?? defaultModel;
    return { provider: { id, label, modelId, model: buildModel(id, apiKey, modelId, baseURL) } };
  };

  // 1. Named outright. The only way to reach a provider whose keys carry no
  //    recognisable prefix, and the tie-breaker when several keys are set.
  if (named) {
    if (named === "custom") {
      if (!baseURL) return { provider: null, reason: "AI_PROVIDER=custom needs AI_BASE_URL to say where the server is." };
    } else if (!(named in PROVIDERS)) {
      return {
        provider: null,
        reason: `Unknown AI_PROVIDER "${named}". Use one of: ${PROVIDER_IDS.join(", ")}, custom.`,
      };
    } else {
      const spec = PROVIDERS[named as KnownProviderId];
      const apiKey = env(spec.envKey) ?? single;
      if (!apiKey) return { provider: null, reason: `AI_PROVIDER is ${named} but neither ${spec.envKey} nor AI_API_KEY is set.` };
      return build(named as KnownProviderId, apiKey, spec.defaultModel, spec.label);
    }
  }

  // 2. A provider's own conventional variable.
  if (!named) {
    for (const id of PROVIDER_IDS) {
      const apiKey = env(PROVIDERS[id].envKey);
      if (apiKey) return build(id, apiKey, PROVIDERS[id].defaultModel, PROVIDERS[id].label);
    }
  }

  // 3. The single key, read by its shape.
  if (single && !named) {
    for (const id of PROVIDER_IDS) {
      const prefix = PROVIDERS[id].prefix;
      if (prefix && single.startsWith(prefix)) {
        return build(id, single, PROVIDERS[id].defaultModel, PROVIDERS[id].label);
      }
    }
  }

  // 4. Any OpenAI-compatible server by URL. Local ones (Ollama, LM Studio)
  //    take no key at all, so a placeholder keeps the SDK from demanding one.
  if (baseURL) {
    if (!modelOverride) {
      return { provider: null, reason: "AI_BASE_URL is set but CHAT_MODEL is not. Name the model the server should run." };
    }
    return build("custom", single ?? "none", modelOverride, "Custom endpoint");
  }

  if (single) {
    return {
      provider: null,
      reason: "AI_API_KEY is set but its shape is not one this route recognises. Add AI_PROVIDER to name the provider.",
    };
  }
  return {
    provider: null,
    reason:
      "No model provider key found. Set AI_API_KEY to a key from OpenAI, Anthropic, Google, OpenRouter, Groq, xAI, or Vercel AI Gateway, then redeploy.",
  };
}

/**
 * Facts about the app the assistant is answering from inside.
 *
 * Without this, "explain what this starter does" is a question about something
 * the model has never heard of, and it invents an answer. With it, the reply is
 * generated fresh every time — so it never reads like canned copy — but it is
 * grounded in what the code actually is. Keep it to things that are true;
 * anything aspirational here becomes a confident lie in the chat.
 */
function systemPrompt(provider: Provider) {
  return [
    "You are the assistant inside the BoardUI chat starter, and you are answering from within the app itself.",
    "",
    "What this starter is, for when you are asked:",
    "- A working AI chat app: a Next.js App Router project using React and Tailwind CSS v4, with the interface built from BoardUI components.",
    `- The chat runs on the reader's own model provider key. Right now that is ${provider.label}, answering with ${provider.modelId}. It works the same with a key from OpenAI, Anthropic, Google, OpenRouter, Groq, xAI, Mistral, DeepSeek, Vercel AI Gateway, or any OpenAI-compatible server such as Ollama.`,
    "- The key is read server-side only, inside a /api/chat route that streams replies with the Vercel AI SDK. It is never exposed to the browser.",
    "- There is no database and no hosted backend. Conversation history is kept in the visitor's own browser, so it is per-browser and private to them.",
    "- The UI pieces are BoardUI's free components: the app sidebar, the composer, the thinking indicator, the chat history rail. They install as source into the project (npx boardui add agent-chat), so they are owned and editable rather than a dependency.",
    "- It is meant to be deployed to the reader's own Vercel account, where the provider key is entered during the deploy.",
    "- BoardUI Pro adds richer components and full-page templates that install into the same project as source. This starter's chat is the part that is wired to a model.",
    "",
    "Answer in plain language, a short paragraph or a few sentences. Vary how you phrase things rather than reciting the list above, and only cover the parts that answer the question actually asked. Use markdown only when it genuinely helps. If you are asked something unrelated to the starter, just answer it normally.",
  ].join("\n");
}

/**
 * Config probe. The UI calls this on mount so a deployment with no key yet can
 * render setup instructions instead of letting someone type a message and hit
 * an error — a fresh deploy's first impression should explain itself.
 */
export async function GET() {
  const { provider, reason } = resolveProvider();
  return Response.json({
    configured: provider !== null,
    provider: provider?.id ?? null,
    providerLabel: provider?.label ?? null,
    model: provider?.modelId ?? null,
    reason: reason ?? null,
    contract: RUNTIME_CONTRACT,
  });
}

export async function POST(req: Request) {
  const { provider, reason } = resolveProvider();

  if (!provider) {
    return Response.json({ error: "missing_api_key", message: reason }, { status: 503 });
  }

  const badBody = Response.json(
    { error: "invalid_body", message: "Expected JSON with a messages array." },
    { status: 400 },
  );

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badBody;
  }

  const submitted = (body as { messages?: unknown } | null)?.messages;
  if (!Array.isArray(submitted)) return badBody;

  // Validate before converting. `convertToModelMessages` throws on a message
  // missing `parts`, on a null entry, and on an unknown role — and it throws
  // outside any stream, so an unvalidated body would escape as a bare 500
  // instead of the error response this route promises its callers.
  const validated = await safeValidateUIMessages({ messages: submitted });
  if (!validated.success) {
    return Response.json(
      { error: "invalid_messages", message: validated.error.message },
      { status: 400 },
    );
  }

  const result = streamText({
    model: provider.model,
    system: systemPrompt(provider),
    messages: await convertToModelMessages(validated.data),
    // Providers emit text in uneven bursts, and a burst of twenty words lands
    // as one repaint — which is what makes streamed text look like it stutters.
    // Releasing whole words on a steady tick turns that into an even flow, and
    // it also means the UI never sees a half-typed word.
    experimental_transform: smoothStream({ delayInMs: 18, chunking: "word" }),
    // Without this the provider keeps generating (and billing) after the
    // reader presses Stop, since aborting the fetch only ends the client side.
    abortSignal: req.signal,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
