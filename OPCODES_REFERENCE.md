# 🎮 Référence des Opcodes du Moteur Europeo

**Source :** Reverse engineering du moteur de jeu Europeo
**Date :** 2026-01-18

---

## 📋 Table des Opcodes

Le répartiteur de commandes (**sub_43177D**) est le cœur logique du moteur. Il traite les instructions sous forme d'**Opcodes**, représentés par des lettres dans le flux binaire.

**Règle de conversion :** `index = caractère - 'a' + 1`

| Lettre | Index | Fonction IDA | Rôle et Description |
|--------|-------|--------------|---------------------|
| **a–d** | 1–4 | `PostMessageA` | Gestion des messages système et de l'interface utilisateur |
| **e** | 5 | Message 0x9C | Mise à jour interne de l'interface graphique |
| **f** | **6** | `sub_4268F8` | **🎯 Saut de scène** : Navigation interne principale |
| **g** | 7 | `sub_426B62` | Exécution de scripts complexes avec arguments |
| **h** | **8** | `sub_426D33` | **💬 Tooltip** : Affichage d'une bulle d'aide ou d'un texte de survol |
| **i** | **9** | `sub_42703A` | **🖼️ Rendu d'images** : Chargement et affichage des fichiers AVI ou BMP |
| **j** | **10** | `sub_4275F6` | **🎨 Bitmaps techniques** : Gestion de la transparence et des palettes |
| **k** | 11 | `sub_427B56` | 🔊 Lecture de fichiers audio au format **WAV** |
| **l** | 12 | `sub_427C42` | 🎵 Lecture de musique au format **MIDI** |
| **m** | 13 | `sub_427D34` | 📝 Chargement de segments de texte ou de scripts |
| **p** | 16 | `sub_405010` | ⏸️ Commande de pause (**Sleep**) |
| **q, r** | 17–18 | `sub_427FAE` | 🚀 Exécution de fichiers ou programmes externes via `ShellExecuteA` |
| **s** | 19 | `sub_427EFF` | 💿 Contrôle des pistes **CD-Audio** |
| **u** | **21** | `sub_431721` | **🔀 Logique conditionnelle** : Gestion des blocs `if/then/else` |
| **z** | 26 | `sub_428154` | 🖱️ Chargement des curseurs personnalisés (`.cur`) |
| **N/A** | **31** | `sub_42908F` | **📦 Run Project** : Chargement d'un nouveau fichier projet `.vnp` |

---

## 🔍 Mécanisme de Parsing

### 1. Streaming des Opcodes

Les opcodes ne sont **pas stockés dans une table isolée**, mais sont **injectés directement dans le flux de données** des enregistrements (Records).

**Exemple de séquence :** `54h`

```
Flux binaire : "54h"
               ↓
   atol() consomme "54" → retourne 54 (paramètre)
               ↓
   Pointeur sur "h" → Opcode détecté (Index 8)
               ↓
   sub_426D33() appelée → Afficher Tooltip avec param=54
```

### 2. Fonction de Lecture

**Fonction :** `sub_407FE5`

