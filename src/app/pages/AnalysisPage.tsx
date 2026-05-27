import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Shield, BarChart3, FileText, LogOut, Upload, FileCode, Database, Brain, Cpu, TreeDeciduous } from 'lucide-react';
import GlassmorphicCard from '../components/GlassmorphicCard';
import { useAuth } from '../../hooks/useAuth';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:7860';

const MODELS = [
  { id: 'mlp', label: 'MLP Neural Network', icon: Brain },
  { id: 'rf',  label: 'Random Forest',      icon: TreeDeciduous },
  { id: 'xgb', label: 'XGBoost',            icon: Cpu },
];

const MODES = [
  { id: '2', label: 'Binary (Attack / Benign)' },
  { id: '8', label: '8-Class (Attack Family)' },
];

export default function AnalysisPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [inputType,    setInputType]    = useState<'csv' | 'pcap'>('csv');
  const [selectedModel, setSelectedModel] = useState('mlp');
  const [selectedMode,  setSelectedMode]  = useState('2');
  const [dragActive,   setDragActive]   = useState(false);
  const [file,         setFile]         = useState<File | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) setFile(picked);
  };

  const runAnalysis = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file',       file);
      form.append('model_type', selectedModel);
      form.append('mode',       selectedMode);
      form.append('split',      'temporal');
      form.append('input_type', inputType);

      const res  = await fetch(`${API_URL}/api/classify`, { method: 'POST', body: form });
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      navigate('/results', { state: { result: data } });
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Is the model server running?');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => { await signOut(); navigate('/'); };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 bg-sidebar border-r border-sidebar-border p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-10">
          <Shield className="w-8 h-8" style={{ color: '#00D9FF', filter: 'drop-shadow(0 0 10px rgba(0, 217, 255, 0.5))' }} />
          <h1 className="font-orbitron text-xl" style={{ color: '#00D9FF' }}>NEURAL IDS</h1>
        </div>
        <nav className="space-y-2 flex-1">
          <button onClick={() => navigate('/dashboard')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-all">
            <BarChart3 className="w-5 h-5" /><span>Dashboard</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
            <FileText className="w-5 h-5" /><span>Analysis</span>
          </button>
        </nav>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/70 hover:bg-red-500/10 hover:text-red-400 transition-all">
          <LogOut className="w-5 h-5" /><span>Logout</span>
        </button>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="font-orbitron text-4xl" style={{ color: '#00D9FF', textShadow: '0 0 20px rgba(0, 217, 255, 0.3)' }}>
            Traffic Analysis
          </h2>

          {/* Model selector */}
          <div>
            <label className="block text-sm mb-3 text-foreground/80 font-mono">MODEL</label>
            <div className="grid grid-cols-3 gap-4">
              {MODELS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setSelectedModel(id)}
                  className={`p-4 rounded-lg border transition-all ${selectedModel === id ? 'border-primary bg-primary/10' : 'border-primary/20 bg-card/60'}`}
                  style={{ boxShadow: selectedModel === id ? '0 0 20px rgba(0, 217, 255, 0.2)' : 'none' }}>
                  <Icon className="w-7 h-7 mx-auto mb-2" style={{ color: selectedModel === id ? '#00D9FF' : '#8B5CF6' }} />
                  <div className="font-mono text-xs" style={{ color: selectedModel === id ? '#00D9FF' : '#E0E7FF' }}>{label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Mode selector */}
          <div>
            <label className="block text-sm mb-3 text-foreground/80 font-mono">CLASSIFICATION MODE</label>
            <div className="flex gap-4">
              {MODES.map(({ id, label }) => (
                <button key={id} onClick={() => setSelectedMode(id)}
                  className={`flex-1 py-3 rounded-lg border font-mono text-sm transition-all ${selectedMode === id ? 'border-primary bg-primary/10' : 'border-primary/20 bg-card/60'}`}
                  style={{ color: selectedMode === id ? '#00D9FF' : '#E0E7FF', boxShadow: selectedMode === id ? '0 0 20px rgba(0, 217, 255, 0.2)' : 'none' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Input type */}
          <div>
            <label className="block text-sm mb-3 text-foreground/80 font-mono">INPUT TYPE</label>
            <div className="flex gap-4">
              {(['csv', 'pcap'] as const).map((type) => {
                const Icon = type === 'csv' ? FileCode : Database;
                return (
                  <button key={type} onClick={() => { setInputType(type); setFile(null); }}
                    className={`flex-1 p-4 rounded-lg border transition-all ${inputType === type ? 'border-primary bg-primary/10' : 'border-primary/20 bg-card/60'}`}
                    style={{ boxShadow: inputType === type ? '0 0 20px rgba(0, 217, 255, 0.2)' : 'none' }}>
                    <Icon className="w-8 h-8 mx-auto mb-2" style={{ color: inputType === type ? '#00D9FF' : '#8B5CF6' }} />
                    <div className="font-mono text-sm" style={{ color: inputType === type ? '#00D9FF' : '#E0E7FF' }}>{type.toUpperCase()}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Drop zone */}
          <input ref={fileRef} type="file" className="hidden"
            accept={inputType === 'csv' ? '.csv' : '.pcap,.pcapng'}
            onChange={handleFileInput} />

          <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-all ${dragActive ? 'border-primary bg-primary/10' : file ? 'border-green-400/60 bg-green-400/5' : 'border-primary/40 bg-card/40'}`}
            style={{ boxShadow: dragActive ? '0 0 40px rgba(0, 217, 255, 0.3)' : '0 0 20px rgba(0, 217, 255, 0.1)' }}>
            <Upload className="w-16 h-16 mx-auto mb-4" style={{ color: file ? '#39FF14' : dragActive ? '#00D9FF' : '#8B5CF6' }} />
            {file ? (
              <>
                <h3 className="font-orbitron text-xl mb-1" style={{ color: '#39FF14' }}>{file.name}</h3>
                <p className="text-muted-foreground text-sm">{(file.size / 1024).toFixed(1)} KB — click to change</p>
              </>
            ) : (
              <>
                <h3 className="font-orbitron text-2xl mb-2" style={{ color: '#00D9FF' }}>Drop {inputType.toUpperCase()} File</h3>
                <p className="text-muted-foreground">or click to browse</p>
              </>
            )}
          </div>

          {error && (
            <GlassmorphicCard className="p-4 border-red-500/40" style={{ backgroundColor: 'rgba(255,0,85,0.05)' }}>
              <p className="font-mono text-sm" style={{ color: '#FF0055' }}>{error}</p>
            </GlassmorphicCard>
          )}

          <button onClick={runAnalysis} disabled={!file || loading}
            className="w-full py-4 rounded-lg font-orbitron text-lg transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #00D9FF, #8B5CF6)', boxShadow: '0 0 30px rgba(0, 217, 255, 0.3)' }}>
            {loading ? 'ANALYZING...' : 'RUN ANALYSIS'}
          </button>
        </div>
      </main>
    </div>
  );
}
