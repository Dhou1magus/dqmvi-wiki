#!/usr/bin/env python3
"""MOD本体から、モンスターの追加データを取り出して monster-extras.json を作る。

    python3 scripts/extract-monster-extras.py <DQMVI-x.y.z.jar> [出力先]

系統・活動時間・弱点・ドロップ・呪文・出現場所は assets のTSVに無く、
コンパイル済みクラスの静的初期化子に入っている。lib/classfile.py で直接読む。

読むクラス:
  DqmvMonsterListData    1体ぶん = id / 出現レベル帯 / レア / 系統 / 活動時間 / 弱点 /
                         ドロップ(アイテムキー, 1/N)の並び / 覚える呪文の並び
                         ★ドロップの枠数は可変。5枠(通常・レア・超レア・オブジェ・
                           フィギュア)が421体、3枠だけが176体。全部に飾り枠が
                           付くわけではないので、あるものだけを出す。
  DqmvMonsterSpawnPools  BIOME_* … バイオームごとに湧くモンスター
  DqmvDimensionMonsters  NETHER / END … 別世界に湧くモンスター
  DqmvBiomeConfig        バイオームのキー → 日本語名
  lang/ja_jp.json        アイテム名・呪文名

★出現レベル帯は取れるが載せないと決めている（2026-08-29 よっしー判断）。
"""
import json
import sys
import zipfile
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from classfile import ClassFile, walk_offsets  # noqa: E402

JAR = sys.argv[1] if len(sys.argv) > 1 else None
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else 'scripts/data/monster-extras.json')
if not JAR:
    print('使い方: python3 scripts/extract-monster-extras.py <DQMVI-x.y.z.jar> [出力先]')
    sys.exit(1)

_zip = zipfile.ZipFile(JAR)


def load(name):
    with tempfile.NamedTemporaryFile(suffix='.class', delete=False) as f:
        f.write(_zip.read(f'com/dqm/{name}.class'))
        path = f.name
    cf = ClassFile(path)
    Path(path).unlink()
    return cf


def clinit(cf):
    return walk_offsets(cf, [m for m in cf.methods if m['name'] == '<clinit>'][0]['code'])


lang = json.loads(_zip.read('assets/dqmvi/lang/ja_jp.json').decode('utf-8'))


# バニラ（Minecraft本体）のアイテムは lang/ja_jp.json に無いので、ここで名前を持つ
VANILLA_JA = {
    'minecraft:apple': 'リンゴ',
    'minecraft:arrow': '矢',
    'minecraft:egg': 'タマゴ',
    'minecraft:golden_apple': '金のリンゴ',
    'minecraft:oak_log': 'オークの原木',
    'minecraft:slime_ball': 'スライムボール',
}


def item_name(key):
    if key in VANILLA_JA:
        return VANILLA_JA[key]
    for k in (f'item.dqmvi.{key}', f'block.dqmvi.{key}',
              f'item.dqmvi.legacy_item_{key}', f'block.dqmvi.legacy_block_{key}'):
        if lang.get(k):
            return str(lang[k]).replace('DQM ', '').strip()
    return key


# ── 呪文の名前と種類（導きの書 s_<キー> の行から引く） ──────
# モンスターが持つ呪文キーは50種すべて s_<キー> で導きの書に載っている。
# 杖や書の名前から推測すると「ベホイムのロザリオ」のように外すので、こちらを正とする。
SPELLS = {}
for line in _zip.read('assets/dqmvi/adventure_guide.tsv').decode('utf-8').split('\n'):
    c = line.rstrip('\r').split('\t')
    if len(c) < 5 or not c[0].startswith('s_') or c[2] != '呪文':
        continue
    # 小分類はそのまま使う。「攻撃呪文(炎)」「回復呪文」など導きの書の表記に合わせる
    SPELLS[c[0][2:]] = {'name': c[4], 'kind': c[3]}


def spell_of(key):
    hit = SPELLS.get(key)
    if hit:
        return dict(hit)
    # 導きの書に無い呪文が増えたときの保険。杖・書の名前から拾う
    v = lang.get(f'item.dqmvi.legacy_item_{key}')
    name = str(v).split('//')[0].replace('の杖', '').replace('の書', '').strip() if v else key
    return {'name': name, 'kind': '呪文'}

# ── バイオームのキー → 日本語名 ───────────────────────────
biome_names = {}
buf = []
for _, k, v in clinit(load('DqmvBiomeConfig')):
    if k == 'call' and v == '<init>':
        # 直前の <init> より前の文字列が残ることがあるので、末尾2つを使う
        names = [x for x in buf if isinstance(x, str)]
        if len(names) >= 2:
            biome_names[names[-2]] = names[-1]
        buf = []
    elif k == 'const':
        buf.append(v)

