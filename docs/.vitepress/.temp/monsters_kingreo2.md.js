import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"キングレオⅡ","description":"DQMVIのモンスター「キングレオⅡ」のステータス。HP1,440 / こうげき228.42 / しゅび163 / 経験値482 / 96G。","frontmatter":{"title":"キングレオⅡ","description":"DQMVIのモンスター「キングレオⅡ」のステータス。HP1,440 / こうげき228.42 / しゅび163 / 経験値482 / 96G。"},"headers":[],"relativePath":"monsters/kingreo2.md","filePath":"monsters/kingreo2.md","lastUpdated":null}');
const _sfc_main = { name: "monsters/kingreo2.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="キングレオii" tabindex="-1">キングレオⅡ <a class="header-anchor" href="#キングレオii" aria-label="Permalink to &quot;キングレオⅡ&quot;">​</a></h1><p>終盤のモンスター。</p><h2 id="ステータス" tabindex="-1">ステータス <a class="header-anchor" href="#ステータス" aria-label="Permalink to &quot;ステータス&quot;">​</a></h2><div class="dq-stats"><div><b>HP</b><span>1,440</span></div><div><b>MP</b><span>78</span></div><div><b>こうげき</b><span>228</span></div><div><b>しゅび</b><span>163</span></div><div><b>まりょく</b><span>155</span></div><div><b>魔法しゅび</b><span>80</span></div><div><b>EXP</b><span>482</span></div><div><b>ゴールド</b><span>96</span></div></div><h2 id="生態" tabindex="-1">生態 <a class="header-anchor" href="#生態" aria-label="Permalink to &quot;生態&quot;">​</a></h2><table tabindex="0"><thead><tr><th>項目</th><th>内容</th></tr></thead><tbody><tr><td>図鑑No.</td><td>471</td></tr><tr><td>系統</td><td>魔獣</td></tr><tr><td>活動時間</td><td>夜のみ</td></tr><tr><td>弱点</td><td>強（呪文ダメージが半分になる）</td></tr><tr><td>出現場所</td><td>果ての世界</td></tr></tbody></table><h2 id="ドロップ品" tabindex="-1">ドロップ品 <a class="header-anchor" href="#ドロップ品" aria-label="Permalink to &quot;ドロップ品&quot;">​</a></h2><table tabindex="0"><thead><tr><th>区分</th><th>アイテム</th></tr></thead><tbody><tr><td>通常ドロップ</td><td>竜の火酒</td></tr><tr><td>レアドロップ</td><td>ミスリル合金</td></tr><tr><td>超レアドロップ</td><td>けんじゃの石</td></tr></tbody></table><p>このほかに、飾り用の「オブジェ」と「フィギュア」も落とします。</p><h2 id="関連ページ" tabindex="-1">関連ページ <a class="header-anchor" href="#関連ページ" aria-label="Permalink to &quot;関連ページ&quot;">​</a></h2><ul><li><a href="/dqmvi-wiki/monsters/">モンスター図鑑</a></li><li><a href="/dqmvi-wiki/bosses/">魔王・ボス一覧</a></li><li><a href="/dqmvi-wiki/biomes/">出現場所から探す</a></li></ul><h2 id="攻略メモ" tabindex="-1">攻略メモ <a class="header-anchor" href="#攻略メモ" aria-label="Permalink to &quot;攻略メモ&quot;">​</a></h2><p>（未記入）</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("monsters/kingreo2.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const kingreo2 = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  kingreo2 as default
};
