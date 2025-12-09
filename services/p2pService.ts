import { Peer, DataConnection } from 'peerjs';

export type P2PData = {
  type: 'SYNC_STATE';
  payload: any;
} | {
  type: 'LOG_ENTRY';
  payload: any;
} | {
  type: 'PLAYER_JOIN';
  payload: { name: string };
};

class P2PService {
  private peer: Peer | null = null;
  private connections: DataConnection[] = [];
  private onDataCallback: ((data: P2PData) => void) | null = null;
  public myId: string = '';

  constructor() {}

  async initialize(): Promise<string> {
    if (this.peer) return this.myId;

    return new Promise((resolve, reject) => {
        const peer = new Peer();

        peer.on('open', (id) => {
            this.myId = id;
            this.peer = peer;
            console.log('P2P Service Initialized. My ID:', id);
            resolve(id);
        });

        peer.on('connection', (conn) => {
            console.log('New peer connected:', conn.peer);
            this.setupConnection(conn);
        });

        peer.on('error', (err) => {
            console.error('P2P Error:', err);
            if (!this.peer) reject(err);
        });
    });
  }

  connect(hostId: string, onOpen?: () => void): void {
      if (!this.peer) return;
      console.log('Connecting to host:', hostId);
      const conn = this.peer.connect(hostId);
      
      conn.on('open', () => {
          console.log('Connection established with', conn.peer);
          this.connections.push(conn);
          if (onOpen) onOpen();
      });

      this.setupConnection(conn);
  }

  private setupConnection(conn: DataConnection) {
      if (!this.connections.find(c => c.peer === conn.peer)) {
          this.connections.push(conn);
      }

      conn.on('data', (data) => {
          if (this.onDataCallback) {
              this.onDataCallback(data as P2PData);
          }
      });

      conn.on('close', () => {
          console.log('Connection closed:', conn.peer);
          this.connections = this.connections.filter(c => c.peer !== conn.peer);
      });
      
      conn.on('error', (err) => {
        console.error("Connection error:", err);
      });
  }

  broadcast(data: P2PData) {
      this.connections.forEach(conn => {
          if (conn.open) {
              conn.send(data);
          }
      });
  }

  onData(callback: (data: P2PData) => void) {
      this.onDataCallback = callback;
  }

  isConnected() {
      return this.connections.some(c => c.open);
  }
  
  disconnect() {
      this.connections.forEach(c => c.close());
      this.peer?.destroy();
      this.peer = null;
      this.connections = [];
  }
}

export const p2pService = new P2PService();