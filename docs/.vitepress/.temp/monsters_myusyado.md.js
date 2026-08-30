import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"ミュシャド","description":"DQMVIのモンスター「ミュシャド」のステータス。HP28,877 / こうげき808 / しゅび321 / 経験値38,259 / 7,652G。","frontmatter":{"title":"ミュシャド","description":"DQMVIのモンスター「ミュシャド」のステータス。HP28,877 / こうげき808 / しゅび321 / 経験値38,259 / 7,652G。"},"headers":[],"relativePath":"monsters/myusyado.md","filePath":"monsters/myusyado.md","lastUpdated":1788051867000}');
const _sfc_main = { name: "monsters/myusyado.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="ミュシャド" tabindex="-1">ミュシャド <a class="header-anchor" href="#ミュシャド" aria-label="Permalink to &quot;ミュシャド&quot;">​</a></h1><p>強敵のモンスター。</p><h2 id="ステータス" tabindex="-1">ステータス <a class="header-anchor" href="#ステータス" aria-label="Permalink to &quot;ステータス&quot;">​</a></h2><div class="dq-stats"><div><b>HP</b><span>28,877</span></div><div><b>MP</b><span>883</span></div><div><b>こうげき</b><span>808</span></div><div><b>しゅび</b><span>321</span></div><div><b>まりょく</b><span>354</span></div><div><b>魔法しゅび</b><span>288</span></div><div><b>EXP</b><span>38,259</span></div><div><b>ゴールド</b><span>7,652</span></div></div><h2 id="生態" tabindex="-1">生態 <a class="header-anchor" href="#生態" aria-label="Permalink to &quot;生態&quot;">​</a></h2><table tabindex="0"><thead><tr><th>項目</th><th>内容</th></tr></thead><tbody><tr><td>図鑑No.</td><td>569</td></tr><tr><td>系統</td><td>魔獣</td></tr><tr><td>活動時間</td><td>夜のみ</td></tr><tr><td>弱点</td><td>強（呪文ダメージが半分になる）</td></tr><tr><td>レア個体</td><td>レア枠。ふつうの湧きでは出にくい</td></tr><tr><td>出現場所</td><td>ゴースト霧森</td></tr></tbody></table><h2 id="ドロップ品" tabindex="-1">ドロップ品 <a class="header-anchor" href="#ドロップ品" aria-label="Permalink to &quot;ドロップ品&quot;">​</a></h2><table tabindex="0"><thead><tr><th>区分</th><th>アイテム</th></tr></thead><tbody><tr><td>通常ドロップ</td><td>ミュシャドの毛</td></tr><tr><td>レアドロップ</td><td>ミュシャドのオブジェ</td></tr><tr><td>超レアドロップ</td><td>ミュシャドのフィギュア</td></tr></tbody></table><p>このほかに、飾り用の「オブジェ」と「フィギュア」も落とします。</p><h2 id="使う呪文" tabindex="-1">使う呪文 <a class="header-anchor" href="#使う呪文" aria-label="Permalink to &quot;使う呪文&quot;">​</a></h2><table tabindex="0"><thead><tr><th>種類</th><th>呪文</th></tr></thead><tbody><tr><td>攻撃呪文</td><td>イオグランデ</td></tr><tr><td>攻撃呪文</td><td>ギラグレイド</td></tr><tr><td>補助呪文</td><td>スクルト</td></tr><tr><td>弱体呪文</td><td>ルカニ</td></tr></tbody></table><h2 id="関連ページ" tabindex="-1">関連ページ <a class="header-anchor" href="#関連ページ" aria-label="Permalink to &quot;関連ページ&quot;">​</a></h2><ul><li><a href="/dqmvi-wiki/monsters/">モンスター図鑑</a></li><li><a href="/dqmvi-wiki/bosses/">魔王・ボス一覧</a></li><li><a href="/dqmvi-wiki/biomes/">出現場所から探す</a></li></ul><h2 id="攻略メモ" tabindex="-1">攻略メモ <a class="header-anchor" href="#攻略メモ" aria-label="Permalink to &quot;攻略メモ&quot;">​</a></h2><p>（未記入）</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("monsters/myusyado.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const myusyado = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  myusyado as default
};
