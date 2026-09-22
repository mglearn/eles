#!/usr/bin/env python3
"""Post-translation fixes applied to .drafts/<lang>/*.txt before `i18n.js assemble`.
1. Cross-references: an activity mentioned by its English title inside translated
   text is replaced with that activity's translated title.
2. Hand corrections listed in FIXES (unit, path, lang) -> text.
Idempotent; safe to run repeatedly. Usage: python3 scripts/i18n_fixes.py <lang>
"""
import json, glob, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
lang = sys.argv[1]
D = os.path.join(ROOT, '.drafts', lang)
FIXES = {
    ('deepfake-election-desk', 'adaptations.0.text', 'es'): "Use solo las Pistas 1, 3, 4 y 5, para que los equipos tengan más tiempo por decisión dentro de la misma ronda de 25 minutos.",
    ('next-word-by-hand', 'steps.3.note', 'es'): 'Espere cosas como "el gato durmió en el autobús". La gramática está bien porque los patrones de palabras son reales; el significado falla porque la máquina lleva la cuenta del orden de las palabras, no del mundo real. Opción más rápida: en lugar de sacar papelitos, cierren los ojos y toquen con un lápiz las rayitas de la fila de esa palabra.',
    ('deepfake-election-desk', 'adaptations.0.text', 'vi'): "Chỉ dùng Tin 1, 3, 4 và 5, để các nhóm có thêm thời gian cho mỗi quyết định trong cùng vòng 25 phút.",
}
def read(unit):
    p = os.path.join(D, f'{unit}.{lang}.txt')
    if not os.path.exists(p): return None, None
    lines = open(p, encoding='utf8').read().split('\n')
    return p, lines
en_titles = {os.path.basename(f)[:-5]: json.load(open(f))['title'] for f in glob.glob(os.path.join(ROOT, 'data/activities/*.json'))}
tr_titles = {}
for aid in en_titles:
    p, lines = read(aid)
    if lines:
        for l in lines:
            if l.startswith('title|'): tr_titles[aid] = l[6:].strip()
n = 0
for f in sorted(glob.glob(os.path.join(D, f'*.{lang}.txt'))):
    unit = os.path.basename(f)[:-len(f'.{lang}.txt')]
    lines = open(f, encoding='utf8').read().split('\n'); out = []
    for l in lines:
        if '|' in l:
            k, v = l.split('|', 1)
            if (unit, k, lang) in FIXES and v != FIXES[(unit, k, lang)]: v = FIXES[(unit, k, lang)]; n += 1
            if k != 'title' and not k.startswith('connections'):
                for aid, t in en_titles.items():
                    if len(t) > 6 and t in v and tr_titles.get(aid) and tr_titles[aid] != t:
                        v = v.replace(t, tr_titles[aid]); n += 1
            l = f'{k}|{v}'
        out.append(l)
    open(f, 'w', encoding='utf8').write('\n'.join(out))
print(f'{lang}: {n} fix(es) applied')