**Algorithme :**
1. Lit le flux octet par octet
2. Utilise `atol()` pour extraire les chiffres
3. **S'arrête dès qu'elle rencontre un caractère non numérique** (la lettre de l'opcode)
4. Le nombre est transmis comme paramètre
5. Le caractère suivant est interprété comme l'opcode à exécuter

### 3. Localisation dans le VND

Les opcodes se trouvent principalement dans :
- **Type 1 (Cible)** : Séquences de navigation
- **Type 2 (Hotspot)** : Actions sur les zones cliquables
- **Type 21 (Conditions)** : Blocs logiques `if/then/else`

---

## 🧭 Mécanismes de Navigation

### 1. Navigation Relative avec Index (`Ni`)

**Syntaxe :** `5i`

**Calcul :** `Cible = INDEX_ID + 5`

**Détails :**
- `INDEX_ID` est défini dans le fichier `.INI` du projet (section `[MAIN]`)
- En mémoire, il est stocké à l'offset 65 (0x41) de l'objet de scène
- Fonction de lecture : `sub_417031` → `TProfile::GetInt("INDEX_ID", 0)`
- Opcode : **i** (Index 9)
- Action : Charger et afficher l'image de la scène cible

**Exemple dans couleurs1.vnd :**
```
"param": "5"  +  Opcode 'i'  →  Aller à la scène (INDEX_ID + 5)
```

### 2. Saut Direct (`Nd`)

**Syntaxe :** `13d`

**Calcul :** `Cible = 13` (valeur absolue)

**Détails :**
- Utilise la valeur numérique brute comme identifiant absolu
- **Pas d'ajout de INDEX_ID**
- Opcode : **d** (Index 4)

### 3. Sauts Relatifs (`+N` / `-N`)

**Syntaxe :** `+3` ou `-2`

**Calcul :**
- `Cible = Scène_Actuelle + 3`
- `Cible = Scène_Actuelle - 2`

**Détails :**
- Le parseur identifie les signes `+` ou `-` en début de chaîne
- Navigation relative à la scène courante

### 4. Saut par Défaut

**Syntaxe :** `15` (sans suffixe)

**Comportement :** Saut direct (équivalent à `15d`)

### 5. Navigation Cross-Projet (`runprj`)

**Syntaxe :** `runprj ../biblio/biblio.vnp 4`

**Détails :**
- Charge un fichier `.vnp` entièrement différent
- Utilisé pour passer d'un pays à un autre dans le jeu Europeo
- Opcode : **31** (Run Project)

**Exemples trouvés dans couleurs1.vnd :**
```json
"score < 0 then runprj ..\\couleurs1\\couleurs1.vnp 54"
"jeu = 1 then runprj ..\\biblio\\biblio.vnp 4"
"jeu = 1 then runprj ..\\italie\\italie.vnp 27"
```

### 6. Timer Automatique

**Syntaxe (dans .INI) :** `TIMER=délai,scène_cible`

**Détails :**
- Défini dans le fichier de configuration `.INI`
- Déclenche une navigation automatique après un temps donné
- Exemple : `TIMER=5000,10` → Aller à la scène 10 après 5 secondes

---

## 📝 Exemples Pratiques

### Exemple 1 : Tooltip

**Séquence :** `54h`

**Décodage :**
- Paramètre : `54`
- Opcode : `h` (Index 8)
- Action : Afficher un tooltip avec l'ID 54

### Exemple 2 : Charger une Image

**Séquence :** `5i`

**Décodage :**
- Paramètre : `5`
- Opcode : `i` (Index 9)
- Action : Aller à la scène `INDEX_ID + 5` et charger son image

### Exemple 3 : Logique Conditionnelle

**Séquence parsée dans couleurs1.vnd :**
```json
{
  "id": 3,
  "subtype": 21,
  "param": "score < 0 then runprj ..\\couleurs1\\couleurs1.vnp 54"
}
```

**Décodage :**
- Opcode : `u` (Index 21)
- Condition : `score < 0`
- Action : Si vrai, charger `couleurs1.vnp` à la scène 54

### Exemple 4 : Lecture Audio

**Séquence :** `3k`

**Décodage :**
- Paramètre : `3`
- Opcode : `k` (Index 11)
- Action : Jouer le fichier WAV n°3

---

## 🔧 Correspondance avec le Format VND

### Structure des Commandes Hotspot

Dans le JSON parsé, on trouve :

```json
{
  "id": 1,
  "subtype": 6,
  "param": "5"
}
```

**Interprétation avec les opcodes :**
- `id: 1` = Commande Media/Interaction
- `subtype: 6` = Correspond à l'opcode **f** (Saut de scène)
- `param: "5"` = Paramètre numérique (pourrait être suivi d'un opcode comme `i`, `d`, etc.)

### Opcode Implicite

Certains opcodes ne sont pas visibles dans le paramètre parsé car ils ont déjà été consommés par le moteur lors de la lecture.

**Exemple :**
- Dans le dump : `35 69` → `"5i"` (ASCII)
- Dans le JSON : `"param": "5"`
- L'opcode `i` est **implicite** car il détermine le `subtype` ou l'action suivante

---

## 🎯 Impact sur l'Analyse

### 1. Décodage des Paramètres

Quand on voit `"param": "5"` dans un hotspot avec `subtype: 6`, on peut maintenant interpréter :
- **Si c'était `5i` dans le binaire** : Navigation vers `INDEX_ID + 5` + Chargement d'image
- **Si c'était `5d` dans le binaire** : Navigation directe vers la scène 5
- **Si c'était `5f` dans le binaire** : Saut de scène standard vers 5

### 2. Commandes Composées

Les commandes peuvent être **chaînées** :
```
5i → Paramètre 5 + Opcode i (charger image de la scène INDEX_ID + 5)
3k → Paramètre 3 + Opcode k (jouer le WAV n°3)
```

### 3. Logique Conditionnelle

Les blocs `if/then/else` sont gérés par l'opcode `u` (Index 21) :

```
Syntaxe : <condition> then <action>
Exemple : "score < 0 then runprj ..\\couleurs1\\couleurs1.vnp 54"
```

---

## 🛠️ Améliorations Futures du Parser

### 1. Détection des Opcodes

Ajouter une fonction pour détecter les opcodes dans les paramètres :

```typescript
function detectOpcode(param: string): { value: number, opcode: string | null } {
  const match = param.match(/^(\d+)([a-z])$/);
  if (match) {
    return { value: parseInt(match[1]), opcode: match[2] };
  }
  return { value: parseInt(param) || 0, opcode: null };
}
```

### 2. Interprétation des Opcodes

Enrichir le JSON avec l'interprétation :

```json
{
  "param": "5i",
  "interpreted": {
    "value": 5,
    "opcode": "i",
    "opcodeIndex": 9,
    "action": "Load image from scene INDEX_ID + 5"
  }
}
```

### 3. Parser l'INDEX_ID

Extraire l'INDEX_ID du fichier `.INI` associé (si disponible) et l'ajouter au JSON :

```json
{
  "metadata": {
    "indexId": 42,
    "iniFile": "couleurs1.ini"
  }
}
```

---

## 📚 Glossaire

| Terme | Définition |
|-------|------------|
| **Opcode** | Code opération (lettre) qui déclenche une fonction spécifique du moteur |
| **INDEX_ID** | Valeur de base pour les calculs de navigation relative |
| **Streaming** | Méthode de lecture séquentielle du flux binaire |
| **atol()** | Fonction C qui convertit une chaîne en entier (s'arrête au premier caractère non numérique) |
| **runprj** | Commande pour charger un nouveau projet `.vnp` |
| **Record Type** | Type d'enregistrement dans le VND (Type 1 = Cible, Type 2 = Hotspot, Type 21 = Condition) |

---

## 🔗 Références

- **Fonction de répartition :** `sub_43177D` (Dispatcher)
- **Fonction de parsing :** `sub_407FE5` (atol stream reader)
- **Fonction de lecture INI :** `sub_417031` (TProfile::GetInt)
- **Offset INDEX_ID en mémoire :** 65 (0x41) dans l'objet de scène

---

**Dernière mise à jour :** 2026-01-18
**Source :** Reverse engineering NotebookLM + Analyse de couleurs1.vnd
