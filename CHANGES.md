## Version 0.4.0, 2025.08.04

* **Breaking Change:** Rename `escapeUnicode` option for `PropertiesStore#store` to `disableUnicodeEscape` and default
  to `false`
* **Breaking Change:** Change `PropertiesStore#replace` to no longer delete entries when `null` or `undefined` is
  returned
* **Breaking Change:** Change `PropertiesStore#set` to no longer delete entries when `value` is `null` or `undefined`
* Change `PropertiesStore` constructor to accept any iterable of string key/value map entries
* Add `disableTimestamp` option for `PropertiesStore#store` to disable timestamp comment and default to `false`
* Explicitly add full support for converting characters within the Basic Multilingual Plane (BMP)
* Rewrite the entire codebase in TypeScript and support both ESM and CJS usage
* Improve documentation
* Improve the developer experience for contributors with better tooling
* Replace `moment-timezone` with lighter weight `luxon` for timestamp formatting
* Bump all dependencies to latest versions

## Version 0.3.0, 2018.11.10

* added package-lock.json file to enable "npm audit" [dae6dcb](https://github.com/neocotic/escape-unicode/commit/dae6dcb4b41c0dabd8a57522600fefa2316f5545)
* moved from !ninja to neocotic [6d79328](https://github.com/neocotic/escape-unicode/commit/6d7932871f05f063d8ff847f4204d4f74086ce8e)
* modified CI to now target Node.js 8, 10, and 11 [215ea44](https://github.com/neocotic/escape-unicode/commit/215ea446ea692302e91e02cbd30a2dce8eefc104)
* bump dependencies [aa18345](https://github.com/neocotic/escape-unicode/commit/aa183450ee98ccf4f11d4d8875b5b673366f17e5)
* bump devDependencies [abefee3](https://github.com/neocotic/escape-unicode/commit/abefee3c1d9a5cc1e2d9410d96b03c438e47c970)

## Version 0.2.0, 2018.02.02

* Make parser smarter and faster [#3](https://github.com/neocotic/properties-store/issues/3) (**breaking change**)
* Perform incremental read/write operations during I/O [#6](https://github.com/neocotic/properties-store/issues/6)
* Remove preserve option [#8](https://github.com/neocotic/properties-store/issues/8) (**breaking change**)
* Replace chai with assert [#9](https://github.com/neocotic/properties-store/issues/9)
* Add comments option to store method [#10](https://github.com/neocotic/properties-store/issues/10)
* Write timestamp comment on store [#11](https://github.com/neocotic/properties-store/issues/11)
* Remove unescape option from load methods [#12](https://github.com/neocotic/properties-store/issues/12) (**breaking change**)
* Replace escape option for store method with escapeUnicode option [#13](https://github.com/neocotic/properties-store/issues/13) (**breaking change**)
* Replace homepage with Markdown docs [#14](https://github.com/neocotic/properties-store/issues/14)
* Add support for RegExp parameter to certain methods [#15](https://github.com/neocotic/properties-store/issues/15)
* Add search method to iterate over properties matching RegExp [#16](https://github.com/neocotic/properties-store/issues/16)
* Add replace method to change value of properties matching RegExp [#20](https://github.com/neocotic/properties-store/issues/20)

## Version 0.1.0, 2018.01.19

* Initial release
