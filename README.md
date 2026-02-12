# nano-gpt-mcp

An MCP (Model Context Protocol) server for [NanoGPT](https://nano-gpt.com) — giving you access to 700+ AI models for text, image, video, and audio generation directly from Claude Code or any MCP-compatible client.

## What is NanoGPT?

NanoGPT is a pay-as-you-go AI gateway that provides access to models from OpenAI, Anthropic, Google, Meta, Mistral, DeepSeek, and many more — all through a single API key. No subscriptions required.

## Features

| Tool | Description |
|------|-------------|
| `nano_chat` | Chat with 700+ text models (GPT, Claude, Gemini, Llama, DeepSeek, Qwen, Mistral, etc.) |
| `nano_generate_image` | Generate images (GPT Image 1.5, Flux, Stable Diffusion, Recraft, HiDream, etc.) |
| `nano_generate_video` | Generate videos (Kling, Sora 2, Veo 3, Wan, MiniMax, etc.) |
| `nano_list_models` | Browse available models by type (text/image/video/audio) with pricing |
| `nano_check_balance` | Check your account balance |

All responses include cost and remaining balance.

## Setup

### 1. Get a NanoGPT API Key

Sign up at [nano-gpt.com](https://nano-gpt.com) and get your API key from the dashboard.

### 2. Install

```bash
git clone https://github.com/mageaustralia/nano-gpt-mcp.git
cd nano-gpt-mcp
npm install
```

### 3. Configure Claude Code

Add to your `~/.claude/settings.json` to make it available globally (all projects):

```json
{
  "mcpServers": {
    "nano-gpt": {
      "command": "node",
      "args": ["/path/to/nano-gpt-mcp/server.mjs"],
      "env": {
        "NANO_GPT_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Or add to a project-specific `.claude/settings.json` for per-project use.

### 4. Restart Claude Code

The MCP server will be available after restarting Claude Code.

## Usage Examples

### Chat with any model

> "Use nano_chat to ask GPT-4o what the best sorting algorithm is for nearly-sorted data"

> "Ask DeepSeek R1 to solve this math problem using nano_chat"

> "Use nano_chat with google/gemini-2.5-flash to review this code snippet"

### Generate images

> "Use nano_generate_image with hidream-i1-fast to create a product photo of a laptop on a white background"

> "Generate an image with gpt-image-1.5: a watercolor painting of a coastal town at sunset"

> "Use nano-banana to generate a logo for a coffee shop called 'Bean There'"

### Generate videos

> "Use nano_generate_video with kling-v26-pro to create a 5-second video of ocean waves"

> "Generate a video with wan-wavespeed-25: a timelapse of flowers blooming"

### List models and pricing

> "Use nano_list_models to show me all image models"

> "List video models on nano-gpt"

> "Search for 'llama' in nano-gpt text models"

### Check balance

> "Check my nano-gpt balance"

## Available Models (highlights)

### Text (700+)
- `openai/gpt-4o`, `openai/gpt-4o-mini`, `openai/o3`, `openai/o4-mini`
- `anthropic/claude-sonnet-4-5-20250929`, `anthropic/claude-opus-4`
- `google/gemini-2.5-flash`, `google/gemini-2.5-pro`
- `deepseek/deepseek-r1`, `deepseek/deepseek-v3`
- `meta-llama/llama-3.3-70b`, `meta-llama/llama-4-maverick`
- `qwen/qwen3-235b`, `mistralai/mistral-large`
- ...and hundreds more

### Image (30+)
- `gpt-image-1.5` - OpenAI's latest
- `hidream-i1-fast` - Fast high-quality generation
- `flux-1.1-pro` - Black Forest Labs
- `recraft-v3` - Design-focused
- `stable-diffusion-3.5-large` - Stability AI
- `nano-banana` - Budget-friendly

### Video (20+)
- `kling-v26-pro` - Text & image to video with audio
- `sora-2` - OpenAI video generation
- `veo3-video` - Google Veo 3
- `wan-wavespeed-25` - Fast generation
- `minimax-hailuo-02-pro` - High quality

## How it works

The MCP server translates tool calls into NanoGPT API requests:

- **Chat**: OpenAI-compatible `/v1/chat/completions` endpoint
- **Images**: `/v1/images/generations` endpoint (returns URLs or base64)
- **Videos**: `/v1/video/generations` endpoint
- **Models**: `/v1/models`, `/v1/image-models`, `/v1/video-models`, `/v1/audio-models`

## License

MIT
