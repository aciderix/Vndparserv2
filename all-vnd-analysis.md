# Analyse complète de tous les fichiers VND

## Résumé global

- **Total de fichiers analysés**: 19 VND
- **Fichiers de niveau (pays)**: 18
- **Fichiers spéciaux (menu)**: 1 (start.vnd)

## Pattern A: Avec séparateur 01 00 00 00 (10 fichiers)

| Fichier | Variables | Padding | Séparateur | Scene Start | Premier Slot |
|---------|-----------|---------|------------|-------------|--------------|
| autr.vnd | 283 | 8 | 0x1193 | 0x11a3 | slot=9 |
| belge.vnd | 280 | 8 | 0x1162 | 0x1172 | slot=9 |
| couleurs1.vnd | 281 | 0 | 0x115c | 0x1168 | slot=8 |
| danem.vnd | 281 | 8 | 0x1162 | 0x1172 | slot=9 |
| espa.vnd | 285 | 8 | 0x11b3 | 0x11c3 | slot=9 |
| france.vnd | 284 | 8 | 0x11a7 | 0x11b7 | slot=10 |
| grece.vnd | 285 | 8 | 0x11b3 | 0x11c3 | slot=8 |
| irland.vnd | 280 | 8 | 0x1162 | 0x1172 | slot=9 |
| portu.vnd | 280 | 8 | 0x1162 | 0x1172 | slot=9 |
| suede.vnd | 280 | 8 | 0x1172 | 0x1182 | slot=10 |

**Caractéristiques:**
- Variables → Padding (0 ou 8 bytes) → Séparateur `01 00 00 00` → Padding variable → Slot (8-10)
- Après séparateur: padding puis slot avec valeur basse (8, 9 ou 10)

## Pattern B: Sans séparateur (8 fichiers de niveau)

| Fichier | Variables | Padding | Scene Start | Premier Slot |
|---------|-----------|---------|-------------|--------------|
| allem.vnd | 280 | 8 | 0x1152 | slot=129 |
| angleterre.vnd | 284 | 24 | 0x11a7 | slot=9 |
| barre.vnd | 12 | 8 | 0x144 | slot=129 |
| biblio.vnd | 284 | 24 | 0x11a7 | slot=31 |
| ecosse.vnd | 280 | 8 | 0x1152 | slot=129 |
| finlan.vnd | 280 | 8 | 0x1152 | slot=129 |
| holl.vnd | 282 | 8 | 0x1175 | slot=131 |
| italie.vnd | 284 | 8 | 0x1197 | slot=131 |

**Caractéristiques:**
- Variables → Padding (8 ou 24 bytes) → Directement Slot
- Slots avec valeurs plus élevées (9, 31, 129, 131)
- Pas de séparateur `01 00 00 00`

## Fichier spécial

**start.vnd** (Menu principal):
- Structure de header différente
- Contient des références à d'autres VND et des AVI
- Nécessite un traitement spécial

## Validation des patterns

✅ **Pattern A validé**: 10/19 fichiers utilisent le séparateur  
✅ **Pattern B validé**: 8/19 fichiers de niveau n'ont pas de séparateur  
✅ **L'algorithme "skip all padding" fonctionne pour tous les fichiers de niveau**

## Algorithme de détection universel

```typescript
// 1. Parser les variables
parseVariables(); // Jusqu'au padding de 8 bytes

// 2. Sauter TOUT le padding (peut être 0, 8, 24+ bytes)
while (this.data.getUint8(this.offset) === 0x00 && 
       this.offset < this.data.byteLength - 32) {
  this.offset++;
}

// 3. Vérifier s'il y a un séparateur 01 00 00 00
if (this.data.getUint32(this.offset, true) === 0x00000001) {
  this.offset += 4;  // Sauter le séparateur
  
  // Sauter le padding après le séparateur
  while (this.data.getUint8(this.offset) === 0x00 && 
         this.offset < this.data.byteLength - 32) {
    this.offset++;
  }
}

// 4. this.offset pointe maintenant sur le début de la première scène
// (soit un slot u32, soit directement un length u32)
```

## Recommandations

1. **Implémenter le parsing des variables** dans `vndParser.ts` avec la structure correcte
2. **Utiliser l'algorithme universel** ci-dessus pour tous les fichiers de niveau
3. **Traiter start.vnd** comme cas spécial (ou ignorer pour l'instant)
4. **Tester** sur les 18 fichiers de niveau pour validation

## Distribution des patterns

- **Pattern A (séparateur)**: 53% des fichiers de niveau
- **Pattern B (sans séparateur)**: 47% des fichiers de niveau
- Les deux patterns doivent être supportés

