import {
  IsDateString,
  IsInt,
  IsOptional,
  IsUrl,
  Max,
  Min,
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
  @ValidateIf((dto) => dto.expiresAt === undefined, {
    message: 'expiresIn and expiresAt cannot be provided together',
  })
  expiresIn?: number;

  @IsOptional()
  @IsDateString()
  @ValidateIf((dto) => dto.expiresIn === undefined, {
    message: 'expiresIn and expiresAt cannot be provided together',
  })
  expiresAt?: string;
}
