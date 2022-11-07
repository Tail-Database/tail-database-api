import { IsDefined, IsIn, Length, IsString, MaxLength, IsUppercase, NotContains, NotEquals, Matches, IsOptional } from 'class-validator';
import { CATEGORIES } from 'src/tail-database-client';

export class AddTailDto {
  @Length(64, 64)
  @IsDefined()
  @IsString()
  hash: string;

  @Length(1, 100)
  @IsDefined()
  @IsString()
  name: string;

  @Length(1, 6)
  @IsDefined()
  @IsString()
  @IsUppercase()
  @NotContains(' ')
  @Matches(/^[A-Z0-9]+$/)
  @NotEquals('XCH')
  code: string;

  @IsDefined()
  @IsString()
  @IsIn(CATEGORIES)
  category: string;

  @MaxLength(5000)
  @IsDefined()
  @IsString()
  description: string;

  @Length(64, 64)
  @IsDefined()
  @IsString()
  launcherId: string;

  @Length(64, 64)
  @IsDefined()
  @IsString()
  eveCoinId: string;

  @MaxLength(100)
  @IsOptional()
  @IsString()
  website_url?: string;

  @MaxLength(100)
  @IsOptional()
  @IsString()
  discord_url?: string;

  @MaxLength(100)
  @IsOptional()
  @IsString()
  twitter_url?: string;
}
