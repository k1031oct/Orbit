import { Command } from '@tauri-apps/plugin-shell';
import { join, basename } from '@tauri-apps/api/path';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export class GovernanceManager {
  private ktlintJar: string | null = null;

  constructor() {}

  /**
   * 書き込み内容を検証する
   */
  async validateContent(filePath: string, content: string): Promise<ValidationResult> {
    const fileName = await basename(filePath);
    const lowercasePath = filePath.toLowerCase();

    // 1. XMLレイアウトの禁止 (フェーズ 2)
    if (fileName.endsWith('.xml') && lowercasePath.includes('layout')) {
      return { valid: false, error: 'XML Layouts are prohibited. Use Jetpack Compose instead.' };
    }
    if (content.trim().startsWith('<?xml')) {
      return { valid: false, error: 'Direct XML content writing is prohibited. Use Jetpack Compose instead.' };
    }

    // 2. ViewModel 命名規則 (フェーズ 2)
    if (fileName.endsWith('ViewModel.kt')) {
      const className = fileName.replace('.kt', '');
      const viewModelRegex = /^[A-Z][a-zA-Z0-9]*ViewModel$/;
      if (!viewModelRegex.test(className)) {
        return { 
          valid: false, 
          error: `ViewModel naming violation: '${className}' does not match 'FeatureNameViewModel' pattern.` 
        };
      }
    }

    return { valid: true };
  }

  /**
   * ktlint を使用してファイルを整形する
   */
  async formatCode(filePath: string): Promise<void> {
    if (!filePath.endsWith('.kt') && !filePath.endsWith('.kts')) return;

    try {
      if (!this.ktlintJar) {
        // Assume ktlint is in the app data or a known path
        // For development, we might use a fixed path or sidecar
        this.ktlintJar = 'bin/ktlint.jar';
      }
      
      const cmd = Command.create('java', ['-jar', this.ktlintJar, '-F', filePath]);
      const output = await cmd.execute();
      
      if (output.code === 0) {
        console.log(`ktlint auto-formatted: ${filePath}`);
      } else {
        console.log(`ktlint reporting formatting requirements for: ${filePath}`);
      }
    } catch (error: any) {
      console.error('ktlint execution failed:', error);
    }
  }
}
