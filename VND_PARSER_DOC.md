# Documentation Centralisée - Parser VND

**Date de création:** 2026-01-18
**Version du Parser:** v5.5 (Hotspot Align Fix)
**Objectif:** Parser totalement fonctionnel et universel pour tous les fichiers VND

---

## 📋 RÈGLES DE TRAVAIL

### Règles Générales
1. **Documentation centralisée** : On ne crée pas 50000 documents, on centralise et met à jour les découvertes dans 1-2 documents maximum
2. **Les règles sont inscrites ici** pour faciliter la mémorisation en cas de perte de contexte
3. **Vérification systématique** : À chaque étape, on s'assure du bon fonctionnement du parser
4. **Attention aux anomalies** : On est attentif aux sorties qui semblent anormales
5. **Vérification du dump** : On vérifie le dump binaire en cas de doute sur le parsing

### Workflow de Développement
1. **Analyser** le comportement actuel du parser
2. **Identifier** les problèmes ou incohérences dans les logs/JSON
3. **Vérifier** le dump binaire (Little Endian) pour confirmer l'hypothèse
4. **Modifier** le parser si nécessaire
5. **Tester** avec couleurs1.vnd et vérifier les sorties
6. **Documenter** les découvertes ici

---

## 🏗️ STRUCTURE DU FORMAT VND

### Architecture Globale
Un fichier VND est structuré ainsi :

```
┌─────────────────────────┐
│     HEADER              │ ← Signature VNFILE + métadonnées
├─────────────────────────┤
│     VARIABLES GLOBALES  │ ← Variables du jeu (SACADOS, JEU, etc.)
├─────────────────────────┤
│     SCÈNES (x N)        │ ← Séquence de scènes
│  ┌─────────────────┐    │
│  │ Séparateur (0x00)│   │
│  │ 8 Slots Fichiers │   │ (Titre + 7 fichiers: BMP, WAV, AVI, etc.)
│  │ Init Script      │   │ (Commandes d'initialisation / Toolbar)
│  │ Config           │   │ (Signature 0xFFFFFFDB + flags)
│  │ Hotspots         │   │ (Zones cliquables + géométrie)
│  └─────────────────┘    │
└─────────────────────────┘
```

### Encodage
- **Endianness:** Little Endian
- **Encoding des strings:** Windows-1252 (proche de Latin-1)
- **Format strings:** Pascal Strings (longueur en u32 + données)

---

## 📦 STRUCTURE D'UNE SCÈNE

### 1. Séparateur
- **Taille:** 1 byte
- **Valeur:** `0x00`
- **Rôle:** Marque le début d'une nouvelle scène

### 2. Fichiers (8 slots)
Chaque slot contient :
- **Longueur du nom** (u32, 4 bytes)
- **Nom du fichier** (string, N bytes)
- **Paramètre** (u32, 4 bytes) - usage inconnu

**Slots:**
1. **Slot 1:** Titre de la scène
2. **Slots 2-8:** Fichiers ressources (images, sons, vidéos)

**Extensions courantes:** `.bmp`, `.wav`, `.avi`, `.dll`, `.vnp`, `.htm`, `.exe`, `.ico`, `.cur`

