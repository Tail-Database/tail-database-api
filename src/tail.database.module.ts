import { Module } from '@nestjs/common';
import { connectionOptions } from './config/rpc.config';
import { DataLayer } from './tail-database-client/datalayer/rpc/data_layer';
import { Tail } from './tail-database-client/models/tail/model';

const datalayer = new DataLayer({
    ...connectionOptions,
    // Temporarily hacking in testnet10 store id
    id: '073edb36a4a982c3d00999b1d925d304e7867afa68eb535e3071ee2f682700ea',
})
const tail = new Tail(datalayer);

@Module({
  imports: [],
  controllers: [],
  providers: [{
    provide: Tail,
    useValue: tail
}],
  exports: [Tail],
})
export class TailDatabaseModule {}
