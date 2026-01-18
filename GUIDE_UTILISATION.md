# Guide d'Utilisation Rapide - Parser VND

## 🚀 Démarrage Rapide

### 1. Le serveur est déjà lancé !

Le serveur de développement est accessible à :
- **URL Locale :** http://localhost:3000/
- **URL Réseau :** http://21.0.0.120:3000/

### 2. Utiliser le Parser

#### Étape 1 : Upload du fichier VND
1. Cliquez sur la zone "Cliquez pour upload"
2. Sélectionnez le fichier `couleurs1.vnd` (ou tout autre fichier .vnd)

#### Étape 2 : Configurer le parsing
1. Définissez le nombre maximum de scènes à parser (défaut: 50)
2. Cliquez sur le bouton **"Analyser"**

#### Étape 3 : Consulter les résultats

**Mode Visuel** (par défaut) :
- Onglet **Fichiers** : Affiche le titre et les 7 fichiers ressources
- Onglet **Hotspots** : Zones cliquables avec commandes et géométrie
- Onglet **Script & Config** : Script d'initialisation et flags de configuration

**Mode Terminal** :
- Logs détaillés du parsing
- Offsets hexadécimaux
- Détection des anomalies (⚠️, ❌)
- Statistiques de parsing

#### Étape 4 : Export JSON
1. Cliquez sur le bouton **"JSON"** (vert)
2. Le fichier sera téléchargé : `couleurs1.vnd.json`
3. Ouvrez-le dans votre éditeur pour analyser la structure complète

---

## 📂 Fichiers Importants

### Fichiers du Projet
- **`VND_PARSER_DOC.md`** : Documentation technique complète (RÈGLES + FORMAT VND + PARSER)
- **`couleurs1.vnd`** : Fichier de test principal (76 KB)
- **`couleurs1.vnd.dump.txt`** : Dump hexadécimal pour debugging (380 KB)
- **`services/vndParser.ts`** : Code source du parser (23 KB)

### Commandes NPM
```bash
npm run dev      # Démarrer le serveur (déjà lancé !)
npm run build    # Build de production
npm run preview  # Preview du build
```

---

## 🔍 Comment Analyser les Sorties

### Vérifier le JSON Exporté

**Checklist de validation :**
- [ ] Le nombre de scènes est cohérent (~50 pour couleurs1.vnd)
- [ ] Chaque scène a un titre (slot 1)
- [ ] Les fichiers ont des extensions valides (.bmp, .wav, .avi, etc.)
- [ ] Les hotspots ont des coordonnées réalistes (x, y < 5000)
- [ ] Pas d'erreurs dans les logs

**Structure JSON :**
```json
{
  "scenes": [
    {
      "id": 1,
      "offset": 1234,
      "files": [...],
      "initScript": {...},
      "config": {...},
      "hotspots": [...]
    }
  ],
  "logs": [...]
}
```

### Interpréter les Logs (Mode Terminal)

**Symboles importants :**
- ✓ : Opération réussie
- ℹ️ : Information / Quirk détecté
- ⚠️ : Avertissement (données suspectes)
- ❌ : Erreur critique (parsing arrêté)

**Exemple de log normal :**
```
================================================================================
VND SEQUENTIAL PARSER - V5.5 (Hotspot Align Fix)
================================================================================
✓ Signature VNFILE @ 0x00000006
✓ Début estimé des scènes @ 0x0000064D

════════════════════════════════════════════════════════════════════════════════
SCÈNE #1 @ 0x0000064E
════════════════════════════════════════════════════════════════════════════════
    Titre @ 0x0000064F: 'Ecran titre' (param=0)
    Fichier 1 @ 0x00000665: 'fond1.bmp' (param=0)
    ...
  [HOTSPOTS] (12 items)
```

**Anomalies courantes :**
```
ℹ️ Quirk: Filename length 1 with value 0x00 at 0x00001234. Backtracking.
→ Alignement détecté, gestion automatique

⚠️ Suspicious hotspot count: 50000. Ignoring hotspots.
→ Nombre de hotspots irréaliste, zone ignorée

❌ Cannot read u32 at offset 0x00009999
→ Fin de fichier atteinte prématurément
```

---

