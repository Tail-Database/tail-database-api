import { Body, Controller, Get, Param } from '@nestjs/common';
import { NftService } from './nft.service';

interface NftUriResponse {
    uri: string;
}

@Controller('nft')
export class NftController {
    constructor(private readonly nftService: NftService) { }

    @Get('/:launcherId')
    async getNftUri(@Param('launcherId') launcherId: string): Promise<NftUriResponse> {
        const uri = await this.nftService.getNftUri(launcherId);

        return { uri };
    }
}
