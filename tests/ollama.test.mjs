import { askLocalOllama } from '../src/services/ollama.js';

async function runTests() {
  const originalFetch = globalThis.fetch;
  try {
    let requestBody;
    globalThis.fetch = async (url, options) => {
      if (url !== '/ollama/api/chat') throw new Error(`URL inattendue : ${url}`);
      requestBody = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({ message: { content: 'Réponse locale.' } })
      };
    };

    const answer = await askLocalOllama([{ role: 'user', content: 'Bonjour' }]);
    if (answer !== 'Réponse locale.' || requestBody.model !== 'qwen3:1.7b' || requestBody.stream !== false) {
      throw new Error('Échec : la requête Ollama locale ou sa réponse est incorrecte.');
    }

    globalThis.fetch = async () => ({ ok: false, status: 404 });
    await askLocalOllama([{ role: 'user', content: 'Bonjour' }]).then(
      () => { throw new Error('Échec : une erreur HTTP Ollama doit être signalée.'); },
      error => {
        if (!error.message.includes('HTTP 404')) throw error;
      }
    );

    console.log('✅ Tests de l’intégration Ollama validés.');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

runTests().catch(error => {
  console.error('❌ Échec des tests Ollama :', error.message);
  process.exit(1);
});
