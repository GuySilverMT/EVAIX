/**
 * Android Bridge Service
 * 
 * WebSocket/REST server for Android app integration
 * Allows Android devices to push voice/text/keyboard events to desktop
 */

import { WebSocket, WebSocketServer } from 'ws';
import { getInputController } from './voice/inputController.js';
import { getOutputController } from './voice/outputController.js';

export interface AndroidDevice {
  id: string;
  name: string;
  platform: string;
  connectedAt: Date;
  lastActivity: Date;
  socket: WebSocket;
}

export interface AndroidEvent {
  type: 'voice' | 'text' | 'keyboard' | 'heartbeat';
  deviceId: string;
  timestamp: string;
  data?: any;
}

/**
 * Manages WebSocket connections from Android devices
 */
export class AndroidBridgeService {
  private wss: WebSocketServer | null = null;
  private devices: Map<string, AndroidDevice> = new Map();
  private port: number;
  private eventCallbacks: Map<string, Set<(event: AndroidEvent) => void>> = new Map();
  
  constructor(port: number = 8765) {
    this.port = port;
  }
  
  /**
   * Start the WebSocket server
   */
  start(): void {
    if (this.wss) {
      console.warn('Android bridge already running');
      return;
    }
    
    this.wss = new WebSocketServer({ port: this.port });
    
    this.wss.on('connection', (socket: WebSocket, request) => {
      const deviceId = this.generateDeviceId();
      
      console.log(`Android device connected: ${deviceId}`);
      
      // Register device
      const device: AndroidDevice = {
        id: deviceId,
        name: 'Unknown Device',
        platform: 'android',
        connectedAt: new Date(),
        lastActivity: new Date(),
        socket,
      };
      
      this.devices.set(deviceId, device);
      
      // Send welcome message
      socket.send(JSON.stringify({
        type: 'connected',
        deviceId,
        timestamp: new Date().toISOString(),
      }));
      
      // Handle messages
      socket.on('message', async (data: Buffer) => {
        try {
          const event: AndroidEvent = JSON.parse(data.toString());
          event.deviceId = deviceId;
          
          device.lastActivity = new Date();
          
          await this.handleEvent(event, device);
        } catch (error) {
          console.error('Error handling Android event:', error);
          socket.send(JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          }));
        }
      });
      
      // Handle disconnection
      socket.on('close', () => {
        console.log(`Android device disconnected: ${deviceId}`);
        this.devices.delete(deviceId);
      });
      
      // Handle errors
      socket.on('error', (error) => {
        console.error(`WebSocket error for device ${deviceId}:`, error);
      });
    });
    
    console.log(`Android bridge listening on port ${this.port}`);
  }
  
  /**
   * Stop the WebSocket server
   */
  stop(): void {
    if (!this.wss) {
      return;
    }
    
    // Close all connections
    for (const device of this.devices.values()) {
      device.socket.close();
    }
    
    this.devices.clear();
    
    // Close server
    this.wss.close();
    this.wss = null;
    
    console.log('Android bridge stopped');
  }
  
  /**
   * Handle an event from Android device
   */
  private async handleEvent(event: AndroidEvent, device: AndroidDevice): Promise<void> {
    // Emit to registered callbacks
    const callbacks = this.eventCallbacks.get(event.type);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in event callback:`, error);
        }
      }
    }
    
    // Handle specific event types
    switch (event.type) {
      case 'voice':
        await this.handleVoiceEvent(event, device);
        break;
      
      case 'text':
        await this.handleTextEvent(event, device);
        break;
      
      case 'keyboard':
        await this.handleKeyboardEvent(event, device);
        break;
      
      case 'heartbeat':
        // Just update last activity (already done above)
        device.socket.send(JSON.stringify({
          type: 'heartbeat_ack',
          timestamp: new Date().toISOString(),
        }));
        break;
      
      default:
        console.warn(`Unknown event type: ${event.type}`);
    }
  }
  
  /**
   * Handle voice event (audio input from Android)
   */
  private async handleVoiceEvent(event: AndroidEvent, device: AndroidDevice): Promise<void> {
    const { audioData, format, sampleRate } = event.data || {};
    
    if (!audioData) {
      throw new Error('No audio data provided');
    }
    
    // Convert base64 audio to Buffer
    const audioBuffer = Buffer.from(audioData, 'base64');
    
    // Process through input controller
    const inputController = getInputController();
    const result = await inputController.processAndroidInput(audioBuffer, device.id, {
      format,
      sampleRate,
    });
    
    // Send result back to device
    device.socket.send(JSON.stringify({
      type: 'transcription',
      text: result.text,
      confidence: result.confidence,
      timestamp: new Date().toISOString(),
    }));
  }
  
  /**
   * Handle text event (text input from Android)
   */
  private async handleTextEvent(event: AndroidEvent, device: AndroidDevice): Promise<void> {
    const { text } = event.data || {};
    
    if (!text) {
      throw new Error('No text provided');
    }
    
    // Acknowledge receipt
    device.socket.send(JSON.stringify({
      type: 'text_received',
      text,
      timestamp: new Date().toISOString(),
    }));
  }
  
  /**
   * Handle keyboard event (keyboard input from Android)
   */
  private async handleKeyboardEvent(event: AndroidEvent, device: AndroidDevice): Promise<void> {
    const { action, key, text } = event.data || {};
    
    // Acknowledge receipt
    device.socket.send(JSON.stringify({
      type: 'keyboard_received',
      action,
      key,
      text,
      timestamp: new Date().toISOString(),
    }));
  }
  
  /**
   * Send audio to a specific device
   */
  async sendAudioToDevice(deviceId: string, audioData: Buffer): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }
    
    // Send audio as base64
    device.socket.send(JSON.stringify({
      type: 'audio',
      audioData: audioData.toString('base64'),
      timestamp: new Date().toISOString(),
    }));
  }
  
  /**
   * Broadcast audio to all devices
   */
  async broadcastAudio(audioData: Buffer): Promise<void> {
    const audioBase64 = audioData.toString('base64');
    
    for (const device of this.devices.values()) {
      try {
        device.socket.send(JSON.stringify({
          type: 'audio',
          audioData: audioBase64,
          timestamp: new Date().toISOString(),
        }));
      } catch (error) {
        console.error(`Error sending audio to device ${device.id}:`, error);
      }
    }
  }
  
  /**
   * Register event callback
   */
  on(eventType: string, callback: (event: AndroidEvent) => void): void {
    if (!this.eventCallbacks.has(eventType)) {
      this.eventCallbacks.set(eventType, new Set());
    }
    
    this.eventCallbacks.get(eventType)!.add(callback);
  }
  
  /**
   * Unregister event callback
   */
  off(eventType: string, callback: (event: AndroidEvent) => void): void {
    const callbacks = this.eventCallbacks.get(eventType);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }
  
  /**
   * Get all connected devices
   */
  getConnectedDevices(): AndroidDevice[] {
    return Array.from(this.devices.values()).map(device => ({
      ...device,
      socket: undefined as any, // Don't expose WebSocket object
    }));
  }
  
  /**
   * Get device by ID
   */
  getDevice(deviceId: string): AndroidDevice | null {
    const device = this.devices.get(deviceId);
    if (!device) {
      return null;
    }
    
    return {
      ...device,
      socket: undefined as any, // Don't expose WebSocket object
    };
  }
  
  /**
   * Generate a unique device ID
   */
  private generateDeviceId(): string {
    return `android_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
  
  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.wss !== null;
  }
}

// Singleton instance
let serviceInstance: AndroidBridgeService | null = null;

/**
 * Get the global Android bridge service instance
 */
export function getAndroidBridgeService(port?: number): AndroidBridgeService {
  if (!serviceInstance) {
    serviceInstance = new AndroidBridgeService(port);
  }
  return serviceInstance;
}

/**
 * Reset the service (useful for testing)
 */
export function resetAndroidBridgeService(): void {
  if (serviceInstance) {
    serviceInstance.stop();
  }
  serviceInstance = null;
}
