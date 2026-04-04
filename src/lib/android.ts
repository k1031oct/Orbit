import { Command } from '@tauri-apps/plugin-shell';
import { join } from '@tauri-apps/api/path';
import { exists } from '@tauri-apps/plugin-fs';

export interface AndroidStatus {
  connected: boolean;
  apps?: string[];
}

export type OutputCallback = (line: string) => void;

/**
 * Android 開発実行環境のコア
 */
export const AndroidExecutor = {
  /**
   * 単発のコマンドを実行し、結果を返す
   */
  async runCommand(args: string[], onOutput?: OutputCallback, cwd?: string): Promise<boolean> {
    try {
      const command = Command.create('adb', args, { cwd });
      
      if (onOutput) {
        command.stdout.on('data', line => onOutput(line));
        command.stderr.on('data', line => onOutput(`[ERROR] ${line}`));
        
        return new Promise(async (resolve) => {
          command.on('close', data => {
            resolve(data.code === 0);
          });
          command.on('error', err => {
            onOutput(`[CRITICAL] Spawn error: ${err}`);
            resolve(false);
          });
          await command.spawn();
        });
      } else {
        const output = await command.execute();
        return output.code === 0;
      }
    } catch (e) {
      console.error('ADB Command failed:', e);
      if (onOutput) onOutput(`[CRITICAL] ADB Command failed: ${e}`);
      return false;
    }
  },

  /**
   * Gradle ビルドを実行し、出力をストリーミングする
   */
  async runGradle(projectPath: string, args: string[], onOutput?: OutputCallback): Promise<boolean> {
    try {
      // Windows 向け gradlew
      const command = Command.create('cmd', ['/c', 'gradlew.bat', ...args], { cwd: projectPath });
      
      if (onOutput) {
        command.stdout.on('data', line => onOutput(line));
        command.stderr.on('data', line => onOutput(`[GRADLE ERROR] ${line}`));
      }

      return new Promise(async (resolve) => {
        command.on('close', data => {
          resolve(data.code === 0);
        });
        command.on('error', err => {
          if (onOutput) onOutput(`[CRITICAL] Gradle spawn error: ${err}`);
          resolve(false);
        });
        await command.spawn();
      });
    } catch (e) {
      console.error('Gradle Execution failed:', e);
      if (onOutput) onOutput(`[CRITICAL] Gradle failed: ${e}`);
      return false;
    }
  },

  /**
   * 生成された APK を検索する
   */
  async findApk(projectPath: string): Promise<string | null> {
    try {
      // 標準的なデバッグ APK パス
      const standardPath = await join(projectPath, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
      if (await exists(standardPath)) {
        return standardPath;
      }
      return null;
    } catch (e) {
      console.error('APK Search failed:', e);
      return null;
    }
  },

  /**
   * 指定したパッケージ名のアプリを起動する
   */
  async launchApp(packageName: string, onOutput?: OutputCallback): Promise<boolean> {
    // 慣習的に .MainActivity を起動（プロジェクト設定により異なる可能性あり）
    return this.runCommand(['shell', 'am', 'start', '-n', `${packageName}/${packageName}.MainActivity`], onOutput);
  }
};
