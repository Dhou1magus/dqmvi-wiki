import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"導入方法","description":"","frontmatter":{},"headers":[],"relativePath":"guide/install.md","filePath":"guide/install.md","lastUpdated":1787918075000}');
const _sfc_main = { name: "guide/install.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="導入方法" tabindex="-1">導入方法 <a class="header-anchor" href="#導入方法" aria-label="Permalink to &quot;導入方法&quot;">​</a></h1><div class="warning custom-block"><p class="custom-block-title">このページはテンプレートです</p><p>実際の手順に書き換えてください。</p></div><h2 id="_1-前提を用意する" tabindex="-1">1. 前提を用意する <a class="header-anchor" href="#_1-前提を用意する" aria-label="Permalink to &quot;1. 前提を用意する&quot;">​</a></h2><ol><li>Java をインストールする</li><li>MODローダーを導入する</li><li>前提MODをダウンロードする</li></ol><h2 id="_2-modを入れる" tabindex="-1">2. MODを入れる <a class="header-anchor" href="#_2-modを入れる" aria-label="Permalink to &quot;2. MODを入れる&quot;">​</a></h2><ol><li>DQMVI本体をダウンロードする</li><li><code>mods</code> フォルダに入れる</li><li>Minecraftを起動する</li></ol><div class="tip custom-block"><p class="custom-block-title">modsフォルダの場所</p><p>Windows の場合は <code>%APPDATA%\\.minecraft\\mods</code> です。 エクスプローラーのアドレス欄にそのまま貼り付けると開けます。</p></div><h2 id="つまずきやすいポイント" tabindex="-1">つまずきやすいポイント <a class="header-anchor" href="#つまずきやすいポイント" aria-label="Permalink to &quot;つまずきやすいポイント&quot;">​</a></h2><table tabindex="0"><thead><tr><th>症状</th><th>原因</th><th>対処</th></tr></thead><tbody><tr><td>起動時にクラッシュする</td><td>前提MODのバージョン違い</td><td>対応バージョンを確認して入れ直す</td></tr><tr><td>モンスターが湧かない</td><td>既に読み込み済みのチャンク</td><td>新しい土地へ移動する</td></tr><tr><td>メモリ不足で落ちる</td><td>割当メモリが少ない</td><td>ランチャーで割当を増やす</td></tr></tbody></table></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("guide/install.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const install = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  install as default
};
