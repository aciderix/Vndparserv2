# 🖥️ Parser VND - Mode CLI (Ligne de Commande)

## 🎯 Pourquoi le Mode CLI ?

Le mode CLI est **parfaitement adapté pour Claude** (moi) car il me permet de :
- ✅ Parser directement depuis le terminal
- ✅ Voir les logs en temps réel avec coloration
- ✅ Récupérer le JSON automatiquement
- ✅ Analyser les sorties sans interface web

---

## 🚀 Utilisation de Base

### Commande Générale

```bash
npm run parse <fichier.vnd> [maxScenes]
```

### Paramètres

- `<fichier.vnd>` : Chemin vers le fichier VND à parser (obligatoire)
- `[maxScenes]` : Nombre maximum de scènes à parser (optionnel, défaut: 50)

---

## 📖 Exemples

### 1. Parser les 10 premières scènes de couleurs1.vnd

```bash
npm run parse couleurs1.vnd 10
```

**Sortie attendue :**
- Logs en couleur dans le terminal
- Fichier `couleurs1.parsed.json` créé
- Fichier `couleurs1.logs.txt` créé

### 2. Parser toutes les scènes (défaut 50)

```bash
npm run parse couleurs1.vnd
```

### 3. Parser 100 scènes (fichier volumineux)

```bash
npm run parse gros_fichier.vnd 100
```

### 4. Parser avec chemin absolu

```bash
npm run parse /path/to/mon_fichier.vnd 20
```

---

## 📦 Fichiers Générés

Après chaque parsing, deux fichiers sont créés dans le **même répertoire** que le fichier VND :

### 1. `<nom>.parsed.json`
**Contenu :** Données structurées complètes du parsing

**Structure :**
```json
{
  "scenes": [
    {
      "id": 1,
      "offset": 4452,
      "files": [...],
      "initScript": {...},
      "config": {...},
      "hotspots": [...]
    }
  ],
  "logs": [...]
}
```

### 2. `<nom>.logs.txt`
**Contenu :** Tous les logs du parser (sans couleurs)

**Utilité :**
- Debugging
- Recherche d'offsets hexadécimaux
- Analyse des quirks détectés

---

## 🎨 Sortie en Couleurs

Le CLI affiche des logs en couleur pour une meilleure lisibilité :

| Couleur | Signification |
|---------|---------------|
| 🟢 Vert | Succès / Opération réussie |
| 🔵 Bleu | Titre de scène / Sections |
| 🟡 Jaune | Avertissement (⚠️) |
| 🔴 Rouge | Erreur (❌) |
| ⚪ Gris | Information (ℹ️) / Quirks |
| 🟣 Magenta | Résumé des scènes |

**Exemple de log coloré :**
```
✓ Signature VNFILE @ 0x00000009            (vert)
════════════════════════════════════════   (bleu)
SCÈNE #1 @ 0x00001163                      (cyan gras)
════════════════════════════════════════   (bleu)
    Fichier 1 @ 0x0000116C: 'music.wav'    (blanc)
    ℹ️ Quirk: Filename length 1...         (gris)
⚠️ Suspicious hotspot count...             (jaune)
```

---

## 📊 Sections de la Sortie

### 1. Bannière

```
╔════════════════════════════════════════════════════════════════╗
║          VND CLI Parser - Version 5.5                          ║
║          Analyse de fichiers Visual Novel (.vnd)               ║
╚════════════════════════════════════════════════════════════════╝
```

### 2. Informations du Fichier

```
📂 Lecture du fichier: couleurs1.vnd
   Taille: 74.39 KB (76174 bytes)

🔍 Parsing en cours (max 10 scènes)...
```

### 3. Logs Détaillés

Identiques à ceux de l'interface web (mode Terminal), avec :
- Offsets hexadécimaux
- Détection des quirks
- Fichiers détectés
- Nombre de hotspots

### 4. Statistiques

```
📊 STATISTIQUES
  Scènes parsées:    10
  Total hotspots:    78
  Total fichiers:    18
  Lignes de logs:    78
```

### 5. Confirmation de Sauvegarde

```
💾 Sauvegarde du JSON...
✅ JSON sauvegardé: couleurs1.parsed.json

💾 Sauvegarde des logs...
✅ Logs sauvegardés: couleurs1.logs.txt
```

### 6. Résumé des Scènes

```
📑 RÉSUMÉ DES SCÈNES:

  Scène #1 @ 0x00001164
    Titre: (sans titre)
    Fichiers: 2 | Hotspots: 6 | Script cmds: 2

  Scène #2 @ 0x00001A4E
    Titre: (sans titre)
    Fichiers: 1 | Hotspots: 6 | Script cmds: 4
  ...
```

---

## 🔍 Analyser les Résultats

### Lire le JSON

```bash
# Avec jq (formaté)
cat couleurs1.parsed.json | jq '.'

# Compter le nombre de scènes
cat couleurs1.parsed.json | jq '.scenes | length'

# Extraire les titres des scènes
cat couleurs1.parsed.json | jq '.scenes[].files[] | select(.slot == 1) | .filename'

# Voir la première scène complète
cat couleurs1.parsed.json | jq '.scenes[0]'
```

### Chercher dans les Logs

