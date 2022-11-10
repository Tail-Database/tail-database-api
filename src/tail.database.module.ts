import { Module } from '@nestjs/common';
import { Coin, DataLayer, Tail } from '@tail-database/tail-database-client';
import { connectionOptions } from './config/rpc.config';
import { NftController } from './nft/nft.controller';
import { NftService } from './nft/nft.service';
import { TailController } from './tail/tail.controller';
import { TailService } from './tail/tail.service';

const datalayer = new DataLayer({
    ...connectionOptions,
    // Temporarily hacking in testnet10 store id
    id: '073edb36a4a982c3d00999b1d925d304e7867afa68eb535e3071ee2f682700ea',
})
const coin = new Coin(connectionOptions);
const tail = new Tail(datalayer);

@Module({
    imports: [],
    controllers: [TailController, NftController],
    providers: [{
        provide: Coin,
        useValue: coin
    }, {
        provide: Tail,
        useValue: tail
    }, TailService, NftService],
    exports: [Tail],
})
export class TailDatabaseModule { }
