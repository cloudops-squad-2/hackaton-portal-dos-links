import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class LinkStatsParamsDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'code must contain only letters, numbers, _ or -',
  })
  code: string;
}
