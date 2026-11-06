# Pulse for Windows

Pulse is a lightweight Windows desktop monitor for AI coding plan usage. It runs as a floating rail and opens a detail card for each provider.

Download the latest installer from [Releases](https://github.com/LucaZhang7784/pulse/releases/latest).

## Providers

The rail is ordered as follows:

1. Codex
2. Antigravity
3. Claude Code
4. OpenRouter (Claude Code)
5. DeepSeek
6. Kimi
7. MiMo Plan
8. Vercel AI Gateway
9. MiniMax Token Plan
10. Zhipu GLM
11. OfoxAI

Codex and Antigravity detail cards also show the latest locally available session model and usage metadata. Codex reports the model, reasoning effort, and turn token count. Antigravity reports the latest model, its tier, and the latest response's input, cached, and output tokens.

## Install from source

Requirements: Windows 10/11 x64, Node.js 20 or later, and npm.

```powershell
git clone https://github.com/LucaZhang7784/pulse.git
cd pulse
npm ci
npm start
```

To build a Windows installer and portable executable:

```powershell
npm run dist
```

The installer and portable executable are written to `dist/`. Build them on Windows; electron-builder downloads the matching Electron and NSIS build tools as needed.

## Build a distributable installer

```powershell
npm ci
npm run dist
```

The installer is `dist/Pulse Setup 0.5.0.exe`. Run it and choose an installation folder. The portable executable is `dist/Pulse 0.5.0.exe`.

## Provider notes

- **Codex:** reads the local Codex OAuth credentials from `%USERPROFILE%\.codex\auth.json` (or `%CODEX_HOME%\auth.json`) and requests account usage from ChatGPT.
- **Antigravity:** reads its local GUI log and active local page to discover the quota endpoint, then reads the latest local conversation database for session metadata. Antigravity must be running for live quota data.
- **Claude Code, OpenRouter, DeepSeek, Kimi, MiMo, Vercel AI Gateway, MiniMax, Zhipu GLM, OfoxAI:** provider credentials are read from their supported local configuration or Pulse Settings.
- **MiniMax:** reads the Token Plan quota from `api.minimaxi.com` (China) or `www.minimax.io` (global) with the Token Plan API key and shows both the 5-hour and weekly windows.
- **Zhipu GLM:** reads the GLM Coding Plan quota from `open.bigmodel.cn` (China) or `api.z.ai` (global). An account without an active Coding Plan is reported as such, not drawn as 0%.
- **Vercel AI Gateway:** reads the gateway credit balance from `ai-gateway.vercel.sh/v1/credits`. The key is an AI Gateway key, not a Vercel access token.
- **OfoxAI:** reads the prepaid balance from `api.ofox.io/v1/user/balance`; an overdrawn balance is shown as negative.

Credentials and runtime settings stay on the local computer. Do not commit credential files, settings, logs, `node_modules`, or generated `dist` output.

## Development

```powershell
npm ci
npm start
npm run providers:test
```

`npm run providers:test` calls live provider endpoints and reports the available status for the current computer's configured accounts.

## License

Apache-2.0
