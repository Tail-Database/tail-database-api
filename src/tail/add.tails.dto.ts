import { Type } from 'class-transformer';
import { IsDefined, ValidateNested } from 'class-validator';
import { AddTailDto } from './add.tail.dto';

export class AddTailsDto {
    @ValidateNested()
    @Type(() => AddTailDto)
    @IsDefined()
    tails: AddTailDto[];
}
