import { Module } from '@nestjs/common';
import { PublicBookController } from './public-book.controller';
import { PublicBookService } from './public-book.service';

@Module({ controllers: [PublicBookController], providers: [PublicBookService] })
export class PublicBookModule {}
