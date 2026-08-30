import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"よくある質問","description":"","frontmatter":{},"headers":[],"relativePath":"guide/faq.md","filePath":"guide/faq.md","lastUpdated":1788065271000}');
const _sfc_main = { name: "guide/faq.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="よくある質問" tabindex="-1">よくある質問 <a class="header-anchor" href="#よくある質問" aria-label="Permalink to &quot;よくある質問&quot;">​</a></h1><div class="warning custom-block"><p class="custom-block-title">このページはテンプレートです</p><p>実際に寄せられた質問に置き換えてください。</p></div><h2 id="マルチプレイで使えますか" tabindex="-1">マルチプレイで使えますか <a class="header-anchor" href="#マルチプレイで使えますか" aria-label="Permalink to &quot;マルチプレイで使えますか&quot;">​</a></h2><p>サーバー側とクライアント側の両方に同じバージョンを入れる必要があります。</p><h2 id="既存のワールドに導入できますか" tabindex="-1">既存のワールドに導入できますか <a class="header-anchor" href="#既存のワールドに導入できますか" aria-label="Permalink to &quot;既存のワールドに導入できますか&quot;">​</a></h2><p>導入できますが、生成済みのチャンクには新しい構造物が出現しません。 新規ワールドでの開始を推奨します。</p><h2 id="他のmodと併用できますか" tabindex="-1">他のMODと併用できますか <a class="header-anchor" href="#他のmodと併用できますか" aria-label="Permalink to &quot;他のMODと併用できますか&quot;">​</a></h2></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("guide/faq.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const faq = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  faq as default
};
