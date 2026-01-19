# Vérification des offsets de début de scènes

## couleurs1.vnd
```
0x115C: 01 00 00 00              ← Séparateur
0x1160: 00 00 00 00 00 00 00 00  ← 8 bytes padding
0x1168: 08 00 00 00              ← slot=8 (VRAI DÉBUT)
0x116C: 09 00 00 00              ← length=9
0x1170: "music.wav"
```
- Parser actuel: **0x1163** (dans le padding ❌)
- Mon script test: **0x1160** (avant le padding ❌)
- Devrait être: **0x1168** ✓

## danem.vnd
```
0x1128: Variables RIXOK, PUNK, LAPIN, JEUGAGNE...
...
0x1162: 01 00 00 00              ← Séparateur
0x1166: 00 00 00 00 00 00 00 00  ← 8 bytes padding
0x116E: 00 00                    ← slot=0 (VRAI DÉBUT)
0x1170: 09 00 00 00              ← length=9
0x1174: "a_dan.wav"
```
- Parser actuel: **0x1128** (lit les variables comme des scènes! ❌)
- Mon script test: **0x1166** (avant le padding ❌)
- Devrait être: **0x116E** ✓

## finlan.vnd - CAS SPÉCIAL
```
0x1140: 00 00 00 00 00 00 00 00  ← 8 bytes padding (fin variables)
0x1148: 00 00 00 00 00 00 00 00  ← 8 bytes padding supplémentaires
0x1150: 00 00
0x1152: 81 00 00 00              ← slot=129 ? (VRAI DÉBUT ?)
0x1156: 00 00 00 00 00 00 00 00  ← padding
0x115E: 00 00 00 00
0x1162: 08 00 00 00              ← length=8
0x1166: "vent.wav"
```
**PROBLÈME: Pas de séparateur 01 00 00 00 détecté!**
- Parser actuel: **0x1159** (dans le padding)
- Mon script test: **0x11D2** (trouve un faux séparateur dans le code script ❌)
- Devrait être: **0x1152 ou 0x1162** ❓

## Questions pour validation:

1. **Pour couleurs1 et danem**: Après le séparateur 01 00 00 00, il y a TOUJOURS 8 bytes de padding avant le premier slot?

2. **Pour finlan**: Pas de séparateur 01 00 00 00. Est-ce normal? Certains VND n'ont pas ce séparateur?

3. **Le slot avant les fichiers**: Est-ce obligatoire ou optionnel? finlan semble avoir slot=129 à 0x1152, couleurs1 a slot=8, danem a slot=0.

## Correction proposée:

```typescript
// Après avoir trouvé le séparateur 01 00 00 00:
this.offset = separatorPosition + 4;  // Saute le séparateur

// Vérifie et saute le padding de 8 bytes
let isPadding = true;
for (let i = 0; i < 8; i++) {
  if (this.data.getUint8(this.offset + i) !== 0x00) {
    isPadding = false;
    break;
  }
}
if (isPadding) {
  this.offset += 8;  // Saute les 8 bytes de padding
}

// this.offset pointe maintenant sur le premier slot
```

Est-ce que cette compréhension est correcte?
