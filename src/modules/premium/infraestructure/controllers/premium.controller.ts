import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GatewayAuthGuard } from '../../../auth/infraestructure/guards/gateway-auth.guard';
import type { AuthenticatedUser } from '../../../auth/infraestructure/guards/gateway-auth.guard';
import { CreatePremiumPaymentUseCase } from '../../application/usecases/create-premium-payment.use-case';
import { GetPremiumStatusUseCase } from '../../application/usecases/get-premium-status.use-case';
import { CreatePremiumPaymentDto } from '../dtos/inputs/create-premium-payment.dto';

@ApiTags('premium')
@ApiBearerAuth('access-token')
@UseGuards(GatewayAuthGuard)
@Controller('premium')
export class PremiumController {
  constructor(
    private readonly createPremiumPaymentUseCase: CreatePremiumPaymentUseCase,
    private readonly getPremiumStatusUseCase: GetPremiumStatusUseCase,
  ) {}

  @Post('payment')
  @ApiOperation({
    summary: 'Pagar el Plan Premium (30 días) vía Conekta',
    description:
      'method=card requiere tokenId y activa premium al instante. method=cash devuelve referencia OXXO; method=transfer devuelve CLABE SPEI — ambos activan después vía webhook o polling.',
  })
  createPayment(
    @Body() dto: CreatePremiumPaymentDto,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return this.createPremiumPaymentUseCase.execute({
      userId: req.user.id,
      method: dto.method,
      tokenId: dto.tokenId,
    });
  }

  @Get('status')
  @ApiOperation({
    summary: 'Estado premium del usuario (con polling del pago pendiente)',
    description:
      'Si hay un pago premium pendiente re-consulta Conekta: paid activa premium, expired/declined lo marca fallido.',
  })
  getStatus(@Request() req: { user: AuthenticatedUser }) {
    return this.getPremiumStatusUseCase.execute(req.user.id);
  }
}
