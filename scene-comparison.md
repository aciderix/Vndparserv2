# Comparaison des scènes détectées

## Anciennes vs Nouvelles détections

| # Ancienne | Offset Ancien | # Nouvelle | Offset Nouveau | Delta | Statut |
|------------|---------------|------------|----------------|-------|--------|
| 1 | 0x1163 | 1 | 0x1167 | +4 | ✅ Mon fix (face.bmp) |
| 2 | 0x1A4D | 2 | 0x1A4D | 0 | ✅ Identique |
| 3 | 0x1E3D | 3 | 0x1E36 | -7 | ⚠️ Légèrement avant |
| - | - | 4 | 0x1E45 | - | ❌ FAUX POSITIF |
| 4 | 0x2441 | 5 | 0x242A | -23 | ⚠️ Avant |
| - | - | 6 | 0x2441 | - | ✅ Correspond à ancienne #4 |
| 5 | 0x3B1A | 7 | 0x3B03 | -23 | ⚠️ Avant |
| - | - | 8 | 0x3B1A | - | ✅ Correspond à ancienne #5 |
| 6 | 0x471B | 9 | 0x4704 | -23 | ⚠️ Avant |
| - | - | 10 | 0x471B | - | ✅ Correspond à ancienne #6 |

## Pattern observé

Pour chaque vraie scène (ancienne version), la nouvelle version détecte:
1. **Un faux positif** ~20 bytes AVANT
2. **La vraie scène** au même offset (ou proche)

## Hypothèse

La fonction `getValidFileCountInScene()` détecte maintenant des structures qui ressemblent à des scènes mais qui n'en sont pas. Probablement:
- Des bytes 0x00 dans le padding/data des scènes précédentes
- Des structures de records qui ressemblent à des fichiers

## Conséquences

- ✅ **POSITIF**: Scène 1 (face.bmp) maintenant détectée!
- ❌ **NÉGATIF**: Détection de ~20 faux positifs
- ⚠️ **TOTAL**: 41 scènes détectées mais seulement ~20 sont vraies

## Conclusion

Le changement "Scene Slot/ID" a cassé la validation dans `getValidFileCountInScene()`.
L'ancienne logique était meilleure pour filtrer les faux positifs.
