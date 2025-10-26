// Audit logging service
export interface AuditEvent {
  id: string;
  timestamp: Date;
  userId?: string;
  action: string;
  resource: string;
  details?: any;
}

export class AuditLogger {
  private events: AuditEvent[] = [];

  log(event: Omit<AuditEvent, 'id' | 'timestamp'>) {
    const auditEvent: AuditEvent = {
      id: Date.now().toString(),
      timestamp: new Date(),
      ...event
    };
    
    this.events.push(auditEvent);
    console.log('AUDIT:', JSON.stringify(auditEvent));
  }

  getEvents(): AuditEvent[] {
    return this.events;
  }
}

export default AuditLogger;