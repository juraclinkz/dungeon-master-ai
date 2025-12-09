import React, { useState, useEffect, useRef } from 'react';
import { Character } from '../types';
import { QrCode, Scan, X, Copy, Check, AlertCircle, Wifi, Users, Shield, Zap } from 'lucide-react';
import QRCode from 'qrcode';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface GameStateData {
  hero: Character;
  enemy: Character;
  playerNames: string[];
}

interface GameSyncProps {
  isOpen: boolean;
  onClose: () => void;
  currentState: GameStateData;
  onSync: (newState: GameStateData) => void;
  onConnectP2P: (hostId: string) => void;
  p2pId: string | null;
  isConnected: boolean;
}

const GameSync: React.FC<GameSyncProps> = ({ isOpen, onClose, currentState, onSync, onConnectP2P, p2pId, isConnected }) => {
  const [role, setRole] = useState<'host' | 'join'>('host'); // 'host' = Creates Party, 'join' = Joins Party
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const isScanInitRef = useRef<boolean>(false);

  useEffect(() => {
    if (isOpen && role === 'host') {
        generateQR();
    }
  }, [isOpen, role, p2pId]);

  const generateQR = async () => {
    try {
      if (!p2pId) return;
      const payload = JSON.stringify({ type: 'P2P_JOIN', id: p2pId });
      const url = await QRCode.toDataURL(payload, { width: 300, margin: 2, color: { dark: '#f59e0b', light: '#0f172a' } });
      setQrUrl(url);
    } catch (err) { console.error("QR Gen Error", err); }
  };

  useEffect(() => {
    let isMounted = true;
    if (isOpen && role === 'join') {
      setScanError(null);
      const initScanner = async () => {
        if (isScanInitRef.current) return;
        isScanInitRef.current = true;
        await new Promise(r => setTimeout(r, 300));
        if (!isMounted) return;
        if (scannerRef.current) { try { await scannerRef.current.clear(); } catch (e) {} scannerRef.current = null; }
        const element = document.getElementById('reader');
        if (!element) { setScanError("Error de componente de video."); isScanInitRef.current = false; return; }
        try {
            const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0, showTorchButtonIfSupported: true }, false);
            scanner.render(onScanSuccess, (err) => {});
            scannerRef.current = scanner;
        } catch (err: any) { setScanError("Error cámara: " + (err.message || "Permisos denegados")); } finally { isScanInitRef.current = false; }
      };
      initScanner();
    }
    return () => {
      isMounted = false;
      if (scannerRef.current) { scannerRef.current.clear().catch(console.error); scannerRef.current = null; }
      isScanInitRef.current = false;
    };
  }, [isOpen, role]);

  const onScanSuccess = (decodedText: string) => {
    try {
      const data = JSON.parse(decodedText);
      if (data.type === 'P2P_JOIN' && data.id) {
          onConnectP2P(data.id);
          if (scannerRef.current) scannerRef.current.clear();
          onClose();
          alert("¡Conectando al grupo! Sincronizando datos...");
      }
    } catch (e) { console.error("Invalid QR Data", e); }
  };

  const handleCopy = () => {
      navigator.clipboard.writeText(p2pId || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4">
      <style>{`#reader { border: none !important; } #reader video { object-fit: cover; border-radius: 0.75rem; } #reader__dashboard_section_csr span, #reader__dashboard_section_swaplink { color: #cbd5e1 !important; } #reader button { background-color: #f59e0b; color: #000; border: none; padding: 8px 16px; border-radius: 4px; font-weight: bold; margin-top: 10px; } #reader select { background-color: #1e293b; color: white; padding: 5px; border-radius: 4px; border: 1px solid #475569; margin-bottom: 10px; }`}</style>
      <div className="w-full max-w-lg bg-slate-900 rounded-2xl border border-amber-900/50 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold fantasy-font text-amber-500 flex items-center gap-2"><Wifi /> Multijugador</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
        </div>
        
        <div className="flex bg-slate-950 border-b border-slate-800">
             <button onClick={() => setRole('host')} className={`flex-1 flex flex-col items-center justify-center gap-1 py-4 font-bold uppercase tracking-wider text-xs transition-colors ${role === 'host' ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>
                <Shield size={20} />
                Crear Grupo (Líder)
             </button>
             <button onClick={() => setRole('join')} className={`flex-1 flex flex-col items-center justify-center gap-1 py-4 font-bold uppercase tracking-wider text-xs transition-colors ${role === 'join' ? 'bg-slate-800 text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}>
                <Users size={20} />
                Unirse a Grupo
             </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center relative bg-slate-900">
            {role === 'host' ? (
                <div className="flex flex-col items-center gap-6 w-full animate-in fade-in zoom-in duration-300">
                    <div className="text-center">
                        <p className="text-sm text-slate-300 font-bold mb-1">Tu Código de Grupo</p>
                        <p className="text-xs text-slate-500">Pide a tus amigos que escaneen este código</p>
                    </div>
                    
                    <div className="bg-white p-2 rounded-xl shadow-lg shadow-amber-900/20 relative group">
                        {qrUrl ? (<img src={qrUrl} alt="QR" className="w-56 h-56 object-contain" />) : (<div className="w-56 h-56 flex items-center justify-center text-slate-400"><Wifi className="animate-pulse" /> Generando...</div>)}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20"><Shield size={80} className="text-black" /></div>
                    </div>

                    <div className="w-full bg-slate-950/50 border border-slate-800 rounded-lg p-4">
                        <h4 className="text-xs uppercase font-bold text-slate-500 mb-3 flex items-center justify-between">
                            <span>Miembros del Grupo</span>
                            <span className="bg-slate-800 px-2 py-0.5 rounded text-white">{currentState.playerNames.length} / 4</span>
                        </h4>
                        <div className="space-y-2">
                            {currentState.playerNames.map((name, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm text-slate-300 bg-slate-900 p-2 rounded border border-slate-800">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></div>
                                    <span>{name}</span>
                                    {idx === 0 && <span className="ml-auto text-[10px] text-amber-500 border border-amber-900/50 px-1 rounded bg-amber-900/10">LÍDER</span>}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={handleCopy} className="text-xs flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-slate-800 px-4 py-2 rounded-full border border-slate-700">
                            {copied ? <Check size={12}/> : <Copy size={12}/>}
                            {copied ? "¡Copiado!" : "Copiar ID Manual"}
                        </button>
                    </div>
                    
                    <p className="text-[10px] text-slate-600 text-center max-w-xs italic mt-2">
                        Nota: La conexión requiere acceso a Internet para iniciar. El Bluetooth no está disponible en navegadores web.
                    </p>
                </div>
            ) : (
                <div className="w-full flex flex-col items-center gap-4 animate-in fade-in duration-300 h-full relative">
                    <div className="text-center mb-2">
                        <p className="text-sm text-slate-300 font-bold">Escanear Invitación</p>
                        <p className="text-xs text-slate-500">Apunta al QR del líder del grupo</p>
                    </div>

                    <div id="reader" className="w-full min-h-[300px] rounded-xl overflow-hidden bg-black border-2 border-emerald-900/50 shadow-[0_0_20px_rgba(16,185,129,0.1)] flex flex-col items-center justify-center text-slate-400 relative">
                        <div className="absolute inset-0 border-2 border-emerald-500/30 pointer-events-none rounded-xl m-8"></div>
                        <Scan className="w-8 h-8 text-emerald-500/50 animate-pulse absolute" />
                    </div>
                    
                    {scanError ? (
                        <div className="text-red-400 text-xs p-3 bg-red-900/20 rounded border border-red-900/50 flex items-center gap-2 w-full">
                            <AlertCircle size={16} className="shrink-0" /> 
                            <span>{scanError}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-emerald-400/80 text-xs bg-emerald-900/10 px-3 py-1 rounded-full border border-emerald-900/30">
                            <Zap size={12} fill="currentColor" className="animate-bounce" /> Cámara Activa
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default GameSync;