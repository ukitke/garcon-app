import { Request, Response } from 'express';
import { groupOrderingService } from '../services/groupOrderingService';
import { 
  JoinGroupRequest
} from '../services/groupOrderingService';

export class GroupOrderingController {
  async joinSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { userId, customFantasyName } = req.body;

      const joinRequest: JoinGroupRequest = {
        sessionId,
        userId,
        customFantasyName
      };

      const result = await groupOrderingService.joinTableSession(joinRequest);
      
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error joining session:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to join session'
      });
    }
  }

  async leaveSession(req: Request, res: Response): Promise<void> {
    try {
      const { participantId } = req.params;

      const success = await groupOrderingService.leaveTableSession(participantId);
      
      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Participant not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Successfully left the session'
      });
    } catch (error) {
      console.error('Error leaving session:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to leave session'
      });
    }
  }

  async getGroupSummary(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      const summary = await groupOrderingService.getGroupOrderSummary(sessionId);
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error fetching group summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch group summary'
      });
    }
  }

  async getSessionParticipants(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      const participants = await groupOrderingService.getSessionParticipants(sessionId);
      
      res.json({
        success: true,
        data: participants
      });
    } catch (error) {
      console.error('Error fetching session participants:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch session participants'
      });
    }
  }

  async updateFantasyName(req: Request, res: Response): Promise<void> {
    try {
      const { participantId } = req.params;
      const { fantasyName } = req.body;

      if (!fantasyName || typeof fantasyName !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Fantasy name is required'
        });
        return;
      }

      const participant = await groupOrderingService.updateParticipantFantasyName(participantId, fantasyName);
      
      if (!participant) {
        res.status(404).json({
          success: false,
          error: 'Participant not found'
        });
        return;
      }

      res.json({
        success: true,
        data: participant
      });
    } catch (error) {
      console.error('Error updating fantasy name:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update fantasy name'
      });
    }
  }

  async transferOrder(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const { fromParticipantId, toParticipantId } = req.body;

      if (!fromParticipantId || !toParticipantId) {
        res.status(400).json({
          success: false,
          error: 'Both fromParticipantId and toParticipantId are required'
        });
        return;
      }

      const order = await groupOrderingService.transferOrderToParticipant(
        orderId, 
        fromParticipantId, 
        toParticipantId
      );
      
      if (!order) {
        res.status(404).json({
          success: false,
          error: 'Order not found or cannot be transferred'
        });
        return;
      }

      res.json({
        success: true,
        data: order,
        message: 'Order transferred successfully'
      });
    } catch (error) {
      console.error('Error transferring order:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to transfer order'
      });
    }
  }

  async generateFantasyName(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      // Get existing names in the session
      const participants = await groupOrderingService.getSessionParticipants(sessionId);
      const existingNames = participants.map(p => p.fantasyName);

      // Generate a unique fantasy name
      const { fantasyNameService } = await import('../services/fantasyNameService');
      const fantasyName = fantasyNameService.generateUniqueFantasyName(existingNames);

      res.json({
        success: true,
        data: {
          fantasyName,
          isUnique: true
        }
      });
    } catch (error) {
      console.error('Error generating fantasy name:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate fantasy name'
      });
    }
  }
}

export const groupOrderingController = new GroupOrderingController();