import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive } from 'class-validator';

export class RegisterWeighingDto {
  @ApiProperty({ example: 3.5, description: 'Cantidad real pesada' })
  @IsNumber()
  @IsPositive()
  actualQuantity: number;

  @ApiPropertyOptional({
    example: 120.5,
    description:
      'Monto final negociado en persona por el local. Si se omite, se calcula automáticamente (peso × precio ofertado).',
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  finalAmount?: number;
}
