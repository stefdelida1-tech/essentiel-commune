const OLLAMA_CHAT_URL = '/ollama/api/chat';
const OLLAMA_MODEL = 'qwen3:1.7b';

export async function askLocalOllama(messages, { signal } = {}) {
  let response;
  try {
    response = await fetch(OLLAMA_CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false
      }),
      signal
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Ollama ne répond pas. Vérifie que l’application est lancée et que le modèle est installé.');
  }

  if (!response.ok) {
    throw new Error(`Ollama a renvoyé une erreur HTTP ${response.status}. Vérifie que le modèle ${OLLAMA_MODEL} est installé.`);
  }

  const result = await response.json();
  const answer = result.message?.content;
  if (typeof answer !== 'string' || !answer.trim()) {
    throw new Error('Ollama a répondu sans texte.');
  }

  return answer.trim();
}
