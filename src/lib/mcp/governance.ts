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
    const fileName = path.basename(filePath);
    // 1. 静的解析（規約チェック）
    const violations: string[] = [];

    // [RULE 1] XML レイアウト / View インポートの禁止 (Pure Compose 規約)
    if (content.includes('android.view.') || content.includes('inflate(') || content.includes('R.layout.') || fileName.endsWith('.xml')) {
      violations.push('ERROR: XML layouts and View-based UI are strictly forbidden. All UI must use Jetpack Compose.');
    }

    // [RULE 2] ViewModel 命名規則 (MVVM 規約)
    if (fileName.endsWith('.kt')) {
      const isViewModelClass = content.includes('ViewModel()') || content.includes(': ViewModel');
      const hasViewModelSuffix = fileName.endsWith('ViewModel.kt');
      
      if (isViewModelClass && !hasViewModelSuffix) {
        violations.push(`ERROR: ViewModel implementation found in '${fileName}', but the naming convention (*ViewModel.kt) is not followed.`);
      }
      
      if (hasViewModelSuffix && !isViewModelClass && !content.includes('interface')) {
         violations.push(`ERROR: File '${fileName}' is named as a ViewModel but does not appear to implement one.`);
      }
    }

    // [RULE 3] Repository 命名規則 (Data-Flow 規約)
    if (content.includes('Repository') && !fileName.endsWith('Repository.kt') && fileName.endsWith('.kt')) {
        violations.push(`ERROR: Repository implementations must follow (*Repository.kt) naming convention. Found: ${fileName}`);
    }

    // [RULE 4] Controller 命名の禁止 (MVVM 規約)
    if (fileName.includes('Controller')) {
      violations.push('ERROR: "Controller" naming is forbidden. Use ViewModel for logic management as per MVVM architecture.');
    }

    // [RULE 5] DATA_FLOW への言及
    if (fileName === 'DATA_FLOW.md' && !content.includes('└─')) {
      violations.push('ERROR: DATA_FLOW.md must use the mandatory tree-style table format (using └─ for indentation).');
    }

    // 2. 結果の判定
    if (violations.length > 0) {
      return { 
        success: false, 
        message: `--- Governance Violation ---\n${violations.join('\n')}\n--- Please align your code with the PROJECT_CONSTITUTION. ---` 
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
