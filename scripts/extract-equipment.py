#!/usr/bin/env python3
"""MOD本体から装備の数値を取り出して scripts/data/equipment.json に書く。

    python3 scripts/extract-equipment.py <DQMVI-x.y.z.jar> [出力先]

装備の数値は assets 側のTSVには入っておらず、コンパイル済みのクラスの
静的初期化子（<clinit>）に埋まっている。逆コンパイラが使えないので、
lib/classfile.py でバイトコードを直接読み、積まれた定数の並びから復元する。

読むクラス:
  DqmvLegacyCombat   ATTACK / DEFENSE / MULTIPLIER / MAGIC_MULTIPLIER の4つの表
  DqmvLegacyItem     weaponKind()  … 武器id → 武器種（剣・槍…）
  DqmvEquipStats     防具・盾・アクセサリーの数値
  DqmvEquipSpecial   特殊効果（ドラゴン系に2倍 など）

★ここで取れる値は全部ゲーム内のツールチップに出るもの。
  画面に出ない内部の値は載せない、という方針に沿っている。
"""
import json
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from classfile import ClassFile, walk_offsets  # noqa: E402

JAR = sys.argv[1] if len(sys.argv) > 1 else None
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else 'scripts/data/equipment.json')
if not JAR:
    print('使い方: python3 scripts/extract-equipment.py <DQMVI-x.y.z.jar> [出力先]')
    sys.exit(1)

WEAPON_JA = {
    'VANILLA_SWORD': 'バニラ剣', 'SWORD': '剣', 'HERO_SWORD': '勇者の剣',
    'SPEAR': '槍', 'DAGGER': '短剣', 'STAFF': '杖', 'KON': '棍', 'CLAW': '爪',
    'FIST': '拳', 'HAMMER': 'ハンマー', 'AXE': '斧', 'WHIP': 'ムチ',
    'BOW': '弓', 'BOOMERANG': 'ブーメラン', 'NONE': '—',
}
SLOT_JA = {'HEAD': '頭', 'CHEST': '胴', 'LEGS': '脚', 'FEET': '足'}

_zip = zipfile.ZipFile(JAR)
_cache = {}


def load(name):
    """jarの中のクラスを読む（一時ファイルに出さずメモリで扱う）"""
    if name not in _cache:
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.class', delete=False) as f:
            f.write(_zip.read(f'com/dqm/{name}.class'))
            path = f.name
        _cache[name] = ClassFile(path)
        Path(path).unlink()
    return _cache[name]


def clinit(cf):
    m = [x for x in cf.methods if x['name'] == '<clinit>'][0]
    return walk_offsets(cf, m['code'])


def split_by_putstatic(ops):
    """静的フィールドへの代入で区切り、{フィールド名: その手前までの命令} を返す。

    ひとつの <clinit> で複数の表を作っている場合、表の切れ目は
    「作り終えた Map を静的フィールドに入れる」ところに現れる。
    """
    out, buf = {}, []
    for at, kind, val in ops:
        if kind == 'putstatic' and isinstance(val, str):
            out[val] = buf
            buf = []
        else:
            buf.append((kind, val))
    return out


def entries(ops, call='entry'):
    """表を1行ぶん組み立てる呼び出しごとに、積まれた定数と参照を取り出す"""
    rows, buf = [], []
    for op in ops:
        kind, val = op[-2], op[-1]   # (位置, 種類, 値) と (種類, 値) の両方を受ける
        if kind == 'call' and val == call:
            consts = [v for k, v in buf if k == 'const']
            fields = [v for k, v in buf if k == 'field']
            # 先頭は配列の添字なので落とす
            if consts and isinstance(consts[0], int) and len(consts) > 1:
                consts = consts[1:]
            if consts:
                rows.append({'consts': consts, 'fields': fields})
            buf = []
        else:
            buf.append((kind, val))
    return rows


# ── 武器の攻撃力・倍率 ────────────────────────────────────
combat = split_by_putstatic(clinit(load('DqmvLegacyCombat')))
tables = {}
for field in ('ATTACK', 'DEFENSE', 'MULTIPLIER', 'MAGIC_MULTIPLIER'):
    tables[field] = {r['consts'][0]: r['consts'][1]
                     for r in entries(combat.get(field, []))
                     if len(r['consts']) >= 2 and isinstance(r['consts'][0], str)}

# ── 武器種 ────────────────────────────────────────────────
item_cf = load('DqmvLegacyItem')


def weapon_kinds():
    """weaponKind(String) を読む。

    javac は文字列の switch を「hashCodeで番号を決める→その番号で分岐」に
    展開する。2段目の tableswitch の飛び先が同じ番号どうしが同じ武器種になる。
    """
    ops = walk_offsets(item_cf, [m for m in item_cf.methods if m['name'] == 'weaponKind'][0]['code'])
    pairs = []
    for i in range(len(ops) - 2):
        if (ops[i][1] == 'const' and isinstance(ops[i][2], str)
                and ops[i + 1][1:] == ('call', 'equals') and ops[i + 2][1] == 'const'):
            pairs.append((ops[i][2], ops[i + 2][2]))
    switches = [v for _, k, v in ops if k == 'tableswitch']
    if not switches:
        return {}
    sw = max(switches, key=lambda t: len(t['targets']))
    idx_to_off = {sw['low'] + n: off for n, off in enumerate(sw['targets'])}
    off_to_kind = {}
    for at, k, v in ops:
        if k == 'field' and isinstance(v, str) and v in WEAPON_JA:
            off_to_kind.setdefault(at, v)
    def kind_at(off):
        later = [a for a in off_to_kind if a >= off]
        return off_to_kind[min(later)] if later else None
    return {pid: kind_at(idx_to_off[i]) for pid, i in pairs if i in idx_to_off}


