import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';
import { AppLoggerService } from 'src/shared/logger/logger.service';
import { LogMethods } from 'src/shared/logger/log-methods.decorator';

@LogMethods()
@Injectable()
export class FfmpegService {
  constructor(private readonly logger: AppLoggerService) {}

  /**
   * Run ffmpeg with given args. Rejects with stderr message on non-zero exit.
   */
  async runFfmpeg(args: string[]): Promise<void> {
    return this.logger.trackExternalCall(
      { provider: 'ffmpeg', operation: 'run', request: { args } },
      () =>
        new Promise<void>((resolve, reject) => {
          const proc = spawn('ffmpeg', args, {
            stdio: ['ignore', 'pipe', 'pipe'],
          });
          let stderr = '';
          proc.stderr?.on('data', (d: Buffer) => {
            stderr += d.toString();
          });
          proc.on('close', (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`ffmpeg failed: ${stderr.slice(-500)}`));
            }
          });
          proc.on('error', (err) => {
            reject(err);
          });
        }),
    );
  }

  /** Get video dimensions via ffprobe. */
  async getVideoDimensions(
    inputPath: string,
  ): Promise<{ width: number; height: number }> {
    return this.logger.trackExternalCall(
      { provider: 'ffmpeg', operation: 'ffprobe', request: { inputPath } },
      () =>
        new Promise<{ width: number; height: number }>((resolve, reject) => {
          const args = [
            '-v',
            'error',
            '-select_streams',
            'v:0',
            '-show_entries',
            'stream=width,height',
            '-of',
            'json',
            inputPath,
          ];
          const proc = spawn('ffprobe', args, {
            stdio: ['ignore', 'pipe', 'pipe'],
          });
          let out = '';
          let err = '';
          proc.stdout?.on('data', (d: Buffer) => {
            out += d.toString();
          });
          proc.stderr?.on('data', (d: Buffer) => {
            err += d.toString();
          });
          proc.on('close', (code) => {
            if (code !== 0) {
              reject(new Error(`ffprobe failed: ${err}`));
              return;
            }
            const data = JSON.parse(out) as {
              streams?: Array<{ width?: number; height?: number }>;
            };
            const stream = data.streams?.[0];
            if (!stream?.width || !stream?.height) {
              reject(new Error('No video stream or dimensions'));
              return;
            }
            resolve({ width: stream.width, height: stream.height });
          });
          proc.on('error', reject);
        }),
    );
  }
}
