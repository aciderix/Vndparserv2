import React, { useState, useCallback } from 'react';
import { Upload, FileCode, Play, Trash2, Layout, Terminal as TerminalIcon, Download } from 'lucide-react';
import { VNDSequentialParser } from './services/vndParser';
import { ParseResult } from './types';
import { LogViewer } from './components/LogViewer';
import { SceneDetails } from './components/SceneDetails';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [maxScenes, setMaxScenes] = useState(50);
  const [viewMode, setViewMode] = useState<'visual' | 'terminal'>('visual');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
      setResult(null); // Reset previous result
    }
  };

  const handleParse = useCallback(async () => {
    if (!file) return;

    setIsParsing(true);
    setResult(null);

    // Allow UI to update before blocking with parsing
    setTimeout(async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const parser = new VNDSequentialParser(arrayBuffer);
        const parseResult = parser.parse(maxScenes);
        setResult(parseResult);
      } catch (error) {
        console.error("Parsing failed", error);
        alert("Erreur lors de l'analyse du fichier.");
      } finally {
        setIsParsing(false);
      }
    }, 100);
  }, [file, maxScenes]);

  const handleExportJSON = () => {
    if (!result) return;

    const jsonString = JSON.stringify(result, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file ? `${file.name}.json` : 'parsed_vnd.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="mb-8 border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent flex items-center gap-3">
            <FileCode className="text-blue-400" size={32} />
            VND Sequential Parser
          </h1>
          <p className="text-slate-400 mt-2">
            Portage web de l'outil d'analyse structurelle pour fichiers Visual Novel (.vnd).
            Reproduit la logique séquentielle : 6 fichiers + InitScript + Config + Hotspots.
          </p>
        </header>

        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* File Input Card */}
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-lg">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Fichier Source</h2>
            
            {!file ? (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-700 border-dashed rounded-lg cursor-pointer hover:bg-slate-800/50 hover:border-blue-500 transition-all group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-3 text-slate-500 group-hover:text-blue-400" />
                  <p className="mb-2 text-sm text-slate-400"><span className="font-semibold">Cliquez pour upload</span></p>
                  <p className="text-xs text-slate-500">.VND (Max 50MB conseillé)</p>
                </div>
                <input type="file" className="hidden" accept=".vnd" onChange={handleFileChange} />
              </label>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg border border-slate-700">
                  <div className="bg-blue-900/50 p-2 rounded">
                    <FileCode size={20} className="text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                    <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button onClick={handleReset} className="text-slate-500 hover:text-red-400 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <label className="block text-xs text-slate-500 mb-1">Max Scènes</label>
                        <input 
                            type="number" 
                            min="1" 
                            max="100" 
                            value={maxScenes} 
                            onChange={(e) => setMaxScenes(parseInt(e.target.value) || 5)}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                        />
                    </div>
                    <button
                    onClick={handleParse}
                    disabled={isParsing}
                    className="flex-1 mt-5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
                    >
                    {isParsing ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                        <Play size={18} fill="currentColor" /> Analyser
                        </>
                    )}
                    </button>
                </div>
              </div>
            )}
          </div>

          {/* Stats / Info Card */}
          <div className="lg:col-span-2 bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-lg flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <TerminalIcon size={120} />
            </div>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Statistiques</h2>
            
            {result ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                    <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                        <div className="text-2xl font-bold text-white">{result.scenes.length}</div>
                        <div className="text-xs text-slate-500 uppercase font-bold">Scènes Parsées</div>
                    </div>
                    <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                        <div className="text-2xl font-bold text-emerald-400">
                            {result.scenes.reduce((acc, s) => acc + s.hotspots.length, 0)}
                        </div>
                        <div className="text-xs text-slate-500 uppercase font-bold">Total Hotspots</div>
                    </div>
                    <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                        <div className="text-2xl font-bold text-blue-400">
                            {result.scenes.reduce((acc, s) => acc + s.files.length, 0)}
                        </div>
                        <div className="text-xs text-slate-500 uppercase font-bold">Total Fichiers</div>
                    </div>
                    <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                        <div className="text-2xl font-bold text-purple-400">
                            {result.logs.length}
                        </div>
                        <div className="text-xs text-slate-500 uppercase font-bold">Lignes de Log</div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center text-slate-600 text-sm italic">
                    En attente de fichier...
                </div>
            )}
          </div>
        </div>

        {/* Output Section */}
        {result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Résultats</h2>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleExportJSON}
                        className="px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-900/20"
                    >
                        <Download size={16} /> JSON
                    </button>
                    <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                        <button 
                            onClick={() => setViewMode('visual')}
                            className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${viewMode === 'visual' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Layout size={16} /> Visuel
                        </button>
                        <button 
                            onClick={() => setViewMode('terminal')}
                            className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${viewMode === 'terminal' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            <TerminalIcon size={16} /> Terminal
                        </button>
                    </div>
                </div>
            </div>

            {viewMode === 'terminal' ? (
                <LogViewer logs={result.logs} />
            ) : (
                <div className="space-y-6">
                    {result.scenes.map(scene => (
                        <SceneDetails key={scene.id} scene={scene} />
                    ))}
                    {result.scenes.length === 0 && (
                        <div className="p-12 text-center bg-slate-900 rounded-lg border border-slate-800">
                            <p className="text-slate-500">Aucune scène trouvée. Vérifiez le fichier ou les logs.</p>
                        </div>
                    )}
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;