import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GatewayAuthGuard } from '../../../auth/infraestructure/guards/gateway-auth.guard';
import type { AuthenticatedUser } from '../../../auth/infraestructure/guards/gateway-auth.guard';
import { GetCollectionsUseCase } from '../../application/usecases/get-collections.use-case';
import { GetCollectionDetailUseCase } from '../../application/usecases/get-collection-detail.use-case';
import { GetCollectionByOfferUseCase } from '../../application/usecases/get-collection-by-offer.use-case';
import { RegisterWeighingUseCase } from '../../application/usecases/register-weighing.use-case';
import { ConfirmAmountUseCase } from '../../application/usecases/confirm-amount.use-case';
import { CreatePaymentUseCase } from '../../application/usecases/create-payment.use-case';
import { CheckPaymentStatusUseCase } from '../../application/usecases/check-payment-status.use-case';
import { CancelCollectionUseCase } from '../../application/usecases/cancel-collection.use-case';
import { RegisterWeighingDto } from '../dtos/inputs/register-weighing.dto';
import { CreatePaymentDto } from '../dtos/inputs/create-payment.dto';
import type { Collection } from '../../domain/entities/collection.entity';
import type { Payment } from '../../domain/entities/payment.entity';

function mapCollection(collection: Collection) {
  return {
    collectionId: collection.getCollectionId(),
    offerId: collection.getOfferId(),
    status: collection.getStatus(),
    actualQuantity: collection.getActualQuantity(),
    finalAmount: collection.getFinalAmount(),
    citizenConfirmedAmount: collection.isAmountConfirmed(),
    amountConfirmationDate: collection.getAmountConfirmationDate(),
    receivedAt: collection.getDeliveryScannedAt(),
    createdAt: collection.getCreatedAt(),
  };
}

function mapPayment(payment: Payment | null) {
  if (!payment) return null;
  return {
    paymentId: payment.getPaymentId(),
    method: payment.getPaymentMethod(),
    status: payment.getStatus(),
    grossAmount: payment.getGrossAmount(),
    treasureflowFee: payment.getTreasureflowFee(),
    receiverNetAmount: payment.getReceiverNetAmount(),
    reference: payment.getPaymentReference(),
    paymentDate: payment.getPaymentDate(),
  };
}

@ApiTags('collections')
@ApiBearerAuth('access-token')
@UseGuards(GatewayAuthGuard)
@Controller('collections')
export class CollectionsController {
  constructor(
    private readonly getCollectionsUseCase: GetCollectionsUseCase,
    private readonly getCollectionDetailUseCase: GetCollectionDetailUseCase,
    private readonly getCollectionByOfferUseCase: GetCollectionByOfferUseCase,
    private readonly registerWeighingUseCase: RegisterWeighingUseCase,
    private readonly confirmAmountUseCase: ConfirmAmountUseCase,
    private readonly createPaymentUseCase: CreatePaymentUseCase,
    private readonly checkPaymentStatusUseCase: CheckPaymentStatusUseCase,
    private readonly cancelCollectionUseCase: CancelCollectionUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar recolecciones del usuario autenticado (con datos de la oferta)' })
  async getCollections(@Request() req: { user: AuthenticatedUser }) {
    const items = await this.getCollectionsUseCase.execute({
      userId: req.user.id,
      userType: req.user.userType,
    });
    return items.map((item) => ({
      ...mapCollection(item.collection),
      offer: item.offer,
    }));
  }

  @Get('by-offer/:offerId')
  @ApiOperation({
    summary: 'Buscar la recolección asociada a una oferta aceptada',
    description: '404 si aún no se crea (la creación es asíncrona tras aceptar la oferta).',
  })
  async getCollectionByOffer(
    @Param('offerId') offerId: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    const collection = await this.getCollectionByOfferUseCase.execute({
      offerId,
      userId: req.user.id,
      userType: req.user.userType,
    });
    return mapCollection(collection);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una recolección (incluye pago y oferta)' })
  async getCollectionDetail(
    @Param('id') id: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    const detail = await this.getCollectionDetailUseCase.execute({
      collectionId: id,
      userId: req.user.id,
      userType: req.user.userType,
    });
    return {
      collection: mapCollection(detail.collection),
      payment: mapPayment(detail.payment),
      offer: detail.offer,
    };
  }

  @Patch(':id/weighing')
  @ApiOperation({
    summary: 'Registrar recepción y pesaje del material (establishment)',
    description: 'Confirma que el local recibió los residuos y registra la cantidad pesada. Calcula el monto final.',
  })
  registerWeighing(
    @Param('id') id: string,
    @Body() dto: RegisterWeighingDto,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return this.registerWeighingUseCase.execute({
      collectionId: id,
      establishmentId: req.user.id,
      actualQuantity: dto.actualQuantity,
    });
  }

  @Patch(':id/confirm-amount')
  @ApiOperation({ summary: 'Confirmar monto (citizen)' })
  confirmAmount(
    @Param('id') id: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return this.confirmAmountUseCase.execute({
      collectionId: id,
      citizenId: req.user.id,
    });
  }

  @Post(':id/payment')
  @ApiOperation({
    summary: 'Pagar la recolección vía Conekta (establishment)',
    description:
      'method=card requiere tokenId y se confirma al instante. method=cash devuelve referencia OXXO; method=transfer devuelve CLABE SPEI — ambos se confirman después vía webhook o polling.',
  })
  createPayment(
    @Param('id') id: string,
    @Body() dto: CreatePaymentDto,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return this.createPaymentUseCase.execute({
      collectionId: id,
      establishmentId: req.user.id,
      method: dto.method,
      tokenId: dto.tokenId,
    });
  }

  @Get(':id/payment/status')
  @ApiOperation({
    summary: 'Consultar estado del pago en Conekta (establishment)',
    description: 'Polling para pagos OXXO/SPEI. Si Conekta reporta la orden pagada, libera el pago y completa la recolección.',
  })
  checkPaymentStatus(
    @Param('id') id: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return this.checkPaymentStatusUseCase.execute({
      collectionId: id,
      establishmentId: req.user.id,
    });
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancelar recolección (solo antes del pesaje)' })
  cancelCollection(
    @Param('id') id: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return this.cancelCollectionUseCase.execute({
      collectionId: id,
      userId: req.user.id,
      userType: req.user.userType,
    });
  }
}
