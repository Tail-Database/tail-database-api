import { Controller, Get, Param, Logger } from '@nestjs/common';
import { NftService } from './nft.service';

interface NftUriResponse {
    uri: string;
}

@Controller('nft')
export class NftController {
    private readonly logger = new Logger(NftController.name);

    constructor(private readonly nftService: NftService) { }

    @Get('/:launcherId')
    async getNftUri(@Param('launcherId') launcherId: string): Promise<NftUriResponse> {
        this.logger.log(`GET /nft/${launcherId} called`);

        const uri = await this.nftService.getNftUri(launcherId);

        return { uri };
    }
}
