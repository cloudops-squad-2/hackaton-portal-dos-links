import { IsInt, IsOptional, IsUrl, Max, Min } from 'class-validator';

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
  @Min(60)
  @Max(2592000)
  expiresIn?: number;
}
