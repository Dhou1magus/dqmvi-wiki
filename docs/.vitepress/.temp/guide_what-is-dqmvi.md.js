import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"DQMVIとは","description":"","frontmatter":{},"headers":[],"relativePath":"guide/what-is-dqmvi.md","filePath":"guide/what-is-dqmvi.md","lastUpdated":1787918075000}');
const _sfc_main = { name: "guide/what-is-dqmvi.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="dqmviとは" tabindex="-1">DQMVIとは <a class="header-anchor" href="#dqmviとは" aria-label="Permalink to &quot;DQMVIとは&quot;">​</a></h1><p>Minecraft向けのドラゴンクエストMOD「DQM」シリーズの最新版です。 バニラのMinecraftに、ドラクエのモンスター・職業・呪文・装備を追加します。</p><div class="warning custom-block"><p class="custom-block-title">このページはテンプレートです</p><p>実際のMOD概要・作者情報・配布元リンクに書き換えてください。</p></div><h2 id="主な追加要素" tabindex="-1">主な追加要素 <a class="header-anchor" href="#主な追加要素" aria-label="Permalink to &quot;主な追加要素&quot;">​</a></h2><table tabindex="0"><thead><tr><th>要素</th><th>内容</th></tr></thead><tbody><tr><td>モンスター</td><td>スライム系・鳥系などが各バイオームにスポーン</td></tr><tr><td>職業</td><td>戦士・僧侶などに転職し、熟練度で特技を習得</td></tr><tr><td>呪文・特技</td><td>MPを消費して発動</td></tr><tr><td>装備・錬金</td><td>ドロップ素材から武器防具を錬金</td></tr><tr><td>なかまモンスター</td><td>条件を満たすとモンスターが仲間になる</td></tr></tbody></table><h2 id="動作環境" tabindex="-1">動作環境 <a class="header-anchor" href="#動作環境" aria-label="Permalink to &quot;動作環境&quot;">​</a></h2><table tabindex="0"><thead><tr><th>項目</th><th>内容</th></tr></thead><tbody><tr><td>Minecraft</td><td>（要記入）</td></tr><tr><td>MODローダー</td><td>（要記入）</td></tr><tr><td>前提MOD</td><td>（要記入）</td></tr><tr><td>推奨メモリ</td><td>（要記入）</td></tr></tbody></table><p>導入手順は <a href="/dqmvi-wiki/guide/install">導入方法</a> を参照してください。</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("guide/what-is-dqmvi.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const whatIsDqmvi = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  whatIsDqmvi as default
};
