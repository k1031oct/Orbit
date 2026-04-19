import { invoke } from '@tauri-apps/api/core';

export type AiProvider = 'INTERNAL' | 'GEMINI' | 'OLLAMA';

export interface AiRequest {
  prompt: string;
  systemPrompt?: string;
  provider?: AiProvider;
}

export class AiRepository {
  private static provider: AiProvider = 'INTERNAL';

  static setProvider(provider: AiProvider) {
    this.provider = provider;
  }

  static async generate(request: AiRequest): Promise<string> {
    const provider = request.provider || this.provider;

    if (provider === 'INTERNAL') {
      try {
        const isModelReady = await invoke<boolean>('check_model_downloaded', { modelId: 'gemma-2-2b' });
        if (!isModelReady) {
          throw new Error('Internal Model not downloaded');
        }

        return await invoke<string>('generate_text_internal', { 
          prompt: request.prompt, 
          modelId: 'gemma-2-2b' 
        });
      } catch (e) {
        console.warn('Internal AI failed, falling back to standard provider.', e);
        // Fallback or error
        return `[ERROR] Internal AI unavailable: ${e}`;
      }
    }

    // TODO: Implement GEMINI and OLLAMA fallback if needed
    // For now, Orbit's upgrade focuses on INTERNAL integration.
    return `Provider ${provider} not fully integrated in this build yet.`;
  }

  /**
   * モデルのダウンロードを開始する
   */
  static async startModelDownload(onProgress?: (progress: number) => void): Promise<void> {
    const { listen } = await import('@tauri-apps/api/event');
    
    const unlisten = await listen<any>('model-download-progress', (event) => {
      if (onProgress) onProgress(event.payload.progress);
    });

    try {
      await invoke('download_model', { modelId: 'gemma-2-2b' });
    } finally {
      unlisten();
    }
  }

  /**
   * モデルが準備できているか確認
   */
  static async checkModelReady(): Promise<boolean> {
    return await invoke<boolean>('check_model_downloaded', { modelId: 'gemma-2-2b' });
  }
}
