import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"デビルロード","description":"DQMVIのモンスター「デビルロード」のステータス。HP1,725 / こうげき347.2 / しゅび215 / 経験値661 / 132G。","frontmatter":{"title":"デビルロード","description":"DQMVIのモンスター「デビルロード」のステータス。HP1,725 / こうげき347.2 / しゅび215 / 経験値661 / 132G。"},"headers":[],"relativePath":"monsters/debirurodo.md","filePath":"monsters/debirurodo.md","lastUpdated":1788051867000}');
const _sfc_main = { name: "monsters/debirurodo.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="デビルロード" tabindex="-1">デビルロード <a class="header-anchor" href="#デビルロード" aria-label="Permalink to &quot;デビルロード&quot;">​</a></h1><p>終盤のモンスター。</p><h2 id="ステータス" tabindex="-1">ステータス <a class="header-anchor" href="#ステータス" aria-label="Permalink to &quot;ステータス&quot;">​</a></h2><div class="dq-stats"><div><b>HP</b><span>1,725</span></div><div><b>MP</b><span>88</span></div><div><b>こうげき</b><span>347</span></div><div><b>しゅび</b><span>215</span></div><div><b>まりょく</b><span>285</span></div><div><b>魔法しゅび</b><span>147</span></div><div><b>EXP</b><span>661</span></div><div><b>ゴールド</b><span>132</span></div></div><h2 id="生態" tabindex="-1">生態 <a class="header-anchor" href="#生態" aria-label="Permalink to &quot;生態&quot;">​</a></h2><table tabindex="0"><thead><tr><th>項目</th><th>内容</th></tr></thead><tbody><tr><td>図鑑No.</td><td>535</td></tr><tr><td>系統</td><td>悪魔</td></tr><tr><td>活動時間</td><td>昼夜</td></tr><tr><td>弱点</td><td>爆（爆発系の呪文でダメージ2倍）</td></tr><tr><td>出現場所</td><td>魔法の森・魔王の焦土</td></tr></tbody></table><h2 id="ドロップ品" tabindex="-1">ドロップ品 <a class="header-anchor" href="#ドロップ品" aria-label="Permalink to &quot;ドロップ品&quot;">​</a></h2><table tabindex="0"><thead><tr><th>区分</th><th>アイテム</th></tr></thead><tbody><tr><td>通常ドロップ</td><td>にじいろの布きれ</td></tr><tr><td>レアドロップ</td><td>にじいろの布きれ</td></tr><tr><td>超レアドロップ</td><td>貴重なレシピ(魔、呪)</td></tr></tbody></table><p>このほかに、飾り用の「オブジェ」と「フィギュア」も落とします。</p><h2 id="使う呪文" tabindex="-1">使う呪文 <a class="header-anchor" href="#使う呪文" aria-label="Permalink to &quot;使う呪文&quot;">​</a></h2><table tabindex="0"><thead><tr><th>種類</th><th>呪文</th></tr></thead><tbody><tr><td>攻撃呪文</td><td>バギクロス</td></tr></tbody></table><h2 id="関連ページ" tabindex="-1">関連ページ <a class="header-anchor" href="#関連ページ" aria-label="Permalink to &quot;関連ページ&quot;">​</a></h2><ul><li><a href="/dqmvi-wiki/monsters/">モンスター図鑑</a></li><li><a href="/dqmvi-wiki/bosses/">魔王・ボス一覧</a></li><li><a href="/dqmvi-wiki/biomes/">出現場所から探す</a></li></ul><h2 id="攻略メモ" tabindex="-1">攻略メモ <a class="header-anchor" href="#攻略メモ" aria-label="Permalink to &quot;攻略メモ&quot;">​</a></h2><p>（未記入）</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("monsters/debirurodo.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const debirurodo = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  debirurodo as default
};
