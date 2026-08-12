import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { existsSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { Public } from './auth/auth.decorators';

interface WebUpdateManifest {
  buildNumber: number;
  version: string;
  fileName: string;
  sha256: string;
  minimumNativeVersionCode?: number;
  releaseNotes?: string[];
}

interface NativeUpdateManifest {
  versionCode: number;
  versionName: string;
  mandatory?: boolean;
  releaseNotes?: string[];
  stores?: {
    bazaar?: string;
    myket?: string;
    googlePlay?: string;
  };
}

@ApiTags('app-update')
@Controller('app-update/android')
export class AppUpdateController {
  private get updateDirectory() {
    return resolve(process.env.ANDROID_UPDATE_DIR ?? join(process.cwd(), 'updates/android'));
  }

  @Public()
  @Get()
  @Header('Cache-Control', 'no-store, max-age=0')
  android() {
    const publicBaseUrl = process.env.PUBLIC_BASE_URL?.trim().replace(/\/$/, '');
    const web = this.readWebManifest();
    const native = this.readNativeManifest();

    return {
      web: web && publicBaseUrl && /^https:\/\//i.test(publicBaseUrl)
        ? {
            enabled: true,
            buildNumber: web.buildNumber,
            version: web.version,
            sha256: web.sha256,
            minimumNativeVersionCode: Math.max(0, Number(web.minimumNativeVersionCode ?? 0)),
            downloadUrl: `${publicBaseUrl}/api/v1/app-update/android/web/${encodeURIComponent(web.fileName)}`,
            releaseNotes: Array.isArray(web.releaseNotes) ? web.releaseNotes.slice(0, 5) : [],
          }
        : { enabled: false },
      native: native
        ? {
            enabled: true,
            versionCode: native.versionCode,
            versionName: native.versionName,
            mandatory: native.mandatory === true,
            releaseNotes: Array.isArray(native.releaseNotes) ? native.releaseNotes.slice(0, 5) : [],
            stores: native.stores ?? {},
          }
        : { enabled: false },
    };
  }

  @Public()
  @Get('web/:fileName')
  downloadWeb(@Param('fileName') requestedFileName: string, @Res() response: Response) {
    const fileName = basename(requestedFileName);
    const filePath = join(this.updateDirectory, fileName);
    if (fileName !== requestedFileName || !/^web-[1-9][0-9]*\.zip$/.test(fileName) || !existsSync(filePath)) {
      throw new NotFoundException('بسته به‌روزرسانی وب یافت نشد.');
    }
    response.setHeader('Content-Type', 'application/zip');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return response.sendFile(filePath);
  }

  private readWebManifest(): WebUpdateManifest | null {
    try {
      const value = JSON.parse(readFileSync(join(this.updateDirectory, 'web-latest.json'), 'utf8')) as Partial<WebUpdateManifest>;
      if (
        typeof value.buildNumber !== 'number'
        || !Number.isInteger(value.buildNumber)
        || value.buildNumber <= 0
        || typeof value.version !== 'string'
        || !/^[a-zA-Z0-9._-]+$/.test(value.version)
        || typeof value.fileName !== 'string'
        || basename(value.fileName) !== value.fileName
        || !/^web-[1-9][0-9]*\.zip$/.test(value.fileName)
        || typeof value.sha256 !== 'string'
        || !/^[a-f0-9]{64}$/i.test(value.sha256)
        || !existsSync(join(this.updateDirectory, value.fileName))
      ) return null;
      return value as WebUpdateManifest;
    } catch {
      return null;
    }
  }

  private readNativeManifest(): NativeUpdateManifest | null {
    try {
      const value = JSON.parse(readFileSync(join(this.updateDirectory, 'native-latest.json'), 'utf8')) as Partial<NativeUpdateManifest>;
      const stores: NonNullable<NativeUpdateManifest['stores']> = value.stores ?? {};
      const urls = [stores.bazaar, stores.myket, stores.googlePlay].filter(Boolean);
      if (
        typeof value.versionCode !== 'number'
        || !Number.isInteger(value.versionCode)
        || value.versionCode <= 0
        || typeof value.versionName !== 'string'
        || !value.versionName.trim()
        || !urls.length
        || urls.some((url) => typeof url !== 'string' || !/^https:\/\//i.test(url))
      ) return null;
      return value as NativeUpdateManifest;
    } catch {
      return null;
    }
  }
}
