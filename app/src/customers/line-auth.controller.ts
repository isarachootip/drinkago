import { Body, Controller, Get, HttpCode, Inject, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { z } from 'zod';
import { Public } from '../common/auth';
import { DomainError } from '../common/errors';
import { parse } from '../common/validate';
import { APP_CONFIG, AppConfig } from '../config';
import {
  buildLineAuthorizeUrl,
  LineAuthService,
  signLineOauthState,
  verifyLineOauthState,
} from './line-auth.service';

const liffLoginSchema = z.object({
  idToken: z.string().min(10, 'กรุณาส่ง LINE ID Token'),
});

@Controller('auth/line')
export class LineAuthController {
  constructor(
    private readonly lineAuth: LineAuthService,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  @Get('config')
  @Public()
  getConfig() {
    return this.lineAuth.getPublicConfig();
  }

  @Post('liff')
  @Public()
  @HttpCode(200)
  async loginWithLiff(@Body() body: unknown) {
    const dto = parse(liffLoginSchema, body);
    const profile = await this.lineAuth.verifyIdTokenWithLine(dto.idToken);
    const user = await this.lineAuth.findOrCreateUser(profile.lineUserId, profile.displayName);
    return this.lineAuth.issueSession(user);
  }

  @Get('start')
  @Public()
  startOauth(
    @Query('tab') tab: string | undefined,
    @Query('orderId') orderId: string | undefined,
    @Res() res: Response,
  ) {
    const channelId = this.lineAuth.getEffectiveLoginChannelId();
    const channelSecret = this.cfg.LINE_LOGIN_CHANNEL_SECRET;
    if (!channelId || !channelSecret) {
      throw new DomainError(
        400,
        'LINE_LOGIN_NOT_CONFIGURED',
        'กรุณาตั้งค่า LINE_LOGIN_CHANNEL_ID และ LINE_LOGIN_CHANNEL_SECRET บนเซิร์ฟเวอร์ก่อนใช้งานปุ่ม Login ผ่านเว็บ',
      );
    }
    const state = signLineOauthState({ tab, orderId }, this.lineAuth.getSigningSecret());
    const authorizeUrl = buildLineAuthorizeUrl({
      channelId,
      callbackUrl: this.lineAuth.getCallbackUrl(),
      state,
    });
    return res.redirect(authorizeUrl);
  }

  @Get('callback')
  @Public()
  async handleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') oauthError: string | undefined,
    @Res() res: Response,
  ) {
    const webBase = this.cfg.PUBLIC_WEB_URL.replace(/\/+$/, '');
    if (oauthError || !code) {
      return res.redirect(`${webBase}/?lineError=${encodeURIComponent(oauthError || 'cancelled')}`);
    }
    const verifiedState = verifyLineOauthState(state, this.lineAuth.getSigningSecret());
    if (!verifiedState) {
      return res.redirect(`${webBase}/?lineError=invalid_state`);
    }

    const profile = await this.lineAuth.exchangeOauthCode(code);
    const user = await this.lineAuth.findOrCreateUser(profile.lineUserId, profile.displayName);
    const session = await this.lineAuth.issueSession(user);
    const redirectParams = new URLSearchParams({
      lineUserId: user.lineUserId,
      lineToken: session.lineToken,
      tab: verifiedState.tab,
      ...(verifiedState.orderId ? { orderId: verifiedState.orderId } : {}),
    });
    return res.redirect(`${webBase}/?${redirectParams.toString()}`);
  }
}
