import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { ApiResponse } from '../utils/api-response';
import { uploadToCloudinary } from '../services/cloudinary.service';
import { logger } from '../utils/logger';

/**
 * POST /api/v1/payments/upload-proof
 * Customer uploads a Telebirr/CBE Birr payment screenshot.
 * File is streamed directly to Cloudinary.
 */
export const uploadPaymentProof = async (req: Request, res: Response) => {
  try {
    const { orderId, transactionRef, paymentMethod } = req.body;

    if (!orderId) {
      return ApiResponse.error(res, 'orderId is required', null, 400);
    }

    if (!req.file) {
      return ApiResponse.error(res, 'Payment proof image file is required', null, 400);
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return ApiResponse.error(res, 'Order not found', null, 404);
    }

    if (order.paymentStatus === 'PAID') {
      return ApiResponse.error(res, 'This order has already been paid', null, 409);
    }

    // Upload proof to Cloudinary
    const result = await uploadToCloudinary(
      req.file.buffer,
      'payment-proofs',
      `proof_${orderId}_${Date.now()}`
    );

    // Update order with proof URL and set status to PENDING_VERIFICATION
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentProofUrl: result.secure_url,
        paymentStatus: 'PENDING_VERIFICATION',
        transactionRef: transactionRef || null,
        paymentMethod: paymentMethod || order.paymentMethod
      }
    });

    logger.info(`Payment proof uploaded for order ${order.orderNumber} via ${updated.paymentMethod}`);

    return ApiResponse.success(res, 'Payment proof submitted. Awaiting cashier verification.', {
      orderId: updated.id,
      paymentStatus: updated.paymentStatus,
      paymentProofUrl: updated.paymentProofUrl
    });
  } catch (error) {
    logger.error('uploadPaymentProof error:', error);
    return ApiResponse.error(res, 'Failed to upload payment proof', error, 500);
  }
};

/**
 * PATCH /api/v1/payments/:orderId/verify
 * Cashier verifies and confirms a payment.
 */
export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const { orderId } = req.params;
    const { approved, rejectionReason } = req.body;

    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      include: { items: true }
    });

    if (!order) {
      return ApiResponse.error(res, 'Order not found', null, 404);
    }

    if (order.paymentStatus !== 'PENDING_VERIFICATION') {
      return ApiResponse.error(res, 'This order is not awaiting payment verification', null, 400);
    }

    if (approved === true) {
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'PAID',
          status: 'COMPLETED'
        }
      });

      // Log verification to audit trail
      await prisma.auditLog.create({
        data: {
          restaurantId,
          userId: req.user!.id,
          action: 'PAYMENT_VERIFIED',
          details: {
            orderId,
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount,
            paymentMethod: order.paymentMethod
          }
        }
      });

      return ApiResponse.success(res, 'Payment verified successfully. Order marked complete.', {
        orderId: updated.id,
        orderNumber: order.orderNumber,
        paymentStatus: updated.paymentStatus,
        status: updated.status,
        totalAmount: updated.totalAmount
      });
    } else {
      // Rejected
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'UNPAID',
          paymentProofUrl: null
        }
      });

      return ApiResponse.success(res, 'Payment proof rejected. Customer must re-submit.', {
        orderId: updated.id,
        paymentStatus: updated.paymentStatus,
        rejectionReason: rejectionReason || 'Proof could not be verified'
      });
    }
  } catch (error) {
    logger.error('verifyPayment error:', error);
    return ApiResponse.error(res, 'Failed to verify payment', error, 500);
  }
};

/**
 * GET /api/v1/payments/pending
 * Cashier fetches orders waiting for payment verification.
 */
export const getPendingPayments = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const { branchId } = req.query;

    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        paymentStatus: 'PENDING_VERIFICATION',
        ...(branchId && { branchId: String(branchId) })
      },
      include: {
        table: { select: { tableNumber: true } },
        items: {
          include: { menuItem: { select: { name: true } } }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return ApiResponse.success(res, 'Pending payment orders retrieved', orders);
  } catch (error) {
    logger.error('getPendingPayments error:', error);
    return ApiResponse.error(res, 'Failed to fetch pending payments', error, 500);
  }
};
