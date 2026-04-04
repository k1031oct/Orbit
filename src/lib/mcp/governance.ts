import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * AI エージェントの自律開発に対する物理的ガードレール（検閲ロジック）
 */
export const GovernanceInterceptor = {
  /**
   * ガバナンス（規約）に則ってファイルを書き込む
   * 規約違反がある場合は、エラーメッセージを返し、書き込みを拒否する
   */
  async writeGovernedFile(filePath: string, content: string): Promise<{ success: boolean; message: string }> {
    // 1. 静的解析（規約チェック）
    const violations: string[] = [];

    // [RULE 1] XML レイアウト / View インポートの禁止 (Pure Compose 規約)
    if (content.includes('android.view.') || content.includes('inflate(') || content.includes('R.layout.')) {
      violations.push('ERROR: XML layouts and View-based UI are forbidden. All UI must use Jetpack Compose.');
    }

    // [RULE 2] ViewModel 命名規則 (MVVM 規約)
    const fileName = path.basename(filePath);
    if (fileName.endsWith('.kt') && !fileName.includes('ViewModel') && content.includes('ViewModel()')) {
      violations.push(`ERROR: ViewModel files must follow the naming convention (*ViewModel.kt). Found: ${fileName}`);
    }

    // [RULE 3] Controller 命名の禁止 (MVVM 規約)
    if (fileName.includes('Controller')) {
      violations.push('ERROR: "Controller" naming is forbidden. Use ViewModel for logic management.');
    }

    // 2. 結果の判定
    if (violations.length > 0) {
      return { 
        success: false, 
        message: violations.join('\n') 
      };
    }

    // 3. 書き込みの実行 (検証クリア後)
    try {
      // 親ディレクトリの作成
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
      
      return { 
        success: true, 
        message: `File written successfully under governance: ${path.basename(filePath)}` 
      };
    } catch (e) {
      return { success: false, message: `System Error during write: ${e}` };
    }
  }
};
