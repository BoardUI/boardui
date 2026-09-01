<a href="https://www.boardui.com"><img src=".github/readme-banner.png" alt="BoardUI, a React design system for agentic interfaces" width="100%"></a>

# Start your agentic app with BoardUI

A working AI chat app on your own model key, deployed in a click. Next.js App Router, React, Tailwind CSS v4, and an interface built from [BoardUI](https://www.boardui.com) components that live in this repo as source, so everything is yours to edit.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmertcanesmergul%2Fboardui-starter&env=AI_API_KEY&envDescription=Your+model+provider+key%3A+OpenAI%2C+Anthropic%2C+Google%2C+OpenRouter%2C+or+Vercel+AI+Gateway.+The+provider+is+read+from+the+key+itself.&envLink=https%3A%2F%2Fwww.boardui.com%2Fcomponents%2Fchat-starter&project-name=boardui-chat-starter&repository-name=boardui-chat-starter)

Click the button, paste one API key when Vercel asks for it, and the first deploy already answers.

This repository is generated from BoardUI's source and takes no pull requests. See [CONTRIBUTING.md](CONTRIBUTING.md).

## What you get

- A streaming chat screen: app sidebar, composer, thinking indicator, message actions, and a chat history rail kept in the visitor's own browser. No database.
- `app/api/chat/route.ts`, the runtime. It reads your key server-side only, streams replies with the Vercel AI SDK, and never exposes the key to the browser.
- BoardUI's design rules for coding agents in `AGENTS.md` and `.cursor/rules/`, so an agent building the next screen uses the same tokens and type scale.

## Bring your own key

One variable. The provider is read from the key itself:

| Key looks like | Provider | Default model |
| --- | --- | --- |
| `sk-ant-...` | Anthropic | claude-haiku-4-5 |
| `sk-or-...` | OpenRouter | openai/gpt-5-nano |
| `sk-...` | OpenAI | gpt-5.4-mini |
| `AIza...` | Google Gemini | gemini-2.5-flash |
| `vck_...` | Vercel AI Gateway | openai/gpt-5-nano |
| `gsk_...` | Groq | llama-3.3-70b-versatile |
| `xai-...` | xAI | grok-4-fast-non-reasoning |

Set `CHAT_MODEL` to use a different model. For Mistral or DeepSeek, whose keys have no recognisable shape, add `AI_PROVIDER=mistral` or `AI_PROVIDER=deepseek`. For any OpenAI-compatible server (Ollama, LM Studio, vLLM, LiteLLM, Together) set `AI_BASE_URL` and `CHAT_MODEL`. Every provider's usual variable (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, ...) works too. See `.env.example`.

## Run it locally

```bash
npm install
cp .env.example .env.local   # then put your key in AI_API_KEY
npm run dev
```

## Add the rest of BoardUI

The starter ships only what the chat needs. Every other free component installs the same way, as source into this repo, and BoardUI Pro adds the full-page templates and richer components on the same path.

### With an agent

BoardUI has an MCP server, so Claude Code, Cursor and any MCP client can browse the catalog and install for you. Add it once:

```bash
claude mcp add boardui -- npx -y boardui@latest mcp
```

Cursor and most other clients take the same server in their MCP config:

```json
{
  "mcpServers": {
    "boardui": { "command": "npx", "args": ["-y", "boardui@latest", "mcp"] }
  }
}
```

Then ask in plain words. "Install every free BoardUI component" installs the whole free catalog in one go. "Add a data table and stat cards to the dashboard" installs just those and wires them in. The rules in `AGENTS.md` keep whatever it builds on BoardUI's tokens and type scale. Setup for VS Code, Codex and the rest is at [boardui.com/mcp](https://www.boardui.com/mcp).

### With the CLI

```bash
npx boardui@latest list              # every component, one line each
npx boardui@latest add data-table    # one component and what it depends on
npx boardui@latest add --all         # the whole free catalog
```

Pro components and templates need a licence key: `npx boardui@latest login <key>`, then `add` as usual. See [BoardUI Pro](https://www.boardui.com).

## Before going public

Requests bill to whoever owns the key. Put a rate limit in front of `/api/chat` before pointing the internet at a deployment with a live key.

## License

[MIT](LICENSE). Use it, change it, ship it, share it. BoardUI Pro components and templates are sold separately under the [BoardUI License](https://www.boardui.com/license).
