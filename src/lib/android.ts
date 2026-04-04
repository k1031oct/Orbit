import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export interface BuildResult {
  success: boolean;
  output: string;
  errorLog?: string;
  apkPath?: string;
  duration?: number;
}

export interface ADBDevice {
  id: string;
  status: string;
}

export interface UIAuditResult {
  success: boolean;
  missingElements: string[];
  xml: string;
}

export class AndroidExecutor {
  private sdkPath: string;
  private adbPath: string;

  constructor(sdkPath?: string) {
    // デフォルトのSDKパス（ユーザー環境に合わせて調整）
    this.sdkPath = sdkPath || process.env.ANDROID_HOME || path.join(process.env.USERPROFILE || '', 'AppData/Local/Android/Sdk');
    // adbのパス。環境変数になければSCrapy同梱のパスなどを試行
    this.adbPath = 'adb'; // 既にPathに通っていることを前提とするが、必要なら絶対パスを指定
  }

  /**
   * 環境のセットアップ状態を確認し、必要に応じて local.properties を生成する
   */
  async ensureEnvironment(projectPath: string): Promise<void> {
    const localPropertiesPath = path.join(projectPath, 'local.properties');
    const sdkPathEscaped = this.sdkPath.replace(/\\/g, '/');
    const content = `sdk.dir=${sdkPathEscaped}\n`;

    try {
      await fs.writeFile(localPropertiesPath, content);
      console.log(`Updated local.properties at ${localPropertiesPath}`);
    } catch (error) {
      console.error('Failed to write local.properties:', error);
      throw error;
    }
  }

  /**
   * Gradleビルドを実行する
   */
  async build(projectPath: string, task: string = 'assembleDebug'): Promise<BuildResult> {
    const startTime = Date.now();
    const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
    const command = `${gradlew} ${task}`;

    try {
      await this.ensureEnvironment(projectPath);
      
      const { stdout, stderr } = await execAsync(command, {
        cwd: projectPath,
        env: { ...process.env, ANDROID_HOME: this.sdkPath }
      });

      const duration = Date.now() - startTime;
      
      // APKパスの推定（通常は app/build/outputs/apk/debug/app-debug.apk）
      const apkPath = path.join(projectPath, 'app/build/outputs/apk/debug/app-debug.apk');

      return {
        success: true,
        output: stdout,
        apkPath,
        duration
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        output: error.stdout || '',
        errorLog: error.stderr || error.message,
        duration
      };
    }
  }

  /**
   * 接続されているデバイス一覧を取得
   */
  async getDevices(): Promise<ADBDevice[]> {
    try {
      const { stdout } = await execAsync(`${this.adbPath} devices`);
      const lines = stdout.split('\n').slice(1);
      return lines
        .map(line => {
          const [id, status] = line.trim().split(/\s+/);
          return id ? { id, status } : null;
        })
        .filter((device): device is ADBDevice => device !== null);
    } catch (error) {
      console.error('Failed to get devices:', error);
      return [];
    }
  }

  /**
   * APKをインストールする
   */
  async install(apkPath: string, deviceId?: string): Promise<void> {
    const target = deviceId ? `-s ${deviceId}` : '';
    await execAsync(`${this.adbPath} ${target} install -r "${apkPath}"`);
  }

  /**
   * 指定したパッケージのメインActivityを起動する
   */
  async launch(packageName: string, deviceId?: string): Promise<void> {
    const target = deviceId ? `-s ${deviceId}` : '';
    // 通常は .MainActivity だが、マニフェストからの解析が必要な場合もある
    const command = `${this.adbPath} ${target} shell am start -n ${packageName}/${packageName}.MainActivity`;
    await execAsync(command);
  }

  /**
   * 現在の画面のUI木（XML）を取得し、特定の要素が存在するか監査する
   */
  async auditUI(expectedTexts: string[], deviceId?: string): Promise<UIAuditResult> {
    const target = deviceId ? `-s ${deviceId}` : '';
    const dumpFile = '/sdcard/view.xml';
    
    try {
      // Dump UI to file on device
      await execAsync(`${this.adbPath} ${target} shell uiautomator dump ${dumpFile}`);
      // Pull file to local
      const { stdout: xmlContent } = await execAsync(`${this.adbPath} ${target} shell cat ${dumpFile}`);
      
      const missingElements = expectedTexts.filter(text => !xmlContent.includes(text));
      
      return {
        success: missingElements.length === 0,
        missingElements,
        xml: xmlContent
      };
    } catch (error: any) {
      console.error('UI Audit failed:', error);
      throw error;
    }
  }

  /**
   * 現在の画面のスクリーンショットを撮影し、サーバーのpublicディレクトリに保存する
   */
  async takeScreenshot(projectId: string, deviceId?: string): Promise<string> {
    const target = deviceId ? `-s ${deviceId}` : '';
    const deviceTempPath = '/sdcard/screen.png';
    const publicDir = path.join(process.cwd(), 'public', 'screenshots');
    const fileName = `${projectId}_${Date.now()}.png`;
    const localPath = path.join(publicDir, fileName);

    try {
      await fs.mkdir(publicDir, { recursive: true });
      await execAsync(`${this.adbPath} ${target} shell screencap -p ${deviceTempPath}`);
      await execAsync(`${this.adbPath} ${target} pull ${deviceTempPath} "${localPath}"`);
      
      return `/screenshots/${fileName}`;
    } catch (error: any) {
      console.error('Screenshot failed:', error);
      throw error;
    }
  }

  /**
   * エラーログを解析して構造化する（簡易版）
   */
  parseError(output: string): any[] {
    const errors: any[] = [];
    const lines = output.split('\n');
    
    // e: /path/to/file.kt: (line, col): message
    const errorRegex = /e: (.*): \((\d+), (\d+)\): (.*)/;
    
    for (const line of lines) {
      const match = line.match(errorRegex);
      if (match) {
        errors.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          message: match[4]
        });
      }
    }
    return errors;
  }
}
