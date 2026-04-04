import { Command } from '@tauri-apps/plugin-shell';

/**
 * Git 操作（クローン、プル、ステータス確認）を統括するリポジトリ
 */
export const GitRepository = {
  /**
   * リモートリポジトリをローカルにクローンする
   */
  async clone(url: string, targetPath: string): Promise<{ success: boolean, error?: string }> {
    try {
      const command = Command.create('git-clone', ['clone', url, targetPath]);
      const output = await command.execute();
      return { 
        success: output.code === 0, 
        error: output.code === 0 ? undefined : output.stderr 
      };
    } catch (e: any) {
      console.error('Git clone failed:', e);
      return { success: false, error: String(e) };
    }
  },

  /**
   * 最新の変更をプルする
   */
  async pull(projectPath: string): Promise<{ success: boolean, error?: string }> {
    try {
      const command = Command.create('git-pull', ['pull'], { cwd: projectPath });
      const output = await command.execute();
      return { 
        success: output.code === 0, 
        error: output.code === 0 ? undefined : output.stderr 
      };
    } catch (e: any) {
      console.error('Git pull failed:', e);
      return { success: false, error: String(e) };
    }
  },

  /**
   * バージョンを確認（接続テスト用）
   */
  async getVersion(): Promise<string> {
    try {
      const command = Command.create('git-version', ['version']);
      const output = await command.execute();
      return output.stdout.trim();
    } catch (e) {
      return 'Git not found';
    }
  }
};
