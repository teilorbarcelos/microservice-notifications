import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { Challenge } from './interfaces/challenge.interface';
import { Player } from './interfaces/player.interface';
import { ClientProxySmartRanking } from './proxyrmq/client-proxy';
import HTML_NOTIFICACAO_ADVERSARIO from './static/html-notification-opponent';

@Injectable()
export class AppService {
  constructor(
    private clientProxySmartRanking: ClientProxySmartRanking,
    private readonly mailerService: MailerService,
  ) {}

  private readonly logger = new Logger(AppService.name);

  private clientAdminBackend =
    this.clientProxySmartRanking.getClientProxyAdminBackendInstance();

  async sendOpponentEmail(challenge: Challenge): Promise<void> {
    try {
      let opponentId = '';

      challenge.players.map((player) => {
        if (player !== challenge.challenger) {
          opponentId = player;
        }
      });

      const opponent: Player = await lastValueFrom(
        this.clientAdminBackend.send('get-players', opponentId),
      );

      const challenger: Player = await lastValueFrom(
        this.clientAdminBackend.send('get-players', challenge.challenger),
      );

      let markup = '';
      markup = HTML_NOTIFICACAO_ADVERSARIO;
      markup = markup.replace(/#NOME_ADVERSARIO/g, opponent.name);
      markup = markup.replace(/#NOME_CHALLENGER/g, challenger.name);

      this.mailerService
        .sendMail({
          to: opponent.email,
          from: `"SMART RANKING" <email@example.com>`,
          subject: 'You was challenged!',
          html: markup,
        })
        .then((success) => {
          this.logger.log(success);
        })
        .catch((error) => {
          this.logger.error(error);
        });
    } catch (error) {
      this.logger.error(`error: ${JSON.stringify(error.message)}`);
      throw new RpcException(error.message);
    }
  }
}
