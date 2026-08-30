"""Javaのクラスファイルを読む最小限の道具。

MOD本体(DQMVI-x.y.z.jar)の中の装備の数値は、assets側のTSVではなく
コンパイル済みのクラスに埋まっている。逆コンパイラを入れられない環境でも
読めるように、定数プールとバイトコードだけを自前で解く。

定数プールと、各メソッドのバイトコードを読み、
「積まれた定数の並び」として取り出す。データ表を持つクラスは
    ldc "名前" / bipush 9 / ldc 2.55f / invokestatic put(...)
のような繰り返しになっているので、これで中身を復元できる。
"""
import struct

# 定数プールの種別
UTF8, INT, FLOAT, LONG, DOUBLE, CLASS, STRING = 1, 3, 4, 5, 6, 7, 8
FIELDREF, METHODREF, IFACEREF, NAMETYPE = 9, 10, 11, 12
HANDLE, TYPE, DYNAMIC, INVOKEDYN, MODULE, PACKAGE = 15, 16, 17, 18, 19, 20


class ClassFile:
    def __init__(self, path):
        self.d = open(path, 'rb').read()
        if self.d[:4] != b'\xca\xfe\xba\xbe':
            raise ValueError('クラスファイルではありません')
        self.pool = {}
        i = self._read_pool()
        i += 6  # access_flags, this_class, super_class
        ifn = struct.unpack('>H', self.d[i:i + 2])[0]; i += 2 + ifn * 2
        i = self._skip_members(i)          # フィールド
        self.methods, i = self._read_methods(i)

    # ── 定数プール ──
    def _read_pool(self):
        d = self.d
        n = struct.unpack('>H', d[8:10])[0]
        i, k = 10, 1
        while k < n:
            t = d[i]
            if t == UTF8:
                ln = struct.unpack('>H', d[i + 1:i + 3])[0]
                self.pool[k] = ('utf8', d[i + 3:i + 3 + ln].decode('utf-8', 'replace'))
                i += 3 + ln
            elif t == INT:
                self.pool[k] = ('int', struct.unpack('>i', d[i + 1:i + 5])[0]); i += 5
            elif t == FLOAT:
                self.pool[k] = ('float', struct.unpack('>f', d[i + 1:i + 5])[0]); i += 5
            elif t == LONG:
                self.pool[k] = ('long', struct.unpack('>q', d[i + 1:i + 9])[0]); i += 9; k += 1
            elif t == DOUBLE:
                self.pool[k] = ('double', struct.unpack('>d', d[i + 1:i + 9])[0]); i += 9; k += 1
            elif t in (CLASS, STRING, TYPE, MODULE, PACKAGE):
                self.pool[k] = ('ref', struct.unpack('>H', d[i + 1:i + 3])[0]); i += 3
            elif t in (FIELDREF, METHODREF, IFACEREF, NAMETYPE, DYNAMIC, INVOKEDYN):
                self.pool[k] = ('pair', struct.unpack('>HH', d[i + 1:i + 5])); i += 5
            elif t == HANDLE:
                self.pool[k] = ('handle', None); i += 4
            else:
                raise ValueError(f'知らない定数種別 {t}')
            k += 1
        return i

    def utf8(self, k):
        v = self.pool.get(k)
        return v[1] if v and v[0] == 'utf8' else None

    def const(self, k):
        """ldc が指す値を、そのまま使える形にして返す"""
        t, v = self.pool.get(k, (None, None))
        if t == 'ref':                      # String / Class
            return self.utf8(v)
        if t in ('int', 'float', 'long', 'double'):
            return v
        if t == 'pair':                     # メソッド参照 → 名前だけ返す
            nt = self.pool.get(v[1])
            return self.utf8(nt[1][0]) if nt and nt[0] == 'pair' else None
        return None

    # ── フィールドとメソッド ──
    def _skip_members(self, i):
        n = struct.unpack('>H', self.d[i:i + 2])[0]; i += 2
        for _ in range(n):
            i += 6
            i = self._skip_attrs(i)
        return i

    def _skip_attrs(self, i):
        n = struct.unpack('>H', self.d[i:i + 2])[0]; i += 2
        for _ in range(n):
            ln = struct.unpack('>I', self.d[i + 2:i + 6])[0]
            i += 6 + ln
        return i

    def _read_methods(self, i):
        d = self.d
        n = struct.unpack('>H', d[i:i + 2])[0]; i += 2
        out = []
        for _ in range(n):
            name = self.utf8(struct.unpack('>H', d[i + 2:i + 4])[0])
            desc = self.utf8(struct.unpack('>H', d[i + 4:i + 6])[0])
            i += 6
            an = struct.unpack('>H', d[i:i + 2])[0]; i += 2
            code = None
            for _ in range(an):
                aname = self.utf8(struct.unpack('>H', d[i:i + 2])[0])
                ln = struct.unpack('>I', d[i + 2:i + 6])[0]
                body = d[i + 6:i + 6 + ln]
                if aname == 'Code':
                    clen = struct.unpack('>I', body[4:8])[0]
                    code = body[8:8 + clen]
                i += 6 + ln
            out.append({'name': name, 'desc': desc, 'code': code})
        return out, i