# ── バイオーム・別世界ごとの湧き ─────────────────────────
def id_lists(cf):
    """putstatic ごとに、直前に積まれた文字列を1つのリストにする"""
    out, buf = {}, []
    for _, k, v in clinit(cf):
        if k == 'putstatic':
            out[v] = [x for x in buf if isinstance(x, str)]
            buf = []
        elif k == 'const':
            buf.append(v)
    return out


pools = id_lists(load('data/DqmvMonsterSpawnPools'))
dims = id_lists(load('data/DqmvDimensionMonsters'))

FIELD_TO_BIOME = {
    'BIOME_SLIME_MARSH': 'slime_marsh', 'BIOME_BONE_WASTELAND': 'monster_bone_wasteland',
    'BIOME_MAGIC_FOREST': 'magic_forest', 'BIOME_DRAGON_VOLCANO': 'dragon_volcanic_belt',
    'BIOME_GHOST_MIST': 'ghost_mist_forest', 'BIOME_TAMAGORON_GRASSLAND': 'tamagoron_grassland',
    'BIOME_DEMON_LORD': 'demon_lord_scorched_land', 'BIOME_FAIRY_FLOWER': 'fairy_flower_field',
    'BIOME_SUNKEN_SEA': 'sunken_monster_sea', 'BIOME_MUSHROOM_FOREST': 'obake_mushroom_forest',
    'BIOME_MIMIC_HOLLOW': 'mimic_treasure_hollow', 'BIOME_FROZEN_PLAIN': 'frozen_spike_plain',
    'BIOME_MOAI_RUINS': 'moai_rock_ruins', 'BIOME_CHIMERA_CLIFFS': 'chimera_cliffs',
    'BIOME_POISON_MARSH': 'poison_marsh', 'BIOME_GOLDEN_DESERT': 'golden_desert',
}
biomes = {}
for field, key in FIELD_TO_BIOME.items():
    ids = pools.get(field)
    if ids:
        biomes[key] = {'name': biome_names.get(key, key), 'ids': ids}
for key, name, fields in (('nether', 'ネザー', ('NETHER', 'NETHER_RARE')),
                          ('end', '果ての世界', ('END', 'END_RARE'))):
    ids = [i for f in fields for i in dims.get(f, [])]
    if ids:
        biomes[key] = {'name': name, 'ids': sorted(set(ids), key=ids.index)}
sea = [i for f in ('SEA', 'SEA_VERY_WEAK') for i in pools.get(f, [])]
if sea:
    biomes['sea'] = {'name': '海', 'ids': sorted(set(sea), key=sea.index)}

# ── 1体ぶんのデータ ───────────────────────────────────────
DROP_LABEL = ['通常ドロップ', 'レアドロップ', '超レアドロップ', 'オブジェ', 'フィギュア']
# 系統は半角カナで入っているので全角に直す
SPECIES_JA = {'ｽﾗｲﾑ': 'スライム', 'ｿﾞﾝﾋﾞ': 'ゾンビ', 'ﾄﾞﾗｺﾞﾝ': 'ドラゴン', 'ﾒﾀﾙ': 'メタル'}
records, buf = [], []
for _, k, v in clinit(load('data/DqmvMonsterListData')):
    if k == 'call' and v == 'add':
        records.append(buf)
        buf = []
    elif k == 'putstatic':
        buf = []
    else:
        buf.append((k, v))

monsters = {}
for rec in records:
    if not rec or rec[0][0] != 'const':
        continue
    head = [v for k, v in rec[:8] if k == 'const']
    if len(head) < 6:
        continue
    mid, _band, rare, species, day, weak = head[:6]
    drops, magic, i = [], [], 8
    while i < len(rec):
        if (i + 2 < len(rec) and rec[i][0] == 'const' and isinstance(rec[i][1], str)
                and rec[i + 1][0] == 'const' and isinstance(rec[i + 1][1], int)
                and rec[i + 2] == ('call', '<init>')):
            drops.append({'tier': DROP_LABEL[len(drops)] if len(drops) < 5 else f'枠{len(drops) + 1}',
                          'item': item_name(rec[i][1]), 'oneIn': rec[i + 1][1]})
            i += 3
        else:
            if rec[i][0] == 'const' and isinstance(rec[i][1], str) and rec[i][1]:
                magic.append(rec[i][1])
            i += 1
    places = [b['name'] for b in biomes.values() if mid in b['ids']]
    spells = [spell_of(m) for m in magic]
    monsters[mid] = {
        'species': SPECIES_JA.get(species, species),
        'dayTime': day, 'weakness': weak, 'rare': bool(rare),
        'drops': drops, 'magic': spells, 'places': places,
    }

data = {'jar': Path(JAR).name, 'monsters': monsters, 'biomes': biomes}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')

print(f'モンスター:   {len(monsters)}体')
print(f'バイオーム:   {len(biomes)}カ所')
print(f'ドロップ枠5:  {sum(1 for m in monsters.values() if len(m["drops"]) == 5)}体')
print(f'ドロップ枠3:  {sum(1 for m in monsters.values() if len(m["drops"]) == 3)}体')
print(f'書き出し:     {OUT}')
