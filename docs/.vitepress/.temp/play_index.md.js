import { ssrRenderAttrs, ssrRenderStyle } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"遊び方ガイド","description":"DQMVIの遊び方。始め方・冒険のきほん・ペット・職業・鍛冶・農業・釣り・施設・クエストの手引き。","frontmatter":{"title":"遊び方ガイド","description":"DQMVIの遊び方。始め方・冒険のきほん・ペット・職業・鍛冶・農業・釣り・施設・クエストの手引き。"},"headers":[],"relativePath":"play/index.md","filePath":"play/index.md","lastUpdated":1788060145000}');
const _sfc_main = { name: "play/index.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="遊び方ガイド" tabindex="-1">遊び方ガイド <a class="header-anchor" href="#遊び方ガイド" aria-label="Permalink to &quot;遊び方ガイド&quot;">​</a></h1><p>ゲーム内の「導きの書」に書かれている内容を、項目ごとにまとめたものです。</p><table tabindex="0"><thead><tr><th>ページ</th><th>内容</th><th style="${ssrRenderStyle({ "text-align": "right" })}">項目数</th></tr></thead><tbody><tr><td><a href="/dqmvi-wiki/play/start">はじめに</a></td><td>ゲームを始めて最初にすることと、モンスターポートの使い方。</td><td style="${ssrRenderStyle({ "text-align": "right" })}">35</td></tr><tr><td><a href="/dqmvi-wiki/play/basics">冒険のきほん</a></td><td>ステータスの見かた、戦い方、死んだときの扱い、便利な操作。</td><td style="${ssrRenderStyle({ "text-align": "right" })}">34</td></tr><tr><td><a href="/dqmvi-wiki/play/pets">ペットと配合</a></td><td>モンスターを仲間にして、育てて、配合するまで。</td><td style="${ssrRenderStyle({ "text-align": "right" })}">20</td></tr><tr><td><a href="/dqmvi-wiki/play/gambit">ガンビット</a></td><td>ペットに戦い方を指示するガンビットの組み方。</td><td style="${ssrRenderStyle({ "text-align": "right" })}">13</td></tr><tr><td><a href="/dqmvi-wiki/play/jobs">職業</a></td><td>転職のしかたと、サブ職業のしくみ。</td><td style="${ssrRenderStyle({ "text-align": "right" })}">8</td></tr><tr><td><a href="/dqmvi-wiki/play/items">アイテム</a></td><td>素材・種・道具・特殊効果のある武具について。</td><td style="${ssrRenderStyle({ "text-align": "right" })}">67</td></tr><tr><td><a href="/dqmvi-wiki/play/smithing">鍛冶</a></td><td>装備を打つときの目押し、品質、強化と分解。</td><td style="${ssrRenderStyle({ "text-align": "right" })}">15</td></tr><tr><td><a href="/dqmvi-wiki/play/farming">農業</a></td><td>種のまき方、収穫のコツ、交配。</td><td style="${ssrRenderStyle({ "text-align": "right" })}">11</td></tr><tr><td><a href="/dqmvi-wiki/play/fishing">釣り</a></td><td>釣りの始め方、取り込み、ヌシと魚交換所。</td><td style="${ssrRenderStyle({ "text-align": "right" })}">11</td></tr><tr><td><a href="/dqmvi-wiki/play/facilities">施設と暮らし</a></td><td>拠点づくり、お店、ダンジョンと遊び場。</td><td style="${ssrRenderStyle({ "text-align": "right" })}">16</td></tr><tr><td><a href="/dqmvi-wiki/play/quests">クエスト</a></td><td>メインクエストと、町の人やお店からの依頼。</td><td style="${ssrRenderStyle({ "text-align": "right" })}">11</td></tr></tbody></table></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("play/index.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  index as default
};
