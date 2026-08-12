import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from './auth/auth.decorators';

@ApiTags('app-update')
@Controller('app-update')
export class AppUpdateController {
  @Public()
  @Get('android')
  android() {
    const versionCode = Number(process.env.ANDROID_LATEST_VERSION_CODE ?? 0);
    const downloadUrl = process.env.ANDROID_APK_URL?.trim() ?? '';
    const minimumSupportedVersionCode = Number(process.env.ANDROID_MIN_SUPPORTED_VERSION_CODE ?? 0);
    const enabled = Number.isInteger(versionCode) && versionCode > 0 && /^https:\/\//i.test(downloadUrl);

    return {
      enabled,
      versionCode: enabled ? versionCode : 0,
      versionName: process.env.ANDROID_LATEST_VERSION_NAME?.trim() || String(versionCode),
      minimumSupportedVersionCode: Number.isInteger(minimumSupportedVersionCode)
        ? Math.max(0, minimumSupportedVersionCode)
        : 0,
      downloadUrl: enabled ? downloadUrl : '',
      releaseNotes: (process.env.ANDROID_RELEASE_NOTES ?? '')
        .split('|')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 5),
    };
  }
}