## 🐛 Debugging d'un Problème

### Workflow Recommandé

1. **Identifier le problème**
   - Consultez les logs (mode Terminal)
   - Notez l'offset hexadécimal (`0xXXXXXXXX`)
   - Notez le numéro de scène concernée

2. **Vérifier le dump binaire**
   - Ouvrez `couleurs1.vnd.dump.txt`
   - Cherchez l'offset : `grep "XXXXXXXX" couleurs1.vnd.dump.txt`
   - Analysez les bytes autour (Little Endian)

3. **Interpréter les bytes (Little Endian)**
   ```
   Exemple de lecture :

   Dump : 09 00 00 00 6D 75 73 69 63 2E 77 61 76
          └─ u32 ──┘  └────── string ──────────┘
          = 9         = "music.wav" (9 bytes)

   Dump : 20 03 00 00
          └─ u32 ──┘
          = 0x00000320 = 800 (décimal)
   ```

4. **Documenter la découverte**
   - Ajoutez vos observations dans `VND_PARSER_DOC.md`
   - Section **"NOTES ET DÉCOUVERTES"**

5. **Modifier le parser si nécessaire**
   - Éditez `services/vndParser.ts`
   - Testez avec `couleurs1.vnd`
   - Rechargez la page (le serveur Vite recharge automatiquement)

---

## 📊 Statistiques du Fichier couleurs1.vnd

**Informations générales :**
- Taille : 76 174 bytes (~76 KB)
- Nombre de scènes attendues : ~50
- Thématique : Jeu éducatif (couleurs, pays, culture)

**Variables globales (dans le header) :**
- SACADOS, JEU, BIDON, MILLEEURO, CALC, TELEPHONE
- DELPHITEST1, DELPHITEST2, CPAYS, CMENU1, CMENU2, CMENU3
- COMPTEUR1, COMPTEUR2, COMPTEUR3, RAQUETTE, REPONSE, etc.

**Extensions de fichiers rencontrées :**
- Images : `.bmp`
- Sons : `.wav`
- Vidéos : `.avi`
- Bibliothèques : `.dll`
- Pages web : `.htm`
- Exécutables : `.exe`
- Icônes : `.ico`, `.cur`

---

## 🎯 Fonctionnalités du Parser

### Détection Intelligente
- **Smart Seek avec Greedy Lookahead** : Trouve automatiquement le début des scènes
- **Heuristiques de validation** : Détecte les structures valides
- **Gestion des quirks** : Alignements, garbage data, formats non standard

### Robustesse
- **Adaptive Config Length** : Détecte si la config a 4 ou 5 entiers
- **Hotspot Detection** : Identifie les hotspots même sans signature de config
- **Garbage Filtering** : Ignore les données parasites (ID 30, ID > 5000)

### Logs Détaillés
- Offsets hexadécimaux pour chaque élément
- Détection des anomalies en temps réel
- Statistiques complètes

---

## 🔧 Troubleshooting

### Le serveur ne démarre pas
```bash
# Vérifier que le port 3000 n'est pas déjà utilisé
lsof -i :3000

# Relancer le serveur
npm run dev
```

### Le parser ne trouve pas de scènes
- Vérifiez que le fichier est bien un .vnd
- Consultez les logs (mode Terminal) pour voir les erreurs
- Vérifiez l'offset de la signature VNFILE

### Les hotspots ne s'affichent pas
- Certaines scènes n'ont pas de hotspots (transitionnelles)
- Vérifiez que la config est présente (signature `0xFFFFFFDB`)
- Consultez les logs pour voir si les hotspots ont été détectés

### Le JSON exporté semble incomplet
- Augmentez le paramètre `maxScenes`
- Vérifiez les logs pour voir si le parsing s'est arrêté prématurément
- Cherchez les erreurs `❌` ou `⚠️` dans les logs

---

## 📞 Support

Pour toute question ou problème :
1. Consultez d'abord **`VND_PARSER_DOC.md`** (documentation technique complète)
2. Analysez les logs du parser (mode Terminal)
3. Vérifiez le dump binaire si nécessaire
4. Documentez vos découvertes dans la section "NOTES ET DÉCOUVERTES"

---

**Bon parsing ! 🎉**
