import loadBls from '@chiamine/bls-signatures';
import { Module } from '@nestjs/common';
import { Coin, DataLayer, Tail } from '@tail-database/tail-database-client';
import { Bls } from './bls';
import { connectionOptions } from './config/rpc.config';
import { NftController } from './nft/nft.controller';
import { NftService } from './nft/nft.service';
import { TailController } from './tail/tail.controller';
import { TailService } from './tail/tail.service';

const bls = {
    provide: 'BLS',
    useFactory: async () => loadBls(),
};

const datalayer = new DataLayer({
    ...connectionOptions,
    // Temporarily hacking in mainnet store id
    id: 'fd1078bf0d01743e8e685b72635ca15488f5adce0da016b229f8885a3de36c0f',
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
    }, TailService, NftService, Bls, bls],
    exports: [Tail],
})
export class TailDatabaseModule { }
