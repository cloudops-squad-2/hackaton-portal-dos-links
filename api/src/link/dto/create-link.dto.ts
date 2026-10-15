import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateLinkDto {
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
    },
    { message: 'url must be a valid HTTP or HTTPS URL' },
  )
  url: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000000)
  clicksLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(2592000)
  expiresIn?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(10)
  codeSize?: number = 6;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(8)
  customCode?: string;
}
