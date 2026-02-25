import {
  defineRefractBrowserPlugin,
  type RefractRuntimePlugin
} from "@refract/tool-contracts";

const dummyBrowserPlugin: RefractRuntimePlugin = defineRefractBrowserPlugin(import.meta.url, {
  id: "dummy",
  label: "Log Action",
  inBrowserHandler({ selectionRef }) {
    console.log(
      `action taken on ${selectionRef.tagName} element with file ${selectionRef.file}, line number ${selectionRef.line}`
    );
  }
});

export default dummyBrowserPlugin;
