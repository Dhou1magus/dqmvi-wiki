import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"ご意見箱","description":"DQMVI攻略wikiへのご意見・ご要望・不満を送る窓口。名前を書かずに送れます。","frontmatter":{"title":"ご意見箱","description":"DQMVI攻略wikiへのご意見・ご要望・不満を送る窓口。名前を書かずに送れます。","feedback":true},"headers":[],"relativePath":"guide/feedback.md","filePath":"guide/feedback.md","lastUpdated":1788053407000}');
const _sfc_main = { name: "guide/feedback.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="ご意見箱" tabindex="-1">ご意見箱 <a class="header-anchor" href="#ご意見箱" aria-label="Permalink to &quot;ご意見箱&quot;">​</a></h1><p>この攻略wiki <strong>そのもの</strong> について思ったことを送ってください。 名前を書かなくても送れます。ひとつずつ全部読みます。</p><div class="tip custom-block"><p class="custom-block-title">こんなことを書いてください</p><ul><li>探していたものが見つからなかった</li><li>書いてあることが間違っている、古い</li><li>このページがほしい、この情報を足してほしい</li><li>表が見づらい、スマホだと使いにくい</li><li>そのほか、使っていて気になったこと</li></ul></div><div class="warning custom-block"><p class="custom-block-title">MOD本体への要望は、ここからは作者に届きません</p><p>「DQMVIが起動しない」「このモンスターを追加してほしい」といったMOD本体の話は、 ここに書いても有志のwiki編集者に届くだけで、MODを作っている方には伝わりません。 不具合かどうか分からないときは、先に <a href="/dqmvi-wiki/guide/faq">よくある質問</a> を見てみてください。</p></div></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("guide/feedback.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const feedback = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  feedback as default
};
