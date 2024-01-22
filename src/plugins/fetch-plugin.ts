import * as esbuild from "esbuild-wasm";
import axios from "axios";
import localForage from "localforage";

const filecache = localForage.createInstance({
  name: "filecache",
});

export const fetchPlugin = (inputCode: string) => {
  return {
    name: "fetch-plugin",
    setup(build: esbuild.PluginBuild) {
      build.onLoad({ filter: /.*/ }, async (args: any) => {
        console.log("onLoad", args);

        if (args.path === "index.js") {
          return {
            loader: "jsx",
            contents: inputCode,
          };
        }

        // check to see if we have already fetched this file
        // const cachedResult = await filecache.getItem<esbuild.OnLoadResult>(
        //   args.path
        // );
        // and if it is in the cache
        // if it is , return immediately.
        // if (cachedResult) {
        //   return cachedResult;
        // }

        const { data, request } = await axios.get(args.path);
        const filetype = args.path.match(/.css$/) ? "css" : "jsx";
        const escaped = data
          .replace(/\n/g, "")
          .replace(/"/g, '\\"')
          .replace(/'/g, "\\'");
        const contents =
          filetype === "css"
            ? `const style = document.createElement('style');
        style.innerText = '${escaped}';
        document.head.appendChild(style);`
            : data;
        const result: esbuild.OnLoadResult = {
          loader: "jsx",
          contents,
          resolveDir: new URL("./", request.responseURL).pathname,
        };
        // store response in cache
        await filecache.setItem(args.path, result);
        return result;
      });
    },
  };
};
