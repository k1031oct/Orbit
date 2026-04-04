import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export class GovernanceManager {
  private ktlintJar: string;

  constructor() {
    this.ktlintJar = path.join(process.cwd(), 'bin', 'ktlint.jar');
  }

  /**
   * 書き込み内容を検証する
   * @param filePath 書き込み先のパス
   * @param content 書き込み内容
   */
  validateContent(filePath: string, content: string): ValidationResult {
    const fileName = path.basename(filePath);
    const lowercasePath = filePath.toLowerCase();

    // 1. XMLレイアウトの禁止 (フェーズ 2)
    // .xml ファイル、またはパスに layout を含む場合、または <?xml で始まる場合
    if (fileName.endsWith('.xml') && lowercasePath.includes('layout')) {
      return { valid: false, error: 'XML Layouts are prohibited. Use Jetpack Compose instead.' };
    }
    if (content.trim().startsWith('<?xml')) {
      return { valid: false, error: 'Direct XML content writing is prohibited. Use Jetpack Compose instead.' };
    }

    // 2. ViewModel 命名規則 (フェーズ 2)
    // クラス名に ViewModel が含まれる場合、末尾が ViewModel であることを確認
    // かつ、任意の PascalCase の プレフィックスを許可
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
   * @param filePath 整形対象のファイルパス
   */
  async formatCode(filePath: string): Promise<void> {
    if (!filePath.endsWith('.kt') && !filePath.endsWith('.kts')) return;

    try {
      // -F オプションで自動修復
      const command = `java -jar "${this.ktlintJar}" -F "${filePath}"`;
      await execAsync(command);
      console.log(`ktlint auto-formatted: ${filePath}`);
    } catch (error: any) {
      // 修正できないエラーがある場合も終了コードが0以外になることがあるので
      // ログを出力して続行
      console.log(`ktlint reporting formatting requirements for: ${filePath}`);
    }
  }
}
