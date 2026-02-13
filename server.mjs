#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const API_KEY = process.env.NANO_GPT_API_KEY;
const BASE_URL = "https://nano-gpt.com/api";

async function apiRequest(path, options = {}) {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const resp = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      ...options.headers,
    },
    ...options,
  });
  return resp.json();
}

// ── Tool definitions ─────────────────────────────────────────────

const tools = [
  {
    name: "nano_chat",
    description:
      "Send a prompt to any text/chat model via NanoGPT. Supports 700+ models including GPT, Claude, Gemini, Llama, DeepSeek, Qwen, Mistral etc. Returns the model's text response.",
    inputSchema: {
      type: "object",
      properties: {
        model: {
          type: "string",
          description:
            'Model ID e.g. "openai/gpt-4o", "anthropic/claude-sonnet-4-5-20250929", "google/gemini-2.5-flash", "deepseek/deepseek-r1". Use nano_list_models to see all.',
        },
        prompt: {
          type: "string",
          description: "The user message / prompt to send",
        },
        system: {
          type: "string",
          description: "Optional system message",
        },
        temperature: {
          type: "number",
          description: "Sampling temperature 0-2 (default: model default)",
        },
        max_tokens: {
          type: "number",
          description: "Max tokens to generate",
        },
      },
      required: ["model", "prompt"],
    },
  },
  {
    name: "nano_generate_image",
    description:
      "Generate an image using NanoGPT. Supports models like gpt-image-1.5, nano-banana, flux-pro, recraft-v3, seedream-v4, stable-diffusion-3.5 etc. Returns image URL.",
    inputSchema: {
      type: "object",
      properties: {
        model: {
          type: "string",
          description:
            'Image model ID e.g. "gpt-image-1.5", "nano-banana", "flux-1.1-pro", "recraft-v3", "stable-diffusion-3.5-large". Use nano_list_models with type "image" to see all.',
        },
        prompt: {
          type: "string",
          description: "Text description of the image to generate",
        },
        size: {
          type: "string",
          description:
            'Image size e.g. "1024x1024", "1536x1024", "1024x1536". Defaults to "1024x1024".',
        },
        n: {
          type: "number",
          description: "Number of images to generate (default: 1)",
        },
      },
      required: ["model", "prompt"],
    },
  },
  {
    name: "nano_generate_video",
    description:
      "Generate a video using NanoGPT. Supports text-to-video and image-to-video models like Kling, Sora 2, Veo 3, Wan, MiniMax etc. Returns video URL. Videos may take 1-5 minutes to generate.",
    inputSchema: {
      type: "object",
      properties: {
        model: {
          type: "string",
          description:
            'Video model ID e.g. "kling-v26-pro", "sora-2", "veo3-video", "wan-wavespeed-25". Use nano_list_models with type "video" to see all.',
        },
        prompt: {
          type: "string",
          description: "Text description of the video to generate",
        },
        image_url: {
          type: "string",
          description:
            "Optional image URL for image-to-video generation (model must support it)",
        },
        duration: {
          type: "string",
          description: 'Video duration in seconds e.g. "5", "10"',
        },
        aspect_ratio: {
          type: "string",
          description: 'Aspect ratio e.g. "16:9", "9:16", "1:1"',
        },
      },
      required: ["model", "prompt"],
    },
  },
  {
    name: "nano_list_models",
    description:
      "List available models on NanoGPT. Filter by type: text (700+ LLMs), image (30+ generators), video (20+ generators). Returns model IDs, names, and pricing.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["text", "image", "video", "audio"],
          description: "Model type to list (default: text)",
        },
        search: {
          type: "string",
          description:
            "Optional search term to filter results (matches model ID or name)",
        },
      },
    },
  },
  {
    name: "nano_check_balance",
    description: "Check your NanoGPT account balance",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// ── Helpers ──────────────────────────────────────────────────────

function costFooter(data) {
  const parts = [];
  if (data.cost !== undefined) parts.push(`Cost: $${data.cost.toFixed(4)}`);
  if (data.remainingBalance !== undefined) parts.push(`Balance: $${data.remainingBalance.toFixed(4)}`);
  return parts.length ? `\n\n---\n${parts.join(" | ")}` : "";
}

// ── Tool handlers ────────────────────────────────────────────────

async function handleChat({ model, prompt, system, temperature, max_tokens }) {
  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });

  const body = { model, messages };
  if (temperature !== undefined) body.temperature = temperature;
  if (max_tokens !== undefined) body.max_tokens = max_tokens;

  const resp = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json();

  if (data.error) {
    return `Error: ${data.error.message || JSON.stringify(data.error)}`;
  }

  const content = data.choices?.[0]?.message?.content;
  const usage = data.usage;
  let result = content || "No content returned";
  const meta = [`Model: ${model}`];
  if (usage) meta.push(`Tokens: ${usage.prompt_tokens} in / ${usage.completion_tokens} out`);
  if (data.cost !== undefined) meta.push(`Cost: $${data.cost.toFixed(4)}`);
  if (data.remainingBalance !== undefined) meta.push(`Balance: $${data.remainingBalance.toFixed(4)}`);
  if (meta.length) result += `\n\n---\n${meta.join(" | ")}`;
  return result;
}