```bash
# Chercher une scène spécifique
grep "SCÈNE #5" couleurs1.logs.txt

# Chercher les quirks
grep "ℹ️" couleurs1.logs.txt

# Chercher les erreurs
grep "❌\|⚠️" couleurs1.logs.txt

# Chercher un offset
grep "0x00001A4D" couleurs1.logs.txt
```

---

## 🐛 Cas d'Usage pour Debugging

### 1. Comparer avec le Dump Binaire

**Scénario :** Une scène semble mal parsée

```bash
# 1. Parser et récupérer l'offset
npm run parse couleurs1.vnd 10

# 2. Chercher l'offset dans les logs
grep "SCÈNE #5" couleurs1.logs.txt
# Résultat: SCÈNE #5 @ 0x00003B1A

# 3. Chercher dans le dump
grep "00003B1A" couleurs1.vnd.dump.txt
```

### 2. Tester un Fix du Parser

**Scénario :** J'ai modifié le parser, je veux tester

```bash
# 1. Parser avec la nouvelle version
npm run parse couleurs1.vnd 10

# 2. Comparer les logs
diff couleurs1.logs.old.txt couleurs1.logs.txt

# 3. Comparer les JSONs
diff <(jq -S . couleurs1.parsed.old.json) <(jq -S . couleurs1.parsed.json)
```

### 3. Analyser une Anomalie

**Scénario :** La scène #9 a un nombre suspect de hotspots

```bash
# 1. Parser
npm run parse couleurs1.vnd 10

# 2. Extraire la scène #9 du JSON
cat couleurs1.parsed.json | jq '.scenes[] | select(.id == 9)'

# 3. Vérifier dans les logs
grep -A 20 "SCÈNE #9" couleurs1.logs.txt

# 4. Vérifier l'offset dans le dump
# Supposons offset = 0x00006199
grep -A 5 "00006199" couleurs1.vnd.dump.txt
```

---

## ⚙️ Configuration Avancée

### Modifier le Nombre de Scènes par Défaut

Éditer `cli-parser.ts`, ligne ~172 :

```typescript
const maxScenes = args[1] ? parseInt(args[1], 10) : 50; // Changer 50
```

### Désactiver les Couleurs

Si les couleurs posent problème, définir :

```bash
NO_COLOR=1 npm run parse couleurs1.vnd 10
```

### Rediriger la Sortie

```bash
# Sauvegarder la sortie complète
npm run parse couleurs1.vnd 10 > output.log 2>&1

# Ne garder que les erreurs
npm run parse couleurs1.vnd 10 2> errors.log

# Pipe vers less pour pagination
npm run parse couleurs1.vnd 10 | less -R
```

---

## 🚨 Messages d'Erreur Courants

### Fichier non trouvé

```
❌ Fichier non trouvé: couleurs2.vnd
```

**Solution :** Vérifier le chemin du fichier

### Erreur de Parsing

```
❌ ERREUR CRITIQUE:
Cannot read u32 at offset 0x00012345
```

**Solution :**
1. Vérifier les logs pour voir où le parsing a échoué
2. Chercher l'offset dans le dump binaire
3. Analyser la structure autour de l'offset

### Nombre de Scènes Invalide

```
❌ maxScenes doit être un nombre >= 1
```

**Solution :** Utiliser un nombre positif

---

## 📝 Bonnes Pratiques

### 1. Toujours Commencer avec un Faible Nombre de Scènes

```bash
# Tester d'abord avec 5-10 scènes
npm run parse nouveau_fichier.vnd 10

# Si OK, augmenter progressivement
npm run parse nouveau_fichier.vnd 50
```

### 2. Sauvegarder les Résultats Importants

```bash
# Renommer les fichiers pour éviter l'écrasement
mv couleurs1.parsed.json couleurs1.parsed.backup.json
mv couleurs1.logs.txt couleurs1.logs.backup.txt
```

### 3. Utiliser jq pour l'Analyse

```bash
# Installer jq si besoin
# sudo apt install jq

# Exemples d'analyses
cat couleurs1.parsed.json | jq '.scenes | map(.hotspots | length)'
cat couleurs1.parsed.json | jq '.scenes | map(.files | length)'
```

---

## 🎯 Workflow Recommandé pour Claude

### Lors d'une Nouvelle Analyse

1. **Parser avec le CLI**
   ```bash
   npm run parse couleurs1.vnd 10
   ```

2. **Lire les Statistiques**
   - Affichées automatiquement dans le terminal

3. **Analyser le JSON**
   ```bash
   cat couleurs1.parsed.json | jq '.scenes[0]'
   ```

4. **Chercher des Anomalies**
   ```bash
   grep "⚠️\|❌" couleurs1.logs.txt
   ```

5. **Si Problème : Vérifier le Dump**
   ```bash
   # Récupérer l'offset depuis les logs
   grep "SCÈNE #X" couleurs1.logs.txt
   # Puis chercher dans le dump
   grep "XXXXXXXX" couleurs1.vnd.dump.txt
   ```

---

## 📚 Ressources

- **Documentation technique :** `VND_PARSER_DOC.md`
- **Guide utilisateur web :** `GUIDE_UTILISATION.md`
- **Code source du CLI :** `cli-parser.ts`
- **Code source du parser :** `services/vndParser.ts`

---

## 🆘 Aide

```bash
# Afficher l'aide
npm run parse --help
npm run parse -h
```

---

**Dernière mise à jour :** 2026-01-18
**Version du Parser :** v5.5 (Hotspot Align Fix)