def id_rules(method):
    """isBowId / isBoomerangId の判定規則をそのまま写す。

    MODは「末尾が yumi」「bougan を含む」「この5つのどれか」のように
    規則で判定している。列挙ではないので、規則ごと持ってくる。
    """
    m = [x for x in item_cf.methods if x['name'] == method]
    if not m or not m[0]['code']:
        return []
    ops = walk_offsets(item_cf, m[0]['code'])
    rules = []
    for i in range(len(ops) - 1):
        _, k, v = ops[i]
        _, k2, v2 = ops[i + 1]
        if (k == 'const' and isinstance(v, str) and v and k2 == 'call'
                and v2 in ('endsWith', 'contains', 'equals')):
            rules.append((v2, v))
    return rules


def matches(rules, pid):
    for how, text in rules:
        if how == 'endsWith' and pid.endswith(text):
            return True
        if how == 'contains' and text in pid:
            return True
        if how == 'equals' and pid == text:
            return True
    return False


kinds = weapon_kinds()
bow_rules = id_rules('isBowId')
boom_rules = id_rules('isBoomerangId')
# 弓とブーメランは switch ではなく規則で判定されるので、
# 攻撃力の表に載っている武器すべてに規則を当てて振り分ける
for pid in list(tables['ATTACK']) + list(tables['MULTIPLIER']) + list(kinds):
    if kinds.get(pid) in (None, 'NONE'):
        if matches(bow_rules, pid):
            kinds[pid] = 'BOW'
        elif matches(boom_rules, pid):
            kinds[pid] = 'BOOMERANG'

# ── 特殊効果 ──────────────────────────────────────────────
# 1行は e(番号, id, 効果の種類, 引数, 値1, 値2, 説明文) の形
special = {}
for r in entries(clinit(load('DqmvEquipSpecial')), call='e'):
    cs = r['consts']
    ids = [c for c in cs if isinstance(c, str) and c and c.isascii()]
    # 引数にも半角カナ（ﾄﾞﾗｺﾞﾝ など）が入るので、説明文は最後の日本語を取る
    jp = [c for c in cs if isinstance(c, str) and not c.isascii()]
    text = jp[-1] if jp else ''
    if ids and text:
        special[ids[0]] = text

# ── 防具・盾・アクセサリー ────────────────────────────────
equip = split_by_putstatic(clinit(load('DqmvEquipStats')))
armor, shield, accessory = {}, {}, {}

# ArmorSpec(しゅび, 魔法しゅび, 部位[, こうげき, HP, MP])
for r in entries(equip.get('ARMOR', [])):
    cs, fs = r['consts'], r['fields']
    if not cs or not isinstance(cs[0], str):
        continue
    nums = [c for c in cs[1:] if isinstance(c, (int, float))]
    slot = next((f for f in fs if f in SLOT_JA), None)
    if len(nums) < 2:
        continue
    rec = {'部位': SLOT_JA.get(slot, '—'), 'しゅび': nums[0], '魔法しゅび': nums[1]}
    for name, val in zip(('こうげき', 'HP', 'MP'), nums[2:5]):
        if val and val != 1.0:
            rec[name] = val
    armor[cs[0]] = rec

# ShieldSpec(しゅび, 魔法しゅび, 構え中, 適正職業の集合, 特殊)
for r in entries(equip.get('SHIELD', [])):
    cs = r['consts']
    if not cs or not isinstance(cs[0], str):
        continue
    nums = [c for c in cs[1:] if isinstance(c, (int, float))]
    if len(nums) < 3:
        continue
    jobs = sorted({int(n) for n in nums[3:] if float(n).is_integer() and 0 <= n <= 17})
    shield[cs[0]] = {'しゅび': nums[0], '魔法しゅび': nums[1], '構え中': nums[2], '職業': jobs}

# AccessorySpec(HP, MP, こうげき, しゅび, 魔法しゅび, まりょく)
for r in entries(equip.get('ACCESSORY', [])):
    cs = r['consts']
    if not cs or not isinstance(cs[0], str):
        continue
    nums = [c for c in cs[1:] if isinstance(c, (int, float))]
    if len(nums) < 6:
        continue
    keys = ('HP', 'MP', 'こうげき', 'しゅび', '魔法しゅび', 'まりょく')
    accessory[cs[0]] = {k: v for k, v in zip(keys, nums[:6]) if v and v != 1.0}

data = {
    'jar': Path(JAR).name,
    'weaponKindNames': WEAPON_JA,
    'weapons': {pid: {
        'こうげき': tables['ATTACK'].get(pid),
        '攻撃倍率': tables['MULTIPLIER'].get(pid),
        '武器種': WEAPON_JA.get(kinds.get(pid)),
        '特殊効果': special.get(pid),
    } for pid in sorted(set(tables['ATTACK']) | set(kinds))},
    'armor': {k: dict(v, 特殊効果=special[k]) if k in special else v for k, v in armor.items()},
    'shields': {k: dict(v, 特殊効果=special[k]) if k in special else v for k, v in shield.items()},
    'accessories': {k: dict(v, 特殊効果=special[k]) if k in special else v for k, v in accessory.items()},
    'special': special,
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')

print(f'武器:         {len(data["weapons"])}')
print(f'防具:         {len(data["armor"])}')
print(f'盾:           {len(data["shields"])}')
print(f'アクセサリー: {len(data["accessories"])}')
print(f'特殊効果:     {len(data["special"])}')
print(f'書き出し:     {OUT}')