async function handleGenerateImage({ model, prompt, size, n }) {
  const body = {
    model,
    prompt,
    size: size || "1024x1024",
    n: n || 1,
    response_format: "url",
  };

  const resp = await fetch(`${BASE_URL}/v1/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json();

  if (data.error) {
    return `Error: ${data.error.message || JSON.stringify(data.error)}`;
  }

  const images = data.data || [];
  if (images.length === 0) return "No images returned";

  const lines = images.map((img, i) => {
    if (img.url) {
      return `Image ${i + 1}: ${img.url}`;
    }
    // Fallback: save base64 to temp file
    if (img.b64_json) {
      const ext = img.b64_json.startsWith("/9j/") ? "jpg" : "png";
      const filename = `nanogpt-${Date.now()}-${i + 1}.${ext}`;
      const filepath = join(tmpdir(), filename);
      writeFileSync(filepath, Buffer.from(img.b64_json, "base64"));
      return `Image ${i + 1}: saved to ${filepath}`;
    }
    return `Image ${i + 1}: no data returned`;
  });

  return lines.join("\n") + costFooter(data);
}

async function handleGenerateVideo({
  model,
  prompt,
  image_url,
  duration,
  aspect_ratio,
}) {
  const body = { model, prompt };
  if (image_url) body.image_url = image_url;
  if (duration) body.duration = duration;
  if (aspect_ratio) body.aspect_ratio = aspect_ratio;

  // Try the video generations endpoint
  const resp = await fetch(`${BASE_URL}/v1/video/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  // Check if we got JSON or HTML
  const contentType = resp.headers.get("content-type") || "";
  if (!contentType.includes("json")) {
    // Try alternate endpoint
    const resp2 = await fetch(`${BASE_URL}/v1/videos/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const data2 = await resp2.json().catch(() => null);
    if (data2?.error) {
      return `Error: ${data2.error.message || JSON.stringify(data2.error)}`;
    }
    if (data2?.data?.[0]?.url) {
      return `Video: ${data2.data[0].url}${costFooter(data2)}`;
    }
    return `Video generation submitted. Response: ${JSON.stringify(data2)}`;
  }

  const data = await resp.json();

  if (data.error) {
    return `Error: ${data.error.message || JSON.stringify(data.error)}`;
  }

  if (data.data?.[0]?.url) {
    return `Video: ${data.data[0].url}${costFooter(data)}`;
  }

  return `Video generation response: ${JSON.stringify(data)}`;
}

async function handleListModels({ type, search }) {
  const modelType = type || "text";
  let endpoint;

  switch (modelType) {
    case "image":
      endpoint = "/v1/image-models?detailed=true";
      break;
    case "video":
      endpoint = "/v1/video-models?detailed=true";
      break;
    case "audio":
      endpoint = "/v1/audio-models?detailed=true";
      break;
    default:
      endpoint = "/v1/models?detailed=true";
  }

  const data = await apiRequest(endpoint);
  let models = data.data || [];

  if (search) {
    const term = search.toLowerCase();
    models = models.filter(
      (m) =>
        m.id.toLowerCase().includes(term) ||
        (m.name && m.name.toLowerCase().includes(term)) ||
        (m.owned_by && m.owned_by.toLowerCase().includes(term))
    );
  }

  if (models.length === 0) return `No ${modelType} models found${search ? ` matching "${search}"` : ""}`;

  if (modelType === "text") {
    return models
      .map((m) => {
        let line = `${m.id}`;
        if (m.name) line += ` - ${m.name}`;
        if (m.pricing) {
          const p = m.pricing;
          if (p.prompt)
            line += ` ($${p.prompt}/${p.completion} per M tokens)`;
        }
        return line;
      })
      .join("\n");
  }

  return models
    .map((m) => {
      let line = `${m.id} - ${m.name || ""}`;
      if (m.pricing) {
        const p = m.pricing;
        if (p.per_image) {
          const first = Object.entries(p.per_image)[0];
          line += ` ($${first[1]}/${first[0]})`;
        } else if (p.per_duration) {
          const first = Object.entries(p.per_duration)[0];
          line += ` ($${first[1]}/${first[0]}s)`;
        }
      }
      if (m.capabilities) {
        const caps = Object.entries(m.capabilities)
          .filter(([, v]) => v)
          .map(([k]) => k)
          .join(", ");
        line += ` [${caps}]`;
      }
      return line;
    })
    .join("\n");
}

async function handleCheckBalance() {
  const data = await apiRequest("/check-balance", {
    method: "POST",
  });

  if (data.error) {
    return `Error: ${data.error.message || JSON.stringify(data.error)}`;
  }

  return `Balance: $${data.balance || data.credits || JSON.stringify(data)}`;
}

// ── Server setup ─────────────────────────────────────────────────

const server = new Server(
  { name: "nano-gpt", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  let result;
  try {
    switch (name) {
      case "nano_chat":
        result = await handleChat(args);
        break;
      case "nano_generate_image":
        result = await handleGenerateImage(args);
        break;
      case "nano_generate_video":
        result = await handleGenerateVideo(args);
        break;
      case "nano_list_models":
        result = await handleListModels(args || {});
        break;
      case "nano_check_balance":
        result = await handleCheckBalance();
        break;
      default:
        result = `Unknown tool: ${name}`;
    }
  } catch (err) {
    result = `Error: ${err.message}`;
  }

  return {
    content: [{ type: "text", text: result }],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
