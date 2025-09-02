/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-f599f9bb'], (function (workbox) { 'use strict';

	self.skipWaiting();
	workbox.clientsClaim();
	workbox.registerRoute(({
	  url
	}) => url.pathname.startsWith('/api/forms/'), new workbox.NetworkOnly({
	  plugins: [new workbox.BackgroundSyncPlugin("formsQueue", {
	    maxRetentionTime: 86400
	  })]
	}), 'GET');
	workbox.registerRoute(({
	  url
	}) => url.pathname.startsWith('/api/'), new workbox.NetworkFirst({
	  "cacheName": "api-cache",
	  "networkTimeoutSeconds": 3,
	  plugins: [new workbox.ExpirationPlugin({
	    maxEntries: 50,
	    maxAgeSeconds: 3600
	  })]
	}), 'GET');
	workbox.registerRoute(({
	  request
	}) => request.destination === 'image', new workbox.CacheFirst({
	  "cacheName": "images-cache",
	  plugins: [new workbox.ExpirationPlugin({
	    maxEntries: 200,
	    maxAgeSeconds: 2592000
	  })]
	}), 'GET');
	workbox.registerRoute(({
	  url
	}) => /\/tiles\//.test(url.href) || url.hostname.includes('openstreetmap') || url.hostname.includes('maptiler'), new workbox.CacheFirst({
	  "cacheName": "map-tiles",
	  plugins: [new workbox.ExpirationPlugin({
	    maxEntries: 300,
	    maxAgeSeconds: 604800
	  })]
	}), 'GET');
	workbox.registerRoute(({
	  request
	}) => request.mode === 'navigate', new workbox.NetworkFirst({
	  "cacheName": "pages-cache",
	  "networkTimeoutSeconds": 3,
	  plugins: [new workbox.ExpirationPlugin({
	    maxEntries: 50,
	    maxAgeSeconds: 86400
	  })]
	}), 'GET');
	workbox.registerRoute(({
	  request
	}) => request.destination === 'script' || request.destination === 'style', new workbox.StaleWhileRevalidate({
	  "cacheName": "static-resources",
	  plugins: [new workbox.ExpirationPlugin({
	    maxEntries: 100,
	    maxAgeSeconds: 604800
	  })]
	}), 'GET');

}));
//# sourceMappingURL=sw.js.map
