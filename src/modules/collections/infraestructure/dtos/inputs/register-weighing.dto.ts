import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class RegisterWeighingDto {
  @ApiProperty({ example: 3.5, description: 'Cantidad real pesada' })
  @IsNumber()
  @IsPositive()
  actualQuantity: number;
}
