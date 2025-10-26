import { Router } from 'express';
import { groupOrderingController } from '../controllers/groupOrderingController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import {
  joinSessionSchema,
  updateFantasyNameSchema,
  transferOrderSchema,
  sessionIdParamSchema,
  participantIdParamSchema,
  orderIdParamSchema
} from '../validation/groupOrderingValidation';

const router = Router();

// Session management
router.post(
  '/sessions/:sessionId/join',
  authMiddleware,
  validateRequest({ params: sessionIdParamSchema, body: joinSessionSchema }),
  groupOrderingController.joinSession.bind(groupOrderingController)
);

router.delete(
  '/participants/:participantId/leave',
  authMiddleware,
  validateRequest({ params: participantIdParamSchema }),
  groupOrderingController.leaveSession.bind(groupOrderingController)
);

// Session information
router.get(
  '/sessions/:sessionId/summary',
  authMiddleware,
  validateRequest({ params: sessionIdParamSchema }),
  groupOrderingController.getGroupSummary.bind(groupOrderingController)
);

router.get(
  '/sessions/:sessionId/participants',
  authMiddleware,
  validateRequest({ params: sessionIdParamSchema }),
  groupOrderingController.getSessionParticipants.bind(groupOrderingController)
);

// Participant management
router.put(
  '/participants/:participantId/fantasy-name',
  authMiddleware,
  validateRequest({ params: participantIdParamSchema, body: updateFantasyNameSchema }),
  groupOrderingController.updateFantasyName.bind(groupOrderingController)
);

// Order management
router.post(
  '/orders/:orderId/transfer',
  authMiddleware,
  validateRequest({ params: orderIdParamSchema, body: transferOrderSchema }),
  groupOrderingController.transferOrder.bind(groupOrderingController)
);

// Utility endpoints
router.get(
  '/sessions/:sessionId/generate-fantasy-name',
  authMiddleware,
  validateRequest({ params: sessionIdParamSchema }),
  groupOrderingController.generateFantasyName.bind(groupOrderingController)
);

export { router as groupOrderingRoutes };