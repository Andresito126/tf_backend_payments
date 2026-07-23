import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreatePremiumPaymentDto {
  @ApiProperty({ enum: ['card', 'cash', 'transfer'], example: 'card' })
  @IsIn(['card', 'cash', 'transfer'])
  method: 'card' | 'cash' | 'transfer';

  @ApiPropertyOptional({
    example: 'tok_test_visa_4242',
    description: 'Token de tarjeta generado por Conekta.js (solo para method=card)',
  })
  @IsOptional()
  @IsString()
  tokenId?: string;
}
