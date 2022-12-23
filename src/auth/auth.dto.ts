import { IsDefined, Length, IsString } from 'class-validator';

export class AuthDto {
  @Length(64, 64)
  @IsDefined()
  @IsString()
  coinId: string;
}
