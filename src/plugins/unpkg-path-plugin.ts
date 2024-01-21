import * as esbuild from "esbuild-wasm";
import axios from "axios";
import localForage from "localforage";

const filecache = localForage.createInstance({
  name: "filecache",
});
(async () => {
  await filecache.setItem("color", "red");
  const color = await filecache.getItem("color");
  console.log(color);
})();

export const unpkgPathPlugin = (inputCode: string) => {
  return {
    name: "unpkg-path-plugin",
    setup(build: esbuild.PluginBuild) {
      // Handle root entry file of 'index.js'
      build.onResolve({ filter: /(^index\.js$)/ }, () => {
        return { path: "index.js", namespace: "a" };
      });
      // Handle relative paths of a module such as './' or '../'
      build.onResolve({ filter: /^\.+\// }, (args: any) => {
        return {
          namespace: "a",
          path: new URL(args.path, "https://unpkg.com" + args.resolveDir + "/")
            .href,
        };
      });
      // Handle main file of a module
      build.onResolve({ filter: /.*/ }, async (args: any) => {
        console.log("onResolve", args);
        return {
          namespace: "a",
          path: `https://unpkg.com/${args.path}`,
        };
      });

      build.onLoad({ filter: /.*/ }, async (args: any) => {
        console.log("onLoad", args);

        if (args.path === "index.js") {
          return {
            loader: "jsx",
            contents: inputCode,
          };
        }

        // check to see if we have already fetched this file
        const cachedResult = await filecache.getItem<esbuild.OnLoadResult>(
          args.path
        );
        // and if it is in the cache
        // if it is , return immediately.
        if (cachedResult) {
          return cachedResult;
        }
        const { data, request } = await axios.get(args.path);
        const result: esbuild.OnLoadResult = {
          loader: "jsx",
          contents: data,
          resolveDir: new URL("./", request.responseURL).pathname,
        };
        // store response in cache
        await filecache.setItem(args.path, result);
        return result;
      });
    },
  };
};
