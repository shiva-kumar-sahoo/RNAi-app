export const AVAILABLE_MODELS = [
  {
    id: "gemma-3-1b-it",
    name: "Gemma 3 1B Instruct",
    shortName: "Gemma",
    badgeColor: "#1a73e8",
    description:
      "Google's newest small model. Best quality for its size, fast on most phones.",
    size: "810 MB",
    filename: "gemma-3-1b-it-Q4_K_M.gguf",
    downloadUrl:
      "https://huggingface.co/ggml-org/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q4_K_M.gguf?download=true",
    params: {
      use_mlock: true,
      n_ctx: 2048,
      n_gpu_layers: 1,
    },
    systemPrompt:
      "You are a helpful, friendly AI assistant. Give clear, accurate answers and keep them concise.",
  },
  {
    id: "llama-3.2-1b-instruct",
    name: "Llama 3.2 1B Instruct",
    shortName: "Llama 1B",
    badgeColor: "#0b6e4f",
    description:
      "Meta's compact model with solid instruction following. Good all-round pick for low-memory phones.",
    size: "810 MB",
    filename: "Llama-3.2-1B-Instruct-Q4_K_M.gguf",
    downloadUrl:
      "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf?download=true",
    params: {
      use_mlock: true,
      n_ctx: 2048,
      n_gpu_layers: 1,
    },
    systemPrompt:
      "You are a helpful, friendly AI assistant. Give clear, accurate answers and keep them concise.",
  },
  {
    id: "qwen2.5-1.5b-instruct",
    name: "Qwen2.5 1.5B Instruct",
    shortName: "Qwen 1.5B",
    badgeColor: "#4a9eff",
    description:
      "A step up from the 0.5B model with better reasoning and multilingual support.",
    size: "1.1 GB",
    filename: "qwen2.5-1.5b-instruct-q4_k_m.gguf",
    downloadUrl:
      "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf?download=true",
    params: {
      use_mlock: true,
      n_ctx: 2048,
      n_gpu_layers: 1,
    },
    systemPrompt:
      "You are a helpful, friendly AI assistant. Give clear, accurate answers and keep them concise.",
  },
  {
    id: "llama-3.2-3b-instruct",
    name: "Llama 3.2 3B Instruct",
    shortName: "Llama 3B",
    badgeColor: "#7e4aff",
    description:
      "Highest quality here. Needs a phone with 6 GB+ RAM.",
    size: "2.0 GB",
    filename: "Llama-3.2-3B-Instruct-Q4_K_M.gguf",
    downloadUrl:
      "https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf?download=true",
    params: {
      use_mlock: false,
      n_ctx: 2048,
      n_gpu_layers: 1,
    },
    systemPrompt:
      "You are a helpful, friendly AI assistant. Give clear, accurate answers and keep them concise.",
  },
  {
    id: "qwen2.5-0.5b",
    name: "Qwen2.5-0.5B-Instruct",
    shortName: "Qwen",
    badgeColor: "#4a9eff",
    description:
      "A small but efficient language model optimized for mobile devices. Good for basic chat and simple tasks.",
    size: "500 MB",
    filename: "qwen2.5-0.5b-instruct-q4_0.gguf",
    downloadUrl:
      "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_0.gguf?download=true",
    params: {
      use_mlock: true,
      n_ctx: 2048,
      n_gpu_layers: 1,
    },
    systemPrompt:
      "You are Qwen, a helpful AI assistant. Provide concise and accurate responses.",
  },
  {
    id: "tinyllama-1.1b-chat",
    name: "TinyLlama 1.1B Chat",
    shortName: "TinyLlama",
    badgeColor: "#7e4aff",
    description:
      "A compact and efficient model designed for chat applications. Ideal for lightweight tasks and mobile use.",
    size: "700 MB",
    filename: "tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf",
    downloadUrl:
      "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf?download=true",
    params: {
      use_mlock: true,
      n_ctx: 2048,
      n_gpu_layers: 1,
    },
    systemPrompt:
      "You are TinyLlama, a helpful AI assistant. Provide concise and accurate responses.",
  },
];
