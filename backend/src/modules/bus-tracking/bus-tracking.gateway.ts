import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/tracking',
})
export class BusTrackingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('BusTrackingGateway');

  afterInit() {
    this.logger.log('Bus Tracking WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitLocationUpdate(payload: {
    busId: number;
    latitude: number;
    longitude: number;
    speed: number;
    driverId: string;
    timestamp: string;
  }) {
    this.server.emit('bus-location-update', payload);
  }

  emitTrackingStopped(payload: { busId: number; driverId: string }) {
    this.server.emit('bus-tracking-stopped', payload);
  }
}
