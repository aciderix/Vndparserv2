# Patterns de début de scènes après les variables

## Résultats de l'analyse

### Pattern A: Avec séparateur 01 00 00 00

**couleurs1.vnd:**
```
0x1154: [8 bytes padding fin variables]
0x115C: 01 00 00 00  ← Séparateur
0x1160: [8 bytes padding]
0x1168: 08 00 00 00  ← slot=8 (DÉBUT DE SCÈNE) ✓
0x116C: 09 00 00 00  ← length=9
0x1170: "music.wav"
```

**danem.vnd:**
```
0x1152: [8 bytes padding fin variables]
0x115A: 00 00 00 00 00 00 00 00  ← 8 bytes padding supplémentaires
0x1162: 01 00 00 00  ← Séparateur
0x1166: [4 bytes padding]
0x116E: 00 00        ← slot=0 (DÉBUT DE SCÈNE) ✓
0x1170: 09 00 00 00  ← length=9
0x1174: "a_dan.wav"
```

### Pattern B: Sans séparateur 01 00 00 00

**barre.vnd:**
```
0x134: [8 bytes padding fin variables]
0x13C: [8 bytes padding]
0x144: 81 00 00 00  ← slot=129 (DÉBUT DE SCÈNE) ✓
0x148: [beaucoup de padding et structure spéciale barre UI]
```

**finlan.vnd:**
```
0x1142: [8 bytes padding fin variables]
0x114A: [8 bytes padding]
0x1152: 81 00 00 00  ← slot=129 (DÉBUT DE SCÈNE) ✓
0x1156: [12 bytes padding]
0x1162: 08 00 00 00  ← length=8
0x1166: "vent.wav"
```

**start.vnd:**
```
0x11BE: [8 bytes padding fin variables]
0x11C6: [32 bytes padding!]
0x11E6: 09 00 00 00  ← length=9 (DÉBUT DE SCÈNE sans slot?) ✓
0x11EA: "<res0001>"  ← Resource name
```

## Réponses aux questions

### 1. Après le séparateur 01 00 00 00, y a-t-il TOUJOURS 8 bytes de padding?

**Réponse:** Le séparateur 01 00 00 00 n'existe que dans certains fichiers (couleurs1, danem). 
Quand il existe:
- couleurs1: Oui, 8 bytes de padding après
- danem: Seulement 4 bytes de padding après

**Conclusion:** Non, pas toujours 8 bytes.

### 2. Est-ce que tous les VND ont ce séparateur?

**Réponse:** NON!
- Avec séparateur: couleurs1, danem
- Sans séparateur: barre, finlan, start

**Le séparateur 01 00 00 00 n'est PAS un marqueur fiable.**

### 3. Structure correcte

Il y a DEUX patterns différents:

**Pattern type 1 (couleurs1, danem):** 
Variables → Padding → Séparateur 01 00 00 00 → Padding → Slot u32 → Fichiers

**Pattern type 2 (barre, finlan, start):**
Variables → Padding → Directement Slot u32 ou Length → Fichiers

## Algorithme de détection correct

```typescript
// 1. Parser les variables jusqu'au padding de 8 bytes
parseVariables();

// 2. Sauter le padding (8 bytes minimum, peut être plus)
while (this.data.getUint8(this.offset) === 0x00 && this.offset < this.data.byteLength - 32) {
  this.offset++;
}

// 3. Vérifier s'il y a un séparateur 01 00 00 00
if (this.data.getUint32(this.offset, true) === 0x00000001) {
  this.offset += 4;  // Sauter le séparateur
  
  // Sauter le padding après le séparateur
  while (this.data.getUint8(this.offset) === 0x00 && this.offset < this.data.byteLength - 32) {
    this.offset++;
  }
}

// 4. On est maintenant au début des scènes (slot ou directement length)
// this.offset pointe sur le début de la première scène
```

## Offsets corrects finaux

| Fichier | Offset correct | Parser actuel | État actuel |
|---------|----------------|---------------|-------------|
| couleurs1 | **0x1168** | 0x1163 | ❌ -5 bytes |
| danem | **0x116E** | 0x1128 | ❌ lit des variables! |
| barre | **0x144** | 0x14B | ❌ -7 bytes |
| finlan | **0x1152** | 0x1159 | ❌ -7 bytes |
| start | **0x11E6** | 0x1312 | ❌ +300 bytes (lit du code!) |
