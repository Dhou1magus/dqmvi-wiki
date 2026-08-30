import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"ロトの剣","description":"DQMVIの魔王ボス「ロトの剣」の攻略データ。HP75,000 / 経験値161,800 / 21,250G。フェーズごとの行動パターンとステータスをまとめています。","frontmatter":{"title":"ロトの剣","description":"DQMVIの魔王ボス「ロトの剣」の攻略データ。HP75,000 / 経験値161,800 / 21,250G。フェーズごとの行動パターンとステータスをまとめています。"},"headers":[],"relativePath":"bosses/rotonoturugi.md","filePath":"bosses/rotonoturugi.md","lastUpdated":1788051867000}');
const _sfc_main = { name: "bosses/rotonoturugi.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="ロトの剣" tabindex="-1">ロトの剣 <a class="header-anchor" href="#ロトの剣" aria-label="Permalink to &quot;ロトの剣&quot;">​</a></h1><p><strong>聖剣ロト</strong> ・ 光属性 ・ 2フェーズ</p><h2 id="ステータス" tabindex="-1">ステータス <a class="header-anchor" href="#ステータス" aria-label="Permalink to &quot;ステータス&quot;">​</a></h2><div class="dq-stats"><div><b>HP</b><span>75,000</span></div><div><b>MP</b><span>900</span></div><div><b>こうげき</b><span>1,960</span></div><div><b>しゅび</b><span>875</span></div><div><b>まりょく</b><span>1,350</span></div><div><b>魔法しゅび</b><span>750</span></div><div><b>EXP</b><span class="hi">161,800</span></div><div><b>ゴールド</b><span>21,250</span></div></div><h2 id="生態" tabindex="-1">生態 <a class="header-anchor" href="#生態" aria-label="Permalink to &quot;生態&quot;">​</a></h2><table tabindex="0"><thead><tr><th>項目</th><th>内容</th></tr></thead><tbody><tr><td>図鑑No.</td><td>592</td></tr></tbody></table><h2 id="行動パターン" tabindex="-1">行動パターン <a class="header-anchor" href="#行動パターン" aria-label="Permalink to &quot;行動パターン&quot;">​</a></h2><h3 id="第1フェーズ-hp-100-〜50" tabindex="-1">第1フェーズ（HP 100%〜50%） <a class="header-anchor" href="#第1フェーズ-hp-100-〜50" aria-label="Permalink to &quot;第1フェーズ（HP 100%〜50%）&quot;">​</a></h3><p>この順番で上から繰り返します。</p><ol><li>衝撃波</li><li>光属性の柱 4本</li><li>様子見（隙ができる）</li><li>パワー溜め（3秒・次の一手が1.6倍）</li><li>衝撃波</li></ol><h3 id="第2フェーズ-hp-50-〜0" tabindex="-1">第2フェーズ（HP 50%〜0%） <a class="header-anchor" href="#第2フェーズ-hp-50-〜0" aria-label="Permalink to &quot;第2フェーズ（HP 50%〜0%）&quot;">​</a></h3><p>この順番で上から繰り返します。</p><ol><li>パワー溜め（3秒・次の一手が1.6倍）</li><li>衝撃波</li><li>詠唱 <strong>ギガデイン</strong>（4秒・打ち消し可）</li><li>光属性の柱 6本</li><li>後退して回復（HP5%ぶん・追撃のチャンス）</li></ol><div class="tip custom-block"><p class="custom-block-title">詠唱と溜めが狙いどころ</p><p><code>詠唱</code> 中は最大HPの8%ぶんのダメージを与えると打ち消せます。守り切られると威力が1.5倍になります。 <code>パワー溜め</code> の直後は大きな隙ができるので、そこで一気に削ります。</p></div><h2 id="関連ページ" tabindex="-1">関連ページ <a class="header-anchor" href="#関連ページ" aria-label="Permalink to &quot;関連ページ&quot;">​</a></h2><ul><li><a href="/dqmvi-wiki/bosses/">魔王・ボス一覧</a></li><li><a href="/dqmvi-wiki/monsters/">モンスター図鑑</a></li><li><a href="/dqmvi-wiki/biomes/">出現場所から探す</a></li></ul><h2 id="攻略メモ" tabindex="-1">攻略メモ <a class="header-anchor" href="#攻略メモ" aria-label="Permalink to &quot;攻略メモ&quot;">​</a></h2><p>（未記入）</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("bosses/rotonoturugi.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const rotonoturugi = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  rotonoturugi as default
};