**Quirks connus:**
- **Longueur 1 avec 0x00:** Dans certaines scènes (notamment #2), une longueur de 1 suivie de 0x00 est en réalité un alignement. Le parser backtrack et considère que le 0x00 appartient au paramètre suivant.

### 3. Init Script (Gap / Toolbar)
Zone entre les fichiers et la config, contient des commandes d'initialisation.

**Types de commandes:**
- **ID 0:** NOP (pas d'opération)
- **ID 1:** Paramètre entier (valeur sur 4 bytes)
- **ID 2:** Définition de zone binaire (7 entiers = 28 bytes)
- **ID > 2:** Commande avec string Pascal + paramètre

**Détection de fin:**
- Signature de config `0xFFFFFFDB`
- Début d'une nouvelle scène (séparateur + fichiers valides)
- Début des hotspots (heuristique)

**Garbage data connu:**
- **ID 30:** Probablement des coordonnées fantômes, on arrête le parsing
- **ID > 5000:** Garbage/padding, on arrête le parsing

### 4. Config
- **Signature:** `0xFFFFFFDB` (u32, 4 bytes)
- **Flags:** 4-5 entiers u32
- **Optionnel:** Certaines scènes n'ont pas de config (transitionnelles)

**Adaptive Config Length:**
Le parser vérifie si les bytes suivants ressemblent à des hotspots pour déterminer la longueur exacte de la config (4 ou 5 entiers).

### 5. Hotspots
Zones interactives de la scène.

**Structure globale:**
```
ObjCount (u32) ← Nombre d'objets/hotspots
│
└─ Pour chaque objet:
   ├─ CmdCount (u32) ← Nombre de commandes
   │  └─ Pour chaque commande:
   │     ├─ ID (u32)
   │     ├─ Subtype (u32)
   │     └─ Param (Pascal String)
   │
   ├─ CursorId (u32) ← ID du curseur au survol
   ├─ PointCount (u32) ← Nombre de points de la hitbox
   ├─ Points[] ← Tableau de coordonnées (x: i32, y: i32)
   └─ ExtraFlag (u32) ← Flag additionnel (optionnel)
```

**Commandes hotspot courantes:**

| ID  | Subtype | Description                    | Exemple                          |
|-----|---------|--------------------------------|----------------------------------|
| 0   | 39      | Config Police                  | Définit font et couleur          |
| 0   | 38      | Zone Texte / Bulle             | Texte cliquable                  |
| 0   | 24      | Zone Image                     | Affiche image statique/animée    |
| 1   | 6       | Son Interface / Curseur        | Son système ou ID curseur        |
| 1   | 9       | Media (Vidéo)                  | Lecture fichier AVI              |
| 3   | 21      | Script Logique                 | Logique conditionnelle           |
| 21+ | -       | System Cmd                     | Commandes système / Toolbar      |

---

## 🔧 FONCTIONNEMENT DU PARSER

### Classes Principales

#### `VNDSequentialParser`
**Fichier:** `services/vndParser.ts`

**Méthodes principales:**

1. **`parse(maxScenes)`** : Point d'entrée, parse jusqu'à N scènes
2. **`skipHeader()`** : Saute le header et trouve le début des scènes
3. **`parseSceneFiles()`** : Parse les 8 slots de fichiers
4. **`parseInitScript()`** : Parse le script d'initialisation
5. **`parseConfig()`** : Parse la config (signature + flags)
6. **`parseHotspots()`** : Parse les zones cliquables

**Méthodes utilitaires:**

- `readU8()`, `readU32()`, `readI32()` : Lecture Little Endian
- `readPascalString()` : Lecture string avec longueur
- `readFilename()` : Lecture nom de fichier (gère les quirks)
- `findSequence()` : Recherche d'une séquence de bytes
- `getValidFileCountInScene()` : Heuristique de détection de scène
- `looksLikeHotspotStart()` : Heuristique de détection de hotspot
- `isValidFilenameBytes()` : Validation des bytes de nom de fichier

### Heuristiques Intelligentes

#### Smart Seek avec Greedy Lookahead
Le parser utilise une approche optimisée pour trouver le début des scènes :

1. **Scan initial** : Recherche d'un offset avec des fichiers valides
2. **Greedy optimization** : Une fois trouvé, regarde les 32 bytes suivants par pas de 8
3. **Sélection du meilleur** : Choisit l'offset qui maximise le nombre de fichiers valides

#### Détection des Hotspots
Pattern recherché :
- `ObjCount` (1-500)
- `CmdCount` (1-200)
- `FirstCmdID` dans la liste des IDs connus (39, 38, 24, 9, 6, 7, 36, 11, 21, 27, 1)
- `FirstParamLen` < 5000 (évite les faux positifs)

### Versions et Fixes

**v5.5 - Hotspot Align Fix** (actuelle)
- Fix de l'alignement des hotspots
- Amélioration de la détection des faux positifs
- Vérification de la longueur des paramètres

**v5.4 - Ghost Data Filter**
- Filtrage de l'ID 30 et des IDs > 5000 dans Init Script

**v5.3 - ID 0 Display Fix**
- Support de l'ID 0 avec subtype connu (39, 38, 24)

**v5.2 - Hotspot Early Break Fix**
- Gestion des scènes sans config (hotspots immédiats)

**v5.1 - Deep Smart Seek**
- Implémentation du Greedy Lookahead

---

## 🎯 TYPES DE DONNÉES

**Fichier:** `types.ts`

### Interfaces Principales

```typescript
interface SceneFile {
  slot: number;          // 1-8
  filename: string;      // Nom du fichier ressource
  param: number;         // Paramètre (usage inconnu)
  offset: number;        // Position dans le fichier VND
}

interface InitCommand {
  id: number;            // ID de la commande
  param: string;         // Paramètre formaté
}

interface InitScript {
  flag: number;          // Flag (toujours 0 dans v5.5)
  count: number;         // Nombre de commandes
  commands: InitCommand[];
}

interface SceneConfig {
  flag: number;          // Signature (0xFFFFFFDB ou 0)
  ints: number[];        // 4-5 flags
}

interface HotspotCommand {
  id: number;            // ID de la commande
  subtype: number;       // Sous-type
  param: string;         // Paramètre (coordonnées, texte, etc.)
}

interface HotspotGeometry {
  cursorId: number;      // ID du curseur au survol
  pointCount: number;    // Nombre de points
  points: { x: number; y: number }[];  // Hitbox
  extraFlag: number;     // Flag additionnel
}

interface Hotspot {
  index: number;         // Index dans la scène
  commands: HotspotCommand[];
  geometry: HotspotGeometry;
}

interface ParsedScene {
  id: number;            // ID de la scène (1-based)
  offset: number;        // Position dans le fichier
  files: SceneFile[];
  initScript: InitScript;
  config: SceneConfig;
  hotspots: Hotspot[];
}

interface ParseResult {
  scenes: ParsedScene[];
  logs: string[];        // Logs du parsing
}
```

---

## 🖥️ INTERFACE UTILISATEUR

### Composants React

#### `App.tsx`
Composant principal de l'application.

**Fonctionnalités:**
- Upload de fichier `.vnd`
- Paramètre `maxScenes` (1-100)
- Bouton "Analyser" pour lancer le parsing
- Export JSON des résultats
- Basculement entre mode Visuel et Terminal
- Statistiques (scènes, hotspots, fichiers, logs)

#### `SceneDetails.tsx`
Affichage détaillé d'une scène avec onglets.

**Onglets:**
1. **Fichiers** : Affiche les 8 slots (titre en grand, fichiers en grille)
2. **Hotspots** : Commandes + géométrie avec icônes et couleurs
3. **Script & Config** : Init Script + flags de config

**Interprétation des commandes:**
- Icônes visuelles par type de commande
- Formatage des coordonnées en orange
- Descriptions des commandes

#### `LogViewer.tsx`
Console de logs du parsing.

**Fonctionnalités:**
- Affichage style terminal
- Auto-scroll vers le bas
- Coloration syntaxique (erreurs en jaune, scènes en bleu)

---

## 🐛 DEBUGGING ET ANALYSE

### Fichiers de Référence

#### `couleurs1.vnd`
Fichier de test principal (76 KB).

**Scènes attendues:** ~50 scènes
**Contenu:** Jeu éducatif sur les couleurs/pays/culture

#### `couleurs1.vnd.dump.txt`
Dump hexadécimal complet du fichier (Little Endian).

**Utilisation:**
- Vérifier les offsets mentionnés dans les logs
- Confirmer les structures de données
- Investiguer les anomalies de parsing

### Analyse d'une Anomalie

**Workflow recommandé:**

1. **Observer** les logs du parser (mode Terminal)
2. **Identifier** l'offset du problème (`0xXXXXXXXX`)
3. **Ouvrir** `couleurs1.vnd.dump.txt` et chercher l'offset
4. **Analyser** les bytes autour (Little Endian)
5. **Formuler** une hypothèse sur la structure attendue
6. **Modifier** le parser si nécessaire
7. **Tester** et comparer avec le JSON exporté

**Exemple de lecture Little Endian:**
```
Dump: 09 00 00 00 6D 75 73 69 63 2E 77 61 76
      └─ u32 ──┘  └─────── string ─────────┘
      9            "music.wav" (9 bytes)
```

### Commandes Utiles

**Chercher un offset dans le dump:**
```bash
grep "00001234" couleurs1.vnd.dump.txt
```

**Extraire une plage d'offsets:**
```bash
sed -n '/00001230/,/00001250/p' couleurs1.vnd.dump.txt
```

---

## 📊 EXPORT JSON

Le parser génère un JSON avec la structure suivante :

```json
{
  "scenes": [
    {
      "id": 1,
      "offset": 1234,
      "files": [
        {"slot": 1, "filename": "Titre Scene", "param": 0, "offset": 1235},
        {"slot": 2, "filename": "image.bmp", "param": 100, "offset": 1250}
      ],
      "initScript": {
        "flag": 0,
        "count": 5,
        "commands": [
          {"id": 396, "param": "Toolbar (P:0)"}
        ]
      },
      "config": {
        "flag": 4242636507,
        "ints": [640, 480, 16, 1]
      },
      "hotspots": [
        {
          "index": 0,
          "commands": [
            {"id": 0, "subtype": 39, "param": "Arial 12 #000000"}
          ],
          "geometry": {
            "cursorId": 1,
            "pointCount": 4,
            "points": [
              {"x": 100, "y": 100},
              {"x": 200, "y": 100},
              {"x": 200, "y": 200},
              {"x": 100, "y": 200}
            ],
            "extraFlag": 0
          }
        }
      ]
    }
  ],
  "logs": [
    "================================================================================",
    "VND SEQUENTIAL PARSER - V5.5 (Hotspot Align Fix)",
    "..."
  ]
}
```

### Validation du JSON

**Checklist post-parsing:**

- [ ] Nombre de scènes cohérent (pas de stop prématuré)
- [ ] Chaque scène a un titre (slot 1)
- [ ] Fichiers ressources ont des extensions valides
- [ ] Init Script ne contient pas de garbage (ID < 5000)
- [ ] Config flag = `0xFFFFFFDB` ou `0` (si absente)
- [ ] Hotspots ont des coordonnées réalistes (x, y < 5000)
- [ ] Pas d'erreurs dans les logs (`❌` ou `⚠️`)

---

## 🚀 OBJECTIF FINAL

**But:** Parser totalement fonctionnel et universel pour tous les fichiers VND.

### Critères de Succès

1. **Universalité** : Le parser doit fonctionner sur tous les fichiers VND, pas seulement `couleurs1.vnd`
2. **Robustesse** : Gestion gracieuse des cas limites et formats non standard
3. **Précision** : Les structures parsées doivent correspondre exactement au binaire
4. **Complétude** : Tous les éléments d'une scène doivent être extraits (fichiers, scripts, hotspots)
5. **Performance** : Parsing rapide même pour des fichiers volumineux (>10 MB)

### Prochaines Étapes Potentielles

- [ ] Support des fichiers VND avec variantes de format
- [ ] Validation sémantique des commandes (syntaxe, valeurs)
- [ ] Décompilation des scripts en pseudo-code lisible
- [ ] Reconstruction 3D des scènes (preview visuel)
- [ ] Export vers d'autres formats (XML, YAML)
- [ ] Reverse engineering des paramètres inconnus

---

## 📝 NOTES ET DÉCOUVERTES

### Observations sur couleurs1.vnd

**Variables globales identifiées (header):**
- `SACADOS`, `JEU`, `BIDON`, `MILLEEURO`, `CALC`, `TELEPHONE`, etc.
- Probablement des flags de jeu et compteurs

**Extensions de fichiers rencontrées:**
- Images : `.bmp`
- Sons : `.wav`
- Vidéos : `.avi`
- Scripts : `.vnp`
- Divers : `.dll`, `.htm`, `.exe`, `.ico`, `.cur`

**Quirks identifiés:**
- Scène 2 : Alignement problématique (longueur 1 + 0x00)
- Scène 24 : Absence de config, hotspots immédiats
- Scène 33 : False positive sur la détection de hotspots (fixé en v5.5)

---

## 🔗 RESSOURCES

**Fichiers importants:**
- `services/vndParser.ts` : Logique de parsing
- `types.ts` : Définitions TypeScript
- `App.tsx` : Interface principale
- `components/SceneDetails.tsx` : Affichage des scènes
- `components/LogViewer.tsx` : Console de logs
- `couleurs1.vnd` : Fichier de test
- `couleurs1.vnd.dump.txt` : Dump binaire de référence

**Dépendances:**
- React 19.2.3
- TypeScript 5.8.2
- Vite 6.2.0
- lucide-react 0.562.0 (icônes)

**Commandes npm:**
```bash
npm install          # Installer les dépendances
npm run dev          # Lancer le serveur de dev (http://localhost:5173)
npm run build        # Build de production
npm run preview      # Preview du build
```

---

**Fin de la documentation - Dernière mise à jour : 2026-01-18**
