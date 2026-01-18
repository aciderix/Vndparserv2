import React, { useState } from 'react';
import { ParsedScene, HotspotCommand } from '../types';
import { Image, Box, MousePointer2, Music, Type, Code, Move, MonitorPlay, MousePointerClick, MessageSquare, Video, ScrollText } from 'lucide-react';

interface SceneDetailsProps {
  scene: ParsedScene;
}

export const SceneDetails: React.FC<SceneDetailsProps> = ({ scene }) => {
  const [activeTab, setActiveTab] = useState<'files' | 'hotspots' | 'config'>('files');

  // Helper to interpret command IDs based on VND reverse engineering
  const getCommandLabel = (cmd: HotspotCommand) => {
    // ID 0: Display / Text Attributes
    if (cmd.id === 0) {
        if (cmd.subtype === 39) return { label: "Config Police", icon: <Type size={12} />, color: "text-fuchsia-400", bg: "bg-fuchsia-950/30", border: "border-fuchsia-900", desc: "Définit la font et la couleur" };
        if (cmd.subtype === 38) return { label: "Zone Texte / Bulle", icon: <MessageSquare size={12} />, color: "text-blue-300", bg: "bg-blue-950/30", border: "border-blue-900", desc: "Zone cliquable et texte associé" };
        if (cmd.subtype === 24) return { label: "Zone Image", icon: <Image size={12} />, color: "text-sky-300", bg: "bg-sky-950/30", border: "border-sky-900", desc: "Affiche une image statique ou animée" };
        return { label: `Display (Sub:${cmd.subtype})`, icon: <MonitorPlay size={12} />, color: "text-slate-400", bg: "bg-slate-950/30", border: "border-slate-800", desc: "Commande d'affichage générique" };
    }

    // ID 1: Interaction / Multimedia Assets
    if (cmd.id === 1) {
        // Subtype 6 implies internal sound index or cursor index for hover/click
        if (cmd.subtype === 6) return { label: "Son Interface / Curseur", icon: <MousePointerClick size={12} />, color: "text-amber-400", bg: "bg-amber-950/30", border: "border-amber-900", desc: "Son système ou ID Curseur" };
        if (cmd.subtype === 9) return { label: "Media Cmd (Vidéo)", icon: <Video size={12} />, color: "text-red-400", bg: "bg-red-950/30", border: "border-red-900", desc: "Lecture de fichier AVI" };
        return { label: `Media (Sub:${cmd.subtype})`, icon: <Music size={12} />, color: "text-yellow-600", bg: "bg-yellow-950/30", border: "border-yellow-900", desc: "Commande média générique" };
    }

    // ID 3: Logic / Scripting
    if (cmd.id === 3) {
        if (cmd.subtype === 21) return { label: "Script Logique", icon: <Code size={12} />, color: "text-emerald-400", bg: "bg-emerald-950/30", border: "border-emerald-900", desc: "Logique conditionnelle" };
        return { label: `Script (Sub:${cmd.subtype})`, icon: <Code size={12} />, color: "text-emerald-600", bg: "bg-emerald-950/30", border: "border-emerald-900", desc: "Commande script générique" };
    }

    // Large IDs often found in Toolbar/Init Scripts (e.g. 396 for 'Toolbar')
    if (cmd.id > 100 || cmd.id === 21 || cmd.id === 27) {
         return { label: `System Cmd (${cmd.id})`, icon: <ScrollText size={12} />, color: "text-pink-400", bg: "bg-pink-950/30", border: "border-pink-900", desc: "Commande système / Toolbar" };
    }

    return { label: `Cmd ${cmd.id}:${cmd.subtype}`, icon: <Box size={12} />, color: "text-slate-500", bg: "bg-slate-900", border: "border-slate-800", desc: "Commande inconnue" };
  };

  // Helper to format parameters (highlight coords, filenames)
  const formatParam = (param: string) => {
      // Check for coordinates pattern (e.g., "89 375 125 365 0 ...")
      const coordsMatch = param.match(/^(\d+\s\d+\s\d+\s\d+\s\d+)\s(.*)/);
      if (coordsMatch) {
          return (
              <span>
                  <span className="text-orange-300 font-bold">{coordsMatch[1]}</span>
                  <span className="text-slate-300"> {coordsMatch[2]}</span>
              </span>
          );
      }
      // Check for simple coords (e.g., "300 200")
      const simpleCoordsMatch = param.match(/^(\d+\s\d+)(.*)/);
      if (simpleCoordsMatch && param.length < 20) {
           return (
              <span>
                  <span className="text-orange-300 font-bold">{simpleCoordsMatch[1]}</span>
                  <span className="text-slate-300">{simpleCoordsMatch[2]}</span>
              </span>
          );
      }
      
      return <span className="text-slate-300">{param}</span>;
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden mb-6">
      <div className="p-4 bg-slate-900 border-b border-slate-700 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="bg-blue-600 text-xs px-2 py-1 rounded">ID: {scene.id}</span>
            Scène #{scene.id}
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-1">Offset: 0x{scene.offset.toString(16).toUpperCase().padStart(8, '0')}</p>
        </div>
        
        <div className="flex bg-slate-950 rounded-lg p-1 gap-1">
          <button
            onClick={() => setActiveTab('files')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'files' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Image size={14} /> Fichiers
          </button>
          <button
            onClick={() => setActiveTab('hotspots')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'hotspots' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <MousePointer2 size={14} /> Hotspots ({scene.hotspots.length})
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'config' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Box size={14} /> Script & Config
          </button>
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'files' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {scene.files.map((file) => {
              // Special visual treatment for Slot 1 (Title)
              const isTitle = file.slot === 1;
              return (
                <div key={file.slot} className={`p-3 rounded border ${file.filename ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-900/50 border-slate-800 opacity-50'} ${isTitle ? 'md:col-span-2 lg:col-span-4 bg-gradient-to-r from-slate-800 to-slate-700 !border-blue-900/50' : ''}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs font-bold uppercase ${isTitle ? 'text-blue-400' : 'text-slate-500'}`}>
                        {isTitle ? 'Titre de la Scène' : `Fichier ${file.slot - 1}`}
                    </span>
                    <div className="flex flex-col items-end">
                        <span className="text-xs font-mono text-slate-500">P:{file.param}</span>
                        {file.offset !== undefined && (
                            <span className="text-[10px] text-slate-600 font-mono">@0x{file.offset.toString(16).toUpperCase()}</span>
                        )}
                    </div>
                  </div>
                  {file.filename ? (
                    <div className={`text-sm font-medium break-all ${isTitle ? 'text-white text-base' : 'text-emerald-300'}`}>{file.filename}</div>
                  ) : (
                    <div className="text-sm italic text-slate-600">Vide</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'hotspots' && (
          <div className="space-y-3">
             {scene.hotspots.length === 0 ? (
                <p className="text-slate-500 italic text-center py-4">Aucun hotspot détecté.</p>
             ) : (
                scene.hotspots.map((hs) => (
                  <div key={hs.index} className="bg-slate-900/50 border border-slate-700 rounded p-3">
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-800">
                       <div className="flex items-center gap-2">
                           <span className="font-bold text-slate-300 text-sm">Hotspot #{hs.index + 1}</span>
                           <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">ID Cursor: {hs.geometry.cursorId}</span>
                       </div>
                       <span className="text-xs text-slate-500 font-mono">
                         Points: {hs.geometry.pointCount} | Cmds: {hs.commands.length}
                       </span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                            <h5 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Liste des Commandes</h5>
                            <ul className="space-y-2">
                                {hs.commands.map((cmd, idx) => {
                                    const info = getCommandLabel(cmd);
                                    return (
                                        <li key={idx} className={`text-xs flex items-start gap-2 ${info.bg} border ${info.border} p-2 rounded transition-colors`}>
                                            <div className={`mt-0.5 p-1 rounded-full bg-slate-900 ${info.color}`}>{info.icon}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline">
                                                    <span className={`font-bold ${info.color}`}>{info.label}</span>
                                                    <span className="text-[9px] text-slate-500 font-mono">ID {cmd.id}:{cmd.subtype}</span>
                                                </div>
                                                
                                                <div className="text-slate-300 font-mono break-all leading-tight mt-1 bg-slate-950/50 px-2 py-1.5 rounded border border-slate-800/50 shadow-inner">
                                                    {cmd.param ? formatParam(cmd.param) : <span className="opacity-30 italic">Sans paramètre</span>}
                                                </div>
                                                <div className="text-[10px] text-slate-500 mt-1 italic">{info.desc}</div>
                                            </div>
                                        </li>
                                    );
                                })}
                                {hs.commands.length === 0 && (
                                    <li className="text-xs text-slate-600 italic">Aucune commande</li>
                                )}
                            </ul>
                        </div>
                        <div>
                             <h5 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide flex items-center gap-1">
                                <Move size={10} /> Géométrie (Hitbox)
                             </h5>
                             <div className="text-xs text-slate-400 font-mono bg-slate-950 p-2 rounded max-h-40 overflow-y-auto border border-slate-800">
                                {hs.geometry.points.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-1">
                                        {hs.geometry.points.map((p, i) => (
                                            <div key={i} className="bg-slate-900 px-1 py-0.5 rounded border border-slate-800 text-center hover:border-slate-600 cursor-help" title={`Point ${i+1}`}>
                                                <span className="text-slate-500">x:</span>{p.x} <span className="text-slate-500">y:</span>{p.y}
                                            </div>
                                        ))}
                                    </div>
                                ) : <div>Aucun point</div>}
                             </div>
                        </div>
                    </div>
                  </div>
                ))
             )}
          </div>
        )}

        {activeTab === 'config' && (
          <div className="space-y-4">
             <div className="bg-slate-900/50 p-4 rounded border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                        <ScrollText size={16} className="text-emerald-400" />
                        Init Script (Gap / Toolbar)
                    </h4>
                    <span className="text-xs px-2 py-1 bg-slate-800 text-slate-500 rounded-full">{scene.initScript.commands.length} commandes</span>
                </div>
                
                <div className="bg-slate-950 rounded-lg border border-slate-800 max-h-[300px] overflow-y-auto p-2">
                    {scene.initScript.commands.length > 0 ? (
                        <ul className="space-y-2">
                            {scene.initScript.commands.map((cmd: any, idx) => {
                                // Since we parsed it raw in parseInitScript as {id, param: string}, interpret param
                                const rawParam = cmd.param;
                                // In the new parser, param might already contain "P:x" or just be text
                                // We don't have a distinct subtype for gap commands anymore.
                                
                                const info = getCommandLabel({ id: cmd.id, subtype: 0, param: rawParam });

                                return (
                                    <li key={idx} className={`text-xs flex items-start gap-2 ${info.bg} border ${info.border} p-2 rounded`}>
                                        <div className={`mt-0.5 p-1 rounded-full bg-slate-900 ${info.color}`}>{info.icon}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center">
                                                <span className={`font-bold ${info.color}`}>{info.label}</span>
                                                <span className="text-[9px] text-slate-500 font-mono">ID {cmd.id}</span>
                                            </div>
                                            <div className="text-slate-300 font-mono break-all mt-1 bg-slate-950/50 px-2 py-1 rounded">
                                                {rawParam ? formatParam(rawParam) : <span className="opacity-30">N/A</span>}
                                            </div>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    ) : (
                        <div className="p-4 text-center text-slate-600 italic text-xs">
                            Aucun script d'initialisation détecté.
                        </div>
                    )}
                </div>
             </div>

             <div className="bg-slate-900/50 p-3 rounded border border-slate-800">
                <h4 className="text-sm font-bold text-slate-400 mb-2">Scene Configuration (Flags)</h4>
                <div className="text-xs font-mono text-slate-300 mb-2">Flag: <span className="text-purple-400">0x{scene.config.flag.toString(16).toUpperCase()}</span></div>
                <div className="grid grid-cols-5 gap-2">
                    {scene.config.ints.length > 0 ? scene.config.ints.map((val, i) => (
                        <div key={i} className="bg-slate-950 p-1.5 rounded text-center border border-slate-800">
                            <span className="block text-[10px] text-slate-600 uppercase">Int {i}</span>
                            <span className="text-xs font-mono text-slate-300">{val}</span>
                        </div>
                    )) : <span className="text-xs text-slate-600 italic col-span-5 text-center">Aucune configuration (Scène transitionnelle ?)</span>}
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};