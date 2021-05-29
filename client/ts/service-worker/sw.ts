/// <reference lib="WebWorker" />

import { CACHE_NAME, VER_MAJOR, VER_MINOR, VER_BUILD } from "../../../versionNumber";

export {};
declare const self: ServiceWorkerGlobalScope;

// come up with some better way to handle this then :3
const cacheName = `${CACHE_NAME}-v${VER_MAJOR}.${VER_MINOR}.${VER_BUILD}`;

// use a bash script to update the contents of this arr programmatically?
// write a quick export and put it in a consistent place

const filesToCache = [
  "/favicon.ico",
  "/chewingchar.png",

  "/html/maptest.html",
  "/html/manifest.json",
  "/css/maptest.css",
  "/js/maptest.js",

  // glsl files
  "/glsl/debug/shadowdebug.frag",
  "/glsl/debug/shadowdebug.vert",
  "/glsl/debug/texturetest.frag",
  "/glsl/debug/texturetest.vert",
  "/glsl/explosion/explosion.frag",
  "/glsl/explosion/explosion.vert",
  "/glsl/explosionglow/explosionglow.vert",
  "/glsl/explosionglow/explosionglow.frag",
  "/glsl/game/termshock/termshock.vert",
  "/glsl/game/termshock/termshock.frag",

  "/glsl/includes/radialblur.inc.glsl",
  "/glsl/includes/gradient.inc.glsl",
  "/glsl/includes/spotlight/attenuation.inc.glsl",
  "/glsl/includes/spotlight/spotlight.inc.glsl",
  "/glsl/includes/ambient.inc.glsl",
  "/glsl/includes/constants.inc.glsl",
  "/glsl/includes/opensimplex.inc.glsl",
  "/glsl/includes/pbr.inc.glsl",

  "/glsl/matteshader/matteshader.frag",
  "/glsl/matteshader/matteshader.vert",
  "/glsl/pbr/pbr.frag",
  "/glsl/pbr/pbr.vert",
  "/glsl/shadownotexture/shadownotexture_instanced.vert",
  "/glsl/shadownotexture/shadownotexture.frag",
  "/glsl/shadownotexture/shadownotexture.vert",
  "/glsl/texturexfer/texturexfer.frag",
  "/glsl/texturexfer/texturexfer.vert",

  // resource files
  "/res/beachworld.glb",
  "/res/bomb.glb",
  "/res/chewingcharacter.glb",
  "/res/crate.glb",
  "/res/crate3d.glb",
  "/res/crate3d_lava.glb",
  "/res/cubetest.glb",
  "/res/enemy1.glb",
  "/res/explosiontex.png",
  "/res/fieldgrass.glb",
  "/res/grass.glb",
  "/res/grassworld.glb",
  "/res/grassworld_new.glb",
  "/res/hemisphere_explosion.glb",
  "/res/lavaworld.glb",
  "/res/loading.png",
  "/res/mappack.glb",
  "/res/mountainworld.glb",
  "/res/terminationshock.glb",
  "/res/test.glb",
  "/res/untitled.glb",
  "/res/powerups.glb",
  "/res/woodworld.png",

  // fonts
  "/res/font/JetBrainsMono-Italic-VariableFont_wght.ttf",
  "/res/font/WorkSans-VariableFont_wght.ttf",

  // image folder
  "/res/img/portrait_knight_final.png",
  "/res/img/fieldminis/beach_bg.png",
  "/res/img/fieldminis/beach_fg.png",
  "/res/img/fieldminis/field_bg.png",
  "/res/img/fieldminis/field_fg.png",

  "/res/img/powerup/bombs.png",
  "/res/img/powerup/radius.png",
  "/res/img/powerup/speed.png",

  "/res/img/charactermini_still.png",
  "/res/img/chewingcharacter_animated.gif",

  // touch input
  "/res/touch/bomb.png",
  "/res/touch/detonate.png",
  "/res/touch/dir.png"
];

self.addEventListener("install", function(event) {
  console.info("Creating cache " + CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(filesToCache);
  }));
});

self.addEventListener("fetch", function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(async function(response) {
        if (response) {
          console.log("cache hit: " + event.request.url);
          return response;
        }

        console.warn("request not found in cache: " + event.request.url);
        return fetch(event.request);
      })
  );
});

self.addEventListener("activate", function(event) {
  // nothing yet >:)
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (CACHE_NAME !== cacheName) {
            return caches.delete(cacheName);
          }
        })
      )
    })
  )
});