# ── バイトコードの走査 ──
# 引数の長さ（バイト数）。ここに無い命令は0バイト。
ARG = {}
for op in range(0x00, 0x0f + 1): ARG[op] = 0
for op, n in {
    0x10: 1, 0x11: 2, 0x12: 1, 0x13: 2, 0x14: 2,            # bipush sipush ldc ldc_w ldc2_w
    0x15: 1, 0x16: 1, 0x17: 1, 0x18: 1, 0x19: 1,            # iload..aload
    0x36: 1, 0x37: 1, 0x38: 1, 0x39: 1, 0x3a: 1,            # istore..astore
    0x84: 2,                                                 # iinc
    0xa9: 1,                                                 # ret
    0xbc: 1,                                                 # newarray
    0xb2: 2, 0xb3: 2, 0xb4: 2, 0xb5: 2,                      # get/put static/field
    0xb6: 2, 0xb7: 2, 0xb8: 2, 0xbb: 2, 0xbd: 2, 0xc0: 2, 0xc1: 2,
    0xb9: 4, 0xba: 4,                                        # invokeinterface / invokedynamic
    0xc5: 3,                                                 # multianewarray
    0xc8: 4, 0xc9: 4,                                        # goto_w jsr_w
}.items(): ARG[op] = n
for op in range(0x99, 0xa8 + 1): ARG[op] = 2                 # 分岐
ARG[0xc6] = ARG[0xc7] = 2

PUSH_INT = {0x02: -1, 0x03: 0, 0x04: 1, 0x05: 2, 0x06: 3, 0x07: 4, 0x08: 5}
PUSH_FLOAT = {0x0b: 0.0, 0x0c: 1.0, 0x0d: 2.0}


def walk(cf, code):
    """命令を順に (種類, 値) で返す。定数と呼び出しだけを拾う"""
    out, i, n = [], 0, len(code)
    while i < n:
        op = code[i]
        if op == 0xaa:                                   # tableswitch
            i += 1
            while i % 4: i += 1
            lo, hi = struct.unpack('>ii', code[i + 4:i + 12])
            i += 12 + (hi - lo + 1) * 4
            continue
        if op == 0xab:                                   # lookupshwitch
            i += 1
            while i % 4: i += 1
            npairs = struct.unpack('>i', code[i + 4:i + 8])[0]
            i += 8 + npairs * 8
            continue
        if op == 0xc4:                                   # wide
            i += 4 if code[i + 1] != 0x84 else 6
            continue
        ln = ARG.get(op, 0)
        arg = code[i + 1:i + 1 + ln]
        if op == 0x12:                                   # ldc
            out.append(('const', cf.const(arg[0])))
        elif op in (0x13, 0x14):                         # ldc_w / ldc2_w
            out.append(('const', cf.const(struct.unpack('>H', arg)[0])))
        elif op == 0x10:                                 # bipush
            out.append(('const', struct.unpack('>b', arg)[0]))
        elif op == 0x11:                                 # sipush
            out.append(('const', struct.unpack('>h', arg)[0]))
        elif op in PUSH_INT:
            out.append(('const', PUSH_INT[op]))
        elif op in PUSH_FLOAT:
            out.append(('const', PUSH_FLOAT[op]))
        elif op in (0xb6, 0xb7, 0xb8, 0xb9):             # invoke*
            out.append(('call', cf.const(struct.unpack('>H', arg[:2])[0])))
        elif op in (0xb2, 0xb3, 0xb4, 0xb5):             # フィールド参照
            out.append(('field', cf.const(struct.unpack('>H', arg)[0])))
        i += 1 + ln
    return out


def walk_offsets(cf, code):
    """(位置, 種類, 値) の形で命令を返す。switch の飛び先表も拾う。

    javac は文字列の switch を「hashCodeで番号を決める → その番号で分岐」の
    2段階に展開する。2段目は tableswitch で、番号ごとの飛び先が並ぶ。
    飛び先が同じ番号どうしが同じ組になるので、この表がないと対応が取れない。
    """
    out, i, n = [], 0, len(code)
    while i < n:
        op, at = code[i], i
        if op in (0xaa, 0xab):
            j = i + 1
            while j % 4: j += 1
            if op == 0xaa:
                default, lo, hi = struct.unpack('>iii', code[j:j + 12])
                j += 12
                targets = [struct.unpack('>i', code[j + k * 4:j + k * 4 + 4])[0] for k in range(hi - lo + 1)]
                out.append((at, 'tableswitch', {'low': lo, 'targets': [at + t for t in targets],
                                                'default': at + default}))
                i = j + (hi - lo + 1) * 4
            else:
                default, npairs = struct.unpack('>ii', code[j:j + 8])
                j += 8
                pairs = [struct.unpack('>ii', code[j + k * 8:j + k * 8 + 8]) for k in range(npairs)]
                out.append((at, 'lookupswitch', {'pairs': [(m, at + t) for m, t in pairs],
                                                 'default': at + default}))
                i = j + npairs * 8
            continue
        if op == 0xc4:
            i += 4 if code[i + 1] != 0x84 else 6
            continue
        ln = ARG.get(op, 0)
        arg = code[i + 1:i + 1 + ln]
        if op == 0x12:
            out.append((at, 'const', cf.const(arg[0])))
        elif op in (0x13, 0x14):
            out.append((at, 'const', cf.const(struct.unpack('>H', arg)[0])))
        elif op == 0x10:
            out.append((at, 'const', struct.unpack('>b', arg)[0]))
        elif op == 0x11:
            out.append((at, 'const', struct.unpack('>h', arg)[0]))
        elif op in PUSH_INT:
            out.append((at, 'const', PUSH_INT[op]))
        elif op in PUSH_FLOAT:
            out.append((at, 'const', PUSH_FLOAT[op]))
        elif op in (0xb6, 0xb7, 0xb8, 0xb9):
            out.append((at, 'call', cf.const(struct.unpack('>H', arg[:2])[0])))
        elif op == 0xb3:                       # putstatic（表の書き込み＝区切り）
            out.append((at, 'putstatic', cf.const(struct.unpack('>H', arg)[0])))
        elif op in (0xb2, 0xb4, 0xb5):         # getstatic / get・putfield（値の読み）
            out.append((at, 'field', cf.const(struct.unpack('>H', arg)[0])))
        i += 1 + ln
    return out
